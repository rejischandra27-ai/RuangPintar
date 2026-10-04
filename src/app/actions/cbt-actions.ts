"use server";

/**
 * Ruang Pintar — M14 CBT (Computer-Based Test) Server Actions
 *
 * Strict Server Boundaries:
 * - Autentikasi & Otorisasi Server-Side
 * - Kunci Penilaian TIDAK PERNAH dikirim ke Klien
 * - Timer Authoritative dihitung di Server
 * - Idempotent Autosave
 * - Indikator Integritas & Anti-Cheat Audio Strike
 */

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { requirePermission } from "@/shared/infrastructure/authorization/authz-guard";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { cbtService } from "@/modules/cbt/application/cbt-service";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import {
  CreateBankSoalInput,
  CreateVersiSoalInput,
  CreateUjianCbtInput,
  AutosaveJawabanInput,
  RecordIntegrityEventInput,
  TransferToGradebookInput,
  HasilUjianCbtDTO,
} from "@/modules/cbt/domain/cbt-types";
import {
  generateQuestionsWithGemini,
  generateMixedExamWithGemini,
  generateRppWithGemini,
  generateMateriSummaryWithGemini,
} from "@/modules/cbt/infrastructure/gemini-cbt-ai-service";

export interface CbtActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

function getSafeErrorMessage(error: any): string {
  if (error?.message) {
    return error.message;
  }
  return "Terjadi kendala pada pemrosesan sistem CBT.";
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

  // Fallback for SUPER_ADMIN or teachers without specific guru profile in current tenant
  if (!guruId) {
    const fallbackGuru = await prisma.guru.findFirst({
      where: { sekolah_id: sekolahId },
      orderBy: { created_at: "asc" },
    });
    if (fallbackGuru) {
      guruId = fallbackGuru.id;
    }
  }

  return { isSuperAdmin, guruId };
}

async function resolveStudentContext(userId: string, role: string, sekolahId: string) {
  const isSuperAdmin = role === "SUPER_ADMIN";
  let siswaId: string | null = null;

  if (role === "STUDENT") {
    const siswa = await prisma.siswa.findFirst({
      where: { sekolah_id: sekolahId, pengguna_id: userId },
    });
    if (siswa) {
      siswaId = siswa.id;
    }
  } else if (isSuperAdmin) {
    // For QA / testing as superadmin, fallback to first active student in school if needed
    const siswa = await prisma.siswa.findFirst({
      where: { sekolah_id: sekolahId, status_akademik: "AKTIF" },
    });
    if (siswa) {
      siswaId = siswa.id;
    }
  }

  return { isSuperAdmin, siswaId };
}

// ============================================================================
// BANK SOAL & VERSI SOAL
// ============================================================================

