import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from "@/shared/infrastructure/database/prisma";
import * as authGuard from "@/shared/infrastructure/auth/auth-guard";
import {
  updateSchoolLicenseAction,
  toggleSchoolActiveStatusAction,
} from "@/app/actions/school-actions";
import { tenantMembershipService } from "@/shared/infrastructure/tenant/tenant-membership-service";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Super Admin School & License Management Actions", () => {
  const mockSuperAdmin = {
    id: "01J0000000000000000000SUPER",
    username: "superadmin",
    nama_lengkap: "Super Admin Maestro",
    email: "superadmin@ruangpintar.id",
    peran_dasar: "SUPER_ADMIN",
    status_akun: "AKTIF",
    harus_ganti_password: false,
    sekolah_id: null,
  };

  const mockTeacher = {
    id: "01J0000000000000000000GURU1",
    username: "gurubiasa",
    nama_lengkap: "Guru Biasa",
    email: "guru@sekolah.id",
    peran_dasar: "TEACHER",
    status_akun: "AKTIF",
    harus_ganti_password: false,
    sekolah_id: "01J000000000000000000SCH01",
  };

  const mockSchoolId = "01J000000000000000000SCH01";
  const mockSchool = {
    id: mockSchoolId,
    nama: "SMK Otomindo Jakarta",
    npsn: "20104567",
    jenjang: "SMK",
    tipe_lisensi: "FREEMIUM",
    trial_berakhir_pada: new Date("2026-10-30"),
    status_aktif: true,
  };

  describe("1. updateSchoolLicenseAction (B2B Provisioning)", () => {
    it("menolak akses jika aktor bukan SUPER_ADMIN (Default Deny)", async () => {
      vi.spyOn(authGuard, "requireAuth").mockResolvedValue(mockTeacher as any);

      const res = await updateSchoolLicenseAction({
        sekolah_id: mockSchoolId,
        tipe_lisensi: "SEKOLAH",
        paket: "PRO",
        durasi_bulan: 12,
        kuota_siswa: 1000,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe("FORBIDDEN");
      }
    });

    it("memperbarui lisensi sekolah menjadi SEKOLAH dengan paket PRO dan kuota siswa 1000 secara transaksional", async () => {
      vi.spyOn(authGuard, "requireAuth").mockResolvedValue(mockSuperAdmin as any);
      vi.spyOn(prisma.sekolah, "findUnique").mockResolvedValue(mockSchool as any);

      let updatedSchoolData: any = null;
      let upsertedSubData: any = null;

      const txMock = {
        sekolah: {
          update: vi.fn().mockImplementation(({ data }) => {
            updatedSchoolData = data;
            return Promise.resolve({ ...mockSchool, ...data });
          }),
        },
        langgananTenant: {
          findFirst: vi.fn().mockResolvedValue({
            id: "01J00000000000000000000SUB1",
            sekolah_id: mockSchoolId,
            paket: "TRIAL",
            status: "TRIAL_ACTIVE",
          }),
          update: vi.fn().mockImplementation(({ data }) => {
            upsertedSubData = data;
            return Promise.resolve({ id: "SUB1", ...data });
          }),
        },
        logAudit: {
          create: vi.fn().mockResolvedValue({ id: "AUDIT1" }),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        return await callback(txMock);
      });

      const res = await updateSchoolLicenseAction({
        sekolah_id: mockSchoolId,
        tipe_lisensi: "SEKOLAH",
        paket: "PRO",
        durasi_bulan: 12,
        kuota_siswa: 1000,
        nomor_referensi: "PO-BOS-2026/01",
        catatan: "Perpanjangan lisensi institusi",
      });

      expect(res.success).toBe(true);
      expect(updatedSchoolData).not.toBeNull();
      expect(updatedSchoolData.tipe_lisensi).toBe("SEKOLAH");
      expect(updatedSchoolData.trial_berakhir_pada).toBeNull();

      expect(upsertedSubData).not.toBeNull();
      expect(upsertedSubData.status).toBe("ACTIVE");
      expect(upsertedSubData.paket).toBe("PRO");
      expect(upsertedSubData.entitlement_json).toContain("1000");
    });
  });

  describe("2. toggleSchoolActiveStatusAction (Operasional Tenant)", () => {
    it("menonaktifkan (suspend) tenant sekolah dan memutus sesi aktif", async () => {
      vi.spyOn(authGuard, "requireAuth").mockResolvedValue(mockSuperAdmin as any);
      vi.spyOn(prisma.sekolah, "findUnique").mockResolvedValue(mockSchool as any);

      let updatedStatus: boolean | null = null;
      let sessionCleared = false;

      const txMock = {
        sekolah: {
          update: vi.fn().mockImplementation(({ data }) => {
            updatedStatus = data.status_aktif;
            return Promise.resolve({ ...mockSchool, ...data });
          }),
        },
        langgananTenant: {
          findFirst: vi.fn().mockResolvedValue({ id: "SUB1" }),
          update: vi.fn().mockResolvedValue({ id: "SUB1" }),
        },
        sesiPengguna: {
          updateMany: vi.fn().mockImplementation(() => {
            sessionCleared = true;
            return Promise.resolve({ count: 5 });
          }),
        },
        logAudit: {
          create: vi.fn().mockResolvedValue({ id: "AUDIT1" }),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        return await callback(txMock);
      });

      const res = await toggleSchoolActiveStatusAction(
        mockSchoolId,
        false,
        "Penangguhan pembayaran"
      );

      expect(res.success).toBe(true);
      expect(updatedStatus).toBe(false);
      expect(sessionCleared).toBe(true);
    });
  });

  describe("3. TenantMembershipService (Impersonasi & Clear Context)", () => {
    it("membersihkan sesi aktif ketika sekolahId null (kembali ke Super Admin global)", async () => {
      let clearedSession = false;

      const txMock = {
        sesiPengguna: {
          updateMany: vi.fn().mockImplementation(({ data }) => {
            if (data.sekolah_aktif_id === null) clearedSession = true;
            return Promise.resolve({ count: 1 });
          }),
        },
        logAudit: {
          create: vi.fn().mockResolvedValue({ id: "AUDIT1" }),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        return await callback(txMock);
      });

      await tenantMembershipService.setActiveTenant({
        sessionId: "SESI_01",
        penggunaId: mockSuperAdmin.id,
        sekolahId: null,
        actorRole: "SUPER_ADMIN",
      });

      expect(clearedSession).toBe(true);
    });

    it("mengizinkan Super Admin masuk ke sekolah mana pun dengan auto-provision membership", async () => {
      let switchedTenantId: string | null = null;

      vi.spyOn(prisma.keanggotaanSekolah, "upsert").mockResolvedValue({
        id: "MBR_SUPER_ADMIN_01",
        pengguna_id: mockSuperAdmin.id,
        sekolah_id: mockSchoolId,
        peran_dasar_di_tenant: "SUPER_ADMIN",
        status_keanggotaan: "ACTIVE",
        is_owner: true,
      } as any);

      const txMock = {
        sesiPengguna: {
          updateMany: vi.fn().mockImplementation(({ data }) => {
            switchedTenantId = data.sekolah_aktif_id;
            return Promise.resolve({ count: 1 });
          }),
        },
        logAudit: {
          create: vi.fn().mockResolvedValue({ id: "AUDIT1" }),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        return await callback(txMock);
      });

      await tenantMembershipService.setActiveTenant({
        sessionId: "SESI_01",
        penggunaId: mockSuperAdmin.id,
        sekolahId: mockSchoolId,
        actorRole: "SUPER_ADMIN",
      });

      expect(switchedTenantId).toBe(mockSchoolId);
    });
  });
});
