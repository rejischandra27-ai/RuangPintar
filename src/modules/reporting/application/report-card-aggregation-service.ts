/**
 * Ruang Pintar — Module M18: Digital Report Card Engine (Kurikulum Merdeka Foundation)
 * Application Service: ReportCardAggregationService
 *
 * Mengagregasi seluruh komponen lembar e-Rapor:
 * - Identitas Siswa & Rombel
 * - Mata Pelajaran & Penugasan Mengajar
 * - Nilai Formatif (40%) & Sumatif (60%)
 * - Nilai Akhir & Predikat Capaian (A, B, C, D)
 * - Deskripsi Capaian Pembelajaran Tertinggi & Peningkatan
 * - Presensi Semester (Sakit, Izin, Alpha)
 * - Ekstrakurikuler
 * - Catatan & Rekomendasi Wali Kelas
 *
 * Invariant Canonical:
 * - Missing Grade ≠ Zero Grade (Mata pelajaran tanpa nilai tidak diisi 0, melainkan di-flag missing).
 */

import {
  ReportCardData,
  SubjectAchievementItem,
  ExtracurricularItem,
  RombelReportOverviewDTO,
  RombelReportSummaryItem,
  ReportCardStatus,
} from "../domain/report-card-types";
import { StudentPlacementNotFoundError } from "../domain/report-card-errors";
import {
  reportCardRepository,
  ReportCardRepository,
} from "../infrastructure/report-card-repository";

export class ReportCardAggregationService {
  constructor(private readonly repo: ReportCardRepository = reportCardRepository) {}

