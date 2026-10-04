/**
 * Ruang Pintar — Academic Period & Structure (M06) Database Repository
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { ulid } from "ulidx";
import {
  AcademicProgramDTO,
  AcademicYearDTO,
  CreateAcademicYearInput,
  CreateGradeLevelInput,
  CreatePhaseInput,
  CreateProgramInput,
  CreateRombelInput,
  CreateSemesterInput,
  GradeLevelDTO,
  PhaseDTO,
  RombelDTO,
  SemesterDTO,
  StatusPeriode,
  UpdateAcademicYearInput,
  UpdateGradeLevelInput,
  UpdatePhaseInput,
  UpdateProgramInput,
  UpdateRombelInput,
  UpdateSemesterInput,
} from "../domain/academic-types";

export class AcademicRepository {
  // =========================================================================
  // TAHUN AJARAN (ACADEMIC YEAR)
  // =========================================================================

  async findAcademicYears(sekolahId: string): Promise<AcademicYearDTO[]> {
    const records = await prisma.tahunAjaran.findMany({
      where: { sekolah_id: sekolahId },
      include: {
        _count: {
          select: {
            semester: true,
            rombel: true,
          },
        },
      },
      orderBy: [{ tanggal_mulai: "desc" }, { nama: "desc" }],
    });

    return records.map((r) => ({
      id: r.id,
      sekolah_id: r.sekolah_id,
      nama: r.nama,
      kode: r.kode,
      tanggal_mulai: r.tanggal_mulai,
      tanggal_selesai: r.tanggal_selesai,
      status: r.status as StatusPeriode,
      semester_count: r._count.semester,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  async findAcademicYearById(id: string, sekolahId: string): Promise<AcademicYearDTO | null> {
    const r = await prisma.tahunAjaran.findFirst({
      where: { id, sekolah_id: sekolahId },
      include: {
        _count: {
          select: {
            semester: true,
            rombel: true,
          },
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      nama: r.nama,
      kode: r.kode,
      tanggal_mulai: r.tanggal_mulai,
      tanggal_selesai: r.tanggal_selesai,
      status: r.status as StatusPeriode,
      semester_count: r._count.semester,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async findAcademicYearByNama(nama: string, sekolahId: string): Promise<AcademicYearDTO | null> {
    const r = await prisma.tahunAjaran.findUnique({
      where: {
        sekolah_id_nama: {
          sekolah_id: sekolahId,
          nama,
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      nama: r.nama,
      kode: r.kode,
      tanggal_mulai: r.tanggal_mulai,
      tanggal_selesai: r.tanggal_selesai,
      status: r.status as StatusPeriode,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async findActiveAcademicYear(sekolahId: string): Promise<AcademicYearDTO | null> {
    const r = await prisma.tahunAjaran.findFirst({
      where: { sekolah_id: sekolahId, status: "AKTIF" },
      include: {
        _count: {
          select: {
            semester: true,
            rombel: true,
          },
        },
      },
      orderBy: { tanggal_mulai: "desc" },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      nama: r.nama,
      kode: r.kode,
      tanggal_mulai: r.tanggal_mulai,
      tanggal_selesai: r.tanggal_selesai,
      status: r.status as StatusPeriode,
      semester_count: r._count.semester,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async createAcademicYear(
    sekolahId: string,
    input: CreateAcademicYearInput
  ): Promise<AcademicYearDTO> {
    const r = await prisma.tahunAjaran.create({
      data: {
        id: ulid(),
        sekolah_id: sekolahId,
        nama: input.nama,
        kode: input.kode,
        tanggal_mulai: new Date(input.tanggal_mulai),
        tanggal_selesai: new Date(input.tanggal_selesai),
        status: input.status ?? "DRAFT",
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      nama: r.nama,
      kode: r.kode,
      tanggal_mulai: r.tanggal_mulai,
      tanggal_selesai: r.tanggal_selesai,
      status: r.status as StatusPeriode,
      semester_count: 0,
      rombel_count: 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async updateAcademicYear(
    id: string,
    sekolahId: string,
    input: UpdateAcademicYearInput
  ): Promise<AcademicYearDTO> {
    const existing = await prisma.tahunAjaran.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Tahun ajaran dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    const r = await prisma.tahunAjaran.update({
      where: { id },
      data: {
        nama: input.nama,
        kode: input.kode,
        tanggal_mulai: input.tanggal_mulai ? new Date(input.tanggal_mulai) : undefined,
        tanggal_selesai: input.tanggal_selesai ? new Date(input.tanggal_selesai) : undefined,
        status: input.status,
      },
      include: {
        _count: {
          select: {
            semester: true,
            rombel: true,
          },
        },
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      nama: r.nama,
      kode: r.kode,
      tanggal_mulai: r.tanggal_mulai,
      tanggal_selesai: r.tanggal_selesai,
      status: r.status as StatusPeriode,
      semester_count: r._count.semester,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async setAllAcademicYearsInactive(sekolahId: string, exceptId?: string): Promise<void> {
    await prisma.tahunAjaran.updateMany({
      where: {
        sekolah_id: sekolahId,
        status: "AKTIF",
        id: exceptId ? { not: exceptId } : undefined,
      },
      data: {
        status: "SELESAI",
      },
    });
  }

  async deleteAcademicYear(id: string, sekolahId?: string): Promise<void> {
    const deleted = await prisma.tahunAjaran.deleteMany({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (deleted.count === 0) {
      throw new Error(
        `Tahun ajaran dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }
  }

  // =========================================================================
  // SEMESTER
  // =========================================================================

  async findSemesters(sekolahId: string, tahunAjaranId?: string): Promise<SemesterDTO[]> {
    const records = await prisma.semester.findMany({
      where: {
        sekolah_id: sekolahId,
        tahun_ajaran_id: tahunAjaranId,
      },
      include: {
        tahun_ajaran: {
          select: { nama: true },
        },
        _count: {
          select: { rombel: true },
        },
      },
      orderBy: [{ tahun_ajaran_id: "desc" }, { urutan: "asc" }],
    });

    return records.map((r) => ({
      id: r.id,
      sekolah_id: r.sekolah_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      nama: r.nama,
      kode: r.kode,
      urutan: r.urutan,
      tanggal_mulai: r.tanggal_mulai,
      tanggal_selesai: r.tanggal_selesai,
      status: r.status as StatusPeriode,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  async findSemesterById(id: string, sekolahId: string): Promise<SemesterDTO | null> {
    const r = await prisma.semester.findFirst({
      where: { id, sekolah_id: sekolahId },
      include: {
        tahun_ajaran: {
          select: { nama: true },
        },
        _count: {
          select: { rombel: true },
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      nama: r.nama,
      kode: r.kode,
      urutan: r.urutan,
      tanggal_mulai: r.tanggal_mulai,
      tanggal_selesai: r.tanggal_selesai,
      status: r.status as StatusPeriode,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async findSemesterByKode(tahunAjaranId: string, kode: string): Promise<SemesterDTO | null> {
    const r = await prisma.semester.findUnique({
      where: {
        tahun_ajaran_id_kode: {
          tahun_ajaran_id: tahunAjaranId,
          kode,
        },
      },
      include: {
        tahun_ajaran: {
          select: { nama: true },
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      nama: r.nama,
      kode: r.kode,
      urutan: r.urutan,
      tanggal_mulai: r.tanggal_mulai,
      tanggal_selesai: r.tanggal_selesai,
      status: r.status as StatusPeriode,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async findActiveSemester(sekolahId: string): Promise<SemesterDTO | null> {
    const r = await prisma.semester.findFirst({
      where: { sekolah_id: sekolahId, status: "AKTIF" },
      include: {
        tahun_ajaran: {
          select: { nama: true },
        },
        _count: {
          select: { rombel: true },
        },
      },
      orderBy: { tanggal_mulai: "desc" },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      nama: r.nama,
      kode: r.kode,
      urutan: r.urutan,
      tanggal_mulai: r.tanggal_mulai,
      tanggal_selesai: r.tanggal_selesai,
      status: r.status as StatusPeriode,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async createSemester(sekolahId: string, input: CreateSemesterInput): Promise<SemesterDTO> {
    const r = await prisma.semester.create({
      data: {
        id: ulid(),
        sekolah_id: sekolahId,
        tahun_ajaran_id: input.tahun_ajaran_id,
        nama: input.nama,
        kode: input.kode,
        urutan: input.urutan ?? 1,
        tanggal_mulai: new Date(input.tanggal_mulai),
        tanggal_selesai: new Date(input.tanggal_selesai),
        status: input.status ?? "DRAFT",
      },
      include: {
        tahun_ajaran: {
          select: { nama: true },
        },
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      nama: r.nama,
      kode: r.kode,
      urutan: r.urutan,
      tanggal_mulai: r.tanggal_mulai,
      tanggal_selesai: r.tanggal_selesai,
      status: r.status as StatusPeriode,
      rombel_count: 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async updateSemester(
    id: string,
    sekolahId: string,
    input: UpdateSemesterInput
  ): Promise<SemesterDTO> {
    const existing = await prisma.semester.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`Semester dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`);
    }

    const r = await prisma.semester.update({
      where: { id },
      data: {
        nama: input.nama,
        kode: input.kode,
        urutan: input.urutan,
        tanggal_mulai: input.tanggal_mulai ? new Date(input.tanggal_mulai) : undefined,
        tanggal_selesai: input.tanggal_selesai ? new Date(input.tanggal_selesai) : undefined,
        status: input.status,
      },
      include: {
        tahun_ajaran: {
          select: { nama: true },
        },
        _count: {
          select: { rombel: true },
        },
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      nama: r.nama,
      kode: r.kode,
      urutan: r.urutan,
      tanggal_mulai: r.tanggal_mulai,
      tanggal_selesai: r.tanggal_selesai,
      status: r.status as StatusPeriode,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async setAllSemestersInactive(sekolahId: string, exceptId?: string): Promise<void> {
    await prisma.semester.updateMany({
      where: {
        sekolah_id: sekolahId,
        status: "AKTIF",
        id: exceptId ? { not: exceptId } : undefined,
      },
      data: {
        status: "SELESAI",
      },
    });
  }

  async deleteSemester(id: string, sekolahId?: string): Promise<void> {
    const deleted = await prisma.semester.deleteMany({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (deleted.count === 0) {
      throw new Error(`Semester dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`);
    }
  }

  // =========================================================================
  // FASE (EDUCATIONAL PHASE)
  // =========================================================================

  async findPhases(sekolahId: string): Promise<PhaseDTO[]> {
    const records = await prisma.fase.findMany({
      where: { sekolah_id: sekolahId },
      include: {
        _count: {
          select: {
            tingkat_kelas: true,
            rombel: true,
          },
        },
      },
      orderBy: [{ urutan: "asc" }, { kode: "asc" }],
    });

    return records.map((r) => ({
      id: r.id,
      sekolah_id: r.sekolah_id,
      nama: r.nama,
      kode: r.kode,
      deskripsi: r.deskripsi,
      urutan: r.urutan,
      tingkat_count: r._count.tingkat_kelas,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  async findPhaseById(id: string, sekolahId: string): Promise<PhaseDTO | null> {
    const r = await prisma.fase.findFirst({
      where: { id, sekolah_id: sekolahId },
      include: {
        _count: {
          select: {
            tingkat_kelas: true,
            rombel: true,
          },
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      nama: r.nama,
      kode: r.kode,
      deskripsi: r.deskripsi,
      urutan: r.urutan,
      tingkat_count: r._count.tingkat_kelas,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async findPhaseByKode(kode: string, sekolahId: string): Promise<PhaseDTO | null> {
    const r = await prisma.fase.findUnique({
      where: {
        sekolah_id_kode: {
          sekolah_id: sekolahId,
          kode,
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      nama: r.nama,
      kode: r.kode,
      deskripsi: r.deskripsi,
      urutan: r.urutan,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async createPhase(sekolahId: string, input: CreatePhaseInput): Promise<PhaseDTO> {
    const r = await prisma.fase.create({
      data: {
        id: ulid(),
        sekolah_id: sekolahId,
        nama: input.nama,
        kode: input.kode,
        deskripsi: input.deskripsi,
        urutan: input.urutan ?? 1,
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      nama: r.nama,
      kode: r.kode,
      deskripsi: r.deskripsi,
      urutan: r.urutan,
      tingkat_count: 0,
      rombel_count: 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async updatePhase(id: string, sekolahId: string, input: UpdatePhaseInput): Promise<PhaseDTO> {
    const existing = await prisma.fase.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`Fase dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`);
    }

    const r = await prisma.fase.update({
      where: { id },
      data: {
        nama: input.nama,
        kode: input.kode,
        deskripsi: input.deskripsi,
        urutan: input.urutan,
      },
      include: {
        _count: {
          select: {
            tingkat_kelas: true,
            rombel: true,
          },
        },
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      nama: r.nama,
      kode: r.kode,
      deskripsi: r.deskripsi,
      urutan: r.urutan,
      tingkat_count: r._count.tingkat_kelas,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async deletePhase(id: string, sekolahId?: string): Promise<void> {
    const deleted = await prisma.fase.deleteMany({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (deleted.count === 0) {
      throw new Error(`Fase dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`);
    }
  }

  // =========================================================================
  // TINGKAT KELAS (GRADE LEVEL)
  // =========================================================================

  async findGradeLevels(sekolahId: string): Promise<GradeLevelDTO[]> {
    const records = await prisma.tingkatKelas.findMany({
      where: { sekolah_id: sekolahId },
      include: {
        fase: {
          select: { nama: true },
        },
        _count: {
          select: { rombel: true },
        },
      },
      orderBy: [{ urutan: "asc" }, { kode: "asc" }],
    });

    return records.map((r) => ({
      id: r.id,
      sekolah_id: r.sekolah_id,
      fase_id: r.fase_id,
      fase_nama: r.fase?.nama ?? null,
      kode: r.kode,
      nama: r.nama,
      urutan: r.urutan,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  async findGradeLevelById(id: string, sekolahId: string): Promise<GradeLevelDTO | null> {
    const r = await prisma.tingkatKelas.findFirst({
      where: { id, sekolah_id: sekolahId },
      include: {
        fase: {
          select: { nama: true },
        },
        _count: {
          select: { rombel: true },
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      fase_id: r.fase_id,
      fase_nama: r.fase?.nama ?? null,
      kode: r.kode,
      nama: r.nama,
      urutan: r.urutan,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async findGradeLevelByKode(kode: string, sekolahId: string): Promise<GradeLevelDTO | null> {
    const r = await prisma.tingkatKelas.findUnique({
      where: {
        sekolah_id_kode: {
          sekolah_id: sekolahId,
          kode,
        },
      },
      include: {
        fase: {
          select: { nama: true },
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      fase_id: r.fase_id,
      fase_nama: r.fase?.nama ?? null,
      kode: r.kode,
      nama: r.nama,
      urutan: r.urutan,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async createGradeLevel(sekolahId: string, input: CreateGradeLevelInput): Promise<GradeLevelDTO> {
    const r = await prisma.tingkatKelas.create({
      data: {
        id: ulid(),
        sekolah_id: sekolahId,
        fase_id: input.fase_id,
        kode: input.kode,
        nama: input.nama,
        urutan: input.urutan ?? 1,
      },
      include: {
        fase: {
          select: { nama: true },
        },
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      fase_id: r.fase_id,
      fase_nama: r.fase?.nama ?? null,
      kode: r.kode,
      nama: r.nama,
      urutan: r.urutan,
      rombel_count: 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async updateGradeLevel(
    id: string,
    sekolahId: string,
    input: UpdateGradeLevelInput
  ): Promise<GradeLevelDTO> {
    const existing = await prisma.tingkatKelas.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Tingkat kelas dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    const r = await prisma.tingkatKelas.update({
      where: { id },
      data: {
        fase_id: input.fase_id,
        kode: input.kode,
        nama: input.nama,
        urutan: input.urutan,
      },
      include: {
        fase: {
          select: { nama: true },
        },
        _count: {
          select: { rombel: true },
        },
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      fase_id: r.fase_id,
      fase_nama: r.fase?.nama ?? null,
      kode: r.kode,
      nama: r.nama,
      urutan: r.urutan,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async deleteGradeLevel(id: string, sekolahId?: string): Promise<void> {
    const deleted = await prisma.tingkatKelas.deleteMany({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (deleted.count === 0) {
      throw new Error(
        `Tingkat kelas dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }
  }

  // =========================================================================
  // PROGRAM KEAHLIAN / JURUSAN (ACADEMIC PROGRAM)
  // =========================================================================

  async findPrograms(sekolahId: string): Promise<AcademicProgramDTO[]> {
    const records = await prisma.programKeahlian.findMany({
      where: { sekolah_id: sekolahId },
      include: {
        _count: {
          select: { rombel: true },
        },
      },
      orderBy: [{ kode: "asc" }],
    });

    return records.map((r) => ({
      id: r.id,
      sekolah_id: r.sekolah_id,
      kode: r.kode,
      nama: r.nama,
      jenjang: r.jenjang,
      status_aktif: r.status_aktif,
      deskripsi: r.deskripsi,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  async findProgramById(id: string, sekolahId: string): Promise<AcademicProgramDTO | null> {
    const r = await prisma.programKeahlian.findFirst({
      where: { id, sekolah_id: sekolahId },
      include: {
        _count: {
          select: { rombel: true },
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      kode: r.kode,
      nama: r.nama,
      jenjang: r.jenjang,
      status_aktif: r.status_aktif,
      deskripsi: r.deskripsi,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async findProgramByKode(kode: string, sekolahId: string): Promise<AcademicProgramDTO | null> {
    const r = await prisma.programKeahlian.findUnique({
      where: {
        sekolah_id_kode: {
          sekolah_id: sekolahId,
          kode,
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      kode: r.kode,
      nama: r.nama,
      jenjang: r.jenjang,
      status_aktif: r.status_aktif,
      deskripsi: r.deskripsi,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async createProgram(sekolahId: string, input: CreateProgramInput): Promise<AcademicProgramDTO> {
    const r = await prisma.programKeahlian.create({
      data: {
        id: ulid(),
        sekolah_id: sekolahId,
        kode: input.kode,
        nama: input.nama,
        jenjang: input.jenjang,
        status_aktif: input.status_aktif ?? true,
        deskripsi: input.deskripsi,
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      kode: r.kode,
      nama: r.nama,
      jenjang: r.jenjang,
      status_aktif: r.status_aktif,
      deskripsi: r.deskripsi,
      rombel_count: 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async updateProgram(
    id: string,
    sekolahId: string,
    input: UpdateProgramInput
  ): Promise<AcademicProgramDTO> {
    const existing = await prisma.programKeahlian.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Program keahlian dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    const r = await prisma.programKeahlian.update({
      where: { id },
      data: {
        kode: input.kode,
        nama: input.nama,
        jenjang: input.jenjang,
        status_aktif: input.status_aktif,
        deskripsi: input.deskripsi,
      },
      include: {
        _count: {
          select: { rombel: true },
        },
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      kode: r.kode,
      nama: r.nama,
      jenjang: r.jenjang,
      status_aktif: r.status_aktif,
      deskripsi: r.deskripsi,
      rombel_count: r._count.rombel,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async deleteProgram(id: string, sekolahId?: string): Promise<void> {
    const deleted = await prisma.programKeahlian.deleteMany({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (deleted.count === 0) {
      throw new Error(
        `Program keahlian dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }
  }

  // =========================================================================
  // ROMBEL (ROMBONGAN BELAJAR / KELAS)
  // =========================================================================

  async findRombels(sekolahId: string, tahunAjaranId?: string): Promise<RombelDTO[]> {
    const records = await prisma.rombel.findMany({
      where: {
        sekolah_id: sekolahId,
        tahun_ajaran_id: tahunAjaranId,
      },
      include: {
        tahun_ajaran: { select: { nama: true } },
        semester: { select: { nama: true } },
        tingkat: { select: { nama: true, kode: true } },
        fase: { select: { nama: true } },
        program: { select: { nama: true, kode: true } },
      },
      orderBy: [{ tahun_ajaran_id: "desc" }, { tingkat: { urutan: "asc" } }, { nama: "asc" }],
    });

    return records.map((r) => ({
      id: r.id,
      sekolah_id: r.sekolah_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      semester_id: r.semester_id,
      semester_nama: r.semester?.nama ?? null,
      tingkat_id: r.tingkat_id,
      tingkat_nama: r.tingkat.nama,
      tingkat_kode: r.tingkat.kode,
      fase_id: r.fase_id,
      fase_nama: r.fase?.nama ?? null,
      program_id: r.program_id,
      program_nama: r.program?.nama ?? null,
      program_kode: r.program?.kode ?? null,
      nama: r.nama,
      kode: r.kode,
      kapasitas: r.kapasitas,
      status: r.status as any,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  async findRombelById(id: string, sekolahId: string): Promise<RombelDTO | null> {
    const r = await prisma.rombel.findFirst({
      where: { id, sekolah_id: sekolahId },
      include: {
        tahun_ajaran: { select: { nama: true } },
        semester: { select: { nama: true } },
        tingkat: { select: { nama: true, kode: true } },
        fase: { select: { nama: true } },
        program: { select: { nama: true, kode: true } },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      semester_id: r.semester_id,
      semester_nama: r.semester?.nama ?? null,
      tingkat_id: r.tingkat_id,
      tingkat_nama: r.tingkat.nama,
      tingkat_kode: r.tingkat.kode,
      fase_id: r.fase_id,
      fase_nama: r.fase?.nama ?? null,
      program_id: r.program_id,
      program_nama: r.program?.nama ?? null,
      program_kode: r.program?.kode ?? null,
      nama: r.nama,
      kode: r.kode,
      kapasitas: r.kapasitas,
      status: r.status as any,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async findRombelByNama(
    tahunAjaranId: string,
    nama: string,
    sekolahId: string
  ): Promise<RombelDTO | null> {
    const r = await prisma.rombel.findUnique({
      where: {
        sekolah_id_tahun_ajaran_id_nama: {
          sekolah_id: sekolahId,
          tahun_ajaran_id: tahunAjaranId,
          nama,
        },
      },
      include: {
        tahun_ajaran: { select: { nama: true } },
        tingkat: { select: { nama: true, kode: true } },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      semester_id: r.semester_id,
      tingkat_id: r.tingkat_id,
      tingkat_nama: r.tingkat.nama,
      tingkat_kode: r.tingkat.kode,
      fase_id: r.fase_id,
      program_id: r.program_id,
      nama: r.nama,
      kode: r.kode,
      kapasitas: r.kapasitas,
      status: r.status as any,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async createRombel(sekolahId: string, input: CreateRombelInput): Promise<RombelDTO> {
    const r = await prisma.rombel.create({
      data: {
        id: ulid(),
        sekolah_id: sekolahId,
        tahun_ajaran_id: input.tahun_ajaran_id,
        semester_id: input.semester_id,
        tingkat_id: input.tingkat_id,
        fase_id: input.fase_id,
        program_id: input.program_id,
        nama: input.nama,
        kode: input.kode,
        kapasitas: input.kapasitas ?? 36,
        status: input.status ?? "AKTIF",
        catatan: input.catatan,
      },
      include: {
        tahun_ajaran: { select: { nama: true } },
        semester: { select: { nama: true } },
        tingkat: { select: { nama: true, kode: true } },
        fase: { select: { nama: true } },
        program: { select: { nama: true, kode: true } },
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      semester_id: r.semester_id,
      semester_nama: r.semester?.nama ?? null,
      tingkat_id: r.tingkat_id,
      tingkat_nama: r.tingkat.nama,
      tingkat_kode: r.tingkat.kode,
      fase_id: r.fase_id,
      fase_nama: r.fase?.nama ?? null,
      program_id: r.program_id,
      program_nama: r.program?.nama ?? null,
      program_kode: r.program?.kode ?? null,
      nama: r.nama,
      kode: r.kode,
      kapasitas: r.kapasitas,
      status: r.status as any,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async updateRombel(id: string, sekolahId: string, input: UpdateRombelInput): Promise<RombelDTO> {
    const existing = await prisma.rombel.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`Rombel dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`);
    }

    const r = await prisma.rombel.update({
      where: { id },
      data: {
        tahun_ajaran_id: input.tahun_ajaran_id,
        semester_id: input.semester_id,
        tingkat_id: input.tingkat_id,
        fase_id: input.fase_id,
        program_id: input.program_id,
        nama: input.nama,
        kode: input.kode,
        kapasitas: input.kapasitas,
        status: input.status,
        catatan: input.catatan,
      },
      include: {
        tahun_ajaran: { select: { nama: true } },
        semester: { select: { nama: true } },
        tingkat: { select: { nama: true, kode: true } },
        fase: { select: { nama: true } },
        program: { select: { nama: true, kode: true } },
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      semester_id: r.semester_id,
      semester_nama: r.semester?.nama ?? null,
      tingkat_id: r.tingkat_id,
      tingkat_nama: r.tingkat.nama,
      tingkat_kode: r.tingkat.kode,
      fase_id: r.fase_id,
      fase_nama: r.fase?.nama ?? null,
      program_id: r.program_id,
      program_nama: r.program?.nama ?? null,
      program_kode: r.program?.kode ?? null,
      nama: r.nama,
      kode: r.kode,
      kapasitas: r.kapasitas,
      status: r.status as any,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  async deleteRombel(id: string, sekolahId: string): Promise<void> {
    const existing = await prisma.rombel.findFirst({
      where: { id, sekolah_id: sekolahId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`Rombel dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`);
    }

    await prisma.$transaction(async (tx) => {
      const archived = await tx.rombel.updateMany({
        where: { id, sekolah_id: sekolahId, status: { not: "DIARSIPKAN" } },
        data: { status: "DIARSIPKAN" },
      });
      if (archived.count === 0) {
        throw new Error(`Rombel dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`);
      }

      await tx.penugasanMengajar.updateMany({
        where: { sekolah_id: sekolahId, rombel_id: id, status: "AKTIF" },
        data: { status: "ARSIP", berlaku_sampai: new Date() },
      });
    });
  }
}

export const academicRepository = new AcademicRepository();
