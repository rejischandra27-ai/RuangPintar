import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import { subscriptionService } from "@/modules/billing/application/subscription-service";

describe("SubscriptionService (M23)", () => {
  let testUserId: string;
  let testSchoolId: string;

  beforeEach(async () => {
    testUserId = generateUlid();
    testSchoolId = generateUlid();

    await prisma.sekolah.create({
      data: {
        id: testSchoolId,
        nama: "SMA Uji Coba Billing",
        npsn: `99${Date.now().toString().slice(-6)}`,
        jenjang: "SMA",
      },
    });

    await prisma.langgananTenant.create({
      data: {
        id: generateUlid(),
        sekolah_id: testSchoolId,
        paket: "TRIAL",
        status: "TRIAL_ACTIVE",
        berakhir_pada: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 hari lagi
        sumber_aktivasi: "TRIAL_PROVISIONING",
      },
    });

    await prisma.pengguna.create({
      data: {
        id: testUserId,
        sekolah_id: testSchoolId,
        username: `guru_${Date.now()}`,
        email: `guru_${Date.now()}@example.com`,
        password_hash: "hash",
        nama_lengkap: "Guru Pengetes Billing",
        peran_dasar: "TEACHER",
      },
    });
  });

  it("harus berhasil membuat pesanan Pro dengan status PENDING dan nominal Rp 15.000 terikat pada tenant", async () => {
    const order = await subscriptionService.createProOrder(testUserId, 1);

    expect(order.order_id).toContain("RP-PRO-");
    expect(order.nominal).toBe(15000);
    expect(order.total_bayar).toBe(15000);
    expect(order.status).toBe("PENDING");
    expect(order.metode_pembayaran).toBe("QRIS");
    expect(order.sekolah_id).toBe(testSchoolId);

    const savedInDb = await prisma.transaksiLangganan.findUnique({
      where: { order_id: order.order_id },
    });
    expect(savedInDb).not.toBeNull();
    expect(savedInDb?.status).toBe("PENDING");
    expect(savedInDb?.sekolah_id).toBe(testSchoolId);
  });

  it("harus mengaktifkan LanggananTenant menjadi ACTIVE dan memperbarui Sekolah saat simulasi pembayaran berhasil (ADR-003)", async () => {
    const order = await subscriptionService.createProOrder(testUserId, 1);
    const completed = await subscriptionService.simulatePaymentSuccess(order.order_id, testUserId);

    expect(completed.status).toBe("PAID");
    expect(completed.dibayar_pada).toBeDefined();

    // Verifikasi LanggananTenant menjadi ACTIVE (BUKAN Pengguna)
    const subscription = await prisma.langgananTenant.findFirst({
      where: { sekolah_id: testSchoolId },
      orderBy: [{ mulai_pada: "desc" }, { created_at: "desc" }],
    });

    expect(subscription?.status).toBe("ACTIVE");
    expect(subscription?.paket).toBe("PRO");
    expect(subscription?.sumber_aktivasi).toBe("PAYMENT_SIMULATION");
    expect(subscription?.berakhir_pada).toBeDefined();

    // Masa aktif sekolah harus bertambah setidaknya 30 hari
    const remainingDays = Math.ceil(
      ((subscription?.berakhir_pada?.getTime() || 0) - Date.now()) / (1000 * 60 * 60 * 24)
    );
    expect(remainingDays).toBeGreaterThan(25);

    // Entitas sekolah juga ditandai aktif
    const school = await prisma.sekolah.findUnique({
      where: { id: testSchoolId },
    });
    expect(school?.status_aktif).toBe(true);
  });
});