export async function getQuestionsAction(filter?: {
  mapelId?: string;
  jenisSoal?: any;
  status?: any;
  search?: string;
}): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.exam.manage", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const questions = await cbtService.getQuestions(
      user.sekolah_id,
      isSuperAdmin ? null : guruId,
      filter
    );
    return { success: true, message: "Bank soal berhasil dimuat.", data: questions };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function createQuestionAction(
  input: CreateBankSoalInput
): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.exam.manage", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const question = await cbtService.createQuestion(input, user.sekolah_id, guruId, isSuperAdmin);

    await recordAuditEvent({
      sekolah_id: user.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "CBT_QUESTION_CREATE",
      tipe_sumber: "BankSoal",
      id_sumber: question.id,
      payload_sesudah: { kode: question.kode, jenis: question.tipe_soal },
    });

    return {
      success: true,
      message: "Butir soal berhasil ditambahkan ke Bank Soal.",
      data: question,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function createQuestionVersionAction(
  bankSoalId: string,
  input: CreateVersiSoalInput
): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.exam.manage", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const version = await cbtService.createQuestionVersion(
      bankSoalId,
      input,
      user.sekolah_id,
      guruId,
      isSuperAdmin
    );

    return {
      success: true,
      message: `Versi baru (v${version.nomor_versi}) berhasil diterbitkan.`,
      data: version,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

// ============================================================================
// UJIAN CBT
// ============================================================================

export async function getExamsAction(penugasanId: string): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.exam.view", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const exams = await cbtService.getExamsByPenugasan(
      penugasanId,
      user.sekolah_id,
      guruId,
      isSuperAdmin
    );
    return { success: true, message: "Daftar ujian CBT berhasil dimuat.", data: exams };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function createExamAction(input: CreateUjianCbtInput): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.exam.manage", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const exam = await cbtService.createExam(input, user.sekolah_id, guruId, isSuperAdmin);

    await recordAuditEvent({
      sekolah_id: user.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "CBT_EXAM_CREATE",
      tipe_sumber: "UjianCbt",
      id_sumber: exam.id,
      payload_sesudah: { judul: exam.judul, durasi: exam.durasi_menit },
    });

    revalidatePath(`/kelas-saya/${input.penugasan_mengajar_id}`);
    return {
      success: true,
      message: `Ujian CBT '${exam.judul}' berhasil dibuat (Draft).`,
      data: exam,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function publishExamAction(
  ujianId: string,
  penugasanId: string
): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.exam.manage", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const res = await cbtService.publishExam(ujianId, user.sekolah_id, guruId, isSuperAdmin);

    await recordAuditEvent({
      sekolah_id: user.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "CBT_EXAM_PUBLISH",
      tipe_sumber: "UjianCbt",
      id_sumber: ujianId,
      payload_sesudah: { snapshotId: res.snapshotId },
    });

    revalidatePath(`/kelas-saya/${penugasanId}`);
    return {
      success: true,
      message: `Ujian berhasil dipublikasikan dan snapshot soal telah dibekukan.`,
      data: res,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function archiveExamAction(
  ujianId: string,
  penugasanId: string
): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.exam.manage", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    await cbtService.archiveExam(ujianId, user.sekolah_id, guruId, isSuperAdmin);

    revalidatePath(`/kelas-saya/${penugasanId}`);
    return { success: true, message: "Ujian CBT telah diarsipkan." };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

// ============================================================================
// STUDENT EXAM EXECUTION (CBT PLAYER)
// ============================================================================

export async function startOrResumeAttemptAction(
  ujianId: string,
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.attempt.start", { sekolah_id: user.sekolah_id });
    const { siswaId } = await resolveStudentContext(user.id, user.peran_dasar, user.sekolah_id);

    if (!siswaId) {
      return { success: false, message: "Identitas siswa Anda tidak ditemukan dalam sistem." };
    }

    const payload = await cbtService.startOrResumeAttempt(
      ujianId,
      user.sekolah_id,
      siswaId,
      metadata
    );

    return {
      success: true,
      message: "Sesi ujian CBT aktif.",
      data: payload,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function getAttemptPlayerAction(attemptId: string): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    const { siswaId } = await resolveStudentContext(user.id, user.peran_dasar, user.sekolah_id);
    if (!siswaId) {
      return { success: false, message: "Identitas siswa tidak ditemukan." };
    }

    const payload = await cbtService.getAttemptPlayer(attemptId, user.sekolah_id, siswaId);
    return { success: true, message: "Data pengerjaan ujian siap.", data: payload };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function autosaveAnswerAction(
  input: AutosaveJawabanInput
): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    const { siswaId } = await resolveStudentContext(user.id, user.peran_dasar, user.sekolah_id);
    if (!siswaId) {
      return { success: false, message: "Identitas siswa tidak valid." };
    }

    const res = await cbtService.autosaveAnswer(input, user.sekolah_id, siswaId);
    return { success: true, message: "Jawaban tersimpan otomatis.", data: res };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function recordIntegrityEventAction(
  input: RecordIntegrityEventInput
): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    const { siswaId } = await resolveStudentContext(user.id, user.peran_dasar, user.sekolah_id);
    if (!siswaId) {
      return { success: false, message: "Identitas siswa tidak valid." };
    }

    const res = await cbtService.recordIntegrityEvent(input, user.sekolah_id, siswaId);
    return {
      success: true,
      message: res.isLocked
        ? "PERINGATAN: Sesi ujian telah dikunci karena pelanggaran integritas."
        : "Event integritas dicatat.",
      data: res,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function submitAttemptAction(attemptId: string): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    const { siswaId } = await resolveStudentContext(user.id, user.peran_dasar, user.sekolah_id);
    if (!siswaId) {
      return { success: false, message: "Identitas siswa tidak valid." };
    }

    const hasil = await cbtService.submitAttempt(attemptId, user.sekolah_id, siswaId);

    await recordAuditEvent({
      sekolah_id: user.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "CBT_ATTEMPT_SUBMIT",
      tipe_sumber: "SesiUjianSiswa",
      id_sumber: attemptId,
      payload_sesudah: { nilai_akhir: hasil.nilai_akhir, status: hasil.status_kelulusan },
    });

    return {
      success: true,
      message: "Ujian CBT telah berhasil dikumpulkan dan dinilai.",
      data: hasil,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function getStudentResultAction(attemptId: string): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    const { siswaId } = await resolveStudentContext(user.id, user.peran_dasar, user.sekolah_id);
    if (!siswaId) {
      return { success: false, message: "Identitas siswa tidak valid." };
    }

    const data = await cbtService.getStudentResult(attemptId, user.sekolah_id, siswaId);
    return { success: true, message: "Hasil ujian CBT berhasil dimuat.", data };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

// ============================================================================
// PROCTORING & TEACHER MONITORING & GRADEBOOK BRIDGE
// ============================================================================

export async function getExamAttemptsAction(ujianId: string): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.attempt.monitor", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const data = await cbtService.getExamAttempts(ujianId, user.sekolah_id, guruId, isSuperAdmin);
    return { success: true, message: "Sesi peserta ujian berhasil dimuat.", data };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function unlockAttemptAction(
  attemptId: string,
  penugasanId: string
): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.attempt.monitor", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    await cbtService.unlockAttempt(attemptId, user.sekolah_id, guruId, isSuperAdmin);

    await recordAuditEvent({
      sekolah_id: user.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "CBT_ATTEMPT_UNLOCK",
      tipe_sumber: "SesiUjianSiswa",
      id_sumber: attemptId,
      payload_sesudah: { unlocked_by: user.id },
    });

    revalidatePath(`/kelas-saya/${penugasanId}`);
    return { success: true, message: "Kunci sesi ujian siswa berhasil dibuka." };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function resetAttemptAction(
  attemptId: string,
  penugasanId: string
): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.attempt.monitor", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    await cbtService.resetAttempt(attemptId, user.sekolah_id, guruId, isSuperAdmin);

    await recordAuditEvent({
      sekolah_id: user.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "CBT_ATTEMPT_RESET",
      tipe_sumber: "SesiUjianSiswa",
      id_sumber: attemptId,
      payload_sesudah: { reset_by: user.id },
    });

    revalidatePath(`/kelas-saya/${penugasanId}`);
    return {
      success: true,
      message: "Sesi ujian siswa berhasil di-reset. Siswa dapat memulai ulang.",
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function forceSubmitAttemptAction(
  attemptId: string,
  penugasanId: string
): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.attempt.monitor", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const hasil = await cbtService.forceSubmitAttempt(
      attemptId,
      user.sekolah_id,
      guruId,
      isSuperAdmin
    );

    await recordAuditEvent({
      sekolah_id: user.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "CBT_ATTEMPT_FORCE_SUBMIT",
      tipe_sumber: "SesiUjianSiswa",
      id_sumber: attemptId,
      payload_sesudah: { forced_by: user.id, skor: hasil.skor_mentah },
    });

    revalidatePath(`/kelas-saya/${penugasanId}`);
    return {
      success: true,
      message: "Ujian siswa berhasil dikumpulkan dan dinilai secara authoritative oleh server.",
      data: hasil,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function getCbtMapelListAction(): Promise<
  CbtActionResult<Array<{ id: string; nama: string; kode: string }>>
> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    const mapelList = await prisma.mataPelajaran.findMany({
      where: { sekolah_id: user.sekolah_id },
      select: { id: true, nama: true, kode: true },
      orderBy: { nama: "asc" },
    });

    return {
      success: true,
      message: "Daftar mata pelajaran berhasil dimuat.",
      data: mapelList,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function transferToGradebookAction(
  input: TransferToGradebookInput,
  penugasanId: string
): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.results.transfer", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const result = await cbtService.transferToGradebook(
      input,
      user.sekolah_id,
      guruId,
      isSuperAdmin
    );

    await recordAuditEvent({
      sekolah_id: user.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "CBT_RESULTS_TRANSFER",
      tipe_sumber: "DefinisiAsesmen",
      id_sumber: result.assessmentId,
      payload_sesudah: { count: result.transferredCount, ujianId: input.ujian_cbt_id },
    });

    revalidatePath(`/kelas-saya/${penugasanId}`);
    return {
      success: true,
      message: `Berhasil mentransfer ${result.transferredCount} nilai CBT ke Buku Nilai.`,
      data: result,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function submitPaperLjmExamAction(
  ujianId: string,
  siswaId: string,
  jawabanMap: Record<number, string>,
  penugasanId: string
): Promise<CbtActionResult<HasilUjianCbtDTO>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.attempt.monitor", { sekolah_id: user.sekolah_id });
    const { isSuperAdmin, guruId } = await resolveTeacherContext(
      user.id,
      user.peran_dasar,
      user.sekolah_id
    );

    const hasil = await cbtService.submitPaperExam(
      ujianId,
      siswaId,
      jawabanMap,
      user.sekolah_id,
      guruId,
      isSuperAdmin
    );

    await recordAuditEvent({
      sekolah_id: user.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "CBT_PAPER_LJM_SUBMIT",
      tipe_sumber: "HasilUjianCbt",
      id_sumber: hasil.id,
      payload_sesudah: { siswa_id: siswaId, nilai_akhir: hasil.nilai_akhir },
    });

    revalidatePath(`/kelas-saya/${penugasanId}`);
    return {
      success: true,
      message: `Berhasil mengoreksi dan mencatat hasil LJM kertas. Nilai: ${hasil.nilai_akhir} (${hasil.status_kelulusan})`,
      data: hasil,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function scanPaperLjmPhotoAction(
  ujianId: string,
  imageBase64: string,
  mimeType?: string
): Promise<
  CbtActionResult<{
    detectedAnswers: Record<number, string>;
    confidence: number;
    detectedStudentName?: string;
    detectedNis?: string;
    notes: string;
  }>
> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.attempt.monitor", { sekolah_id: user.sekolah_id });

    // Cek snapshot untuk total soal
    const examDetail = await cbtService.getExamDetail(ujianId, user.sekolah_id);
    const totalSoal = examDetail?.total_soal || 25;

    const result = await cbtService.scanPaperLjmPhoto(imageBase64, totalSoal, mimeType);
    return {
      success: true,
      message: "Pemindaian lembar jawaban selesai.",
      data: result,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

// ============================================================================
// BULK IMPORT & AI QUESTION GENERATION & EXAM TOKEN ACTIONS
// ============================================================================

export async function bulkCreateQuestionsAction(
  questions: any[],
  mapelId?: string
): Promise<CbtActionResult<{ count: number }>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };
    await requirePermission("cbt.exam.manage", { sekolah_id: user.sekolah_id });
    const { guruId } = await resolveTeacherContext(user.id, user.peran_dasar, user.sekolah_id);

    const result = await cbtService.bulkCreateQuestions(
      questions,
      user.sekolah_id,
      guruId,
      mapelId
    );
    return {
      success: true,
      message: `Berhasil mengimpor ${result.count} butir soal ke Bank Soal.`,
      data: result,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function generateAiQuestionsAction(params: any): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };
    await requirePermission("cbt.exam.manage", { sekolah_id: user.sekolah_id });

    const result = await generateQuestionsWithGemini(params);
    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function generateAiMixedExamAction(params: any): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };
    const allowedRoles = ["TEACHER", "SUPER_ADMIN", "SCHOOL_STAFF"];
    if (!allowedRoles.includes(user.peran_dasar)) {
      return { success: false, message: "Akses ditolak untuk Studio AI." };
    }

    const result = await generateMixedExamWithGemini(params);
    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function generateAiRppAction(params: any): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };
    const allowedRoles = ["TEACHER", "SUPER_ADMIN", "SCHOOL_STAFF"];
    if (!allowedRoles.includes(user.peran_dasar)) {
      return { success: false, message: "Akses ditolak untuk Studio AI." };
    }

    const result = await generateRppWithGemini(params);
    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function generateAiMateriAction(params: any): Promise<CbtActionResult<any>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };
    const allowedRoles = ["TEACHER", "SUPER_ADMIN", "SCHOOL_STAFF"];
    if (!allowedRoles.includes(user.peran_dasar)) {
      return { success: false, message: "Akses ditolak untuk Studio AI." };
    }

    const result = await generateMateriSummaryWithGemini(params);
    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function refreshExamTokenAction(
  ujianId: string,
  penugasanId?: string
): Promise<CbtActionResult<{ newToken: string }>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };
    await requirePermission("cbt.exam.manage", { sekolah_id: user.sekolah_id });

    // Generate random 6 characters alphanumeric token (excluding ambiguous chars 0/O, 1/I)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let newToken = "";
    for (let i = 0; i < 6; i++) {
      newToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existingExam = await prisma.ujianCbt.findFirst({
      where: { id: ujianId, sekolah_id: user.sekolah_id },
    });
    if (!existingExam) {
      return {
        success: false,
        message: "Ujian CBT tidak ditemukan atau bukan milik sekolah Anda.",
      };
    }

    await prisma.ujianCbt.update({
      where: { id: existingExam.id },
      data: { token_masuk: newToken, gunakan_token: true },
    });

    if (penugasanId) {
      revalidatePath(`/kelas-saya/${penugasanId}`);
    }
    revalidatePath(`/cbt-ujian`);

    return {
      success: true,
      message: `Token ujian berhasil diacak ulang: ${newToken}`,
      data: { newToken },
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function startAttemptWithTokenAction(
  ujianId: string,
  tokenInput?: string
): Promise<CbtActionResult<{ attemptId: string }>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    const { siswaId } = await resolveStudentContext(user.id, user.peran_dasar, user.sekolah_id);
    if (!siswaId)
      return { success: false, message: "Akun Anda tidak terdaftar sebagai peserta didik." };

    const res = await cbtService.startOrResumeAttempt(
      ujianId,
      user.sekolah_id,
      siswaId,
      undefined,
      tokenInput
    );

    return {
      success: true,
      message: "Sesi ujian berhasil dimulai.",
      data: { attemptId: res.session.id },
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

// ============================================================================
// EXAM PRINT ENGINE (OFFLINE / SUSULAN A4 PAPER GENERATOR)
// ============================================================================

export interface ExamPrintData {
  sekolah: {
    nama: string;
    alamat: string | null;
    telepon: string | null;
    email: string | null;
    npsn: string | null;
    logo_url: string | null;
  };
  ujian: {
    id: string;
    judul: string;
    durasi_menit: number;
    waktu_mulai: string | null;
    kkm_kktp: number;
    status: string;
    token_masuk?: string | null;
  };
  akademik: {
    mapel: string;
    guru: string;
    rombel: string;
    tingkat: string;
    programKeahlian: string;
    tahunAjaran: string;
    semester: string;
  };
  bagianA: Array<{
    nomor: number;
    pertanyaan: string;
    gambar_url?: string | null;
    opsi: Array<{ label: string; teks: string }>;
    kunci?: string;
    bobot: number;
  }>;
  bagianB: {
    petunjuk: string;
    pertanyaanList: Array<{ nomor: number; premis: string }>;
    jawabanList: Array<{ label: string; target: string }>;
    kunciMap: Record<number, string>;
    totalBobot: number;
  };
  bagianC: Array<{
    nomor: number;
    pertanyaan: string;
    gambar_url?: string | null;
    rubrik?: string;
    bobot: number;
  }>;
}

export async function getExamPrintDataAction(
  ujianId: string
): Promise<CbtActionResult<ExamPrintData>> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, message: "Sekolah tidak teridentifikasi." };

    await requirePermission("cbt.exam.manage", { sekolah_id: user.sekolah_id });

    const exam = await prisma.ujianCbt.findFirst({
      where: { id: ujianId, sekolah_id: user.sekolah_id },
      include: {
        sekolah: true,
        penugasan_mengajar: {
          include: {
            guru: true,
            mata_pelajaran: true,
            rombel: {
              include: {
                tingkat: true,
                program: true,
              },
            },
            tahun_ajaran: true,
            semester: true,
          },
        },
        snapshot_ujian: {
          orderBy: { nomor_snapshot: "desc" },
          take: 1,
        },
      },
    });

    if (!exam)
      return {
        success: false,
        message: "Ujian CBT tidak ditemukan atau bukan milik sekolah Anda.",
      };

    let rawItems: any[] = [];
    const keysMap: Record<string, any> = {};

    const snapshot = exam.snapshot_ujian[0];
    if (snapshot) {
      rawItems = JSON.parse(snapshot.manifest_soal || "[]");
      const secretKeys: any[] = JSON.parse(snapshot.kunci_penilaian || "[]");
      secretKeys.forEach((sk) => {
        keysMap[sk.soal_id] = sk.kunci_jawaban;
      });
    } else if (exam.blueprint) {
      const bpList: any[] = JSON.parse(exam.blueprint || "[]");
      const qIds = bpList.map((b) => b.bank_soal_id);
      const bankQuestions = await prisma.bankSoal.findMany({
        where: { id: { in: qIds }, sekolah_id: user.sekolah_id },
        include: { versi_soal: true },
      });
      rawItems = bpList
        .map((bp, idx) => {
          const q = bankQuestions.find((item) => item.id === bp.bank_soal_id);
          const vs = q?.versi_soal.find((v) => v.id === bp.versi_soal_id) || q?.versi_soal[0];
          if (q && vs) {
            keysMap[q.id] = vs.kunci_jawaban ? JSON.parse(vs.kunci_jawaban) : null;
            return {
              nomor_urut: idx + 1,
              soal_id: q.id,
              versi_soal_id: vs.id,
              tipe_soal: q.tipe_soal,
              pertanyaan: vs.pertanyaan,
              gambar_url: vs.gambar_url || null,
              opsi_jawaban: vs.opsi_jawaban ? JSON.parse(vs.opsi_jawaban) : null,
              bobot: bp.bobot || 1,
            };
          }
          return null;
        })
        .filter(Boolean);
    }

    // Partition into Bagian A (Pilihan Ganda), Bagian B (Menjodohkan), Bagian C (Essay)
    const bagianA: ExamPrintData["bagianA"] = [];
    const rawMenjodohkan: Array<{ premis: string; target: string; bobot: number }> = [];
    const bagianC: ExamPrintData["bagianC"] = [];

    let pgNum = 1;
    let essayNum = 1;

    for (const item of rawItems) {
      const tipe = item.tipe_soal || "PILIHAN_GANDA";
      const keyData = keysMap[item.soal_id];

      if (tipe === "PILIHAN_GANDA" || tipe === "BENAR_SALAH" || tipe === "PILIHAN_GANDA_KOMPLEKS") {
        let opsiList: Array<{ label: string; teks: string }> = [];
        if (Array.isArray(item.opsi_jawaban)) {
          opsiList = item.opsi_jawaban.map((op: any, i: number) => ({
            label: op.label || String.fromCharCode(65 + i),
            teks: op.teks || "",
          }));
        } else if (item.opsi_jawaban && item.opsi_jawaban.opsi) {
          opsiList = item.opsi_jawaban.opsi;
        }

        let kunciStr = "";
        if (keyData) {
          if (typeof keyData === "string") kunciStr = keyData;
          else if (keyData.pilihan_benar) {
            kunciStr = Array.isArray(keyData.pilihan_benar)
              ? keyData.pilihan_benar.join(", ")
              : String(keyData.pilihan_benar);
          }
        }

        bagianA.push({
          nomor: pgNum++,
          pertanyaan: item.pertanyaan,
          gambar_url: item.gambar_url || null,
          opsi: opsiList,
          kunci: kunciStr,
          bobot: item.bobot || 1,
        });
      } else if (tipe === "MENJODOHKAN") {
        // Collect premises and targets
        let pairs: Array<{ premis: string; target: string }> = [];
        if (keyData?.daftar_pasangan && Array.isArray(keyData.daftar_pasangan)) {
          pairs = keyData.daftar_pasangan.map((p: any) => ({
            premis: p.premis || p.teks,
            target: p.target || p.pasangan,
          }));
        } else if (keyData?.pasangan && typeof keyData.pasangan === "object") {
          pairs = Object.entries(keyData.pasangan).map(([k, v]) => ({
            premis: k,
            target: String(v),
          }));
        } else if (item.opsi_jawaban?.premis && Array.isArray(item.opsi_jawaban.premis)) {
          pairs = item.opsi_jawaban.premis.map((p: any, idx: number) => ({
            premis: p.teks || p.premis,
            target: item.opsi_jawaban.pilihan_target?.[idx] || "",
          }));
        } else {
          pairs = [{ premis: item.pertanyaan, target: item.kunci_benar || "" }];
        }

        pairs.forEach((p) => {
          if (p.premis) {
            rawMenjodohkan.push({
              premis: p.premis,
              target: p.target,
              bobot: item.bobot || 2,
            });
          }
        });
      } else if (tipe === "URAIAN_ESAI" || tipe === "ESAI" || tipe === "ISIAN_SINGKAT") {
        let rubrikStr = "";
        if (keyData) {
          if (typeof keyData === "string") rubrikStr = keyData;
          else if (keyData.rubrik_penilaian) rubrikStr = keyData.rubrik_penilaian;
          else if (keyData.kata_kunci) rubrikStr = keyData.kata_kunci.join(", ");
        }

        bagianC.push({
          nomor: essayNum++,
          pertanyaan: item.pertanyaan,
          gambar_url: item.gambar_url || null,
          rubrik: rubrikStr || "Penilaian manual oleh guru.",
          bobot: item.bobot || 4,
        });
      }
    }

    // Build Bagian B structure matching the SMK Otomindo table
    const uniqueTargets = Array.from(new Set(rawMenjodohkan.map((m) => m.target).filter(Boolean)));
    // Shuffle targets slightly or sort so it acts like real exam choices
    const targetLabels: Array<{ label: string; target: string }> = uniqueTargets.map((t, idx) => ({
      label: String.fromCharCode(65 + idx), // A, B, C, D...
      target: t,
    }));

    const pertanyaanList = rawMenjodohkan.map((m, idx) => ({
      nomor: idx + 1,
      premis: m.premis,
    }));

    const kunciMap: Record<number, string> = {};
    rawMenjodohkan.forEach((m, idx) => {
      const match = targetLabels.find((tl) => tl.target === m.target);
      if (match) {
        kunciMap[idx + 1] = match.label;
      }
    });

    const totalBobotB = rawMenjodohkan.reduce((acc, curr) => acc + curr.bobot, 0);

    const printData: ExamPrintData = {
      sekolah: {
        nama: exam.sekolah.nama,
        alamat: exam.sekolah.alamat,
        telepon: exam.sekolah.telepon,
        email: exam.sekolah.email,
        npsn: exam.sekolah.npsn,
        logo_url: exam.sekolah.logo_url,
      },
      ujian: {
        id: exam.id,
        judul: exam.judul,
        durasi_menit: exam.durasi_menit,
        waktu_mulai: exam.waktu_mulai ? exam.waktu_mulai.toISOString() : null,
        kkm_kktp: exam.kkm_kktp,
        status: exam.status,
        token_masuk: exam.token_masuk,
      },
      akademik: {
        mapel: exam.penugasan_mengajar.mata_pelajaran.nama,
        guru: exam.penugasan_mengajar.guru.nama_lengkap,
        rombel: exam.penugasan_mengajar.rombel.nama,
        tingkat: exam.penugasan_mengajar.rombel.tingkat?.nama || "Kelas X",
        programKeahlian: exam.penugasan_mengajar.rombel.program?.nama || "Umum / Semua Program",
        tahunAjaran: exam.penugasan_mengajar.tahun_ajaran.nama,
        semester: exam.penugasan_mengajar.semester?.nama || "Ganjil",
      },
      bagianA,
      bagianB: {
        petunjuk:
          "Pasangkanlah jawaban yang benar dari pertanyaan yang disajikan. Tariklah sehingga membentuk suatu garis atau tuliskan huruf pilihan pada kolom keterangan.",
        pertanyaanList,
        jawabanList: targetLabels,
        kunciMap,
        totalBobot: totalBobotB,
      },
      bagianC,
    };

    return {
      success: true,
      message: "Data naskah cetak ujian berhasil dimuat.",
      data: printData,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}
