import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ulid } from "ulidx";
import * as authGuardModule from "@/shared/infrastructure/auth/auth-guard";
import { checkPermission } from "@/shared/infrastructure/authorization/authz-guard";
import {
  createStudentAction,
  updateStudentAction,
  deleteStudentAction,
  bulkDeleteStudentsAction,
} from "@/app/actions/student-actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Siklus Kesiswaan Guru Mandiri (P0 Integration)", () => {
  let sekolahId: string;
  let guruMandiriUser: any;
  let regularTeacherUser: any;

  beforeEach(async () => {
    sekolahId = ulid();

    // 1. Buat Sekolah Tenant Guru Mandiri
    await prisma.sekolah.create({
      data: {
        id: sekolahId,
        nama: `Ruang Belajar Mandiri ${sekolahId.substring(0, 6)}`,
        npsn: String(Math.floor(10000000 + Math.random() * 89999999)),
        jenjang: "UMUM",
        zona_waktu: "Asia/Jakarta",
      },
    });

    // 2. Buat Langganan Tenant Aktif (Entitlement)
    await prisma.langgananTenant.create({
      data: {
        id: ulid(),
        sekolah_id: sekolahId,
        paket: "PRO",
        status: "ACTIVE",
        mulai_pada: new Date(),
        sumber_aktivasi: "TRIAL_PROVISIONING",
      },
    });

    // 3. User Context Guru Mandiri (is_owner_tenant: true)
    guruMandiriUser = {
      id: "usr_guru_mandiri_" + ulid(),
      username: "gurumandiri",
      email: "guru.mandiri@ruangpintar.id",
      nama_lengkap: "Guru Mandiri Hebat",
      peran_dasar: "TEACHER",
      status_akun: "AKTIF",
      sekolah_id: sekolahId,
      is_owner_tenant: true,
      harus_ganti_password: false,
    };

    // 4. User Context Guru Biasa di Sekolah Formal (is_owner_tenant: false)
    regularTeacherUser = {
      id: "usr_guru_biasa_" + ulid(),
      username: "gurubiasa",
      email: "guru.biasa@sekolah.sch.id",
      nama_lengkap: "Guru Sekolah Biasa",
      peran_dasar: "TEACHER",
      status_akun: "AKTIF",
      sekolah_id: sekolahId,
      is_owner_tenant: false,
      harus_ganti_password: false,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Akses Halaman Data Siswa (/data-siswa)", () => {
    it("Guru Mandiri (is_owner_tenant = true) lolos checkPermission academic.students.view dan academic.students.manage", async () => {
      vi.spyOn(authGuardModule, "getCurrentUser").mockResolvedValue(guruMandiriUser);

      const canView = await checkPermission("academic.students.view", { sekolah_id: sekolahId });
      const canManage = await checkPermission("academic.students.manage", {
        sekolah_id: sekolahId,
      });

      expect(canView).toBe(true);
      expect(canManage).toBe(true);
    });

    it("Guru biasa di sekolah formal (is_owner_tenant = false) TIDAK lolos checkPermission academic.students.manage", async () => {
      vi.spyOn(authGuardModule, "getCurrentUser").mockResolvedValue(regularTeacherUser);

      const canManage = await checkPermission("academic.students.manage", {
        sekolah_id: sekolahId,
      });
      expect(canManage).toBe(false);
    });
  });

  describe("Server Actions: Tambah, Ubah, Hapus Siswa", () => {
    it("Guru Mandiri dapat MENAMBAH siswa baru (createStudentAction)", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue(guruMandiriUser);

      const formData = new FormData();
      formData.set("nis", "GM-2026-001");
      formData.set("nama_lengkap", "Budi Santoso Mandiri");
      formData.set("jenis_kelamin", "L");
      formData.set("tempat_lahir", "Jakarta");
      formData.set("tanggal_lahir", "2010-01-15");
      formData.set("status_akademik", "AKTIF");

      const result = await createStudentAction(null, formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain("berhasil didaftarkan");

      // Verifikasi di database
      const createdStudent = await prisma.siswa.findFirst({
        where: { nis: "GM-2026-001", sekolah_id: sekolahId },
      });
      expect(createdStudent).toBeDefined();
      expect(createdStudent?.nama_lengkap).toBe("Budi Santoso Mandiri");
    });

    it("Guru Mandiri dapat MENGUBAH profil siswa (updateStudentAction)", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue(guruMandiriUser);

      // Siapkan siswa awal
      const student = await prisma.siswa.create({
        data: {
          id: ulid(),
          sekolah_id: sekolahId,
          nis: "GM-2026-002",
          nama_lengkap: "Siti Rahma",
          jenis_kelamin: "P",
          status_akademik: "AKTIF",
        },
      });

      const updateFormData = new FormData();
      updateFormData.set("id", student.id);
      updateFormData.set("nama_lengkap", "Siti Rahma Putri (Updated)");
      updateFormData.set("alamat", "Jl. Mengajar Pintar No. 10");

      const updateResult = await updateStudentAction(null, updateFormData);

      expect(updateResult.success).toBe(true);
      expect(updateResult.message).toContain("berhasil diperbarui");

      // Verifikasi di database
      const updatedStudent = await prisma.siswa.findUnique({
        where: { id: student.id },
      });
      expect(updatedStudent?.nama_lengkap).toBe("Siti Rahma Putri (Updated)");
      expect(updatedStudent?.alamat).toBe("Jl. Mengajar Pintar No. 10");
    });

    it("Guru Mandiri dapat MENGHAPUS siswa (deleteStudentAction)", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue(guruMandiriUser);

      // Siapkan siswa
      const student = await prisma.siswa.create({
        data: {
          id: ulid(),
          sekolah_id: sekolahId,
          nis: "GM-2026-003",
          nama_lengkap: "Siswa Akan Dihapus",
          jenis_kelamin: "L",
          status_akademik: "AKTIF",
        },
      });

      const deleteResult = await deleteStudentAction(student.id);

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.message).toContain("berhasil dihapus");

      // Verifikasi di database
      const foundStudent = await prisma.siswa.findUnique({
        where: { id: student.id },
      });
      expect(foundStudent).toBeNull();
    });

    it("Guru Mandiri dapat MENGHAPUS massal siswa (bulkDeleteStudentsAction)", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue(guruMandiriUser);

      const student1 = await prisma.siswa.create({
        data: {
          id: ulid(),
          sekolah_id: sekolahId,
          nis: "GM-BULK-001",
          nama_lengkap: "Siswa Bulk 1",
          jenis_kelamin: "L",
          status_akademik: "AKTIF",
        },
      });

      const student2 = await prisma.siswa.create({
        data: {
          id: ulid(),
          sekolah_id: sekolahId,
          nis: "GM-BULK-002",
          nama_lengkap: "Siswa Bulk 2",
          jenis_kelamin: "P",
          status_akademik: "AKTIF",
        },
      });

      const bulkResult = await bulkDeleteStudentsAction([student1.id, student2.id]);

      expect(bulkResult.success).toBe(true);
      expect(bulkResult.message).toContain("2 siswa berhasil dihapus");

      const remaining = await prisma.siswa.findMany({
        where: { id: { in: [student1.id, student2.id] } },
      });
      expect(remaining.length).toBe(0);
    });

    it("Guru biasa di sekolah formal DITOLAK saat mencoba mengeksekusi createStudentAction", async () => {
      vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue(regularTeacherUser);

      const formData = new FormData();
      formData.set("nis", "FAIL-001");
      formData.set("nama_lengkap", "Siswa Gagal");
      formData.set("jenis_kelamin", "L");

      const result = await createStudentAction(null, formData);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Akses ditolak|tidak memiliki izin/i);
    });
  });
});
