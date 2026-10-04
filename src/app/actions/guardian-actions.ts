"use server";

/**
 * Ruang Pintar — Guardian Server Actions (Phase 16 / M15)
 * Server Actions untuk mutasi konteks anak dan pengajuan permohonan wali.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { GuardianService } from "@/modules/guardian/application/guardian-service";
import { LocalStorageAdapter } from "@/shared/infrastructure/storage/local-storage-adapter";
import { getSessionCookieOptions } from "@/shared/lib/session";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  StudentClaimVerificationInput,
  ConfirmStudentClaimInput,
  StudentClaimPreviewDTO,
  StudentClaimResultDTO,
} from "@/modules/guardian/domain/guardian-types";
import {
  StudentNotFoundError,
  StudentVerificationMismatchError,
  DuplicateGuardianClaimError,
  CrossTenantClaimError,
} from "@/modules/guardian/domain/guardian-errors";

export interface GuardianActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

const guardianService = new GuardianService();
const ACTIVE_CHILD_COOKIE_KEY = "rp_active_child_id";

/**
 * Server Action: Mengganti konteks anak aktif terpilih
 */
export async function switchActiveChildAction(studentId: string): Promise<GuardianActionResult> {
  try {
    const user = await requireAuth();
    if (user.peran_dasar !== "GUARDIAN") {
      return { success: false, message: "Akses hanya untuk wali murid." };
    }

    await guardianService.verifyGuardianChildAccess(user, studentId);

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_CHILD_COOKIE_KEY, studentId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 hari
    });

    revalidatePath("/dashboard");
    revalidatePath("/presensi-anak");
    revalidatePath("/nilai-anak");

    return {
      success: true,
      message: "Berhasil mengganti konteks anak terpilih.",
      data: { studentId },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengganti konteks anak.",
    };
  }
}

/**
 * Server Action: Mengajukan permohonan izin sakit atau dispensasi kegiatan oleh orang tua
 */
export async function submitPengajuanWaliAction(
  _prevState: unknown,
  formData: FormData
): Promise<GuardianActionResult> {
  try {
    const user = await requireAuth();
    if (user.peran_dasar !== "GUARDIAN") {
      return { success: false, message: "Akses hanya untuk wali murid." };
    }

    const siswaId = formData.get("siswa_id") as string;
    const tipe = formData.get("tipe") as string;
    const judul = formData.get("judul") as string;
    const deskripsi = formData.get("deskripsi") as string;
    const tanggalMulai = (formData.get("tanggal_mulai") as string) || null;
    const tanggalSelesai = (formData.get("tanggal_selesai") as string) || null;

    let lampiranUrl: string | null = null;
    const file = formData.get("file") as File | null;
    if (
      file &&
      typeof file === "object" &&
      file.size > 0 &&
      typeof file.arrayBuffer === "function"
    ) {
      if (file.size > 10 * 1024 * 1024) {
        return {
          success: false,
          message: "Ukuran berkas melebihi batas maksimal 10 MB.",
        };
      }

      const storage = new LocalStorageAdapter();
      const buffer = Buffer.from(await file.arrayBuffer());
      const metadata = await storage.saveFile({
        sekolah_id: user.sekolah_id,
        nama_file_asli: file.name,
        mime_type: file.type || "application/octet-stream",
        content: buffer,
      });

      lampiranUrl = `/api/storage/${metadata.storage_key}`;
    }

    const pengajuan = await guardianService.submitPengajuanIzin(user, {
      siswa_id: siswaId,
      tipe: tipe as any,
      judul,
      deskripsi,
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      lampiran_url: lampiranUrl,
    });

    revalidatePath("/dashboard");
    revalidatePath("/presensi-anak");
    revalidatePath("/nilai-anak");

    return {
      success: true,
      message: "Permohonan izin / keterangan berhasil diajukan ke pihak sekolah.",
      data: pengajuan,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Terjadi kesalahan saat mengajukan permohonan.",
    };
  }
}

/**
 * Helper untuk membaca ID anak terpilih dari cookie (Server Side)
 */
export async function getActiveChildIdFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_CHILD_COOKIE_KEY)?.value;
}

/**
 * Server Action: Memverifikasi identitas siswa dan menampilkan pratinjau aman (Fitur 01, 02, 03)
 */
