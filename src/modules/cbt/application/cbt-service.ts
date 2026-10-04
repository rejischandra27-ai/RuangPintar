/**
 * Ruang Pintar — M14 CBT (Computer-Based Test) Application Service
 *
 * Invariant & Scope Guard:
 * - Question ≠ Question Version ≠ Exam Blueprint ≠ Exam ≠ Exam Snapshot ≠ Attempt ≠ Answer ≠ Result ≠ Assessment ≠ Grade
 * - Snapshot Ujian Immutable saat Ujian dipublikasi.
 * - One Active Attempt per Siswa per Ujian.
 * - Server Authoritative Timer (Klien tidak mendikte durasi/waktu habis).
 * - Kunci Penilaian TIDAK PERNAH dikirim ke Klien/Player CBT.
 * - Nilai CBT ditransfer ke Buku Nilai (M13) melalui contract resmi, bukan double-gradebook.
 * - Integrity Event adalah indikator integritas, bukan vonis mutlak otomatis tanpa audit.
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { cbtRepository, CbtRepository } from "../infrastructure/cbt-repository";
import {
  CbtNotFoundError,
  CbtAccessDeniedError,
  CbtValidationError,
  CbtAttemptClosedError,
  CbtAttemptLockedError,
  CbtTimerExpiredError,
  CbtExamNotActiveError,
} from "../domain/cbt-errors";
import {
  CreateBankSoalSchema,
  CreateVersiSoalSchema,
  CreateUjianCbtSchema,
  AutosaveJawabanSchema,
  RecordIntegrityEventSchema,
  TransferToGradebookSchema,
} from "../domain/cbt-validation";
import {
  CreateBankSoalInput,
  CreateVersiSoalInput,
  CreateUjianCbtInput,
  AutosaveJawabanInput,
  RecordIntegrityEventInput,
  TransferToGradebookInput,
  BankSoalDTO,
  VersiSoalDTO,
  UjianCbtDTO,
  SesiUjianSiswaDTO,
  HasilUjianCbtDTO,
  EventIntegritasDTO,
  ManifestItemSoal,
} from "../domain/cbt-types";

export class CbtService {
  private repo: CbtRepository;

  constructor(repo: CbtRepository = cbtRepository) {
    this.repo = repo;
  }

  /**
   * Helper: Verifikasi hak akses guru pada penugasan mengajar
   */
  private async verifyTeacherAssignmentScope(
    penugasanId: string,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ) {
    if (isSuperAdmin) return true;

    const penugasan = await prisma.penugasanMengajar.findFirst({
      where: { id: penugasanId, sekolah_id: sekolahId },
      select: { guru_id: true, status: true },
    });

    if (!penugasan) {
      throw new CbtNotFoundError(`Penugasan mengajar ${penugasanId} tidak ditemukan.`);
    }

    if (!guruId || penugasan.guru_id !== guruId) {
      throw new CbtAccessDeniedError(
        "Akses ditolak: Anda hanya berwenang mengelola CBT pada kelas yang Anda ampu."
      );
    }

    return true;
  }

  /**
   * Helper: Verifikasi siswa aktif di rombel penugasan mengajar
   */
  private async verifyStudentEnrollment(
    penugasanId: string,
    sekolahId: string,
    siswaId: string
  ): Promise<{ penempatanRombelId: string }> {
    const penugasan = await prisma.penugasanMengajar.findFirst({
      where: { id: penugasanId, sekolah_id: sekolahId },
      select: { rombel_id: true },
    });

    if (!penugasan) {
      throw new CbtNotFoundError(`Penugasan mengajar ${penugasanId} tidak ditemukan.`);
    }

    const penempatan = await prisma.penempatanRombel.findFirst({
      where: {
        sekolah_id: sekolahId,
        rombel_id: penugasan.rombel_id,
        status: "AKTIF",
        keikutsertaan: {
          siswa_id: siswaId,
        },
      },
      select: { id: true },
    });

    if (!penempatan) {
      throw new CbtAccessDeniedError(
        "Akses ditolak: Anda tidak terdaftar sebagai siswa aktif di rombel kelas ini."
      );
    }

    return { penempatanRombelId: penempatan.id };
  }

  // ============================================================================
  // BANK SOAL & VERSI SOAL
  // ============================================================================

  async getQuestions(
    sekolahId: string,
    guruId?: string | null,
    filter?: { mapelId?: string; jenisSoal?: any; status?: any; search?: string }
  ): Promise<BankSoalDTO[]> {
    return this.repo.findBankSoal(sekolahId, guruId ?? undefined, filter);
  }

  async getQuestionDetail(bankSoalId: string, sekolahId: string): Promise<BankSoalDTO> {
    const q = await this.repo.findBankSoalById(bankSoalId, sekolahId);
    if (!q) throw new CbtNotFoundError(`Bank Soal ${bankSoalId} tidak ditemukan.`);
    return q;
  }

  async createQuestion(
    rawInput: unknown,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<BankSoalDTO> {
    const parsed = CreateBankSoalSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new CbtValidationError(
        `Validasi Bank Soal gagal: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    const input: CreateBankSoalInput = parsed.data;

    let effectiveGuruId = guruId?.trim();
    if (!effectiveGuruId) {
      const anyGuru = await prisma.guru.findFirst({
        where: { sekolah_id: sekolahId },
        select: { id: true },
      });
      if (anyGuru) {
        effectiveGuruId = anyGuru.id;
      }
    }
    if (!effectiveGuruId) {
      throw new CbtValidationError("Data guru pengampu tidak ditemukan di sekolah ini.");
    }

    let effectiveMapelId = input.mata_pelajaran_id?.trim();
    if (!effectiveMapelId) {
      const penugasan = await prisma.penugasanMengajar.findFirst({
        where: { sekolah_id: sekolahId, guru_id: effectiveGuruId, status: "AKTIF" },
        select: { mata_pelajaran_id: true },
      });
      if (penugasan) {
        effectiveMapelId = penugasan.mata_pelajaran_id;
      }
    }
    if (!effectiveMapelId) {
      const anyMapel = await prisma.mataPelajaran.findFirst({
        where: { sekolah_id: sekolahId },
        select: { id: true },
      });
      if (anyMapel) {
        effectiveMapelId = anyMapel.id;
      }
    }
    if (!effectiveMapelId) {
      throw new CbtValidationError("Mata pelajaran wajib dipilih untuk membuat butir soal.");
    }

    return this.repo.createBankSoal(
      { ...input, mata_pelajaran_id: effectiveMapelId },
      sekolahId,
      effectiveGuruId
    );
  }

  async createQuestionVersion(
    bankSoalId: string,
    rawInput: unknown,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<VersiSoalDTO> {
    const question = await this.repo.findBankSoalById(bankSoalId, sekolahId);
    if (!question) throw new CbtNotFoundError(`Bank Soal ${bankSoalId} tidak ditemukan.`);

    if (
      !isSuperAdmin &&
      guruId &&
      (question.guru_id || question.pembuat_guru_id) &&
      (question.guru_id || question.pembuat_guru_id) !== guruId
    ) {
      throw new CbtAccessDeniedError("Akses ditolak: Anda bukan pembuat soal ini.");
    }

    const parsed = CreateVersiSoalSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new CbtValidationError(
        `Validasi Versi Soal gagal: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    const input: CreateVersiSoalInput = parsed.data;

    return this.repo.createVersiSoal(bankSoalId, input, guruId ?? null);
  }

  // ============================================================================
  // UJIAN CBT & SNAPSHOT BLUEPRINT
  // ============================================================================

  async getExamsByPenugasan(
    penugasanId: string,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<UjianCbtDTO[]> {
    await this.verifyTeacherAssignmentScope(penugasanId, sekolahId, guruId, isSuperAdmin);
    return this.repo.findUjianByPenugasan(penugasanId, sekolahId);
  }

  async getExamDetail(
    ujianId: string,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<UjianCbtDTO> {
    const exam = await this.repo.findUjianById(ujianId, sekolahId);
    if (!exam) throw new CbtNotFoundError(`Ujian CBT ${ujianId} tidak ditemukan.`);

    await this.verifyTeacherAssignmentScope(
      exam.penugasan_mengajar_id,
      sekolahId,
      guruId,
      isSuperAdmin
    );
    return exam;
  }

  async createExam(
    rawInput: unknown,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<UjianCbtDTO> {
    const parsed = CreateUjianCbtSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new CbtValidationError(
        `Validasi Ujian CBT gagal: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    const input: CreateUjianCbtInput = parsed.data;

    await this.verifyTeacherAssignmentScope(
      input.penugasan_mengajar_id,
      sekolahId,
      guruId,
      isSuperAdmin
    );

    return this.repo.createUjian(input, sekolahId, guruId ?? null);
  }

  async publishExam(
    ujianId: string,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<{ ujian: UjianCbtDTO; snapshotId: string }> {
    const exam = await this.repo.findUjianById(ujianId, sekolahId);
    if (!exam) throw new CbtNotFoundError(`Ujian CBT ${ujianId} tidak ditemukan.`);

    await this.verifyTeacherAssignmentScope(
      exam.penugasan_mengajar_id,
      sekolahId,
      guruId,
      isSuperAdmin
    );

    // Invariant: Snapshot dibuat saat publikasi dan bersifat immutable
    const result = await this.repo.freezeSnapshot(ujianId, sekolahId);
    await this.repo.updateUjianStatus(ujianId, "DIPUBLIKASI", sekolahId);

    const updatedExam = await this.repo.findUjianById(ujianId, sekolahId);
    return { ujian: updatedExam!, snapshotId: result.id };
  }

  async archiveExam(
    ujianId: string,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<void> {
    const exam = await this.repo.findUjianById(ujianId, sekolahId);
    if (!exam) throw new CbtNotFoundError(`Ujian CBT ${ujianId} tidak ditemukan.`);

    await this.verifyTeacherAssignmentScope(
      exam.penugasan_mengajar_id,
      sekolahId,
      guruId,
      isSuperAdmin
    );
    await this.repo.updateUjianStatus(ujianId, "DIARSIPKAN", sekolahId);
  }

  async bulkCreateQuestions(
    questions: any[],
    sekolahId: string,
    guruId?: string | null,
    mapelId?: string | null
  ): Promise<{ count: number }> {
    let created = 0;
    for (const q of questions) {
      const payload = {
        mata_pelajaran_id: mapelId || q.mata_pelajaran_id,
        kode: q.kode || undefined,
        jenis_soal: q.jenis_soal || "PILIHAN_GANDA",
        tingkat_kesulitan: q.tingkat_kesulitan || "SEDANG",
        bobot_default: q.bobot || q.bobot_default || 1,
        pertanyaan: q.pertanyaan,
        gambar_url: q.gambar_url || null,
        opsi: q.opsi,
        kunci_jawaban: q.kunci_jawaban,
      };
      await this.createQuestion(payload, sekolahId, guruId, true);
      created++;
    }
    return { count: created };
  }

  // ============================================================================
  // STUDENT EXAM ATTEMPT & PLAYER LIFECYCLE
  // ============================================================================

  /**
   * Memulai atau melanjutkan attempt pengerjaan ujian siswa
   */
  async startOrResumeAttempt(
    ujianId: string,
    sekolahId: string,
    siswaId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
    tokenInput?: string
  ): Promise<{
    session: SesiUjianSiswaDTO;
    manifest: ManifestItemSoal[];
    timeRemainingSeconds: number;
    savedAnswers: Record<string, any>;
  }> {
    const exam = await this.repo.findUjianById(ujianId, sekolahId);
    if (!exam) throw new CbtNotFoundError(`Ujian CBT ${ujianId} tidak ditemukan.`);

    // Check token if required
    if (exam.gunakan_token && exam.token_masuk) {
      const given = (tokenInput || "").trim().toUpperCase();
      const expected = exam.token_masuk.trim().toUpperCase();
      if (!given || given !== expected) {
        throw new CbtAccessDeniedError(
          "Token ujian tidak valid. Pastikan token yang Anda masukkan sesuai dengan yang diberikan oleh pengawas ruang."
        );
      }
    }

    if (
      exam.status !== "DIPUBLIKASI" &&
      exam.status !== "DITERBITKAN" &&
      exam.status !== "BERLANGSUNG"
    ) {
      throw new CbtExamNotActiveError("Ujian ini belum dibuka atau telah diarsipkan.");
    }

    const now = new Date();
    if (exam.waktu_mulai && now < new Date(exam.waktu_mulai)) {
      throw new CbtExamNotActiveError("Ujian belum dapat dimulai sesuai jadwal.");
    }
    if (exam.waktu_selesai && now > new Date(exam.waktu_selesai)) {
      throw new CbtExamNotActiveError("Waktu pelaksanaan ujian telah berakhir.");
    }

    // Verify student active enrollment in rombel
    const { penempatanRombelId } = await this.verifyStudentEnrollment(
      exam.penugasan_mengajar_id,
      sekolahId,
      siswaId
    );

    // Ambil atau buat snapshot
    let snapshot = await this.repo.getActiveSnapshot(ujianId);
    if (!snapshot) {
      // Auto-freeze snapshot jika belum ada saat student start
      snapshot = await this.repo.freezeSnapshot(ujianId, sekolahId);
    }

    // Start or resume attempt (Enforcing One Active Attempt)
    const session = await this.repo.startOrResumeAttempt(
      ujianId,
      snapshot.id,
      siswaId,
      penempatanRombelId,
      exam.durasi_menit,
      { ...metadata, tokenInput }
    );

    if (session.status === "TERKUNCI_PELANGGARAN") {
      throw new CbtAttemptLockedError(
        "Sesi ujian Anda telah terkunci karena pelanggaran integritas. Hubungi pengawas ujian."
      );
    }

    if (session.status === "SELESAI" || session.status === "TERLAMBAT") {
      throw new CbtAttemptClosedError("Sesi ujian Anda telah selesai dan dikumpulkan.");
    }

    // Server-Authoritative Timer Check
    const deadline = new Date(session.batas_waktu_server).getTime();
    const remainingMs = deadline - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    if (remainingSeconds <= 0 && session.status === "SEDANG_MENGERJAKAN") {
      // Auto-close attempt due to server timer expiration
      await this.repo.submitAttempt(session.id);
      throw new CbtTimerExpiredError("Waktu pengerjaan ujian Anda telah habis.");
    }

    // Load existing answers
    const answers = await this.repo.findJawabanBySession(session.id);
    const savedAnswers: Record<string, any> = {};
    for (const ans of answers) {
      savedAnswers[ans.nomor_urut] = {
        jawaban_pilihan: ans.jawaban_pilihan,
        jawaban_teks: ans.jawaban_teks,
        jawaban_kompleks: ans.jawaban_kompleks,
        ragu_ragu: ans.ragu_ragu,
      };
    }

    // Invariant: Return manifest WITHOUT answer keys or scoring rubrics
    return {
      session,
      manifest: snapshot.manifest_soal,
      timeRemainingSeconds: remainingSeconds,
      savedAnswers,
    };
  }

  /**
   * Ambil data player untuk attempt aktif siswa
   */
  async getAttemptPlayer(
    attemptId: string,
    sekolahId: string,
    siswaId: string
  ): Promise<{
    session: SesiUjianSiswaDTO;
    manifest: ManifestItemSoal[];
    timeRemainingSeconds: number;
    savedAnswers: Record<string, any>;
    ujian: { judul: string; deskripsi: string | null; acak_soal: boolean };
  }> {
    const session = await this.repo.findSessionById(attemptId);
    if (!session) throw new CbtNotFoundError(`Sesi ujian ${attemptId} tidak ditemukan.`);

    if (session.siswa_id !== siswaId) {
      throw new CbtAccessDeniedError("Akses ditolak: Sesi ujian ini bukan milik Anda.");
    }

    const exam = await this.repo.findUjianById(session.ujian_cbt_id, sekolahId);
    if (!exam) throw new CbtNotFoundError(`Ujian CBT tidak ditemukan.`);

    const snapshot = await this.repo.getActiveSnapshot(session.ujian_cbt_id);
    if (!snapshot) throw new CbtNotFoundError(`Snapshot ujian tidak ditemukan.`);

    if (session.status === "TERKUNCI_PELANGGARAN") {
      throw new CbtAttemptLockedError(
        "Sesi ujian Anda telah terkunci karena indikasi kecurangan. Silakan lapor ke pengawas."
      );
    }

    const deadline = new Date(session.batas_waktu_server).getTime();
    const remainingSeconds = Math.max(0, Math.floor((deadline - Date.now()) / 1000));

    if (remainingSeconds <= 0 && session.status === "SEDANG_MENGERJAKAN") {
      await this.repo.submitAttempt(session.id);
      throw new CbtTimerExpiredError("Batas waktu server ujian Anda telah berakhir.");
    }

    const answers = await this.repo.findJawabanBySession(session.id);
    const savedAnswers: Record<string, any> = {};
    for (const ans of answers) {
      savedAnswers[ans.nomor_urut] = {
        jawaban_pilihan: ans.jawaban_pilihan,
        jawaban_teks: ans.jawaban_teks,
        jawaban_kompleks: ans.jawaban_kompleks,
        ragu_ragu: ans.ragu_ragu,
      };
    }

    return {
      session,
      manifest: snapshot.manifest_soal,
      timeRemainingSeconds: remainingSeconds,
      savedAnswers,
      ujian: {
        judul: exam.judul,
        deskripsi: exam.deskripsi,
        acak_soal: exam.acak_soal,
      },
    };
  }

  /**
   * Autosave jawaban siswa secara periodik / per perubahan butir
   */
  async autosaveAnswer(
    rawInput: unknown,
    sekolahId: string,
    siswaId: string
  ): Promise<{ savedAt: Date }> {
    const parsed = AutosaveJawabanSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new CbtValidationError(
        `Validasi autosave jawaban gagal: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    const input: AutosaveJawabanInput = parsed.data;

    const session = await this.repo.findSessionById(input.sesi_ujian_siswa_id);
    if (!session) throw new CbtNotFoundError(`Sesi ujian tidak ditemukan.`);

    if (session.siswa_id !== siswaId) {
      throw new CbtAccessDeniedError("Akses ditolak: Sesi ujian bukan milik Anda.");
    }

    if (session.status !== "SEDANG_MENGERJAKAN") {
      throw new CbtAttemptClosedError(
        `Sesi ujian telah ditutup (status: ${session.status}). Jawaban tidak dapat disimpan.`
      );
    }

    // Server-Authoritative Timer Check
    const deadline = new Date(session.batas_waktu_server).getTime();
    if (Date.now() > deadline) {
      await this.repo.submitAttempt(session.id);
      throw new CbtTimerExpiredError("Waktu ujian telah habis. Sesi telah dikumpulkan.");
    }

    await this.repo.saveJawaban(input);
    return { savedAt: new Date() };
  }

  /**
   * Mencatat Event Integritas (blur, keluar layar penuh, devtools, tab switch).
   * Pada batas percobaan tertentu (misal 2 strike keluar layar), mengunci attempt.
   */
  async recordIntegrityEvent(
    rawInput: unknown,
    sekolahId: string,
    siswaId: string
  ): Promise<{ event: EventIntegritasDTO; isLocked: boolean }> {
    const parsed = RecordIntegrityEventSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new CbtValidationError(
        `Validasi event integritas gagal: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    const input: RecordIntegrityEventInput = parsed.data;

    const sessionId = input.sesi_ujian_siswa_id || input.sesi_ujian_id;
    if (!sessionId) {
      throw new CbtValidationError("ID sesi ujian wajib disertakan.");
    }

    const session = await this.repo.findSessionById(sessionId);
    if (!session) throw new CbtNotFoundError(`Sesi ujian tidak ditemukan.`);

    if (session.siswa_id !== siswaId) {
      throw new CbtAccessDeniedError("Akses ditolak: Sesi ujian bukan milik Anda.");
    }

    const event = await this.repo.recordIntegrityEvent(input);

    // Periksa total strike pelanggaran keluar layar / pindah tab
    const allEvents = await this.repo.findIntegrityEvents(session.id);
    const exitScreenEvents = allEvents.filter(
      (e) => e.tipe_event === "KELUAR_LAYAR_PENUH" || e.tipe_event === "PINDAH_TAB_ATAU_WINDOW"
    );

    let isLocked = false;
    // Jika strike >= 2, kunci sesi ujian siswa
    if (exitScreenEvents.length >= 2 && session.status === "SEDANG_MENGERJAKAN") {
      await this.repo.lockAttemptForViolation(
        session.id,
        `Sesi dikunci otomatis: Terdeteksi ${exitScreenEvents.length} kali keluar dari layar penuh / pindah tab.`,
        session.sekolah_id
      );
      isLocked = true;
    }

    return { event, isLocked };
  }

  /**
   * Mengumpulkan ujian siswa dan melakukan penilaian otomatis server-side
   */
  async submitAttempt(
    attemptId: string,
    sekolahId: string,
    siswaId: string
  ): Promise<HasilUjianCbtDTO> {
    const session = await this.repo.findSessionById(attemptId);
    if (!session) throw new CbtNotFoundError(`Sesi ujian ${attemptId} tidak ditemukan.`);

    if (session.siswa_id !== siswaId) {
      throw new CbtAccessDeniedError("Akses ditolak: Sesi ujian bukan milik Anda.");
    }

    if (session.status === "TERKUNCI_PELANGGARAN") {
      throw new CbtAttemptLockedError(
        "Sesi ujian Anda terkunci karena pelanggaran. Tidak dapat melakukan submission mandiri."
      );
    }

    return this.repo.submitAttempt(attemptId);
  }

  /**
   * Ambil hasil ujian siswa untuk tampilan selesai
   */
  async getStudentResult(
    attemptId: string,
    sekolahId: string,
    siswaId: string
  ): Promise<{ session: SesiUjianSiswaDTO; hasil: HasilUjianCbtDTO | null }> {
    const session = await this.repo.findSessionById(attemptId);
    if (!session) throw new CbtNotFoundError(`Sesi ujian ${attemptId} tidak ditemukan.`);

    if (session.siswa_id !== siswaId) {
      throw new CbtAccessDeniedError("Akses ditolak: Sesi ujian bukan milik Anda.");
    }

    const hasil = await this.repo.findHasilBySession(attemptId);
    return { session, hasil };
  }

  // ============================================================================
  // PROCTORING & TEACHER MONITORING & GRADEBOOK BRIDGE
  // ============================================================================

  /**
   * Monitor seluruh sesi ujian siswa pada suatu Ujian CBT (untuk Pengawas / Guru)
   */
  async getExamAttempts(
    ujianId: string,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<{
    ujian: UjianCbtDTO;
    attempts: Array<
      SesiUjianSiswaDTO & {
        siswa: { id: string; nama_lengkap: string; nisn: string | null };
        hasil: HasilUjianCbtDTO | null;
        integrityEventCount: number;
      }
    >;
  }> {
    const exam = await this.getExamDetail(ujianId, sekolahId, guruId, isSuperAdmin);
    const attempts = await this.repo.findExamAttempts(ujianId);
    return { ujian: exam, attempts };
  }

  /**
   * Guru membuka kunci sesi ujian siswa yang sempat terkunci pelanggaran
   */
  async unlockAttempt(
    attemptId: string,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<void> {
    const session = await this.repo.findSessionById(attemptId);
    if (!session) throw new CbtNotFoundError(`Sesi ujian ${attemptId} tidak ditemukan.`);

    const exam = await this.repo.findUjianById(session.ujian_cbt_id, sekolahId);
    if (!exam) throw new CbtNotFoundError(`Ujian CBT tidak ditemukan.`);

    await this.verifyTeacherAssignmentScope(
      exam.penugasan_mengajar_id,
      sekolahId,
      guruId,
      isSuperAdmin
    );
    await this.repo.unlockAttempt(attemptId, sekolahId);
  }

  /**
   * Reset attempt pengerjaan siswa agar siswa dapat mengulang dari awal
   */
  async resetAttempt(
    attemptId: string,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<void> {
    const session = await this.repo.findSessionById(attemptId);
    if (!session) throw new CbtNotFoundError(`Sesi ujian ${attemptId} tidak ditemukan.`);

    const exam = await this.repo.findUjianById(session.ujian_cbt_id, sekolahId);
    if (!exam) throw new CbtNotFoundError(`Ujian CBT tidak ditemukan.`);

    await this.verifyTeacherAssignmentScope(
      exam.penugasan_mengajar_id,
      sekolahId,
      guruId,
      isSuperAdmin
    );
    await this.repo.resetAttempt(attemptId);
  }

  /**
   * Pengawas / Guru memaksa pengumpulan jawaban siswa dari jarak jauh
   */
  async forceSubmitAttempt(
    attemptId: string,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<any> {
    const session = await this.repo.findSessionById(attemptId);
    if (!session) throw new CbtNotFoundError(`Sesi ujian ${attemptId} tidak ditemukan.`);

    if (session.status !== "SEDANG_MENGERJAKAN" && session.status !== "TERKUNCI_PELANGGARAN") {
      throw new CbtAttemptClosedError(
        `Sesi ujian ${attemptId} sudah ditutup (status: ${session.status}). Tidak dapat dipaksa kumpul.`
      );
    }

    const exam = await this.repo.findUjianById(session.ujian_cbt_id, sekolahId);
    if (!exam) throw new CbtNotFoundError(`Ujian CBT tidak ditemukan.`);

    await this.verifyTeacherAssignmentScope(
      exam.penugasan_mengajar_id,
      sekolahId,
      guruId,
      isSuperAdmin
    );
    return this.repo.submitAttempt(attemptId);
  }

  /**
   * Transfer nilai hasil CBT ke Buku Nilai (M13 Assessment Module)
   */
  async transferToGradebook(
    rawInput: unknown,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<{ assessmentId: string; transferredCount: number }> {
    const parsed = TransferToGradebookSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new CbtValidationError(
        `Validasi transfer nilai gagal: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      );
    }
    const input: TransferToGradebookInput = parsed.data;

    const exam = await this.repo.findUjianById(input.ujian_cbt_id, sekolahId);
    if (!exam) throw new CbtNotFoundError(`Ujian CBT ${input.ujian_cbt_id} tidak ditemukan.`);

    await this.verifyTeacherAssignmentScope(
      exam.penugasan_mengajar_id,
      sekolahId,
      guruId,
      isSuperAdmin
    );

    return this.repo.transferResultsToGradebook(input, sekolahId);
  }

  /**
   * Koreksi & submit lembar jawaban manual (LJM kertas / susulan)
   */
  async submitPaperExam(
    ujianId: string,
    siswaId: string,
    jawabanMap: Record<number, string>,
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ): Promise<HasilUjianCbtDTO> {
    const exam = await this.repo.findUjianById(ujianId, sekolahId);
    if (!exam) throw new CbtNotFoundError(`Ujian CBT ${ujianId} tidak ditemukan.`);

    await this.verifyTeacherAssignmentScope(
      exam.penugasan_mengajar_id,
      sekolahId,
      guruId,
      isSuperAdmin
    );

    return this.repo.submitPaperExam(ujianId, siswaId, jawabanMap, sekolahId);
  }

  /**
   * Ekstraksi visual foto Lembar Jawaban Manual via AI Vision
   */
  async scanPaperLjmPhoto(
    imageBase64: string,
    totalSoal: number,
    mimeType = "image/jpeg"
  ): Promise<{
    detectedAnswers: Record<number, string>;
    confidence: number;
    detectedStudentName?: string;
    detectedNis?: string;
    notes: string;
  }> {
    return this.repo.scanPaperLjmPhoto(imageBase64, totalSoal, mimeType);
  }
}

export const cbtService = new CbtService();
