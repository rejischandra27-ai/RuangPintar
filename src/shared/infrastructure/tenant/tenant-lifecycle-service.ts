import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";

export class TenantLifecycleError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "TenantLifecycleError";
    this.code = code;
  }
}

export class TenantInvariantViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantInvariantViolationError";
  }
}

export class SubscriptionTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly targetStatus: string
  ) {
    super(`Transisi status langganan tidak valid dari '${currentStatus}' ke '${targetStatus}'.`);
    this.name = "SubscriptionTransitionError";
  }
}

export type SubscriptionState =
  "TRIAL_ACTIVE" | "ACTIVE" | "GRACE_PERIOD" | "PAST_DUE" | "READ_ONLY" | "SUSPENDED" | "CANCELLED";

export const VALID_SUBSCRIPTION_TRANSITIONS: Record<string, string[]> = {
  TRIAL_ACTIVE: ["ACTIVE", "GRACE_PERIOD", "PAST_DUE", "READ_ONLY", "SUSPENDED", "CANCELLED"],
  ACTIVE: ["ACTIVE", "GRACE_PERIOD", "PAST_DUE", "READ_ONLY", "SUSPENDED", "CANCELLED"],
  GRACE_PERIOD: ["ACTIVE", "READ_ONLY", "SUSPENDED", "CANCELLED"],
  PAST_DUE: ["ACTIVE", "READ_ONLY", "SUSPENDED", "CANCELLED"],
  READ_ONLY: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  SUSPENDED: ["ACTIVE", "READ_ONLY", "CANCELLED"],
  CANCELLED: ["ACTIVE"],
};

export function validateSubscriptionStateTransition(
  currentStatus: string,
  targetStatus: string
): boolean {
  if (currentStatus === targetStatus) return true;

  const allowed = VALID_SUBSCRIPTION_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new SubscriptionTransitionError(currentStatus, targetStatus);
  }
  return true;
}

export type TenantLifecycleStatus =
  "PENDING" | "ACTIVE" | "GRACE_PERIOD" | "READ_ONLY" | "SUSPENDED";

export interface ProvisionTenantInput {
  nama: string;
  npsn?: string | null;
  jenjang?: string; // SD | SMP | SMA | SMK | UMUM
  tipeLisensi?: string; // FREEMIUM | SEKOLAH
  alamat?: string | null;
  telepon?: string | null;
  email?: string | null;
  zonaWaktu?: string;
  ownerId: string;
  ownerRole?: string; // Default: "SUPER_ADMIN"
  trialDurationDays?: number; // Default: 30 days per ADR-003
  sumberPendaftaran?: string; // Default: "OWNER_CREATE"
  aktorId: string;
  aktorRole: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ProvisionTenantResult {
  sekolah: {
    id: string;
    nama: string;
    npsn: string | null;
    jenjang: string;
    tipe_lisensi: string;
    trial_berakhir_pada: Date | null;
    status_aktif: boolean;
    zona_waktu: string;
    created_at: Date;
  };
  ownerMembership: {
    id: string;
    pengguna_id: string;
    sekolah_id: string;
    peran_dasar_di_tenant: string;
    status_keanggotaan: string;
    is_owner: boolean;
  };
  trialSubscription: {
    id: string;
    sekolah_id: string;
    paket: string;
    status: string;
    mulai_pada: Date;
    berakhir_pada: Date | null;
  };
}

export interface TenantLifecycleStatusSummary {
  sekolahId: string;
  nama: string;
  statusAktif: boolean;
  activeOwnersCount: number;
  subscriptionPaket: string;
  subscriptionStatus: string;
  trialBerakhirPada: Date | null;
  allowsMutation: boolean;
  isReady: boolean;
}

export class TenantLifecycleService {
  /**
   * Pembuatan Tenant Sekolah Baru Secara Atomik (All-or-Nothing).
   * Menjamin pembuatan:
   * 1. Entitas Sekolah
   * 2. Membership Owner (is_owner = true, status = ACTIVE)
   * 3. Trial Subscription (paket = TRIAL, status = TRIAL_ACTIVE, durasi = 30 hari)
   * 4. Konfigurasi Sistem Bawaan
   * 5. Audit Log Transaksional
   *
   * Jika salah satu gagal, seluruh transaksi di-rollback secara otomatis.
   */
  async provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
    const namaClean = input.nama?.trim();
    if (!namaClean || namaClean.length < 3) {
      throw new TenantLifecycleError(
        "VALIDATION_ERROR",
        "Nama institusi sekolah minimal 3 karakter."
      );
    }

