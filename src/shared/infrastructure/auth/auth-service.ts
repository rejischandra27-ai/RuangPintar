import { Pengguna, SesiPengguna } from "@prisma/client";
import { prisma } from "../database/prisma";
import { generateUlid } from "../../lib/ulid";
import { verifyPassword } from "../../lib/password";
import {
  generateSessionToken,
  hashSessionToken,
  SESSION_DURATION_STANDARD_MS,
  SESSION_DURATION_REMEMBER_MS,
} from "../../lib/session";
import { checkLoginRateLimit, recordLoginAttempt } from "./rate-limiter";
import { recordAuditEvent } from "../audit/audit-logger";
import { resolveTenantContext } from "../tenant/tenant-context";
import { tenantMembershipService } from "../tenant/tenant-membership-service";

export interface LoginCredentialsInput {
  username: string;
  password: string;
  rememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthenticatedUser {
  id: string;
  sekolah_id: string | null;
  username: string;
  email: string | null;
  nama_lengkap: string;
  peran_dasar: string;
  status_akun: string;
  harus_ganti_password: boolean;
  foto_url?: string | null;
  avatar_id?: string | null;
  keanggotaan_id?: string | null;
  is_owner_tenant?: boolean;
}

export interface LoginResult {
  success: boolean;
  user?: AuthenticatedUser;
  sessionToken?: string;
  error?: string;
  lockoutSeconds?: number;
}

export interface ValidatedSession {
  session: SesiPengguna;
  user: AuthenticatedUser;
}

export class AuthService {
  async createSessionForUser(
    userId: string,
    input: { rememberMe?: boolean; ipAddress?: string; userAgent?: string; auditAction?: string }
  ): Promise<LoginResult> {
    const user = await prisma.pengguna.findUnique({ where: { id: userId } });
    if (!user || user.status_akun !== "AKTIF") {
      return { success: false, error: "Akun Google tidak dapat mengakses Ruang Pintar." };
    }

    const activeMemberships = await prisma.keanggotaanSekolah.findMany({
      where: { pengguna_id: user.id, status_keanggotaan: "ACTIVE" },
      select: { sekolah_id: true },
      take: 2,
    });
    const sekolahAktifId = activeMemberships.length === 1 ? activeMemberships[0].sekolah_id : null;
    const sessionToken = generateSessionToken();
    const durationMs = input.rememberMe
      ? SESSION_DURATION_REMEMBER_MS
      : SESSION_DURATION_STANDARD_MS;
    const expiresAt = new Date(Date.now() + durationMs);

    await prisma.$transaction([
      prisma.sesiPengguna.create({
        data: {
          id: generateUlid(),
          pengguna_id: user.id,
          sekolah_aktif_id: sekolahAktifId,
          token_hash: hashSessionToken(sessionToken),
          ip_address: input.ipAddress ?? "127.0.0.1",
          user_agent: input.userAgent ?? null,
          berlaku_sampai: expiresAt,
        },
      }),
      prisma.pengguna.update({
        where: { id: user.id },
        data: { terakhir_login_pada: new Date(), percobaan_login_gagal: 0 },
      }),
    ]);

    await recordAuditEvent({
      sekolah_id: sekolahAktifId,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: input.auditAction ?? "AUTH_LOGIN_SUCCESS",
      tipe_sumber: "PENGGUNA",
      id_sumber: user.id,
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
    });

    return {
      success: true,
      sessionToken,
      user: {
        id: user.id,
        sekolah_id: sekolahAktifId,
        username: user.username,
        email: user.email,
        nama_lengkap: user.nama_lengkap,
        peran_dasar: user.peran_dasar,
        status_akun: user.status_akun,
        harus_ganti_password: user.harus_ganti_password,
        foto_url: user.foto_url,
        avatar_id: user.avatar_id,
      },
    };
  }

