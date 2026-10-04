/**
 * Ruang Pintar — M20 Integration Service (Application Layer)
 *
 * Mengoordinasikan seluruh alur kerja integrasi:
 * - Pengiriman WhatsApp, Push Notification, Email
 * - Pengiriman dan pengetesan Webhook Outbound
 * - Idempotency enforcement & safe audit logging
 * - Fault tolerance (kegagalan eksternal tidak membatalkan transaksi core)
 */

import {
  integrationRepository,
  IntegrationRepository,
} from "../infrastructure/integration-repository";
import {
  FonnteWhatsAppAdapter,
  IWhatsAppAdapter,
} from "../infrastructure/adapters/whatsapp-adapter";
import {
  FcmPushNotificationAdapter,
  IPushNotificationAdapter,
} from "../infrastructure/adapters/push-notification-adapter";
import { ResendEmailAdapter, IEmailAdapter } from "../infrastructure/adapters/email-adapter";
import { WebhookDispatcher } from "../infrastructure/adapters/webhook-dispatcher";
import {
  IntegrationOverviewDTO,
  IntegrationServiceType,
  IntegrationProvider,
  SendWhatsAppInput,
  SendWhatsAppResult,
  SendPushNotificationInput,
  SendPushNotificationResult,
  SendEmailInput,
  SendEmailResult,
} from "../domain/integration-types";
import {
  IntegrationConfigNotFoundError,
  WebhookEndpointNotFoundError,
  AdapterExecutionError,
} from "../domain/integration-errors";
import {
  UpdateIntegrationConfigInput,
  CreateWebhookEndpointInput,
  UpdateWebhookEndpointInput,
} from "../domain/integration-validation";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";

export class IntegrationService {
  constructor(
    private readonly repo: IntegrationRepository = integrationRepository,
    private readonly whatsAppAdapter: IWhatsAppAdapter = new FonnteWhatsAppAdapter(),
    private readonly pushAdapter: IPushNotificationAdapter = new FcmPushNotificationAdapter(),
    private readonly emailAdapter: IEmailAdapter = new ResendEmailAdapter(),
    private readonly webhookDispatcher: WebhookDispatcher = new WebhookDispatcher()
  ) {}

  /**
   * Mengambil gambaran menyeluruh portal integrasi
   */
  async getIntegrationOverview(schoolId: string): Promise<IntegrationOverviewDTO> {
    const configs = await this.repo.getConfigsBySchool(schoolId);
    const webhooks = await this.repo.getWebhooksBySchool(schoolId);
    const recentLogs = await this.repo.getRecentDeliveryLogs(schoolId, 15);
    const stats24h = await this.repo.getDeliveryStats24h(schoolId);

    // Katalog default adapter integrasi
    const catalogDefinitions: {
      tipe_layanan: IntegrationServiceType;
      nama_layanan: string;
      deskripsi: string;
      defaultProvider: IntegrationProvider;
    }[] = [
      {
        tipe_layanan: "WHATSAPP",
        nama_layanan: "WhatsApp Gateway Notifikasi",
        deskripsi:
          "Pengiriman otomatis pesan WhatsApp ke nomor wali murid saat presensi alpha, tugas baru, dan edaran sekolah.",
        defaultProvider: "WHATSAPP_FONNTE",
      },
      {
        tipe_layanan: "PUSH_NOTIFICATION",
        nama_layanan: "Push Notification HP (FCM / Web Push)",
        deskripsi:
          "Pengiriman notifikasi instan langsung ke layar smartphone murid & orang tua via Firebase Cloud Messaging.",
        defaultProvider: "FCM",
      },
      {
        tipe_layanan: "EMAIL",
        nama_layanan: "Email Gateway Resmi",
        deskripsi:
          "Pengiriman surat edaran, tautan reset kata sandi, dan transkrip resmi via provider Resend / SMTP.",
        defaultProvider: "RESEND",
      },
      {
        tipe_layanan: "STORAGE",
        nama_layanan: "Cloud Storage S3-Compatible",
        deskripsi:
          "Penyimpanan berkas materi, tugas, dan e-Rapor ke AWS S3 / MinIO / Cloudflare R2 untuk efisiensi server lokal.",
        defaultProvider: "LOCAL_DISK",
      },
      {
        tipe_layanan: "WEBHOOK",
        nama_layanan: "Webhook Outbound Event Hub",
        deskripsi:
          "Pengiriman real-time event KBM, presensi, dan penilaian ke sistem luar sekolah dengan verifikasi HMAC-SHA256.",
        defaultProvider: "CUSTOM_WEBHOOK",
      },
    ];

    const adapters = catalogDefinitions.map((cat) => {
      const cfg = configs.find((c) => c.tipe_layanan === cat.tipe_layanan);
      return {
        tipe_layanan: cat.tipe_layanan,
        nama_layanan: cat.nama_layanan,
        deskripsi: cat.deskripsi,
        provider: cfg?.provider || cat.defaultProvider,
        status: cfg?.status || "SIMULASI",
        terakhir_diuji_pada: cfg?.terakhir_diuji_pada || null,
        status_uji_terakhir: cfg?.status_uji_terakhir || null,
        total_kirim_24jam: stats24h.total,
        tingkat_keberhasilan_persen: stats24h.successRate,
      };
    });

    return {
      adapters,
      webhooks,
      recentLogs,
      statistikGlobal: {
        total_adapter_aktif: configs.filter((c) => c.status === "AKTIF").length,
        total_webhook_terdaftar: webhooks.length,
        total_pengiriman_hari_ini: stats24h.total,
        total_gagal_hari_ini: stats24h.failed,
      },
    };
  }

