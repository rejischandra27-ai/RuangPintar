/**
 * Ruang Pintar — Phase & Grade Level Application Service (M06)
 *
 * Mengelola struktur fase pendidikan dan tingkat kelas:
 * - Grade Level ≠ Phase (keduanya entitas terpisah)
 * - Multi-jenjang configurable (SD, SMP, SMA, SMK, UMUM)
 * - Ordering dan kode uniqueness per sekolah
 * - History protection: tingkat/fase yang dipakai di rombel tidak dapat dihapus sembarangan
 */

import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import {
  CreateGradeLevelInput,
  CreatePhaseInput,
  GradeLevelDTO,
  PhaseDTO,
  UpdateGradeLevelInput,
  UpdatePhaseInput,
} from "../domain/academic-types";
import {
  DuplicateGradeLevelError,
  DuplicatePhaseError,
  GradeLevelNotFoundError,
  HistoryProtectedError,
  PhaseNotFoundError,
} from "../domain/academic-errors";
import { academicRepository, AcademicRepository } from "../infrastructure/academic-repository";

export class PhaseGradeService {
  constructor(private repo: AcademicRepository = academicRepository) {}

  // =========================================================================
  // FASE
  // =========================================================================

  async getPhases(sekolahId: string): Promise<PhaseDTO[]> {
    return this.repo.findPhases(sekolahId);
  }

  async getPhaseById(id: string, sekolahId: string): Promise<PhaseDTO> {
    const phase = await this.repo.findPhaseById(id, sekolahId);
    if (!phase) {
      throw new PhaseNotFoundError(id);
    }
    return phase;
  }

  async createPhase(
    sekolahId: string,
    input: CreatePhaseInput,
    aktorId: string,
    aktorRole: string
  ): Promise<PhaseDTO> {
    const existing = await this.repo.findPhaseByKode(input.kode, sekolahId);
    if (existing) {
      throw new DuplicatePhaseError(input.kode);
    }

    const phase = await this.repo.createPhase(sekolahId, input);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "FASE",
      id_sumber: phase.id,
      aksi: "CREATE",
      payload_sesudah: phase as unknown as Record<string, unknown>,
    });

    return phase;
  }

  async updatePhase(
    id: string,
    sekolahId: string,
    input: UpdatePhaseInput,
    aktorId: string,
    aktorRole: string
  ): Promise<PhaseDTO> {
    const current = await this.getPhaseById(id, sekolahId);

    if (input.kode && input.kode !== current.kode) {
      const existing = await this.repo.findPhaseByKode(input.kode, sekolahId);
      if (existing && existing.id !== id) {
        throw new DuplicatePhaseError(input.kode);
      }
    }

    const updated = await this.repo.updatePhase(id, sekolahId, input);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "FASE",
      id_sumber: updated.id,
      aksi: "UPDATE",
      payload_sebelum: current as unknown as Record<string, unknown>,
      payload_sesudah: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deletePhase(
    id: string,
    sekolahId: string,
    aktorId: string,
    aktorRole: string
  ): Promise<void> {
    const current = await this.getPhaseById(id, sekolahId);

    if (
      (current.tingkat_count && current.tingkat_count > 0) ||
      (current.rombel_count && current.rombel_count > 0)
    ) {
      throw new HistoryProtectedError(
        "Fase",
        `terdapat ${current.tingkat_count ?? 0} tingkat kelas dan ${current.rombel_count ?? 0} rombel terhubung`
      );
    }

    await this.repo.deletePhase(id, sekolahId);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "FASE",
      id_sumber: id,
      aksi: "DELETE",
      payload_sebelum: current as unknown as Record<string, unknown>,
    });
  }

  // =========================================================================
  // TINGKAT KELAS
  // =========================================================================

  async getGradeLevels(sekolahId: string): Promise<GradeLevelDTO[]> {
    return this.repo.findGradeLevels(sekolahId);
  }

  async getGradeLevelById(id: string, sekolahId: string): Promise<GradeLevelDTO> {
    const grade = await this.repo.findGradeLevelById(id, sekolahId);
    if (!grade) {
      throw new GradeLevelNotFoundError(id);
    }
    return grade;
  }

  async createGradeLevel(
    sekolahId: string,
    input: CreateGradeLevelInput,
    aktorId: string,
    aktorRole: string
  ): Promise<GradeLevelDTO> {
    if (input.fase_id) {
      const phase = await this.repo.findPhaseById(input.fase_id, sekolahId);
      if (!phase) {
        throw new PhaseNotFoundError(input.fase_id);
      }
    }

    const existing = await this.repo.findGradeLevelByKode(input.kode, sekolahId);
    if (existing) {
      throw new DuplicateGradeLevelError(input.kode);
    }

    const grade = await this.repo.createGradeLevel(sekolahId, input);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "TINGKAT_KELAS",
      id_sumber: grade.id,
      aksi: "CREATE",
      payload_sesudah: grade as unknown as Record<string, unknown>,
    });

    return grade;
  }

  async updateGradeLevel(
    id: string,
    sekolahId: string,
    input: UpdateGradeLevelInput,
    aktorId: string,
    aktorRole: string
  ): Promise<GradeLevelDTO> {
    const current = await this.getGradeLevelById(id, sekolahId);

    if (input.fase_id) {
      const phase = await this.repo.findPhaseById(input.fase_id, sekolahId);
      if (!phase) {
        throw new PhaseNotFoundError(input.fase_id);
      }
    }

    if (input.kode && input.kode !== current.kode) {
      const existing = await this.repo.findGradeLevelByKode(input.kode, sekolahId);
      if (existing && existing.id !== id) {
        throw new DuplicateGradeLevelError(input.kode);
      }
    }

    const updated = await this.repo.updateGradeLevel(id, sekolahId, input);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "TINGKAT_KELAS",
      id_sumber: updated.id,
      aksi: "UPDATE",
      payload_sebelum: current as unknown as Record<string, unknown>,
      payload_sesudah: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteGradeLevel(
    id: string,
    sekolahId: string,
    aktorId: string,
    aktorRole: string
  ): Promise<void> {
    const current = await this.getGradeLevelById(id, sekolahId);

    if (current.rombel_count && current.rombel_count > 0) {
      throw new HistoryProtectedError(
        "Tingkat Kelas",
        `terdapat ${current.rombel_count} rombel yang menggunakan tingkat ini`
      );
    }

    await this.repo.deleteGradeLevel(id, sekolahId);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "TINGKAT_KELAS",
      id_sumber: id,
      aksi: "DELETE",
      payload_sebelum: current as unknown as Record<string, unknown>,
    });
  }
}

export const phaseGradeService = new PhaseGradeService();