  /**
   * Authenticate user credentials and create a server-authoritative session upon success.
   */
  async loginWithCredentials(input: LoginCredentialsInput): Promise<LoginResult> {
    const username = input.username.toLowerCase().trim();
    const ip = input.ipAddress ?? "127.0.0.1";

    // 1. Check Rate Limit
    const rateLimit = await checkLoginRateLimit(username, ip);
    if (!rateLimit.allowed) {
      await recordAuditEvent({
        aktor_id: "ANONYMOUS",
        aktor_role: "GUEST",
        aksi: "AUTH_LOGIN_BLOCKED_RATE_LIMIT",
        tipe_sumber: "PENGGUNA",
        id_sumber: username,
        ip_address: ip,
        user_agent: input.userAgent,
      });

      return {
        success: false,
        error: rateLimit.message ?? "Terlalu banyak percobaan login gagal.",
        lockoutSeconds: rateLimit.lockoutSeconds,
      };
    }

    // 2. Lookup User by username OR email
    const user = await prisma.pengguna.findFirst({
      where: {
        OR: [{ username }, { email: username }],
      },
    });

    if (!user) {
      await recordLoginAttempt(username, ip, false, "USER_NOT_FOUND");
      await recordAuditEvent({
        aktor_id: "ANONYMOUS",
        aktor_role: "GUEST",
        aksi: "AUTH_LOGIN_FAILED",
        tipe_sumber: "PENGGUNA",
        id_sumber: username,
        ip_address: ip,
        user_agent: input.userAgent,
      });

      return {
        success: false,
        error: "Username atau kata sandi tidak valid.",
      };
    }

    // 3. Check Account Status
    if (user.status_akun !== "AKTIF") {
      await recordLoginAttempt(username, ip, false, `ACCOUNT_STATUS_${user.status_akun}`);
      await recordAuditEvent({
        sekolah_id: user.sekolah_id,
        aktor_id: user.id,
        aktor_role: user.peran_dasar,
        aksi: "AUTH_LOGIN_REJECTED_STATUS",
        tipe_sumber: "PENGGUNA",
        id_sumber: user.id,
        payload_sebelum: { status_akun: user.status_akun },
        ip_address: ip,
        user_agent: input.userAgent,
      });

      let statusMessage = "Akun tidak dapat diakses.";
      if (user.status_akun === "NONAKTIF")
        statusMessage = "Akun Anda berstatus nonaktif. Hubungi administrator sekolah.";
      else if (user.status_akun === "TERKUNCI")
        statusMessage = "Akun Anda terkunci demi keamanan. Hubungi administrator.";
      else if (user.status_akun === "DITANGGUHKAN")
        statusMessage = "Akun Anda sedang ditangguhkan.";

      return {
        success: false,
        error: statusMessage,
      };
    }

    // 4. Verify Password
    const passwordMatch = await verifyPassword(input.password, user.password_hash);
    if (!passwordMatch) {
      const failedCount = user.percobaan_login_gagal + 1;
      const shouldLock = failedCount >= 5;

      await prisma.pengguna.update({
        where: { id: user.id },
        data: {
          percobaan_login_gagal: failedCount,
          ...(shouldLock ? { status_akun: "TERKUNCI" } : {}),
        },
      });

      await recordLoginAttempt(username, ip, false, "INVALID_PASSWORD");
      await recordAuditEvent({
        sekolah_id: user.sekolah_id,
        aktor_id: user.id,
        aktor_role: user.peran_dasar,
        aksi: shouldLock ? "AUTH_ACCOUNT_LOCKED" : "AUTH_LOGIN_FAILED",
        tipe_sumber: "PENGGUNA",
        id_sumber: user.id,
        ip_address: ip,
        user_agent: input.userAgent,
      });

      return {
        success: false,
        error: shouldLock
          ? "Akun terkunci karena terlalu banyak percobaan salah. Hubungi administrator."
          : "Username atau kata sandi tidak valid.",
      };
    }

    // 5. Select a tenant only when the account has exactly one active membership.
    // Users with many tenants must choose explicitly through the tenant switch flow.
    const activeMemberships = await prisma.keanggotaanSekolah.findMany({
      where: { pengguna_id: user.id, status_keanggotaan: "ACTIVE" },
      select: { sekolah_id: true },
      take: 2,
    });
    const sekolahAktifId = activeMemberships.length === 1 ? activeMemberships[0].sekolah_id : null;

    // 6. Successful Login: Create Session
    const sessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const durationMs = input.rememberMe
      ? SESSION_DURATION_REMEMBER_MS
      : SESSION_DURATION_STANDARD_MS;
    const expiresAt = new Date(Date.now() + durationMs);

    await prisma.$transaction([
      prisma.sesiPengguna.create({
        data: {
          id: generateUlid(),
          pengguna_id: user.id,
          sekolah_aktif_id: sekolahAktifId,
          token_hash: tokenHash,
          ip_address: ip,
          user_agent: input.userAgent ?? null,
          berlaku_sampai: expiresAt,
        },
      }),
      prisma.pengguna.update({
        where: { id: user.id },
        data: {
          terakhir_login_pada: new Date(),
          percobaan_login_gagal: 0,
        },
      }),
    ]);

    await recordLoginAttempt(username, ip, true);
    await recordAuditEvent({
      sekolah_id: sekolahAktifId,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "AUTH_LOGIN_SUCCESS",
      tipe_sumber: "PENGGUNA",
      id_sumber: user.id,
      ip_address: ip,
      user_agent: input.userAgent,
    });

    return {
      success: true,
      sessionToken,
      user: {
        id: user.id,
        sekolah_id: sekolahAktifId,
        username: user.username,
        email: user.email,
        nama_lengkap: user.nama_lengkap,
        peran_dasar: user.peran_dasar,
        status_akun: user.status_akun,
        harus_ganti_password: user.harus_ganti_password,
        foto_url: user.foto_url,
      },
    };
  }