  /**
   * Mengumpulkan dan mengagregasi data rapor lengkap untuk seorang siswa.
   */
  async aggregateStudentReportCard(siswaId: string, sekolahId: string): Promise<ReportCardData> {
    const rawData = await this.repo.getStudentRawAcademicData(siswaId, sekolahId);
    if (!rawData) {
      throw new StudentPlacementNotFoundError();
    }

    const {
      student,
      enrollment,
      placement,
      rombel,
      school,
      kepalaSekolahNama,
      kepalaSekolahNip,
      publishedGrades,
      attendanceSummary,
      raporRecord,
    } = rawData;

    // Nama Wali Kelas
    const wali = rombel.penugasan_wali[0]?.guru;
    const waliKelasNama = wali
      ? `${wali.gelar_depan ? wali.gelar_depan + " " : ""}${wali.nama_lengkap}${wali.gelar_belakang ? ", " + wali.gelar_belakang : ""}`
      : "Wali Kelas";
    const waliKelasNip = wali?.nip || null;

    // Kelompokkan nilai berdasarkan Penugasan Mengajar (Mata Pelajaran)
    const gradesByPenugasanId = new Map<string, typeof publishedGrades>();
    for (const g of publishedGrades) {
      const pId = g.asesmen.penugasan_mengajar_id;
      const list = gradesByPenugasanId.get(pId) || [];
      list.push(g);
      gradesByPenugasanId.set(pId, list);
    }

    const mataPelajaranList: SubjectAchievementItem[] = [];
    let totalScoreSum = 0;
    let gradedSubjectCount = 0;
    let hasIncompleteGrades = false;

    // Iterasi setiap mata pelajaran aktif di rombel
    for (const penugasan of rombel.penugasan_mengajar) {
      const mapel = penugasan.mata_pelajaran;
      const guru = penugasan.guru;
      const guruNama = `${guru.gelar_depan ? guru.gelar_depan + " " : ""}${guru.nama_lengkap}${guru.gelar_belakang ? ", " + guru.gelar_belakang : ""}`;

      const assignedGrades = gradesByPenugasanId.get(penugasan.id) || [];

      // Filter Formatif vs Sumatif
      const formatifGrades = assignedGrades.filter(
        (g) => g.asesmen.kategori === "FORMATIF" && g.nilai_angka !== null
      );
      const sumatifGrades = assignedGrades.filter(
        (g) =>
          (g.asesmen.kategori === "SUMATIF" || g.asesmen.kategori === "SUMATIF_AKHIR") &&
          g.nilai_angka !== null
      );

      const rerataFormatif =
        formatifGrades.length > 0
          ? Math.round(
              formatifGrades.reduce((acc, cur) => acc + (cur.nilai_angka || 0), 0) /
                formatifGrades.length
            )
          : null;

      const rerataSumatif =
        sumatifGrades.length > 0
          ? Math.round(
              sumatifGrades.reduce((acc, cur) => acc + (cur.nilai_angka || 0), 0) /
                sumatifGrades.length
            )
          : null;

      // Bobot Kurikulum Merdeka: 40% Formatif + 60% Sumatif
      let nilaiAkhir: number | null = null;
      if (rerataFormatif !== null && rerataSumatif !== null) {
        nilaiAkhir = Math.round(rerataFormatif * 0.4 + rerataSumatif * 0.6);
      } else if (rerataSumatif !== null) {
        nilaiAkhir = rerataSumatif;
      } else if (rerataFormatif !== null) {
        nilaiAkhir = rerataFormatif;
      }

      const hasMissingGrade = nilaiAkhir === null;
      if (hasMissingGrade) {
        hasIncompleteGrades = true;
      } else if (nilaiAkhir !== null) {
        totalScoreSum += nilaiAkhir;
        gradedSubjectCount++;
      }

      const kktp = 75; // Standar KKTP Kurikulum Merdeka
      const isTuntas = nilaiAkhir !== null ? nilaiAkhir >= kktp : false;

      let predikat: "A" | "B" | "C" | "D" | "-" = "-";
      if (nilaiAkhir !== null) {
        if (nilaiAkhir >= 90) predikat = "A";
        else if (nilaiAkhir >= 80) predikat = "B";
        else if (nilaiAkhir >= 70) predikat = "C";
        else predikat = "D";
      }

      // Rumusan Narasi Capaian Pembelajaran (TP / Materi)
      let deskripsiCapaianTertinggi = "Menunjukkan penguasaan capaian pembelajaran dengan baik.";
      let deskripsiPerluPeningkatan = "Perlu mempertahankan konsistensi belajar pada materi pokok.";

      const validGrades = assignedGrades.filter((g) => g.nilai_angka !== null);
      if (validGrades.length > 0) {
        const sorted = [...validGrades].sort((a, b) => (b.nilai_angka || 0) - (a.nilai_angka || 0));

        const highest = sorted[0];
        const highestTopic =
          highest.asesmen.tujuan_pembelajaran?.deskripsi ||
          highest.asesmen.lingkup_materi?.judul ||
          highest.asesmen.judul;

        deskripsiCapaianTertinggi = `Menunjukkan pemahaman sangat optimal dalam menguasai ${highestTopic}.`;

        if (sorted.length > 1) {
          const lowest = sorted[sorted.length - 1];
          if ((lowest.nilai_angka || 0) < 80) {
            const lowestTopic =
              lowest.asesmen.tujuan_pembelajaran?.deskripsi ||
              lowest.asesmen.lingkup_materi?.judul ||
              lowest.asesmen.judul;
            deskripsiPerluPeningkatan = `Perlu bimbingan dan pendampingan lebih lanjut dalam penguatan ${lowestTopic}.`;
          }
        }
      }

      mataPelajaranList.push({
        mataPelajaranId: mapel.id,
        mataPelajaranNama: mapel.nama,
        kodeMapel: mapel.kode,
        guruNama,
        guruNip: guru.nip || null,
        kktp,
        rerataFormatif,
        rerataSumatif,
        nilaiAkhir,
        predikat,
        isTuntas,
        hasMissingGrade,
        deskripsiCapaianTertinggi,
        deskripsiPerluPeningkatan,
        totalAsesmen: assignedGrades.length,
      });
    }

    const rerataKeseluruhan =
      gradedSubjectCount > 0 ? Math.round((totalScoreSum / gradedSubjectCount) * 10) / 10 : null;

    const totalMapelTuntas = mataPelajaranList.filter((m) => m.isTuntas).length;
    const persentaseKetuntasan =
      mataPelajaranList.length > 0
        ? Math.round((totalMapelTuntas / mataPelajaranList.length) * 100)
        : 0;

    // Parse Ekstrakurikuler
    let ekstrakurikuler: ExtracurricularItem[] = [];
    if (raporRecord?.ekstrakurikuler_json) {
      try {
        ekstrakurikuler = JSON.parse(raporRecord.ekstrakurikuler_json);
      } catch {
        ekstrakurikuler = [];
      }
    }

    // Default Catatan Wali Kelas jika belum diisi
    let defaultCatatan =
      "Ananda menunjukkan sikap belajar yang santun, aktif bekerja sama dalam kelompok, serta konsisten menuntaskan target pembelajaran.";
    if (rerataKeseluruhan !== null && rerataKeseluruhan < 75) {
      defaultCatatan =
        "Perlu meningkatkan kehadiran, ketertiban dalam pengumpulan tugas, serta lebih proaktif berkonsultasi dengan guru mata pelajaran.";
    }

    let defaultSaran =
      "Pertahankan semangat belajar dan terus kembangkan bakat kepemimpinan serta minat akademik di semester mendatang.";
    if (rerataKeseluruhan !== null && rerataKeseluruhan < 75) {
      defaultSaran =
        "Disarankan mengikuti program remedial terjadwal dan memperbanyak latihan mandiri dengan pendampingan orang tua di rumah.";
    }

    const catatanWaliKelas = raporRecord?.catatan_wali_kelas || defaultCatatan;
    const saranTindakLanjut = raporRecord?.saran_tindak_lanjut || defaultSaran;

    const status: ReportCardStatus = (raporRecord?.status as ReportCardStatus) || "DRAFT";

    const tanggalCetak = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return {
      id: raporRecord?.id,
      status,
      sekolah: {
        sekolahId,
        sekolahNama: school?.nama || "Ruang Pintar High School",
        npsn: school?.npsn || "20100001",
        alamat: school?.alamat || null,
        kabupatenKota: "Jakarta",
        provinsi: "DKI Jakarta",
        logoUrl: school?.logo_url || null,
        kepalaSekolahNama,
        kepalaSekolahNip,
      },
      siswa: {
        siswaId: student.id,
        namaLengkap: student.nama_lengkap,
        nis: student.nis,
        nisn: student.nisn,
        jenisKelamin: student.jenis_kelamin,
        rombelId: rombel.id,
        rombelNama: rombel.nama,
        tingkatNama: enrollment.tingkat?.nama || "Tingkat 10",
        waliKelasNama,
        waliKelasNip,
        nomorAbsen: placement.nomor_absen,
        tahunAjaranId: enrollment.tahun_ajaran_id,
        tahunAjaranNama: enrollment.tahun_ajaran.nama,
        semesterId: rombel.semester_id || "",
        semesterNama: rombel.semester?.nama || "Semester Ganjil",
      },
      mataPelajaranList,
      rerataKeseluruhan,
      totalMapel: mataPelajaranList.length,
      totalMapelTuntas,
      persentaseKetuntasan,
      hasIncompleteGrades,
      presensi: attendanceSummary,
      ekstrakurikuler,
      catatanWaliKelas,
      saranTindakLanjut,
      tanggalValidasi: raporRecord?.tanggal_validasi
        ? raporRecord.tanggal_validasi.toISOString()
        : null,
      divalidasiOleh: raporRecord?.divalidasi_oleh || null,
      tanggalPublikasi: raporRecord?.tanggal_publikasi
        ? raporRecord.tanggal_publikasi.toISOString()
        : null,
      dipublikasikanOleh: raporRecord?.dipublikasikan_oleh || null,
      tanggalCetak,
    };
  }

