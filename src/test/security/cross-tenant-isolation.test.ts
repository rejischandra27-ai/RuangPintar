/**
 * Ruang Pintar — STAGE 10.1: Cross-Tenant Isolation Test Suite
 * Membuktikan secara matematis & kontraktual bahwa:
 * 1. Tenant A tidak dapat membaca data milik Tenant B (Presensi, CBT, Pengumuman, Portal Wali).
 * 2. Tenant A tidak dapat menulis data ke Tenant B (Presensi injection, Token CBT, Penugasan lintas sekolah).
 * 3. Tenant A tidak dapat mengubah atau menghapus data milik Tenant B (Materi, Tugas, TP, LM, Pengumuman).
 * 4. Authorization guard (requirePermission) menolak akses lintas tenant secara default (Default Deny).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requirePermission,
  AuthorizationError,
} from "@/shared/infrastructure/authorization/authz-guard";
import * as authGuardModule from "@/shared/infrastructure/auth/auth-guard";
import * as auditLoggerModule from "@/shared/infrastructure/audit/audit-logger";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { AttendanceService } from "@/modules/attendance/application/attendance-service";
import { AttendanceRepository } from "@/modules/attendance/infrastructure/attendance-repository";
import {
  AttendanceNotAllowedError,
  SessionNotFoundError,
} from "@/modules/attendance/domain/attendance-errors";

import { CommunicationService } from "@/modules/communication/application/communication-service";
import { CommunicationRepository } from "@/modules/communication/infrastructure/communication-repository";
import { AnnouncementNotFoundError } from "@/modules/communication/domain/communication-errors";

import { LearningRepository } from "@/modules/learning/infrastructure/learning-repository";
import { TeachingAssignmentService } from "@/modules/teacher/application/teaching-assignment-service";
import { HomeroomAssignmentService } from "@/modules/teacher/application/homeroom-assignment-service";
import { TeacherRepository } from "@/modules/teacher/infrastructure/teacher-repository";
import { GuardianService } from "@/modules/guardian/application/guardian-service";
import { GuardianRepository } from "@/modules/guardian/infrastructure/guardian-repository";
import {
  GuardianNotFoundError,
  ChildNotLinkedError,
} from "@/modules/guardian/domain/guardian-errors";
import { getExamPrintDataAction, refreshExamTokenAction } from "@/app/actions/cbt-actions";
import { RombelService } from "@/modules/academic/application/rombel-service";
import { AcademicRepository } from "@/modules/academic/infrastructure/academic-repository";
import { RombelNotFoundError } from "@/modules/academic/domain/academic-errors";
import { createTeacherAction } from "@/app/actions/teacher-actions";
import { openClassSessionAction } from "@/app/actions/class-session-actions";
import { createMateriAction } from "@/app/actions/learning-actions";
import { calendarRepository } from "@/modules/calendar/infrastructure/calendar-repository";
import { integrationRepository } from "@/modules/integration/infrastructure/integration-repository";
import { StudentRepository } from "@/modules/student/infrastructure/student-repository";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock prisma and audit logger
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: {
    guru: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    penugasanMengajar: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
    penugasanWaliKelas: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    penugasanJabatan: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    sesiKelasAktual: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    penempatanRombel: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    presensiSesiKelas: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    pengumuman: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    ujianCbt: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    lingkupMateri: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tujuanPembelajaran: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    materiPembelajaran: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    definisiTugas: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    administrasiPembelajaran: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tahunAjaran: {
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    semester: {
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    rombel: {
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    mataPelajaran: {
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    kalenderAkademik: {
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    endpointWebhook: {
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    waliMurid: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    hubunganWaliSiswa: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    siswa: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    langgananTenant: {
      findFirst: vi.fn().mockResolvedValue({
        id: "SUB_01",
        sekolah_id: "SCH_TENANT_A",
        paket: "ENTERPRISE",
        status: "ACTIVE",
        mulai_pada: new Date(),
        berakhir_pada: new Date(Date.now() + 1000000000),
      }),
    },
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === "function") {
        return cb(prisma);
      }
      return cb;
    }),
  },
}));

vi.mock("@/shared/infrastructure/audit/audit-logger", () => ({
  recordAuditEvent: vi.fn().mockResolvedValue({ id: "audit-123" }),
}));

describe("CRIT-01 — Comprehensive Cross-Tenant Isolation Tests", () => {
  const userTenantA = {
    id: "USER_TENANT_A",
    sekolah_id: "SCH_TENANT_A",
    username: "guru_sekolah_a",
    nama_lengkap: "Guru Sekolah A, S.Pd.",
    peran_dasar: "TEACHER" as const,
    status_akun: "AKTIF",
    harus_ganti_password: false,
    email: "guru@sekolaha.sch.id",
    created_at: new Date(),
  };

  const staffTenantA = {
    id: "STAFF_TENANT_A",
    sekolah_id: "SCH_TENANT_A",
    username: "staff_sekolah_a",
    nama_lengkap: "Staff Sekolah A",
    peran_dasar: "SCHOOL_STAFF" as const,
    status_akun: "AKTIF",
    harus_ganti_password: false,
    email: "staff@sekolaha.sch.id",
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.penugasanMengajar.findMany as any).mockResolvedValue([]);
    (prisma.penugasanWaliKelas.findMany as any).mockResolvedValue([]);
    (prisma.penugasanJabatan.findMany as any).mockResolvedValue([]);
    (prisma.penempatanRombel.findMany as any).mockResolvedValue([]);
    (prisma.presensiSesiKelas.findMany as any).mockResolvedValue([]);
    (prisma.lingkupMateri.findMany as any).mockResolvedValue([]);
  });

  // =========================================================================
  // 1. AUTHORIZATION GUARD BOUNDARY (requirePermission)
  // =========================================================================
  describe("1. Authorization Guard (requirePermission) Cross-Tenant Boundary", () => {
    it("Gagal dan melempar AuthorizationError saat actor SCH_A mencoba akses resource SCH_B", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue(userTenantA);
      const auditSpy = vi.spyOn(auditLoggerModule, "recordAuditEvent").mockResolvedValue({} as any);

      await expect(
        requirePermission("academic.school.view", {
          sekolah_id: "SCH_TENANT_B", // Explicit cross-tenant resource attempt
        })
      ).rejects.toThrow(AuthorizationError);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          aksi: "AUTHZ_CROSS_TENANT_DENIED",
          aktor_id: "USER_TENANT_A",
          sekolah_id: "SCH_TENANT_A",
        })
      );
    });

    it("Mengisi (inject) sekolah_id actor secara otomatis jika client tidak mengirimkannya", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue(userTenantA);
      // Teacher has academic.school.view permission
      const actor = await requirePermission("academic.school.view");
      expect(actor.sekolah_id).toBe("SCH_TENANT_A");
    });

    it("Menolak pengguna tanpa keanggotaan sekolah aktif (sekolah_id null) mengakses resource sekolah", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
        ...userTenantA,
        sekolah_id: null,
      });

      await expect(
        requirePermission("academic.school.view", { sekolah_id: "SCH_TENANT_A" })
      ).rejects.toThrow("keanggotaan aktif");
    });
  });

  // =========================================================================
  // 2. READ ISOLATION (Tenant A cannot read Tenant B data)
  // =========================================================================
  describe("2. Read Isolation across Tenants", () => {
    it("Pengumuman: Tenant A tidak dapat membaca pengumuman milik Tenant B", async () => {
      const commRepo = new CommunicationRepository();
      const commService = new CommunicationService(commRepo);

      // Announcement exists but belongs to Tenant B
      vi.spyOn(commRepo, "findById").mockResolvedValue({
        id: "PENGUMUMAN_TENANT_B",
        sekolah_id: "SCH_TENANT_B",
        judul: "Pengumuman Rahasia Tenant B",
        konten: "Konten privat",
        kategori: "AKADEMIK",
        target_audiens: "SEMUA",
        target_rombel_id: null,
        target_rombel: null,
        penulis_id: "USER_TENANT_B",
        penulis: {
          id: "USER_TENANT_B",
          nama_lengkap: "Admin Tenant B",
          peran_dasar: "SCHOOL_STAFF",
        },
        apakah_disematkan: false,
        dipublikasikan_pada: new Date(),
        lampiran_url: null,
        status: "PUBLISHED",
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Tenant A staff attempts to retrieve announcement
      await expect(
        commService.getAnnouncementById("PENGUMUMAN_TENANT_B", "SCH_TENANT_A")
      ).rejects.toThrow(AnnouncementNotFoundError);
    });

    it("Guardian Portal: Wali dari Tenant A tidak dapat mengakses profil atau data anak Tenant B", async () => {
      const guardianRepo = new GuardianRepository();
      const guardianService = new GuardianService(guardianRepo);

      const guardianUserTenantA = {
        id: "GUARDIAN_USER_A",
        sekolah_id: "SCH_TENANT_A",
        username: "wali_budi",
        nama_lengkap: "Bapak Budi",
        peran_dasar: "GUARDIAN" as const,
        status_akun: "AKTIF",
        harus_ganti_password: false,
        email: "wali@test.com",
        created_at: new Date(),
      };

      // Guardian profile found in SCH_TENANT_A
      vi.spyOn(guardianRepo, "getGuardianProfileByUserId").mockResolvedValue({
        id: "WALI_A",
        sekolah_id: "SCH_TENANT_A",
        pengguna_id: "GUARDIAN_USER_A",
        nama_lengkap: "Bapak Budi",
        jenis_kelamin: "LAKI_LAKI",
        no_telepon: "0812345678",
        email: "wali@test.com",
        pekerjaan: "Wiraswasta",
        penghasilan: "5jt",
        alamat: "Alamat A",
      });

      // Child belongs to SCH_TENANT_B -> assertVerifiedRelationship fails
      vi.spyOn(guardianRepo, "assertVerifiedRelationship").mockRejectedValue(
        new ChildNotLinkedError("WALI_A", "SISWA_TENANT_B")
      );

      await expect(
        guardianService.verifyGuardianChildAccess(guardianUserTenantA, "SISWA_TENANT_B")
      ).rejects.toThrow(ChildNotLinkedError);
    });

    it("CBT: Guru Tenant A tidak dapat mencetak naskah ujian atau membocorkan kunci jawaban Tenant B", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue(userTenantA);
      (prisma.ujianCbt.findFirst as any).mockResolvedValue(null);

      const result = await getExamPrintDataAction("UJIAN_TENANT_B");
      expect(result.success).toBe(false);
      expect(result.message).toContain("Ujian CBT tidak ditemukan atau bukan milik sekolah Anda.");
    });
  });

  // =========================================================================
  // 3. WRITE ISOLATION (Tenant A cannot write to Tenant B)
  // =========================================================================
  describe("3. Write Isolation across Tenants", () => {
    it("Presensi KBM: Guru Tenant A tidak dapat menulis presensi untuk sesi kelas Tenant B", async () => {
      const attendanceRepo = new AttendanceRepository();
      const attendanceService = new AttendanceService(attendanceRepo);

      // Session exists but belongs to SCH_TENANT_B
      vi.spyOn(attendanceRepo, "findSessionWithStudents").mockResolvedValue({
        id: "SESI_TENANT_B",
        sekolah_id: "SCH_TENANT_B",
        penugasan_mengajar_id: "PM_TENANT_B",
        guru_id: "GURU_TENANT_B",
        rombel_id: "ROMBEL_TENANT_B",
        tanggal: new Date(),
        jam_mulai_rencana: "07:00",
        jam_selesai_rencana: "08:30",
        jam_mulai_aktual: null,
        jam_selesai_aktual: null,
        status: "BERLANGSUNG",
        status_keterlambatan: "TEPAT_WAKTU",
        alasan_keterlambatan: null,
        materi_terlaksana: null,
        catatan_kegiatan: null,
        created_at: new Date(),
        updated_at: new Date(),
        penugasan_mengajar: {
          guru_id: "GURU_TENANT_B",
          guru_pengganti_id: null,
        },
      } as any);

      await expect(
        attendanceService.saveSessionAttendance("USER_TENANT_A", "TEACHER", "SCH_TENANT_A", {
          sesi_kelas_id: "SESI_TENANT_B",
          sekolah_id: "SCH_TENANT_A",
          items: [{ siswa_id: "SISWA_B_1", status: "HADIR" }],
        })
      ).rejects.toThrow(SessionNotFoundError);
    });

    it("Presensi KBM: Menolak penulisan jika siswa dalam payload bukan milik rombel/sekolah sesi tersebut", async () => {
      const attendanceRepo = new AttendanceRepository();
      const attendanceService = new AttendanceService(attendanceRepo);

      // Sesi kelas aktual exists in SCH_TENANT_A
      (prisma.sesiKelasAktual.findFirst as any).mockResolvedValue({
        id: "SESI_TENANT_A",
        sekolah_id: "SCH_TENANT_A",
        penugasan_mengajar_id: "PM_TENANT_A",
        guru_id: "GURU_TENANT_A",
        guru_pengganti_id: null,
        rombel_id: "ROMBEL_TENANT_A",
      });

      // Teacher profile matches SCH_TENANT_A
      (prisma.guru.findFirst as any).mockResolvedValue({
        id: "GURU_TENANT_A",
        sekolah_id: "SCH_TENANT_A",
        pengguna_id: "USER_TENANT_A",
      });

      // penempatanRombel findMany returns [] (student does not belong to this school's rombel)
      (prisma.penempatanRombel.findMany as any).mockResolvedValue([]);

      await expect(
        attendanceService.saveSessionAttendance("USER_TENANT_A", "TEACHER", "SCH_TENANT_A", {
          sesi_kelas_id: "SESI_TENANT_A",
          sekolah_id: "SCH_TENANT_A",
          items: [{ siswa_id: "SISWA_SPOOFED_TENANT_B", status: "HADIR" }],
        })
      ).rejects.toThrow(AttendanceNotAllowedError);
    });

    it("Penugasan Mengajar: Gagal membuat penugasan jika tahun ajaran bukan milik sekolah aktif", async () => {
      vi.spyOn(TeacherRepository, "findTeacherById").mockResolvedValue({
        id: "GURU_TENANT_A",
        sekolah_id: "SCH_TENANT_A",
      } as any);

      vi.spyOn(TeacherRepository, "findSubjectById").mockResolvedValue({
        id: "MAPEL_TENANT_A",
        sekolah_id: "SCH_TENANT_A",
      } as any);

      (prisma.rombel.findFirst as any).mockResolvedValue({
        id: "ROMBEL_TENANT_A",
        sekolah_id: "SCH_TENANT_A",
      });

      // Tahun Ajaran lookup scoped to SCH_TENANT_A returns null (because it belongs to SCH_TENANT_B)
      (prisma.tahunAjaran.findFirst as any).mockResolvedValue(null);

      await expect(
        TeachingAssignmentService.createTeachingAssignment({
          sekolah_id: "SCH_TENANT_A",
          guru_id: "GURU_TENANT_A",
          rombel_id: "ROMBEL_TENANT_A",
          mata_pelajaran_id: "MAPEL_TENANT_A",
          tahun_ajaran_id: "TAHUN_AJARAN_TENANT_B",
          semester_id: "SEMESTER_TENANT_A",
          jumlah_jam_minggu: 4,
        })
      ).rejects.toThrow("Pelanggaran batas institusi");
    });

    it("Penugasan Wali Kelas: Gagal menetapkan wali jika tahun ajaran bukan milik sekolah aktif", async () => {
      vi.spyOn(TeacherRepository, "findTeacherById").mockResolvedValue({
        id: "GURU_TENANT_A",
        sekolah_id: "SCH_TENANT_A",
      } as any);

      (prisma.rombel.findFirst as any).mockResolvedValue({
        id: "ROMBEL_TENANT_A",
        sekolah_id: "SCH_TENANT_A",
      });

      // Tahun Ajaran lookup scoped to SCH_TENANT_A returns null
      (prisma.tahunAjaran.findFirst as any).mockResolvedValue(null);

      await expect(
        HomeroomAssignmentService.assignHomeroom({
          sekolah_id: "SCH_TENANT_A",
          guru_id: "GURU_TENANT_A",
          rombel_id: "ROMBEL_TENANT_A",
          tahun_ajaran_id: "TAHUN_AJARAN_TENANT_B",
        })
      ).rejects.toThrow("Pelanggaran batas institusi");
    });

    it("CBT: Guru/Staf Tenant A tidak dapat mengacak token ujian (refresh token) milik Tenant B", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue(userTenantA);
      (prisma.ujianCbt.findFirst as any).mockResolvedValue(null);

      const result = await refreshExamTokenAction("UJIAN_TENANT_B");
      expect(result.success).toBe(false);
      expect(result.message).toContain("Ujian CBT tidak ditemukan atau bukan milik sekolah Anda.");
      expect(prisma.ujianCbt.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. MODIFY & DELETE ISOLATION (Tenant A cannot update/delete Tenant B data)
  // =========================================================================
  describe("4. Modify & Delete Isolation across Tenants", () => {
    it("Learning: Tenant A tidak dapat menyunting Lingkup Materi milik Tenant B", async () => {
      const learningRepo = new LearningRepository();

      // Entity belongs to SCH_TENANT_B; scoped findFirst with SCH_TENANT_A returns null
      (prisma.lingkupMateri.findFirst as any).mockResolvedValue(null);

      await expect(
        learningRepo.updateLingkupMateri(
          "LM_TENANT_B",
          { judul: "Judul Diretas" },
          "SCH_TENANT_A" // Scoped to Tenant A
        )
      ).rejects.toThrow("Lingkup materi dengan ID 'LM_TENANT_B' tidak ditemukan.");

      expect(prisma.lingkupMateri.update).not.toHaveBeenCalled();
    });

    it("Learning: Tenant A tidak dapat menghapus Lingkup Materi milik Tenant B", async () => {
      const learningRepo = new LearningRepository();

      (prisma.lingkupMateri.findFirst as any).mockResolvedValue(null);

      await expect(learningRepo.deleteLingkupMateri("LM_TENANT_B", "SCH_TENANT_A")).rejects.toThrow(
        "Lingkup materi dengan ID 'LM_TENANT_B' tidak ditemukan."
      );

      expect(prisma.lingkupMateri.delete).not.toHaveBeenCalled();
    });

    it("Learning: Tenant A tidak dapat menyunting Tujuan Pembelajaran milik Tenant B", async () => {
      const learningRepo = new LearningRepository();

      (prisma.tujuanPembelajaran.findFirst as any).mockResolvedValue(null);

      await expect(
        learningRepo.updateTujuanPembelajaran(
          "TP_TENANT_B",
          { deskripsi: "TP Diretas" },
          "SCH_TENANT_A"
        )
      ).rejects.toThrow("Tujuan pembelajaran dengan ID 'TP_TENANT_B' tidak ditemukan.");

      expect(prisma.tujuanPembelajaran.update).not.toHaveBeenCalled();
    });

    it("Learning: Tenant A tidak dapat menghapus Tujuan Pembelajaran milik Tenant B", async () => {
      const learningRepo = new LearningRepository();

      (prisma.tujuanPembelajaran.findFirst as any).mockResolvedValue(null);

      await expect(
        learningRepo.deleteTujuanPembelajaran("TP_TENANT_B", "SCH_TENANT_A")
      ).rejects.toThrow("Tujuan pembelajaran dengan ID 'TP_TENANT_B' tidak ditemukan.");

      expect(prisma.tujuanPembelajaran.delete).not.toHaveBeenCalled();
    });

    it("Learning: Tenant A tidak dapat menghapus Tugas milik Tenant B", async () => {
      const learningRepo = new LearningRepository();

      (prisma.definisiTugas.findFirst as any).mockResolvedValue(null);

      await expect(learningRepo.deleteTugas("TUGAS_TENANT_B", "SCH_TENANT_A")).rejects.toThrow(
        "Tugas dengan ID 'TUGAS_TENANT_B' tidak ditemukan."
      );

      expect(prisma.definisiTugas.delete).not.toHaveBeenCalled();
    });

    it("Learning: Tenant A tidak dapat menghapus Materi milik Tenant B", async () => {
      const learningRepo = new LearningRepository();

      (prisma.materiPembelajaran.findFirst as any).mockResolvedValue(null);

      await expect(learningRepo.deleteMateri("MATERI_TENANT_B", "SCH_TENANT_A")).rejects.toThrow(
        "Materi pembelajaran dengan ID 'MATERI_TENANT_B' tidak ditemukan."
      );

      expect(prisma.materiPembelajaran.delete).not.toHaveBeenCalled();
    });

    it("Pengumuman: Tenant A tidak dapat memperbarui pengumuman milik Tenant B", async () => {
      const commRepo = new CommunicationRepository();
      const commService = new CommunicationService(commRepo);

      // Existing announcement belongs to SCH_TENANT_B
      vi.spyOn(commRepo, "findById").mockResolvedValue({
        id: "PENGUMUMAN_TENANT_B",
        sekolah_id: "SCH_TENANT_B",
        judul: "Pengumuman Tenant B",
        konten: "Konten Asli",
        kategori: "AKADEMIK",
        target_audiens: "SEMUA",
        target_rombel_id: null,
        target_rombel: null,
        penulis_id: "USER_TENANT_B",
        penulis: {
          id: "USER_TENANT_B",
          nama_lengkap: "Staff Tenant B",
          peran_dasar: "SCHOOL_STAFF",
        },
        apakah_disematkan: false,
        dipublikasikan_pada: new Date(),
        lampiran_url: null,
        status: "PUBLISHED",
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(
        commService.updateAnnouncement(
          "PENGUMUMAN_TENANT_B",
          "SCH_TENANT_A",
          { id: "STAFF_TENANT_A", nama: "Staff A", peran: "SCHOOL_STAFF" },
          { judul: "Judul Diretas" }
        )
      ).rejects.toThrow(AnnouncementNotFoundError);
    });

    it("Pengumuman: Tenant A tidak dapat menghapus pengumuman milik Tenant B", async () => {
      const commRepo = new CommunicationRepository();
      const commService = new CommunicationService(commRepo);

      vi.spyOn(commRepo, "findById").mockResolvedValue({
        id: "PENGUMUMAN_TENANT_B",
        sekolah_id: "SCH_TENANT_B",
        judul: "Pengumuman Tenant B",
        konten: "Konten Asli",
        kategori: "AKADEMIK",
        target_audiens: "SEMUA",
        target_rombel_id: null,
        target_rombel: null,
        penulis_id: "USER_TENANT_B",
        penulis: {
          id: "USER_TENANT_B",
          nama_lengkap: "Staff Tenant B",
          peran_dasar: "SCHOOL_STAFF",
        },
        apakah_disematkan: false,
        dipublikasikan_pada: new Date(),
        lampiran_url: null,
        status: "PUBLISHED",
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(
        commService.deleteAnnouncement("PENGUMUMAN_TENANT_B", "SCH_TENANT_A", {
          id: "STAFF_TENANT_A",
          nama: "Staff A",
          peran: "SCHOOL_STAFF",
        })
      ).rejects.toThrow(AnnouncementNotFoundError);
    });
  });

  // =========================================================================
  // 5. REAL-WORLD ATTACK SCENARIOS & SERVER ACTIONS TAMPERING
  // =========================================================================
  describe("5. Real-World Attack Scenarios & Server Action Boundaries", () => {
    it("Attack Scenario: Operator Tenant A mencoba mengubah data Rombel milik Tenant B", async () => {
      const academicRepo = new AcademicRepository();
      const rombelService = new RombelService(academicRepo);

      // Scoped findFirst for SCH_TENANT_A returns null because rombel belongs to SCH_TENANT_B
      (prisma.rombel.findFirst as any).mockResolvedValue(null);

      await expect(
        rombelService.updateRombel(
          "ROMBEL_TENANT_B",
          "SCH_TENANT_A",
          { nama: "Rombel Diretas" },
          "STAFF_TENANT_A",
          "SCHOOL_STAFF"
        )
      ).rejects.toThrow(RombelNotFoundError);
    });

    it("Attack Scenario: Operator Tenant A mencoba menghapus data Rombel milik Tenant B", async () => {
      const academicRepo = new AcademicRepository();
      const rombelService = new RombelService(academicRepo);

      (prisma.rombel.findFirst as any).mockResolvedValue(null);

      await expect(
        rombelService.deleteRombel(
          "ROMBEL_TENANT_B",
          "SCH_TENANT_A",
          "STAFF_TENANT_A",
          "SCHOOL_STAFF"
        )
      ).rejects.toThrow(RombelNotFoundError);
    });

    it("Attack Scenario: User memalsukan sekolah_id di FormData pada createTeacherAction", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue(staffTenantA);

      const formData = new FormData();
      formData.append("sekolah_id", "SCH_TENANT_B"); // Spoofed target tenant
      formData.append("nama_lengkap", "Guru Disusupi");

      const result = await createTeacherAction(null, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Akses ditolak: Akses data lintas sekolah dilarang.");
    });

    it("Attack Scenario: Guru Tenant A membuka sesi kelas KBM (openClassSessionAction) dengan penugasan_id Tenant B", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue(userTenantA);

      // Scoped search with where: { id: penugasanId, sekolah_id: user.sekolah_id } returns null
      (prisma.penugasanMengajar.findFirst as any).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("penugasan_mengajar_id", "PENUGASAN_TENANT_B");

      const result = await openClassSessionAction(null, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Penugasan mengajar tidak ditemukan pada sekolah aktif.");
    });

    it("Attack Scenario: Guru Tenant A membuat materi (createMateriAction) dengan penugasan_id Tenant B", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue(userTenantA);

      (prisma.penugasanMengajar.findFirst as any).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("penugasan_mengajar_id", "PENUGASAN_TENANT_B");
      formData.append("judul", "Materi Penetrasi");

      const result = await createMateriAction(null, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Penugasan mengajar tidak ditemukan atau bukan milik sekolah aktif."
      );
    });
  });

  // =========================================================================
  // 6. REPOSITORY CROSS-TENANT MUTATION REJECTION (REMEDIATION BATCH 1)
  // =========================================================================
  describe("6. Repository Cross-Tenant Mutation Rejection (Remediation Batch 1)", () => {
    it("TeacherRepository.deleteSubject: throws error on cross-tenant subject delete", async () => {
      (prisma.mataPelajaran.deleteMany as any).mockResolvedValue({ count: 0 });

      await expect(
        TeacherRepository.deleteSubject("MAPEL_TENANT_B", "SCH_TENANT_A")
      ).rejects.toThrow("tidak ditemukan atau bukan milik sekolah aktif");
    });

    it("AcademicRepository.deleteRombel: throws error on cross-tenant rombel delete", async () => {
      (prisma.rombel.deleteMany as any).mockResolvedValue({ count: 0 });
      const academicRepo = new AcademicRepository();

      await expect(academicRepo.deleteRombel("ROMBEL_TENANT_B", "SCH_TENANT_A")).rejects.toThrow(
        "tidak ditemukan atau bukan milik sekolah aktif"
      );
    });

    it("CalendarRepository.delete: throws error on cross-tenant calendar event delete", async () => {
      (prisma.kalenderAkademik.deleteMany as any).mockResolvedValue({ count: 0 });

      await expect(calendarRepository.delete("EVENT_TENANT_B", "SCH_TENANT_A")).rejects.toThrow(
        "tidak ditemukan atau bukan milik sekolah aktif"
      );
    });

    it("CalendarRepository.update: throws error on cross-tenant calendar event update", async () => {
      (prisma.kalenderAkademik.findFirst as any).mockResolvedValue(null);

      await expect(
        calendarRepository.update({
          id: "EVENT_TENANT_B",
          sekolah_id: "SCH_TENANT_A",
          judul: "Update Cross Tenant",
          tipe_event: "HARI_LIBUR",
          tanggal_mulai: new Date(),
          tanggal_selesai: new Date(),
        })
      ).rejects.toThrow("tidak ditemukan atau bukan milik sekolah aktif");
    });

    it("CommunicationRepository.delete: throws error on cross-tenant announcement delete", async () => {
      (prisma.pengumuman.deleteMany as any).mockResolvedValue({ count: 0 });
      const commRepo = new CommunicationRepository();

      await expect(commRepo.delete("ANNOUNCEMENT_TENANT_B", "SCH_TENANT_A")).rejects.toThrow(
        "tidak ditemukan atau bukan milik sekolah aktif"
      );
    });

    it("IntegrationRepository.deleteWebhook: throws error on cross-tenant webhook delete", async () => {
      (prisma.endpointWebhook.deleteMany as any).mockResolvedValue({ count: 0 });

      await expect(
        integrationRepository.deleteWebhook("WEBHOOK_TENANT_B", "SCH_TENANT_A")
      ).rejects.toThrow("tidak ditemukan atau bukan milik sekolah aktif");
    });

    it("StudentRepository.deleteStudent: throws error on cross-tenant student delete", async () => {
      (prisma.siswa.deleteMany as any).mockResolvedValue({ count: 0 });
      const studentRepo = new StudentRepository();

      await expect(studentRepo.deleteStudent("STUDENT_TENANT_B", "SCH_TENANT_A")).rejects.toThrow(
        "tidak ditemukan atau bukan milik sekolah aktif"
      );
    });

    it("StudentRepository.updateStudent: throws error on cross-tenant student update", async () => {
      (prisma.siswa.findFirst as any).mockResolvedValue(null);
      const studentRepo = new StudentRepository();

      await expect(
        studentRepo.updateStudent("STUDENT_TENANT_B", "SCH_TENANT_A", {
          nama_lengkap: "Updated Fake Name",
        })
      ).rejects.toThrow("tidak ditemukan atau bukan milik sekolah aktif");
    });
  });
});
