/**
 * Ruang Pintar — M23 Subscription & Billing Application Service
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import {
  MidtransNotificationPayload,
  PaymentStatus,
  SubscriptionOrderDTO,
} from "../domain/billing-types";
import { midtransService } from "../infrastructure/midtrans-service";
import { validateSubscriptionStateTransition } from "@/shared/infrastructure/tenant/tenant-lifecycle-service";
import crypto from "crypto";

export class SubscriptionService {
  /**
   * Membuat tagihan/pesanan baru untuk paket Guru Pro
   */
  async createProOrder(
    userId: string,
    durationMonths = 1,
    customSekolahId?: string
  ): Promise<SubscriptionOrderDTO> {
    const user = await prisma.pengguna.findUnique({
      where: { id: userId },
      include: { sekolah: true },
    });

    if (!user) {
      throw new Error("Pengguna tidak ditemukan.");
    }

    const effectiveSekolahId = customSekolahId || user.sekolah_id;
    if (!effectiveSekolahId) {
      throw new Error(
        "Pengguna tidak terikat pada institusi sekolah (tenant) yang sah untuk berlangganan."
      );
    }

    const pricePerMonth = 15000;
    const nominal = pricePerMonth * durationMonths;
    const totalBayar = nominal; // Diserap oleh platform atau flat
    const biayaAdmin = 0;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const orderId = `RP-PRO-${dateStr}-${randomSuffix}`;
    const transactionId = generateUlid();

    // Dapatkan token Snap / QRIS dari Midtrans Adapter
    const snapResult = await midtransService.createTransaction({
      order_id: orderId,
      gross_amount: totalBayar,
      item_name: `Paket Guru Pro (${durationMonths} Bulan)`,
      customer_name: user.nama_lengkap,
      customer_email: user.email || undefined,
      customer_phone: user.no_telepon || undefined,
    });

    const now = new Date();
    const expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 jam

    const record = await prisma.transaksiLangganan.create({
      data: {
        id: transactionId,
        order_id: orderId,
        pengguna_id: user.id,
        sekolah_id: effectiveSekolahId,
        paket: "GURU_PRO_BULANAN",
        nominal,
        biaya_admin: biayaAdmin,
        total_bayar: totalBayar,
        metode_pembayaran: "QRIS",
        status: "PENDING",
        snap_token: snapResult.token,
        snap_redirect_url: snapResult.redirect_url,
        qris_url: snapResult.qris_url,
        durasi_bulan: durationMonths,
        kadaluarsa_pada: expiryDate,
      },
    });

    await recordAuditEvent({
      sekolah_id: effectiveSekolahId,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "CREATE",
      tipe_sumber: "TransaksiLangganan",
      id_sumber: record.id,
      payload_sesudah: {
        order_id: orderId,
        nominal: totalBayar,
        paket: "GURU_PRO_BULANAN",
        is_simulator: snapResult.is_simulator,
      },
    });

    return {
      id: record.id,
      order_id: record.order_id,
      pengguna_id: record.pengguna_id,
      sekolah_id: record.sekolah_id,
      paket: record.paket,
      nominal: record.nominal,
      biaya_admin: record.biaya_admin,
      total_bayar: record.total_bayar,
      metode_pembayaran: record.metode_pembayaran,
      status: record.status as PaymentStatus,
      snap_token: record.snap_token,
      snap_redirect_url: record.snap_redirect_url,
      qris_url: record.qris_url,
      waktu_transaksi: record.waktu_transaksi,
      dibayar_pada: record.dibayar_pada,
      kadaluarsa_pada: record.kadaluarsa_pada,
      durasi_bulan: record.durasi_bulan,
      is_simulator: snapResult.is_simulator,
    };
  }

  /**
   * Memproses payload notifikasi webhook resmi dari Midtrans
   */
  async processWebhookNotification(payload: MidtransNotificationPayload): Promise<{
    processed: boolean;
    order_id: string;
    new_status: string;
  }> {
    const isValidSignature = midtransService.verifySignature(payload);
    if (!isValidSignature) {
      throw new Error("Tanda tangan signature Midtrans tidak valid.");
    }

    const order = await prisma.transaksiLangganan.findUnique({
      where: { order_id: payload.order_id },
      include: { pengguna: true },
    });

    if (!order) {
      throw new Error(`Pesanan dengan order_id ${payload.order_id} tidak ditemukan.`);
    }

    // Jika sudah lunas, pertahankan idempoten
    if (order.status === "PAID") {
      return { processed: true, order_id: order.order_id, new_status: "PAID" };
    }

    const status = payload.transaction_status;
    let newStatus: PaymentStatus = "PENDING";
    const now = new Date();

    if (status === "settlement" || status === "capture") {
      newStatus = "PAID";
      await this.activateTenantSubscription(order, JSON.stringify(payload), false);
    } else if (status === "cancel" || status === "deny") {
      newStatus = "CANCELLED";
      await prisma.transaksiLangganan.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          payload_notifikasi_json: JSON.stringify(payload),
        },
      });
    } else if (status === "expire") {
      newStatus = "EXPIRED";
      await prisma.transaksiLangganan.update({
        where: { id: order.id },
        data: {
          status: "EXPIRED",
          payload_notifikasi_json: JSON.stringify(payload),
        },
      });
    }

    return { processed: true, order_id: order.order_id, new_status: newStatus };
  }

  /**
   * Mengaktifkan atau memperpanjang langganan institusi sekolah (tenant).
   * Sesuai ADR-003: PELANGGAN = TENANT (SEKOLAH), BUKAN USER.
   */
  private async activateTenantSubscription(
    order: {
      id: string;
      order_id: string;
      pengguna_id: string;
      sekolah_id: string | null;
      paket: string;
      total_bayar: number;
      durasi_bulan: number;
      pengguna: {
        id: string;
        sekolah_id: string | null;
        peran_dasar: string;
      };
    },
    payloadJson: string,
    isSimulation = false
  ): Promise<{ extendedExpiry: Date; targetSekolahId: string; targetPaket: string }> {
    const targetSekolahId = order.sekolah_id || order.pengguna.sekolah_id;
    if (!targetSekolahId) {
      throw new Error(
        `Pesanan ${order.order_id} tidak terikat pada institusi sekolah (tenant) yang sah.`
      );
    }

    const now = new Date();
    const currentSub = await prisma.langgananTenant.findFirst({
      where: { sekolah_id: targetSekolahId },
      orderBy: [{ mulai_pada: "desc" }, { created_at: "desc" }],
    });

    const currentExpiry = currentSub?.berakhir_pada;
    const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const extendedExpiry = new Date(
      baseDate.getTime() + order.durasi_bulan * 30 * 24 * 60 * 60 * 1000
    );

    const targetPaket = order.paket.includes("SEKOLAH") ? "ENTERPRISE" : "PRO";

    await prisma.$transaction(async (tx) => {
      // 1. Perbarui status pesanan transaksi menjadi PAID
      await tx.transaksiLangganan.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          dibayar_pada: now,
          payload_notifikasi_json: payloadJson,
        },
      });

      // 2. Terbitkan atau Perbarui LanggananTenant (ADR-003)
      if (currentSub) {
        validateSubscriptionStateTransition(currentSub.status, "ACTIVE");
        await tx.langgananTenant.update({
          where: { id: currentSub.id },
          data: {
            paket: targetPaket,
            status: "ACTIVE",
            berakhir_pada: extendedExpiry,
            sumber_aktivasi: isSimulation ? "PAYMENT_SIMULATION" : "PAYMENT",
            transaksi_sumber_id: order.id,
            updated_at: now,
          },
        });
      } else {
        await tx.langgananTenant.create({
          data: {
            id: generateUlid(),
            sekolah_id: targetSekolahId,
            paket: targetPaket,
            status: "ACTIVE",
            mulai_pada: now,
            berakhir_pada: extendedExpiry,
            sumber_aktivasi: isSimulation ? "PAYMENT_SIMULATION" : "PAYMENT",
            transaksi_sumber_id: order.id,
          },
        });
      }

      // 3. Perbarui status operasional entitas Sekolah
      await tx.sekolah.update({
        where: { id: targetSekolahId },
        data: {
          tipe_lisensi: "SEKOLAH",
          trial_berakhir_pada: extendedExpiry,
          status_aktif: true,
        },
      });

      // 4. Catat Audit Log di dalam transaksi
      await recordAuditEvent(
        {
          sekolah_id: targetSekolahId,
          aktor_id: order.pengguna_id,
          aktor_role: order.pengguna.peran_dasar,
          aksi: "UPDATE",
          tipe_sumber: "LanggananTenant",
          id_sumber: currentSub ? currentSub.id : targetSekolahId,
          payload_sesudah: {
            event: isSimulation
              ? "TENANT_SUBSCRIPTION_ACTIVATED_VIA_SIMULATION"
              : "TENANT_SUBSCRIPTION_ACTIVATED_VIA_WEBHOOK",
            order_id: order.order_id,
            paket: targetPaket,
            nominal: order.total_bayar,
            extended_until: extendedExpiry.toISOString(),
          },
        },
        tx
      );
    });

    return { extendedExpiry, targetSekolahId, targetPaket };
  }

  /**
   * Simulasi pembayaran sukses instan untuk mode demo/pengujian
   */
  async simulatePaymentSuccess(orderId: string, userId: string): Promise<SubscriptionOrderDTO> {
    const order = await prisma.transaksiLangganan.findFirst({
      where: { order_id: orderId, pengguna_id: userId },
      include: { pengguna: true },
    });

    if (!order) {
      throw new Error("Pesanan tidak ditemukan atau otorisasi tidak cocok.");
    }

    const payloadJson = JSON.stringify({
      simulation: true,
      simulated_at: new Date().toISOString(),
      status: "settlement",
    });

    await this.activateTenantSubscription(order, payloadJson, true);

    const updatedOrder = await prisma.transaksiLangganan.findUniqueOrThrow({
      where: { id: order.id },
    });

    return {
      id: updatedOrder.id,
      order_id: updatedOrder.order_id,
      pengguna_id: updatedOrder.pengguna_id,
      sekolah_id: updatedOrder.sekolah_id,
      paket: updatedOrder.paket,
      nominal: updatedOrder.nominal,
      biaya_admin: updatedOrder.biaya_admin,
      total_bayar: updatedOrder.total_bayar,
      metode_pembayaran: updatedOrder.metode_pembayaran,
      status: updatedOrder.status as PaymentStatus,
      snap_token: updatedOrder.snap_token,
      snap_redirect_url: updatedOrder.snap_redirect_url,
      qris_url: updatedOrder.qris_url,
      waktu_transaksi: updatedOrder.waktu_transaksi,
      dibayar_pada: updatedOrder.dibayar_pada,
      kadaluarsa_pada: updatedOrder.kadaluarsa_pada,
      durasi_bulan: updatedOrder.durasi_bulan,
      is_simulator: true,
    };
  }

  /**
   * Mendapatkan detail status pesanan
   */
  async getOrderStatus(orderId: string, userId: string): Promise<SubscriptionOrderDTO | null> {
    const order = await prisma.transaksiLangganan.findFirst({
      where: { order_id: orderId, pengguna_id: userId },
    });

    if (!order) return null;

    return {
      id: order.id,
      order_id: order.order_id,
      pengguna_id: order.pengguna_id,
      sekolah_id: order.sekolah_id,
      paket: order.paket,
      nominal: order.nominal,
      biaya_admin: order.biaya_admin,
      total_bayar: order.total_bayar,
      metode_pembayaran: order.metode_pembayaran,
      status: order.status as PaymentStatus,
      snap_token: order.snap_token,
      snap_redirect_url: order.snap_redirect_url,
      qris_url: order.qris_url,
      waktu_transaksi: order.waktu_transaksi,
      dibayar_pada: order.dibayar_pada,
      kadaluarsa_pada: order.kadaluarsa_pada,
      durasi_bulan: order.durasi_bulan,
      is_simulator: !midtransService.isConfigured,
    };
  }
}

export const subscriptionService = new SubscriptionService();