export async function previewStudentClaimAction(
  input: StudentClaimVerificationInput
): Promise<GuardianActionResult<StudentClaimPreviewDTO>> {
  try {
    const user = await requireAuth();
    if (user.peran_dasar !== "GUARDIAN") {
      return {
        success: false,
        message: "Akses ditolak. Fitur klaim siswa hanya diizinkan untuk peran Wali Murid.",
      };
    }

    const preview = await guardianService.previewStudentClaim(user, input);
    return {
      success: true,
      message: "Data siswa berhasil diverifikasi.",
      data: preview,
    };
  } catch (error) {
    let message = "Gagal memverifikasi identitas siswa.";
    if (
      error instanceof StudentNotFoundError ||
      error instanceof StudentVerificationMismatchError ||
      error instanceof DuplicateGuardianClaimError ||
      error instanceof CrossTenantClaimError
    ) {
      message = error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    return { success: false, message };
  }
}

/**
 * Server Action: Mengonfirmasi klaim siswa dan menghubungkan relasi resmi (Fitur 01, 04, 05)
 */
export async function confirmStudentClaimAction(
  input: ConfirmStudentClaimInput
): Promise<GuardianActionResult<StudentClaimResultDTO>> {
  try {
    const user = await requireAuth();
    if (user.peran_dasar !== "GUARDIAN") {
      return {
        success: false,
        message: "Akses ditolak. Fitur klaim siswa hanya diizinkan untuk peran Wali Murid.",
      };
    }

    const result = await guardianService.confirmStudentClaim(user, input);

    // Otomatis set anak yang baru diklaim sebagai anak aktif di cookie
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_CHILD_COOKIE_KEY, result.siswa_id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    revalidatePath("/dashboard");
    revalidatePath("/presensi-anak");
    revalidatePath("/nilai-anak");
    revalidatePath("/guardian/klaim-anak");

    return {
      success: true,
      message: result.pesan,
      data: result,
    };
  } catch (error) {
    let message = "Gagal mengonfirmasi klaim siswa.";
    if (
      error instanceof StudentNotFoundError ||
      error instanceof DuplicateGuardianClaimError ||
      error instanceof CrossTenantClaimError
    ) {
      message = error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    return { success: false, message };
  }
}

/**
 * Server Action: Pendaftaran akun Wali Murid secara mandiri (Self-Registration)
 */
export async function registerGuardianAction(
  formData: FormData
): Promise<GuardianActionResult<{ userId: string; redirectUrl: string }>> {
  try {
    const rawData = {
      nama_lengkap: formData.get("nama_lengkap")?.toString() ?? "",
      username: formData.get("username")?.toString()?.trim() || "",
      email: formData.get("email")?.toString() || undefined,
      no_telepon: formData.get("no_telepon")?.toString() || undefined,
      password: formData.get("password")?.toString() ?? "",
      sekolah_id: formData.get("sekolah_id")?.toString() ?? "",
    };

    const result = await guardianService.registerGuardian(rawData);

    // Set cookie sesi langsung agar wali otomatis login
    const cookieOptions = getSessionCookieOptions(result.rawSessionToken, true);
    const cookieStore = await cookies();
    cookieStore.set(cookieOptions.name, cookieOptions.value, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      expires: cookieOptions.expires,
      maxAge: cookieOptions.maxAge,
    });

    return {
      success: true,
      message: "Pendaftaran akun wali murid berhasil.",
      data: {
        userId: result.user.id,
        redirectUrl: "/dashboard",
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mendaftarkan akun wali murid.",
    };
  }
}

/**
 * Server Action: Mengambil daftar sekolah aktif untuk formulir registrasi
 */
export async function getAvailableSchoolsAction(): Promise<
  Array<{ id: string; nama: string; npsn: string | null; jenjang: string | null }>
> {
  try {
    return await prisma.sekolah.findMany({
      where: { status_aktif: true },
      select: {
        id: true,
        nama: true,
        npsn: true,
        jenjang: true,
      },
      orderBy: { nama: "asc" },
    });
  } catch {
    return [];
  }
}

/**
 * Server Action: Mengambil daftar rombel pada sekolah aktif untuk formulir verifikasi
 */
export async function getSchoolRombelsAction(): Promise<
  Array<{ id: string; nama: string; tingkat: string }>
> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return [];

    const rombels = await prisma.rombel.findMany({
      where: {
        sekolah_id: user.sekolah_id,
        status: "AKTIF",
      },
      include: {
        tingkat: true,
      },
      orderBy: {
        nama: "asc",
      },
    });

    return rombels.map((r) => ({
      id: r.id,
      nama: r.nama,
      tingkat: r.tingkat?.nama || "Kelas",
    }));
  } catch {
    return [];
  }
}
