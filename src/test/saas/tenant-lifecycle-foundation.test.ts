import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  tenantLifecycleService,
  TenantLifecycleError,
  TenantInvariantViolationError,
} from "@/shared/infrastructure/tenant/tenant-lifecycle-service";
import { smartOnboardingService } from "@/modules/ai-assistant/application/smart-onboarding-service";
import * as passwordLib from "@/shared/lib/password";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SaaS Tenant Lifecycle Foundation (Batch 2 Remediation)", () => {
  const mockOwnerId = "01J0000000000000000000USER1";
  const mockAktorId = "01J000000000000000000ADMIN1";

  // =========================================================================
  // 1. ATOMIC TENANT CREATION & INITIALIZATION
  // =========================================================================
  describe("1. Atomic Tenant Creation (Pekerjaan 02, 03, 04)", () => {
    it("menghasilkan sekolah, owner membership, trial subscription 30 hari, dan config secara atomik", async () => {
      // Mock owner user found in database
      vi.spyOn(prisma.pengguna, "findUnique").mockResolvedValue({
        id: mockOwnerId,
        nama_lengkap: "Budi Santoso",
        status_akun: "AKTIF",
      } as any);

      vi.spyOn(prisma.sekolah, "findUnique").mockResolvedValue(null);

      const txMock = {
        sekolah: {
          create: vi
            .fn()
            .mockImplementation(({ data }) => Promise.resolve({ ...data, created_at: new Date() })),
        },
        keanggotaanSekolah: {
          create: vi
            .fn()
            .mockImplementation(({ data }) => Promise.resolve({ ...data, created_at: new Date() })),
        },
        langgananTenant: {
          create: vi
            .fn()
            .mockImplementation(({ data }) => Promise.resolve({ ...data, created_at: new Date() })),
        },
        konfigurasiSistem: {
          create: vi
            .fn()
            .mockImplementation(({ data }) => Promise.resolve({ ...data, created_at: new Date() })),
        },
        logAudit: {
          create: vi.fn().mockResolvedValue({ id: "AUDIT_01" }),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        return await callback(txMock);
      });

      const result = await tenantLifecycleService.provisionTenant({
        nama: "SMK Maju Bersama",
        npsn: "10203040",
        jenjang: "SMK",
        tipeLisensi: "FREEMIUM",
        ownerId: mockOwnerId,
        ownerRole: "SUPER_ADMIN",
        trialDurationDays: 30,
        aktorId: mockAktorId,
        aktorRole: "SUPER_ADMIN",
      });

      // Verifikasi Sekolah
      expect(result.sekolah.nama).toBe("SMK Maju Bersama");
      expect(result.sekolah.status_aktif).toBe(true);
      expect(txMock.sekolah.create).toHaveBeenCalledTimes(1);

      // Verifikasi Owner Membership (Pekerjaan 03)
      expect(result.ownerMembership.pengguna_id).toBe(mockOwnerId);
      expect(result.ownerMembership.is_owner).toBe(true);
      expect(result.ownerMembership.status_keanggotaan).toBe("ACTIVE");
      expect(result.ownerMembership.peran_dasar_di_tenant).toBe("SUPER_ADMIN");
      expect(txMock.keanggotaanSekolah.create).toHaveBeenCalledTimes(1);

      // Verifikasi Trial Subscription 30 Hari (Pekerjaan 04)
      expect(result.trialSubscription.paket).toBe("TRIAL");
      expect(result.trialSubscription.status).toBe("TRIAL_ACTIVE");
      expect(result.trialSubscription.berakhir_pada).toBeDefined();
      expect(txMock.langgananTenant.create).toHaveBeenCalledTimes(1);

      // Verifikasi Default Konfigurasi
      expect(txMock.konfigurasiSistem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kunci: "app.timezone",
            nilai: "Asia/Jakarta",
          }),
        })
      );
    });

    it("melakukan rollback total jika salah satu entitas gagal dibuat (All-or-Nothing Invariant)", async () => {
      vi.spyOn(prisma.pengguna, "findUnique").mockResolvedValue({
        id: mockOwnerId,
        nama_lengkap: "Budi Santoso",
        status_akun: "AKTIF",
      } as any);

      vi.spyOn(prisma.sekolah, "findUnique").mockResolvedValue(null);

      const txMock = {
        sekolah: {
          create: vi.fn().mockResolvedValue({ id: "SCH_01" }),
        },
        keanggotaanSekolah: {
          create: vi.fn().mockRejectedValue(new Error("Database write error on membership")),
        },
        langgananTenant: {
          create: vi.fn(),
        },
        konfigurasiSistem: {
          create: vi.fn(),
        },
        logAudit: {
          create: vi.fn(),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        return await callback(txMock);
      });

      await expect(
        tenantLifecycleService.provisionTenant({
          nama: "SMK Error Test",
          ownerId: mockOwnerId,
          aktorId: mockAktorId,
          aktorRole: "SUPER_ADMIN",
        })
      ).rejects.toThrow("Database write error on membership");

      // Menjamin bahwa langganan dan config tidak dieksekusi saat langkah sebelumnya gagal
      expect(txMock.langgananTenant.create).not.toHaveBeenCalled();
      expect(txMock.konfigurasiSistem.create).not.toHaveBeenCalled();
    });

    it("menolak pembuatan tenant jika pengguna owner tidak ditemukan (OWNER_NOT_FOUND)", async () => {
      vi.spyOn(prisma.pengguna, "findUnique").mockResolvedValue(null);

      await expect(
        tenantLifecycleService.provisionTenant({
          nama: "SMK Tanpa Owner",
          ownerId: "NON_EXISTENT_USER",
          aktorId: mockAktorId,
          aktorRole: "SUPER_ADMIN",
        })
      ).rejects.toThrowError(TenantLifecycleError);
    });

    it("menolak pembuatan tenant jika NPSN sudah terdaftar (DUPLICATE_NPSN)", async () => {
      vi.spyOn(prisma.sekolah, "findUnique").mockResolvedValue({
        id: "SCH_DUPLICATE",
        nama: "SMK Otomindo Jakarta",
        npsn: "20100001",
      } as any);

      await expect(
        tenantLifecycleService.provisionTenant({
          nama: "SMK Duplikat",
          npsn: "20100001",
          ownerId: mockOwnerId,
          aktorId: mockAktorId,
          aktorRole: "SUPER_ADMIN",
        })
      ).rejects.toThrowError(TenantLifecycleError);
    });
  });

  // =========================================================================
  // 2. INVARIANT PROTECTION: TENANT HARUS MEMILIKI OWNER & SUBSCRIPTION
  // =========================================================================
  describe("2. Domain Invariant Protection", () => {
    it("assertTenantHasActiveOwner: melempar error bila tenant tidak memiliki owner aktif", async () => {
      vi.spyOn(prisma.keanggotaanSekolah, "count").mockResolvedValue(0);

      await expect(
        tenantLifecycleService.assertTenantHasActiveOwner("SCH_ORPHAN")
      ).rejects.toThrowError(TenantInvariantViolationError);
    });

    it("assertTenantHasActiveOwner: lulus bila tenant memiliki setidaknya 1 owner aktif", async () => {
      vi.spyOn(prisma.keanggotaanSekolah, "count").mockResolvedValue(1);

      await expect(
        tenantLifecycleService.assertTenantHasActiveOwner("SCH_VALID")
      ).resolves.toBeUndefined();
    });

    it("assertTenantHasSubscription: melempar error bila tenant tidak memiliki record langganan", async () => {
      vi.spyOn(prisma.langgananTenant, "findFirst").mockResolvedValue(null);

      await expect(
        tenantLifecycleService.assertTenantHasSubscription("SCH_NO_SUB")
      ).rejects.toThrowError(TenantInvariantViolationError);
    });
  });

  // =========================================================================
  // 3. TENANT ACTIVATION & STATUS TRANSITIONS (Pekerjaan 05)
  // =========================================================================
  describe("3. Tenant Activation & Lifecycle Status Transitions", () => {
    it("memperbarui status langganan dan mencabut sesi saat beralih ke SUSPENDED", async () => {
      vi.spyOn(prisma.sekolah, "findUnique").mockResolvedValue({
        id: "SCH_01",
        status_aktif: true,
      } as any);

      vi.spyOn(prisma.langgananTenant, "findFirst").mockResolvedValue({
        id: "SUB_01",
        status: "ACTIVE",
      } as any);

      const txMock = {
        sekolah: { update: vi.fn().mockResolvedValue({}) },
        langgananTenant: { update: vi.fn().mockResolvedValue({}) },
        sesiPengguna: { updateMany: vi.fn().mockResolvedValue({ count: 5 }) },
        logAudit: { create: vi.fn().mockResolvedValue({}) },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        return await callback(txMock);
      });

      await tenantLifecycleService.transitionTenantStatus({
        sekolahId: "SCH_01",
        nextStatus: "SUSPENDED",
        actorId: mockAktorId,
        actorRole: "SUPER_ADMIN",
        reason: "Pelanggaran pembayaran dan ketentuan layanan",
      });

      // Sekolah dinonaktifkan
      expect(txMock.sekolah.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "SCH_01" },
          data: { status_aktif: false },
        })
      );

      // Langganan diubah menjadi SUSPENDED
      expect(txMock.langgananTenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "SUB_01" },
          data: { status: "SUSPENDED" },
        })
      );

      // Sesi pengguna yang sedang aktif di tenant ini dicabut
      expect(txMock.sesiPengguna.updateMany).toHaveBeenCalledWith({
        where: { sekolah_aktif_id: "SCH_01" },
        data: { sekolah_aktif_id: null },
      });
    });

    it("getTenantLifecycleStatus: mengembalikan ringkasan status operasional tenant", async () => {
      vi.spyOn(prisma.sekolah, "findUnique").mockResolvedValue({
        id: "SCH_01",
        nama: "SMK Otomindo",
        status_aktif: true,
        trial_berakhir_pada: new Date(Date.now() + 1000000000),
      } as any);

      vi.spyOn(prisma.keanggotaanSekolah, "count").mockResolvedValue(1);

      vi.spyOn(prisma.langgananTenant, "findFirst").mockResolvedValue({
        id: "SUB_01",
        paket: "TRIAL",
        status: "TRIAL_ACTIVE",
        berakhir_pada: new Date(Date.now() + 1000000000),
      } as any);

      const status = await tenantLifecycleService.getTenantLifecycleStatus("SCH_01");

      expect(status).not.toBeNull();
      expect(status?.nama).toBe("SMK Otomindo");
      expect(status?.activeOwnersCount).toBe(1);
      expect(status?.subscriptionPaket).toBe("TRIAL");
      expect(status?.allowsMutation).toBe(true);
      expect(status?.isReady).toBe(true);
    });
  });

  // =========================================================================
  // 4. SMART ONBOARDING INTEGRATION (Self-Service Teacher Registration)
  // =========================================================================
  describe("4. Smart Onboarding Self-Service Registration", () => {
    it("registerTeacher membuat owner membership dan trial subscription secara atomik", async () => {
      vi.spyOn(prisma.pengguna, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.pengguna, "findUnique").mockResolvedValue(null);
      vi.spyOn(passwordLib, "hashPassword").mockResolvedValue("hashed_pwd");

      const createdEntities: Record<string, any[]> = {
        sekolah: [],
        keanggotaanSekolah: [],
        langgananTenant: [],
        pengguna: [],
        sesiPengguna: [],
        preferensiOnboardingGuru: [],
      };
      const gradeLevelCreate = vi.fn().mockResolvedValue({});
      const onboardingPreferenceCreate = vi.fn().mockImplementation(({ data }) => {
        createdEntities.preferensiOnboardingGuru.push(data);
        return Promise.resolve(data);
      });

      const txMock = {
        sekolah: {
          create: vi.fn().mockImplementation(({ data }) => {
            createdEntities.sekolah.push(data);
            return Promise.resolve(data);
          }),
        },
        tahunAjaran: { create: vi.fn().mockResolvedValue({}) },
        semester: { create: vi.fn().mockResolvedValue({}) },
        tingkatKelas: { create: gradeLevelCreate },
        pengguna: {
          create: vi.fn().mockImplementation(({ data }) => {
            createdEntities.pengguna.push(data);
            return Promise.resolve(data);
          }),
        },
        guru: { create: vi.fn().mockResolvedValue({}) },
        preferensiOnboardingGuru: { create: onboardingPreferenceCreate },
        preferensiNotifikasi: { create: vi.fn().mockResolvedValue({}) },
        keanggotaanSekolah: {
          create: vi.fn().mockImplementation(({ data }) => {
            createdEntities.keanggotaanSekolah.push(data);
            return Promise.resolve(data);
          }),
        },
        langgananTenant: {
          create: vi.fn().mockImplementation(({ data }) => {
            createdEntities.langgananTenant.push(data);
            return Promise.resolve(data);
          }),
        },
        konfigurasiSistem: { create: vi.fn().mockResolvedValue({}) },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        return await callback(txMock);
      });

      vi.spyOn(prisma.sesiPengguna, "create").mockImplementation(({ data }: any) => {
        createdEntities.sesiPengguna.push(data);
        return Promise.resolve(data) as any;
      });

      const res = await smartOnboardingService.registerTeacher({
        nama_lengkap: "Dewi Lestari",
        email: "dewi.lestari@sekolahbaru.sch.id",
        password: "Password123#",
        nama_sekolah: "SMA Baru",
        jenjang: "SMA",
      });

      expect(res.user.nama_lengkap).toBe("Dewi Lestari");
      expect(res.sekolah.nama).toBe("SMA Baru");

      // Verifikasi Owner Membership dibuat
      expect(createdEntities.keanggotaanSekolah.length).toBe(1);
      const membership = createdEntities.keanggotaanSekolah[0];
      expect(membership.is_owner).toBe(true);
      expect(membership.status_keanggotaan).toBe("ACTIVE");
      expect(membership.peran_dasar_di_tenant).toBe("TEACHER");

      // Verifikasi Trial Subscription dibuat
      expect(createdEntities.langgananTenant.length).toBe(1);
      const subscription = createdEntities.langgananTenant[0];
      expect(subscription.paket).toBe("TRIAL");
      expect(subscription.status).toBe("TRIAL_ACTIVE");
      expect(subscription.sumber_aktivasi).toBe("TRIAL_PROVISIONING");

      // Verifikasi Sesi langsung mengikat sekolah_aktif_id
      expect(createdEntities.sesiPengguna.length).toBe(1);
      const session = createdEntities.sesiPengguna[0];
      expect(session.sekolah_aktif_id).toBe(res.sekolah.id);
    });
  });
});
