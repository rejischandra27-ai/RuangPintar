/**
 * Ruang Pintar — M07 Student Academic Lifecycle: Repository
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import {
  CreateStudentEnrollmentInput,
  CreateStudentIdentityInput,
  CreateRombelPlacementInput,
  JenisKelamin,
  RombelPlacementDTO,
  StatusAkademikSiswa,
  StatusKeikutsertaan,
  StatusPenempatan,
  StudentAcademicHistoryDTO,
  StudentEnrollmentDTO,
  StudentIdentityDTO,
  UpdateStudentEnrollmentStatusInput,
  UpdateStudentIdentityInput,
} from "../domain/student-types";

export interface StudentFilter {
  search?: string;
  status_akademik?: StatusAkademikSiswa;
  tahun_ajaran_id?: string;
  tingkat_id?: string;
  rombel_id?: string;
  limit?: number;
  offset?: number;
}

export interface EnrollmentFilter {
  tahun_ajaran_id?: string;
  tingkat_id?: string;
  rombel_id?: string;
  status?: StatusKeikutsertaan;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PlacementFilter {
  rombel_id?: string;
  tahun_ajaran_id?: string;
  status?: StatusPenempatan;
  search?: string;
  limit?: number;
  offset?: number;
}

export class StudentRepository {
  constructor(private readonly db: typeof prisma = prisma) {}

  // =========================================================================
  // 1. STUDENT IDENTITY
  // =========================================================================

  async findStudents(
    sekolahId: string,
    filter: StudentFilter = {}
  ): Promise<{ data: StudentIdentityDTO[]; total: number }> {
    const where: Record<string, unknown> = { sekolah_id: sekolahId };

    if (filter.status_akademik) {
      where.status_akademik = filter.status_akademik;
    }

    if (filter.search) {
      const q = filter.search.trim();
      where.OR = [
        { nama_lengkap: { contains: q } },
        { nis: { contains: q } },
        { nisn: { contains: q } },
        { nik: { contains: q } },
      ];
    }

    // Filter by academic context if specified
    if (filter.tahun_ajaran_id || filter.tingkat_id || filter.rombel_id) {
      where.keikutsertaan = {
        some: {
          ...(filter.tahun_ajaran_id ? { tahun_ajaran_id: filter.tahun_ajaran_id } : {}),
          ...(filter.tingkat_id ? { tingkat_id: filter.tingkat_id } : {}),
          ...(filter.rombel_id
            ? { penempatan: { some: { rombel_id: filter.rombel_id, status: "AKTIF" } } }
            : {}),
        },
      };
    }

    const [total, students] = await Promise.all([
      this.db.siswa.count({ where }),
      this.db.siswa.findMany({
        where,
        include: {
          keikutsertaan: {
            where: { status: "AKTIF" },
            orderBy: { created_at: "desc" },
            take: 1,
            include: {
              tahun_ajaran: true,
              tingkat: true,
              penempatan: {
                where: { status: "AKTIF" },
                orderBy: { created_at: "desc" },
                take: 1,
                include: {
                  rombel: true,
                },
              },
            },
          },
        },
        orderBy: [{ nama_lengkap: "asc" }, { nis: "asc" }],
        take: filter.limit ?? 50,
        skip: filter.offset ?? 0,
      }),
    ]);

    const data: StudentIdentityDTO[] = students.map((s) => {
      const activeEnrollment = s.keikutsertaan[0];
      const activePlacement = activeEnrollment?.penempatan[0];

      return {
        id: s.id,
        sekolah_id: s.sekolah_id,
        pengguna_id: s.pengguna_id,
        nis: s.nis,
        nisn: s.nisn,
        nama_lengkap: s.nama_lengkap,
        jenis_kelamin: s.jenis_kelamin as JenisKelamin,
        tempat_lahir: s.tempat_lahir,
        tanggal_lahir: s.tanggal_lahir,
        agama: s.agama,
        nik: s.nik,
        alamat: s.alamat,
        nama_wali: s.nama_wali,
        telepon_wali: s.telepon_wali,
        email_wali: s.email_wali,
        status_akademik: s.status_akademik as StatusAkademikSiswa,
        foto_url: s.foto_url,
        tanggal_masuk: s.tanggal_masuk,
        tanggal_keluar: s.tanggal_keluar,
        catatan: s.catatan,
        created_at: s.created_at,
        updated_at: s.updated_at,
        active_enrollment_id: activeEnrollment?.id ?? null,
        active_tahun_ajaran_id: activeEnrollment?.tahun_ajaran_id ?? null,
        active_tahun_ajaran_nama: activeEnrollment?.tahun_ajaran.nama ?? null,
        active_tingkat_id: activeEnrollment?.tingkat_id ?? null,
        active_tingkat_nama: activeEnrollment?.tingkat?.nama ?? null,
        active_rombel_id: activePlacement?.rombel_id ?? null,
        active_rombel_nama: activePlacement?.rombel.nama ?? null,
        active_nomor_absen: activePlacement?.nomor_absen ?? null,
      };
    });

    return { data, total };
  }

  async findStudentById(id: string, sekolahId: string): Promise<StudentIdentityDTO | null> {
    const s = await this.db.siswa.findFirst({
      where: { id, sekolah_id: sekolahId },
      include: {
        keikutsertaan: {
          where: { status: "AKTIF" },
          orderBy: { created_at: "desc" },
          take: 1,
          include: {
            tahun_ajaran: true,
            tingkat: true,
            penempatan: {
              where: { status: "AKTIF" },
              orderBy: { created_at: "desc" },
              take: 1,
              include: {
                rombel: true,
              },
            },
          },
        },
      },
    });

    if (!s) return null;

    const activeEnrollment = s.keikutsertaan[0];
    const activePlacement = activeEnrollment?.penempatan[0];

    return {
      id: s.id,
      sekolah_id: s.sekolah_id,
      pengguna_id: s.pengguna_id,
      nis: s.nis,
      nisn: s.nisn,
      nama_lengkap: s.nama_lengkap,
      jenis_kelamin: s.jenis_kelamin as JenisKelamin,
      tempat_lahir: s.tempat_lahir,
      tanggal_lahir: s.tanggal_lahir,
      agama: s.agama,
      nik: s.nik,
      alamat: s.alamat,
      nama_wali: s.nama_wali,
      telepon_wali: s.telepon_wali,
      email_wali: s.email_wali,
      status_akademik: s.status_akademik as StatusAkademikSiswa,
      foto_url: s.foto_url,
      tanggal_masuk: s.tanggal_masuk,
      tanggal_keluar: s.tanggal_keluar,
      catatan: s.catatan,
      created_at: s.created_at,
      updated_at: s.updated_at,
      active_enrollment_id: activeEnrollment?.id ?? null,
      active_tahun_ajaran_id: activeEnrollment?.tahun_ajaran_id ?? null,
      active_tahun_ajaran_nama: activeEnrollment?.tahun_ajaran.nama ?? null,
      active_tingkat_id: activeEnrollment?.tingkat_id ?? null,
      active_tingkat_nama: activeEnrollment?.tingkat?.nama ?? null,
      active_rombel_id: activePlacement?.rombel_id ?? null,
      active_rombel_nama: activePlacement?.rombel.nama ?? null,
      active_nomor_absen: activePlacement?.nomor_absen ?? null,
    };
  }

  async findStudentByNis(nis: string, sekolahId: string): Promise<StudentIdentityDTO | null> {
    const s = await this.db.siswa.findUnique({
      where: { sekolah_id_nis: { sekolah_id: sekolahId, nis } },
    });
    if (!s) return null;

    return {
      id: s.id,
      sekolah_id: s.sekolah_id,
      pengguna_id: s.pengguna_id,
      nis: s.nis,
      nisn: s.nisn,
      nama_lengkap: s.nama_lengkap,
      jenis_kelamin: s.jenis_kelamin as JenisKelamin,
      tempat_lahir: s.tempat_lahir,
      tanggal_lahir: s.tanggal_lahir,
      agama: s.agama,
      nik: s.nik,
      alamat: s.alamat,
      nama_wali: s.nama_wali,
      telepon_wali: s.telepon_wali,
      email_wali: s.email_wali,
      status_akademik: s.status_akademik as StatusAkademikSiswa,
      foto_url: s.foto_url,
      tanggal_masuk: s.tanggal_masuk,
      tanggal_keluar: s.tanggal_keluar,
      catatan: s.catatan,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  }

  async findStudentByNisn(nisn: string, sekolahId: string): Promise<StudentIdentityDTO | null> {
    const s = await this.db.siswa.findFirst({
      where: { sekolah_id: sekolahId, nisn },
    });
    if (!s) return null;

    return {
      id: s.id,
      sekolah_id: s.sekolah_id,
      pengguna_id: s.pengguna_id,
      nis: s.nis,
      nisn: s.nisn,
      nama_lengkap: s.nama_lengkap,
      jenis_kelamin: s.jenis_kelamin as JenisKelamin,
      tempat_lahir: s.tempat_lahir,
      tanggal_lahir: s.tanggal_lahir,
      agama: s.agama,
      nik: s.nik,
      alamat: s.alamat,
      nama_wali: s.nama_wali,
      telepon_wali: s.telepon_wali,
      email_wali: s.email_wali,
      status_akademik: s.status_akademik as StatusAkademikSiswa,
      foto_url: s.foto_url,
      tanggal_masuk: s.tanggal_masuk,
      tanggal_keluar: s.tanggal_keluar,
      catatan: s.catatan,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  }

  async createStudent(
    sekolahId: string,
    input: CreateStudentIdentityInput
  ): Promise<StudentIdentityDTO> {
    const id = generateUlid();

    const created = await this.db.siswa.create({
      data: {
        id,
        sekolah_id: sekolahId,
        nis: input.nis ? input.nis.trim() : "",
        nisn: input.nisn?.trim() || null,
        nama_lengkap: input.nama_lengkap.trim(),
        jenis_kelamin: input.jenis_kelamin,
        tempat_lahir: input.tempat_lahir?.trim() || null,
        tanggal_lahir: input.tanggal_lahir ? new Date(input.tanggal_lahir) : null,
        agama: input.agama || null,
        nik: input.nik?.trim() || null,
        alamat: input.alamat?.trim() || null,
        nama_wali: input.nama_wali?.trim() || null,
        telepon_wali: input.telepon_wali?.trim() || null,
        email_wali: input.email_wali?.trim() || null,
        status_akademik: input.status_akademik ?? "AKTIF",
        foto_url: input.foto_url?.trim() || null,
        tanggal_masuk: input.tanggal_masuk ? new Date(input.tanggal_masuk) : new Date(),
        catatan: input.catatan?.trim() || null,
      },
    });

    return {
      id: created.id,
      sekolah_id: created.sekolah_id,
      pengguna_id: created.pengguna_id,
      nis: created.nis,
      nisn: created.nisn,
      nama_lengkap: created.nama_lengkap,
      jenis_kelamin: created.jenis_kelamin as JenisKelamin,
      tempat_lahir: created.tempat_lahir,
      tanggal_lahir: created.tanggal_lahir,
      agama: created.agama,
      nik: created.nik,
      alamat: created.alamat,
      nama_wali: created.nama_wali,
      telepon_wali: created.telepon_wali,
      email_wali: created.email_wali,
      status_akademik: created.status_akademik as StatusAkademikSiswa,
      foto_url: created.foto_url,
      tanggal_masuk: created.tanggal_masuk,
      tanggal_keluar: created.tanggal_keluar,
      catatan: created.catatan,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  async updateStudent(
    id: string,
    sekolahId: string,
    input: UpdateStudentIdentityInput
  ): Promise<StudentIdentityDTO> {
    const existing = await this.db.siswa.findFirst({
      where: { id, sekolah_id: sekolahId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`Siswa dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`);
    }

    const updated = await this.db.siswa.update({
      where: { id },
      data: {
        ...(input.nis !== undefined ? { nis: input.nis ? input.nis.trim() : "" } : {}),
        ...(input.nisn !== undefined ? { nisn: input.nisn?.trim() || null } : {}),
        ...(input.nama_lengkap !== undefined ? { nama_lengkap: input.nama_lengkap.trim() } : {}),
        ...(input.jenis_kelamin !== undefined ? { jenis_kelamin: input.jenis_kelamin } : {}),
        ...(input.tempat_lahir !== undefined
          ? { tempat_lahir: input.tempat_lahir?.trim() || null }
          : {}),
        ...(input.tanggal_lahir !== undefined
          ? { tanggal_lahir: input.tanggal_lahir ? new Date(input.tanggal_lahir) : null }
          : {}),
        ...(input.agama !== undefined ? { agama: input.agama || null } : {}),
        ...(input.nik !== undefined ? { nik: input.nik?.trim() || null } : {}),
        ...(input.alamat !== undefined ? { alamat: input.alamat?.trim() || null } : {}),
        ...(input.nama_wali !== undefined ? { nama_wali: input.nama_wali?.trim() || null } : {}),
        ...(input.telepon_wali !== undefined
          ? { telepon_wali: input.telepon_wali?.trim() || null }
          : {}),
        ...(input.email_wali !== undefined ? { email_wali: input.email_wali?.trim() || null } : {}),
        ...(input.status_akademik !== undefined ? { status_akademik: input.status_akademik } : {}),
        ...(input.foto_url !== undefined ? { foto_url: input.foto_url?.trim() || null } : {}),
        ...(input.tanggal_keluar !== undefined
          ? { tanggal_keluar: input.tanggal_keluar ? new Date(input.tanggal_keluar) : null }
          : {}),
        ...(input.catatan !== undefined ? { catatan: input.catatan?.trim() || null } : {}),
      },
    });

    return {
      id: updated.id,
      sekolah_id: updated.sekolah_id,
      pengguna_id: updated.pengguna_id,
      nis: updated.nis,
      nisn: updated.nisn,
      nama_lengkap: updated.nama_lengkap,
      jenis_kelamin: updated.jenis_kelamin as JenisKelamin,
      tempat_lahir: updated.tempat_lahir,
      tanggal_lahir: updated.tanggal_lahir,
      agama: updated.agama,
      nik: updated.nik,
      alamat: updated.alamat,
      nama_wali: updated.nama_wali,
      telepon_wali: updated.telepon_wali,
      email_wali: updated.email_wali,
      status_akademik: updated.status_akademik as StatusAkademikSiswa,
      foto_url: updated.foto_url,
      tanggal_masuk: updated.tanggal_masuk,
      tanggal_keluar: updated.tanggal_keluar,
      catatan: updated.catatan,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async deleteStudent(id: string, sekolahId: string): Promise<void> {
    const deleted = await this.db.siswa.deleteMany({
      where: { id, sekolah_id: sekolahId },
    });
    if (deleted.count === 0) {
      throw new Error(`Siswa dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`);
    }
  }

  // =========================================================================
  // 2. STUDENT ENROLLMENT (KEIKUTSERTAAN AKADEMIK)
  // =========================================================================

  async findEnrollments(
    sekolahId: string,
    filter: EnrollmentFilter = {}
  ): Promise<{ data: StudentEnrollmentDTO[]; total: number }> {
    const where: Record<string, unknown> = { sekolah_id: sekolahId };

    if (filter.tahun_ajaran_id) {
      where.tahun_ajaran_id = filter.tahun_ajaran_id;
    }

    if (filter.tingkat_id) {
      where.tingkat_id = filter.tingkat_id;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.rombel_id) {
      where.penempatan = {
        some: { rombel_id: filter.rombel_id, status: "AKTIF" },
      };
    }

    if (filter.search) {
      const q = filter.search.trim();
      where.siswa = {
        OR: [
          { nama_lengkap: { contains: q } },
          { nis: { contains: q } },
          { nisn: { contains: q } },
        ],
      };
    }

    const [total, enrollments] = await Promise.all([
      this.db.keikutsertaanSiswa.count({ where }),
      this.db.keikutsertaanSiswa.findMany({
        where,
        include: {
          siswa: true,
          tahun_ajaran: true,
          tingkat: true,
          penempatan: {
            where: { status: "AKTIF" },
            orderBy: { created_at: "desc" },
            take: 1,
            include: {
              rombel: true,
            },
          },
        },
        orderBy: [{ created_at: "desc" }],
        take: filter.limit ?? 50,
        skip: filter.offset ?? 0,
      }),
    ]);

    const data: StudentEnrollmentDTO[] = enrollments.map((e) => {
      const activePlacement = e.penempatan[0];
      return {
        id: e.id,
        sekolah_id: e.sekolah_id,
        siswa_id: e.siswa_id,
        siswa_nama: e.siswa.nama_lengkap,
        siswa_nis: e.siswa.nis,
        siswa_nisn: e.siswa.nisn,
        siswa_jenis_kelamin: e.siswa.jenis_kelamin as JenisKelamin,
        tahun_ajaran_id: e.tahun_ajaran_id,
        tahun_ajaran_nama: e.tahun_ajaran.nama,
        tingkat_id: e.tingkat_id,
        tingkat_nama: e.tingkat?.nama ?? null,
        status: e.status as StatusKeikutsertaan,
        tanggal_mulai: e.tanggal_mulai,
        tanggal_selesai: e.tanggal_selesai,
        catatan: e.catatan,
        created_at: e.created_at,
        updated_at: e.updated_at,
        active_placement_id: activePlacement?.id ?? null,
        active_rombel_id: activePlacement?.rombel_id ?? null,
        active_rombel_nama: activePlacement?.rombel.nama ?? null,
        active_nomor_absen: activePlacement?.nomor_absen ?? null,
      };
    });

    return { data, total };
  }

  async findEnrollmentById(id: string, sekolahId: string): Promise<StudentEnrollmentDTO | null> {
    const e = await this.db.keikutsertaanSiswa.findFirst({
      where: { id, sekolah_id: sekolahId },
      include: {
        siswa: true,
        tahun_ajaran: true,
        tingkat: true,
        penempatan: {
          where: { status: "AKTIF" },
          take: 1,
          include: {
            rombel: true,
          },
        },
      },
    });

    if (!e) return null;
    const activePlacement = e.penempatan[0];

    return {
      id: e.id,
      sekolah_id: e.sekolah_id,
      siswa_id: e.siswa_id,
      siswa_nama: e.siswa.nama_lengkap,
      siswa_nis: e.siswa.nis,
      siswa_nisn: e.siswa.nisn,
      siswa_jenis_kelamin: e.siswa.jenis_kelamin as JenisKelamin,
      tahun_ajaran_id: e.tahun_ajaran_id,
      tahun_ajaran_nama: e.tahun_ajaran.nama,
      tingkat_id: e.tingkat_id,
      tingkat_nama: e.tingkat?.nama ?? null,
      status: e.status as StatusKeikutsertaan,
      tanggal_mulai: e.tanggal_mulai,
      tanggal_selesai: e.tanggal_selesai,
      catatan: e.catatan,
      created_at: e.created_at,
      updated_at: e.updated_at,
      active_placement_id: activePlacement?.id ?? null,
      active_rombel_id: activePlacement?.rombel_id ?? null,
      active_rombel_nama: activePlacement?.rombel.nama ?? null,
      active_nomor_absen: activePlacement?.nomor_absen ?? null,
    };
  }

  async findEnrollmentBySiswaAndTahun(
    siswaId: string,
    tahunAjaranId: string
  ): Promise<StudentEnrollmentDTO | null> {
    const e = await this.db.keikutsertaanSiswa.findUnique({
      where: {
        siswa_id_tahun_ajaran_id: {
          siswa_id: siswaId,
          tahun_ajaran_id: tahunAjaranId,
        },
      },
      include: {
        siswa: true,
        tahun_ajaran: true,
        tingkat: true,
      },
    });

    if (!e) return null;

    return {
      id: e.id,
      sekolah_id: e.sekolah_id,
      siswa_id: e.siswa_id,
      siswa_nama: e.siswa.nama_lengkap,
      siswa_nis: e.siswa.nis,
      siswa_nisn: e.siswa.nisn,
      siswa_jenis_kelamin: e.siswa.jenis_kelamin as JenisKelamin,
      tahun_ajaran_id: e.tahun_ajaran_id,
      tahun_ajaran_nama: e.tahun_ajaran.nama,
      tingkat_id: e.tingkat_id,
      tingkat_nama: e.tingkat?.nama ?? null,
      status: e.status as StatusKeikutsertaan,
      tanggal_mulai: e.tanggal_mulai,
      tanggal_selesai: e.tanggal_selesai,
      catatan: e.catatan,
      created_at: e.created_at,
      updated_at: e.updated_at,
    };
  }

  async createEnrollment(
    sekolahId: string,
    input: CreateStudentEnrollmentInput
  ): Promise<StudentEnrollmentDTO> {
    const id = generateUlid();

    const created = await this.db.keikutsertaanSiswa.create({
      data: {
        id,
        sekolah_id: sekolahId,
        siswa_id: input.siswa_id,
        tahun_ajaran_id: input.tahun_ajaran_id,
        tingkat_id: input.tingkat_id || null,
        status: input.status ?? "AKTIF",
        tanggal_mulai: input.tanggal_mulai ? new Date(input.tanggal_mulai) : new Date(),
        catatan: input.catatan?.trim() || null,
      },
      include: {
        siswa: true,
        tahun_ajaran: true,
        tingkat: true,
      },
    });

    return {
      id: created.id,
      sekolah_id: created.sekolah_id,
      siswa_id: created.siswa_id,
      siswa_nama: created.siswa.nama_lengkap,
      siswa_nis: created.siswa.nis,
      siswa_nisn: created.siswa.nisn,
      siswa_jenis_kelamin: created.siswa.jenis_kelamin as JenisKelamin,
      tahun_ajaran_id: created.tahun_ajaran_id,
      tahun_ajaran_nama: created.tahun_ajaran.nama,
      tingkat_id: created.tingkat_id,
      tingkat_nama: created.tingkat?.nama ?? null,
      status: created.status as StatusKeikutsertaan,
      tanggal_mulai: created.tanggal_mulai,
      tanggal_selesai: created.tanggal_selesai,
      catatan: created.catatan,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  async updateEnrollment(
    id: string,
    sekolahId: string,
    input: UpdateStudentEnrollmentStatusInput
  ): Promise<StudentEnrollmentDTO> {
    const existing = await this.db.keikutsertaanSiswa.findFirst({
      where: { id, sekolah_id: sekolahId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Keikutsertaan siswa dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    const updated = await this.db.keikutsertaanSiswa.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.tanggal_selesai !== undefined
          ? { tanggal_selesai: input.tanggal_selesai ? new Date(input.tanggal_selesai) : null }
          : {}),
        ...(input.catatan !== undefined ? { catatan: input.catatan?.trim() || null } : {}),
      },
      include: {
        siswa: true,
        tahun_ajaran: true,
        tingkat: true,
      },
    });

    return {
      id: updated.id,
      sekolah_id: updated.sekolah_id,
      siswa_id: updated.siswa_id,
      siswa_nama: updated.siswa.nama_lengkap,
      siswa_nis: updated.siswa.nis,
      siswa_nisn: updated.siswa.nisn,
      siswa_jenis_kelamin: updated.siswa.jenis_kelamin as JenisKelamin,
      tahun_ajaran_id: updated.tahun_ajaran_id,
      tahun_ajaran_nama: updated.tahun_ajaran.nama,
      tingkat_id: updated.tingkat_id,
      tingkat_nama: updated.tingkat?.nama ?? null,
      status: updated.status as StatusKeikutsertaan,
      tanggal_mulai: updated.tanggal_mulai,
      tanggal_selesai: updated.tanggal_selesai,
      catatan: updated.catatan,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async deleteEnrollment(id: string, sekolahId: string): Promise<void> {
    const deleted = await this.db.keikutsertaanSiswa.deleteMany({
      where: { id, sekolah_id: sekolahId },
    });
    if (deleted.count === 0) {
      throw new Error(
        `Keikutsertaan siswa dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }
  }

  // =========================================================================
  // 3. ROMBEL PLACEMENT (PENEMPATAN ROMBEL)
  // =========================================================================

  async findPlacements(
    sekolahId: string,
    filter: PlacementFilter = {}
  ): Promise<{ data: RombelPlacementDTO[]; total: number }> {
    const where: Record<string, unknown> = { sekolah_id: sekolahId };

    if (filter.rombel_id) {
      where.rombel_id = filter.rombel_id;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.tahun_ajaran_id) {
      where.keikutsertaan = {
        tahun_ajaran_id: filter.tahun_ajaran_id,
      };
    }

    if (filter.search) {
      const q = filter.search.trim();
      where.keikutsertaan = {
        ...((where.keikutsertaan as object) || {}),
        siswa: {
          OR: [
            { nama_lengkap: { contains: q } },
            { nis: { contains: q } },
            { nisn: { contains: q } },
          ],
        },
      };
    }

    const [total, placements] = await Promise.all([
      this.db.penempatanRombel.count({ where }),
      this.db.penempatanRombel.findMany({
        where,
        include: {
          rombel: {
            include: {
              tingkat: true,
              program: true,
              tahun_ajaran: true,
            },
          },
          keikutsertaan: {
            include: {
              siswa: true,
              tahun_ajaran: true,
            },
          },
        },
        orderBy: [{ nomor_absen: "asc" }, { created_at: "asc" }],
        take: filter.limit ?? 50,
        skip: filter.offset ?? 0,
      }),
    ]);

    const data: RombelPlacementDTO[] = placements.map((p) => ({
      id: p.id,
      sekolah_id: p.sekolah_id,
      keikutsertaan_id: p.keikutsertaan_id,
      siswa_id: p.keikutsertaan.siswa_id,
      siswa_nama: p.keikutsertaan.siswa.nama_lengkap,
      siswa_nis: p.keikutsertaan.siswa.nis,
      siswa_jenis_kelamin: p.keikutsertaan.siswa.jenis_kelamin as JenisKelamin,
      tahun_ajaran_id: p.keikutsertaan.tahun_ajaran_id,
      tahun_ajaran_nama: p.keikutsertaan.tahun_ajaran.nama,
      rombel_id: p.rombel_id,
      rombel_nama: p.rombel.nama,
      rombel_kapasitas: p.rombel.kapasitas,
      tingkat_nama: p.rombel.tingkat?.nama,
      program_nama: p.rombel.program?.nama ?? null,
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai,
      status: p.status as StatusPenempatan,
      nomor_absen: p.nomor_absen,
      catatan: p.catatan,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    return { data, total };
  }

  async findPlacementById(id: string, sekolahId: string): Promise<RombelPlacementDTO | null> {
    const p = await this.db.penempatanRombel.findFirst({
      where: { id, sekolah_id: sekolahId },
      include: {
        rombel: {
          include: {
            tingkat: true,
            program: true,
            tahun_ajaran: true,
          },
        },
        keikutsertaan: {
          include: {
            siswa: true,
            tahun_ajaran: true,
          },
        },
      },
    });

    if (!p) return null;

    return {
      id: p.id,
      sekolah_id: p.sekolah_id,
      keikutsertaan_id: p.keikutsertaan_id,
      siswa_id: p.keikutsertaan.siswa_id,
      siswa_nama: p.keikutsertaan.siswa.nama_lengkap,
      siswa_nis: p.keikutsertaan.siswa.nis,
      siswa_jenis_kelamin: p.keikutsertaan.siswa.jenis_kelamin as JenisKelamin,
      tahun_ajaran_id: p.keikutsertaan.tahun_ajaran_id,
      tahun_ajaran_nama: p.keikutsertaan.tahun_ajaran.nama,
      rombel_id: p.rombel_id,
      rombel_nama: p.rombel.nama,
      rombel_kapasitas: p.rombel.kapasitas,
      tingkat_nama: p.rombel.tingkat?.nama,
      program_nama: p.rombel.program?.nama ?? null,
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai,
      status: p.status as StatusPenempatan,
      nomor_absen: p.nomor_absen,
      catatan: p.catatan,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  }

  async findActivePlacementByEnrollment(
    keikutsertaanId: string
  ): Promise<RombelPlacementDTO | null> {
    const p = await this.db.penempatanRombel.findFirst({
      where: { keikutsertaan_id: keikutsertaanId, status: "AKTIF" },
      include: {
        rombel: {
          include: {
            tingkat: true,
            program: true,
            tahun_ajaran: true,
          },
        },
        keikutsertaan: {
          include: {
            siswa: true,
            tahun_ajaran: true,
          },
        },
      },
    });

    if (!p) return null;

    return {
      id: p.id,
      sekolah_id: p.sekolah_id,
      keikutsertaan_id: p.keikutsertaan_id,
      siswa_id: p.keikutsertaan.siswa_id,
      siswa_nama: p.keikutsertaan.siswa.nama_lengkap,
      siswa_nis: p.keikutsertaan.siswa.nis,
      siswa_jenis_kelamin: p.keikutsertaan.siswa.jenis_kelamin as JenisKelamin,
      tahun_ajaran_id: p.keikutsertaan.tahun_ajaran_id,
      tahun_ajaran_nama: p.keikutsertaan.tahun_ajaran.nama,
      rombel_id: p.rombel_id,
      rombel_nama: p.rombel.nama,
      rombel_kapasitas: p.rombel.kapasitas,
      tingkat_nama: p.rombel.tingkat?.nama,
      program_nama: p.rombel.program?.nama ?? null,
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai,
      status: p.status as StatusPenempatan,
      nomor_absen: p.nomor_absen,
      catatan: p.catatan,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  }

  async countPlacementsInRombel(
    rombelId: string,
    status: StatusPenempatan = "AKTIF"
  ): Promise<number> {
    return this.db.penempatanRombel.count({
      where: { rombel_id: rombelId, status },
    });
  }

  async createPlacement(
    sekolahId: string,
    input: CreateRombelPlacementInput
  ): Promise<RombelPlacementDTO> {
    const id = generateUlid();

    const created = await this.db.penempatanRombel.create({
      data: {
        id,
        sekolah_id: sekolahId,
        keikutsertaan_id: input.keikutsertaan_id,
        rombel_id: input.rombel_id,
        nomor_absen: input.nomor_absen ?? null,
        tanggal_mulai: input.tanggal_mulai ? new Date(input.tanggal_mulai) : new Date(),
        status: "AKTIF",
        catatan: input.catatan?.trim() || null,
      },
      include: {
        rombel: {
          include: {
            tingkat: true,
            program: true,
            tahun_ajaran: true,
          },
        },
        keikutsertaan: {
          include: {
            siswa: true,
            tahun_ajaran: true,
          },
        },
      },
    });

    return {
      id: created.id,
      sekolah_id: created.sekolah_id,
      keikutsertaan_id: created.keikutsertaan_id,
      siswa_id: created.keikutsertaan.siswa_id,
      siswa_nama: created.keikutsertaan.siswa.nama_lengkap,
      siswa_nis: created.keikutsertaan.siswa.nis,
      siswa_jenis_kelamin: created.keikutsertaan.siswa.jenis_kelamin as JenisKelamin,
      tahun_ajaran_id: created.keikutsertaan.tahun_ajaran_id,
      tahun_ajaran_nama: created.keikutsertaan.tahun_ajaran.nama,
      rombel_id: created.rombel_id,
      rombel_nama: created.rombel.nama,
      rombel_kapasitas: created.rombel.kapasitas,
      tingkat_nama: created.rombel.tingkat?.nama,
      program_nama: created.rombel.program?.nama ?? null,
      tanggal_mulai: created.tanggal_mulai,
      tanggal_selesai: created.tanggal_selesai,
      status: created.status as StatusPenempatan,
      nomor_absen: created.nomor_absen,
      catatan: created.catatan,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  async updatePlacement(
    id: string,
    sekolahId: string,
    data: {
      status?: StatusPenempatan;
      tanggal_selesai?: Date | null;
      nomor_absen?: number | null;
      catatan?: string | null;
    }
  ): Promise<RombelPlacementDTO> {
    const existing = await this.db.penempatanRombel.findFirst({
      where: { id, sekolah_id: sekolahId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Penempatan rombel dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    const updated = await this.db.penempatanRombel.update({
      where: { id },
      data,
      include: {
        rombel: {
          include: {
            tingkat: true,
            program: true,
            tahun_ajaran: true,
          },
        },
        keikutsertaan: {
          include: {
            siswa: true,
            tahun_ajaran: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      sekolah_id: updated.sekolah_id,
      keikutsertaan_id: updated.keikutsertaan_id,
      siswa_id: updated.keikutsertaan.siswa_id,
      siswa_nama: updated.keikutsertaan.siswa.nama_lengkap,
      siswa_nis: updated.keikutsertaan.siswa.nis,
      siswa_jenis_kelamin: updated.keikutsertaan.siswa.jenis_kelamin as JenisKelamin,
      tahun_ajaran_id: updated.keikutsertaan.tahun_ajaran_id,
      tahun_ajaran_nama: updated.keikutsertaan.tahun_ajaran.nama,
      rombel_id: updated.rombel_id,
      rombel_nama: updated.rombel.nama,
      rombel_kapasitas: updated.rombel.kapasitas,
      tingkat_nama: updated.rombel.tingkat?.nama,
      program_nama: updated.rombel.program?.nama ?? null,
      tanggal_mulai: updated.tanggal_mulai,
      tanggal_selesai: updated.tanggal_selesai,
      status: updated.status as StatusPenempatan,
      nomor_absen: updated.nomor_absen,
      catatan: updated.catatan,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async deletePlacement(id: string, sekolahId: string): Promise<void> {
    const deleted = await this.db.penempatanRombel.deleteMany({
      where: { id, sekolah_id: sekolahId },
    });
    if (deleted.count === 0) {
      throw new Error(
        `Penempatan rombel dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }
  }

  // =========================================================================
  // 4. ACADEMIC HISTORY TIMELINE
  // =========================================================================

  async getAcademicHistory(
    siswaId: string,
    sekolahId: string
  ): Promise<StudentAcademicHistoryDTO | null> {
    const s = await this.findStudentById(siswaId, sekolahId);
    if (!s) return null;

    const enrollmentsRaw = await this.db.keikutsertaanSiswa.findMany({
      where: { siswa_id: siswaId, sekolah_id: sekolahId },
      include: {
        tahun_ajaran: true,
        tingkat: true,
        penempatan: {
          include: {
            rombel: {
              include: {
                tingkat: true,
                program: true,
              },
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const enrollments = enrollmentsRaw.map((e) => ({
      id: e.id,
      sekolah_id: e.sekolah_id,
      siswa_id: e.siswa_id,
      siswa_nama: s.nama_lengkap,
      siswa_nis: s.nis,
      siswa_nisn: s.nisn,
      siswa_jenis_kelamin: s.jenis_kelamin,
      tahun_ajaran_id: e.tahun_ajaran_id,
      tahun_ajaran_nama: e.tahun_ajaran.nama,
      tingkat_id: e.tingkat_id,
      tingkat_nama: e.tingkat?.nama ?? null,
      status: e.status as StatusKeikutsertaan,
      tanggal_mulai: e.tanggal_mulai,
      tanggal_selesai: e.tanggal_selesai,
      catatan: e.catatan,
      created_at: e.created_at,
      updated_at: e.updated_at,
      placements: e.penempatan.map((p) => ({
        id: p.id,
        sekolah_id: p.sekolah_id,
        keikutsertaan_id: p.keikutsertaan_id,
        siswa_id: s.id,
        siswa_nama: s.nama_lengkap,
        siswa_nis: s.nis,
        siswa_jenis_kelamin: s.jenis_kelamin,
        rombel_id: p.rombel_id,
        rombel_nama: p.rombel.nama,
        rombel_kapasitas: p.rombel.kapasitas,
        tingkat_nama: p.rombel.tingkat?.nama,
        program_nama: p.rombel.program?.nama ?? null,
        tanggal_mulai: p.tanggal_mulai,
        tanggal_selesai: p.tanggal_selesai,
        status: p.status as StatusPenempatan,
        nomor_absen: p.nomor_absen,
        catatan: p.catatan,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
    }));

    return {
      siswa: s,
      enrollments,
    };
  }
}

export const studentRepository = new StudentRepository();