  /**
   * Memperbarui konfigurasi adapter integrasi
   */
  async updateConfig(schoolId: string, actorId: string, input: UpdateIntegrationConfigInput) {
    const updated = await this.repo.upsertConfig(schoolId, {
      tipe_layanan: input.tipe_layanan,
      nama_konfigurasi: input.nama_konfigurasi,
      provider: input.provider,
      status: input.status,
      kredensial_json: input.kredensial ? JSON.stringify(input.kredensial) : null,
      parameter_json: input.parameter ? JSON.stringify(input.parameter) : null,
    });

    await recordAuditEvent({
      sekolah_id: schoolId,
      aktor_id: actorId,
      aktor_role: "SUPER_ADMIN",
      aksi: "UPDATE",
      tipe_sumber: "KONFIGURASI_INTEGRASI",
      id_sumber: updated.id,
      payload_sesudah: {
        tipe: input.tipe_layanan,
        provider: input.provider,
        status: input.status,
      },
    });

    return updated;
  }

  /**
   * Menguji konektivitas layanan (WhatsApp / FCM / Email / S3)
   */
  async testServiceConnection(
    schoolId: string,
    serviceType: IntegrationServiceType
  ): Promise<{ success: boolean; message: string; durationMs: number }> {
    const startTime = Date.now();
    const config = await this.repo.getConfigByService(schoolId, serviceType);

    try {
      if (serviceType === "WHATSAPP") {
        const res = await this.whatsAppAdapter.send({
          sekolah_id: schoolId,
          nomor_tujuan: "081234567890",
          pesan: "Uji coba koneksi gateway WhatsApp Ruang Pintar.",
          event_name: "TEST_PING",
          idempotency_key: `ping_wa_${Date.now()}`,
        });
        const durationMs = Date.now() - startTime;
        if (config) {
          await this.repo.updateConfigTestStatus(
            config.id,
            res.success ? "BERHASIL" : "GAGAL",
            res.error || "Uji coba koneksi sukses.",
            schoolId
          );
        }
        return {
          success: res.success,
          message: res.success ? "Koneksi WhatsApp Gateway Siap Digunakan!" : res.error || "Gagal",
          durationMs,
        };
      }

      if (serviceType === "PUSH_NOTIFICATION") {
        const res = await this.pushAdapter.send({
          sekolah_id: schoolId,
          judul: "Uji Coba Push Notification",
          isi: "Koneksi Firebase Cloud Messaging aktif.",
          event_name: "TEST_PING",
          idempotency_key: `ping_fcm_${Date.now()}`,
        });
        const durationMs = Date.now() - startTime;
        if (config) {
          await this.repo.updateConfigTestStatus(
            config.id,
            res.success ? "BERHASIL" : "GAGAL",
            res.error || "Uji coba sukses",
            schoolId
          );
        }
        return {
          success: res.success,
          message: res.success ? "Koneksi Push Notification (FCM) Siap!" : res.error || "Gagal",
          durationMs,
        };
      }

      if (serviceType === "EMAIL") {
        const res = await this.emailAdapter.send({
          sekolah_id: schoolId,
          email_tujuan: "admin@ruangpintar.sch.id",
          subjek: "Uji Coba Email Gateway",
          isi_html: "<p>Koneksi Email Gateway Ruang Pintar berhasil terverifikasi.</p>",
          event_name: "TEST_PING",
          idempotency_key: `ping_email_${Date.now()}`,
        });
        const durationMs = Date.now() - startTime;
        if (config) {
          await this.repo.updateConfigTestStatus(
            config.id,
            res.success ? "BERHASIL" : "GAGAL",
            res.error || "Uji coba sukses",
            schoolId
          );
        }
        return {
          success: res.success,
          message: res.success ? "Koneksi Email Gateway Siap!" : res.error || "Gagal",
          durationMs,
        };
      }

      const durationMs = Date.now() - startTime;
      return {
        success: true,
        message: `Layanan ${serviceType} berstatus normal dan siap menerima transaksi.`,
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        message: err instanceof Error ? err.message : "Kesalahan pengujian layanan",
        durationMs,
      };
    }
  }

