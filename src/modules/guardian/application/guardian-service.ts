/**
 * Ruang Pintar — M15 Guardian & Family Application Service
 * Layanan orkestrasi bisnis portal wali murid dengan penegakan batasan relasi sah.
 */

import { AuthenticatedUser } from "@/shared/infrastructure/auth/auth-service";
import { GuardianRepository } from "../infrastructure/guardian-repository";
import {
  GuardianDashboardData,
  ChildActiveContext,
  ChildAttendanceRecap,
  ChildAttendanceHistoryItem,
  ChildAssignmentSummaryItem,
  ChildCbtSummaryItem,
  ChildPublishedGradeItem,
  ChildReportCardSummary,
  PengajuanWaliItem,
  LinkedChildSummary,
  StudentClaimVerificationInput,
  StudentClaimPreviewDTO,
  ConfirmStudentClaimInput,
  StudentClaimResultDTO,
  GuardianRegistrationInput,
  GuardianProfile,
} from "../domain/guardian-types";
import {
  PengajuanWaliFormInput,
  PengajuanWaliSchema,
  StudentClaimVerificationSchema,
  ConfirmStudentClaimSchema,
  GuardianRegistrationSchema,
} from "../domain/guardian-validation";
import {
  ChildNotLinkedError,
  GuardianNotFoundError,
  PengajuanWaliValidationError,
  UnauthorizedGuardianActionError,
  StudentNotFoundError,
  StudentVerificationMismatchError,
  DuplicateGuardianClaimError,
  CrossTenantClaimError,
} from "../domain/guardian-errors";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { identityService } from "@/shared/infrastructure/auth/identity-service";
import { generateUlid } from "@/shared/lib/ulid";
import {
  generateSessionToken,
  hashSessionToken,
  SESSION_DURATION_STANDARD_MS,
} from "@/shared/lib/session";

export class GuardianService {
  constructor(private readonly repo: GuardianRepository = new GuardianRepository()) {}

  /**
   * Mengambil data dashboard portal wali murid
   */
  async getDashboardData(
    actor: AuthenticatedUser,
    requestedStudentId?: string
  ): Promise<GuardianDashboardData> {
    this.assertGuardianRole(actor);

    const guardian = await this.repo.getGuardianProfileByUserId(actor.id);
    if (!guardian || guardian.sekolah_id !== actor.sekolah_id) {
      throw new GuardianNotFoundError(`User ${actor.id} (${actor.username})`);
    }

    const linkedChildren = await this.repo.getLinkedChildren(guardian.id);
    if (linkedChildren.length === 0) {
      throw new ChildNotLinkedError(guardian.id, requestedStudentId || "NONE");
    }

    // Tentukan anak aktif: jika requestedStudentId valid, gunakan itu; jika tidak, pilih anak pertama
    let activeStudent: LinkedChildSummary | undefined;
    if (requestedStudentId) {
      activeStudent = linkedChildren.find((c) => c.siswa_id === requestedStudentId);
    }
    if (!activeStudent) {
      activeStudent = linkedChildren[0];
    }

    const targetStudentId = activeStudent.siswa_id;

    // Ambil detail anak aktif
    const [
      activeChild,
      attendanceRecap,
      upcomingAssignments,
      upcomingCbt,
      recentPublishedGrades,
      recentPengajuan,
    ] = await Promise.all([
      this.repo.getActiveChildContext(guardian.id, targetStudentId),
      this.repo.getChildAttendanceRecap(targetStudentId),
      this.repo.getChildUpcomingAssignments(targetStudentId, 6),
      this.repo.getChildUpcomingCbt(targetStudentId, 4),
      this.repo.getChildPublishedGrades(targetStudentId, 6),
      this.repo.getPengajuanList(guardian.id, targetStudentId),
    ]);

    return {
      guardian,
      linkedChildren,
      activeChild,
      attendanceRecap,
      upcomingAssignments,
      upcomingCbt,
      recentPublishedGrades,
      recentPengajuan,
    };
  }

