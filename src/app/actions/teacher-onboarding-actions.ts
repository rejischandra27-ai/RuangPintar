"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/shared/infrastructure/auth/auth-guard";
import {
  checkPermission,
  requirePermission,
} from "@/shared/infrastructure/authorization/authz-guard";
import { studentImportService } from "@/modules/student/application/student-import-service";
import { SubjectService } from "@/modules/teacher/application/subject-service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  TeacherGradeChoice,
  teacherOnboardingService,
} from "@/modules/teacher/application/teacher-onboarding-service";
import { tenantMembershipService } from "@/shared/infrastructure/tenant/tenant-membership-service";

export interface TeacherOnboardingActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getTeacherTenant() {
  const user = await getCurrentUser();
  if (!user || user.peran_dasar !== "TEACHER" || !user.sekolah_id) {
    throw new Error("Sesi Guru atau tenant aktif tidak ditemukan.");
  }
  return user;
}

export async function getTeacherOnboardingSnapshotAction(): Promise<
  TeacherOnboardingActionResult<Awaited<ReturnType<typeof teacherOnboardingService.getSnapshot>>>
> {
  try {
    const user = await getTeacherTenant();
    const canCreateClass = await checkPermission("academic.classes.manage", {
      sekolah_id: user.sekolah_id!,
    });
    const canManageSubjects = await checkPermission("academic.structure.manage", {
      sekolah_id: user.sekolah_id!,
    });
    const snapshot = await teacherOnboardingService.getSnapshot({
      userId: user.id,
      sekolahId: user.sekolah_id!,
      isTenantOwner: user.is_owner_tenant ?? false,
      canCreateClass,
      canManageSubjects,
    });
    return { success: true, data: snapshot };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memuat persiapan mengajar.",
    };
  }
}

export async function createTeacherOnboardingSubjectAction(input: {
  kode?: string;
  nama: string;
}): Promise<TeacherOnboardingActionResult<{ id: string; nama: string }>> {
  try {
    if (typeof input?.nama !== "string" || input.nama.trim().length < 2) {
      return { success: false, error: "Nama mata pelajaran minimal 2 karakter." };
    }

    const user = await requirePermission("academic.structure.manage");
    if (user.peran_dasar !== "TEACHER" || !user.sekolah_id || !user.is_owner_tenant) {
      return { success: false, error: "Aksi ini hanya tersedia untuk owner tenant." };
    }

    let kode = typeof input.kode === "string" ? input.kode.trim().toUpperCase() : "";
    if (!kode) {
      const clean = input.nama
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, "");
      const words = clean.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        kode = "MAPEL";
      } else if (words.length === 1) {
        kode = words[0].slice(0, 8);
      } else if (words.length === 2) {
        kode = (words[0].slice(0, 4) + words[1].slice(0, 4)).slice(0, 8);
      } else {
        kode = words
          .map((w) => w[0])
          .join("")
          .slice(0, 8);
      }
    }

    let finalKode = kode;
    let counter = 1;
    while (true) {
      const existing = await prisma.mataPelajaran.findFirst({
        where: { sekolah_id: user.sekolah_id, kode: finalKode },
        select: { id: true },
      });
      if (!existing) break;
      counter++;
      finalKode = `${kode.slice(0, 16)}${counter}`;
    }

    const subject = await SubjectService.createSubject(
      {
        sekolah_id: user.sekolah_id,
        kode: finalKode,
        nama: input.nama.trim(),
        kelompok: "UMUM",
        status_aktif: true,
      },
      user.id,
      user.peran_dasar
    );

    revalidatePath("/dashboard");
    revalidatePath("/mata-pelajaran");
    return { success: true, data: { id: subject.id, nama: subject.nama } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal membuat mata pelajaran.",
    };
  }
}

