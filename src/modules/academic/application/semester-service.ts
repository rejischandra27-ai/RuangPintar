/**
 * Ruang Pintar — Semester Application Service (M06)
 *
 * Mengelola siklus semester di dalam tahun ajaran:
 * - Belongs to Academic Year
 * - Start date < End date
 * - Semester dates within Academic Year bounds
 * - Unique semester kode per Academic Year
 * - Single-active semester per school (history preserving)
 */

import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import { CreateSemesterInput, SemesterDTO, UpdateSemesterInput } from "../domain/academic-types";
import {
  AcademicYearNotFoundError,
  DuplicateSemesterError,
  HistoryProtectedError,
  InvalidDateRangeError,
  SemesterNotFoundError,
  SemesterOutOfBoundsError,
} from "../domain/academic-errors";
import { academicRepository, AcademicRepository } from "../infrastructure/academic-repository";

export class SemesterService {
  constructor(private repo: AcademicRepository = academicRepository) {}

  async getSemesters(sekolahId: string, tahunAjaranId?: string): Promise<SemesterDTO[]> {
    return this.repo.findSemesters(sekolahId, tahunAjaranId);
  }

  async getSemesterById(id: string, sekolahId: string): Promise<SemesterDTO> {
    const sem = await this.repo.findSemesterById(id, sekolahId);
    if (!sem) {
      throw new SemesterNotFoundError(id);
    }
    return sem;
  }

  async getActiveSemester(sekolahId: string): Promise<SemesterDTO | null> {
    return this.repo.findActiveSemester(sekolahId);
  }

  async createSemester(
    sekolahId: string,
    input: CreateSemesterInput,
    aktorId: string,
    aktorRole: string
  ): Promise<SemesterDTO> {
    const parentYear = await this.repo.findAcademicYearById(input.tahun_ajaran_id, sekolahId);
    if (!parentYear) {
      throw new AcademicYearNotFoundError(input.tahun_ajaran_id);
    }

    const startDate = new Date(input.tanggal_mulai);
    const endDate = new Date(input.tanggal_selesai);

    if (startDate >= endDate) {
      throw new InvalidDateRangeError(
        "Tanggal mulai semester harus lebih awal daripada tanggal selesai."
      );
    }

    // Validasi semester berada dalam rentang tahun ajaran
    if (startDate < parentYear.tanggal_mulai || endDate > parentYear.tanggal_selesai) {
      throw new SemesterOutOfBoundsError(
        `Rentang tanggal semester (${startDate.toISOString().split("T")[0]} s.d ${
          endDate.toISOString().split("T")[0]
        }) harus berada di dalam rentang tahun ajaran (${
          parentYear.tanggal_mulai.toISOString().split("T")[0]
        } s.d ${parentYear.tanggal_selesai.toISOString().split("T")[0]}).`
      );
    }

    const existing = await this.repo.findSemesterByKode(input.tahun_ajaran_id, input.kode);
    if (existing) {
      throw new DuplicateSemesterError(input.kode, parentYear.nama);
    }

    if (input.status === "AKTIF") {
      await this.repo.setAllSemestersInactive(sekolahId);
    }

    const semester = await this.repo.createSemester(sekolahId, {
      ...input,
      tanggal_mulai: startDate,
      tanggal_selesai: endDate,
    });

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "SEMESTER",
      id_sumber: semester.id,
      aksi: "CREATE",
      payload_sesudah: semester as unknown as Record<string, unknown>,
    });

    return semester;
  }

  async updateSemester(
    id: string,
    sekolahId: string,
    input: UpdateSemesterInput,
    aktorId: string,
    aktorRole: string
  ): Promise<SemesterDTO> {
    const current = await this.getSemesterById(id, sekolahId);
    const parentYear = await this.repo.findAcademicYearById(current.tahun_ajaran_id, sekolahId);
    if (!parentYear) {
      throw new AcademicYearNotFoundError(current.tahun_ajaran_id);
    }

    const startDate = input.tanggal_mulai ? new Date(input.tanggal_mulai) : current.tanggal_mulai;
    const endDate = input.tanggal_selesai
      ? new Date(input.tanggal_selesai)
      : current.tanggal_selesai;

    if (startDate >= endDate) {
      throw new InvalidDateRangeError(
        "Tanggal mulai semester harus lebih awal daripada tanggal selesai."
      );
    }

    if (startDate < parentYear.tanggal_mulai || endDate > parentYear.tanggal_selesai) {
      throw new SemesterOutOfBoundsError(
        `Rentang tanggal semester harus berada di dalam rentang tahun ajaran (${parentYear.nama}).`
      );
    }

    if (input.kode && input.kode !== current.kode) {
      const existing = await this.repo.findSemesterByKode(current.tahun_ajaran_id, input.kode);
      if (existing && existing.id !== id) {
        throw new DuplicateSemesterError(input.kode, parentYear.nama);
      }
    }

    if (input.status === "AKTIF" && current.status !== "AKTIF") {
      await this.repo.setAllSemestersInactive(sekolahId, id);
    }

    const updated = await this.repo.updateSemester(id, sekolahId, {
      ...input,
      tanggal_mulai: startDate,
      tanggal_selesai: endDate,
    });

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "SEMESTER",
      id_sumber: updated.id,
      aksi: "UPDATE",
      payload_sebelum: current as unknown as Record<string, unknown>,
      payload_sesudah: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async activateSemester(
    id: string,
    sekolahId: string,
    aktorId: string,
    aktorRole: string
  ): Promise<SemesterDTO> {
    const current = await this.getSemesterById(id, sekolahId);

    // Deactivate existing active semesters
    await this.repo.setAllSemestersInactive(sekolahId, id);

    const updated = await this.repo.updateSemester(id, sekolahId, {
      status: "AKTIF",
    });

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "SEMESTER",
      id_sumber: updated.id,
      aksi: "ACTIVATE_PERIOD",
      payload_sebelum: current as unknown as Record<string, unknown>,
      payload_sesudah: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteSemester(
    id: string,
    sekolahId: string,
    aktorId: string,
    aktorRole: string
  ): Promise<void> {
    const current = await this.getSemesterById(id, sekolahId);

    if (current.rombel_count && current.rombel_count > 0) {
      throw new HistoryProtectedError(
        "Semester",
        `terdapat ${current.rombel_count} rombel yang terkait dengan semester ini`
      );
    }

    await this.repo.deleteSemester(id, sekolahId);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "SEMESTER",
      id_sumber: id,
      aksi: "DELETE",
      payload_sebelum: current as unknown as Record<string, unknown>,
    });
  }
}

export const semesterService = new SemesterService();
