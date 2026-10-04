/**
 * Ruang Pintar — M20 Integration Repository (Data Layer)
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { ulid } from "ulidx";
import {
  IntegrationConfigDTO,
  WebhookEndpointDTO,
  IntegrationDeliveryLogDTO,
  IntegrationServiceType,
  IntegrationProvider,
  IntegrationStatus,
  DeliveryStatus,
  DeliveryDirection,
} from "../domain/integration-types";

export class IntegrationRepository {
  /**
   * Mengambil seluruh konfigurasi integrasi di sekolah
   */
  async getConfigsBySchool(schoolId: string): Promise<IntegrationConfigDTO[]> {
    const records = await prisma.konfigurasiIntegrasi.findMany({
      where: { sekolah_id: schoolId },
      orderBy: { tipe_layanan: "asc" },
    });

    return records.map((r) => ({
      id: r.id,
      sekolah_id: r.sekolah_id,
      tipe_layanan: r.tipe_layanan as IntegrationServiceType,
      nama_konfigurasi: r.nama_konfigurasi,
      provider: r.provider as IntegrationProvider,
      status: r.status as IntegrationStatus,
      kredensial_json: r.kredensial_json,
      parameter_json: r.parameter_json,
      terakhir_diuji_pada: r.terakhir_diuji_pada?.toISOString() || null,
      status_uji_terakhir: r.status_uji_terakhir,
      catatan_uji: r.catatan_uji,
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
    }));
  }

  /**
   * Mengambil konfigurasi spesifik berdasarkan tipe layanan
   */
  async getConfigByService(
    schoolId: string,
    serviceType: IntegrationServiceType
  ): Promise<IntegrationConfigDTO | null> {
    const r = await prisma.konfigurasiIntegrasi.findFirst({
      where: {
        sekolah_id: schoolId,
        tipe_layanan: serviceType,
        status: { in: ["AKTIF", "SIMULASI"] },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      tipe_layanan: r.tipe_layanan as IntegrationServiceType,
      nama_konfigurasi: r.nama_konfigurasi,
      provider: r.provider as IntegrationProvider,
      status: r.status as IntegrationStatus,
      kredensial_json: r.kredensial_json,
      parameter_json: r.parameter_json,
      terakhir_diuji_pada: r.terakhir_diuji_pada?.toISOString() || null,
      status_uji_terakhir: r.status_uji_terakhir,
      catatan_uji: r.catatan_uji,
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
    };
  }

  /**
   * Menyimpan atau memperbarui konfigurasi adapter
   */
  async upsertConfig(
    schoolId: string,
    data: {
      tipe_layanan: IntegrationServiceType;
      nama_konfigurasi: string;
      provider: IntegrationProvider;
      status: IntegrationStatus;
      kredensial_json?: string | null;
      parameter_json?: string | null;
    }
  ): Promise<IntegrationConfigDTO> {
    const record = await prisma.konfigurasiIntegrasi.upsert({
      where: {
        sekolah_id_tipe_layanan_provider: {
          sekolah_id: schoolId,
          tipe_layanan: data.tipe_layanan,
          provider: data.provider,
        },
      },
      update: {
        nama_konfigurasi: data.nama_konfigurasi,
        status: data.status,
        kredensial_json: data.kredensial_json,
        parameter_json: data.parameter_json,
      },
      create: {
        id: ulid(),
        sekolah_id: schoolId,
        tipe_layanan: data.tipe_layanan,
        nama_konfigurasi: data.nama_konfigurasi,
        provider: data.provider,
        status: data.status,
        kredensial_json: data.kredensial_json,
        parameter_json: data.parameter_json,
      },
    });

    return {
      id: record.id,
      sekolah_id: record.sekolah_id,
      tipe_layanan: record.tipe_layanan as IntegrationServiceType,
      nama_konfigurasi: record.nama_konfigurasi,
      provider: record.provider as IntegrationProvider,
      status: record.status as IntegrationStatus,
      kredensial_json: record.kredensial_json,
      parameter_json: record.parameter_json,
      terakhir_diuji_pada: record.terakhir_diuji_pada?.toISOString() || null,
      status_uji_terakhir: record.status_uji_terakhir,
      catatan_uji: record.catatan_uji,
      created_at: record.created_at.toISOString(),
      updated_at: record.updated_at.toISOString(),
    };
  }

  /**
   * Memperbarui status uji coba koneksi
   */
  async updateConfigTestStatus(
    id: string,
    status: "BERHASIL" | "GAGAL",
    catatan?: string,
    schoolId?: string
  ): Promise<void> {
    const existing = await prisma.konfigurasiIntegrasi.findFirst({
      where: { id, ...(schoolId ? { sekolah_id: schoolId } : {}) },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Konfigurasi integrasi dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    await prisma.konfigurasiIntegrasi.update({
      where: { id },
      data: {
        terakhir_diuji_pada: new Date(),
        status_uji_terakhir: status,
        catatan_uji: catatan,
      },
    });
  }

  /**
   * Mengambil seluruh endpoint webhook
   */
  async getWebhooksBySchool(schoolId: string): Promise<WebhookEndpointDTO[]> {
    const records = await prisma.endpointWebhook.findMany({
      where: { sekolah_id: schoolId },
      orderBy: { created_at: "desc" },
    });

    return records.map((r) => {
      let events: string[] = [];
      try {
        events = JSON.parse(r.event_langganan_json);
      } catch {
        events = [];
      }

      return {
        id: r.id,
        sekolah_id: r.sekolah_id,
        nama: r.nama,
        url_target: r.url_target,
        secret_token_masked:
          r.secret_token.length > 8
            ? `${r.secret_token.slice(0, 4)}...${r.secret_token.slice(-4)}`
            : "••••••••",
        event_langganan: events,
        status: r.status as "AKTIF" | "NONAKTIF",
        retry_count_max: r.retry_count_max,
        timeout_detik: r.timeout_detik,
        terakhir_dipicu_pada: r.terakhir_dipicu_pada?.toISOString() || null,
        total_terkirim: r.total_terkirim,
        total_gagal: r.total_gagal,
        created_at: r.created_at.toISOString(),
        updated_at: r.updated_at.toISOString(),
      };
    });
  }

  async getWebhookById(id: string, schoolId: string) {
    return prisma.endpointWebhook.findFirst({
      where: { id, sekolah_id: schoolId },
    });
  }

  async createWebhook(
    schoolId: string,
    data: {
      nama: string;
      url_target: string;
      secret_token?: string;
      event_langganan: string[];
      status?: "AKTIF" | "NONAKTIF";
      retry_count_max?: number;
      timeout_detik?: number;
    }
  ): Promise<WebhookEndpointDTO> {
    const secret =
      data.secret_token ||
      `whsec_${ulid().toLowerCase()}_${Math.random().toString(36).substring(2, 9)}`;

    const r = await prisma.endpointWebhook.create({
      data: {
        id: ulid(),
        sekolah_id: schoolId,
        nama: data.nama,
        url_target: data.url_target,
        secret_token: secret,
        event_langganan_json: JSON.stringify(data.event_langganan),
        status: data.status || "AKTIF",
        retry_count_max: data.retry_count_max ?? 3,
        timeout_detik: data.timeout_detik ?? 10,
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      nama: r.nama,
      url_target: r.url_target,
      secret_token_masked: `${secret.slice(0, 4)}...${secret.slice(-4)}`,
      event_langganan: data.event_langganan,
      status: r.status as "AKTIF" | "NONAKTIF",
      retry_count_max: r.retry_count_max,
      timeout_detik: r.timeout_detik,
      terakhir_dipicu_pada: null,
      total_terkirim: 0,
      total_gagal: 0,
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
    };
  }

  async updateWebhook(
    id: string,
    schoolId: string,
    data: {
      nama?: string;
      url_target?: string;
      event_langganan?: string[];
      status?: "AKTIF" | "NONAKTIF";
      retry_count_max?: number;
      timeout_detik?: number;
    }
  ) {
    const existing = await prisma.endpointWebhook.findFirst({
      where: { id, sekolah_id: schoolId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Endpoint webhook dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    return prisma.endpointWebhook.update({
      where: { id },
      data: {
        ...(data.nama ? { nama: data.nama } : {}),
        ...(data.url_target ? { url_target: data.url_target } : {}),
        ...(data.event_langganan
          ? { event_langganan_json: JSON.stringify(data.event_langganan) }
          : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.retry_count_max !== undefined ? { retry_count_max: data.retry_count_max } : {}),
        ...(data.timeout_detik !== undefined ? { timeout_detik: data.timeout_detik } : {}),
      },
    });
  }

  async deleteWebhook(id: string, schoolId: string) {
    const deleted = await prisma.endpointWebhook.deleteMany({
      where: { id, sekolah_id: schoolId },
    });
    if (deleted.count === 0) {
      throw new Error(
        `Endpoint webhook dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }
    return deleted;
  }

  async updateWebhookStats(id: string, success: boolean, schoolId?: string) {
    const existing = await prisma.endpointWebhook.findFirst({
      where: { id, ...(schoolId ? { sekolah_id: schoolId } : {}) },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Endpoint webhook dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    return prisma.endpointWebhook.update({
      where: { id },
      data: {
        terakhir_dipicu_pada: new Date(),
        ...(success ? { total_terkirim: { increment: 1 } } : { total_gagal: { increment: 1 } }),
      },
    });
  }

  /**
   * Log Pengiriman Integrasi
   */
  async createDeliveryLog(data: {
    sekolah_id: string;
    tipe_layanan: IntegrationServiceType;
    arah?: DeliveryDirection;
    event_name: string;
    idempotency_key: string;
    penerima?: string | null;
    judul?: string | null;
    payload_json: string;
    respons_status_code?: number | null;
    respons_body?: string | null;
    status: DeliveryStatus;
    jumlah_percobaan?: number;
    error_message?: string | null;
    durasi_ms?: number | null;
  }): Promise<IntegrationDeliveryLogDTO> {
    const r = await prisma.logPengirimanIntegrasi.create({
      data: {
        id: ulid(),
        sekolah_id: data.sekolah_id,
        tipe_layanan: data.tipe_layanan,
        arah: data.arah || "OUTBOUND",
        event_name: data.event_name,
        idempotency_key: data.idempotency_key,
        penerima: data.penerima,
        judul: data.judul,
        payload_json: data.payload_json,
        respons_status_code: data.respons_status_code,
        respons_body: data.respons_body,
        status: data.status,
        jumlah_percobaan: data.jumlah_percobaan ?? 1,
        error_message: data.error_message,
        durasi_ms: data.durasi_ms,
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      tipe_layanan: r.tipe_layanan as IntegrationServiceType,
      arah: r.arah as DeliveryDirection,
      event_name: r.event_name,
      idempotency_key: r.idempotency_key,
      penerima: r.penerima,
      judul: r.judul,
      payload_json: r.payload_json,
      respons_status_code: r.respons_status_code,
      respons_body: r.respons_body,
      status: r.status as DeliveryStatus,
      jumlah_percobaan: r.jumlah_percobaan,
      error_message: r.error_message,
      durasi_ms: r.durasi_ms,
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
    };
  }

  async getDeliveryLogById(id: string, schoolId: string) {
    return prisma.logPengirimanIntegrasi.findFirst({
      where: { id, sekolah_id: schoolId },
    });
  }

  async getDeliveryLogByIdempotency(key: string) {
    return prisma.logPengirimanIntegrasi.findUnique({
      where: { idempotency_key: key },
    });
  }

  async updateDeliveryLog(
    id: string,
    data: {
      status: DeliveryStatus;
      respons_status_code?: number | null;
      respons_body?: string | null;
      error_message?: string | null;
      jumlah_percobaan?: { increment: number };
      durasi_ms?: number | null;
    }
  ) {
    return prisma.logPengirimanIntegrasi.update({
      where: { id },
      data,
    });
  }

  async getRecentDeliveryLogs(schoolId: string, limit = 20): Promise<IntegrationDeliveryLogDTO[]> {
    const records = await prisma.logPengirimanIntegrasi.findMany({
      where: { sekolah_id: schoolId },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return records.map((r) => ({
      id: r.id,
      sekolah_id: r.sekolah_id,
      tipe_layanan: r.tipe_layanan as IntegrationServiceType,
      arah: r.arah as DeliveryDirection,
      event_name: r.event_name,
      idempotency_key: r.idempotency_key,
      penerima: r.penerima,
      judul: r.judul,
      payload_json: r.payload_json,
      respons_status_code: r.respons_status_code,
      respons_body: r.respons_body,
      status: r.status as DeliveryStatus,
      jumlah_percobaan: r.jumlah_percobaan,
      error_message: r.error_message,
      durasi_ms: r.durasi_ms,
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
    }));
  }

  async getDeliveryStats24h(schoolId: string) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const totalLogs = await prisma.logPengirimanIntegrasi.count({
      where: {
        sekolah_id: schoolId,
        created_at: { gte: oneDayAgo },
      },
    });

    const successLogs = await prisma.logPengirimanIntegrasi.count({
      where: {
        sekolah_id: schoolId,
        status: "SUKSES",
        created_at: { gte: oneDayAgo },
      },
    });

    const failedLogs = await prisma.logPengirimanIntegrasi.count({
      where: {
        sekolah_id: schoolId,
        status: "GAGAL",
        created_at: { gte: oneDayAgo },
      },
    });

    return {
      total: totalLogs,
      success: successLogs,
      failed: failedLogs,
      successRate: totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100,
    };
  }
}

export const integrationRepository = new IntegrationRepository();
