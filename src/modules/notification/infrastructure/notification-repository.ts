/**
 * Ruang Pintar — M17 Notification Repository
 * Data access layer teroptimasi untuk Notifikasi In-App dan Preferensi Pengguna.
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import {
  CreateNotificationInput,
  InAppNotificationItem,
  NotificationPreferenceItem,
  NotificationType,
  UpdateNotificationPreferenceInput,
} from "../domain/notification-types";

export class NotificationRepository {
  /**
   * Membuat notifikasi in-app tunggal.
   */
  async create(input: CreateNotificationInput): Promise<InAppNotificationItem> {
    const id = generateUlid();

    const row = await prisma.notifikasiPengguna.create({
      data: {
        id,
        sekolah_id: input.sekolah_id,
        pengguna_id: input.pengguna_id,
        judul: input.judul,
        pesan: input.pesan,
        tipe: input.tipe,
        tautan_url: input.tautan_url ?? null,
        data_tambahan: input.data_tambahan ? JSON.stringify(input.data_tambahan) : null,
        apakah_dibaca: false,
      },
    });

    return this.mapToDomain(row);
  }

  /**
   * Membuat notifikasi in-app massal (broadcast ke banyak user).
   */
  async createBulk(inputs: CreateNotificationInput[]): Promise<number> {
    if (inputs.length === 0) return 0;

    const data = inputs.map((input) => ({
      id: generateUlid(),
      sekolah_id: input.sekolah_id,
      pengguna_id: input.pengguna_id,
      judul: input.judul,
      pesan: input.pesan,
      tipe: input.tipe,
      tautan_url: input.tautan_url ?? null,
      data_tambahan: input.data_tambahan ? JSON.stringify(input.data_tambahan) : null,
      apakah_dibaca: false,
    }));

    const result = await prisma.notifikasiPengguna.createMany({
      data,
    });

    return result.count;
  }

  /**
   * Mengambil daftar notifikasi pengguna dengan paginasi/limit.
   */
  async getUserNotifications(
    userId: string,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<InAppNotificationItem[]> {
    const where: any = {
      pengguna_id: userId,
    };

    if (unreadOnly) {
      where.apakah_dibaca = false;
    }

    const rows = await prisma.notifikasiPengguna.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return rows.map((r) => this.mapToDomain(r));
  }

  /**
   * Menghitung total notifikasi belum dibaca untuk pengguna.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notifikasiPengguna.count({
      where: {
        pengguna_id: userId,
        apakah_dibaca: false,
      },
    });
  }

  /**
   * Menandai notifikasi tertentu sebagai terbaca.
   */
  async markAsRead(
    notificationId: string,
    userId: string,
    sekolahId?: string
  ): Promise<InAppNotificationItem | null> {
    const existing = await prisma.notifikasiPengguna.findFirst({
      where: {
        id: notificationId,
        pengguna_id: userId,
        ...(sekolahId ? { sekolah_id: sekolahId } : {}),
      },
    });

    if (!existing) {
      return null;
    }

    if (existing.apakah_dibaca) {
      return this.mapToDomain(existing);
    }

    const updated = await prisma.notifikasiPengguna.update({
      where: { id: notificationId },
      data: {
        apakah_dibaca: true,
        dibaca_pada: new Date(),
      },
    });

    return this.mapToDomain(updated);
  }

  /**
   * Menandai seluruh notifikasi pengguna sebagai terbaca.
   */
  async markAllAsRead(userId: string, sekolahId?: string): Promise<number> {
    const result = await prisma.notifikasiPengguna.updateMany({
      where: {
        pengguna_id: userId,
        apakah_dibaca: false,
        ...(sekolahId ? { sekolah_id: sekolahId } : {}),
      },
      data: {
        apakah_dibaca: true,
        dibaca_pada: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Mengambil preferensi notifikasi pengguna (atau buat default jika belum ada).
   */
  async getPreference(userId: string): Promise<NotificationPreferenceItem> {
    let pref = await prisma.preferensiNotifikasi.findUnique({
      where: { pengguna_id: userId },
    });

    if (!pref) {
      pref = await prisma.preferensiNotifikasi.create({
        data: {
          id: generateUlid(),
          pengguna_id: userId,
          in_app_aktif: true,
          whatsapp_aktif: true,
          email_aktif: false,
          notif_pengumuman: true,
          notif_tugas: true,
          notif_nilai: true,
          notif_presensi: true,
        },
      });
    }

    return {
      id: pref.id,
      pengguna_id: pref.pengguna_id,
      in_app_aktif: pref.in_app_aktif,
      whatsapp_aktif: pref.whatsapp_aktif,
      email_aktif: pref.email_aktif,
      notif_pengumuman: pref.notif_pengumuman,
      notif_tugas: pref.notif_tugas,
      notif_nilai: pref.notif_nilai,
      notif_presensi: pref.notif_presensi,
    };
  }

  /**
   * Memperbarui preferensi notifikasi pengguna.
   */
  async updatePreference(
    userId: string,
    input: UpdateNotificationPreferenceInput
  ): Promise<NotificationPreferenceItem> {
    const existing = await this.getPreference(userId);

    const updated = await prisma.preferensiNotifikasi.update({
      where: { id: existing.id },
      data: {
        ...(input.in_app_aktif !== undefined && { in_app_aktif: input.in_app_aktif }),
        ...(input.whatsapp_aktif !== undefined && { whatsapp_aktif: input.whatsapp_aktif }),
        ...(input.email_aktif !== undefined && { email_aktif: input.email_aktif }),
        ...(input.notif_pengumuman !== undefined && { notif_pengumuman: input.notif_pengumuman }),
        ...(input.notif_tugas !== undefined && { notif_tugas: input.notif_tugas }),
        ...(input.notif_nilai !== undefined && { notif_nilai: input.notif_nilai }),
        ...(input.notif_presensi !== undefined && { notif_presensi: input.notif_presensi }),
      },
    });

    return {
      id: updated.id,
      pengguna_id: updated.pengguna_id,
      in_app_aktif: updated.in_app_aktif,
      whatsapp_aktif: updated.whatsapp_aktif,
      email_aktif: updated.email_aktif,
      notif_pengumuman: updated.notif_pengumuman,
      notif_tugas: updated.notif_tugas,
      notif_nilai: updated.notif_nilai,
      notif_presensi: updated.notif_presensi,
    };
  }

  private mapToDomain(row: any): InAppNotificationItem {
    return {
      id: row.id,
      sekolah_id: row.sekolah_id,
      pengguna_id: row.pengguna_id,
      judul: row.judul,
      pesan: row.pesan,
      tipe: row.tipe as NotificationType,
      tautan_url: row.tautan_url,
      apakah_dibaca: row.apakah_dibaca,
      dibaca_pada: row.dibaca_pada,
      data_tambahan: row.data_tambahan,
      created_at: row.created_at,
    };
  }
}
