/**
 * Ruang Pintar — M07 Student Academic Lifecycle: Student Enrollment Service
 */

import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import {
  CreateStudentEnrollmentInput,
  StudentEnrollmentDTO,
  UpdateStudentEnrollmentStatusInput,
} from "../domain/student-types";
import {
  DuplicateEnrollmentError,
  EnrollmentNotFoundError,
  HistoryProtectedError,
  StudentNotFoundError,
} from "../domain/student-errors";
import {
  EnrollmentFilter,
  StudentRepository,
  studentRepository,
} from "../infrastructure/student-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export class StudentEnrollmentService {
  constructor(private readonly repo: StudentRepository = studentRepository) {}

  async getEnrollments(
    sekolahId: string,
    filter: EnrollmentFilter = {}
  ): Promise<{ data: StudentEnrollmentDTO[]; total: number }> {
    return this.repo.findEnrollments(sekolahId, filter);
  }

  async getEnrollmentById(id: string, sekolahId: string): Promise<StudentEnrollmentDTO> {
    const enrollment = await this.repo.findEnrollmentById(id, sekolahId);
    if (!enrollment) {
      throw new EnrollmentNotFoundError(id);
    }
    return enrollment;
  }

  async createEnrollment(
    sekolahId: string,
    input: CreateStudentEnrollmentInput,
    aktorId: string,
    aktorRole: string
  ): Promise<StudentEnrollmentDTO> {
    // 1. Verify student exists
    const student = await this.repo.findStudentById(input.siswa_id, sekolahId);
    if (!student) {
      throw new StudentNotFoundError(input.siswa_id);
    }

    // 2. Verify academic year exists in this school
    const academicYear = await prisma.tahunAjaran.findFirst({
      where: { id: input.tahun_ajaran_id, sekolah_id: sekolahId },
    });
    if (!academicYear) {
      throw new Error(`Tahun Ajaran dengan ID ${input.tahun_ajaran_id} tidak ditemukan.`);
    }

    // 3. Prevent duplicate active enrollment in the same academic year
    const existing = await this.repo.findEnrollmentBySiswaAndTahun(
      input.siswa_id,
      input.tahun_ajaran_id
    );
    if (existing) {
      throw new DuplicateEnrollmentError(student.nama_lengkap, academicYear.nama);
    }

    // 4. Create enrollment
    const enrollment = await this.repo.createEnrollment(sekolahId, input);

    // 5. Optional: Initial placement
    if (input.initial_rombel_id) {
      await this.repo.createPlacement(sekolahId, {
        keikutsertaan_id: enrollment.id,
        rombel_id: input.initial_rombel_id,
      });
    }

    // 6. Record Audit Event
    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "KEIKUTSERTAAN_SISWA",
      id_sumber: enrollment.id,
      aksi: "CREATE",
      payload_sesudah: enrollment as unknown as Record<string, unknown>,
    });

    return (await this.repo.findEnrollmentById(enrollment.id, sekolahId)) ?? enrollment;
  }

  async updateEnrollmentStatus(
    id: string,
    sekolahId: string,
    input: UpdateStudentEnrollmentStatusInput,
    aktorId: string,
    aktorRole: string
  ): Promise<StudentEnrollmentDTO> {
    const current = await this.getEnrollmentById(id, sekolahId);

    const updated = await this.repo.updateEnrollment(id, sekolahId, input);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "KEIKUTSERTAAN_SISWA",
      id_sumber: updated.id,
      aksi: "UPDATE_STATUS",
      payload_sebelum: current as unknown as Record<string, unknown>,
      payload_sesudah: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteEnrollment(
    id: string,
    sekolahId: string,
    aktorId: string,
    aktorRole: string
  ): Promise<void> {
    const current = await this.getEnrollmentById(id, sekolahId);

    const activePlacement = await this.repo.findActivePlacementByEnrollment(id);
    if (activePlacement) {
      throw new HistoryProtectedError(
        "Keikutsertaan Siswa",
        `terdapat penempatan rombel aktif (${activePlacement.rombel_nama}) yang terhubung`
      );
    }

    await this.repo.deleteEnrollment(id, sekolahId);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "KEIKUTSERTAAN_SISWA",
      id_sumber: id,
      aksi: "DELETE",
      payload_sebelum: current as unknown as Record<string, unknown>,
    });
  }
}

export const studentEnrollmentService = new StudentEnrollmentService();
