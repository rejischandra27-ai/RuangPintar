/**
 * Ruang Pintar — Academic Year Application Service (M06)
 *
 * Mengelola siklus tahun ajaran sekolah dengan proteksi integritas:
 * - Start date < End date
 * - School uniqueness
 * - History preservation (periode lama tidak hilang saat periode baru aktif)
 * - Single-active period activation rule (mengarsip/menyelesaikan periode lama secara teratur)
 */

import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import {
  AcademicYearDTO,
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
} from "../domain/academic-types";
import {
  AcademicYearNotFoundError,
  DuplicateAcademicYearError,
  HistoryProtectedError,
  InvalidDateRangeError,
} from "../domain/academic-errors";
import { academicRepository, AcademicRepository } from "../infrastructure/academic-repository";

export class AcademicYearService {
  constructor(private repo: AcademicRepository = academicRepository) {}

  async getAcademicYears(sekolahId: string): Promise<AcademicYearDTO[]> {
    return this.repo.findAcademicYears(sekolahId);
  }

  async getAcademicYearById(id: string, sekolahId: string): Promise<AcademicYearDTO> {
    const year = await this.repo.findAcademicYearById(id, sekolahId);
    if (!year) {
      throw new AcademicYearNotFoundError(id);
    }
    return year;
  }

  async getActiveAcademicYear(sekolahId: string): Promise<AcademicYearDTO | null> {
    return this.repo.findActiveAcademicYear(sekolahId);
  }

  async createAcademicYear(
    sekolahId: string,
    input: CreateAcademicYearInput,
    aktorId: string,
    aktorRole: string
  ): Promise<AcademicYearDTO> {
    const startDate = new Date(input.tanggal_mulai);
    const endDate = new Date(input.tanggal_selesai);

    if (startDate >= endDate) {
      throw new InvalidDateRangeError(
        "Tanggal mulai tahun ajaran harus lebih awal daripada tanggal selesai."
      );
    }

    const existing = await this.repo.findAcademicYearByNama(input.nama, sekolahId);
    if (existing) {
      throw new DuplicateAcademicYearError(input.nama);
    }

    // Jika status diset AKTIF langsung, selesaikan tahun ajaran aktif sebelumnya
    if (input.status === "AKTIF") {
      await this.repo.setAllAcademicYearsInactive(sekolahId);
    }

    const year = await this.repo.createAcademicYear(sekolahId, {
      ...input,
      tanggal_mulai: startDate,
      tanggal_selesai: endDate,
    });

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "TAHUN_AJARAN",
      id_sumber: year.id,
      aksi: "CREATE",
      payload_sesudah: year as unknown as Record<string, unknown>,
    });

    return year;
  }

  async updateAcademicYear(
    id: string,
    sekolahId: string,
    input: UpdateAcademicYearInput,
    aktorId: string,
    aktorRole: string
  ): Promise<AcademicYearDTO> {
    const current = await this.getAcademicYearById(id, sekolahId);

    const startDate = input.tanggal_mulai ? new Date(input.tanggal_mulai) : current.tanggal_mulai;
    const endDate = input.tanggal_selesai
      ? new Date(input.tanggal_selesai)
      : current.tanggal_selesai;

    if (startDate >= endDate) {
      throw new InvalidDateRangeError(
        "Tanggal mulai tahun ajaran harus lebih awal daripada tanggal selesai."
      );
    }

    if (input.nama && input.nama !== current.nama) {
      const existing = await this.repo.findAcademicYearByNama(input.nama, sekolahId);
      if (existing && existing.id !== id) {
        throw new DuplicateAcademicYearError(input.nama);
      }
    }

    if (input.status === "AKTIF" && current.status !== "AKTIF") {
      await this.repo.setAllAcademicYearsInactive(sekolahId, id);
    }

    const updated = await this.repo.updateAcademicYear(id, sekolahId, {
      ...input,
      tanggal_mulai: startDate,
      tanggal_selesai: endDate,
    });

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "TAHUN_AJARAN",
      id_sumber: updated.id,
      aksi: "UPDATE",
      payload_sebelum: current as unknown as Record<string, unknown>,
      payload_sesudah: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async activateAcademicYear(
    id: string,
    sekolahId: string,
    aktorId: string,
    aktorRole: string
  ): Promise<AcademicYearDTO> {
    const current = await this.getAcademicYearById(id, sekolahId);

    // Deactivate existing active years
    await this.repo.setAllAcademicYearsInactive(sekolahId, id);

    const updated = await this.repo.updateAcademicYear(id, sekolahId, {
      status: "AKTIF",
    });

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "TAHUN_AJARAN",
      id_sumber: updated.id,
      aksi: "ACTIVATE_PERIOD",
      payload_sebelum: current as unknown as Record<string, unknown>,
      payload_sesudah: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async closeAcademicYear(
    id: string,
    sekolahId: string,
    aktorId: string,
    aktorRole: string
  ): Promise<AcademicYearDTO> {
    const current = await this.getAcademicYearById(id, sekolahId);

    const updated = await this.repo.updateAcademicYear(id, sekolahId, {
      status: "SELESAI",
    });

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "TAHUN_AJARAN",
      id_sumber: updated.id,
      aksi: "CLOSE_PERIOD",
      payload_sebelum: current as unknown as Record<string, unknown>,
      payload_sesudah: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteAcademicYear(
    id: string,
    sekolahId: string,
    aktorId: string,
    aktorRole: string
  ): Promise<void> {
    const current = await this.getAcademicYearById(id, sekolahId);

    if (
      (current.semester_count && current.semester_count > 0) ||
      (current.rombel_count && current.rombel_count > 0)
    ) {
      throw new HistoryProtectedError(
        "Tahun Ajaran",
        `terdapat ${current.semester_count ?? 0} semester dan ${current.rombel_count ?? 0} rombel terhubung`
      );
    }

    await this.repo.deleteAcademicYear(id, sekolahId);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "TAHUN_AJARAN",
      id_sumber: id,
      aksi: "DELETE",
      payload_sebelum: current as unknown as Record<string, unknown>,
    });
  }
}

export const academicYearService = new AcademicYearService();