  /**
   * Mengambil seluruh data presensi anak terpilih
   */
  async getChildAttendance(
    actor: AuthenticatedUser,
    targetStudentId?: string
  ): Promise<{
    activeChild: ChildActiveContext;
    linkedChildren: LinkedChildSummary[];
    recap: ChildAttendanceRecap;
    history: ChildAttendanceHistoryItem[];
  }> {
    this.assertGuardianRole(actor);

    const guardian = await this.repo.getGuardianProfileByUserId(actor.id);
    if (!guardian || guardian.sekolah_id !== actor.sekolah_id) {
      throw new GuardianNotFoundError(actor.id);
    }

    const linkedChildren = await this.repo.getLinkedChildren(guardian.id);
    if (linkedChildren.length === 0) {
      throw new ChildNotLinkedError(guardian.id, targetStudentId || "NONE");
    }

    const selectedChild = targetStudentId
      ? linkedChildren.find((c) => c.siswa_id === targetStudentId) || linkedChildren[0]
      : linkedChildren[0];

    const studentId = selectedChild.siswa_id;
    await this.repo.assertVerifiedRelationship(guardian.id, studentId);

    const [activeChild, recap, history] = await Promise.all([
      this.repo.getActiveChildContext(guardian.id, studentId),
      this.repo.getChildAttendanceRecap(studentId),
      this.repo.getChildAttendanceHistory(studentId, 50),
    ]);

    return {
      activeChild,
      linkedChildren,
      recap,
      history,
    };
  }

  /**
   * Mengambil perkembangan nilai dan rapor anak terpilih
   */
  async getChildGradesAndReport(
    actor: AuthenticatedUser,
    targetStudentId?: string
  ): Promise<{
    activeChild: ChildActiveContext;
    linkedChildren: LinkedChildSummary[];
    publishedGrades: ChildPublishedGradeItem[];
    reportCard: ChildReportCardSummary;
  }> {
    this.assertGuardianRole(actor);

    const guardian = await this.repo.getGuardianProfileByUserId(actor.id);
    if (!guardian || guardian.sekolah_id !== actor.sekolah_id) {
      throw new GuardianNotFoundError(actor.id);
    }

    const linkedChildren = await this.repo.getLinkedChildren(guardian.id);
    if (linkedChildren.length === 0) {
      throw new ChildNotLinkedError(guardian.id, targetStudentId || "NONE");
    }

    const selectedChild = targetStudentId
      ? linkedChildren.find((c) => c.siswa_id === targetStudentId) || linkedChildren[0]
      : linkedChildren[0];

    const studentId = selectedChild.siswa_id;
    await this.repo.assertVerifiedRelationship(guardian.id, studentId);

    const [activeChild, publishedGrades, reportCard] = await Promise.all([
      this.repo.getActiveChildContext(guardian.id, studentId),
      this.repo.getChildPublishedGrades(studentId, 50),
      this.repo.getChildReportCard(studentId),
    ]);

    return {
      activeChild,
      linkedChildren,
      publishedGrades,
      reportCard,
    };
  }

  /**
   * Mengajukan permohonan izin sakit atau dispensasi kegiatan oleh orang tua
   */
  async submitPengajuanIzin(
    actor: AuthenticatedUser,
    rawInput: unknown
  ): Promise<PengajuanWaliItem> {
    this.assertGuardianRole(actor);

    const parseResult = PengajuanWaliSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errMsgs = parseResult.error.issues.map((i) => i.message).join(", ");
      throw new PengajuanWaliValidationError(errMsgs);
    }

    const guardian = await this.repo.getGuardianProfileByUserId(actor.id);
    if (!guardian || guardian.sekolah_id !== actor.sekolah_id) {
      throw new GuardianNotFoundError(actor.id);
    }

    const input = parseResult.data;
    await this.repo.assertVerifiedRelationship(guardian.id, input.siswa_id);

    const result = await this.repo.createPengajuan(guardian.id, input);

    // Rekam log audit
    await recordAuditEvent({
      sekolah_id: guardian.sekolah_id,
      aktor_id: actor.id,
      aktor_role: "GUARDIAN",
      aksi: "SUBMIT_PENGAJUAN_IZIN_WALI",
      tipe_sumber: "PengajuanWali",
      id_sumber: result.id,
      payload_sesudah: {
        siswa_id: result.siswa_id,
        tipe: result.tipe,
        judul: result.judul,
      },
    });