  /**
   * Validate session token, verify expiry, and return authenticated identity.
   */
  async validateSession(sessionToken: string): Promise<ValidatedSession | null> {
    if (!sessionToken || typeof sessionToken !== "string") return null;

    const tokenHash = hashSessionToken(sessionToken);
    const now = new Date();

    const session = await prisma.sesiPengguna.findUnique({
      where: { token_hash: tokenHash },
      include: { pengguna: true },
    });

    if (!session || session.dicabut || session.berlaku_sampai < now) {
      return null;
    }

    if (session.pengguna.status_akun !== "AKTIF") {
      return null;
    }

    // Sliding activity tracking (if active more than 15 mins ago)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (session.terakhir_aktif_pada < fifteenMinutesAgo) {
      await prisma.sesiPengguna.update({
        where: { id: session.id },
        data: { terakhir_aktif_pada: now },
      });
    }

    // The session tenant is accepted only if its membership remains ACTIVE.
    // Pengguna.sekolah_id is legacy compatibility data, not an authoritative
    // tenant context for SaaS requests.
    const tenantContext = await resolveTenantContext(session.pengguna.id, session.sekolah_aktif_id);
    const effectiveSekolahId = tenantContext?.sekolahId ?? null;
    const effectiveRole = tenantContext?.peranDasar ?? session.pengguna.peran_dasar;

    return {
      session,
      user: {
        id: session.pengguna.id,
        sekolah_id: effectiveSekolahId,
        username: session.pengguna.username,
        email: session.pengguna.email,
        nama_lengkap: session.pengguna.nama_lengkap,
        peran_dasar: effectiveRole,
        status_akun: session.pengguna.status_akun,
        harus_ganti_password: session.pengguna.harus_ganti_password,
        foto_url: session.pengguna.foto_url,
        avatar_id: session.pengguna.avatar_id,
        keanggotaan_id: tenantContext?.membershipId ?? null,
        is_owner_tenant: tenantContext?.isOwner ?? false,
      },
    };
  }

  /**
   * Revoke active session on logout.
   */
  async revokeSession(sessionToken: string, reason: string = "USER_LOGOUT"): Promise<void> {
    if (!sessionToken) return;

    const tokenHash = hashSessionToken(sessionToken);

    const session = await prisma.sesiPengguna.findUnique({
      where: { token_hash: tokenHash },
      include: { pengguna: true },
    });

    if (!session) return;

    await prisma.sesiPengguna.update({
      where: { id: session.id },
      data: {
        dicabut: true,
        alasan_cabut: reason,
      },
    });

    await recordAuditEvent({
      sekolah_id: session.sekolah_aktif_id,
      aktor_id: session.pengguna.id,
      aktor_role: session.pengguna.peran_dasar,
      aksi: "AUTH_LOGOUT",
      tipe_sumber: "PENGGUNA",
      id_sumber: session.pengguna.id,
    });
  }

  /** Switches tenant only for the authenticated browser session. If sekolahId is null, clears active tenant. */
  async switchActiveTenant(sessionToken: string, sekolahId: string | null): Promise<void> {
    const tokenHash = hashSessionToken(sessionToken);
    const session = await prisma.sesiPengguna.findUnique({
      where: { token_hash: tokenHash },
      include: { pengguna: true },
    });

    if (!session || session.dicabut || session.berlaku_sampai < new Date()) {
      throw new Error("Sesi tidak valid atau telah berakhir.");
    }

    await tenantMembershipService.setActiveTenant({
      sessionId: session.id,
      penggunaId: session.pengguna_id,
      sekolahId,
      actorRole: session.pengguna.peran_dasar,
    });
  }

  /**
   * Revoke all sessions for a user (e.g. on password change or security revocation).
   */
  async revokeAllUserSessions(
    userId: string,
    reason: string = "ALL_SESSIONS_REVOKED"
  ): Promise<void> {
    await prisma.sesiPengguna.updateMany({
      where: {
        pengguna_id: userId,
        dicabut: false,
      },
      data: {
        dicabut: true,
        alasan_cabut: reason,
      },
    });
  }
}

export const authService = new AuthService();
