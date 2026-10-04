/**
 * Ruang Pintar — Academic Program Application Service (M06)
 *
 * Mengelola program keahlian / jurusan / konsentrasi akademik:
 * - Configurable & optional (aman untuk SD/SMP/SMA Umum/SMK)
 * - Kode program unique per sekolah
 * - History protection: program yang dipakai di rombel tidak dapat dihapus sembarangan
 */

import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import {
  AcademicProgramDTO,
  CreateProgramInput,
  UpdateProgramInput,
} from "../domain/academic-types";
import {
  DuplicateProgramError,
  HistoryProtectedError,
  ProgramNotFoundError,
} from "../domain/academic-errors";
import { academicRepository, AcademicRepository } from "../infrastructure/academic-repository";

export class ProgramService {
  constructor(private repo: AcademicRepository = academicRepository) {}

  async getPrograms(sekolahId: string): Promise<AcademicProgramDTO[]> {
    return this.repo.findPrograms(sekolahId);
  }

  async getProgramById(id: string, sekolahId: string): Promise<AcademicProgramDTO> {
    const prog = await this.repo.findProgramById(id, sekolahId);
    if (!prog) {
      throw new ProgramNotFoundError(id);
    }
    return prog;
  }

  async createProgram(
    sekolahId: string,
    input: CreateProgramInput,
    aktorId: string,
    aktorRole: string
  ): Promise<AcademicProgramDTO> {
    const existing = await this.repo.findProgramByKode(input.kode, sekolahId);
    if (existing) {
      throw new DuplicateProgramError(input.kode);
    }

    const program = await this.repo.createProgram(sekolahId, input);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "PROGRAM_KEAHLIAN",
      id_sumber: program.id,
      aksi: "CREATE",
      payload_sesudah: program as unknown as Record<string, unknown>,
    });

    return program;
  }

  async updateProgram(
    id: string,
    sekolahId: string,
    input: UpdateProgramInput,
    aktorId: string,
    aktorRole: string
  ): Promise<AcademicProgramDTO> {
    const current = await this.getProgramById(id, sekolahId);

    if (input.kode && input.kode !== current.kode) {
      const existing = await this.repo.findProgramByKode(input.kode, sekolahId);
      if (existing && existing.id !== id) {
        throw new DuplicateProgramError(input.kode);
      }
    }

    const updated = await this.repo.updateProgram(id, sekolahId, input);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "PROGRAM_KEAHLIAN",
      id_sumber: updated.id,
      aksi: "UPDATE",
      payload_sebelum: current as unknown as Record<string, unknown>,
      payload_sesudah: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteProgram(
    id: string,
    sekolahId: string,
    aktorId: string,
    aktorRole: string
  ): Promise<void> {
    const current = await this.getProgramById(id, sekolahId);

    if (current.rombel_count && current.rombel_count > 0) {
      throw new HistoryProtectedError(
        "Program Keahlian",
        `terdapat ${current.rombel_count} rombel yang terkait dengan program ini`
      );
    }

    await this.repo.deleteProgram(id, sekolahId);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "PROGRAM_KEAHLIAN",
      id_sumber: id,
      aksi: "DELETE",
      payload_sebelum: current as unknown as Record<string, unknown>,
    });
  }
}

export const programService = new ProgramService();