    const npsnClean = input.npsn?.trim() || null;
    if (npsnClean) {
      const existingNpsn = await prisma.sekolah.findUnique({
        where: { npsn: npsnClean },
      });
      if (existingNpsn) {
        throw new TenantLifecycleError(
          "DUPLICATE_NPSN",
          `Sekolah dengan NPSN ${npsnClean} sudah terdaftar (${existingNpsn.nama}).`
        );
      }
    }

    // Verifikasi keberadaan pengguna calon owner
    const ownerUser = await prisma.pengguna.findUnique({
      where: { id: input.ownerId },
      select: { id: true, nama_lengkap: true, status_akun: true },
    });
    if (!ownerUser) {
      throw new TenantLifecycleError(
        "OWNER_NOT_FOUND",
        `Pengguna owner dengan ID '${input.ownerId}' tidak ditemukan.`
      );
    }

    const schoolId = generateUlid();
    const membershipId = generateUlid();
    const subscriptionId = generateUlid();
    const configId = generateUlid();

    const trialDays = input.trialDurationDays ?? 30; // ADR-003: 30 hari kalender
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const jenjang = input.jenjang || "SMA";
    const tipeLisensi = input.tipeLisensi || "FREEMIUM";
    const zonaWaktu = input.zonaWaktu || "Asia/Jakarta";
    const ownerRole = input.ownerRole || "SUPER_ADMIN";
    const sumberPendaftaran = input.sumberPendaftaran || "OWNER_CREATE";

    return await prisma.$transaction(async (tx) => {
      // 1. Buat Sekolah Baru
      const sekolah = await tx.sekolah.create({
        data: {
          id: schoolId,
          nama: namaClean,
          npsn: npsnClean,
          jenjang,
          tipe_lisensi: tipeLisensi,
          trial_berakhir_pada: trialEndsAt,
          alamat: input.alamat?.trim() || null,
          telepon: input.telepon?.trim() || null,
          email: input.email?.trim() || null,
          zona_waktu: zonaWaktu,
          status_aktif: true,
        },
      });

      // 2. Buat Membership Owner Aktif (RSK-04 & ADR-002: Satu tenant selalu memiliki owner aktif)
      const ownerMembership = await tx.keanggotaanSekolah.create({
        data: {
          id: membershipId,
          pengguna_id: input.ownerId,
          sekolah_id: schoolId,
          peran_dasar_di_tenant: ownerRole,
          status_keanggotaan: "ACTIVE",
          is_owner: true,
          berlaku_mulai: now,
          sumber_pendaftaran: sumberPendaftaran,
          disetujui_oleh_id: input.aktorId,
          disetujui_pada: now,
        },
      });

      // 3. Buat Trial Subscription Otomatis (RSK-04 & ADR-003: Mencegah tenant baru lahir dalam READ_ONLY)
      const trialSubscription = await tx.langgananTenant.create({
        data: {
          id: subscriptionId,
          sekolah_id: schoolId,
          paket: "TRIAL",
          status: "TRIAL_ACTIVE",
          mulai_pada: now,
          berakhir_pada: trialEndsAt,
          sumber_aktivasi: "TRIAL_PROVISIONING",
        },
      });

      // 4. Buat Konfigurasi Sistem Default untuk Tenant Baru
      await tx.konfigurasiSistem.create({
        data: {
          id: configId,
          sekolah_id: schoolId,
          kunci: "app.timezone",
          nilai: zonaWaktu,
          kategori: "UMUM",
          deskripsi: "Zona waktu default operasional sekolah",
        },
      });

      // 5. Rekam Audit Log Transaksional
      await recordAuditEvent(
        {
          sekolah_id: schoolId,
          aktor_id: input.aktorId,
          aktor_role: input.aktorRole,
          aksi: "TENANT_PROVISIONED",
          tipe_sumber: "SEKOLAH",
          id_sumber: schoolId,
          payload_sebelum: null,
          payload_sesudah: {
            sekolah_id: schoolId,
            nama: namaClean,
            npsn: npsnClean,
            owner_id: input.ownerId,
            trial_berakhir_pada: trialEndsAt.toISOString(),
          },
          ip_address: input.ipAddress ?? null,
          user_agent: input.userAgent ?? null,
        },
        tx
      );

      return {
        sekolah: {
          id: sekolah.id,
          nama: sekolah.nama,
          npsn: sekolah.npsn,
          jenjang: sekolah.jenjang,
          tipe_lisensi: sekolah.tipe_lisensi,
          trial_berakhir_pada: sekolah.trial_berakhir_pada,
          status_aktif: sekolah.status_aktif,
          zona_waktu: sekolah.zona_waktu,
          created_at: sekolah.created_at,
        },
        ownerMembership: {
          id: ownerMembership.id,
          pengguna_id: ownerMembership.pengguna_id,
          sekolah_id: ownerMembership.sekolah_id,
          peran_dasar_di_tenant: ownerMembership.peran_dasar_di_tenant,
          status_keanggotaan: ownerMembership.status_keanggotaan,
          is_owner: ownerMembership.is_owner,
        },
        trialSubscription: {
          id: trialSubscription.id,
          sekolah_id: trialSubscription.sekolah_id,
          paket: trialSubscription.paket,
          status: trialSubscription.status,
          mulai_pada: trialSubscription.mulai_pada,
          berakhir_pada: trialSubscription.berakhir_pada,
        },
      };
    });
  }

