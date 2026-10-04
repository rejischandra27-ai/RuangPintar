/**
 * Ruang Pintar — M17 Notification Domain Types
 * Definisi tipe data dan kontrak domain notifikasi event-driven dan outbox delivery.
 */

export type NotificationType =
  | "PENGUMUMAN_BARU"
  | "TUGAS_BARU"
  | "NILAI_DITERBITKAN"
  | "PENGAJUAN_IZIN"
  | "JADWAL_BERUBAH"
  | "SISTEM"
  | "JOIN_REQUEST_RECEIVED"
  | "JOIN_REQUEST_APPROVED"
  | "JOIN_REQUEST_REJECTED";

export interface InAppNotificationItem {
  id: string;
  sekolah_id: string;
  pengguna_id: string;
  judul: string;
  pesan: string;
  tipe: NotificationType;
  tautan_url: string | null;
  apakah_dibaca: boolean;
  dibaca_pada: Date | null;
  data_tambahan: string | null;
  created_at: Date;
}

export interface NotificationCenterSummary {
  unread_count: number;
  items: InAppNotificationItem[];
}

export interface CreateNotificationInput {
  sekolah_id: string;
  pengguna_id: string;
  judul: string;
  pesan: string;
  tipe: NotificationType;
  tautan_url?: string | null;
  data_tambahan?: Record<string, unknown> | null;
}

export interface NotificationPreferenceItem {
  id: string;
  pengguna_id: string;
  in_app_aktif: boolean;
  whatsapp_aktif: boolean;
  email_aktif: boolean;
  notif_pengumuman: boolean;
  notif_tugas: boolean;
  notif_nilai: boolean;
  notif_presensi: boolean;
}

export interface UpdateNotificationPreferenceInput {
  in_app_aktif?: boolean;
  whatsapp_aktif?: boolean;
  email_aktif?: boolean;
  notif_pengumuman?: boolean;
  notif_tugas?: boolean;
  notif_nilai?: boolean;
  notif_presensi?: boolean;
}
