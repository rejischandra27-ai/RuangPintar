"use server";

/**
 * Ruang Pintar — School & Organization (M01) Server Actions
 *
 * Seluruh aksi mutasi diverifikasi server-side melalui requireAuth() dan requirePermission(),
 * dieksekusi secara transaksional, dan merevalidasi cache halaman /sekolah.
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import {
  AuthorizationError,
  requirePermission,
} from "@/shared/infrastructure/authorization/authz-guard";
import { SchoolDomainError } from "@/modules/school/domain/school-errors";
import { schoolProfileService } from "@/modules/school/application/school-profile-service";
import { organizationUnitService } from "@/modules/school/application/organization-unit-service";
import { positionService } from "@/modules/school/application/position-service";
import { positionAssignmentService } from "@/modules/school/application/position-assignment-service";
import { AuditContext } from "@/modules/school/infrastructure/school-repository";
import { ZodError } from "zod";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import { tenantLifecycleService } from "@/shared/infrastructure/tenant/tenant-lifecycle-service";

async function getAuditContext(actor: { id: string; peran_dasar: string }): Promise<AuditContext> {
  try {
    const h = await headers();
    return {
      aktor_id: actor.id,
      aktor_role: actor.peran_dasar,
      ip_address: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "127.0.0.1",
      user_agent: h.get("user-agent") ?? "Internal-Server-Action",
    };
  } catch {
    return {
      aktor_id: actor.id,
      aktor_role: actor.peran_dasar,
      ip_address: "127.0.0.1",
      user_agent: "Internal-Server-Action",
    };
  }
}

export type ActionResponse<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code: string; details?: Record<string, string[]> };

function handleActionError(error: unknown): ActionResponse<never> {
  if (error instanceof AuthorizationError) {
    return {
      success: false,
      error: `Akses ditolak: ${error.message}`,
      code: "FORBIDDEN",
    };
  }

  if (error instanceof ZodError) {
    const zodError = error as ZodError;
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of zodError.issues) {
      const field = issue.path.join(".");
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    }
    return {
      success: false,
      error: zodError.issues[0]?.message ?? "Validasi formulir gagal.",
      code: "VALIDATION_ERROR",
      details: fieldErrors,
    };
  }

  if (error instanceof SchoolDomainError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : "Terjadi kesalahan internal server.",
    code: "INTERNAL_ERROR",
  };
}

// -----------------------------------------------------------------------------
// 1. PROFIL SEKOLAH (academic.school.manage)
// -----------------------------------------------------------------------------

export async function updateSchoolProfileAction(formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Sekolah konteks tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.school.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const auditContext = await getAuditContext(actor);

    const input = {
      nama: String(formData.get("nama") ?? ""),
      npsn: formData.get("npsn") ? String(formData.get("npsn")) : null,
      jenjang: String(formData.get("jenjang") ?? "SMA") as "SD" | "SMP" | "SMA" | "SMK" | "UMUM",
      alamat: formData.get("alamat") ? String(formData.get("alamat")) : null,
      telepon: formData.get("telepon") ? String(formData.get("telepon")) : null,
      email: formData.get("email") ? String(formData.get("email")) : null,
      zona_waktu: String(formData.get("zona_waktu") ?? "Asia/Jakarta"),
      logo_url: formData.get("logo_url") ? String(formData.get("logo_url")) : null,
    };

    const updated = await schoolProfileService.updateProfile(actor.sekolah_id, input, auditContext);

    revalidatePath("/sekolah");
    return { success: true, data: updated, message: "Profil sekolah berhasil diperbarui." };
  } catch (error) {
    return handleActionError(error);
  }
}

// -----------------------------------------------------------------------------
// 2. UNIT ORGANISASI (academic.structure.manage)
// -----------------------------------------------------------------------------

export async function createOrganizationUnitAction(formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Sekolah konteks tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const auditContext = await getAuditContext(actor);

    const input = {
      nama: String(formData.get("nama") ?? ""),
      kode: formData.get("kode") ? String(formData.get("kode")) : null,
      induk_unit_id: formData.get("induk_unit_id") ? String(formData.get("induk_unit_id")) : null,
    };

    const created = await organizationUnitService.createUnit(actor.sekolah_id, input, auditContext);

    revalidatePath("/sekolah");
    return { success: true, data: created, message: "Unit organisasi berhasil ditambahkan." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateOrganizationUnitAction(
  id: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Sekolah konteks tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const auditContext = await getAuditContext(actor);

    const input = {
      nama: String(formData.get("nama") ?? ""),
      kode: formData.get("kode") ? String(formData.get("kode")) : null,
      induk_unit_id: formData.get("induk_unit_id") ? String(formData.get("induk_unit_id")) : null,
    };

    const updated = await organizationUnitService.updateUnit(
      id,
      actor.sekolah_id,
      input,
      auditContext
    );

    revalidatePath("/sekolah");
    return { success: true, data: updated, message: "Unit organisasi berhasil diperbarui." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteOrganizationUnitAction(id: string): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Sekolah konteks tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const auditContext = await getAuditContext(actor);

    await organizationUnitService.deleteUnit(id, actor.sekolah_id, auditContext);

    revalidatePath("/sekolah");
    return { success: true, data: null, message: "Unit organisasi berhasil dihapus." };
  } catch (error) {
    return handleActionError(error);
  }
}

// -----------------------------------------------------------------------------
// 3. MASTER JABATAN (academic.structure.manage)
// -----------------------------------------------------------------------------

export async function createPositionAction(formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Sekolah konteks tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const auditContext = await getAuditContext(actor);

    const input = {
      kode_jabatan: String(formData.get("kode_jabatan") ?? ""),
      nama_jabatan: String(formData.get("nama_jabatan") ?? ""),
      unit_id: formData.get("unit_id") ? String(formData.get("unit_id")) : null,
      tingkat_akses: (formData.get("tingkat_akses")
        ? String(formData.get("tingkat_akses"))
        : "SCHOOL_WIDE") as "SCHOOL_WIDE" | "UNIT_WIDE" | "PROGRAM_WIDE",
    };

    const created = await positionService.createPosition(actor.sekolah_id, input, auditContext);

    revalidatePath("/sekolah");
    return { success: true, data: created, message: "Jabatan struktural berhasil ditambahkan." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updatePositionAction(
  id: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Sekolah konteks tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const auditContext = await getAuditContext(actor);

    const input = {
      nama_jabatan: String(formData.get("nama_jabatan") ?? ""),
      unit_id: formData.get("unit_id") ? String(formData.get("unit_id")) : null,
      tingkat_akses: (formData.get("tingkat_akses")
        ? String(formData.get("tingkat_akses"))
        : "SCHOOL_WIDE") as "SCHOOL_WIDE" | "UNIT_WIDE" | "PROGRAM_WIDE",
    };

    const updated = await positionService.updatePosition(id, actor.sekolah_id, input, auditContext);

    revalidatePath("/sekolah");
    return { success: true, data: updated, message: "Jabatan struktural berhasil diperbarui." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deletePositionAction(id: string): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Sekolah konteks tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const auditContext = await getAuditContext(actor);

    await positionService.deletePosition(id, actor.sekolah_id, auditContext);

    revalidatePath("/sekolah");
    return { success: true, data: null, message: "Jabatan struktural berhasil dihapus." };
  } catch (error) {
    return handleActionError(error);
  }
}

// -----------------------------------------------------------------------------
// 4. PENUGASAN JABATAN (academic.structure.manage)
// -----------------------------------------------------------------------------

export async function assignPositionAction(formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Sekolah konteks tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const auditContext = await getAuditContext(actor);

    const input = {
      personil_id: String(formData.get("personil_id") ?? ""),
      jabatan_id: String(formData.get("jabatan_id") ?? ""),
      berlaku_mulai: new Date(String(formData.get("berlaku_mulai"))),
      berlaku_sampai: formData.get("berlaku_sampai")
        ? new Date(String(formData.get("berlaku_sampai")))
        : null,
      catatan: formData.get("catatan") ? String(formData.get("catatan")) : null,
    };

    const created = await positionAssignmentService.assignPosition(
      actor.sekolah_id,
      input,
      auditContext
    );

    revalidatePath("/sekolah");
    return { success: true, data: created, message: "Penugasan personil berhasil dicatat." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function endPositionAssignmentAction(
  id: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Sekolah konteks tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const auditContext = await getAuditContext(actor);

    const berlakuSampaiRaw = formData.get("berlaku_sampai");
    const input = {
      berlaku_sampai: berlakuSampaiRaw ? new Date(String(berlakuSampaiRaw)) : new Date(),
      catatan: formData.get("catatan") ? String(formData.get("catatan")) : null,
    };

    const updated = await positionAssignmentService.endAssignment(
      id,
      actor.sekolah_id,
      input,
      auditContext
    );

    revalidatePath("/sekolah");
    return { success: true, data: updated, message: "Penugasan jabatan berhasil diakhiri." };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function cancelPositionAssignmentAction(
  id: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Sekolah konteks tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const auditContext = await getAuditContext(actor);

    const input = {
      catatan: String(formData.get("catatan") ?? ""),
    };

    const updated = await positionAssignmentService.cancelAssignment(
      id,
      actor.sekolah_id,
      input,
      auditContext
    );

    revalidatePath("/sekolah");
    return { success: true, data: updated, message: "Penugasan jabatan berhasil dibatalkan." };
  } catch (error) {
    return handleActionError(error);
  }
}

// -----------------------------------------------------------------------------
// 5. REGISTRASI TENANT SEKOLAH MULTI-TENANT (SUPER_ADMIN ONLY)
// -----------------------------------------------------------------------------

export async function createSchoolTenantAction(formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (actor.peran_dasar !== "SUPER_ADMIN") {
      return {
        success: false,
        error:
          "Akses ditolak: Hanya Super Admin SaaS yang dapat mendaftarkan institusi sekolah baru.",
        code: "FORBIDDEN",
      };
    }

    const auditContext = await getAuditContext(actor);

    const nama = String(formData.get("nama") ?? "").trim();
    const npsnRaw = formData.get("npsn") ? String(formData.get("npsn")).trim() : null;
    const npsn = npsnRaw && npsnRaw.length > 0 ? npsnRaw : null;
    const jenjang = String(formData.get("jenjang") ?? "SMA").trim();
    const tipeLisensi = String(formData.get("tipe_lisensi") ?? "FREEMIUM").trim();
    const alamatRaw = formData.get("alamat") ? String(formData.get("alamat")).trim() : null;
    const alamat = alamatRaw && alamatRaw.length > 0 ? alamatRaw : null;
    const teleponRaw = formData.get("telepon") ? String(formData.get("telepon")).trim() : null;
    const telepon = teleponRaw && teleponRaw.length > 0 ? teleponRaw : null;
    const emailRaw = formData.get("email") ? String(formData.get("email")).trim() : null;
    const email = emailRaw && emailRaw.length > 0 ? emailRaw : null;

    if (nama.length < 3) {
      return {
        success: false,
        error: "Nama institusi sekolah minimal 3 karakter.",
        code: "VALIDATION_ERROR",
      };
    }

    if (npsn) {
      const existing = await prisma.sekolah.findUnique({
        where: { npsn },
      });
      if (existing) {
        return {
          success: false,
          error: `Sekolah dengan NPSN ${npsn} sudah terdaftar (${existing.nama}).`,
          code: "DUPLICATE_NPSN",
        };
      }
    }

    const ownerUserIdRaw = formData.get("owner_user_id")
      ? String(formData.get("owner_user_id")).trim()
      : null;
    let targetOwnerId = actor.id;

    if (ownerUserIdRaw) {
      const ownerUser = await prisma.pengguna.findUnique({
        where: { id: ownerUserIdRaw },
        select: { id: true },
      });
      if (!ownerUser) {
        return {
          success: false,
          error: `Pengguna owner dengan ID '${ownerUserIdRaw}' tidak ditemukan.`,
          code: "OWNER_NOT_FOUND",
        };
      }
      targetOwnerId = ownerUser.id;
    }

    const result = await tenantLifecycleService.provisionTenant({
      nama,
      npsn,
      jenjang,
      tipeLisensi,
      alamat,
      telepon,
      email,
      zonaWaktu: "Asia/Jakarta",
      ownerId: targetOwnerId,
      ownerRole: "SUPER_ADMIN",
      trialDurationDays: 30,
      sumberPendaftaran: "OWNER_CREATE",
      aktorId: actor.id,
      aktorRole: actor.peran_dasar,
      ipAddress: auditContext.ip_address,
      userAgent: auditContext.user_agent,
    });

    revalidatePath("/sekolah");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result.sekolah,
      message: `Sekolah ${nama} berhasil didaftarkan ke platform SaaS dengan owner aktif dan trial 30 hari.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

// -----------------------------------------------------------------------------
// 6. MANAJEMEN LISENSI & PROVISIONING KUOTA SEKOLAH (SUPER_ADMIN ONLY)
// -----------------------------------------------------------------------------

export interface UpdateSchoolLicenseInput {
  sekolah_id: string;
  tipe_lisensi: "FREEMIUM" | "SEKOLAH";
  paket: "TRIAL" | "BASIC" | "PRO" | "ENTERPRISE";
  durasi_bulan: number;
  kuota_siswa?: number;
  nomor_referensi?: string;
  catatan?: string;
}

export async function updateSchoolLicenseAction(
  input: UpdateSchoolLicenseInput
): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (actor.peran_dasar !== "SUPER_ADMIN") {
      return {
        success: false,
        error: "Akses ditolak: Hanya Super Admin SaaS yang dapat mengelola lisensi sekolah.",
        code: "FORBIDDEN",
      };
    }

    const auditContext = await getAuditContext(actor);
    const sekolah = await prisma.sekolah.findUnique({
      where: { id: input.sekolah_id },
    });

    if (!sekolah) {
      return {
        success: false,
        error: `Sekolah dengan ID '${input.sekolah_id}' tidak ditemukan.`,
        code: "NOT_FOUND",
      };
    }

    const durasiHari = Math.max(1, input.durasi_bulan) * 30;
    const now = new Date();
    const berakhirPada = new Date(now.getTime() + durasiHari * 24 * 60 * 60 * 1000);
    const kuotaSiswa = input.kuota_siswa ?? 500;

    const entitlementData = {
      kuota_siswa: kuotaSiswa,
      paket: input.paket,
      durasi_bulan: input.durasi_bulan,
      nomor_referensi: input.nomor_referensi || null,
      catatan: input.catatan || null,
      fitur_aktif: [
        "AKADEMIK_DASAR",
        "JADWAL_ROSTER",
        "PRESENSI_QR_KBM",
        "PENILAIAN_FORMATIF_SUMATIF",
        "CBT_EXAM_PROCTOR",
        "RAPOR_MERDEKA_M18",
        "MULTI_USER_STAFF",
      ],
      diperbarui_oleh: actor.nama_lengkap,
      tanggal_pembaruan: now.toISOString(),
    };

    const isFullLicense = input.tipe_lisensi === "SEKOLAH";
    const subStatus = isFullLicense ? "ACTIVE" : "TRIAL_ACTIVE";

    await prisma.$transaction(async (tx) => {
      // 1. Update entitas Sekolah
      await tx.sekolah.update({
        where: { id: input.sekolah_id },
        data: {
          tipe_lisensi: input.tipe_lisensi,
          trial_berakhir_pada: isFullLicense ? null : berakhirPada,
          status_aktif: true,
        },
      });

      // 2. Ambil atau buat LanggananTenant
      const existingSub = await tx.langgananTenant.findFirst({
        where: { sekolah_id: input.sekolah_id },
        orderBy: { created_at: "desc" },
      });

      if (existingSub) {
        await tx.langgananTenant.update({
          where: { id: existingSub.id },
          data: {
            paket: input.paket,
            status: subStatus,
            mulai_pada: now,
            berakhir_pada: berakhirPada,
            entitlement_json: JSON.stringify(entitlementData),
            sumber_aktivasi: isFullLicense ? "MANUAL_INVOICE" : "TRIAL_PROVISIONING",
            updated_at: now,
          },
        });
      } else {
        await tx.langgananTenant.create({
          data: {
            id: generateUlid(),
            sekolah_id: input.sekolah_id,
            paket: input.paket,
            status: subStatus,
            mulai_pada: now,
            berakhir_pada: berakhirPada,
            entitlement_json: JSON.stringify(entitlementData),
            sumber_aktivasi: isFullLicense ? "MANUAL_INVOICE" : "TRIAL_PROVISIONING",
          },
        });
      }

      // 3. Catat Audit Log Transaksional
      await recordAuditEvent(
        {
          sekolah_id: input.sekolah_id,
          aktor_id: actor.id,
          aktor_role: actor.peran_dasar,
          aksi: "SCHOOL_LICENSE_UPDATED",
          tipe_sumber: "SEKOLAH",
          id_sumber: input.sekolah_id,
          payload_sebelum: {
            tipe_lisensi: sekolah.tipe_lisensi,
            trial_berakhir_pada: sekolah.trial_berakhir_pada,
          },
          payload_sesudah: {
            tipe_lisensi: input.tipe_lisensi,
            paket: input.paket,
            berakhir_pada: berakhirPada.toISOString(),
            kuota_siswa: kuotaSiswa,
            nomor_referensi: input.nomor_referensi,
          },
          ip_address: auditContext.ip_address,
          user_agent: auditContext.user_agent,
        },
        tx
      );
    });

    revalidatePath("/sekolah");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { sekolah_id: input.sekolah_id, tipe_lisensi: input.tipe_lisensi, berakhirPada },
      message: `Lisensi sekolah ${sekolah.nama} berhasil diperbarui menjadi ${input.tipe_lisensi} (${input.paket}) berlaku hingga ${berakhirPada.toLocaleDateString("id-ID")}.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}

// -----------------------------------------------------------------------------
// 7. TOGGLE STATUS OPERASIONAL SEKOLAH (SUPER_ADMIN ONLY)
// -----------------------------------------------------------------------------

export async function toggleSchoolActiveStatusAction(
  sekolahId: string,
  targetStatus: boolean,
  reason?: string
): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (actor.peran_dasar !== "SUPER_ADMIN") {
      return {
        success: false,
        error:
          "Akses ditolak: Hanya Super Admin SaaS yang dapat mengubah status operasional tenant.",
        code: "FORBIDDEN",
      };
    }

    const auditContext = await getAuditContext(actor);
    const sekolah = await prisma.sekolah.findUnique({
      where: { id: sekolahId },
    });

    if (!sekolah) {
      return {
        success: false,
        error: "Sekolah tidak ditemukan.",
        code: "NOT_FOUND",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.sekolah.update({
        where: { id: sekolahId },
        data: { status_aktif: targetStatus },
      });

      // Update langganan status jika nonaktif
      const sub = await tx.langgananTenant.findFirst({
        where: { sekolah_id: sekolahId },
        orderBy: { created_at: "desc" },
      });

      if (sub) {
        await tx.langgananTenant.update({
          where: { id: sub.id },
          data: { status: targetStatus ? "ACTIVE" : "SUSPENDED" },
        });
      }

      // Jika disuspend, bersihkan konteks aktif dari sesi pengguna sekolah ini
      if (!targetStatus) {
        await tx.sesiPengguna.updateMany({
          where: { sekolah_aktif_id: sekolahId },
          data: { sekolah_aktif_id: null },
        });
      }

      await recordAuditEvent(
        {
          sekolah_id: sekolahId,
          aktor_id: actor.id,
          aktor_role: actor.peran_dasar,
          aksi: targetStatus ? "TENANT_ACTIVATED" : "TENANT_SUSPENDED",
          tipe_sumber: "SEKOLAH",
          id_sumber: sekolahId,
          payload_sebelum: { status_aktif: sekolah.status_aktif },
          payload_sesudah: { status_aktif: targetStatus, reason: reason ?? null },
          ip_address: auditContext.ip_address,
          user_agent: auditContext.user_agent,
        },
        tx
      );
    });

    revalidatePath("/sekolah");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { sekolahId, status_aktif: targetStatus },
      message: `Status sekolah ${sekolah.nama} berhasil diubah menjadi ${targetStatus ? "Aktif" : "Nonaktif (Suspended)"}.`,
    };
  } catch (error) {
    return handleActionError(error);
  }
}
