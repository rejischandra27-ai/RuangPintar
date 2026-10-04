"use server";

/**
 * Ruang Pintar — Self-Service Tenant Onboarding & Rombel Join Codes Server Actions (Stage 15)
 *
 * Mengelola interaksi kode gabung rombel untuk guru/wali kelas serta alur pendaftaran siswa mandiri.
 */

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { rombelJoinService } from "@/modules/student/application/rombel-join-service";
import {
  RombelJoinCodeDTO,
  RombelJoinPreviewDTO,
  JoinRombelResultDTO,
  JoinCodeNotFoundError,
  JoinCodeInactiveError,
  JoinCodeExpiredError,
  CrossTenantJoinError,
  DuplicateJoinError,
  RombelCapacityFullError,
  StudentProfileNotFoundError,
} from "@/modules/student/domain/rombel-join-types";

export interface RombelActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Mengambil atau menginisialisasi kode gabung untuk suatu rombel (Cockpit Guru / Wali Kelas).
 */
export async function getRombelJoinCodeAction(
  rombelId: string
): Promise<RombelActionResult<RombelJoinCodeDTO>> {
  try {
    const actor = await requireAuth();

    // Pastikan peran memiliki hak akses edukator / admin
    const allowedRoles = ["TEACHER", "SCHOOL_STAFF", "SUPER_ADMIN"];
    if (!allowedRoles.includes(actor.peran_dasar)) {
      return {
        success: false,
        message:
          "Akses ditolak. Hanya guru, staf, atau administrator yang dapat mengakses kode gabung.",
      };
    }

    const rombel = await prisma.rombel.findUnique({
      where: { id: rombelId },
      select: { id: true, sekolah_id: true, nama: true },
    });

    if (!rombel) {
      return { success: false, message: "Rombel tidak ditemukan." };
    }

    // Tenant boundary check
    if (actor.peran_dasar !== "SUPER_ADMIN" && rombel.sekolah_id !== actor.sekolah_id) {
      return {
        success: false,
        message: "Akses ditolak. Rombel berada di institusi sekolah yang berbeda.",
      };
    }

    const data = await rombelJoinService.getOrCreateJoinCode(rombel.id, rombel.sekolah_id);
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil kode gabung rombel.";
    return { success: false, message };
  }
}

/**
 * Melakukan regenerasi kode gabung rombel.
 */
export async function regenerateRombelJoinCodeAction(
  rombelId: string
): Promise<RombelActionResult<RombelJoinCodeDTO>> {
  try {
    const actor = await requireAuth();

    const allowedRoles = ["TEACHER", "SCHOOL_STAFF", "SUPER_ADMIN"];
    if (!allowedRoles.includes(actor.peran_dasar)) {
      return {
        success: false,
        message: "Akses ditolak. Anda tidak memiliki izin untuk meregenerasi kode gabung.",
      };
    }

    const rombel = await prisma.rombel.findUnique({
      where: { id: rombelId },
      select: { id: true, sekolah_id: true },
    });

    if (!rombel) {
      return { success: false, message: "Rombel tidak ditemukan." };
    }

    if (actor.peran_dasar !== "SUPER_ADMIN" && rombel.sekolah_id !== actor.sekolah_id) {
      return { success: false, message: "Akses ditolak. Rombel berada di institusi yang berbeda." };
    }

    const updated = await rombelJoinService.regenerateJoinCode(
      rombel.id,
      rombel.sekolah_id,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/kelas");
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/classes/${rombelId}`);

    return {
      success: true,
      message: `Kode gabung berhasil diperbarui menjadi ${updated.code}.`,
      data: updated,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal meregenerasi kode gabung rombel.";
    return { success: false, message };
  }
}

/**
 * Mengaktifkan atau menonaktifkan kode gabung rombel.
 */
export async function toggleRombelJoinCodeAction(
  rombelId: string,
  isActive: boolean
): Promise<RombelActionResult<RombelJoinCodeDTO>> {
  try {
    const actor = await requireAuth();

    const allowedRoles = ["TEACHER", "SCHOOL_STAFF", "SUPER_ADMIN"];
    if (!allowedRoles.includes(actor.peran_dasar)) {
      return {
        success: false,
        message: "Akses ditolak. Anda tidak memiliki izin untuk mengubah status kode gabung.",
      };
    }

    const rombel = await prisma.rombel.findUnique({
      where: { id: rombelId },
      select: { id: true, sekolah_id: true },
    });

    if (!rombel) {
      return { success: false, message: "Rombel tidak ditemukan." };
    }

    if (actor.peran_dasar !== "SUPER_ADMIN" && rombel.sekolah_id !== actor.sekolah_id) {
      return { success: false, message: "Akses ditolak. Rombel berada di institusi yang berbeda." };
    }

    const updated = await rombelJoinService.toggleJoinCodeActive(
      rombel.id,
      rombel.sekolah_id,
      isActive,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/kelas");
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/classes/${rombelId}`);

    return {
      success: true,
      message: isActive
        ? "Kode gabung rombel berhasil diaktifkan."
        : "Kode gabung rombel berhasil dinonaktifkan.",
      data: updated,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal mengubah status kode gabung rombel.";
    return { success: false, message };
  }
}

/**
 * Pratinjau informasi rombel dari kode gabung (digunakan pada alur join sebelum konfirmasi).
 */
export async function previewRombelJoinCodeAction(
  code: string
): Promise<RombelActionResult<RombelJoinPreviewDTO>> {
  try {
    const currentUser = await getCurrentUser();
    const data = await rombelJoinService.previewJoinCode(code, currentUser?.sekolah_id);
    return { success: true, data };
  } catch (error: unknown) {
    if (
      error instanceof JoinCodeNotFoundError ||
      error instanceof JoinCodeInactiveError ||
      error instanceof JoinCodeExpiredError ||
      error instanceof CrossTenantJoinError ||
      error instanceof RombelCapacityFullError
    ) {
      return { success: false, message: error.message };
    }
    const message = error instanceof Error ? error.message : "Gagal memeriksa kode gabung.";
    return { success: false, message };
  }
}

/**
 * Siswa bergabung ke rombel menggunakan kode secara mandiri.
 */
export async function joinRombelWithCodeAction(
  code: string
): Promise<RombelActionResult<JoinRombelResultDTO>> {
  try {
    const user = await requireAuth();

    if (user.peran_dasar !== "STUDENT" && user.peran_dasar !== "SUPER_ADMIN") {
      return {
        success: false,
        message: "Hanya akun siswa yang dapat bergabung ke dalam rombel secara mandiri.",
      };
    }

    const result = await rombelJoinService.joinRombelWithCode(code, user.id);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/student");
    revalidatePath("/portal/student");
    revalidatePath("/join");

    return {
      success: true,
      message: result.message,
      data: result,
    };
  } catch (error: unknown) {
    if (
      error instanceof JoinCodeNotFoundError ||
      error instanceof JoinCodeInactiveError ||
      error instanceof JoinCodeExpiredError ||
      error instanceof CrossTenantJoinError ||
      error instanceof DuplicateJoinError ||
      error instanceof RombelCapacityFullError ||
      error instanceof StudentProfileNotFoundError
    ) {
      return { success: false, message: error.message };
    }
    const message = error instanceof Error ? error.message : "Gagal bergabung ke rombel.";
    return { success: false, message };
  }
}
