/**
 * Ruang Pintar — M07 Student Academic Lifecycle: Student Identity Service
 */

import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import {
  CreateStudentIdentityInput,
  StudentIdentityDTO,
  UpdateStudentIdentityInput,
} from "../domain/student-types";
import {
  DuplicateNisError,
  DuplicateNisnError,
  HistoryProtectedError,
  StudentNotFoundError,
} from "../domain/student-errors";
import {
  StudentFilter,
  StudentRepository,
  studentRepository,
} from "../infrastructure/student-repository";

export class StudentIdentityService {
  constructor(private readonly repo: StudentRepository = studentRepository) {}

  async getStudents(
    sekolahId: string,
    filter: StudentFilter = {}
  ): Promise<{ data: StudentIdentityDTO[]; total: number }> {
    return this.repo.findStudents(sekolahId, filter);
  }

  async getStudentById(id: string, sekolahId: string): Promise<StudentIdentityDTO> {
    const student = await this.repo.findStudentById(id, sekolahId);
    if (!student) {
      throw new StudentNotFoundError(id);
    }
    return student;
  }

  async createStudent(
    sekolahId: string,
    input: CreateStudentIdentityInput,
    aktorId: string,
    aktorRole: string
  ): Promise<StudentIdentityDTO> {
    // 1. Check NIS uniqueness if provided
    if (input.nis && input.nis.trim() !== "") {
      const existingNis = await this.repo.findStudentByNis(input.nis.trim(), sekolahId);
      if (existingNis) {
        throw new DuplicateNisError(input.nis);
      }
    }

    // 2. Check NISN uniqueness if provided
    if (input.nisn) {
      const existingNisn = await this.repo.findStudentByNisn(input.nisn, sekolahId);
      if (existingNisn) {
        throw new DuplicateNisnError(input.nisn);
      }
    }

    // 3. Create Student Identity
    const student = await this.repo.createStudent(sekolahId, input);

    // 4. Optional: Create initial enrollment and placement if specified
    if (input.initial_tahun_ajaran_id) {
      const enrollment = await this.repo.createEnrollment(sekolahId, {
        siswa_id: student.id,
        tahun_ajaran_id: input.initial_tahun_ajaran_id,
        tingkat_id: input.initial_tingkat_id || null,
        status: "AKTIF",
      });

      if (input.initial_rombel_id) {
        await this.repo.createPlacement(sekolahId, {
          keikutsertaan_id: enrollment.id,
          rombel_id: input.initial_rombel_id,
        });
      }
    }

    // 5. Record Audit
    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "SISWA",
      id_sumber: student.id,
      aksi: "CREATE",
      payload_sesudah: student as unknown as Record<string, unknown>,
    });

    // Re-fetch to populate derived active context fields if auto-enrolled
    return (await this.repo.findStudentById(student.id, sekolahId)) ?? student;
  }

  async updateStudent(
    id: string,
    sekolahId: string,
    input: UpdateStudentIdentityInput,
    aktorId: string,
    aktorRole: string
  ): Promise<StudentIdentityDTO> {
    const current = await this.getStudentById(id, sekolahId);

    if (input.nis && input.nis !== current.nis) {
      const existingNis = await this.repo.findStudentByNis(input.nis, sekolahId);
      if (existingNis && existingNis.id !== id) {
        throw new DuplicateNisError(input.nis);
      }
    }

    if (input.nisn && input.nisn !== current.nisn) {
      const existingNisn = await this.repo.findStudentByNisn(input.nisn, sekolahId);
      if (existingNisn && existingNisn.id !== id) {
        throw new DuplicateNisnError(input.nisn);
      }
    }

    const updated = await this.repo.updateStudent(id, sekolahId, input);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "SISWA",
      id_sumber: updated.id,
      aksi: "UPDATE",
      payload_sebelum: current as unknown as Record<string, unknown>,
      payload_sesudah: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteStudent(
    id: string,
    sekolahId: string,
    aktorId: string,
    aktorRole: string
  ): Promise<void> {
    const current = await this.getStudentById(id, sekolahId);

    // Protect historical records: cannot delete if student has enrollments
    const history = await this.repo.getAcademicHistory(id, sekolahId);
    if (history && history.enrollments.length > 0) {
      throw new HistoryProtectedError(
        "Siswa",
        `siswa memiliki ${history.enrollments.length} riwayat keikutsertaan akademik terdaftar`
      );
    }

    await this.repo.deleteStudent(id, sekolahId);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "SISWA",
      id_sumber: id,
      aksi: "DELETE",
      payload_sebelum: current as unknown as Record<string, unknown>,
    });
  }
}

export const studentIdentityService = new StudentIdentityService();
