/**
 * Ruang Pintar — Rombel Application Service (M06)
 *
 * Mengelola definisi Rombongan Belajar (Kelompok Belajar Periodik):
 * - Rombel ≠ Student Identity ≠ Enrollment ≠ Placement (Phase 07 HANYA membuat definisi Rombel)
 * - School-aware & Period-aware (Tahun Ajaran)
 * - Unique nama rombel per Tahun Ajaran per sekolah
 * - Kapasitas rombel tervalidasi (1..100)
 * - Program & Fase bersifat opsional (mendukung SD/SMP/SMA/SMK)
 * - Cross-school reference validation
 */

import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import { CreateRombelInput, RombelDTO, UpdateRombelInput } from "../domain/academic-types";
import {
  AcademicYearNotFoundError,
  DuplicateRombelError,
  GradeLevelNotFoundError,
  PhaseNotFoundError,
  ProgramNotFoundError,
  RombelCapacityError,
  RombelNotFoundError,
  SemesterNotFoundError,
} from "../domain/academic-errors";
import { academicRepository, AcademicRepository } from "../infrastructure/academic-repository";

export class RombelService {
  constructor(private repo: AcademicRepository = academicRepository) {}

  async getRombels(sekolahId: string, tahunAjaranId?: string): Promise<RombelDTO[]> {
    return this.repo.findRombels(sekolahId, tahunAjaranId);
  }

  async getRombelById(id: string, sekolahId: string): Promise<RombelDTO> {
    const rombel = await this.repo.findRombelById(id, sekolahId);
    if (!rombel) {
      throw new RombelNotFoundError(id);
    }
    return rombel;
  }

  async createRombel(
    sekolahId: string,
    input: CreateRombelInput,
    aktorId: string,
    aktorRole: string
  ): Promise<RombelDTO> {
    // 1. Verifikasi Tahun Ajaran
    const parentYear = await this.repo.findAcademicYearById(input.tahun_ajaran_id, sekolahId);
    if (!parentYear) {
      throw new AcademicYearNotFoundError(input.tahun_ajaran_id);
    }

    // 2. Verifikasi Semester (jika ada)
    if (input.semester_id) {
      const semester = await this.repo.findSemesterById(input.semester_id, sekolahId);
      if (!semester || semester.tahun_ajaran_id !== input.tahun_ajaran_id) {
        throw new SemesterNotFoundError(input.semester_id);
      }
    }

    // 3. Verifikasi Tingkat Kelas
    const grade = await this.repo.findGradeLevelById(input.tingkat_id, sekolahId);
    if (!grade) {
      throw new GradeLevelNotFoundError(input.tingkat_id);
    }

    // 4. Verifikasi Fase (jika ada)
    if (input.fase_id) {
      const phase = await this.repo.findPhaseById(input.fase_id, sekolahId);
      if (!phase) {
        throw new PhaseNotFoundError(input.fase_id);
      }
    }

    // 5. Verifikasi Program (jika ada)
    if (input.program_id) {
      const prog = await this.repo.findProgramById(input.program_id, sekolahId);
      if (!prog) {
        throw new ProgramNotFoundError(input.program_id);
      }
    }

    // 6. Validasi Kapasitas
    if (input.kapasitas !== undefined && (input.kapasitas < 1 || input.kapasitas > 100)) {
      throw new RombelCapacityError();
    }

    // 7. Validasi Uniqueness nama per Tahun Ajaran
    const existing = await this.repo.findRombelByNama(input.tahun_ajaran_id, input.nama, sekolahId);
    if (existing) {
      throw new DuplicateRombelError(input.nama, parentYear.nama);
    }

    const rombel = await this.repo.createRombel(sekolahId, input);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "ROMBEL",
      id_sumber: rombel.id,
      aksi: "CREATE",
      payload_sesudah: rombel as unknown as Record<string, unknown>,
    });

    return rombel;
  }

  async updateRombel(
    id: string,
    sekolahId: string,
    input: UpdateRombelInput,
    aktorId: string,
    aktorRole: string
  ): Promise<RombelDTO> {
    const current = await this.getRombelById(id, sekolahId);

    const targetYearId = input.tahun_ajaran_id ?? current.tahun_ajaran_id;
    const parentYear = await this.repo.findAcademicYearById(targetYearId, sekolahId);
    if (!parentYear) {
      throw new AcademicYearNotFoundError(targetYearId);
    }

    if (input.semester_id) {
      const semester = await this.repo.findSemesterById(input.semester_id, sekolahId);
      if (!semester || semester.tahun_ajaran_id !== targetYearId) {
        throw new SemesterNotFoundError(input.semester_id);
      }
    }

    if (input.tingkat_id) {
      const grade = await this.repo.findGradeLevelById(input.tingkat_id, sekolahId);
      if (!grade) {
        throw new GradeLevelNotFoundError(input.tingkat_id);
      }
    }

    if (input.fase_id) {
      const phase = await this.repo.findPhaseById(input.fase_id, sekolahId);
      if (!phase) {
        throw new PhaseNotFoundError(input.fase_id);
      }
    }

    if (input.program_id) {
      const prog = await this.repo.findProgramById(input.program_id, sekolahId);
      if (!prog) {
        throw new ProgramNotFoundError(input.program_id);
      }
    }

    if (input.kapasitas !== undefined && (input.kapasitas < 1 || input.kapasitas > 100)) {
      throw new RombelCapacityError();
    }

    if (
      input.nama &&
      (input.nama !== current.nama || input.tahun_ajaran_id !== current.tahun_ajaran_id)
    ) {
      const existing = await this.repo.findRombelByNama(targetYearId, input.nama, sekolahId);
      if (existing && existing.id !== id) {
        throw new DuplicateRombelError(input.nama, parentYear.nama);
      }
    }

    const updated = await this.repo.updateRombel(id, sekolahId, input);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "ROMBEL",
      id_sumber: updated.id,
      aksi: "UPDATE",
      payload_sebelum: current as unknown as Record<string, unknown>,
      payload_sesudah: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteRombel(
    id: string,
    sekolahId: string,
    aktorId: string,
    aktorRole: string
  ): Promise<void> {
    const current = await this.getRombelById(id, sekolahId);

    await this.repo.deleteRombel(id, sekolahId);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "ROMBEL",
      id_sumber: id,
      aksi: "ARCHIVE",
      payload_sebelum: current as unknown as Record<string, unknown>,
    });
  }
}

export const rombelService = new RombelService();