export async function saveTeacherRolePreferencesAction(input: {
  guruMapelAktif: boolean;
  waliKelasAktif: boolean;
}): Promise<TeacherOnboardingActionResult> {
  try {
    if (typeof input?.guruMapelAktif !== "boolean" || typeof input?.waliKelasAktif !== "boolean") {
      return { success: false, error: "Pilihan peran tidak valid." };
    }
    const user = await getTeacherTenant();
    await teacherOnboardingService.saveRolePreferences({
      userId: user.id,
      sekolahId: user.sekolah_id!,
      guruMapelAktif: input.guruMapelAktif,
      waliKelasAktif: input.waliKelasAktif,
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan pilihan peran.",
    };
  }
}

export async function saveTeacherSubjectPreferencesAction(input: {
  subjectIds: string[];
}): Promise<TeacherOnboardingActionResult> {
  try {
    if (
      !Array.isArray(input?.subjectIds) ||
      input.subjectIds.length > 100 ||
      input.subjectIds.some((subjectId) => typeof subjectId !== "string")
    ) {
      return { success: false, error: "Pilihan mata pelajaran tidak valid." };
    }

    const user = await getTeacherTenant();
    await teacherOnboardingService.saveSubjectPreferences({
      userId: user.id,
      sekolahId: user.sekolah_id!,
      subjectIds: input.subjectIds,
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan pilihan mata pelajaran.",
    };
  }
}

export async function saveTeacherOnboardingStepAction(
  step: number
): Promise<TeacherOnboardingActionResult> {
  try {
    if (!Number.isInteger(step) || step < 0 || step > 4) {
      return { success: false, error: "Langkah onboarding tidak valid." };
    }

    const user = await getTeacherTenant();
    await teacherOnboardingService.saveWizardStep({
      userId: user.id,
      sekolahId: user.sekolah_id!,
      step,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan posisi wizard.",
    };
  }
}

export async function completeTeacherOnboardingAction(): Promise<TeacherOnboardingActionResult> {
  try {
    const user = await getTeacherTenant();
    await teacherOnboardingService.completeOnboarding({
      userId: user.id,
      sekolahId: user.sekolah_id!,
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Onboarding belum dapat diselesaikan.",
    };
  }
}

export async function deferTeacherOnboardingStepAction(
  step: "students" | "schedule"
): Promise<TeacherOnboardingActionResult> {
  try {
    if (step !== "students" && step !== "schedule") {
      return { success: false, error: "Langkah onboarding tidak valid." };
    }
    const user = await getTeacherTenant();
    await teacherOnboardingService.deferStep({
      userId: user.id,
      sekolahId: user.sekolah_id!,
      step,
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan pilihan.",
    };
  }
}

export async function saveTeacherAvatarAction(
  avatarId: string
): Promise<TeacherOnboardingActionResult> {
  try {
    const user = await getTeacherTenant();
    await teacherOnboardingService.saveAvatar(user.id, avatarId);
    revalidatePath("/dashboard");
    revalidatePath("/profil");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan avatar.",
    };
  }
}

export async function createFirstTeacherClassAction(input: {
  name: string;
  grade: TeacherGradeChoice;
}): Promise<TeacherOnboardingActionResult<{ id: string; name: string }>> {
  try {
    if (!input || typeof input.name !== "string" || !["X", "XI", "XII"].includes(input.grade)) {
      return { success: false, error: "Nama atau tingkat kelas tidak valid." };
    }
    const user = await requirePermission("academic.classes.manage");
    if (user.peran_dasar !== "TEACHER" || !user.sekolah_id) {
      return { success: false, error: "Aksi ini hanya tersedia untuk Guru pada tenant aktif." };
    }
    const data = await teacherOnboardingService.createFirstClass({
      userId: user.id,
      sekolahId: user.sekolah_id,
      role: user.peran_dasar,
      name: input.name,
      grade: input.grade,
    });
    revalidatePath("/dashboard");
    revalidatePath("/kelas-saya");
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal membuat kelas pertama.",
    };
  }
}

export async function importStudentsToTeacherClassAction(
  formData: FormData
): Promise<TeacherOnboardingActionResult<{ importedCount: number }>> {
  try {
    const user = await getTeacherTenant();
    const rombelId = String(formData.get("rombel_id") ?? "");
    const upload = formData.get("file");
    if (!rombelId || !(upload instanceof File) || upload.size === 0) {
      return { success: false, error: "Pilih kelas dan file Excel terlebih dahulu." };
    }
    if (!/\.xlsx$/i.test(upload.name) || upload.size > 5 * 1024 * 1024) {
      return { success: false, error: "Gunakan file .xlsx maksimal 5 MB." };
    }

    const rombel = await prisma.rombel.findFirst({
      where: { id: rombelId, sekolah_id: user.sekolah_id!, status: "AKTIF" },
      select: { id: true },
    });
    if (!rombel) return { success: false, error: "Kelas tidak ditemukan pada tenant aktif." };

    await requirePermission("academic.students.manage", {
      sekolah_id: user.sekolah_id!,
      rombel_id: rombelId,
    });
    const result = await studentImportService.importIntoRombel({
      sekolahId: user.sekolah_id!,
      rombelId,
      actorId: user.id,
      actorRole: user.peran_dasar,
      workbook: Buffer.from(await upload.arrayBuffer()),
    });
    revalidatePath("/dashboard");
    revalidatePath("/data-siswa");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Import siswa gagal.",
    };
  }
}

export async function searchRegisteredSchoolsAction(query: string): Promise<
  TeacherOnboardingActionResult<
    Array<{
      id: string;
      nama: string;
      jenjang: string;
      lokasi: string | null;
      npsn: string | null;
      isSubscribed: boolean;
    }>
  >
> {
  try {
    const term = (query || "").trim().slice(0, 80);
    if (term.length < 2) {
      return { success: true, data: [] };
    }

    const schools = await prisma.sekolah.findMany({
      where: {
        status_aktif: true,
        OR: [{ nama: { contains: term } }, { npsn: { contains: term } }],
      },
      select: {
        id: true,
        nama: true,
        jenjang: true,
        alamat: true,
        npsn: true,
        tipe_lisensi: true,
      },
      orderBy: { nama: "asc" },
      take: 8,
    });

    return {
      success: true,
      data: schools.map((school) => ({
        id: school.id,
        nama: school.nama,
        jenjang: school.jenjang,
        lokasi: school.alamat,
        npsn: school.npsn,
        isSubscribed: school.tipe_lisensi !== "FREEMIUM",
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mencari sekolah.",
    };
  }
}

export async function updateTeacherSchoolNameAction(
  namaSekolah: string
): Promise<TeacherOnboardingActionResult<{ sekolahId: string; nama: string }>> {
  try {
    const user = await getTeacherTenant();
    const trimmed = (namaSekolah || "").trim();
    if (!trimmed || trimmed.length < 3) {
      return { success: false, error: "Nama sekolah minimal 3 karakter." };
    }

    await prisma.sekolah.update({
      where: { id: user.sekolah_id! },
      data: { nama: trimmed },
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      data: { sekolahId: user.sekolah_id!, nama: trimmed },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui nama sekolah.",
    };
  }
}

export async function requestJoinSchoolAction(
  targetSchoolId: string
): Promise<TeacherOnboardingActionResult<{ redirectUrl: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.peran_dasar !== "TEACHER") {
      throw new Error("Sesi Guru tidak ditemukan.");
    }

    const targetSchool = await prisma.sekolah.findUnique({
      where: { id: targetSchoolId },
      select: { id: true, nama: true, status_aktif: true },
    });
    if (!targetSchool || !targetSchool.status_aktif) {
      return { success: false, error: "Sekolah tujuan tidak ditemukan atau tidak aktif." };
    }

    const existing = await prisma.keanggotaanSekolah.findUnique({
      where: {
        pengguna_id_sekolah_id: {
          pengguna_id: user.id,
          sekolah_id: targetSchoolId,
        },
      },
    });

    if (!existing) {
      await tenantMembershipService.createPendingMembership({
        penggunaId: user.id,
        sekolahId: targetSchoolId,
        peranDasar: "TEACHER",
        source: "JOIN_REQUEST",
      });
    }

    revalidatePath("/dashboard");
    return {
      success: true,
      data: { redirectUrl: "/onboarding/menunggu-persetujuan" },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengajukan permohonan bergabung.",
    };
  }
}
