/**
 * Ruang Pintar — Module M18: Digital Report Card Engine Tests
 * Vitest Test Suite: Aggregation, Domain Invariants, Validation & Lifecycle
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportCardAggregationService } from "@/modules/reporting/application/report-card-aggregation-service";
import { ReportCardValidationService } from "@/modules/reporting/application/report-card-validation-service";
import { ReportCardRepository } from "@/modules/reporting/infrastructure/report-card-repository";
import { ReportCardData, ReportCardStatus } from "@/modules/reporting/domain/report-card-types";
import {
  StudentPlacementNotFoundError,
  ReportCardValidationError,
  UnauthorizedReportCardAccessError,
} from "@/modules/reporting/domain/report-card-errors";

describe("Digital Report Card Engine (Kurikulum Merdeka Foundation)", () => {
  let mockRepo: ReportCardRepository;
  let aggregationService: ReportCardAggregationService;
  let validationService: ReportCardValidationService;

  beforeEach(() => {
    mockRepo = new ReportCardRepository();
    aggregationService = new ReportCardAggregationService(mockRepo);
    validationService = new ReportCardValidationService(mockRepo);
  });

  describe("1. Report Card Aggregation Engine", () => {
    it("harus menghitung bobot Kurikulum Merdeka 40% Formatif dan 60% Sumatif secara akurat", async () => {
      const mockRawData = {
        student: {
          id: "siswa-1",
          nama_lengkap: "Ahmad Siswa",
          nis: "1001",
          nisn: "0012345678",
          jenis_kelamin: "L",
        },
        enrollment: {
          tahun_ajaran_id: "ta-1",
          tahun_ajaran: { nama: "2026/2027" },
          tingkat: { nama: "Fase E (Kelas X)" },
        },
        placement: {
          id: "placement-1",
          nomor_absen: 1,
        },
        rombel: {
          id: "rombel-1",
          nama: "X TITL 1",
          semester_id: "sem-1",
          semester: { nama: "Semester Ganjil" },
          penugasan_wali: [
            {
              guru: {
                nama_lengkap: "Budi Santoso",
                gelar_depan: "Drs.",
                gelar_belakang: "M.Pd.",
                nip: "198001012005011001",
              },
            },
          ],
          penugasan_mengajar: [
            {
              id: "penugasan-matematika",
              mata_pelajaran: { id: "mapel-mat", nama: "Matematika", kode: "MAT" },
              guru: {
                nama_lengkap: "Siti Aminah",
                gelar_depan: null,
                gelar_belakang: "S.Pd.",
                nip: "198502022010012002",
              },
            },
          ],
        },
        school: {
          id: "sch-1",
          nama: "SMK Pusat Keunggulan",
          npsn: "20100001",
          alamat: "Jl. Pendidikan No. 1",
          logo_url: "/logo.png",
        },
        kepalaSekolahNama: "Dr. H. Mulyadi, M.Pd.",
        kepalaSekolahNip: "197204151998021001",
        publishedGrades: [
          // Formatif: 80, 90 -> Rerata = 85
          {
            nilai_angka: 80,
            asesmen: {
              penugasan_mengajar_id: "penugasan-matematika",
              kategori: "FORMATIF",
              judul: "Kuis Aljabar",
              tujuan_pembelajaran: { deskripsi: "Operasi Aljabar Linier" },
              capaian_pembelajaran: null,
            },
          },
          {
            nilai_angka: 90,
            asesmen: {
              penugasan_mengajar_id: "penugasan-matematika",
              kategori: "FORMATIF",
              judul: "Tugas Matriks",
              tujuan_pembelajaran: { deskripsi: "Determinan Matriks" },
              capaian_pembelajaran: null,
            },
          },
          // Sumatif: 75 -> Rerata = 75
          {
            nilai_angka: 75,
            asesmen: {
              penugasan_mengajar_id: "penugasan-matematika",
              kategori: "SUMATIF",
              judul: "Sumatif Tengah Semester",
              tujuan_pembelajaran: null,
              capaian_pembelajaran: { deskripsi: "Pemodelan Matematika Terapan" },
            },
          },
        ],
        attendanceSummary: {
          sakit: 2,
          izin: 1,
          tanpaKeterangan: 0,
        },
        raporRecord: null,
      };

      vi.spyOn(mockRepo, "getStudentRawAcademicData").mockResolvedValue(mockRawData as any);

      const result = await aggregationService.aggregateStudentReportCard("siswa-1", "sch-1");

      // Formatif: 85, Sumatif: 75 -> Nilai Akhir = Math.round(85 * 0.4 + 75 * 0.6) = Math.round(34 + 45) = 79
      const mapelMat = result.mataPelajaranList.find((m) => m.mataPelajaranNama === "Matematika");
      expect(mapelMat).toBeDefined();
      expect(mapelMat?.rerataFormatif).toBe(85);
      expect(mapelMat?.rerataSumatif).toBe(75);
      expect(mapelMat?.nilaiAkhir).toBe(79);
      expect(mapelMat?.predikat).toBe("C"); // 70 <= NA < 80 -> Predikat C
      expect(mapelMat?.isTuntas).toBe(true); // NA 79 >= KKTP 75
      expect(mapelMat?.hasMissingGrade).toBe(false);

      // Narasi Capaian
      expect(mapelMat?.deskripsiCapaianTertinggi).toContain("Determinan Matriks");

      // Presensi
      expect(result.presensi.sakit).toBe(2);
      expect(result.presensi.izin).toBe(1);
      expect(result.presensi.tanpaKeterangan).toBe(0);

      // Status default
      expect(result.status).toBe("DRAFT");
    });

    it("mematuhi Domain Invariant: Missing Grade ≠ Zero Grade (nilai tidak diset 0 jika belum ada asesmen)", async () => {
      const mockRawData = {
        student: { id: "siswa-2", nama_lengkap: "Bambang", nis: "1002", jenis_kelamin: "L" },
        enrollment: {
          tahun_ajaran_id: "ta-1",
          tahun_ajaran: { nama: "2026/2027" },
          tingkat: { nama: "Fase E" },
        },
        placement: { id: "placement-2", nomor_absen: 2 },
        rombel: {
          id: "rombel-1",
          nama: "X TITL 1",
          semester_id: "sem-1",
          semester: { nama: "Semester Ganjil" },
          penugasan_wali: [],
          penugasan_mengajar: [
            {
              id: "penugasan-fisika",
              mata_pelajaran: { id: "mapel-fis", nama: "Fisika Terapan", kode: "FIS" },
              guru: {
                nama_lengkap: "Guru Fisika",
                gelar_depan: null,
                gelar_belakang: null,
                nip: null,
              },
            },
          ],
        },
        school: { id: "sch-1", nama: "SMK Otomindo", npsn: "20100001" },
        kepalaSekolahNama: "Kepala Sekolah",
        kepalaSekolahNip: null,
        publishedGrades: [], // TIDAK ADA NILAI
        attendanceSummary: { sakit: 0, izin: 0, tanpaKeterangan: 0 },
        raporRecord: null,
      };

      vi.spyOn(mockRepo, "getStudentRawAcademicData").mockResolvedValue(mockRawData as any);

      const result = await aggregationService.aggregateStudentReportCard("siswa-2", "sch-1");

      const mapelFis = result.mataPelajaranList[0];
      // INVARIANT CHECK: Nilai akhir wajib NULL, bukan 0!
      expect(mapelFis.nilaiAkhir).toBeNull();
      expect(mapelFis.predikat).toBe("-");
      expect(mapelFis.hasMissingGrade).toBe(true);
      expect(result.hasIncompleteGrades).toBe(true);
    });

    it("melempar StudentPlacementNotFoundError jika data penempatan siswa tidak ada", async () => {
      vi.spyOn(mockRepo, "getStudentRawAcademicData").mockResolvedValue(null);

      await expect(
        aggregationService.aggregateStudentReportCard("siswa-unknown", "sch-1")
      ).rejects.toThrow(StudentPlacementNotFoundError);
    });
  });

  describe("2. Report Card Validation Service", () => {
    const baseMockReport: ReportCardData = {
      status: "DRAFT",
      sekolah: {
        sekolahId: "sch-1",
        sekolahNama: "SMK Otomindo",
        npsn: "20100001",
        alamat: null,
        kabupatenKota: "Jakarta",
        provinsi: "DKI Jakarta",
        logoUrl: null,
        kepalaSekolahNama: "Drs. Mulyadi",
        kepalaSekolahNip: null,
      },
      siswa: {
        siswaId: "siswa-1",
        namaLengkap: "Ahmad",
        nis: "1001",
        nisn: null,
        jenisKelamin: "L",
        rombelId: "rombel-1",
        rombelNama: "X TITL 1",
        tingkatNama: "Fase E",
        waliKelasNama: "Wali Kelas",
        waliKelasNip: null,
        nomorAbsen: 1,
        tahunAjaranId: "ta-1",
        tahunAjaranNama: "2026/2027",
        semesterId: "sem-1",
        semesterNama: "Semester Ganjil",
      },
      mataPelajaranList: [
        {
          mataPelajaranId: "mapel-1",
          mataPelajaranNama: "Matematika",
          guruNama: "Guru Mat",
          kktp: 75,
          rerataFormatif: 85,
          rerataSumatif: 80,
          nilaiAkhir: 82,
          predikat: "B",
          isTuntas: true,
          hasMissingGrade: false,
          deskripsiCapaianTertinggi: "Baik",
          deskripsiPerluPeningkatan: "",
          totalAsesmen: 2,
        },
      ],
      rerataKeseluruhan: 82,
      totalMapel: 1,
      totalMapelTuntas: 1,
      persentaseKetuntasan: 100,
      hasIncompleteGrades: false,
      presensi: { sakit: 0, izin: 0, tanpaKeterangan: 0 },
      ekstrakurikuler: [],
      catatanWaliKelas: "Pertahankan prestasi belajar yang baik.",
      saranTindakLanjut: "Tingkatkan partisipasi aktif.",
      tanggalValidasi: null,
      divalidasiOleh: null,
      tanggalPublikasi: null,
      dipublikasikanOleh: null,
      tanggalCetak: "25 September 2026",
    };

    it("harus menyatakan rapor valid dan siap publish jika seluruh nilai lengkap dan catatan terisi", () => {
      const check = validationService.validateReportCard(baseMockReport);
      expect(check.isValid).toBe(true);
      expect(check.canValidate).toBe(true);
      expect(check.canPublish).toBe(true);
      expect(check.issues.length).toBe(0);
    });

    it("harus mendeteksi missing grade dan memblokir publikasi jika ada mapel yang belum dinilai", () => {
      const incompleteReport: ReportCardData = {
        ...baseMockReport,
        mataPelajaranList: [
          ...baseMockReport.mataPelajaranList,
          {
            mataPelajaranId: "mapel-2",
            mataPelajaranNama: "Bahasa Inggris",
            guruNama: "Guru Bing",
            kktp: 75,
            rerataFormatif: null,
            rerataSumatif: null,
            nilaiAkhir: null,
            predikat: "-",
            isTuntas: false,
            hasMissingGrade: true,
            deskripsiCapaianTertinggi: "-",
            deskripsiPerluPeningkatan: "-",
            totalAsesmen: 0,
          },
        ],
        hasIncompleteGrades: true,
      };

      const check = validationService.validateReportCard(incompleteReport);
      expect(check.isValid).toBe(false);
      expect(check.canPublish).toBe(false); // Dilarang publish jika ada missing grades!
      expect(check.issues.some((i) => i.kode === "MISSING_GRADE")).toBe(true);
    });

    it("harus mendeteksi jika mata pelajaran duplikat di rombel", () => {
      const duplicateReport: ReportCardData = {
        ...baseMockReport,
        mataPelajaranList: [
          baseMockReport.mataPelajaranList[0],
          {
            ...baseMockReport.mataPelajaranList[0],
            mataPelajaranNama: "Matematika Duplikat",
          },
        ],
      };

      const check = validationService.validateReportCard(duplicateReport);
      expect(check.isValid).toBe(false);
      expect(check.canValidate).toBe(false);
      expect(check.issues.some((i) => i.kode === "DUPLICATE_SUBJECT")).toBe(true);
    });
  });

  describe("3. Lifecycle State Transition & Authorization", () => {
    it("harus menolak transisi status jika aktor bukan guru/wali/admin", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({
        id: "rapor-1",
        sekolah_id: "sch-1",
        status: "DRAFT",
      } as any);

      await expect(
        validationService.transitionStatus({
          raporId: "rapor-1",
          sekolahId: "sch-1",
          targetStatus: "VALIDATED",
          actorRole: "STUDENT", // Siswa dilarang memvalidasi rapor
          actorName: "Siswa",
        })
      ).rejects.toThrow(UnauthorizedReportCardAccessError);
    });

    it("harus mengizinkan Wali Kelas (TEACHER) memvalidasi rapor jika data valid", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({
        id: "rapor-1",
        sekolah_id: "sch-1",
        status: "DRAFT",
      } as any);

      vi.spyOn(mockRepo, "updateStatus").mockResolvedValue({
        id: "rapor-1",
        status: "VALIDATED",
      } as any);

      const updated = await validationService.transitionStatus({
        raporId: "rapor-1",
        sekolahId: "sch-1",
        targetStatus: "VALIDATED",
        actorRole: "TEACHER",
        actorName: "Budi Santoso (Wali Kelas)",
      });

      expect(updated.status).toBe("VALIDATED");
      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        "rapor-1",
        "sch-1",
        "VALIDATED",
        "Budi Santoso (Wali Kelas)"
      );
    });

    it("harus mengizinkan penerbitan rapor (PUBLISHED) jika status sebelumnya VALIDATED", async () => {
      vi.spyOn(mockRepo, "findById").mockResolvedValue({
        id: "rapor-1",
        sekolah_id: "sch-1",
        status: "VALIDATED",
      } as any);

      vi.spyOn(mockRepo, "updateStatus").mockResolvedValue({
        id: "rapor-1",
        status: "PUBLISHED",
      } as any);

      const updated = await validationService.transitionStatus({
        raporId: "rapor-1",
        sekolahId: "sch-1",
        targetStatus: "PUBLISHED",
        actorRole: "TEACHER",
        actorName: "Budi Santoso",
      });

      expect(updated.status).toBe("PUBLISHED");
      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        "rapor-1",
        "sch-1",
        "PUBLISHED",
        "Budi Santoso"
      );
    });
  });

  describe("4. Rombel Overview Aggregation", () => {
    it("harus mengagregasi data rombel dengan metrik draft, validated, dan published yang tepat", async () => {
      const mockRombelRoster = {
        id: "rombel-1",
        nama: "X TITL 1",
        tingkat: { nama: "Fase E" },
        semester: {
          nama: "Semester Ganjil",
          tahun_ajaran: { nama: "2026/2027" },
        },
        penugasan_wali: [
          { guru: { nama_lengkap: "Wali 1", gelar_depan: null, gelar_belakang: null, nip: null } },
        ],
        penugasan_mengajar: [
          { id: "p1", mata_pelajaran: { id: "m1", nama: "Matematika" } },
          { id: "p2", mata_pelajaran: { id: "m2", nama: "Bahasa Indonesia" } },
        ],
        penempatan_rombel: [
          // Siswa 1: Status PUBLISHED, nilai 2/2 lengkap
          {
            id: "pen-1",
            nomor_absen: 1,
            keikutsertaan: {
              siswa: { id: "s1", nama_lengkap: "Siswa Satu", nis: "101", nisn: null },
            },
            rapor_siswa: [
              {
                id: "r1",
                status: "PUBLISHED",
                catatan_wali_kelas: "Bagus",
                updated_at: new Date(),
              },
            ],
            nilai_siswa: [
              { nilai_angka: 85, asesmen: { penugasan_mengajar_id: "p1" } },
              { nilai_angka: 90, asesmen: { penugasan_mengajar_id: "p2" } },
            ],
            presensi_sesi_kelas: [{ status: "HADIR" }],
          },
          // Siswa 2: Status DRAFT, nilai 1/2 belum lengkap
          {
            id: "pen-2",
            nomor_absen: 2,
            keikutsertaan: {
              siswa: { id: "s2", nama_lengkap: "Siswa Dua", nis: "102", nisn: null },
            },
            rapor_siswa: [], // default DRAFT
            nilai_siswa: [{ nilai_angka: 80, asesmen: { penugasan_mengajar_id: "p1" } }],
            presensi_sesi_kelas: [{ status: "SAKIT" }],
          },
        ],
      };

      vi.spyOn(mockRepo, "getRombelReportCardRoster").mockResolvedValue(mockRombelRoster as any);

      const overview = await aggregationService.getRombelReportCardOverview("rombel-1", "sch-1");

      expect(overview.totalSiswa).toBe(2);
      expect(overview.totalPublished).toBe(1);
      expect(overview.totalDraft).toBe(1);
      expect(overview.totalLengkapNilai).toBe(1); // Hanya Siswa 1 yang lengkap 2/2 mapel

      const s1 = overview.siswaList.find((s) => s.siswaId === "s1");
      expect(s1?.isComplete).toBe(true);
      expect(s1?.statusRapor).toBe("PUBLISHED");

      const s2 = overview.siswaList.find((s) => s.siswaId === "s2");
      expect(s2?.isComplete).toBe(false);
      expect(s2?.statusRapor).toBe("DRAFT");
      expect(s2?.presensi.sakit).toBe(1);
    });
  });
});
