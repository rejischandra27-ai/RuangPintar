/**
 * Ruang Pintar — M08 Teacher & Teaching Assignment Facade
 *
 * Mengagregasikan dataset Guru, Mata Pelajaran, Penugasan Mengajar,
 * dan Dashboard Guru secara terpadu.
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  HomeroomAssignmentDTO,
  SubjectDTO,
  TeacherProfileDTO,
  TeachingAssignmentDTO,
} from "../domain/teacher-types";
import { HomeroomAssignmentService } from "./homeroom-assignment-service";
import { SubjectService } from "./subject-service";
import { TeacherProfileService } from "./teacher-profile-service";
import { TeachingAssignmentService } from "./teaching-assignment-service";

export interface TeacherManagementPageData {
  teachers: TeacherProfileDTO[];
  subjects: SubjectDTO[];
  teachingAssignments: TeachingAssignmentDTO[];
  homeroomAssignments: HomeroomAssignmentDTO[];
  academicYears: Array<{ id: string; nama: string; status: string }>;
  semesters: Array<{ id: string; nama: string; tahun_ajaran_id: string; status: string }>;
  rombels: Array<{
    id: string;
    nama: string;
    tingkat_nama?: string | null;
    tahun_ajaran_id: string;
    kapasitas: number;
  }>;
}

export interface TeacherPendingTaskItem {
  publikasi_id: string;
  penugasan_mengajar_id: string;
  tugas_id: string;
  judul_tugas: string;
  rombel_nama: string;
  mata_pelajaran_kode: string;
  total_dikumpulkan: number;
  belum_dinilai: number;
  batas_waktu: Date | null;
}

export interface TeacherDashboardData {
  hasProfile: boolean;
  teacher: TeacherProfileDTO | null;
  activeAssignments: TeachingAssignmentDTO[];
  activeHomeroom: HomeroomAssignmentDTO | null;
  totalJamMinggu: number;
  totalRombel: number;
  totalMataPelajaran?: number;
  totalSiswaBinaan: number;
  pendingTasks?: TeacherPendingTaskItem[];
  totalTugasPerluDiperiksa?: number;
}

export class TeacherFacade {
  static async getTeacherManagementData(sekolah_id: string): Promise<TeacherManagementPageData> {
    const [
      teachers,
      subjects,
      teachingAssignments,
      homeroomAssignments,
      academicYears,
      semesters,
      rombels,
    ] = await Promise.all([
      TeacherProfileService.getTeachers(sekolah_id),
      SubjectService.getSubjects(sekolah_id),
      TeachingAssignmentService.getTeachingAssignments(sekolah_id),
      HomeroomAssignmentService.getHomeroomAssignments(sekolah_id),
      prisma.tahunAjaran.findMany({
        where: { sekolah_id },
        select: { id: true, nama: true, status: true },
        orderBy: { nama: "desc" },
      }),
      prisma.semester.findMany({
        where: { sekolah_id },
        select: { id: true, nama: true, tahun_ajaran_id: true, status: true },
        orderBy: { urutan: "asc" },
      }),
      prisma.rombel.findMany({
        where: { sekolah_id, status: "AKTIF" },
        select: {
          id: true,
          nama: true,
          tahun_ajaran_id: true,
          kapasitas: true,
          tingkat: { select: { nama: true } },
        },
        orderBy: { nama: "asc" },
      }),
    ]);

    return {
      teachers,
      subjects,
      teachingAssignments,
      homeroomAssignments,
      academicYears,
      semesters,
      rombels: rombels.map((r) => ({
        id: r.id,
        nama: r.nama,
        tahun_ajaran_id: r.tahun_ajaran_id,
        kapasitas: r.kapasitas,
        tingkat_nama: r.tingkat?.nama || null,
      })),
    };
  }

  static async getTeacherDashboardData(
    userId: string,
    sekolahId?: string | null,
    isTenantOwner = false
  ): Promise<TeacherDashboardData> {
    if (!sekolahId) {
      return {
        hasProfile: false,
        teacher: null,
        activeAssignments: [],
        activeHomeroom: null,
        totalJamMinggu: 0,
        totalRombel: 0,
        totalSiswaBinaan: 0,
      };
    }

    const teacher = await TeacherProfileService.getTeacherByUserId(userId, sekolahId);

    if (!teacher) {
      return {
        hasProfile: false,
        teacher: null,
        activeAssignments: [],
        activeHomeroom: null,
        totalJamMinggu: 0,
        totalRombel: 0,
        totalSiswaBinaan: 0,
      };
    }

    const assignments = await TeachingAssignmentService.getTeachingAssignments(teacher.sekolah_id, {
      guru_id: teacher.id,
      status: "AKTIF",
    });

    const homerooms = await HomeroomAssignmentService.getHomeroomAssignments(teacher.sekolah_id, {
      guru_id: teacher.id,
      status: "AKTIF",
    });

    const activeHomeroom = homerooms.length > 0 ? homerooms[0] : null;
    const uniqueRombelIds = Array.from(new Set(assignments.map((a) => a.rombel_id)));
    const uniqueMapelIds = Array.from(new Set(assignments.map((a) => a.mata_pelajaran_id)));
    const totalJam = assignments.reduce((acc, a) => acc + a.jumlah_jam_minggu, 0);

    // Owner dashboard statistics represent the full active tenant workspace.
    let totalSiswa = 0;
    let totalRombel = uniqueRombelIds.length;
    if (isTenantOwner) {
      const [activeClassCount, activeStudentCount] = await Promise.all([
        prisma.rombel.count({
          where: { sekolah_id: teacher.sekolah_id, status: "AKTIF" },
        }),
        prisma.siswa.count({
          where: { sekolah_id: teacher.sekolah_id, status_akademik: "AKTIF" },
        }),
      ]);
      totalRombel = activeClassCount;
      totalSiswa = activeStudentCount;
    } else if (uniqueRombelIds.length > 0) {
      totalSiswa = await prisma.penempatanRombel.count({
        where: {
          sekolah_id: teacher.sekolah_id,
          rombel_id: { in: uniqueRombelIds },
          status: "AKTIF",
        },
      });
    }

    // Ambil tugas pembelajaran aktif yang memerlukan atensi guru
    const assignmentIds = assignments.map((a) => a.id);
    let pendingTasks: TeacherPendingTaskItem[] = [];
    let totalTugasPerluDiperiksa = 0;

    if (assignmentIds.length > 0) {
      const publikasiList = await prisma.publikasiTugas.findMany({
        where: {
          penugasan_mengajar_id: { in: assignmentIds },
          status: "DITERBITKAN",
        },
        include: {
          tugas: {
            select: {
              id: true,
              judul: true,
            },
          },
          penugasan_mengajar: {
            select: {
              id: true,
              rombel: { select: { nama: true } },
              mata_pelajaran: { select: { kode: true } },
            },
          },
          pengumpulan: {
            select: {
              id: true,
              catatan_guru: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
        take: 5,
      });

      pendingTasks = publikasiList.map((p) => {
        const totalDikumpulkan = p.pengumpulan.length;
        const belumDinilai = p.pengumpulan.filter((item) => !item.catatan_guru).length;
        return {
          publikasi_id: p.id,
          penugasan_mengajar_id: p.penugasan_mengajar_id,
          tugas_id: p.tugas.id,
          judul_tugas: p.tugas.judul,
          rombel_nama: p.penugasan_mengajar.rombel.nama,
          mata_pelajaran_kode: p.penugasan_mengajar.mata_pelajaran.kode,
          total_dikumpulkan: totalDikumpulkan,
          belum_dinilai: belumDinilai,
          batas_waktu: p.batas_waktu,
        };
      });

      totalTugasPerluDiperiksa = pendingTasks.reduce(
        (acc, t) => acc + (t.belum_dinilai > 0 ? 1 : 0),
        0
      );
    }

    return {
      hasProfile: true,
      teacher,
      activeAssignments: assignments,
      activeHomeroom,
      totalJamMinggu: totalJam,
      totalRombel,
      totalMataPelajaran: uniqueMapelIds.length,
      totalSiswaBinaan: totalSiswa,
      pendingTasks,
      totalTugasPerluDiperiksa,
    };
  }
}
