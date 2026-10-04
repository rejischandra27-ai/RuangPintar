import { prisma } from "@/shared/infrastructure/database/prisma";

export type TenantEntitlementStatus =
  "TRIAL_ACTIVE" | "ACTIVE" | "GRACE_PERIOD" | "PAST_DUE" | "READ_ONLY" | "SUSPENDED" | "CANCELLED";

export interface TenantEntitlement {
  sekolahId: string;
  paket: string;
  status: TenantEntitlementStatus;
  berakhirPada: Date | null;
  allowsMutation: boolean;
}

export class TenantReadOnlyError extends Error {
  constructor() {
    super("Langganan sekolah tidak aktif. Tenant saat ini hanya dapat diakses dalam mode baca.");
    this.name = "TenantReadOnlyError";
  }
}

/**
 * Single entitlement resolver. It intentionally derives expiry at read time so
 * an expired trial becomes read-only even if no scheduler has run yet.
 */
export async function getTenantEntitlement(sekolahId: string): Promise<TenantEntitlement> {
  const subscription = await prisma.langgananTenant.findFirst({
    where: { sekolah_id: sekolahId },
    orderBy: [{ mulai_pada: "desc" }, { created_at: "desc" }],
  });

  if (!subscription) {
    return {
      sekolahId,
      paket: "NONE",
      status: "READ_ONLY",
      berakhirPada: null,
      allowsMutation: false,
    };
  }

  const now = new Date();
  const expired = subscription.berakhir_pada !== null && subscription.berakhir_pada <= now;
  const isGrace = subscription.status === "GRACE_PERIOD" || subscription.status === "PAST_DUE";
  const isActive =
    subscription.status === "TRIAL_ACTIVE" || subscription.status === "ACTIVE" || isGrace;
  const status: TenantEntitlementStatus =
    expired && isActive ? "READ_ONLY" : (subscription.status as TenantEntitlementStatus);

  return {
    sekolahId,
    paket: subscription.paket,
    status,
    berakhirPada: subscription.berakhir_pada,
    allowsMutation: (status === "TRIAL_ACTIVE" || status === "ACTIVE") && !expired,
  };
}

/** Permission naming is the stable foundation boundary for read-only mode. */
export function isMutationPermission(permission: string): boolean {
  const action = permission.split(".").at(-1);
  if (!action) return false;

  return new Set([
    "archive",
    "approve",
    "assign",
    "cancel",
    "correct",
    "create",
    "delete",
    "finalize",
    "import",
    "manage",
    "publish",
    "record",
    "reject",
    "retry",
    "revoke",
    "save",
    "start",
    "submit",
    "suspend",
    "transfer",
    "update",
  ]).has(action);
}

export async function requireTenantMutationEntitlement(
  sekolahId: string,
  permission: string
): Promise<void> {
  if (!isMutationPermission(permission)) return;

  const entitlement = await getTenantEntitlement(sekolahId);
  if (!entitlement.allowsMutation) {
    throw new TenantReadOnlyError();
  }
}
