"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { getTenantEntitlement } from "@/shared/infrastructure/tenant/tenant-entitlement-service";
import { subscriptionService } from "@/modules/billing/application/subscription-service";
import {
  BillingActionResult,
  SubscriptionOrderDTO,
  TenantBillingOverviewDTO,
} from "@/modules/billing/domain/billing-types";

export async function initiateProCheckoutAction(
  durationMonths = 1
): Promise<BillingActionResult<SubscriptionOrderDTO>> {
  try {
    const user = await requireAuth();
    const order = await subscriptionService.createProOrder(user.id, durationMonths);
    return { success: true, data: order };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memulai sesi pembayaran.";
    return { success: false, error: message };
  }
}

export async function checkOrderStatusAction(
  orderId: string
): Promise<BillingActionResult<SubscriptionOrderDTO | null>> {
  try {
    const user = await requireAuth();
    const order = await subscriptionService.getOrderStatus(orderId, user.id);
    return { success: true, data: order };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memeriksa status pesanan.";
    return { success: false, error: message };
  }
}

export async function simulatePaymentSuccessAction(
  orderId: string
): Promise<BillingActionResult<SubscriptionOrderDTO>> {
  try {
    const user = await requireAuth();
    const updatedOrder = await subscriptionService.simulatePaymentSuccess(orderId, user.id);

    // Revalidasi dashboard & landing page agar badge lisensi terbarui
    revalidatePath("/dashboard");
    revalidatePath("/");
    revalidatePath("/profil");

    return { success: true, data: updatedOrder };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memproses simulasi pembayaran.";
    return { success: false, error: message };
  }
}

export async function getTenantBillingOverviewAction(): Promise<
  BillingActionResult<TenantBillingOverviewDTO>
> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return {
        success: false,
        error: "Pengguna tidak terikat pada institusi sekolah (tenant) mana pun.",
      };
    }

    const sekolah = await prisma.sekolah.findUnique({
      where: { id: user.sekolah_id },
      select: { id: true, nama: true, npsn: true, status_aktif: true },
    });

    if (!sekolah) {
      return { success: false, error: "Data institusi sekolah tidak ditemukan." };
    }

    const entitlement = await getTenantEntitlement(sekolah.id);

    const now = new Date();
    let hariTersisa = 0;
    if (entitlement.berakhirPada) {
      const ms = entitlement.berakhirPada.getTime() - now.getTime();
      hariTersisa = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }

    const isTrial = entitlement.status === "TRIAL_ACTIVE";
    const statusTenant = !sekolah.status_aktif
      ? "NONAKTIF / DITANGGUHKAN"
      : entitlement.allowsMutation
        ? "AKTIF (OPERASIONAL PENUH)"
        : "HANYA BACA (READ ONLY)";

    return {
      success: true,
      data: {
        sekolahId: sekolah.id,
        namaSekolah: sekolah.nama,
        npsn: sekolah.npsn,
        paketSaatIni: entitlement.paket || "TRIAL",
        statusLangganan: entitlement.status,
        tanggalBerakhir: entitlement.berakhirPada ? entitlement.berakhirPada.toISOString() : null,
        hariTersisa,
        isTrial,
        statusTenant,
        allowsMutation: entitlement.allowsMutation,
        isOwner: Boolean(user.is_owner_tenant),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat informasi penagihan tenant.";
    return { success: false, error: message };
  }
}