  /**
   * Invariant Guard: Memastikan Tenant Memiliki Minimal 1 Owner Aktif.
   */
  async assertTenantHasActiveOwner(sekolahId: string): Promise<void> {
    const activeOwnerCount = await prisma.keanggotaanSekolah.count({
      where: {
        sekolah_id: sekolahId,
        is_owner: true,
        status_keanggotaan: "ACTIVE",
      },
    });

    if (activeOwnerCount < 1) {
      throw new TenantInvariantViolationError(
        `Pelanggaran Domain Invariant: Tenant '${sekolahId}' tidak memiliki owner aktif.`
      );
    }
  }

  /**
   * Invariant Guard: Memastikan Tenant Memiliki Langganan / Trial Sah.
   */
  async assertTenantHasSubscription(sekolahId: string): Promise<void> {
    const sub = await prisma.langgananTenant.findFirst({
      where: { sekolah_id: sekolahId },
    });

    if (!sub) {
      throw new TenantInvariantViolationError(
        `Pelanggaran Domain Invariant: Tenant '${sekolahId}' tidak memiliki catatan langganan atau trial.`
      );
    }
  }

  /**
   * Transisi Status Lifecycle Tenant.
   * Mendukung alur: PENDING -> ACTIVE -> GRACE_PERIOD -> READ_ONLY -> SUSPENDED.
   */
  async transitionTenantStatus(params: {
    sekolahId: string;
    nextStatus: TenantLifecycleStatus;
    actorId: string;
    actorRole: string;
    reason?: string;
  }): Promise<void> {
    const sekolah = await prisma.sekolah.findUnique({
      where: { id: params.sekolahId },
    });
    if (!sekolah) {
      throw new TenantLifecycleError(
        "NOT_FOUND",
        `Sekolah ID '${params.sekolahId}' tidak ditemukan.`
      );
    }

    const currentSub = await prisma.langgananTenant.findFirst({
      where: { sekolah_id: params.sekolahId },
      orderBy: [{ mulai_pada: "desc" }, { created_at: "desc" }],
    });

    // Petakan transisi status tenant ke LanggananTenant & Sekolah
    let targetSubStatus: string;
    let schoolActive = true;

    switch (params.nextStatus) {
      case "ACTIVE":
        targetSubStatus = "ACTIVE";
        schoolActive = true;
        break;
      case "GRACE_PERIOD":
        targetSubStatus = "PAST_DUE";
        schoolActive = true;
        break;
      case "READ_ONLY":
        targetSubStatus = "READ_ONLY";
        schoolActive = true;
        break;
      case "SUSPENDED":
        targetSubStatus = "SUSPENDED";
        schoolActive = false;
        break;
      case "PENDING":
        targetSubStatus = "TRIAL_ACTIVE";
        schoolActive = false;
        break;
      default:
        throw new TenantLifecycleError(
          "INVALID_TRANSITION",
          `Status target '${params.nextStatus}' tidak valid.`
        );
    }

    if (currentSub) {
      validateSubscriptionStateTransition(currentSub.status, targetSubStatus);
    }

    await prisma.$transaction(async (tx) => {
      // Perbarui status Sekolah
      await tx.sekolah.update({
        where: { id: params.sekolahId },
        data: { status_aktif: schoolActive },
      });

      // Perbarui status LanggananTenant
      if (currentSub) {
        await tx.langgananTenant.update({
          where: { id: currentSub.id },
          data: { status: targetSubStatus },
        });
      }

      // Bila tenant di-SUSPEND, cabut konteks tenant aktif dari semua sesi pengguna sekolah ini
      if (params.nextStatus === "SUSPENDED") {
        await tx.sesiPengguna.updateMany({
          where: { sekolah_aktif_id: params.sekolahId },
          data: { sekolah_aktif_id: null },
        });
      }

      await recordAuditEvent(
        {
          sekolah_id: params.sekolahId,
          aktor_id: params.actorId,
          aktor_role: params.actorRole,
          aksi: `TENANT_LIFECYCLE_${params.nextStatus}`,
          tipe_sumber: "SEKOLAH",
          id_sumber: params.sekolahId,
          payload_sebelum: {
            sekolah_aktif: sekolah.status_aktif,
            subscription_status: currentSub?.status ?? null,
          },
          payload_sesudah: {
            next_status: params.nextStatus,
            sekolah_aktif: schoolActive,
            subscription_status: targetSubStatus,
            reason: params.reason ?? null,
          },
        },
        tx
      );
    });
  }

