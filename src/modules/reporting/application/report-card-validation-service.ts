/**
 * Ruang Pintar — Module M18: Digital Report Card Engine
 * Application Service: ReportCardValidationService
 *
 * Mengelola aturan validasi integritas rapor:
 * - Pemeriksaan kelengkapan nilai (Missing Grade ≠ Zero Grade)
 * - Pemeriksaan duplikasi mata pelajaran
 * - Validasi transisi status (DRAFT -> VALIDATED -> PUBLISHED)
 * - Otorisasi peran per transisi
 */

import {
  ReportCardData,
  ReportCardStatus,
  ValidationResult,
  ValidationIssue,
} from "../domain/report-card-types";
import {
  ReportCardValidationError,
  ReportCardInvalidStateTransitionError,
  UnauthorizedReportCardAccessError,
} from "../domain/report-card-errors";
import {
  reportCardRepository,
  ReportCardRepository,
} from "../infrastructure/report-card-repository";

export class ReportCardValidationService {
  constructor(private readonly repo: ReportCardRepository = reportCardRepository) {}

  /**
   * Memeriksa integritas data rapor siswa sebelum divalidasi atau dipublikasikan.
   */
  validateReportCard(reportCard: ReportCardData): ValidationResult {
    const issues: ValidationIssue[] = [];

    // 1. Validasi semester & tahun ajaran
    if (!reportCard.siswa.semesterId || !reportCard.siswa.tahunAjaranId) {
      issues.push({
        kode: "INVALID_SEMESTER",
        pesan: "Semester atau Tahun Ajaran tidak teridentifikasi pada penempatan siswa.",
      });
    }

    // 2. Validasi duplikasi mata pelajaran
    const mapelIdSet = new Set<string>();
    for (const m of reportCard.mataPelajaranList) {
      if (mapelIdSet.has(m.mataPelajaranId)) {
        issues.push({
          kode: "DUPLICATE_SUBJECT",
          pesan: `Mata pelajaran '${m.mataPelajaranNama}' terdaftar lebih dari satu kali di rombel.`,
          mataPelajaranId: m.mataPelajaranId,
        });
      }
      mapelIdSet.add(m.mataPelajaranId);
    }

    // 3. Validasi kelengkapan nilai (Missing Grade != Zero Grade)
    const missingSubjects = reportCard.mataPelajaranList.filter((m) => m.hasMissingGrade);
    if (missingSubjects.length > 0) {
      for (const m of missingSubjects) {
        issues.push({
          kode: "MISSING_GRADE",
          pesan: `Nilai akhir belum tersedia untuk mata pelajaran '${m.mataPelajaranNama}'. Asesmen belum dinilai atau belum diterbitkan.`,
          mataPelajaranId: m.mataPelajaranId,
        });
      }
    }

    // 4. Validasi catatan wali kelas
    if (!reportCard.catatanWaliKelas || reportCard.catatanWaliKelas.trim().length < 5) {
      issues.push({
        kode: "EMPTY_NOTES",
        pesan: "Catatan wali kelas masih kosong atau terlalu singkat.",
      });
    }

    const hasCriticalIssues = issues.some(
      (i) => i.kode === "INVALID_SEMESTER" || i.kode === "DUPLICATE_SUBJECT"
    );

    const hasMissingGrades = issues.some((i) => i.kode === "MISSING_GRADE");

    // Dapat divalidasi jika tidak ada issue kritis dan catatan sudah ada
    // (Peringatan missing grades diperbolehkan untuk validasi bersyarat, tetapi tidak untuk publikasi final)
    const canValidate =
      !hasCriticalIssues && issues.filter((i) => i.kode === "EMPTY_NOTES").length === 0;
    const canPublish = !hasCriticalIssues && !hasMissingGrades && canValidate;

    return {
      isValid: issues.length === 0,
      canValidate,
      canPublish,
      issues,
    };
  }

  /**
   * Menjalankan transisi status siklus rapor dengan verifikasi otorisasi & rule check.
   */
  async transitionStatus(params: {
    raporId: string;
    sekolahId: string;
    targetStatus: ReportCardStatus;
    actorRole: string;
    actorName: string;
    currentReportData?: ReportCardData;
  }) {
    const { raporId, sekolahId, targetStatus, actorRole, actorName, currentReportData } = params;

    const existing = await this.repo.findById(raporId, sekolahId);
    if (!existing) {
      throw new ReportCardValidationError("Record rapor siswa tidak ditemukan.");
    }

    const currentStatus = existing.status as ReportCardStatus;

    // Periksa transisi status
    if (currentStatus === targetStatus) {
      return existing; // Idempoten
    }

    // Matriks otorisasi peran
    const isWaliOrAdmin =
      actorRole === "TEACHER" || actorRole === "SUPER_ADMIN" || actorRole === "SCHOOL_STAFF";

    if (!isWaliOrAdmin) {
      throw new UnauthorizedReportCardAccessError();
    }

    if (targetStatus === "VALIDATED") {
      if (currentStatus !== "DRAFT" && currentStatus !== "PUBLISHED") {
        throw new ReportCardInvalidStateTransitionError(currentStatus, targetStatus);
      }

      if (currentReportData) {
        const check = this.validateReportCard(currentReportData);
        if (!check.canValidate) {
          throw new ReportCardValidationError(
            `Rapor belum dapat divalidasi: ${check.issues.map((i) => i.pesan).join("; ")}`
          );
        }
      }
    } else if (targetStatus === "PUBLISHED") {
      if (currentStatus !== "VALIDATED" && currentStatus !== "DRAFT") {
        throw new ReportCardInvalidStateTransitionError(currentStatus, targetStatus);
      }

      if (currentReportData) {
        const check = this.validateReportCard(currentReportData);
        if (!check.canPublish) {
          throw new ReportCardValidationError(
            `Rapor belum memenuhi syarat penerbitan: ${check.issues.map((i) => i.pesan).join("; ")}`
          );
        }
      }
    } else if (targetStatus === "DRAFT") {
      // Membuka kembali rapor untuk revisi
      // DRAFT selalu diperbolehkan untuk koreksi wali kelas
    }

    return this.repo.updateStatus(raporId, sekolahId, targetStatus, actorName);
  }
}

export const reportCardValidationService = new ReportCardValidationService();