  /**
   * Mengagregasi rekapitulasi rapor seluruh siswa dalam rombel untuk Cockpit Wali Kelas.
   */
  async getRombelReportCardOverview(
    rombelId: string,
    sekolahId: string
  ): Promise<RombelReportOverviewDTO> {
    const rombel = await this.repo.getRombelReportCardRoster(rombelId, sekolahId);
    if (!rombel) {
      throw new StudentPlacementNotFoundError();
    }

    const wali = rombel.penugasan_wali[0]?.guru;
    const waliKelasNama = wali
      ? `${wali.gelar_depan ? wali.gelar_depan + " " : ""}${wali.nama_lengkap}${wali.gelar_belakang ? ", " + wali.gelar_belakang : ""}`
      : "Wali Kelas";
    const waliKelasNip = wali?.nip || null;

    const totalMapelCount = rombel.penugasan_mengajar.length;

    let totalDraft = 0;
    let totalValidated = 0;
    let totalPublished = 0;
    let totalLengkapNilai = 0;

    const siswaList: RombelReportSummaryItem[] = [];

    for (const p of rombel.penempatan_rombel) {
      const siswa = p.keikutsertaan.siswa;
      const rapor = p.rapor_siswa[0] || null;

      // Hitung mapel yang sudah memiliki nilai terbit
      const mapelIdsWithGrades = new Set(
        p.nilai_siswa.map(
          (n: { asesmen: { penugasan_mengajar_id: string } }) => n.asesmen.penugasan_mengajar_id
        )
      );
      const mapelLengkapCount = mapelIdsWithGrades.size;
      const isComplete = totalMapelCount > 0 && mapelLengkapCount >= totalMapelCount;

      if (isComplete) {
        totalLengkapNilai++;
      }

      // Hitung rerata nilai kasar dari nilai_siswa terbit
      let rerataNilai: number | null = null;
      const validNilai = p.nilai_siswa.filter(
        (n: { nilai_angka: number | null }) => n.nilai_angka !== null
      );
      if (validNilai.length > 0) {
        rerataNilai =
          Math.round(
            (validNilai.reduce(
              (acc: number, cur: { nilai_angka: number | null }) => acc + (cur.nilai_angka || 0),
              0
            ) /
              validNilai.length) *
              10
          ) / 10;
      }

      const presensi = {
        sakit: p.presensi_sesi_kelas.filter((pr: { status: string }) => pr.status === "SAKIT")
          .length,
        izin: p.presensi_sesi_kelas.filter((pr: { status: string }) => pr.status === "IZIN").length,
        tanpaKeterangan: p.presensi_sesi_kelas.filter(
          (pr: { status: string }) => pr.status === "ALPHA"
        ).length,
      };

      const statusRapor: ReportCardStatus = (rapor?.status as ReportCardStatus) || "DRAFT";
      if (statusRapor === "VALIDATED") {
        totalValidated++;
      } else if (statusRapor === "PUBLISHED") {
        totalPublished++;
      } else {
        totalDraft++;
      }

      let ekstrakurikulerCount = 0;
      if (rapor?.ekstrakurikuler_json) {
        try {
          const parsed = JSON.parse(rapor.ekstrakurikuler_json);
          ekstrakurikulerCount = Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          ekstrakurikulerCount = 0;
        }
      }

      siswaList.push({
        siswaId: siswa.id,
        penempatanRombelId: p.id,
        namaLengkap: siswa.nama_lengkap,
        nis: siswa.nis,
        nisn: siswa.nisn,
        nomorAbsen: p.nomor_absen,
        statusRapor,
        raporId: rapor?.id || null,
        rerataNilai,
        mapelLengkapCount,
        totalMapelCount,
        isComplete,
        presensi,
        catatanWaliKelas: rapor?.catatan_wali_kelas || null,
        saranTindakLanjut: rapor?.saran_tindak_lanjut || null,
        ekstrakurikulerCount,
        updatedAt: rapor?.updated_at ? rapor.updated_at.toISOString() : null,
      });
    }

    return {
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      tingkatNama: rombel.tingkat?.nama || "Tingkat",
      tahunAjaranNama: rombel.semester?.tahun_ajaran?.nama || "Tahun Ajaran",
      semesterNama: rombel.semester?.nama || "Semester",
      waliKelasNama,
      waliKelasNip,
      totalSiswa: rombel.penempatan_rombel.length,
      totalDraft,
      totalValidated,
      totalPublished,
      totalLengkapNilai,
      siswaList,
    };
  }
}

export const reportCardAggregationService = new ReportCardAggregationService();