  /**
   * Transisi Status Langganan Tenant dengan Validasi State Machine (ADR-003).
   * Mendukung: TRIAL_ACTIVE -> ACTIVE -> GRACE_PERIOD (PAST_DUE) -> READ_ONLY -> SUSPENDED.
   * Menolak lompatan status ilegal.
   */
  async transitionSubscriptionStatus(params: {
    sekolahId: string;
    nextStatus: SubscriptionState;
    actorId: string;
    actorRole: string;
    reason?: string;
  }): Promise<void> {
    const currentSub = await prisma.langgananTenant.findFirst({
      where: { sekolah_id: params.sekolahId },
      orderBy: [{ mulai_pada: "desc" }, { created_at: "desc" }],
    });

    if (!currentSub) {
      throw new TenantLifecycleError(
        "NOT_FOUND",
        `Langganan untuk sekolah '${params.sekolahId}' tidak ditemukan.`
      );
    }

    validateSubscriptionStateTransition(currentSub.status, params.nextStatus);

    await prisma.$transaction(async (tx) => {
      await tx.langgananTenant.update({
        where: { id: currentSub.id },
        data: { status: params.nextStatus, updated_at: new Date() },
      });

      if (params.nextStatus === "SUSPENDED") {
        await tx.sekolah.update({
          where: { id: params.sekolahId },
          data: { status_aktif: false },
        });
        await tx.sesiPengguna.updateMany({
          where: { sekolah_aktif_id: params.sekolahId },
          data: { sekolah_aktif_id: null },
        });
      } else if (params.nextStatus === "ACTIVE" || params.nextStatus === "TRIAL_ACTIVE") {
        await tx.sekolah.update({
          where: { id: params.sekolahId },
          data: { status_aktif: true },
        });
      }

      await tx.logAudit.create({
        data: {
          id: generateUlid(),
          sekolah_id: params.sekolahId,
          aktor_id: params.actorId,
          aktor_role: params.actorRole,
          aksi: "SUBSCRIPTION_STATUS_TRANSITION",
          tipe_sumber: "LanggananTenant",
          id_sumber: currentSub.id,
          payload_sebelum: JSON.stringify({ status: currentSub.status }),
          payload_sesudah: JSON.stringify({
            status: params.nextStatus,
            reason: params.reason ?? null,
          }),
        },
      });
    });
  }

  /**
   * Mengambil Ringkasan Status Lifecycle & Kesiapan Operasional Tenant.
   */
  async getTenantLifecycleStatus(sekolahId: string): Promise<TenantLifecycleStatusSummary | null> {
    const sekolah = await prisma.sekolah.findUnique({
      where: { id: sekolahId },
    });
    if (!sekolah) return null;

    const activeOwnersCount = await prisma.keanggotaanSekolah.count({
      where: {
        sekolah_id: sekolahId,
        is_owner: true,
        status_keanggotaan: "ACTIVE",
      },
    });

    const subscription = await prisma.langgananTenant.findFirst({
      where: { sekolah_id: sekolahId },
      orderBy: [{ mulai_pada: "desc" }, { created_at: "desc" }],
    });

    const now = new Date();
    const expired =
      subscription?.berakhir_pada !== null &&
      subscription?.berakhir_pada !== undefined &&
      subscription.berakhir_pada <= now;
    const isSubActive =
      subscription &&
      (subscription.status === "TRIAL_ACTIVE" || subscription.status === "ACTIVE") &&
      !expired;

    const allowsMutation = !!isSubActive && sekolah.status_aktif;
    const isReady = activeOwnersCount >= 1 && allowsMutation;

    return {
      sekolahId,
      nama: sekolah.nama,
      statusAktif: sekolah.status_aktif,
      activeOwnersCount,
      subscriptionPaket: subscription?.paket ?? "NONE",
      subscriptionStatus: subscription?.status ?? "NONE",
      trialBerakhirPada: sekolah.trial_berakhir_pada,
      allowsMutation,
      isReady,
    };
  }
}

export const tenantLifecycleService = new TenantLifecycleService();
