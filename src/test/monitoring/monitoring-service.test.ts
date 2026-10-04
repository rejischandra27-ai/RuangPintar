import { describe, it, expect, vi, beforeEach } from "vitest";
import { MonitoringService } from "@/modules/monitoring/application/monitoring-service";
import { MonitoringRepository } from "@/modules/monitoring/infrastructure/monitoring-repository";
import {
  HomeroomNotFoundError,
  MonitoringValidationError,
  UnauthorizedHomeroomAccessError,
} from "@/modules/monitoring/domain/monitoring-errors";
import { AuthenticatedUser } from "@/shared/infrastructure/auth/auth-service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";

vi.mock("@/shared/infrastructure/audit/audit-logger", () => ({
  recordAuditEvent: vi.fn().mockResolvedValue({ id: "AUDIT_01" }),
}));

describe("M18 Student Monitoring & Homeroom — MonitoringService Domain & Application", () => {
  const mockSekolahId = "01JA0000000000000000000001";
  const mockTeacherUserId = "01JA0000000000000000000002";
  const mockTeacherId = "01JA000000000000000000GUR1";
  const mockRombelId = "01JA0000000000000000ROM001";
  const mockOtherRombelId = "01JA0000000000000000ROM999";
  const mockSiswaId = "01JA0000000000000000SIS001";

  const teacherUser: AuthenticatedUser = {
    id: mockTeacherUserId,
    username: "guru_marhanih",
    email: null,
    nama_lengkap: "Marhanih, S.Pd",
    peran_dasar: "TEACHER",
    sekolah_id: mockSekolahId,
    status_akun: "AKTIF",
    harus_ganti_password: false,
  };

  const adminUser: AuthenticatedUser = {
    id: "01JA00000000000000000ADMIN",
    username: "admin_super",
    email: null,
    nama_lengkap: "Super Administrator",
    peran_dasar: "SUPER_ADMIN",
    sekolah_id: mockSekolahId,
    status_akun: "AKTIF",
    harus_ganti_password: false,
  };

  const studentUser: AuthenticatedUser = {
    id: "01JA0000000000000000STUD01",
    username: "siswa_01",
    email: null,
    nama_lengkap: "Siswa Satu",
    peran_dasar: "STUDENT",
    sekolah_id: mockSekolahId,
    status_akun: "AKTIF",
    harus_ganti_password: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Homeroom Scoping & Access Control (Default Deny)", () => {
    it("memvalidasi wali kelas sah yang meminta rombel binaannya", async () => {
      vi.spyOn(prisma.guru, "findFirst").mockResolvedValue({
        id: mockTeacherId,
        sekolah_id: mockSekolahId,
        pengguna_id: mockTeacherUserId,
      } as any);

      vi.spyOn(MonitoringRepository, "getTeacherActiveHomeroom").mockResolvedValue({
        id: "PENUGASAN_WALI_1",
        rombel_id: mockRombelId,
        guru_id: mockTeacherId,
      } as any);

      const effectiveRombelId = await MonitoringService.assertHomeroomAccess(
        teacherUser,
        mockRombelId
      );

      expect(effectiveRombelId).toBe(mockRombelId);
    });

    it("menolak guru yang mencoba mengakses rombel di luar binaannya", async () => {
      vi.spyOn(prisma.guru, "findFirst").mockResolvedValue({
        id: mockTeacherId,
        sekolah_id: mockSekolahId,
        pengguna_id: mockTeacherUserId,
      } as any);

      vi.spyOn(MonitoringRepository, "getTeacherActiveHomeroom").mockResolvedValue({
        id: "PENUGASAN_WALI_1",
        rombel_id: mockRombelId,
        guru_id: mockTeacherId,
      } as any);

      await expect(
        MonitoringService.assertHomeroomAccess(teacherUser, mockOtherRombelId)
      ).rejects.toThrow(UnauthorizedHomeroomAccessError);
    });

    it("menolak guru yang belum memiliki penugasan wali kelas aktif", async () => {
      vi.spyOn(prisma.guru, "findFirst").mockResolvedValue({
        id: mockTeacherId,
        sekolah_id: mockSekolahId,
        pengguna_id: mockTeacherUserId,
      } as any);

      vi.spyOn(MonitoringRepository, "getTeacherActiveHomeroom").mockResolvedValue(null);

      await expect(
        MonitoringService.assertHomeroomAccess(teacherUser, mockRombelId)
      ).rejects.toThrow(UnauthorizedHomeroomAccessError);
    });

    it("mengizinkan SUPER_ADMIN mengakses rombel manapun untuk supervisi", async () => {
      const result = await MonitoringService.assertHomeroomAccess(adminUser, mockOtherRombelId);
      expect(result).toBe(mockOtherRombelId);
    });

    it("menolak peran STUDENT atau GUARDIAN (Default Deny)", async () => {
      await expect(
        MonitoringService.assertHomeroomAccess(studentUser, mockRombelId)
      ).rejects.toThrow(UnauthorizedHomeroomAccessError);
    });

    it("menolak jika konteks sekolah pengguna tidak valid (null)", async () => {
      const userWithoutSchool: AuthenticatedUser = {
        ...teacherUser,
        sekolah_id: null,
      };

      await expect(
        MonitoringService.assertHomeroomAccess(userWithoutSchool, mockRombelId)
      ).rejects.toThrow(UnauthorizedHomeroomAccessError);
    });
  });

  describe("2. Catatan Pembinaan Siswa (CRUD & Audit)", () => {
    it("menolak pembuatan catatan dengan judul atau isi kosong", async () => {
      vi.spyOn(prisma.guru, "findFirst").mockResolvedValue({
        id: mockTeacherId,
        sekolah_id: mockSekolahId,
        pengguna_id: mockTeacherUserId,
      } as any);

      vi.spyOn(MonitoringRepository, "getTeacherActiveHomeroom").mockResolvedValue({
        id: "PENUGASAN_WALI_1",
        rombel_id: mockRombelId,
        guru_id: mockTeacherId,
      } as any);

      await expect(
        MonitoringService.createMonitoringNote(teacherUser, {
          rombel_id: mockRombelId,
          siswa_id: mockSiswaId,
          judul: "",
          isi: "Catatan tanpa judul",
        })
      ).rejects.toThrow(MonitoringValidationError);

      await expect(
        MonitoringService.createMonitoringNote(teacherUser, {
          rombel_id: mockRombelId,
          siswa_id: mockSiswaId,
          judul: "Judul",
          isi: "",
        })
      ).rejects.toThrow(MonitoringValidationError);
    });

    it("berhasil membuat catatan pembinaan baru dan merekam audit log", async () => {
      vi.spyOn(prisma.guru, "findFirst").mockResolvedValue({
        id: mockTeacherId,
        sekolah_id: mockSekolahId,
        pengguna_id: mockTeacherUserId,
      } as any);

      vi.spyOn(MonitoringRepository, "getTeacherActiveHomeroom").mockResolvedValue({
        id: "PENUGASAN_WALI_1",
        rombel_id: mockRombelId,
        guru_id: mockTeacherId,
      } as any);

      const fakeNote = {
        id: "NOTE_01",
        sekolah_id: mockSekolahId,
        rombel_id: mockRombelId,
        siswa_id: mockSiswaId,
        siswa_nama: "Aditya Pratama",
        siswa_nis: "1001",
        penulis_id: mockTeacherUserId,
        penulis_nama: "Marhanih, S.Pd",
        penulis_peran: "TEACHER",
        judul: "Konseling Keterlambatan Berulang",
        isi: "Siswa telah terlambat lebih dari 3 kali dalam seminggu.",
        kategori: "KEHADIRAN" as const,
        tingkat_urgensi: "TINGGI" as const,
        status: "AKTIF" as const,
        created_at: new Date(),
        updated_at: new Date(),
        tindak_lanjut: [
          {
            id: "TL_01",
            catatan_id: "NOTE_01",
            penanggung_jawab_id: mockTeacherUserId,
            penanggung_jawab_nama: "Marhanih, S.Pd",
            tindakan: "Panggilan wali murid hari Rabu",
            target_tanggal: new Date("2026-09-16"),
            status: "DIRENCANAKAN" as const,
            hasil: null,
            tanggal_penyelesaian: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      vi.spyOn(MonitoringRepository, "createMonitoringNote").mockResolvedValue(fakeNote);

      const result = await MonitoringService.createMonitoringNote(teacherUser, {
        rombel_id: mockRombelId,
        siswa_id: mockSiswaId,
        judul: "Konseling Keterlambatan Berulang",
        isi: "Siswa telah terlambat lebih dari 3 kali dalam seminggu.",
        kategori: "KEHADIRAN",
        tingkat_urgensi: "TINGGI",
        tindak_lanjut_tindakan: "Panggilan wali murid hari Rabu",
        tindak_lanjut_target_tanggal: "2026-09-16",
      });

      expect(result.id).toBe("NOTE_01");
      expect(result.tindak_lanjut.length).toBe(1);
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aksi: "CREATE_MONITORING_NOTE",
          tipe_sumber: "CatatanMonitoring",
          id_sumber: "NOTE_01",
        })
      );
    });

    it("mengupdate status catatan monitoring dan mencatat audit trail", async () => {
      vi.spyOn(prisma.catatanMonitoring, "findFirst").mockResolvedValue({
        id: "NOTE_01",
        rombel_id: mockRombelId,
      } as any);

      vi.spyOn(prisma.guru, "findFirst").mockResolvedValue({
        id: mockTeacherId,
        sekolah_id: mockSekolahId,
        pengguna_id: mockTeacherUserId,
      } as any);

      vi.spyOn(MonitoringRepository, "getTeacherActiveHomeroom").mockResolvedValue({
        id: "PENUGASAN_WALI_1",
        rombel_id: mockRombelId,
        guru_id: mockTeacherId,
      } as any);

      const fakeUpdatedNote = {
        id: "NOTE_01",
        sekolah_id: mockSekolahId,
        rombel_id: mockRombelId,
        siswa_id: mockSiswaId,
        siswa_nama: "Aditya Pratama",
        siswa_nis: "1001",
        penulis_id: mockTeacherUserId,
        penulis_nama: "Marhanih, S.Pd",
        penulis_peran: "TEACHER",
        judul: "Konseling Keterlambatan Selesai",
        isi: "Siswa sudah berkomitmen datang tepat waktu.",
        kategori: "KEHADIRAN" as const,
        tingkat_urgensi: "RENDAH" as const,
        status: "SELESAI" as const,
        created_at: new Date(),
        updated_at: new Date(),
        tindak_lanjut: [],
      };

      vi.spyOn(MonitoringRepository, "updateMonitoringNote").mockResolvedValue(fakeUpdatedNote);

      const result = await MonitoringService.updateMonitoringNote(teacherUser, {
        id: "NOTE_01",
        status: "SELESAI",
      });

      expect(result.status).toBe("SELESAI");
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aksi: "UPDATE_MONITORING_NOTE",
          id_sumber: "NOTE_01",
        })
      );
    });
  });

  describe("3. Tindak Lanjut Monitoring (Intervensi)", () => {
    it("berhasil menambahkan tindak lanjut intervensi", async () => {
      vi.spyOn(prisma.catatanMonitoring, "findUnique").mockResolvedValue({
        id: "NOTE_01",
        rombel_id: mockRombelId,
      } as any);

      vi.spyOn(prisma.guru, "findFirst").mockResolvedValue({
        id: mockTeacherId,
        sekolah_id: mockSekolahId,
        pengguna_id: mockTeacherUserId,
      } as any);

      vi.spyOn(MonitoringRepository, "getTeacherActiveHomeroom").mockResolvedValue({
        id: "PENUGASAN_WALI_1",
        rombel_id: mockRombelId,
        guru_id: mockTeacherId,
      } as any);

      const fakeTl = {
        id: "TL_99",
        catatan_id: "NOTE_01",
        penanggung_jawab_id: mockTeacherUserId,
        penanggung_jawab_nama: "Marhanih, S.Pd",
        tindakan: "Home visit ke rumah wali siswa",
        target_tanggal: new Date("2026-09-20"),
        status: "DIRENCANAKAN" as const,
        hasil: null,
        tanggal_penyelesaian: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.spyOn(MonitoringRepository, "createFollowUp").mockResolvedValue(fakeTl);

      const result = await MonitoringService.createFollowUp(teacherUser, {
        catatan_id: "NOTE_01",
        tindakan: "Home visit ke rumah wali siswa",
        target_tanggal: "2026-09-20",
      });

      expect(result.id).toBe("TL_99");
      expect(result.tindakan).toBe("Home visit ke rumah wali siswa");
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aksi: "CREATE_FOLLOW_UP",
          id_sumber: "TL_99",
        })
      );
    });

    it("mengupdate status tindak lanjut menjadi SELESAI dan mencatat tanggal penyelesaian", async () => {
      vi.spyOn(prisma.tindakLanjutMonitoring, "findFirst").mockResolvedValue({
        id: "TL_99",
        catatan: {
          rombel_id: mockRombelId,
        },
      } as any);

      vi.spyOn(prisma.guru, "findFirst").mockResolvedValue({
        id: mockTeacherId,
        sekolah_id: mockSekolahId,
        pengguna_id: mockTeacherUserId,
      } as any);

      vi.spyOn(MonitoringRepository, "getTeacherActiveHomeroom").mockResolvedValue({
        id: "PENUGASAN_WALI_1",
        rombel_id: mockRombelId,
        guru_id: mockTeacherId,
      } as any);

      const fakeUpdatedTl = {
        id: "TL_99",
        catatan_id: "NOTE_01",
        penanggung_jawab_id: mockTeacherUserId,
        penanggung_jawab_nama: "Marhanih, S.Pd",
        tindakan: "Home visit ke rumah wali siswa",
        target_tanggal: new Date("2026-09-20"),
        status: "SELESAI" as const,
        hasil: "Orang tua sepakat mengantar anak setiap pukul 06.30 WIB",
        tanggal_penyelesaian: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.spyOn(MonitoringRepository, "updateFollowUpStatus").mockResolvedValue(fakeUpdatedTl);

      const result = await MonitoringService.updateFollowUpStatus(teacherUser, {
        id: "TL_99",
        status: "SELESAI",
        hasil: "Orang tua sepakat mengantar anak setiap pukul 06.30 WIB",
      });

      expect(result.status).toBe("SELESAI");
      expect(result.hasil).toContain("Orang tua sepakat");
      expect(recordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aksi: "UPDATE_FOLLOW_UP",
          id_sumber: "TL_99",
        })
      );
    });
  });

  describe("4. Dropdown Supervisi Rombel (Super Admin & Guru)", () => {
    it("mengembalikan seluruh rombel untuk SUPER_ADMIN", async () => {
      vi.spyOn(MonitoringRepository, "getAllActiveHomerooms").mockResolvedValue([
        {
          rombel_id: "ROM_1",
          rombel: { nama: "X TO 1", kapasitas: 36 },
          guru: { gelar_depan: null, nama_lengkap: "Budi", gelar_belakang: "M.Pd" },
        },
        {
          rombel_id: "ROM_2",
          rombel: { nama: "X TO 2", kapasitas: 36 },
          guru: { gelar_depan: "Drs.", nama_lengkap: "Siti", gelar_belakang: null },
        },
      ] as any);

      const list = await MonitoringService.getActiveHomeroomsList(adminUser);
      expect(list.length).toBe(2);
      expect(list[0]?.rombel_nama).toBe("X TO 1");
      expect(list[0]?.guru_nama).toBe("Budi M.Pd");
    });

    it("mengembalikan hanya 1 rombel binaan untuk TEACHER wali kelas", async () => {
      vi.spyOn(prisma.guru, "findFirst").mockResolvedValue({
        id: mockTeacherId,
        sekolah_id: mockSekolahId,
        pengguna_id: mockTeacherUserId,
      } as any);

      vi.spyOn(MonitoringRepository, "getTeacherActiveHomeroom").mockResolvedValue({
        rombel_id: mockRombelId,
        rombel: { nama: "X TO 3", kapasitas: 36 },
        guru: { gelar_depan: null, nama_lengkap: "Marhanih", gelar_belakang: "S.Pd" },
      } as any);

      const list = await MonitoringService.getActiveHomeroomsList(teacherUser);
      expect(list.length).toBe(1);
      expect(list[0]?.rombel_id).toBe(mockRombelId);
      expect(list[0]?.rombel_nama).toBe("X TO 3");
    });
  });
});
