"use server";

/**
 * Ruang Pintar — Academic Period & Structure (M06) Server Actions
 *
 * Seluruh aksi diverifikasi server-side melalui requireAuth() dan requirePermission("academic.structure.manage"),
 * divalidasi dengan Zod, dicatat dalam audit trail, dan merevalidasi cache halaman /struktur-akademik.
 */

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import {
  AuthorizationError,
  requirePermission,
} from "@/shared/infrastructure/authorization/authz-guard";
import { AcademicDomainError } from "@/modules/academic/domain/academic-errors";
import { academicYearService } from "@/modules/academic/application/academic-year-service";
import { semesterService } from "@/modules/academic/application/semester-service";
import { phaseGradeService } from "@/modules/academic/application/phase-grade-service";
import { programService } from "@/modules/academic/application/program-service";
import { rombelService } from "@/modules/academic/application/rombel-service";
import {
  createAcademicYearSchema,
  createGradeLevelSchema,
  createPhaseSchema,
  createProgramSchema,
  createRombelSchema,
  createSemesterSchema,
  updateAcademicYearSchema,
  updateGradeLevelSchema,
  updatePhaseSchema,
  updateProgramSchema,
  updateRombelSchema,
  updateSemesterSchema,
} from "@/modules/academic/domain/academic-validation";
import { ZodError } from "zod";

