import { describe, it, expect, vi, beforeEach } from "vitest";
import ExcelJS from "exceljs";
import { exportGradebookToExcel } from "@/modules/assessment/application/gradebook-excel-export-service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { assessmentRepository } from "@/modules/assessment/infrastructure/assessment-repository";

describe("Gradebook Excel Export Service (Parity with KKA KELAS 10.xlsx)", () => {
  const penugasanId = "PENUGAS_KKA_X_DKV_1";
  const sekolahId = "SCH_OTOMINDO";

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(prisma.penugasanMengajar, "findFirst").mockResolvedValue({
      id: penugasanId,
      sekolah_id: sekolahId,
      rombel_id: "ROM_DKV_1",
      mata_pelajaran_id: "MAPEL_KKA",
      guru_id: "GURU_ERI",
      rombel: {
        nama: "X DKV 1",
        sekolah: { nama: "SMK OTOMINDO" },
        fase: { nama: "Fase E" },
        tingkat: { nama: "10" },
      },
      mata_pelajaran: { nama: "Koding dan Kecerdasan Artifisial" },
      guru: { nama_lengkap: "Eri Chandra A, S.Kom" },
      tahun_ajaran: { nama: "2026/2027" },
      semester: { nama: "Semester Ganjil" },
    } as any);

    vi.spyOn(prisma.penugasanWaliKelas, "findFirst").mockResolvedValue({
      id: "PW_1",
      guru: { nama_lengkap: "Andina Try Nurcahyani, S.Pd" },
    } as any);

    vi.spyOn(prisma.penugasanJabatan, "findFirst").mockImplementation(((args: any) => {
      const code = args?.where?.jabatan?.kode_jabatan?.in?.[0];
      if (code === "KEPALA_SEKOLAH" || code === "HEADMASTER") {
        return Promise.resolve({ id: "PJ_KS", personil_id: "USER_KS" });
      }
      return Promise.resolve({ id: "PJ_WK", personil_id: "USER_WK" });
    }) as any);

    vi.spyOn(prisma.pengguna, "findUnique").mockImplementation(((args: any) => {
      if (args?.where?.id === "USER_KS") {
        return Promise.resolve({ nama_lengkap: "Natalia Butarbutar, S.Kom" });
      }
      return Promise.resolve({ nama_lengkap: "Wayan Budi Ismawati, M.Pd" });
    }) as any);

    vi.spyOn(assessmentRepository, "getGradebookData").mockResolvedValue({
      penugasan_id: penugasanId,
      sekolah_id: sekolahId,
      rombel_id: "ROM_DKV_1",
      rombel_nama: "X DKV 1",
      mata_pelajaran_id: "MAPEL_KKA",
      mata_pelajaran_nama: "Koding dan Kecerdasan Artifisial",
      kkm_default: 80,
      columns: [],
      rows: [],
      statistics: {
        total_siswa: 23,
        total_asesmen: 1,
        total_formatif: 1,
        total_sumatif: 0,
        rata_rata_kelas: 85,
        persentase_tuntas_kktp: 100,
      },
    } as any);

    vi.spyOn(prisma.penempatanRombel, "findMany").mockResolvedValue([
      {
        id: "PR_1",
        nomor_absen: 1,
        keikutsertaan: {
          siswa: {
            id: "SISWA_1",
            nis: "260801",
            nama_lengkap: "Ailsa Citra Kirana",
          },
        },
      },
    ] as any);

    vi.spyOn(prisma.definisiAsesmen, "findMany").mockResolvedValue([
      {
        id: "ASM_1",
        judul: "Formatif TP 1.1 : Memahami Multimedia",
        kategori: "FORMATIF",
        kkm_kktp: 80,
      },
    ] as any);

    vi.spyOn(prisma.nilaiSiswa, "findMany").mockResolvedValue([
      {
        id: "NILAI_1",
        siswa_id: "SISWA_1",
        asesmen_id: "ASM_1",
        nilai_angka: 80,
      },
    ] as any);
  });

  it("generates a valid multi-sheet Excel file matching reference structure and formulas", async () => {
    const result = await exportGradebookToExcel(penugasanId, sekolahId);

    expect(result).toBeDefined();
    expect(result.filename).toBe("Daftar_Nilai_X_DKV_1_Koding_dan_Kecerdasan_Artifisial.xlsx");
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.base64).toBeTruthy();

    // Parse the generated buffer with ExcelJS to verify workbook contents
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result.buffer as any);

    // Verify Worksheets exist
    const sheetNames = wb.worksheets.map((ws) => ws.name);
    expect(sheetNames).toContain("KKA Kelas X");
    expect(sheetNames).toContain("Rubik Penilaian KKA");

    // Verify Main Sheet Title & Headers
    const wsMain = wb.getWorksheet("KKA Kelas X");
    expect(wsMain).toBeDefined();
    expect(wsMain?.getCell("A2").value).toBe("SMK OTOMINDO");
    expect(wsMain?.getCell("A3").value).toBe("DAFTAR NILAI ASESMEN TENGAH SEMESTER GANJIL");
    expect(wsMain?.getCell("A4").value).toBe("TAHUN PELAJARAN 2026/2027");
    expect(wsMain?.getCell("C6").value).toBe(": Desain Komunikasi Visual (DKV)");
    expect(wsMain?.getCell("K6").value).toBe(": Fase E / X DKV 1");
    expect(wsMain?.getCell("C7").value).toBe(": Koding dan Kecerdasan Artifisial");
    expect(wsMain?.getCell("K7").value).toBe(": Andina Try Nurcahyani, S.Pd");
    expect(wsMain?.getCell("C8").value).toBe(": Eri Chandra A, S.Kom");
    expect(wsMain?.getCell("K8").value).toBe(": GANJIL");
    expect(wsMain?.getCell("K9").value).toBe(": 80"); // KKTP Target: 80

    // Verify Table Headers
    expect(wsMain?.getCell("A11").value).toBe("NO");
    expect(wsMain?.getCell("B11").value).toBe("NAMA PESERTA DIDIK");
    expect(wsMain?.getCell("H12").value).toBe("SLM");
    expect(wsMain?.getCell("I12").value).toBe("Nilai Rata-Rata");
    expect(wsMain?.getCell("J12").value).toBe("ATS GANJIL");
    expect(wsMain?.getCell("K12").value).toBe("Nilai Rapot");
    expect(wsMain?.getCell("L11").value).toBe("Capaian Kompetensi");

    // Verify Student 1 (Row 14: Ailsa Citra Kirana)
    expect(wsMain?.getCell("A14").value).toBe(1);
    expect(wsMain?.getCell("B14").value).toBe("Ailsa Citra Kirana");
    expect(wsMain?.getCell("C14").value).toBe(80); // TP 1.1 score

    // Verify Exact Formulas in Row 14 matching reference file
    expect(wsMain?.getCell("I14").formula).toBe("AVERAGE(C14:H14)");
    expect(wsMain?.getCell("K14").formula).toBe("(I14+J14)/2");
    expect(wsMain?.getCell("L14").formula).toBe(
      "IF(K14=\"\",\"\",INDEX('Rubik Penilaian KKA'!$E$3:$E$7,MATCH(K14,'Rubik Penilaian KKA'!$B$3:$B$7,1)))"
    );

    // Verify Signatures
    expect(wsMain?.getCell("B17").value).toBe("Mengetahui,");
    expect(wsMain?.getCell("B18").value).toBe("Kepala SMK OTOMINDO");
    expect(wsMain?.getCell("E18").value).toBe("Waka. Kurikulum");
    expect(wsMain?.getCell("J18").value).toBe("Guru Bidang Studi");
    expect(wsMain?.getCell("B23").value).toBe("Natalia Butarbutar, S.Kom");
    expect(wsMain?.getCell("E23").value).toBe("Wayan Budi Ismawati, M.Pd");
    expect(wsMain?.getCell("J23").value).toBe(": Eri Chandra A, S.Kom");

    // Verify Rubik Penilaian Sheet
    const wsRubik = wb.getWorksheet("Rubik Penilaian KKA");
    expect(wsRubik).toBeDefined();
    expect(wsRubik?.getCell("B2").value).toBe("Batas Bawah");
    expect(wsRubik?.getCell("C2").value).toBe("Batas Atas ");
    expect(wsRubik?.getCell("D2").value).toBe("Kategori");
    expect(wsRubik?.getCell("E2").value).toBe("Deskripsi Capaian Kompetensi");

    // Check thresholds in Rubik
    expect(wsRubik?.getCell("B3").value).toBe(0);
    expect(wsRubik?.getCell("C3").value).toBe(72);
    expect(wsRubik?.getCell("D3").value).toBe("Kurang");

    expect(wsRubik?.getCell("B5").value).toBe(80);
    expect(wsRubik?.getCell("C5").value).toBe(86);
    expect(wsRubik?.getCell("D5").value).toBe("Baik");

    expect(wsRubik?.getCell("B7").value).toBe(94);
    expect(wsRubik?.getCell("C7").value).toBe(100);
    expect(wsRubik?.getCell("D7").value).toBe("Istimewa");
  });
});
