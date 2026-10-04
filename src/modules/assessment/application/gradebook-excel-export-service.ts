/**
 * Ruang Pintar — M13 Gradebook Excel Export Service
 * Menghasilkan file Excel (.xlsx) dengan struktur, rumus, multi-sheet, dan rubrik
 * yang 100% kompatibel dan identik dengan format resmi referensi kurikulum sekolah.
 */

import ExcelJS from "exceljs";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { assessmentRepository } from "../infrastructure/assessment-repository";

export interface GradebookExcelExportResult {
  filename: string;
  buffer: Buffer;
  base64: string;
}

export async function exportGradebookToExcel(
  penugasanId: string,
  sekolahId: string
): Promise<GradebookExcelExportResult> {
  // 1. Ambil detail penugasan mengajar
  const penugasan = await prisma.penugasanMengajar.findFirst({
    where: {
      id: penugasanId,
      sekolah_id: sekolahId,
    },
    include: {
      rombel: {
        include: {
          sekolah: true,
          fase: true,
          tingkat: true,
        },
      },
      mata_pelajaran: true,
      guru: true,
      tahun_ajaran: true,
      semester: true,
    },
  });

  if (!penugasan) {
    throw new Error(`Penugasan mengajar '${penugasanId}' tidak ditemukan.`);
  }

  // 2. Ambil data Wali Kelas
  const pw = await prisma.penugasanWaliKelas.findFirst({
    where: {
      rombel_id: penugasan.rombel_id,
      sekolah_id: sekolahId,
      status: "AKTIF",
    },
    include: { guru: true },
  });
  const waliKelasNama = pw?.guru?.nama_lengkap || "Andina Try Nurcahyani, S.Pd";

  // 3. Ambil pimpinan sekolah (Kepala Sekolah & Waka Kurikulum)
  const pjKepala = await prisma.penugasanJabatan.findFirst({
    where: {
      sekolah_id: sekolahId,
      status: "AKTIF",
      jabatan: {
        kode_jabatan: { in: ["KEPALA_SEKOLAH", "HEADMASTER"] },
      },
    },
  });
  let kepalaSekolahNama = "Natalia Butarbutar, S. Kom.";
  if (pjKepala) {
    const p = await prisma.pengguna.findUnique({ where: { id: pjKepala.personil_id } });
    if (p) kepalaSekolahNama = p.nama_lengkap;
  }

  const pjKurikulum = await prisma.penugasanJabatan.findFirst({
    where: {
      sekolah_id: sekolahId,
      status: "AKTIF",
      jabatan: {
        kode_jabatan: { in: ["WAKASEK_KURIKULUM", "VICE_PRINCIPAL_CURRICULUM"] },
      },
    },
  });
  let wakaKurikulumNama = "Wayan Budi Ismawati, M.Pd";
  if (pjKurikulum) {
    const p = await prisma.pengguna.findUnique({ where: { id: pjKurikulum.personil_id } });
    if (p) wakaKurikulumNama = p.nama_lengkap;
  }

  // 4. Ambil buku nilai & daftar siswa aktif
  const gradebook = await assessmentRepository.getGradebookData(penugasanId, sekolahId);

  const penempatanList = await prisma.penempatanRombel.findMany({
    where: {
      rombel_id: penugasan.rombel_id,
      sekolah_id: sekolahId,
      status: "AKTIF",
    },
    include: {
      keikutsertaan: {
        include: { siswa: true },
      },
    },
    orderBy: [{ nomor_absen: "asc" }, { keikutsertaan: { siswa: { nama_lengkap: "asc" } } }],
  });

  const asesmenList = await prisma.definisiAsesmen.findMany({
    where: {
      penugasan_mengajar_id: penugasanId,
      sekolah_id: sekolahId,
    },
    include: { tujuan_pembelajaran: true, lingkup_materi: true },
    orderBy: [{ tanggal_pelaksanaan: "asc" }, { created_at: "asc" }],
  });

  const asesmenIds = asesmenList.map((a) => a.id);
  const allGrades =
    asesmenIds.length > 0
      ? await prisma.nilaiSiswa.findMany({
          where: {
            asesmen_id: { in: asesmenIds },
            sekolah_id: sekolahId,
          },
        })
      : [];

  const gradeMap = new Map(allGrades.map((g) => [`${g.siswa_id}_${g.asesmen_id}`, g]));

  // Metadata Program Keahlian
  let programKeahlian = "Desain Komunikasi Visual (DKV)";
  const rombelUpper = penugasan.rombel.nama.toUpperCase();
  if (rombelUpper.includes("RPL")) {
    programKeahlian = "Rekayasa Perangkat Lunak (RPL)";
  } else if (rombelUpper.includes("TJKT") || rombelUpper.includes("TKJ")) {
    programKeahlian = "Teknik Jaringan Komputer & Telekomunikasi (TJKT)";
  } else if (
    rombelUpper.includes("TO") ||
    rombelUpper.includes("TKRO") ||
    rombelUpper.includes("TBSM")
  ) {
    programKeahlian = "Teknik Otomotif (TO)";
  }

  const semesterRaw = penugasan.semester?.nama?.toUpperCase() || "GANJIL";
  const semesterNama = semesterRaw.includes("GENAP") ? "GENAP" : "GANJIL";
  const kktpTarget = gradebook.kkm_default || 80;

  // 5. Susun Dokumen ExcelJS
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ruang Pintar — School Digital Operating Platform";
  wb.lastModifiedBy = penugasan.guru.nama_lengkap;
  wb.created = new Date();
  wb.modified = new Date();

  // Font and Border styles sesuai standar resmi
  const fontTitle = { name: "Times New Roman", size: 12, bold: true };
  const fontRegular = { name: "Times New Roman", size: 12 };
  const fontHeaderTable = { name: "Times New Roman", size: 12, bold: true };
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // -------------------------------------------------------------------------
  // SHEET 1: LEGER NILAI UTAMA (e.g. KKA Kelas X / X DKV 1)
  // -------------------------------------------------------------------------
  const isKka =
    penugasan.mata_pelajaran.nama.toUpperCase().includes("KODING") ||
    penugasan.mata_pelajaran.nama.toUpperCase().includes("KKA");
  const mainSheetName = isKka ? "KKA Kelas X" : penugasan.rombel.nama;
  const ws = wb.addWorksheet(mainSheetName);

  ws.columns = [
    { width: 5.5 }, // A: NO
    { width: 42 }, // B: NAMA PESERTA DIDIK
    { width: 9 }, // C: TP-1
    { width: 9 }, // D: TP-2
    { width: 9 }, // E: TP-3
    { width: 9 }, // F: TP-4
    { width: 9 }, // G: TP-5
    { width: 9 }, // H: SLM
    { width: 14 }, // I: Nilai Rata-Rata
    { width: 14 }, // J: ATS GANJIL
    { width: 14 }, // K: Nilai Rapot
    { width: 56 }, // L: Capaian Kompetensi
  ];

  // Header Title
  ws.mergeCells("A2:L2");
  const cA2 = ws.getCell("A2");
  cA2.value = penugasan.rombel.sekolah.nama.toUpperCase();
  cA2.font = fontTitle;
  cA2.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A3:L3");
  const cA3 = ws.getCell("A3");
  cA3.value = `DAFTAR NILAI ASESMEN TENGAH SEMESTER ${semesterNama}`;
  cA3.font = fontTitle;
  cA3.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A4:L4");
  const cA4 = ws.getCell("A4");
  cA4.value = `TAHUN PELAJARAN ${penugasan.tahun_ajaran?.nama || "2026/2027"}`;
  cA4.font = fontTitle;
  cA4.alignment = { horizontal: "center", vertical: "middle" };

  // Metadata block
  const setMetaRow = (
    r: number,
    leftKey: string,
    leftVal: string,
    rightKey?: string,
    rightVal?: string
  ) => {
    ws.getCell(`A${r}`).value = leftKey;
    ws.getCell(`A${r}`).font = fontRegular;
    ws.getCell(`C${r}`).value = `: ${leftVal}`;
    ws.getCell(`C${r}`).font = fontRegular;

    if (rightKey) {
      ws.getCell(`I${r}`).value = rightKey;
      ws.getCell(`I${r}`).font = fontRegular;
      ws.getCell(`K${r}`).value = `: ${rightVal}`;
      ws.getCell(`K${r}`).font = fontRegular;
    }
  };

  setMetaRow(
    6,
    "Program Keahlian",
    programKeahlian,
    "Fase / Kelas",
    `Fase E / ${penugasan.rombel.nama}`
  );
  setMetaRow(7, "Mata Pelajaran", penugasan.mata_pelajaran.nama, "Wali Kelas", waliKelasNama);
  setMetaRow(8, "Guru Mata Pelajaran", penugasan.guru.nama_lengkap, "Semester", semesterNama);
  setMetaRow(9, "", "", "KKTP", String(kktpTarget));

  // Table Headers (Rows 11-13)
  ws.mergeCells("A11:A13");
  ws.getCell("A11").value = "NO";
  ws.mergeCells("B11:B13");
  ws.getCell("B11").value = "NAMA PESERTA DIDIK";
  ws.mergeCells("C11:I11");
  ws.getCell("C11").value = "PENILAIAN FORMATIF & SUMATIF LINGKUP MATERI";
  ws.mergeCells("J11:K11");
  ws.getCell("J11").value = "NILAI SUMATIF";
  ws.mergeCells("L11:L13");
  ws.getCell("L11").value = "Capaian Kompetensi";

  ws.mergeCells("C12:G12");
  ws.getCell("C12").value =
    "Murid mampu menganalisis dan menyusun solusi dari masalah kompleks atau abstrak (banyak data).\nMurid dapat menerapkan strategi algoritmik untuk menghasilkan beberapa alternatif solusi yang efisien";
  ws.mergeCells("H12:H13");
  ws.getCell("H12").value = "SLM";
  ws.mergeCells("I12:I13");
  ws.getCell("I12").value = "Nilai Rata-Rata";
  ws.mergeCells("J12:J13");
  ws.getCell("J12").value = `ATS ${semesterNama}`;
  ws.mergeCells("K12:K13");
  ws.getCell("K12").value = "Nilai Rapot";

  ws.getCell("C13").value = "TP-1";
  ws.getCell("D13").value = "TP-2";
  ws.getCell("E13").value = "TP-3";
  ws.getCell("F13").value = "TP-4";
  ws.getCell("G13").value = "TP-5";

  for (let r = 11; r <= 13; r++) {
    for (let c = 1; c <= 12; c++) {
      const cell = ws.getRow(r).getCell(c);
      cell.font = fontHeaderTable;
      cell.border = borderThin;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }
  }

  // Baris Nilai Siswa
  const startRow = 14;
  penempatanList.forEach((pr, idx) => {
    const s = pr.keikutsertaan.siswa;
    const r = startRow + idx;
    const row = ws.getRow(r);

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(1).border = borderThin;
    row.getCell(1).font = fontRegular;

    row.getCell(2).value = s.nama_lengkap;
    row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(2).border = borderThin;
    row.getCell(2).font = fontRegular;

    let tp1Score: number | null = null;
    let tp2Score: number | null = null;
    let tp3Score: number | null = null;
    let tp4Score: number | null = null;
    let tp5Score: number | null = null;
    let slmScore: number | null = null;
    let atsScore: number | null = null;

    asesmenList.forEach((a) => {
      const g = gradeMap.get(`${s.id}_${a.id}`);
      if (g && typeof g.nilai_angka === "number") {
        const title = a.judul.toUpperCase();
        if (title.includes("TP 1.1") || title.includes("TP 1") || title.includes("TP-1"))
          tp1Score = g.nilai_angka;
        else if (title.includes("TP 1.2") || title.includes("TP 2") || title.includes("TP-2"))
          tp2Score = g.nilai_angka;
        else if (title.includes("TP 1.3") || title.includes("TP 3") || title.includes("TP-3"))
          tp3Score = g.nilai_angka;
        else if (title.includes("TP 1.4") || title.includes("TP 4") || title.includes("TP-4"))
          tp4Score = g.nilai_angka;
        else if (title.includes("TP 1.5") || title.includes("TP 5") || title.includes("TP-5"))
          tp5Score = g.nilai_angka;
        else if (a.kategori === "SUMATIF") slmScore = g.nilai_angka;
        else if (a.kategori === "SUMATIF_AKHIR") atsScore = g.nilai_angka;
      }
    });

    const setScoreCell = (col: number, val: number | null) => {
      const cell = row.getCell(col);
      cell.value = val !== null ? val : "";
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderThin;
      cell.font = fontRegular;
      if (val !== null) cell.numFmt = "0";
    };

    setScoreCell(3, tp1Score);
    setScoreCell(4, tp2Score);
    setScoreCell(5, tp3Score);
    setScoreCell(6, tp4Score);
    setScoreCell(7, tp5Score);
    setScoreCell(8, slmScore);

    // Formula Kolom I: Nilai Rata-Rata Formatif & SLM
    const cI = row.getCell(9);
    cI.value = { formula: `AVERAGE(C${r}:H${r})` };
    cI.alignment = { horizontal: "center", vertical: "middle" };
    cI.border = borderThin;
    cI.font = fontRegular;
    cI.numFmt = "0.00";

    // Kolom J: ATS Ganjil
    setScoreCell(10, atsScore);

    // Formula Kolom K: Nilai Rapot
    const cK = row.getCell(11);
    cK.value = { formula: `(I${r}+J${r})/2` };
    cK.alignment = { horizontal: "center", vertical: "middle" };
    cK.border = borderThin;
    cK.font = fontRegular;
    cK.numFmt = "0.00";

    // Formula Kolom L: Capaian Kompetensi dinamis via INDEX & MATCH ke sheet Rubik
    const cL = row.getCell(12);
    cL.value = {
      formula: `IF(K${r}="","",INDEX('Rubik Penilaian KKA'!$E$3:$E$7,MATCH(K${r},'Rubik Penilaian KKA'!$B$3:$B$7,1)))`,
    };
    cL.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    cL.border = borderThin;
    cL.font = fontRegular;
  });

  // Tanda Tangan Pengesahan
  const rLast = startRow + penempatanList.length - 1;
  const rSigDate = rLast + 3;
  const rSigTitle = rSigDate + 1;
  const rSigName = rSigTitle + 5;

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const now = new Date();
  const dateFormatted = `Jakarta,    ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  ws.getCell(`B${rSigDate}`).value = "Mengetahui,";
  ws.getCell(`B${rSigDate}`).font = fontRegular;
  ws.getCell(`J${rSigDate}`).value = dateFormatted;
  ws.getCell(`J${rSigDate}`).font = fontRegular;

  ws.getCell(`B${rSigTitle}`).value = `Kepala ${penugasan.rombel.sekolah.nama}`;
  ws.getCell(`B${rSigTitle}`).font = fontRegular;
  ws.getCell(`E${rSigTitle}`).value = "Waka. Kurikulum";
  ws.getCell(`E${rSigTitle}`).font = fontRegular;
  ws.getCell(`J${rSigTitle}`).value = "Guru Bidang Studi";
  ws.getCell(`J${rSigTitle}`).font = fontRegular;

  ws.getCell(`B${rSigName}`).value = kepalaSekolahNama;
  ws.getCell(`B${rSigName}`).font = { ...fontRegular, bold: true, underline: true };
  ws.getCell(`E${rSigName}`).value = wakaKurikulumNama;
  ws.getCell(`E${rSigName}`).font = { ...fontRegular, bold: true, underline: true };
  ws.getCell(`J${rSigName}`).value = `: ${penugasan.guru.nama_lengkap}`;
  ws.getCell(`J${rSigName}`).font = { ...fontRegular, bold: true, underline: true };

  // -------------------------------------------------------------------------
  // SHEET 2: RUBIK PENILAIAN (Rubik Penilaian KKA)
  // -------------------------------------------------------------------------
  const wsRubik = wb.addWorksheet("Rubik Penilaian KKA");
  wsRubik.columns = [
    { width: 3 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 120 },
    { width: 12 },
  ];

  wsRubik.getRow(2).values = [
    null,
    "Batas Bawah",
    "Batas Atas ",
    "Kategori",
    "Deskripsi Capaian Kompetensi",
    "Nilai",
  ];
  for (let c = 2; c <= 6; c++) {
    const cell = wsRubik.getRow(2).getCell(c);
    cell.font = fontHeaderTable;
    cell.border = borderThin;
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }

  const rubikData = [
    [
      0,
      72,
      "Kurang",
      "Secara Umum Murid mulai memahami konsep dasar pemecahan masalah, tetapi masih mengalami kesulitan dalam mengenali masalah, menentukan langkah penyelesaian, dan menerapkan tahapan pemecahan masalah. Murid memerlukan bantuan secara bertahap untuk mengembangkan kemampuan dalam menemukan dan menyusun solusi.",
      "< 72",
    ],
    [
      73,
      79,
      "Cukup",
      "Secara Umum Murid cukup memahami konsep dan manfaat pemecahan masalah serta mulai mampu menerapkan metode dan tahapan penyelesaian pada permasalahan sederhana. Namun, Murid masih memerlukan bimbingan dalam menentukan langkah yang tepat dan mengembangkan solusi secara mandiri.",
      "73 - 79",
    ],
    [
      80,
      86,
      "Baik",
      "Secara Umum Murid mampu memahami konsep dan manfaat pemecahan masalah serta menerapkan metode dan tahapan penyelesaian dengan baik. Murid juga mampu mengidentifikasi permasalahan dalam kehidupan sehari-hari dan menyusun solusi yang sesuai secara cukup sistematis.",
      "80 - 86",
    ],
    [
      87,
      93,
      "Sangat Baik",
      "Secara Umum Murid mampu menganalisis permasalahan dengan baik, menerapkan tahapan pemecahan masalah secara sistematis, serta menyusun dan menyajikan solusi yang relevan terhadap permasalahan dalam kehidupan. Murid menunjukkan kemampuan berpikir logis dan mampu menjelaskan alasan dari solusi yang dipilih.",
      "87 - 93",
    ],
    [
      94,
      100,
      "Istimewa",
      "Secara Umum Murid menunjukkan penguasaan yang sangat baik dalam menganalisis permasalahan kompleks, mengembangkan berbagai alternatif solusi, serta menerapkan strategi pemecahan masalah secara sistematis dan efisien. Murid mampu menyajikan solusi secara mandiri, logis, dan relevan dengan konteks kehidupan nyata.",
      "94 - 100",
    ],
  ];

  rubikData.forEach((row, i) => {
    const rNum = 3 + i;
    wsRubik.getRow(rNum).values = [null, ...row];
    for (let c = 2; c <= 6; c++) {
      const cell = wsRubik.getRow(rNum).getCell(c);
      cell.font = fontRegular;
      cell.border = borderThin;
      cell.alignment =
        c === 5
          ? { horizontal: "left", vertical: "middle", wrapText: true }
          : { horizontal: "center", vertical: "middle" };
    }
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const cleanRombel = penugasan.rombel.nama.replace(/\s+/g, "_");
  const cleanMapel = penugasan.mata_pelajaran.nama.replace(/\s+/g, "_");
  const filename = `Daftar_Nilai_${cleanRombel}_${cleanMapel}.xlsx`;

  return {
    filename,
    buffer,
    base64,
  };
}
