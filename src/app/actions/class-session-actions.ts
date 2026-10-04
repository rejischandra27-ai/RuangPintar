"use server";

/**
 * Ruang Pintar — M10 Actual Class Session Server Actions
 */

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { requirePermission } from "@/shared/infrastructure/authorization/authz-guard";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { classSessionService } from "@/modules/schedule/application/class-session-service";
import { OpenClassSessionInput } from "@/modules/schedule/domain/schedule-types";

export interface ClassSessionActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export async function openClassSessionAction(
  _prevState: any,
  formData: FormData
): Promise<ClassSessionActionResult> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    await requirePermission("attendance.session.record", {
      sekolah_id: user.sekolah_id,
    });

    const penugasanId = formData.get("penugasan_mengajar_id") as string;
    const penugasan = await prisma.penugasanMengajar.findFirst({
      where: { id: penugasanId, sekolah_id: user.sekolah_id },
    });

    if (!penugasan) {
      return {
        success: false,
        message: "Penugasan mengajar tidak ditemukan pada sekolah aktif.",
      };
    }

    let guruId = formData.get("guru_id") as string;
    if (user.peran_dasar === "TEACHER") {
      const teacher = await prisma.guru.findFirst({
        where: { pengguna_id: user.id, sekolah_id: user.sekolah_id },
      });
      if (!teacher) {
        return { success: false, message: "Profil guru tidak ditemukan untuk akun ini." };
      }
      guruId = teacher.id;
      const isPengampu = penugasan.guru_id === teacher.id;
      const guruPenggantiId = (formData.get("guru_pengganti_id") as string) || null;
      if (!isPengampu && guruPenggantiId !== teacher.id) {
        return {
          success: false,
          message: "Akses ditolak: Anda bukan guru pengampu atau pengganti resmi pada kelas ini.",
        };
      }
    }

    const input: OpenClassSessionInput = {
      sekolah_id: user.sekolah_id,
      jadwal_pelajaran_id: (formData.get("jadwal_pelajaran_id") as string) || null,
      penugasan_mengajar_id: penugasanId,
      rombel_id: (formData.get("rombel_id") as string) || penugasan.rombel_id,
      mata_pelajaran_id:
        (formData.get("mata_pelajaran_id") as string) || penugasan.mata_pelajaran_id,
      guru_id: guruId,
      guru_pengganti_id: (formData.get("guru_pengganti_id") as string) || null,
      tahun_ajaran_id: (formData.get("tahun_ajaran_id") as string) || penugasan.tahun_ajaran_id,
      semester_id: (formData.get("semester_id") as string) || penugasan.semester_id,
      tanggal: (formData.get("tanggal") as string) || new Date(),
      ruangan_aktual: (formData.get("ruangan_aktual") as string) || null,
      topik_pembelajaran: (formData.get("topik_pembelajaran") as string) || null,
      catatan: (formData.get("catatan") as string) || null,
    };

    const session = await classSessionService.openSession(user.id, user.peran_dasar, input);

    revalidatePath("/sesi-pembelajaran");
    revalidatePath("/jadwal-saya");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Sesi pembelajaran kelas ${session.rombel_nama} (${session.mata_pelajaran_nama}) berhasil dibuka.`,
      data: session,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal membuka sesi pembelajaran.",
    };
  }
}

export async function closeClassSessionAction(
  sessionId: string,
  catatan?: string
): Promise<ClassSessionActionResult> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    await requirePermission("attendance.session.record", {
      sekolah_id: user.sekolah_id,
    });

    const closed = await classSessionService.closeSession(
      user.id,
      user.peran_dasar,
      sessionId,
      user.sekolah_id,
      catatan
    );

    revalidatePath("/sesi-pembelajaran");
    revalidatePath("/jadwal-saya");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Sesi pembelajaran ${closed.rombel_nama} telah ditutup dengan status SELESAI.`,
      data: closed,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal menutup sesi pembelajaran.",
    };
  }
}

export interface EnsureTodaySessionInput {
  penugasan_mengajar_id: string;
  jadwal_pelajaran_id?: string | null;
  rombel_id?: string;
  mata_pelajaran_id?: string;
  ruangan_aktual?: string | null;
}

export async function ensureAndGetTodaySessionAction(
  input: EnsureTodaySessionInput
): Promise<ClassSessionActionResult<{ sessionId: string; isNew: boolean }>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    await requirePermission("attendance.session.record", {
      sekolah_id: user.sekolah_id,
    });

    const penugasan = await prisma.penugasanMengajar.findFirst({
      where: { id: input.penugasan_mengajar_id, sekolah_id: user.sekolah_id },
      include: { rombel: true, mata_pelajaran: true },
    });

    if (!penugasan) {
      return {
        success: false,
        message: "Penugasan mengajar tidak ditemukan pada sekolah aktif.",
      };
    }

    let guruId = penugasan.guru_id;
    if (user.peran_dasar === "TEACHER") {
      const teacher = await prisma.guru.findFirst({
        where: { pengguna_id: user.id, sekolah_id: user.sekolah_id },
      });
      if (!teacher) {
        return { success: false, message: "Profil guru tidak ditemukan untuk akun ini." };
      }
      if (penugasan.guru_id !== teacher.id) {
        return {
          success: false,
          message: "Akses ditolak: Anda bukan guru pengampu resmi pada kelas ini.",
        };
      }
      guruId = teacher.id;
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Cek apakah sudah ada sesi KBM yang sedang DIMULAI atau TERJADWAL hari ini untuk penugasan ini
    const existing = await prisma.sesiKelasAktual.findFirst({
      where: {
        sekolah_id: user.sekolah_id,
        penugasan_mengajar_id: penugasan.id,
        tanggal: { gte: startOfDay, lte: endOfDay },
        status: { in: ["DIMULAI", "TERJADWAL"] },
      },
      orderBy: { created_at: "desc" },
    });

    if (existing) {
      return {
        success: true,
        message: `Sesi pembelajaran ${penugasan.rombel.nama} sudah aktif.`,
        data: { sessionId: existing.id, isNew: false },
      };
    }

    // 2. Jika belum ada, otomatis inisialisasi sesi KBM baru secara idempoten
    const session = await classSessionService.openSession(user.id, user.peran_dasar, {
      sekolah_id: user.sekolah_id,
      jadwal_pelajaran_id: input.jadwal_pelajaran_id || null,
      penugasan_mengajar_id: penugasan.id,
      rombel_id: input.rombel_id || penugasan.rombel_id,
      mata_pelajaran_id: input.mata_pelajaran_id || penugasan.mata_pelajaran_id,
      guru_id: guruId,
      tahun_ajaran_id: penugasan.tahun_ajaran_id,
      semester_id: penugasan.semester_id,
      tanggal: now,
      ruangan_aktual: input.ruangan_aktual || null,
      topik_pembelajaran: null,
      catatan: "Sesi dibuka secara instan melalui Dashboard Fast-Track.",
    });

    revalidatePath("/dashboard");
    revalidatePath("/jadwal-saya");
    revalidatePath("/sesi-pembelajaran");
    revalidatePath("/presensi-kelas");

    return {
      success: true,
      message: `Sesi pembelajaran kelas ${session.rombel_nama} (${session.mata_pelajaran_nama}) berhasil dibuka.`,
      data: { sessionId: session.id, isNew: true },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal menginisialisasi sesi kelas.",
    };
  }
}
