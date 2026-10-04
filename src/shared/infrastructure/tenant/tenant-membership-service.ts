import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";

export class TenantMembershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantMembershipError";
  }
}

export interface PendingMembershipItem {
  id: string;
  penggunaId: string;
  namaLengkap: string;
  email: string | null;
  username: string;
  peranDasar: string;
  sumberPendaftaran: string;
  tanggalPengajuan: Date;
}

/** Foundation service: lifecycle operations are server-only and append audited. */
export class TenantMembershipService {
  async setActiveTenant(params: {
    sessionId: string;
    penggunaId: string;
    sekolahId: string | null;
    actorRole: string;
  }): Promise<void> {
    // 1. Kasus Cleared Context (Kembali ke Tampilan Global Platform / Super Admin)
    if (!params.sekolahId) {
      await prisma.$transaction(async (tx) => {
        const updatedSession = await tx.sesiPengguna.updateMany({
          where: {
            id: params.sessionId,
            pengguna_id: params.penggunaId,
            dicabut: false,
            berlaku_sampai: { gt: new Date() },
          },
          data: {
            sekolah_aktif_id: null,
            terakhir_aktif_pada: new Date(),
          },
        });
        if (updatedSession.count !== 1) {
          throw new TenantMembershipError("Sesi tidak valid atau telah berakhir.");
        }

        await recordAuditEvent(
          {
            sekolah_id: null,
            aktor_id: params.penggunaId,
            aktor_role: params.actorRole,
            aksi: "TENANT_SESSION_CLEARED",
            tipe_sumber: "SESI_PENGGUNA",
            id_sumber: params.sessionId,
            payload_sesudah: { sekolah_id: null },
          },
          tx
        );
      });
      return;
    }

    // 2. Kasus Switch ke Sekolah Tertentu
    let targetMembershipId: string;

    if (params.actorRole === "SUPER_ADMIN") {
      // Super Admin memiliki hak platform untuk impersonate / menginspeksi sekolah mana pun
      const ensured = await prisma.keanggotaanSekolah.upsert({
        where: {
          pengguna_id_sekolah_id: {
            pengguna_id: params.penggunaId,
            sekolah_id: params.sekolahId,
          },
        },
        create: {
          id: generateUlid(),
          pengguna_id: params.penggunaId,
          sekolah_id: params.sekolahId,
          peran_dasar_di_tenant: "SUPER_ADMIN",
          status_keanggotaan: "ACTIVE",
          is_owner: true,
          sumber_pendaftaran: "SUPER_ADMIN_IMPERSONATION",
        },
        update: {
          status_keanggotaan: "ACTIVE",
          peran_dasar_di_tenant: "SUPER_ADMIN",
          is_owner: true,
        },
      });
      targetMembershipId = ensured.id;
    } else {
      const membership = await prisma.keanggotaanSekolah.findUnique({
        where: {
          pengguna_id_sekolah_id: {
            pengguna_id: params.penggunaId,
            sekolah_id: params.sekolahId,
          },
        },
        select: { id: true, status_keanggotaan: true },
      });

      if (!membership || membership.status_keanggotaan !== "ACTIVE") {
        throw new TenantMembershipError(
          "Anda tidak memiliki keanggotaan aktif pada sekolah tersebut."
        );
      }
      targetMembershipId = membership.id;
    }

    await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.sesiPengguna.updateMany({
        where: {
          id: params.sessionId,
          pengguna_id: params.penggunaId,
          dicabut: false,
          berlaku_sampai: { gt: new Date() },
        },
        data: {
          sekolah_aktif_id: params.sekolahId,
          terakhir_aktif_pada: new Date(),
        },
      });
      if (updatedSession.count !== 1) {
        throw new TenantMembershipError("Sesi tidak valid atau telah berakhir.");
      }

      await recordAuditEvent(
        {
          sekolah_id: params.sekolahId,
          aktor_id: params.penggunaId,
          aktor_role: params.actorRole,
          aksi: "TENANT_SESSION_SWITCHED",
          tipe_sumber: "SESI_PENGGUNA",
          id_sumber: params.sessionId,
          payload_sesudah: { membership_id: targetMembershipId, sekolah_id: params.sekolahId },
        },
        tx
      );
    });
  }

  async changeStatus(params: {
    membershipId: string;
    nextStatus: "ACTIVE" | "REJECTED" | "SUSPENDED" | "REMOVED";
    actorId: string;
    actorRole: string;
    reason?: string;
  }): Promise<void> {
    const membership = await prisma.keanggotaanSekolah.findUnique({
      where: { id: params.membershipId },
      select: {
        sekolah_id: true,
        status_keanggotaan: true,
        pengguna_id: true,
        is_owner: true,
        sekolah: { select: { nama: true } },
      },
    });
    if (!membership) throw new TenantMembershipError("Keanggotaan sekolah tidak ditemukan.");
    if (membership.status_keanggotaan === params.nextStatus) return;

    // Security Invariant: Pengguna tidak dapat menyetujui permohonannya sendiri
    if (params.nextStatus === "ACTIVE" && membership.pengguna_id === params.actorId) {
      throw new TenantMembershipError(
        "Pengguna tidak dapat menyetujui permohonan keanggotaannya sendiri."
      );
    }

    if (
      membership.is_owner &&
      membership.status_keanggotaan === "ACTIVE" &&
      params.nextStatus !== "ACTIVE"
    ) {
      const activeOwners = await prisma.keanggotaanSekolah.count({
        where: { sekolah_id: membership.sekolah_id, is_owner: true, status_keanggotaan: "ACTIVE" },
      });
      if (activeOwners <= 1) {
        throw new TenantMembershipError(
          "Owner aktif terakhir tidak dapat diubah tanpa transfer ownership."
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.keanggotaanSekolah.update({
        where: { id: params.membershipId },
        data: {
          status_keanggotaan: params.nextStatus,
          berlaku_mulai: params.nextStatus === "ACTIVE" ? new Date() : undefined,
          berlaku_sampai: params.nextStatus === "ACTIVE" ? null : new Date(),
          disetujui_oleh_id: params.nextStatus === "ACTIVE" ? params.actorId : undefined,
          disetujui_pada: params.nextStatus === "ACTIVE" ? new Date() : undefined,
        },
      });

      if (params.nextStatus !== "ACTIVE") {
        await tx.sesiPengguna.updateMany({
          where: { pengguna_id: membership.pengguna_id, sekolah_aktif_id: membership.sekolah_id },
          data: { sekolah_aktif_id: null },
        });
      }

      await recordAuditEvent(
        {
          sekolah_id: membership.sekolah_id,
          aktor_id: params.actorId,
          aktor_role: params.actorRole,
          aksi: `TENANT_MEMBERSHIP_${params.nextStatus}`,
          tipe_sumber: "KEANGGOTAAN_SEKOLAH",
          id_sumber: params.membershipId,
          payload_sebelum: { status_keanggotaan: membership.status_keanggotaan },
          payload_sesudah: { status_keanggotaan: params.nextStatus, reason: params.reason ?? null },
        },
        tx
      );

      // Notifikasi in-app untuk pemohon keanggotaan
      if (params.nextStatus === "ACTIVE") {
        await tx.notifikasiPengguna.create({
          data: {
            id: generateUlid(),
            sekolah_id: membership.sekolah_id,
            pengguna_id: membership.pengguna_id,
            judul: "Permohonan Bergabung Disetujui",
            pesan: `Selamat! Permohonan bergabung Anda di ${membership.sekolah.nama} telah disetujui.`,
            tipe: "JOIN_REQUEST_APPROVED",
            tautan_url: "/dashboard",
          },
        });
      } else if (params.nextStatus === "REJECTED") {
        await tx.notifikasiPengguna.create({
          data: {
            id: generateUlid(),
            sekolah_id: membership.sekolah_id,
            pengguna_id: membership.pengguna_id,
            judul: "Permohonan Bergabung Ditolak",
            pesan: params.reason
              ? `Permohonan bergabung Anda di ${membership.sekolah.nama} ditolak: ${params.reason}`
              : `Mohon maaf, permohonan bergabung Anda di ${membership.sekolah.nama} tidak dapat disetujui.`,
            tipe: "JOIN_REQUEST_REJECTED",
            tautan_url: "/register",
          },
        });
      }
    });
  }

  async createPendingMembership(
    params: {
      penggunaId: string;
      sekolahId: string;
      peranDasar: string;
      source: "INVITATION" | "JOIN_REQUEST";
    },
    client?: Prisma.TransactionClient
  ): Promise<string> {
    const id = generateUlid();

    const executeWithTx = async (tx: Prisma.TransactionClient) => {
      await tx.keanggotaanSekolah.create({
        data: {
          id,
          pengguna_id: params.penggunaId,
          sekolah_id: params.sekolahId,
          peran_dasar_di_tenant: params.peranDasar,
          status_keanggotaan: "PENDING",
          sumber_pendaftaran: params.source,
          disetujui_oleh_id: null,
          disetujui_pada: null,
        },
      });

      await recordAuditEvent(
        {
          sekolah_id: params.sekolahId,
          aktor_id: params.penggunaId,
          aktor_role: params.peranDasar,
          aksi: "TENANT_MEMBERSHIP_PENDING_CREATED",
          tipe_sumber: "KEANGGOTAAN_SEKOLAH",
          id_sumber: id,
          payload_sesudah: { source: params.source, status_keanggotaan: "PENDING" },
        },
        tx
      );

      // Notifikasi untuk Owner / Pengelola Sekolah
      const activeOwners = await tx.keanggotaanSekolah.findMany({
        where: {
          sekolah_id: params.sekolahId,
          is_owner: true,
          status_keanggotaan: "ACTIVE",
        },
        select: { pengguna_id: true },
      });

      for (const owner of activeOwners) {
        await tx.notifikasiPengguna.create({
          data: {
            id: generateUlid(),
            sekolah_id: params.sekolahId,
            pengguna_id: owner.pengguna_id,
            judul: "Permohonan Bergabung Baru",
            pesan: "Terdapat pengajuan bergabung baru yang memerlukan peninjauan persetujuan.",
            tipe: "JOIN_REQUEST_RECEIVED",
            tautan_url: "/sekolah?tab=pengajuan",
          },
        });
      }
    };

    if (client) {
      await executeWithTx(client);
    } else {
      await prisma.$transaction(executeWithTx);
    }

    return id;
  }

  async getPendingMemberships(sekolahId: string): Promise<PendingMembershipItem[]> {
    const rows = await prisma.keanggotaanSekolah.findMany({
      where: {
        sekolah_id: sekolahId,
        status_keanggotaan: "PENDING",
      },
      include: {
        pengguna: {
          select: {
            id: true,
            nama_lengkap: true,
            email: true,
            username: true,
            peran_dasar: true,
          },
        },
      },
      orderBy: { created_at: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      penggunaId: row.pengguna.id,
      namaLengkap: row.pengguna.nama_lengkap,
      email: row.pengguna.email,
      username: row.pengguna.username,
      peranDasar: row.peran_dasar_di_tenant,
      sumberPendaftaran: row.sumber_pendaftaran,
      tanggalPengajuan: row.created_at,
    }));
  }
}

export const tenantMembershipService = new TenantMembershipService();
