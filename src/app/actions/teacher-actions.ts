"use server";

/**
 * Ruang Pintar — M08 Teacher & Teaching Assignment Server Actions
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { requirePermission } from "@/shared/infrastructure/authorization/authz-guard";
import { AuthorizationError } from "@/shared/infrastructure/authorization/authz-guard";
import { TeacherProfileService } from "@/modules/teacher/application/teacher-profile-service";
import { TeacherRepository } from "@/modules/teacher/infrastructure/teacher-repository";
import { SubjectService } from "@/modules/teacher/application/subject-service";
import { TeachingAssignmentService } from "@/modules/teacher/application/teaching-assignment-service";
import { HomeroomAssignmentService } from "@/modules/teacher/application/homeroom-assignment-service";
import { identityService } from "@/shared/infrastructure/auth/identity-service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  StatusKepegawaianGuru,
  StatusLifecycle,
  StatusPenugasan,
} from "@/modules/teacher/domain/teacher-types";
import { TeacherDomainError } from "@/modules/teacher/domain/teacher-errors";
import { generateUlid } from "@/shared/lib/ulid";

export interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

function getSafeTeacherMutationMessage(error: unknown, fallback: string): string {
  if (error instanceof TeacherDomainError || error instanceof AuthorizationError) {
    return error.message;
  }
  return fallback;
}

function formatBulkLifecycleMessage(
  label: string,
  result: {
    requested: number;
    updated: number;
    deleted: number;
    archived: number;
    rejected: unknown[];
  }
): string {
  const parts: string[] = [];
  if (result.deleted > 0) parts.push(`${result.deleted} dihapus permanen`);
  if (result.archived > 0) parts.push(`${result.archived} diarsipkan`);
  const updatedOnly = result.updated - result.archived;
  if (updatedOnly > 0) parts.push(`${updatedOnly} diperbarui`);
  if (result.rejected.length > 0) parts.push(`${result.rejected.length} gagal diproses`);
  return `${label}: ${parts.length > 0 ? parts.join(", ") : "tidak ada perubahan"} dari ${result.requested} data terpilih.`;
}

// ===========================================================================
// 1. GURU ACTIONS
// ===========================================================================

export async function createTeacherAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    const clientSekolahId = formData.get("sekolah_id")?.toString();
    if (session.peran_dasar !== "SUPER_ADMIN") {
      if (!session.sekolah_id) {
        return {
          success: false,
          message: "Konteks sekolah tidak valid pada sesi aktif.",
        };
      }
      if (clientSekolahId && clientSekolahId !== session.sekolah_id) {
        return {
          success: false,
          message: "Akses ditolak: Akses data lintas sekolah dilarang.",
        };
      }
    }

    const effectiveSekolahId =
      session.peran_dasar === "SUPER_ADMIN"
        ? session.sekolah_id || clientSekolahId
        : session.sekolah_id;

    if (!effectiveSekolahId) {
      return {
        success: false,
        message: "Konteks sekolah tidak valid. Silakan pilih sekolah tujuan.",
      };
    }

    await requirePermission("academic.teachers.manage", {
      sekolah_id: effectiveSekolahId,
    });

    const created = await TeacherProfileService.createTeacher(
      {
        sekolah_id: effectiveSekolahId,
        pengguna_id: formData.get("pengguna_id")?.toString() || undefined,
        nip: formData.get("nip")?.toString() || undefined,
        nuptk: formData.get("nuptk")?.toString() || undefined,
        nama_lengkap: formData.get("nama_lengkap")?.toString() || "",
        gelar_depan: formData.get("gelar_depan")?.toString() || undefined,
        gelar_belakang: formData.get("gelar_belakang")?.toString() || undefined,
        jenis_kelamin: (formData.get("jenis_kelamin")?.toString() as "L" | "P") || "L",
        tempat_lahir: formData.get("tempat_lahir")?.toString() || undefined,
        tanggal_lahir: formData.get("tanggal_lahir")?.toString() || undefined,
        email: formData.get("email")?.toString() || undefined,
        telepon: formData.get("telepon")?.toString() || undefined,
        alamat: formData.get("alamat")?.toString() || undefined,
        status_kepegawaian:
          (formData.get("status_kepegawaian")?.toString() as StatusKepegawaianGuru) || "TETAP",
        status_aktif: formData.get("status_aktif") !== "false",
        foto_url: formData.get("foto_url")?.toString() || undefined,
        catatan: formData.get("catatan")?.toString() || undefined,
      },
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Guru ${created.nama_dengan_gelar} berhasil didaftarkan.`,
      data: created,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mendaftarkan data guru.";
    return { success: false, message };
  }
}

export async function updateTeacherAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teachers.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const id = formData.get("id")?.toString();
    if (!id) {
      return { success: false, message: "ID Guru tidak valid." };
    }

    const updated = await TeacherProfileService.updateTeacher(
      {
        id,
        sekolah_id: session.sekolah_id,
        pengguna_id: formData.get("pengguna_id")?.toString() || undefined,
        nip: formData.get("nip")?.toString() || undefined,
        nuptk: formData.get("nuptk")?.toString() || undefined,
        nama_lengkap: formData.get("nama_lengkap")?.toString(),
        gelar_depan: formData.get("gelar_depan")?.toString() || undefined,
        gelar_belakang: formData.get("gelar_belakang")?.toString() || undefined,
        jenis_kelamin: formData.get("jenis_kelamin")?.toString() as "L" | "P" | undefined,
        tempat_lahir: formData.get("tempat_lahir")?.toString() || undefined,
        tanggal_lahir: formData.get("tanggal_lahir")?.toString() || undefined,
        email: formData.get("email")?.toString() || undefined,
        telepon: formData.get("telepon")?.toString() || undefined,
        alamat: formData.get("alamat")?.toString() || undefined,
        status_kepegawaian: formData.get("status_kepegawaian")?.toString() as
          StatusKepegawaianGuru | undefined,
        status_aktif: formData.get("status_aktif") === "true",
        foto_url: formData.get("foto_url")?.toString() || undefined,
        catatan: formData.get("catatan")?.toString() || undefined,
      },
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Data guru ${updated.nama_dengan_gelar} berhasil diperbarui.`,
      data: updated,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui data guru.";
    return { success: false, message };
  }
}

export async function deleteTeacherAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teachers.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    await TeacherProfileService.deleteTeacher(
      id,
      session.sekolah_id,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return { success: true, message: "Data guru berhasil dihapus dari sistem." };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(
        error,
        "Data guru belum dapat dihapus. Periksa keterkaitan data akademik atau nonaktifkan guru."
      ),
    };
  }
}

export async function deactivateTeacherAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teachers.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const teacher = await TeacherProfileService.deactivateTeacher(
      id,
      session.sekolah_id,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Guru ${teacher.nama_dengan_gelar} berhasil dinonaktifkan tanpa menghapus histori akademik.`,
      data: teacher,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(error, "Guru belum dapat dinonaktifkan."),
    };
  }
}

export async function archiveTeacherAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teachers.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const teacher = await TeacherProfileService.archiveTeacher(
      id,
      session.sekolah_id,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Guru ${teacher.nama_dengan_gelar} berhasil diarsipkan tanpa menghapus histori akademik.`,
      data: teacher,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(error, "Guru belum dapat diarsipkan."),
    };
  }
}

export async function restoreTeacherAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teachers.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const teacher = await TeacherProfileService.restoreTeacher(
      id,
      session.sekolah_id,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Guru ${teacher.nama_dengan_gelar} berhasil direstorasi ke daftar aktif.`,
      data: teacher,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(error, "Guru belum dapat direstorasi."),
    };
  }
}

export async function bulkTeacherLifecycleAction(
  ids: string[],
  status: StatusLifecycle
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teachers.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const result = await TeacherProfileService.bulkUpdateLifecycle(
      ids,
      session.sekolah_id,
      status,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: formatBulkLifecycleMessage("Bulk data guru", result),
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(error, "Bulk data guru belum dapat diproses."),
    };
  }
}

export async function bulkDeleteTeachersAction(ids: string[]): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teachers.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const result = await TeacherProfileService.bulkDeleteTeachers(
      ids,
      session.sekolah_id,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: formatBulkLifecycleMessage("Bulk hapus guru", result),
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(
        error,
        "Bulk hapus guru belum dapat diproses. Data yang memiliki histori akademik harus diarsipkan."
      ),
    };
  }
}

export async function resetTeacherPasswordAction(
  guruId: string,
  customPassword?: string
): Promise<ActionResult<{ username: string; temporaryPassword: string }>> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teachers.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const teacher = await TeacherRepository.findTeacherById(guruId, session.sekolah_id);
    if (!teacher) {
      return { success: false, message: "Data guru tidak ditemukan." };
    }

    let penggunaId = teacher.pengguna_id;

    // Jika guru belum memiliki akun login, buatkan akun baru secara otomatis
    if (!penggunaId) {
      const cleanSlug = teacher.nama_lengkap
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 20);
      const cleanUsername = `guru_${cleanSlug}`;
      const temporaryPassword = customPassword?.trim() || "Password123#";

      const createdAccount = await identityService.createAccount(
        {
          sekolah_id: teacher.sekolah_id,
          username: cleanUsername,
          email: teacher.email || `${cleanUsername}@sekolah.sch.id`,
          password: temporaryPassword,
          nama_lengkap: teacher.nama_lengkap,
          peran_dasar: "TEACHER",
          status_akun: "AKTIF",
          harus_ganti_password: true,
        },
        session.id,
        session.peran_dasar
      );

      await prisma.guru.update({
        where: { id: teacher.id },
        data: {
          pengguna_id: createdAccount.id,
          email: teacher.email || createdAccount.email,
        },
      });

      await prisma.preferensiOnboardingGuru.create({
        data: {
          id: generateUlid(),
          pengguna_id: createdAccount.id,
          sekolah_id: teacher.sekolah_id,
          onboarding_eligible: true,
          onboarding_completed: false,
        },
      });

      revalidatePath("/guru-pengajaran");
      return {
        success: true,
        message: `Akun login baru berhasil dibuat untuk ${teacher.nama_dengan_gelar}.`,
        data: {
          username: createdAccount.username,
          temporaryPassword,
        },
      };
    }

    // Jika sudah memiliki akun, reset password akun tersebut
    const reqHeaders = await headers();
    const ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = reqHeaders.get("user-agent") || undefined;

    const resetResult = await identityService.adminResetPassword(
      penggunaId,
      customPassword,
      session.id,
      session.peran_dasar,
      ipAddress,
      userAgent
    );

    if (!resetResult.success) {
      return {
        success: false,
        message: resetResult.error || "Gagal mereset kata sandi guru.",
      };
    }

    const userAccount = await prisma.pengguna.findUnique({
      where: { id: penggunaId },
      select: { username: true, email: true },
    });

    revalidatePath("/guru-pengajaran");
    return {
      success: true,
      message: `Kata sandi untuk ${teacher.nama_dengan_gelar} berhasil di-reset.`,
      data: {
        username: userAccount?.username || userAccount?.email || "",
        temporaryPassword: resetResult.temporaryPassword || "Password123#",
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(
        error,
        "Terjadi kesalahan saat mereset kata sandi guru."
      ),
    };
  }
}

// ===========================================================================
// 2. MATA PELAJARAN ACTIONS
// ===========================================================================

export async function createSubjectAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.structure.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const created = await SubjectService.createSubject(
      {
        sekolah_id: session.sekolah_id,
        kode: formData.get("kode")?.toString() || "",
        nama: formData.get("nama")?.toString() || "",
        kelompok: formData.get("kelompok")?.toString() || undefined,
        status_aktif: formData.get("status_aktif") !== "false",
        deskripsi: formData.get("deskripsi")?.toString() || undefined,
      },
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    return {
      success: true,
      message: `Mata pelajaran ${created.nama} (${created.kode}) berhasil dibuat.`,
      data: created,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal membuat mata pelajaran.";
    return { success: false, message };
  }
}

export async function updateSubjectAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.structure.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const id = formData.get("id")?.toString();
    if (!id) {
      return { success: false, message: "ID Mata Pelajaran tidak valid." };
    }

    const updated = await SubjectService.updateSubject(
      {
        id,
        sekolah_id: session.sekolah_id,
        kode: formData.get("kode")?.toString() || undefined,
        nama: formData.get("nama")?.toString() || undefined,
        kelompok: formData.get("kelompok")?.toString() || undefined,
        status_aktif: formData.get("status_aktif") === "true",
        deskripsi: formData.get("deskripsi")?.toString() || undefined,
      },
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    return {
      success: true,
      message: `Mata pelajaran ${updated.nama} berhasil diperbarui.`,
      data: updated,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui mata pelajaran.";
    return { success: false, message };
  }
}

export async function deleteSubjectAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.structure.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    await SubjectService.deleteSubject(id, session.sekolah_id, session.id, session.peran_dasar);

    revalidatePath("/guru-pengajaran");
    return { success: true, message: "Mata pelajaran berhasil dihapus." };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(
        error,
        "Mata pelajaran belum dapat dihapus. Periksa keterkaitan penugasan atau arsipkan mapel."
      ),
    };
  }
}

export async function deactivateSubjectAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.structure.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const subject = await SubjectService.deactivateSubject(
      id,
      session.sekolah_id,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    return {
      success: true,
      message: `Mata pelajaran ${subject.nama} berhasil dinonaktifkan tanpa menghapus histori akademik.`,
      data: subject,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(error, "Mata pelajaran belum dapat dinonaktifkan."),
    };
  }
}

export async function archiveSubjectAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.structure.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const subject = await SubjectService.archiveSubject(
      id,
      session.sekolah_id,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    return {
      success: true,
      message: `Mata pelajaran ${subject.nama} berhasil diarsipkan tanpa menghapus histori akademik.`,
      data: subject,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(error, "Mata pelajaran belum dapat diarsipkan."),
    };
  }
}

export async function restoreSubjectAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.structure.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const subject = await SubjectService.restoreSubject(
      id,
      session.sekolah_id,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    return {
      success: true,
      message: `Mata pelajaran ${subject.nama} berhasil direstorasi ke daftar aktif.`,
      data: subject,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(error, "Mata pelajaran belum dapat direstorasi."),
    };
  }
}

export async function bulkSubjectLifecycleAction(
  ids: string[],
  status: StatusLifecycle
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.structure.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const result = await SubjectService.bulkUpdateLifecycle(
      ids,
      session.sekolah_id,
      status,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    return {
      success: true,
      message: formatBulkLifecycleMessage("Bulk mata pelajaran", result),
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(error, "Bulk mata pelajaran belum dapat diproses."),
    };
  }
}

export async function bulkDeleteSubjectsAction(ids: string[]): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.structure.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const result = await SubjectService.bulkDeleteSubjects(
      ids,
      session.sekolah_id,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    return {
      success: true,
      message: formatBulkLifecycleMessage("Bulk hapus mata pelajaran", result),
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(
        error,
        "Bulk hapus mata pelajaran belum dapat diproses. Data yang memiliki histori akademik harus diarsipkan."
      ),
    };
  }
}

// ===========================================================================
// 3. PENUGASAN MENGAJAR ACTIONS
// ===========================================================================

export async function createTeachingAssignmentAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teaching_assignments.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const created = await TeachingAssignmentService.createTeachingAssignment(
      {
        sekolah_id: session.sekolah_id,
        guru_id: formData.get("guru_id")?.toString() || "",
        mata_pelajaran_id: formData.get("mata_pelajaran_id")?.toString() || "",
        tahun_ajaran_id: formData.get("tahun_ajaran_id")?.toString() || "",
        semester_id: formData.get("semester_id")?.toString() || undefined,
        rombel_id: formData.get("rombel_id")?.toString() || "",
        jumlah_jam_minggu: Number(formData.get("jumlah_jam_minggu")) || 2,
        berlaku_mulai: formData.get("berlaku_mulai")?.toString() || undefined,
        status: (formData.get("status")?.toString() as StatusPenugasan) || "AKTIF",
        catatan: formData.get("catatan")?.toString() || undefined,
      },
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Penugasan mengajar ${created.mata_pelajaran_nama} di rombel ${created.rombel_nama} berhasil ditetapkan.`,
      data: created,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menetapkan penugasan mengajar.";
    return { success: false, message };
  }
}

export async function createBulkTeachingAssignmentsAction(
  _prevState: unknown,
  formData: FormData
): Promise<
  ActionResult<{
    createdCount: number;
    skippedCount: number;
    skipped: Array<{ rombel_id: string; rombel_nama: string; reason: string }>;
  }>
> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teaching_assignments.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const rombelIdsRaw = formData
      .getAll("rombel_ids")
      .map((id) => id.toString())
      .filter(Boolean);
    if (rombelIdsRaw.length === 0) {
      return { success: false, message: "Pilih minimal 1 rombongan belajar / kelas." };
    }

    const guru_id = formData.get("guru_id")?.toString() || "";
    const mata_pelajaran_id = formData.get("mata_pelajaran_id")?.toString() || "";
    const tahun_ajaran_id = formData.get("tahun_ajaran_id")?.toString() || "";
    const semester_id = formData.get("semester_id")?.toString() || undefined;
    const jumlah_jam_minggu = Number(formData.get("jumlah_jam_minggu")) || 2;
    const catatan = formData.get("catatan")?.toString() || undefined;

    const result = await TeachingAssignmentService.createBulkTeachingAssignments(
      {
        sekolah_id: session.sekolah_id,
        guru_id,
        mata_pelajaran_id,
        tahun_ajaran_id,
        semester_id,
        rombel_ids: rombelIdsRaw,
        jumlah_jam_minggu,
        catatan,
      },
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");

    const message =
      result.skipped.length > 0
        ? `Berhasil menetapkan ${result.created.length} penugasan. (${result.skipped.length} rombel dilewati karena sudah ada pengajar aktif).`
        : `Berhasil menetapkan ${result.created.length} penugasan mengajar sekaligus (Total Beban: ${
            result.created.length * jumlah_jam_minggu
          } JP/minggu).`;

    return {
      success: true,
      message,
      data: {
        createdCount: result.created.length,
        skippedCount: result.skipped.length,
        skipped: result.skipped,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menetapkan penugasan massal.";
    return { success: false, message };
  }
}

export async function updateTeachingAssignmentAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teaching_assignments.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const id = formData.get("id")?.toString();
    if (!id) {
      return { success: false, message: "ID Penugasan tidak valid." };
    }

    const updated = await TeachingAssignmentService.updateTeachingAssignment(
      {
        id,
        sekolah_id: session.sekolah_id,
        jumlah_jam_minggu: formData.get("jumlah_jam_minggu")
          ? Number(formData.get("jumlah_jam_minggu"))
          : undefined,
        status: formData.get("status")?.toString() as StatusPenugasan | undefined,
        berlaku_sampai: formData.get("berlaku_sampai")?.toString() || undefined,
        catatan: formData.get("catatan")?.toString() || undefined,
      },
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return { success: true, message: "Penugasan mengajar berhasil diperbarui.", data: updated };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui penugasan mengajar.";
    return { success: false, message };
  }
}

export async function closeTeachingAssignmentAction(
  id: string,
  status: StatusPenugasan = "SELESAI"
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teaching_assignments.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    await TeachingAssignmentService.closeTeachingAssignment(
      id,
      session.sekolah_id,
      status,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return { success: true, message: "Penugasan mengajar berhasil ditutup/diselesaikan." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menutup penugasan mengajar.";
    return { success: false, message };
  }
}

export async function archiveTeachingAssignmentAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teaching_assignments.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    await TeachingAssignmentService.archiveTeachingAssignment(
      id,
      session.sekolah_id,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "Penugasan mengajar berhasil diarsipkan tanpa menghapus histori akademik.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(error, "Penugasan mengajar belum dapat diarsipkan."),
    };
  }
}

export async function restoreTeachingAssignmentAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teaching_assignments.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const assignment = await TeachingAssignmentService.updateTeachingAssignment(
      {
        id,
        sekolah_id: session.sekolah_id,
        status: "AKTIF",
      },
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Penugasan mengajar ${assignment.mata_pelajaran_nama} di rombel ${assignment.rombel_nama} berhasil direstorasi ke status aktif.`,
      data: assignment,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(error, "Penugasan mengajar belum dapat direstorasi."),
    };
  }
}

export async function deleteTeachingAssignmentAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teaching_assignments.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    await TeachingAssignmentService.deleteTeachingAssignment(
      id,
      session.sekolah_id,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return { success: true, message: "Penugasan mengajar berhasil dihapus permanen." };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(
        error,
        "Penugasan mengajar belum dapat dihapus. Data yang memiliki histori akademik harus diarsipkan."
      ),
    };
  }
}

export async function bulkTeachingAssignmentLifecycleAction(
  ids: string[],
  status: StatusPenugasan
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teaching_assignments.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const result = await TeachingAssignmentService.bulkUpdateLifecycle(
      ids,
      session.sekolah_id,
      status,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: formatBulkLifecycleMessage("Bulk penugasan mengajar", result),
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(
        error,
        "Bulk penugasan mengajar belum dapat diproses."
      ),
    };
  }
}

export async function bulkDeleteTeachingAssignmentsAction(ids: string[]): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.teaching_assignments.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const result = await TeachingAssignmentService.bulkDeleteTeachingAssignments(
      ids,
      session.sekolah_id,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: formatBulkLifecycleMessage("Bulk hapus penugasan mengajar", result),
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getSafeTeacherMutationMessage(
        error,
        "Bulk hapus penugasan mengajar belum dapat diproses. Data yang memiliki histori akademik harus diarsipkan."
      ),
    };
  }
}

// ===========================================================================
// 4. PENUGASAN WALI KELAS ACTIONS
// ===========================================================================

export async function assignHomeroomAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.homeroom_assignments.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    const created = await HomeroomAssignmentService.assignHomeroom(
      {
        sekolah_id: session.sekolah_id,
        guru_id: formData.get("guru_id")?.toString() || "",
        rombel_id: formData.get("rombel_id")?.toString() || "",
        tahun_ajaran_id: formData.get("tahun_ajaran_id")?.toString() || "",
        berlaku_mulai: formData.get("berlaku_mulai")?.toString() || undefined,
        catatan: formData.get("catatan")?.toString() || undefined,
      },
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Guru ${created.guru_nama} resmi ditetapkan sebagai Wali Kelas ${created.rombel_nama}.`,
      data: created,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menetapkan wali kelas.";
    return { success: false, message };
  }
}

export async function closeHomeroomAction(
  id: string,
  status: StatusPenugasan = "SELESAI"
): Promise<ActionResult> {
  try {
    const session = await requireAuth();
    await requirePermission("academic.homeroom_assignments.manage");

    if (!session.sekolah_id) {
      return { success: false, message: "Konteks sekolah tidak valid." };
    }

    await HomeroomAssignmentService.closeHomeroom(
      id,
      session.sekolah_id,
      status,
      session.id,
      session.peran_dasar
    );

    revalidatePath("/guru-pengajaran");
    revalidatePath("/dashboard");
    return { success: true, message: "Penugasan wali kelas berhasil diselesaikan." };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal menyelesaikan penugasan wali kelas.";
    return { success: false, message };
  }
}