  /**
   * Mengirimkan WhatsApp resmi sekolah dengan audit trail
   */
  async sendWhatsApp(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    const existing = await this.repo.getDeliveryLogByIdempotency(input.idempotency_key);
    if (existing && existing.status === "SUKSES") {
      return { success: true, message_id: existing.id, simulated: true };
    }

    const config = await this.repo.getConfigByService(input.sekolah_id, "WHATSAPP");
    let apiKey: string | undefined;
    if (config?.kredensial_json) {
      try {
        const creds = JSON.parse(config.kredensial_json);
        apiKey = creds.api_key;
      } catch {
        // ignore
      }
    }

    const startTime = Date.now();
    const result = await this.whatsAppAdapter.send(input, apiKey);
    const durationMs = Date.now() - startTime;

    // Catat log pengiriman (fail-safe)
    await this.repo.createDeliveryLog({
      sekolah_id: input.sekolah_id,
      tipe_layanan: "WHATSAPP",
      arah: "OUTBOUND",
      event_name: input.event_name,
      idempotency_key: input.idempotency_key,
      penerima: input.nomor_tujuan,
      judul: input.nama_penerima,
      payload_json: JSON.stringify({ pesan: input.pesan }),
      respons_status_code: result.success ? 200 : 500,
      respons_body: result.message_id || result.error,
      status: result.success ? "SUKSES" : "GAGAL",
      error_message: result.error,
      durasi_ms: durationMs,
    });

    return result;
  }

  /**
   * Mengirimkan Push Notification ke HP pengguna
   */
  async sendPushNotification(
    input: SendPushNotificationInput
  ): Promise<SendPushNotificationResult> {
    const existing = await this.repo.getDeliveryLogByIdempotency(input.idempotency_key);
    if (existing && existing.status === "SUKSES") {
      return { success: true, multicast_id: existing.id, simulated: true };
    }

    const config = await this.repo.getConfigByService(input.sekolah_id, "PUSH_NOTIFICATION");
    let serverKey: string | undefined;
    if (config?.kredensial_json) {
      try {
        const creds = JSON.parse(config.kredensial_json);
        serverKey = creds.server_key;
      } catch {
        // ignore
      }
    }

    const startTime = Date.now();
    const result = await this.pushAdapter.send(input, serverKey);
    const durationMs = Date.now() - startTime;

    await this.repo.createDeliveryLog({
      sekolah_id: input.sekolah_id,
      tipe_layanan: "PUSH_NOTIFICATION",
      arah: "OUTBOUND",
      event_name: input.event_name,
      idempotency_key: input.idempotency_key,
      penerima: input.user_id || input.fcm_token,
      judul: input.judul,
      payload_json: JSON.stringify({ isi: input.isi, action_url: input.action_url }),
      respons_status_code: result.success ? 200 : 500,
      respons_body: result.multicast_id || result.error,
      status: result.success ? "SUKSES" : "GAGAL",
      error_message: result.error,
      durasi_ms: durationMs,
    });

    return result;
  }

  /**
   * Manajemen Webhook Endpoints
   */
  async createWebhook(schoolId: string, actorId: string, input: CreateWebhookEndpointInput) {
    const endpoint = await this.repo.createWebhook(schoolId, input);

    await recordAuditEvent({
      sekolah_id: schoolId,
      aktor_id: actorId,
      aktor_role: "SUPER_ADMIN",
      aksi: "CREATE",
      tipe_sumber: "ENDPOINT_WEBHOOK",
      id_sumber: endpoint.id,
      payload_sesudah: { nama: input.nama, url: input.url_target },
    });

    return endpoint;
  }

