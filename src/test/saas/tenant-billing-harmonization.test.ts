import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { subscriptionService } from "@/modules/billing/application/subscription-service";
import { midtransService } from "@/modules/billing/infrastructure/midtrans-service";
import {
  tenantLifecycleService,
  SubscriptionTransitionError,
  validateSubscriptionStateTransition,
} from "@/shared/infrastructure/tenant/tenant-lifecycle-service";
import {
  getTenantEntitlement,
  requireTenantMutationEntitlement,
  TenantReadOnlyError,
} from "@/shared/infrastructure/tenant/tenant-entitlement-service";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SaaS Tenant Billing Harmonization & Subscription Activation (Batch 3 Remediation)", () => {
  const mockSekolahId = "01J0000000000000000000SCH01";
  const mockUserId = "01J0000000000000000000USR01";
  const mockOrderId = "RP-PRO-20260925-TEST01";
  const mockTransactionId = "01J0000000000000000000TX01";
  const mockSubscriptionId = "01J0000000000000000000SUB01";

  // =========================================================================
  // 1. PEMBAYARAN BERHASIL & AKTIVASI TENANT (PEKERJAAN 02 & ADR-003)
  // =========================================================================
  describe("1. Pembayaran Berhasil & Aktivasi Tenant (ADR-003: PELANGGAN = TENANT)", () => {
    it("processWebhookNotification: mengaktifkan LanggananTenant menjadi ACTIVE saat settlement diterima", async () => {
      // Mock verifikasi signature Midtrans
      vi.spyOn(midtransService, "verifySignature").mockReturnValue(true);

      const existingOrder = {
        id: mockTransactionId,
        order_id: mockOrderId,
        pengguna_id: mockUserId,
        sekolah_id: mockSekolahId,
        paket: "GURU_PRO_BULANAN",
        total_bayar: 15000,
        durasi_bulan: 1,
        status: "PENDING",
        pengguna: {
          id: mockUserId,
          sekolah_id: mockSekolahId,
          peran_dasar: "TEACHER",
        },
      };

      vi.spyOn(prisma.transaksiLangganan, "findUnique").mockResolvedValue(existingOrder as any);

      const currentSub = {
        id: mockSubscriptionId,
        sekolah_id: mockSekolahId,
        paket: "TRIAL",
        status: "TRIAL_ACTIVE",
        mulai_pada: new Date(),
        berakhir_pada: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 hari lagi
      };

      vi.spyOn(prisma.langgananTenant, "findFirst").mockResolvedValue(currentSub as any);

      const txMock = {
        transaksiLangganan: { update: vi.fn().mockResolvedValue({}) },
        langgananTenant: { update: vi.fn().mockResolvedValue({}), create: vi.fn() },
        sekolah: { update: vi.fn().mockResolvedValue({}) },
        logAudit: { create: vi.fn().mockResolvedValue({}) },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        return await callback(txMock);
      });

      const webhookPayload = {
        order_id: mockOrderId,
        transaction_status: "settlement",
        status_code: "200",
        gross_amount: "15000.00",
      };

      const result = await subscriptionService.processWebhookNotification(webhookPayload as any);

      expect(result.processed).toBe(true);
      expect(result.new_status).toBe("PAID");

      // Verifikasi TransaksiLangganan diupdate menjadi PAID
      expect(txMock.transaksiLangganan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTransactionId },
          data: expect.objectContaining({ status: "PAID" }),
        })
      );

      // Verifikasi LanggananTenant diupdate menjadi ACTIVE (Bukan Pengguna)
      expect(txMock.langgananTenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSubscriptionId },
          data: expect.objectContaining({
            status: "ACTIVE",
            paket: "PRO",
            sumber_aktivasi: "PAYMENT",
          }),
        })
      );

      // Verifikasi Sekolah diaktifkan
      expect(txMock.sekolah.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSekolahId },
          data: expect.objectContaining({
            tipe_lisensi: "SEKOLAH",
            status_aktif: true,
          }),
        })
      );
    });

    it("idempoten: pesanan yang sudah berstatus PAID tidak memproses ulang aktivasi", async () => {
      vi.spyOn(midtransService, "verifySignature").mockReturnValue(true);

      vi.spyOn(prisma.transaksiLangganan, "findUnique").mockResolvedValue({
        id: mockTransactionId,
        order_id: mockOrderId,
        status: "PAID",
      } as any);

      const txSpy = vi.spyOn(prisma, "$transaction");

      const res = await subscriptionService.processWebhookNotification({
        order_id: mockOrderId,
        transaction_status: "settlement",
        status_code: "200",
        gross_amount: "15000.00",
      } as any);

      expect(res.processed).toBe(true);
      expect(res.new_status).toBe("PAID");
      expect(txSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. SUBSCRIPTION STATE TRANSITION (PEKERJAAN 03)
  // =========================================================================
  describe("2. Subscription State Transition (Validasi Siklus Hidup Langganan)", () => {
    it("mengizinkan transisi yang sah: TRIAL_ACTIVE -> ACTIVE", () => {
      expect(validateSubscriptionStateTransition("TRIAL_ACTIVE", "ACTIVE")).toBe(true);
    });

    it("mengizinkan transisi yang sah: ACTIVE -> GRACE_PERIOD -> READ_ONLY -> SUSPENDED", () => {
      expect(validateSubscriptionStateTransition("ACTIVE", "GRACE_PERIOD")).toBe(true);
      expect(validateSubscriptionStateTransition("GRACE_PERIOD", "READ_ONLY")).toBe(true);
      expect(validateSubscriptionStateTransition("READ_ONLY", "SUSPENDED")).toBe(true);
    });

    it("mengizinkan reaktivasi kembali ke ACTIVE dari READ_ONLY dan SUSPENDED saat bayar", () => {
      expect(validateSubscriptionStateTransition("READ_ONLY", "ACTIVE")).toBe(true);
      expect(validateSubscriptionStateTransition("SUSPENDED", "ACTIVE")).toBe(true);
    });

    it("menolak transisi ilegal: READ_ONLY tidak boleh melompat mundur ke TRIAL_ACTIVE", () => {
      expect(() => validateSubscriptionStateTransition("READ_ONLY", "TRIAL_ACTIVE")).toThrowError(
        SubscriptionTransitionError
      );
    });

    it("menolak transisi ilegal: SUSPENDED tidak boleh melompat ke GRACE_PERIOD", () => {
      expect(() => validateSubscriptionStateTransition("SUSPENDED", "GRACE_PERIOD")).toThrowError(
        SubscriptionTransitionError
      );
    });

    it("menolak transisi ilegal: ACTIVE tidak boleh kembali ke TRIAL_ACTIVE", () => {
      expect(() => validateSubscriptionStateTransition("ACTIVE", "TRIAL_ACTIVE")).toThrowError(
        SubscriptionTransitionError
      );
    });

    it("transitionSubscriptionStatus: mengupdate database saat transisi valid dieksekusi", async () => {
      vi.spyOn(prisma.langgananTenant, "findFirst").mockResolvedValue({
        id: mockSubscriptionId,
        sekolah_id: mockSekolahId,
        status: "TRIAL_ACTIVE",
      } as any);

      const txMock = {
        langgananTenant: { update: vi.fn().mockResolvedValue({}) },
        sekolah: { update: vi.fn().mockResolvedValue({}) },
        sesiPengguna: { updateMany: vi.fn().mockResolvedValue({}) },
        logAudit: { create: vi.fn().mockResolvedValue({}) },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        return await callback(txMock);
      });

      await tenantLifecycleService.transitionSubscriptionStatus({
        sekolahId: mockSekolahId,
        nextStatus: "ACTIVE",
        actorId: mockUserId,
        actorRole: "SUPER_ADMIN",
        reason: "Pembayaran paket PRO terkonfirmasi",
      });

      expect(txMock.langgananTenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSubscriptionId },
          data: expect.objectContaining({ status: "ACTIVE" }),
        })
      );
      expect(txMock.sekolah.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSekolahId },
          data: { status_aktif: true },
        })
      );
    });
  });

  // =========================================================================
  // 3. ENTITLEMENT INTEGRATION & READ-ONLY ENFORCEMENT (PEKERJAAN 04)
  // =========================================================================
  describe("3. Entitlement Integration & Read-Only Invariants (PEKERJAAN 04)", () => {
    it("getTenantEntitlement: mengembalikan allowsMutation = true untuk tenant ACTIVE yang belum kedaluwarsa", async () => {
      vi.spyOn(prisma.langgananTenant, "findFirst").mockResolvedValue({
        id: mockSubscriptionId,
        sekolah_id: mockSekolahId,
        paket: "PRO",
        status: "ACTIVE",
        berakhir_pada: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 hari ke depan
      } as any);

      const entitlement = await getTenantEntitlement(mockSekolahId);

      expect(entitlement.status).toBe("ACTIVE");
      expect(entitlement.paket).toBe("PRO");
      expect(entitlement.allowsMutation).toBe(true);
    });

    it("tenant read only setelah berakhir: langganan kedaluwarsa otomatis menghasilkan READ_ONLY dan allowsMutation = false", async () => {
      vi.spyOn(prisma.langgananTenant, "findFirst").mockResolvedValue({
        id: mockSubscriptionId,
        sekolah_id: mockSekolahId,
        paket: "PRO",
        status: "ACTIVE",
        berakhir_pada: new Date(Date.now() - 1000), // Sudah kedaluwarsa 1 detik lalu
      } as any);

      const entitlement = await getTenantEntitlement(mockSekolahId);

      expect(entitlement.status).toBe("READ_ONLY");
      expect(entitlement.allowsMutation).toBe(false);
    });

    it("requireTenantMutationEntitlement: melempar TenantReadOnlyError saat mutasi dipanggil pada tenant kedaluwarsa", async () => {
      vi.spyOn(prisma.langgananTenant, "findFirst").mockResolvedValue({
        id: mockSubscriptionId,
        sekolah_id: mockSekolahId,
        paket: "TRIAL",
        status: "TRIAL_ACTIVE",
        berakhir_pada: new Date(Date.now() - 5000), // Expired
      } as any);

      await expect(
        requireTenantMutationEntitlement(mockSekolahId, "attendance.session.record")
      ).rejects.toThrowError(TenantReadOnlyError);
    });

    it("requireTenantMutationEntitlement: mengizinkan permission non-mutasi (read/view) walaupun tenant kedaluwarsa", async () => {
      vi.spyOn(prisma.langgananTenant, "findFirst").mockResolvedValue({
        id: mockSubscriptionId,
        sekolah_id: mockSekolahId,
        paket: "TRIAL",
        status: "TRIAL_ACTIVE",
        berakhir_pada: new Date(Date.now() - 5000), // Expired
      } as any);

      // Permission view tidak boleh melempar error
      await expect(
        requireTenantMutationEntitlement(mockSekolahId, "attendance.session.view")
      ).resolves.toBeUndefined();
    });
  });
});