export type ActionResponse<T = unknown> =
  | { success: true; data?: T; message?: string }
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

  if (error instanceof AcademicDomainError) {
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

// =============================================================================
// 1. TAHUN AJARAN (ACADEMIC YEAR)
// =============================================================================

export async function createAcademicYearAction(formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const raw = {
      nama: String(formData.get("nama") ?? ""),
      kode: formData.get("kode") ? String(formData.get("kode")) : null,
      tanggal_mulai: String(formData.get("tanggal_mulai") ?? ""),
      tanggal_selesai: String(formData.get("tanggal_selesai") ?? ""),
      status: String(formData.get("status") ?? "DRAFT"),
    };

    const validated = createAcademicYearSchema.parse(raw);
    const result = await academicYearService.createAcademicYear(
      actor.sekolah_id,
      validated,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    revalidatePath("/sekolah");
    return {
      success: true,
      data: result,
      message: `Tahun ajaran '${result.nama}' berhasil dibuat.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updateAcademicYearAction(
  id: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const raw = {
      nama: formData.get("nama") ? String(formData.get("nama")) : undefined,
      kode: formData.get("kode") ? String(formData.get("kode")) : null,
      tanggal_mulai: formData.get("tanggal_mulai")
        ? String(formData.get("tanggal_mulai"))
        : undefined,
      tanggal_selesai: formData.get("tanggal_selesai")
        ? String(formData.get("tanggal_selesai"))
        : undefined,
      status: formData.get("status") ? (String(formData.get("status")) as any) : undefined,
    };

    const validated = updateAcademicYearSchema.parse(raw);
    const result = await academicYearService.updateAcademicYear(
      id,
      actor.sekolah_id,
      validated,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    revalidatePath("/sekolah");
    return {
      success: true,
      data: result,
      message: `Tahun ajaran '${result.nama}' berhasil diperbarui.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function activateAcademicYearAction(id: string): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const result = await academicYearService.activateAcademicYear(
      id,
      actor.sekolah_id,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    revalidatePath("/sekolah");
    return {
      success: true,
      data: result,
      message: `Tahun ajaran '${result.nama}' resmi diaktifkan sebagai periode aktif.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function closeAcademicYearAction(id: string): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const result = await academicYearService.closeAcademicYear(
      id,
      actor.sekolah_id,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    revalidatePath("/sekolah");
    return {
      success: true,
      data: result,
      message: `Tahun ajaran '${result.nama}' berhasil ditutup/diselesaikan.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deleteAcademicYearAction(id: string): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    await academicYearService.deleteAcademicYear(id, actor.sekolah_id, actor.id, actor.peran_dasar);

    revalidatePath("/struktur-akademik");
    revalidatePath("/sekolah");
    return {
      success: true,
      message: "Tahun ajaran berhasil dihapus.",
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// =============================================================================
// 2. SEMESTER
// =============================================================================

export async function createSemesterAction(formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const raw = {
      tahun_ajaran_id: String(formData.get("tahun_ajaran_id") ?? ""),
      nama: String(formData.get("nama") ?? ""),
      kode: String(formData.get("kode") ?? "GANJIL") as any,
      urutan: formData.get("urutan") ? Number(formData.get("urutan")) : 1,
      tanggal_mulai: String(formData.get("tanggal_mulai") ?? ""),
      tanggal_selesai: String(formData.get("tanggal_selesai") ?? ""),
      status: String(formData.get("status") ?? "DRAFT") as any,
    };

    const validated = createSemesterSchema.parse(raw);
    const result = await semesterService.createSemester(
      actor.sekolah_id,
      validated,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      data: result,
      message: `Semester '${result.nama}' (${result.kode}) berhasil dibuat.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updateSemesterAction(
  id: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const raw = {
      nama: formData.get("nama") ? String(formData.get("nama")) : undefined,
      kode: formData.get("kode") ? (String(formData.get("kode")) as any) : undefined,
      urutan: formData.get("urutan") ? Number(formData.get("urutan")) : undefined,
      tanggal_mulai: formData.get("tanggal_mulai")
        ? String(formData.get("tanggal_mulai"))
        : undefined,
      tanggal_selesai: formData.get("tanggal_selesai")
        ? String(formData.get("tanggal_selesai"))
        : undefined,
      status: formData.get("status") ? (String(formData.get("status")) as any) : undefined,
    };

    const validated = updateSemesterSchema.parse(raw);
    const result = await semesterService.updateSemester(
      id,
      actor.sekolah_id,
      validated,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      data: result,
      message: `Semester '${result.nama}' berhasil diperbarui.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function activateSemesterAction(id: string): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const result = await semesterService.activateSemester(
      id,
      actor.sekolah_id,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      data: result,
      message: `Semester '${result.nama}' resmi diaktifkan.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deleteSemesterAction(id: string): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    await semesterService.deleteSemester(id, actor.sekolah_id, actor.id, actor.peran_dasar);

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      message: "Semester berhasil dihapus.",
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// =============================================================================
// 3. FASE PENDIDIKAN
// =============================================================================

export async function createPhaseAction(formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const raw = {
      nama: String(formData.get("nama") ?? ""),
      kode: String(formData.get("kode") ?? ""),
      deskripsi: formData.get("deskripsi") ? String(formData.get("deskripsi")) : null,
      urutan: formData.get("urutan") ? Number(formData.get("urutan")) : 1,
    };

    const validated = createPhaseSchema.parse(raw);
    const result = await phaseGradeService.createPhase(
      actor.sekolah_id,
      validated,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      data: result,
      message: `Fase '${result.nama}' berhasil ditambahkan.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updatePhaseAction(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const raw = {
      nama: formData.get("nama") ? String(formData.get("nama")) : undefined,
      kode: formData.get("kode") ? String(formData.get("kode")) : undefined,
      deskripsi: formData.get("deskripsi") ? String(formData.get("deskripsi")) : null,
      urutan: formData.get("urutan") ? Number(formData.get("urutan")) : undefined,
    };

    const validated = updatePhaseSchema.parse(raw);
    const result = await phaseGradeService.updatePhase(
      id,
      actor.sekolah_id,
      validated,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      data: result,
      message: `Fase '${result.nama}' berhasil diperbarui.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deletePhaseAction(id: string): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    await phaseGradeService.deletePhase(id, actor.sekolah_id, actor.id, actor.peran_dasar);

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      message: "Fase pendidikan berhasil dihapus.",
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// =============================================================================
// 4. TINGKAT KELAS (GRADE LEVEL)
// =============================================================================

export async function createGradeLevelAction(formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const raw = {
      kode: String(formData.get("kode") ?? ""),
      nama: String(formData.get("nama") ?? ""),
      fase_id: formData.get("fase_id") ? String(formData.get("fase_id")) : null,
      urutan: formData.get("urutan") ? Number(formData.get("urutan")) : 1,
    };

    const validated = createGradeLevelSchema.parse(raw);
    const result = await phaseGradeService.createGradeLevel(
      actor.sekolah_id,
      validated,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      data: result,
      message: `Tingkat '${result.nama}' (${result.kode}) berhasil dibuat.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updateGradeLevelAction(
  id: string,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const raw = {
      kode: formData.get("kode") ? String(formData.get("kode")) : undefined,
      nama: formData.get("nama") ? String(formData.get("nama")) : undefined,
      fase_id: formData.get("fase_id") ? String(formData.get("fase_id")) : null,
      urutan: formData.get("urutan") ? Number(formData.get("urutan")) : undefined,
    };

    const validated = updateGradeLevelSchema.parse(raw);
    const result = await phaseGradeService.updateGradeLevel(
      id,
      actor.sekolah_id,
      validated,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      data: result,
      message: `Tingkat '${result.nama}' berhasil diperbarui.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deleteGradeLevelAction(id: string): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    await phaseGradeService.deleteGradeLevel(id, actor.sekolah_id, actor.id, actor.peran_dasar);

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      message: "Tingkat kelas berhasil dihapus.",
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// =============================================================================
// 5. PROGRAM KEAHLIAN / JURUSAN
// =============================================================================

export async function createProgramAction(formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const raw = {
      kode: String(formData.get("kode") ?? ""),
      nama: String(formData.get("nama") ?? ""),
      jenjang: formData.get("jenjang") ? String(formData.get("jenjang")) : null,
      status_aktif: formData.get("status_aktif") !== "false",
      deskripsi: formData.get("deskripsi") ? String(formData.get("deskripsi")) : null,
    };

    const validated = createProgramSchema.parse(raw);
    const result = await programService.createProgram(
      actor.sekolah_id,
      validated,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      data: result,
      message: `Program keahlian '${result.nama}' (${result.kode}) berhasil dibuat.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updateProgramAction(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const raw = {
      kode: formData.get("kode") ? String(formData.get("kode")) : undefined,
      nama: formData.get("nama") ? String(formData.get("nama")) : undefined,
      jenjang: formData.get("jenjang") ? String(formData.get("jenjang")) : null,
      status_aktif:
        formData.get("status_aktif") !== undefined
          ? formData.get("status_aktif") !== "false"
          : undefined,
      deskripsi: formData.get("deskripsi") ? String(formData.get("deskripsi")) : null,
    };

    const validated = updateProgramSchema.parse(raw);
    const result = await programService.updateProgram(
      id,
      actor.sekolah_id,
      validated,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      data: result,
      message: `Program keahlian '${result.nama}' berhasil diperbarui.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deleteProgramAction(id: string): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    await programService.deleteProgram(id, actor.sekolah_id, actor.id, actor.peran_dasar);

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      message: "Program keahlian berhasil dihapus.",
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// =============================================================================
// 6. ROMBEL / KELOMPOK BELAJAR
// =============================================================================

export async function createRombelAction(formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.structure.manage", {
      sekolah_id: actor.sekolah_id,
    });

    if (actor.is_owner_tenant) {
      return {
        success: false,
        error: "Buat kelas melalui Kelas Saya agar penugasan mengajar dibuat otomatis.",
        code: "USE_ATOMIC_CLASS_CREATION",
      };
    }

    const raw = {
      tahun_ajaran_id: String(formData.get("tahun_ajaran_id") ?? ""),
      semester_id: formData.get("semester_id") ? String(formData.get("semester_id")) : null,
      tingkat_id: String(formData.get("tingkat_id") ?? ""),
      fase_id: formData.get("fase_id") ? String(formData.get("fase_id")) : null,
      program_id: formData.get("program_id") ? String(formData.get("program_id")) : null,
      nama: String(formData.get("nama") ?? ""),
      kode: formData.get("kode") ? String(formData.get("kode")) : null,
      kapasitas: formData.get("kapasitas") ? Number(formData.get("kapasitas")) : 36,
      status: String(formData.get("status") ?? "AKTIF") as any,
      catatan: formData.get("catatan") ? String(formData.get("catatan")) : null,
    };

    const validated = createRombelSchema.parse(raw);
    const result = await rombelService.createRombel(
      actor.sekolah_id,
      validated,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    return {
      success: true,
      data: result,
      message: `Rombel '${result.nama}' berhasil dibentuk.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updateRombelAction(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.classes.manage", {
      sekolah_id: actor.sekolah_id,
    });

    const raw = {
      tahun_ajaran_id: formData.has("tahun_ajaran_id")
        ? String(formData.get("tahun_ajaran_id"))
        : undefined,
      semester_id: formData.has("semester_id")
        ? String(formData.get("semester_id")) || null
        : undefined,
      tingkat_id: formData.has("tingkat_id") ? String(formData.get("tingkat_id")) : undefined,
      fase_id: formData.has("fase_id") ? String(formData.get("fase_id")) || null : undefined,
      program_id: formData.has("program_id")
        ? String(formData.get("program_id")) || null
        : undefined,
      nama: formData.has("nama") ? String(formData.get("nama")) : undefined,
      kode: formData.has("kode") ? String(formData.get("kode")) || null : undefined,
      kapasitas: formData.has("kapasitas") ? Number(formData.get("kapasitas")) : undefined,
      status: formData.has("status") ? (String(formData.get("status")) as any) : undefined,
      catatan: formData.has("catatan") ? String(formData.get("catatan")) || null : undefined,
    };

    const validated = updateRombelSchema.parse(raw);
    const result = await rombelService.updateRombel(
      id,
      actor.sekolah_id,
      validated,
      actor.id,
      actor.peran_dasar
    );

    revalidatePath("/struktur-akademik");
    revalidatePath("/kelas-saya");
    revalidatePath("/dashboard");
    return {
      success: true,
      data: result,
      message: `Rombel '${result.nama}' berhasil diperbarui.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deleteRombelAction(id: string): Promise<ActionResponse> {
  try {
    const actor = await requireAuth();
    if (!actor.sekolah_id) {
      return { success: false, error: "Konteks sekolah tidak valid.", code: "INVALID_CONTEXT" };
    }

    await requirePermission("academic.classes.manage", {
      sekolah_id: actor.sekolah_id,
    });

    await rombelService.deleteRombel(id, actor.sekolah_id, actor.id, actor.peran_dasar);

    revalidatePath("/struktur-akademik");
    revalidatePath("/kelas-saya");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "Kelas berhasil dihapus dari workspace. Riwayat akademik tetap tersimpan.",
    };
  } catch (err) {
    return handleActionError(err);
  }
}