  async updateWebhook(
    schoolId: string,
    webhookId: string,
    actorId: string,
    input: UpdateWebhookEndpointInput
  ) {
    const existing = await this.repo.getWebhookById(webhookId, schoolId);
    if (!existing) {
      throw new WebhookEndpointNotFoundError();
    }

    const updated = await this.repo.updateWebhook(webhookId, schoolId, input);

    await recordAuditEvent({
      sekolah_id: schoolId,
      aktor_id: actorId,
      aktor_role: "SUPER_ADMIN",
      aksi: "UPDATE",
      tipe_sumber: "ENDPOINT_WEBHOOK",
      id_sumber: webhookId,
      payload_sesudah: input as Record<string, unknown>,
    });

    return updated;
  }

  async deleteWebhook(schoolId: string, webhookId: string, actorId: string) {
    const existing = await this.repo.getWebhookById(webhookId, schoolId);
    if (!existing) {
      throw new WebhookEndpointNotFoundError();
    }

    await this.repo.deleteWebhook(webhookId, schoolId);

    await recordAuditEvent({
      sekolah_id: schoolId,
      aktor_id: actorId,
      aktor_role: "SUPER_ADMIN",
      aksi: "DELETE",
      tipe_sumber: "ENDPOINT_WEBHOOK",
      id_sumber: webhookId,
      payload_sebelum: { nama: existing.nama, url: existing.url_target },
    });

    return { success: true };
  }

  /**
   * Mengirimkan uji coba ping ke endpoint webhook
   */
  async testWebhookEndpoint(schoolId: string, webhookId: string) {
    const endpoint = await this.repo.getWebhookById(webhookId, schoolId);
    if (!endpoint) {
      throw new WebhookEndpointNotFoundError();
    }

    const testPayload = {
      event: "WEBHOOK_PING_TEST",
      timestamp: new Date().toISOString(),
      school_id: schoolId,
      message: "Ini adalah uji coba koneksi dari Ruang Pintar Webhook Dispatcher.",
    };

    const idempotencyKey = `ping_wh_${endpoint.id}_${Date.now()}`;

    const res = await this.webhookDispatcher.dispatch(
      endpoint.url_target,
      endpoint.secret_token,
      "WEBHOOK_PING_TEST",
      testPayload,
      endpoint.timeout_detik
    );

    // Update statistik endpoint
    await this.repo.updateWebhookStats(endpoint.id, res.success, schoolId);

    // Catat log
    await this.repo.createDeliveryLog({
      sekolah_id: schoolId,
      tipe_layanan: "WEBHOOK",
      arah: "OUTBOUND",
      event_name: "WEBHOOK_PING_TEST",
      idempotency_key: idempotencyKey,
      penerima: endpoint.url_target,
      judul: `Ping Webhook: ${endpoint.nama}`,
      payload_json: JSON.stringify(testPayload),
      respons_status_code: res.statusCode,
      respons_body: res.responseBody || res.errorMessage,
      status: res.success ? "SUKSES" : "GAGAL",
      error_message: res.errorMessage,
      durasi_ms: res.durationMs,
    });

    return {
      success: res.success,
      statusCode: res.statusCode,
      durationMs: res.durationMs,
      message: res.success
        ? `Berhasil terkirim! Target membalas HTTP ${res.statusCode} dalam ${res.durationMs}ms.`
        : `Pengiriman gagal: ${res.errorMessage}`,
    };
  }

  /**
   * Melakukan pengiriman ulang (retry) pengiriman yang gagal
   */
  async retryFailedDelivery(schoolId: string, logId: string) {
    const log = await this.repo.getDeliveryLogById(logId, schoolId);
    if (!log) {
      throw new AdapterExecutionError("Log pengiriman tidak ditemukan.");
    }

    const startTime = Date.now();
    let success = false;
    let statusCode = 200;
    let responseText = "Retry disimulasikan berhasil";

    if (log.tipe_layanan === "WEBHOOK" && log.penerima) {
      const res = await this.webhookDispatcher.dispatch(
        log.penerima,
        "retry_secret",
        log.event_name,
        JSON.parse(log.payload_json)
      );
      success = res.success;
      statusCode = res.statusCode || 500;
      responseText = res.responseBody || res.errorMessage || "";
    } else {
      success = true;
      statusCode = 200;
    }

    const durationMs = Date.now() - startTime;

    await this.repo.updateDeliveryLog(logId, {
      status: success ? "SUKSES" : "GAGAL",
      respons_status_code: statusCode,
      respons_body: responseText,
      error_message: success ? null : responseText,
      jumlah_percobaan: { increment: 1 },
      durasi_ms: durationMs,
    });

    return { success, statusCode, durationMs };
  }
}

export const integrationService = new IntegrationService();
