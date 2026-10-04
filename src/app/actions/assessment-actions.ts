"use server";

/**
 * Ruang Pintar — M13 Assessment & Gradebook Server Actions
 */

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { requirePermission } from "@/shared/infrastructure/authorization/authz-guard";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { assessmentService } from "@/modules/assessment/application/assessment-service";
import {
  CreateAssessmentInput,
  UpdateAssessmentInput,
  BulkSaveGradesInput,
  PublishAssessmentInput,
  DefinisiAsesmenDTO,
  NilaiSiswaDTO,
  ClassGradebookDTO,
} from "@/modules/assessment/domain/assessment-types";

export interface AssessmentActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

async function resolveTeacherContext(userId: string, role: string, sekolahId: string) {
  const isSuperAdmin = role === "SUPER_ADMIN";
  let guruId: string | null = null;

  if (role === "TEACHER") {
    const guru = await prisma.guru.findFirst({
      where: { sekolah_id: sekolahId, pengguna_id: userId },
    });
    if (guru) {
      guruId = guru.id;
    }
  }

  return { isSuperAdmin, guruId };
}

/**
 * Buat Asesmen Pembelajaran Baru
 */
export async function createAssessmentAction(
  input: CreateAssessmentInput
): Promise<AssessmentActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, message: "Sekolah tidak teridentifikasi." };
    }

    await requirePermission("assessment.grades.manage", {
      sekolah_id: user.sekolah_id,
    });

    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const created = await assessmentService.createAssessment(
      input,
      user.sekolah_id,
      guruId,
      isSuperAdmin,
      user.id
    );

    revalidatePath(`/kelas-saya/${input.penugasan_mengajar_id}`);
    revalidatePath("/kelas-saya");
    revalidatePath("/penilaian");

    return {
      success: true,
      message: `Asesmen '${created.judul}' berhasil dibuat.`,
      data: created,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal membuat asesmen.";
    return { success: false, message };
  }
}

/**
 * Perbarui Asesmen
 */
export async function updateAssessmentAction(
  asesmenId: string,
  input: UpdateAssessmentInput,
  penugasanId: string
): Promise<AssessmentActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, message: "Sekolah tidak teridentifikasi." };
    }

    await requirePermission("assessment.grades.manage", {
      sekolah_id: user.sekolah_id,
    });

    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const updated = await assessmentService.updateAssessment(
      asesmenId,
      input,
      user.sekolah_id,
      guruId,
      isSuperAdmin,
      user.id
    );

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/penilaian");

    return {
      success: true,
      message: `Asesmen '${updated.judul}' berhasil diperbarui.`,
      data: updated,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui asesmen.";
    return { success: false, message };
  }
}

/**
 * Hapus Asesmen
 */
export async function deleteAssessmentAction(
  asesmenId: string,
  penugasanId: string
): Promise<AssessmentActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, message: "Sekolah tidak teridentifikasi." };
    }

    await requirePermission("assessment.grades.manage", {
      sekolah_id: user.sekolah_id,
    });

    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const deleted = await assessmentService.deleteAssessment(
      asesmenId,
      user.sekolah_id,
      guruId,
      isSuperAdmin,
      user.id
    );

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/penilaian");

    return {
      success: true,
      message: `Asesmen '${deleted.judul}' berhasil dihapus.`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus asesmen.";
    return { success: false, message };
  }
}

/**
 * Ambil daftar nilai siswa untuk form lembar penilaian asesmen
 */
export async function getAssessmentGradesAction(
  asesmenId: string
): Promise<AssessmentActionResult<{ asesmen: any; grades: NilaiSiswaDTO[] }>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, message: "Sekolah tidak teridentifikasi." };
    }

    await requirePermission("assessment.grades.view", {
      sekolah_id: user.sekolah_id,
    });

    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const data = await assessmentService.getAssessmentGrades(
      asesmenId,
      user.sekolah_id,
      guruId,
      isSuperAdmin
    );

    return { success: true, message: "Nilai asesmen berhasil dimuat.", data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memuat nilai asesmen.";
    return { success: false, message };
  }
}

/**
 * Simpan Sekaligus Nilai Siswa (Bulk Grade Entry)
 */
export async function saveAssessmentGradesAction(
  input: BulkSaveGradesInput,
  penugasanId?: string
): Promise<AssessmentActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, message: "Sekolah tidak teridentifikasi." };
    }

    await requirePermission("assessment.grades.manage", {
      sekolah_id: user.sekolah_id,
    });

    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const result = await assessmentService.saveGrades(
      input.asesmen_id,
      input.grades,
      user.sekolah_id,
      guruId,
      isSuperAdmin,
      user.id,
      input.alasan_koreksi
    );

    if (penugasanId) {
      revalidatePath(`/kelas-saya/${penugasanId}`);
    }
    revalidatePath("/kelas-saya");
    revalidatePath("/penilaian");

    return {
      success: true,
      message: `Nilai siswa berhasil disimpan (${input.grades.length} siswa).`,
      data: result,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan nilai siswa.";
    return { success: false, message };
  }
}

/**
 * Publikasikan Nilai Asesmen ke Siswa & Wali Murid
 */
export async function publishAssessmentAction(
  input: PublishAssessmentInput,
  penugasanId?: string
): Promise<AssessmentActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, message: "Sekolah tidak teridentifikasi." };
    }

    await requirePermission("assessment.grades.publish", {
      sekolah_id: user.sekolah_id,
    });

    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const pub = await assessmentService.publishAssessment(
      input.asesmen_id,
      user.sekolah_id,
      guruId,
      isSuperAdmin,
      user.id,
      input.target_audience,
      input.catatan
    );

    if (penugasanId) {
      revalidatePath(`/kelas-saya/${penugasanId}`);
    }
    revalidatePath("/kelas-saya");
    revalidatePath("/penilaian");

    return {
      success: true,
      message: "Nilai asesmen berhasil dipublikasikan secara resmi.",
      data: pub,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mempublikasikan nilai.";
    return { success: false, message };
  }
}

/**
 * Ambil Matriks Buku Nilai (Gradebook) Lengkap
 */
export async function getGradebookAction(
  penugasanId: string
): Promise<AssessmentActionResult<ClassGradebookDTO>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, message: "Sekolah tidak teridentifikasi." };
    }

    await requirePermission("assessment.grades.view", {
      sekolah_id: user.sekolah_id,
    });

    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const data = await assessmentService.getGradebook(
      penugasanId,
      user.sekolah_id,
      guruId,
      isSuperAdmin
    );

    return { success: true, message: "Buku nilai berhasil dimuat.", data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memuat buku nilai.";
    return { success: false, message };
  }
}

/**
 * Ekspor Matriks Buku Nilai ke format Excel (.xlsx) dengan struktur & rumus resmi
 */
export async function exportGradebookExcelAction(
  penugasanId: string
): Promise<AssessmentActionResult<{ base64: string; filename: string }>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, message: "Sekolah tidak teridentifikasi." };
    }

    await requirePermission("assessment.grades.view", {
      sekolah_id: user.sekolah_id,
    });

    const { exportGradebookToExcel } =
      await import("@/modules/assessment/application/gradebook-excel-export-service");

    const exportResult = await exportGradebookToExcel(penugasanId, user.sekolah_id);

    return {
      success: true,
      message: "Leger nilai Excel berhasil digenerate.",
      data: {
        base64: exportResult.base64,
        filename: exportResult.filename,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengekspor file Excel.";
    return { success: false, message };
  }
}
