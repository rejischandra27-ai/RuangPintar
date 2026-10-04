/**
 * Ruang Pintar — Server-Side Authorization Guards (M02)
 *
 * Sesuai FR-AUTHZ-001 s/d FR-AUTHZ-004 & ROADMAP-RULE-008:
 * Seluruh aksi sensitif diperiksa server-side.
 * UI hiding bukan authorization; server guard wajib memeriksa hak nyata pengguna.
 */

import { requireAuth, getCurrentUser } from "../auth/auth-guard";
import { AuthenticatedUser } from "../auth/auth-service";
import { prisma } from "../database/prisma";
import { accessControlEngine } from "./access-control";
import { staffCapabilityService } from "./staff-capability-service";
import { recordAuditEvent } from "../audit/audit-logger";
import { ActorContext, EvaluationContext, PermissionString, ResourceContext } from "./types";
import { requireTenantMutationEntitlement } from "../tenant/tenant-entitlement-service";

export class AuthorizationError extends Error {
  public readonly statusCode: number = 403;
  public readonly code: string = "FORBIDDEN";

  constructor(message: string = "Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Server guard untuk mewajibkan permission tertentu.
 * Jika tidak berhak, melempar AuthorizationError (403) dan mencatat audit denial.
 */
async function buildEvaluationContext(
  user: AuthenticatedUser,
  context?: EvaluationContext
): Promise<EvaluationContext> {
  let evaluationContext: EvaluationContext = context ? { ...context } : {};

  // 1. Load teacher active teaching assignments
  if (user.peran_dasar === "TEACHER" && !evaluationContext.teachingAssignments) {
    const guru = await prisma.guru.findFirst({
      where: {
        pengguna_id: user.id,
        ...(user.sekolah_id ? { sekolah_id: user.sekolah_id } : {}),
      },
      select: { id: true, sekolah_id: true },
    });

    if (guru) {
      const activeAssignments = await prisma.penugasanMengajar.findMany({
        where: {
          guru_id: guru.id,
          sekolah_id: guru.sekolah_id,
          status: "AKTIF",
        },
        select: {
          id: true,
          sekolah_id: true,
          rombel_id: true,
          mata_pelajaran_id: true,
          created_at: true,
          status: true,
        },
      });

      evaluationContext.teachingAssignments = activeAssignments.map((ta) => ({
        id: ta.id,
        teacher_id: user.id,
        sekolah_id: ta.sekolah_id,
        rombel_id: ta.rombel_id,
        subject_id: ta.mata_pelajaran_id,
        valid_from: ta.created_at,
        status: ta.status as any,
      }));

      // Homeroom assignment
      if (!evaluationContext.homeroomAssignments) {
        const activeHomerooms = await prisma.penugasanWaliKelas.findMany({
          where: {
            guru_id: guru.id,
            sekolah_id: guru.sekolah_id,
            status: "AKTIF",
          },
          select: {
            id: true,
            sekolah_id: true,
            rombel_id: true,
            created_at: true,
            status: true,
          },
        });

        evaluationContext.homeroomAssignments = activeHomerooms.map((ha) => ({
          id: ha.id,
          teacher_id: user.id,
          sekolah_id: ha.sekolah_id,
          rombel_id: ha.rombel_id,
          valid_from: ha.created_at,
          status: ha.status as any,
        }));
      }
    }
  }

  // 2. Load active position assignments (Kepala Sekolah, Wakasek, Kaprog, etc.)
  if (!evaluationContext.positionAssignments) {
    const activePositions = await prisma.penugasanJabatan.findMany({
      where: {
        personil_id: user.id,
        ...(user.sekolah_id ? { sekolah_id: user.sekolah_id } : {}),
        status: "AKTIF",
      },
      include: {
        jabatan: true,
      },
    });

    if (activePositions.length > 0) {
      evaluationContext.positionAssignments = activePositions.map((pos) => ({
        id: pos.id,
        personil_id: pos.personil_id,
        sekolah_id: pos.sekolah_id,
        position_code: pos.jabatan.kode_jabatan as any,
        unit_id: pos.jabatan.unit_id,
        program_id: null,
        valid_from: pos.berlaku_mulai,
        valid_until: pos.berlaku_sampai,
        status: pos.status as any,
      }));
    }
  }

  return evaluationContext;
}

/**
 * Server guard untuk mewajibkan permission tertentu.
 * Jika tidak berhak, melempar AuthorizationError (403) dan mencatat audit denial.
 */
export async function requirePermission(
  permission: PermissionString,
  resource?: ResourceContext,
  context?: EvaluationContext
): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (user.peran_dasar !== "SUPER_ADMIN" && !user.sekolah_id) {
    throw new AuthorizationError(
      "Akses tenant memerlukan keanggotaan aktif dan sekolah aktif yang tervalidasi."
    );
  }

  // Cross-tenant boundary check:
  // If user has a tenant context and resource explicitly provides a different sekolah_id, immediately reject.
  if (user.sekolah_id && resource?.sekolah_id && resource.sekolah_id !== user.sekolah_id) {
    await recordAuditEvent({
      sekolah_id: user.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      tipe_sumber: "AUTHORIZATION_GUARD",
      id_sumber: user.id,
      aksi: "AUTHZ_CROSS_TENANT_DENIED",
      payload_sebelum: {
        permission,
        actorSekolahId: user.sekolah_id,
        resourceSekolahId: resource.sekolah_id,
      },
    });
    throw new AuthorizationError(
      "Akses ditolak: Akses terhadap resource lintas sekolah tidak diizinkan."
    );
  }

  const effectiveResource: ResourceContext = {
    ...resource,
    sekolah_id:
      user.peran_dasar === "SUPER_ADMIN"
        ? (resource?.sekolah_id ?? user.sekolah_id)
        : user.sekolah_id,
  };

  let capabilities = undefined;
  if (user.peran_dasar === "SCHOOL_STAFF") {
    capabilities = await staffCapabilityService.getUserCapabilities(user.id);
  }

  const evaluationContext = await buildEvaluationContext(user, context);

  const actor: ActorContext = {
    id: user.id,
    username: user.username,
    peran_dasar: user.peran_dasar as any,
    status_akun: user.status_akun,
    sekolah_id: user.sekolah_id,
    capabilities,
    is_owner: user.is_owner_tenant,
  };

  const decision = accessControlEngine.evaluate({
    actor,
    permission,
    resource: effectiveResource,
    context: evaluationContext,
  });

  if (!decision.allowed) {
    // Log sensitive denial event
    await recordAuditEvent({
      sekolah_id: user.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      tipe_sumber: "AUTHORIZATION_GUARD",
      id_sumber: user.id,
      aksi: "AUTHZ_ACCESS_DENIED",
      payload_sebelum: {
        permission,
        resource: effectiveResource,
        reason: decision.reason,
      },
    });

    throw new AuthorizationError(`Akses ditolak: ${decision.reason || "Izin tidak mencukupi."}`);
  }

  if (user.peran_dasar !== "SUPER_ADMIN" && user.sekolah_id) {
    await requireTenantMutationEntitlement(user.sekolah_id, permission);
  }

  return user;
}

/**
 * Non-throwing server guard check untuk evaluasi kondisional tampilan/fitur di server.
 */
export async function checkPermission(
  permission: PermissionString,
  resource?: ResourceContext,
  context?: EvaluationContext
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) {
    return false;
  }

  if (user.peran_dasar !== "SUPER_ADMIN" && !user.sekolah_id) {
    return false;
  }

  if (user.sekolah_id && resource?.sekolah_id && resource.sekolah_id !== user.sekolah_id) {
    return false;
  }

  const effectiveResource: ResourceContext = {
    ...resource,
    sekolah_id:
      user.peran_dasar === "SUPER_ADMIN"
        ? (resource?.sekolah_id ?? user.sekolah_id)
        : user.sekolah_id,
  };

  let capabilities = undefined;
  if (user.peran_dasar === "SCHOOL_STAFF") {
    capabilities = await staffCapabilityService.getUserCapabilities(user.id);
  }

  const evaluationContext = await buildEvaluationContext(user, context);

  const actor: ActorContext = {
    id: user.id,
    username: user.username,
    peran_dasar: user.peran_dasar as any,
    status_akun: user.status_akun,
    sekolah_id: user.sekolah_id,
    capabilities,
    is_owner: user.is_owner_tenant,
  };

  const decision = accessControlEngine.evaluate({
    actor,
    permission,
    resource: effectiveResource,
    context: evaluationContext,
  });

  return decision.allowed;
}
