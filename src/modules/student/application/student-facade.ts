/**
 * Ruang Pintar — M07 Student Academic Lifecycle: Presentation Facade
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  RombelPlacementDTO,
  StudentEnrollmentDTO,
  StudentIdentityDTO,
} from "../domain/student-types";
import { studentRepository } from "../infrastructure/student-repository";

export interface StudentManagementDataset {
  students: StudentIdentityDTO[];
  totalStudents: number;
  enrollments: StudentEnrollmentDTO[];
  totalEnrollments: number;
  placements: RombelPlacementDTO[];
  totalPlacements: number;
  academicYears: Array<{ id: string; nama: string; status: string }>;
  activeYear: { id: string; nama: string } | null;
  gradeLevels: Array<{ id: string; nama: string; kode: string; fase_nama?: string | null }>;
  rombels: Array<{
    id: string;
    nama: string;
    kapasitas: number;
    tingkat_nama?: string;
    program_nama?: string | null;
    tahun_ajaran_id: string;
  }>;
  programs: Array<{ id: string; nama: string; kode: string }>;
}

export class StudentFacade {
  async getStudentManagementData(
    sekolahId: string,
    filters?: {
      studentSearch?: string;
      studentStatus?: string;
      tahunAjaranId?: string;
      rombelId?: string;
    }
  ): Promise<StudentManagementDataset> {
    // 1. Fetch Academic Reference Context from M06
    const [academicYears, activeYear, gradeLevels, rombels, programs] = await Promise.all([
      prisma.tahunAjaran.findMany({
        where: { sekolah_id: sekolahId },
        orderBy: { tanggal_mulai: "desc" },
        select: { id: true, nama: true, status: true },
      }),
      prisma.tahunAjaran.findFirst({
        where: { sekolah_id: sekolahId, status: "AKTIF" },
        select: { id: true, nama: true },
      }),
      prisma.tingkatKelas.findMany({
        where: { sekolah_id: sekolahId },
        include: { fase: true },
        orderBy: { urutan: "asc" },
      }),
      prisma.rombel.findMany({
        where: { sekolah_id: sekolahId, status: "AKTIF" },
        include: {
          tingkat: true,
          program: true,
        },
        orderBy: { nama: "asc" },
      }),
      prisma.programKeahlian.findMany({
        where: { sekolah_id: sekolahId, status_aktif: true },
        orderBy: { kode: "asc" },
        select: { id: true, nama: true, kode: true },
      }),
    ]);

    const targetYearId =
      filters?.tahunAjaranId || activeYear?.id || (academicYears[0]?.id ?? undefined);

    // 2. Fetch Students Directory
    const { data: students, total: totalStudents } = await studentRepository.findStudents(
      sekolahId,
      {
        search: filters?.studentSearch,
        status_akademik: filters?.studentStatus as any,
        tahun_ajaran_id: targetYearId,
        rombel_id: filters?.rombelId,
        limit: 2000,
      }
    );

    // 3. Fetch Enrollments for current selected/active year
    const { data: enrollments, total: totalEnrollments } = await studentRepository.findEnrollments(
      sekolahId,
      {
        tahun_ajaran_id: targetYearId,
        limit: 2000,
      }
    );

    // 4. Fetch Placements for current selected/active year or rombel
    const { data: placements, total: totalPlacements } = await studentRepository.findPlacements(
      sekolahId,
      {
        tahun_ajaran_id: targetYearId,
        rombel_id: filters?.rombelId,
        limit: 2000,
      }
    );

    return {
      students,
      totalStudents,
      enrollments,
      totalEnrollments,
      placements,
      totalPlacements,
      academicYears,
      activeYear,
      gradeLevels: gradeLevels.map((g) => ({
        id: g.id,
        nama: g.nama,
        kode: g.kode,
        fase_nama: g.fase?.nama ?? null,
      })),
      rombels: rombels.map((r) => ({
        id: r.id,
        nama: r.nama,
        kapasitas: r.kapasitas,
        tingkat_nama: r.tingkat?.nama,
        program_nama: r.program?.nama ?? null,
        tahun_ajaran_id: r.tahun_ajaran_id,
      })),
      programs,
    };
  }
}

export const studentFacade = new StudentFacade();