    return result;
  }

  /**
   * Memvalidasi bahwa aktor wali memiliki profil sah di sekolah aktif dan terhubung dengan siswa
   */
  async verifyGuardianChildAccess(actor: AuthenticatedUser, studentId: string): Promise<void> {
    this.assertGuardianRole(actor);
    const guardian = await this.repo.getGuardianProfileByUserId(actor.id);
    if (!guardian || guardian.sekolah_id !== actor.sekolah_id) {
      throw new GuardianNotFoundError(actor.id);
    }
    await this.repo.assertVerifiedRelationship(guardian.id, studentId);
  }

  /**
   * Fitur 01 & 02: Memvalidasi data verifikasi identitas siswa dan mengembalikan pratinjau aman
   */
  async previewStudentClaim(
    actor: AuthenticatedUser,
    rawInput: unknown
  ): Promise<StudentClaimPreviewDTO> {
    this.assertGuardianRole(actor);

    const parseResult = StudentClaimVerificationSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errMsgs = parseResult.error.issues.map((i) => i.message).join(", ");
      throw new PengajuanWaliValidationError(errMsgs);
    }

    const input = parseResult.data;

    if (!actor.sekolah_id) {
      throw new UnauthorizedGuardianActionError(
        "Akun belum terhubung dengan institusi sekolah aktif."
      );
    }
    const sekolahId = actor.sekolah_id;

    let guardian = await this.repo.getGuardianProfileByUserId(actor.id);
    if (!guardian) {
      guardian = await this.repo.ensureGuardianProfile(actor.id, sekolahId, {
        nama_lengkap: actor.nama_lengkap,
        email: actor.email,
        no_telepon: null,
      });
    }

    try {
      const preview = await this.repo.findStudentForVerification(sekolahId, input);

      // Proteksi Klaim Duplikat (Fitur 05)
      const existing = await this.repo.checkExistingRelationship(guardian.id, preview.siswa_id);
      if (existing) {
        throw new DuplicateGuardianClaimError(
          `Siswa "${preview.nama_lengkap}" sudah terhubung dengan akun wali Anda.`
        );
      }

      // Log Audit (Fitur 07): Guardian claim initiated
      await recordAuditEvent({
        sekolah_id: sekolahId,
        aktor_id: actor.id,
        aktor_role: "GUARDIAN",
        aksi: "GUARDIAN_CLAIM_INITIATED",
        tipe_sumber: "Siswa",
        id_sumber: preview.siswa_id,
        payload_sesudah: {
          siswa_id: preview.siswa_id,
          nama_lengkap: preview.nama_lengkap,
          rombel_nama: preview.rombel_nama,
        },
      });

      return preview;
    } catch (error) {
      // Log Audit (Fitur 07): Guardian claim rejected / failed
      await recordAuditEvent({
        sekolah_id: sekolahId,
        aktor_id: actor.id,
        aktor_role: "GUARDIAN",
        aksi: "GUARDIAN_CLAIM_REJECTED",
        tipe_sumber: "Siswa",
        id_sumber: input.nis || input.nisn || input.nama_lengkap,
        payload_sesudah: {
          alasan: error instanceof Error ? error.message : "Gagal verifikasi identitas siswa",
          input,
        },
      });
      throw error;
    }
  }

  /**
   * Fitur 01 & 04 & 05: Mengonfirmasi klaim siswa dan membentuk relasi sah (HubunganWaliSiswa)
   */
  async confirmStudentClaim(
    actor: AuthenticatedUser,
    rawInput: unknown
  ): Promise<StudentClaimResultDTO> {
    this.assertGuardianRole(actor);

    const parseResult = ConfirmStudentClaimSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errMsgs = parseResult.error.issues.map((i) => i.message).join(", ");
      throw new PengajuanWaliValidationError(errMsgs);
    }

    const input = parseResult.data;

    if (!actor.sekolah_id) {
      throw new UnauthorizedGuardianActionError(
        "Akun belum terhubung dengan institusi sekolah aktif."
      );
    }
    const sekolahId = actor.sekolah_id;

    let guardian = await this.repo.getGuardianProfileByUserId(actor.id);
    if (!guardian) {
      guardian = await this.repo.ensureGuardianProfile(actor.id, sekolahId, {
        nama_lengkap: actor.nama_lengkap,
        email: actor.email,
        no_telepon: null,
      });
    }

    // Tenant Isolation Check (Fitur 06)
    const student = await prisma.siswa.findUnique({
      where: { id: input.siswa_id },
      include: { sekolah: true },
    });

    if (!student) {
      throw new StudentNotFoundError(input.siswa_id);
    }

    if (student.sekolah_id !== sekolahId) {
      await recordAuditEvent({
        sekolah_id: sekolahId,
        aktor_id: actor.id,
        aktor_role: "GUARDIAN",
        aksi: "GUARDIAN_CLAIM_REJECTED",
        tipe_sumber: "Siswa",
        id_sumber: input.siswa_id,
        payload_sesudah: {
          alasan: "Percobaan klaim siswa sekolah berbeda (cross-tenant violation)",
        },
      });
      throw new CrossTenantClaimError(
        "Akses ditolak. Siswa berada di institusi sekolah yang berbeda dengan akun Anda."
      );
    }

    // Proteksi Klaim Duplikat (Fitur 05)
    const existing = await this.repo.checkExistingRelationship(guardian.id, student.id);
    if (existing) {
      throw new DuplicateGuardianClaimError(
        `Anda sudah memiliki hubungan (${existing.jenis_hubungan}) yang terdaftar dengan siswa ${student.nama_lengkap}.`
      );
    }

    // Buat relasi terverifikasi
    const createdRelation = await this.repo.createHubunganWali({
      sekolah_id: sekolahId,
      wali_id: guardian.id,
      siswa_id: student.id,
      jenis_hubungan: input.jenis_hubungan,
      apakah_wali_utama: input.apakah_wali_utama ?? false,
      status_verifikasi: "TERVERIFIKASI",
      catatan: input.catatan,
    });

    // Log Audit (Fitur 07): Guardian claim approved & linked
    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: actor.id,
      aktor_role: "GUARDIAN",
      aksi: "GUARDIAN_LINKED_TO_STUDENT",
      tipe_sumber: "HubunganWaliSiswa",
      id_sumber: createdRelation.id,
      payload_sesudah: {
        wali_id: guardian.id,
        siswa_id: student.id,
        nama_siswa: student.nama_lengkap,
        jenis_hubungan: input.jenis_hubungan,
        apakah_wali_utama: input.apakah_wali_utama,
      },
    });

    return {
      hubungan_id: createdRelation.id,
      wali_id: guardian.id,
      siswa_id: student.id,
      nama_siswa: student.nama_lengkap,
      jenis_hubungan: input.jenis_hubungan,
      status_verifikasi: "TERVERIFIKASI",
      apakah_wali_utama: input.apakah_wali_utama ?? false,
      pesan: `Berhasil menghubungkan data putra/putri Anda: ${student.nama_lengkap}.`,
    };
  }

  /**
   * Pendaftaran akun Orang Tua / Wali Murid secara mandiri (Self-Registration)
   */
  async registerGuardian(rawInput: unknown): Promise<{
    user: any;
    guardian: GuardianProfile;
    rawSessionToken: string;
  }> {
    const parseResult = GuardianRegistrationSchema.safeParse(rawInput);
    if (!parseResult.success) {
      const errMsgs = parseResult.error.issues.map((i) => i.message).join(", ");
      throw new PengajuanWaliValidationError(errMsgs);
    }

    const input = parseResult.data;

    // Pastikan sekolah tujuan valid
    const school = await prisma.sekolah.findUnique({
      where: { id: input.sekolah_id },
    });
    if (!school) {
      throw new Error("Sekolah tujuan tidak ditemukan.");
    }

    // Buat akun pengguna identity
    const user = await identityService.createAccount({
      sekolah_id: school.id,
      username: input.username,
      nama_lengkap: input.nama_lengkap,
      email: input.email || null,
      password: input.password,
      peran_dasar: "GUARDIAN",
      status_akun: "AKTIF",
      harus_ganti_password: false,
    });

    // Buat keanggotaan sekolah tenant aktif
    const keanggotaanId = generateUlid();
    await prisma.keanggotaanSekolah.create({
      data: {
        id: keanggotaanId,
        pengguna_id: user.id,
        sekolah_id: school.id,
        peran_dasar_di_tenant: "GUARDIAN",
        status_keanggotaan: "ACTIVE",
        sumber_pendaftaran: "SELF_REGISTER",
        disetujui_pada: new Date(),
      },
    });

    // Buat profil wali murid
    const guardian = await this.repo.ensureGuardianProfile(user.id, school.id, {
      nama_lengkap: input.nama_lengkap,
      email: input.email,
      no_telepon: input.no_telepon,
    });

    // Buat sesi login (sekolah_aktif_id null sampai disetujui / diklaim)
    const rawSessionToken = generateSessionToken();
    const hashedSessionToken = hashSessionToken(rawSessionToken);

    await prisma.sesiPengguna.create({
      data: {
        id: generateUlid(),
        pengguna_id: user.id,
        sekolah_aktif_id: null,
        token_hash: hashedSessionToken,
        ip_address: "127.0.0.1",
        user_agent: "Ruang Pintar Guardian Registration",
        berlaku_sampai: new Date(Date.now() + SESSION_DURATION_STANDARD_MS),
      },
    });

    // Rekam log audit
    await recordAuditEvent({
      sekolah_id: school.id,
      aktor_id: user.id,
      aktor_role: "GUARDIAN",
      aksi: "GUARDIAN_ACCOUNT_REGISTERED",
      tipe_sumber: "WaliMurid",
      id_sumber: guardian.id,
      payload_sesudah: {
        pengguna_id: user.id,
        username: user.username,
        sekolah_id: school.id,
      },
    });

    return {
      user,
      guardian,
      rawSessionToken,
    };
  }

  /**
   * Memastikan pengguna memiliki peran dasar GUARDIAN
   */
  private assertGuardianRole(actor: AuthenticatedUser): void {
    if (actor.peran_dasar !== "GUARDIAN") {
      throw new UnauthorizedGuardianActionError(
        `Akses hanya diizinkan untuk peran GUARDIAN. Peran saat ini: ${actor.peran_dasar}`
      );
    }
  }
}
