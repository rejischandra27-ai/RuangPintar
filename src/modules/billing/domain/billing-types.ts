/**
 * Ruang Pintar — M23 Billing & SaaS Subscription Domain Types
 */

export type SubscriptionTier = "FREEMIUM" | "PRO" | "SEKOLAH";

export type PaymentStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

export interface CreateSubscriptionOrderInput {
  pengguna_id: string;
  sekolah_id?: string | null;
  paket?: string;
  durasi_bulan?: number;
  nominal?: number;
}

export interface SubscriptionOrderDTO {
  id: string;
  order_id: string;
  pengguna_id: string;
  sekolah_id?: string | null;
  paket: string;
  nominal: number;
  biaya_admin: number;
  total_bayar: number;
  metode_pembayaran: string;
  status: PaymentStatus;
  snap_token?: string | null;
  snap_redirect_url?: string | null;
  qris_url?: string | null;
  waktu_transaksi: Date;
  dibayar_pada?: Date | null;
  kadaluarsa_pada?: Date | null;
  durasi_bulan: number;
  is_simulator: boolean;
}

export interface MidtransNotificationPayload {
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  status_code: string;
  gross_amount: string;
  signature_key?: string;
  payment_type?: string;
  transaction_time?: string;
  settlement_time?: string;
  [key: string]: unknown;
}

export interface BillingActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TenantBillingOverviewDTO {
  sekolahId: string;
  namaSekolah: string;
  npsn: string | null;
  paketSaatIni: string;
  statusLangganan: string;
  tanggalBerakhir: string | null;
  hariTersisa: number;
  isTrial: boolean;
  statusTenant: string;
  allowsMutation: boolean;
  isOwner: boolean;
}
