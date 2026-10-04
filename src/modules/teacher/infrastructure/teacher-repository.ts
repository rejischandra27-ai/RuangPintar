/**
 * Ruang Pintar — M08 Teacher & Teaching Assignment Prisma Repository
 *
 * Mengelola persistensi data Guru, Mata Pelajaran, Penugasan Mengajar,
 * dan Penugasan Wali Kelas dengan penegakan batasan konteks sekolah (School-Boundary Enforcement).
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import { parseUserAgent, calculatePresence } from "@/shared/lib/device-detector";
import {
  AssignHomeroomInput,
  CreateSubjectInput,
  CreateTeacherInput,
  CreateTeachingAssignmentInput,
  HomeroomAssignmentDTO,
  StatusKepegawaianGuru,
  StatusLifecycle,
  StatusPenugasan,
  SubjectDependencySummary,
  SubjectDTO,
  TeacherDependencySummary,
  TeacherProfileDTO,
  TeachingAssignmentDependencySummary,
  TeachingAssignmentDTO,
  UpdateSubjectInput,
  UpdateTeacherInput,
  UpdateTeachingAssignmentInput,
} from "../domain/teacher-types";

export class TeacherRepository {
  // =========================================================================
  // 1. DATA GURU (TEACHER PROFILE)
  // =========================================================================

  static async findTeachers(
    sekolah_id: string,
    options?: {
      search?: string;
      status_aktif?: boolean;
      status_lifecycle?: StatusLifecycle;
      status_kepegawaian?: StatusKepegawaianGuru;
      take?: number;
      skip?: number;
    }
  ): Promise<TeacherProfileDTO[]> {
    const where: Record<string, unknown> = { sekolah_id };

    if (options?.status_aktif !== undefined) {
      where.status_aktif = options.status_aktif;
    }
    if (options?.status_lifecycle) {
      where.status_lifecycle = options.status_lifecycle;
    }
    if (options?.status_kepegawaian) {
      where.status_kepegawaian = options.status_kepegawaian;
    }
    if (options?.search) {
      const q = options.search.trim();
      where.OR = [
        { nama_lengkap: { contains: q } },
        { nip: { contains: q } },
        { nuptk: { contains: q } },
        { email: { contains: q } },
      ];
    }

    const records = await prisma.guru.findMany({
      where,
      include: {
        pengguna: {
          select: {
            username: true,
            terakhir_login_pada: true,
            sesi: {
              take: 1,
              orderBy: { created_at: "desc" },
              select: { user_agent: true, created_at: true },
            },
          },
        },
        penugasan_mengajar: {
          where: { status: "AKTIF" },
          select: { id: true, rombel_id: true, jumlah_jam_minggu: true },
        },
        penugasan_wali: {
          where: { status: "AKTIF" },
          include: { rombel: { select: { nama: true } } },
        },
        _count: {
          select: {
            penugasan_mengajar: true,
            penugasan_wali: true,
            jadwal_pelajaran: true,
            sesi_kelas_aktual: true,
            sesi_pengganti: true,
            materi_dibuat: true,
            tugas_dibuat: true,
            administrasi_pembelajaran: true,
          },
        },
      },
      orderBy: { nama_lengkap: "asc" },
      take: options?.take,
      skip: options?.skip,
    });

    return records.map((r) => {
      const uniqueRombels = new Set(r.penugasan_mengajar.map((p) => p.rombel_id));
      const totalJam = r.penugasan_mengajar.reduce((acc, p) => acc + p.jumlah_jam_minggu, 0);
      const activeWali = r.penugasan_wali.length > 0 ? r.penugasan_wali[0] : null;
      const jumlahHistoriAkademik =
        r._count.penugasan_mengajar +
        r._count.penugasan_wali +
        r._count.jadwal_pelajaran +
        r._count.sesi_kelas_aktual +
        r._count.sesi_pengganti +
        r._count.materi_dibuat +
        r._count.tugas_dibuat +
        r._count.administrasi_pembelajaran;

      const namaGelar = [r.gelar_depan, r.nama_lengkap, r.gelar_belakang]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      const latestSession = r.pengguna?.sesi?.[0];
      const userAgent = latestSession?.user_agent;
      const lastActive = r.pengguna?.terakhir_login_pada || latestSession?.created_at;
      const deviceInfo = userAgent ? parseUserAgent(userAgent) : null;
      const presenceInfo = lastActive ? calculatePresence(lastActive) : null;

      return {
        id: r.id,
        sekolah_id: r.sekolah_id,
        pengguna_id: r.pengguna_id,
        username: r.pengguna?.username || null,
        nip: r.nip,
        nuptk: r.nuptk,
        nama_lengkap: r.nama_lengkap,
        gelar_depan: r.gelar_depan,
        gelar_belakang: r.gelar_belakang,
        nama_dengan_gelar: namaGelar,
        jenis_kelamin: r.jenis_kelamin as "L" | "P",
        tempat_lahir: r.tempat_lahir,
        tanggal_lahir: r.tanggal_lahir,
        email: r.email,
        telepon: r.telepon,
        alamat: r.alamat,
        status_kepegawaian: r.status_kepegawaian as StatusKepegawaianGuru,
        status_aktif: r.status_aktif,
        status_lifecycle: r.status_lifecycle as StatusLifecycle,
        foto_url: r.foto_url,
        catatan: r.catatan,
        created_at: r.created_at,
        updated_at: r.updated_at,
        total_rombel_aktif: uniqueRombels.size,
        total_jam_minggu: totalJam,
        is_wali_kelas_aktif: !!activeWali,
        rombel_wali_nama: activeWali?.rombel.nama || null,
        jumlah_histori_akademik: jumlahHistoriAkademik,
        bisa_hapus_permanen: jumlahHistoriAkademik === 0,
        device_info: deviceInfo,
        presence_info: presenceInfo,
      };
    });
  }

  static async findTeacherById(id: string, sekolah_id: string): Promise<TeacherProfileDTO | null> {
    const r = await prisma.guru.findFirst({
      where: { id, sekolah_id },
      include: {
        pengguna: {
          select: {
            username: true,
            terakhir_login_pada: true,
            sesi: {
              take: 1,
              orderBy: { created_at: "desc" },
              select: { user_agent: true, created_at: true },
            },
          },
        },
        penugasan_mengajar: {
          where: { status: "AKTIF" },
          select: { id: true, rombel_id: true, jumlah_jam_minggu: true },
        },
        penugasan_wali: {
          where: { status: "AKTIF" },
          include: { rombel: { select: { nama: true } } },
        },
        _count: {
          select: {
            penugasan_mengajar: true,
            penugasan_wali: true,
            jadwal_pelajaran: true,
            sesi_kelas_aktual: true,
            sesi_pengganti: true,
            materi_dibuat: true,
            tugas_dibuat: true,
            administrasi_pembelajaran: true,
          },
        },
      },
    });

    if (!r) return null;

    const uniqueRombels = new Set(r.penugasan_mengajar.map((p) => p.rombel_id));
    const totalJam = r.penugasan_mengajar.reduce((acc, p) => acc + p.jumlah_jam_minggu, 0);
    const activeWali = r.penugasan_wali.length > 0 ? r.penugasan_wali[0] : null;
    const jumlahHistoriAkademik =
      r._count.penugasan_mengajar +
      r._count.penugasan_wali +
      r._count.jadwal_pelajaran +
      r._count.sesi_kelas_aktual +
      r._count.sesi_pengganti +
      r._count.materi_dibuat +
      r._count.tugas_dibuat +
      r._count.administrasi_pembelajaran;

    const namaGelar = [r.gelar_depan, r.nama_lengkap, r.gelar_belakang]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const latestSession = r.pengguna?.sesi?.[0];
    const userAgent = latestSession?.user_agent;
    const lastActive = r.pengguna?.terakhir_login_pada || latestSession?.created_at;
    const deviceInfo = userAgent ? parseUserAgent(userAgent) : null;
    const presenceInfo = lastActive ? calculatePresence(lastActive) : null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      pengguna_id: r.pengguna_id,
      username: r.pengguna?.username || null,
      nip: r.nip,
      nuptk: r.nuptk,
      nama_lengkap: r.nama_lengkap,
      gelar_depan: r.gelar_depan,
      gelar_belakang: r.gelar_belakang,
      nama_dengan_gelar: namaGelar,
      jenis_kelamin: r.jenis_kelamin as "L" | "P",
      tempat_lahir: r.tempat_lahir,
      tanggal_lahir: r.tanggal_lahir,
      email: r.email,
      telepon: r.telepon,
      alamat: r.alamat,
      status_kepegawaian: r.status_kepegawaian as StatusKepegawaianGuru,
      status_aktif: r.status_aktif,
      status_lifecycle: r.status_lifecycle as StatusLifecycle,
      foto_url: r.foto_url,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
      total_rombel_aktif: uniqueRombels.size,
      total_jam_minggu: totalJam,
      is_wali_kelas_aktif: !!activeWali,
      rombel_wali_nama: activeWali?.rombel.nama || null,
      jumlah_histori_akademik: jumlahHistoriAkademik,
      bisa_hapus_permanen: jumlahHistoriAkademik === 0,
      device_info: deviceInfo,
      presence_info: presenceInfo,
    };
  }

  static async findTeacherByUserId(
    pengguna_id: string,
    sekolah_id?: string
  ): Promise<TeacherProfileDTO | null> {
    const where: Record<string, unknown> = { pengguna_id };
    if (sekolah_id) where.sekolah_id = sekolah_id;

    const r = await prisma.guru.findFirst({
      where,
      include: {
        pengguna: { select: { username: true } },
        penugasan_mengajar: {
          where: { status: "AKTIF" },
          select: { id: true, rombel_id: true, jumlah_jam_minggu: true },
        },
        penugasan_wali: {
          where: { status: "AKTIF" },
          include: { rombel: { select: { nama: true } } },
        },
        _count: {
          select: {
            penugasan_mengajar: true,
            penugasan_wali: true,
            jadwal_pelajaran: true,
            sesi_kelas_aktual: true,
            sesi_pengganti: true,
            materi_dibuat: true,
            tugas_dibuat: true,
            administrasi_pembelajaran: true,
          },
        },
      },
    });

    if (!r) return null;

    const uniqueRombels = new Set(r.penugasan_mengajar.map((p) => p.rombel_id));
    const totalJam = r.penugasan_mengajar.reduce((acc, p) => acc + p.jumlah_jam_minggu, 0);
    const activeWali = r.penugasan_wali.length > 0 ? r.penugasan_wali[0] : null;
    const jumlahHistoriAkademik =
      r._count.penugasan_mengajar +
      r._count.penugasan_wali +
      r._count.jadwal_pelajaran +
      r._count.sesi_kelas_aktual +
      r._count.sesi_pengganti +
      r._count.materi_dibuat +
      r._count.tugas_dibuat +
      r._count.administrasi_pembelajaran;

    const namaGelar = [r.gelar_depan, r.nama_lengkap, r.gelar_belakang]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      pengguna_id: r.pengguna_id,
      username: r.pengguna?.username || null,
      nip: r.nip,
      nuptk: r.nuptk,
      nama_lengkap: r.nama_lengkap,
      gelar_depan: r.gelar_depan,
      gelar_belakang: r.gelar_belakang,
      nama_dengan_gelar: namaGelar,
      jenis_kelamin: r.jenis_kelamin as "L" | "P",
      tempat_lahir: r.tempat_lahir,
      tanggal_lahir: r.tanggal_lahir,
      email: r.email,
      telepon: r.telepon,
      alamat: r.alamat,
      status_kepegawaian: r.status_kepegawaian as StatusKepegawaianGuru,
      status_aktif: r.status_aktif,
      status_lifecycle: r.status_lifecycle as StatusLifecycle,
      foto_url: r.foto_url,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
      total_rombel_aktif: uniqueRombels.size,
      total_jam_minggu: totalJam,
      is_wali_kelas_aktif: !!activeWali,
      rombel_wali_nama: activeWali?.rombel.nama || null,
      jumlah_histori_akademik: jumlahHistoriAkademik,
      bisa_hapus_permanen: jumlahHistoriAkademik === 0,
    };
  }

  static async findTeacherByNip(
    nip: string,
    sekolah_id: string
  ): Promise<TeacherProfileDTO | null> {
    const r = await prisma.guru.findFirst({
      where: { nip, sekolah_id },
      include: { pengguna: { select: { username: true } } },
    });
    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      pengguna_id: r.pengguna_id,
      username: r.pengguna?.username || null,
      nip: r.nip,
      nuptk: r.nuptk,
      nama_lengkap: r.nama_lengkap,
      gelar_depan: r.gelar_depan,
      gelar_belakang: r.gelar_belakang,
      nama_dengan_gelar: r.nama_lengkap,
      jenis_kelamin: r.jenis_kelamin as "L" | "P",
      tempat_lahir: r.tempat_lahir,
      tanggal_lahir: r.tanggal_lahir,
      email: r.email,
      telepon: r.telepon,
      alamat: r.alamat,
      status_kepegawaian: r.status_kepegawaian as StatusKepegawaianGuru,
      status_aktif: r.status_aktif,
      status_lifecycle: r.status_lifecycle as StatusLifecycle,
      foto_url: r.foto_url,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  static async createTeacher(input: CreateTeacherInput): Promise<TeacherProfileDTO> {
    const id = generateUlid();
    const r = await prisma.guru.create({
      data: {
        id,
        sekolah_id: input.sekolah_id,
        pengguna_id: input.pengguna_id || null,
        nip: input.nip || null,
        nuptk: input.nuptk || null,
        nama_lengkap: input.nama_lengkap,
        gelar_depan: input.gelar_depan || null,
        gelar_belakang: input.gelar_belakang || null,
        jenis_kelamin: input.jenis_kelamin,
        tempat_lahir: input.tempat_lahir || null,
        tanggal_lahir: input.tanggal_lahir || null,
        email: input.email || null,
        telepon: input.telepon || null,
        alamat: input.alamat || null,
        status_kepegawaian: input.status_kepegawaian || "TETAP",
        status_aktif: input.status_aktif ?? true,
        status_lifecycle:
          input.status_lifecycle || (input.status_aktif === false ? "NONAKTIF" : "AKTIF"),
        foto_url: input.foto_url || null,
        catatan: input.catatan || null,
      },
      include: { pengguna: { select: { username: true } } },
    });

    const namaGelar = [r.gelar_depan, r.nama_lengkap, r.gelar_belakang]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      pengguna_id: r.pengguna_id,
      username: r.pengguna?.username || null,
      nip: r.nip,
      nuptk: r.nuptk,
      nama_lengkap: r.nama_lengkap,
      gelar_depan: r.gelar_depan,
      gelar_belakang: r.gelar_belakang,
      nama_dengan_gelar: namaGelar,
      jenis_kelamin: r.jenis_kelamin as "L" | "P",
      tempat_lahir: r.tempat_lahir,
      tanggal_lahir: r.tanggal_lahir,
      email: r.email,
      telepon: r.telepon,
      alamat: r.alamat,
      status_kepegawaian: r.status_kepegawaian as StatusKepegawaianGuru,
      status_aktif: r.status_aktif,
      status_lifecycle: r.status_lifecycle as StatusLifecycle,
      foto_url: r.foto_url,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
      total_rombel_aktif: 0,
      total_jam_minggu: 0,
      is_wali_kelas_aktif: false,
    };
  }

  static async updateTeacher(input: UpdateTeacherInput): Promise<TeacherProfileDTO> {
    const data: Record<string, unknown> = {};
    if (input.pengguna_id !== undefined) data.pengguna_id = input.pengguna_id || null;
    if (input.nip !== undefined) data.nip = input.nip || null;
    if (input.nuptk !== undefined) data.nuptk = input.nuptk || null;
    if (input.nama_lengkap !== undefined) data.nama_lengkap = input.nama_lengkap;
    if (input.gelar_depan !== undefined) data.gelar_depan = input.gelar_depan || null;
    if (input.gelar_belakang !== undefined) data.gelar_belakang = input.gelar_belakang || null;
    if (input.jenis_kelamin !== undefined) data.jenis_kelamin = input.jenis_kelamin;
    if (input.tempat_lahir !== undefined) data.tempat_lahir = input.tempat_lahir || null;
    if (input.tanggal_lahir !== undefined) data.tanggal_lahir = input.tanggal_lahir || null;
    if (input.email !== undefined) data.email = input.email || null;
    if (input.telepon !== undefined) data.telepon = input.telepon || null;
    if (input.alamat !== undefined) data.alamat = input.alamat || null;
    if (input.status_kepegawaian !== undefined) data.status_kepegawaian = input.status_kepegawaian;
    if (input.status_aktif !== undefined) data.status_aktif = input.status_aktif;
    if (input.status_lifecycle !== undefined) {
      data.status_lifecycle = input.status_lifecycle;
      data.status_aktif = input.status_lifecycle === "AKTIF";
    } else if (input.status_aktif !== undefined) {
      data.status_lifecycle = input.status_aktif ? "AKTIF" : "NONAKTIF";
    }
    if (input.foto_url !== undefined) data.foto_url = input.foto_url || null;
    if (input.catatan !== undefined) data.catatan = input.catatan || null;

    const existing = await prisma.guru.findFirst({
      where: { id: input.id, ...(input.sekolah_id ? { sekolah_id: input.sekolah_id } : {}) },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Guru dengan ID '${input.id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    const r = await prisma.guru.update({
      where: { id: input.id },
      data,
      include: {
        pengguna: { select: { username: true } },
        penugasan_mengajar: {
          where: { status: "AKTIF" },
          select: { id: true, rombel_id: true, jumlah_jam_minggu: true },
        },
        penugasan_wali: {
          where: { status: "AKTIF" },
          include: { rombel: { select: { nama: true } } },
        },
      },
    });

    const uniqueRombels = new Set(r.penugasan_mengajar.map((p) => p.rombel_id));
    const totalJam = r.penugasan_mengajar.reduce((acc, p) => acc + p.jumlah_jam_minggu, 0);
    const activeWali = r.penugasan_wali.length > 0 ? r.penugasan_wali[0] : null;

    const namaGelar = [r.gelar_depan, r.nama_lengkap, r.gelar_belakang]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      pengguna_id: r.pengguna_id,
      username: r.pengguna?.username || null,
      nip: r.nip,
      nuptk: r.nuptk,
      nama_lengkap: r.nama_lengkap,
      gelar_depan: r.gelar_depan,
      gelar_belakang: r.gelar_belakang,
      nama_dengan_gelar: namaGelar,
      jenis_kelamin: r.jenis_kelamin as "L" | "P",
      tempat_lahir: r.tempat_lahir,
      tanggal_lahir: r.tanggal_lahir,
      email: r.email,
      telepon: r.telepon,
      alamat: r.alamat,
      status_kepegawaian: r.status_kepegawaian as StatusKepegawaianGuru,
      status_aktif: r.status_aktif,
      status_lifecycle: r.status_lifecycle as StatusLifecycle,
      foto_url: r.foto_url,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
      total_rombel_aktif: uniqueRombels.size,
      total_jam_minggu: totalJam,
      is_wali_kelas_aktif: !!activeWali,
      rombel_wali_nama: activeWali?.rombel.nama || null,
    };
  }

  static async deleteTeacher(id: string, sekolah_id: string): Promise<boolean> {
    const deleted = await prisma.guru.deleteMany({
      where: { id, sekolah_id },
    });
    return deleted.count === 1;
  }

  static async getTeacherDependencySummary(
    id: string,
    sekolah_id: string
  ): Promise<TeacherDependencySummary> {
    const [
      penugasanMengajar,
      penugasanWali,
      jadwalPelajaran,
      sesiSebagaiPengampu,
      sesiSebagaiPengganti,
      materiPembelajaran,
      definisiTugas,
      administrasiPembelajaran,
    ] = await prisma.$transaction([
      prisma.penugasanMengajar.count({ where: { guru_id: id, sekolah_id } }),
      prisma.penugasanWaliKelas.count({ where: { guru_id: id, sekolah_id } }),
      prisma.jadwalPelajaran.count({ where: { guru_id: id, sekolah_id } }),
      prisma.sesiKelasAktual.count({ where: { guru_id: id, sekolah_id } }),
      prisma.sesiKelasAktual.count({ where: { guru_pengganti_id: id, sekolah_id } }),
      prisma.materiPembelajaran.count({ where: { guru_id: id, sekolah_id } }),
      prisma.definisiTugas.count({ where: { guru_id: id, sekolah_id } }),
      prisma.administrasiPembelajaran.count({ where: { guru_id: id, sekolah_id } }),
    ]);

    return {
      penugasan_mengajar: penugasanMengajar,
      penugasan_wali: penugasanWali,
      jadwal_pelajaran: jadwalPelajaran,
      sesi_sebagai_pengampu: sesiSebagaiPengampu,
      sesi_sebagai_pengganti: sesiSebagaiPengganti,
      materi_pembelajaran: materiPembelajaran,
      definisi_tugas: definisiTugas,
      administrasi_pembelajaran: administrasiPembelajaran,
      total:
        penugasanMengajar +
        penugasanWali +
        jadwalPelajaran +
        sesiSebagaiPengampu +
        sesiSebagaiPengganti +
        materiPembelajaran +
        definisiTugas +
        administrasiPembelajaran,
    };
  }

  static async updateTeacherLifecycle(
    id: string,
    sekolah_id: string,
    status_lifecycle: StatusLifecycle
  ): Promise<TeacherProfileDTO> {
    return this.updateTeacher({
      id,
      sekolah_id,
      status_lifecycle,
      status_aktif: status_lifecycle === "AKTIF",
    });
  }

  // =========================================================================
  // 2. MATA PELAJARAN (SUBJECTS)
  // =========================================================================

  static async findSubjects(
    sekolah_id: string,
    options?: {
      search?: string;
      status_aktif?: boolean;
      status_lifecycle?: StatusLifecycle;
      kelompok?: string;
      take?: number;
      skip?: number;
    }
  ): Promise<SubjectDTO[]> {
    const where: Record<string, unknown> = { sekolah_id };

    if (options?.status_aktif !== undefined) {
      where.status_aktif = options.status_aktif;
    }
    if (options?.status_lifecycle) {
      where.status_lifecycle = options.status_lifecycle;
    }
    if (options?.kelompok) {
      where.kelompok = options.kelompok;
    }
    if (options?.search) {
      const q = options.search.trim();
      where.OR = [{ kode: { contains: q } }, { nama: { contains: q } }];
    }

    const records = await prisma.mataPelajaran.findMany({
      where,
      include: {
        penugasan_mengajar: {
          where: { status: "AKTIF" },
          select: { guru_id: true, rombel_id: true },
        },
        _count: {
          select: {
            penugasan_mengajar: true,
            jadwal_pelajaran: true,
            sesi_kelas_aktual: true,
            materi_pembelajaran: true,
            definisi_tugas: true,
          },
        },
      },
      orderBy: { kode: "asc" },
      take: options?.take,
      skip: options?.skip,
    });

    return records.map((r) => {
      const uniqueTeachers = new Set(r.penugasan_mengajar.map((p) => p.guru_id));
      const uniqueRombels = new Set(r.penugasan_mengajar.map((p) => p.rombel_id));
      const jumlahHistoriAkademik =
        r._count.penugasan_mengajar +
        r._count.jadwal_pelajaran +
        r._count.sesi_kelas_aktual +
        r._count.materi_pembelajaran +
        r._count.definisi_tugas;

      return {
        id: r.id,
        sekolah_id: r.sekolah_id,
        kode: r.kode,
        nama: r.nama,
        kelompok: r.kelompok,
        status_aktif: r.status_aktif,
        status_lifecycle: r.status_lifecycle as StatusLifecycle,
        deskripsi: r.deskripsi,
        created_at: r.created_at,
        updated_at: r.updated_at,
        total_guru_pengajar: uniqueTeachers.size,
        total_rombel_aktif: uniqueRombels.size,
        jumlah_histori_akademik: jumlahHistoriAkademik,
        bisa_hapus_permanen: jumlahHistoriAkademik === 0,
      };
    });
  }

  static async findSubjectById(id: string, sekolah_id: string): Promise<SubjectDTO | null> {
    const r = await prisma.mataPelajaran.findFirst({
      where: { id, sekolah_id },
      include: {
        penugasan_mengajar: {
          where: { status: "AKTIF" },
          select: { guru_id: true, rombel_id: true },
        },
        _count: {
          select: {
            penugasan_mengajar: true,
            jadwal_pelajaran: true,
            sesi_kelas_aktual: true,
            materi_pembelajaran: true,
            definisi_tugas: true,
          },
        },
      },
    });
    if (!r) return null;

    const uniqueTeachers = new Set(r.penugasan_mengajar.map((p) => p.guru_id));
    const uniqueRombels = new Set(r.penugasan_mengajar.map((p) => p.rombel_id));
    const jumlahHistoriAkademik =
      r._count.penugasan_mengajar +
      r._count.jadwal_pelajaran +
      r._count.sesi_kelas_aktual +
      r._count.materi_pembelajaran +
      r._count.definisi_tugas;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      kode: r.kode,
      nama: r.nama,
      kelompok: r.kelompok,
      status_aktif: r.status_aktif,
      status_lifecycle: r.status_lifecycle as StatusLifecycle,
      deskripsi: r.deskripsi,
      created_at: r.created_at,
      updated_at: r.updated_at,
      total_guru_pengajar: uniqueTeachers.size,
      total_rombel_aktif: uniqueRombels.size,
      jumlah_histori_akademik: jumlahHistoriAkademik,
      bisa_hapus_permanen: jumlahHistoriAkademik === 0,
    };
  }

  static async findSubjectByKode(kode: string, sekolah_id: string): Promise<SubjectDTO | null> {
    const r = await prisma.mataPelajaran.findFirst({
      where: { kode, sekolah_id },
    });
    if (!r) return null;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      kode: r.kode,
      nama: r.nama,
      kelompok: r.kelompok,
      status_aktif: r.status_aktif,
      status_lifecycle: r.status_lifecycle as StatusLifecycle,
      deskripsi: r.deskripsi,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  static async createSubject(input: CreateSubjectInput): Promise<SubjectDTO> {
    const id = generateUlid();
    const r = await prisma.mataPelajaran.create({
      data: {
        id,
        sekolah_id: input.sekolah_id,
        kode: input.kode,
        nama: input.nama,
        kelompok: input.kelompok || null,
        status_aktif: input.status_aktif ?? true,
        status_lifecycle:
          input.status_lifecycle || (input.status_aktif === false ? "NONAKTIF" : "AKTIF"),
        deskripsi: input.deskripsi || null,
      },
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      kode: r.kode,
      nama: r.nama,
      kelompok: r.kelompok,
      status_aktif: r.status_aktif,
      status_lifecycle: r.status_lifecycle as StatusLifecycle,
      deskripsi: r.deskripsi,
      created_at: r.created_at,
      updated_at: r.updated_at,
      total_guru_pengajar: 0,
      total_rombel_aktif: 0,
    };
  }

  static async updateSubject(input: UpdateSubjectInput): Promise<SubjectDTO> {
    const data: Record<string, unknown> = {};
    if (input.kode !== undefined) data.kode = input.kode;
    if (input.nama !== undefined) data.nama = input.nama;
    if (input.kelompok !== undefined) data.kelompok = input.kelompok || null;
    if (input.status_aktif !== undefined) data.status_aktif = input.status_aktif;
    if (input.status_lifecycle !== undefined) {
      data.status_lifecycle = input.status_lifecycle;
      data.status_aktif = input.status_lifecycle === "AKTIF";
    } else if (input.status_aktif !== undefined) {
      data.status_lifecycle = input.status_aktif ? "AKTIF" : "NONAKTIF";
    }
    if (input.deskripsi !== undefined) data.deskripsi = input.deskripsi || null;

    const existing = await prisma.mataPelajaran.findFirst({
      where: { id: input.id, ...(input.sekolah_id ? { sekolah_id: input.sekolah_id } : {}) },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Mata pelajaran dengan ID '${input.id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    const r = await prisma.mataPelajaran.update({
      where: { id: input.id },
      data,
    });

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      kode: r.kode,
      nama: r.nama,
      kelompok: r.kelompok,
      status_aktif: r.status_aktif,
      status_lifecycle: r.status_lifecycle as StatusLifecycle,
      deskripsi: r.deskripsi,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  static async countSubjectUsage(id: string, sekolah_id: string): Promise<number> {
    const summary = await this.getSubjectDependencySummary(id, sekolah_id);
    return summary.total;
  }

  static async getSubjectDependencySummary(
    id: string,
    sekolah_id: string
  ): Promise<SubjectDependencySummary> {
    const [penugasanMengajar, jadwalPelajaran, sesiKelasAktual, materiPembelajaran, definisiTugas] =
      await prisma.$transaction([
        prisma.penugasanMengajar.count({ where: { mata_pelajaran_id: id, sekolah_id } }),
        prisma.jadwalPelajaran.count({ where: { mata_pelajaran_id: id, sekolah_id } }),
        prisma.sesiKelasAktual.count({ where: { mata_pelajaran_id: id, sekolah_id } }),
        prisma.materiPembelajaran.count({ where: { mata_pelajaran_id: id, sekolah_id } }),
        prisma.definisiTugas.count({ where: { mata_pelajaran_id: id, sekolah_id } }),
      ]);

    return {
      penugasan_mengajar: penugasanMengajar,
      jadwal_pelajaran: jadwalPelajaran,
      sesi_kelas_aktual: sesiKelasAktual,
      materi_pembelajaran: materiPembelajaran,
      definisi_tugas: definisiTugas,
      total:
        penugasanMengajar + jadwalPelajaran + sesiKelasAktual + materiPembelajaran + definisiTugas,
    };
  }

  static async updateSubjectLifecycle(
    id: string,
    sekolah_id: string,
    status_lifecycle: StatusLifecycle
  ): Promise<SubjectDTO> {
    return this.updateSubject({
      id,
      sekolah_id,
      status_lifecycle,
      status_aktif: status_lifecycle === "AKTIF",
    });
  }

  static async deleteSubject(id: string, sekolah_id: string): Promise<boolean> {
    const deleted = await prisma.mataPelajaran.deleteMany({
      where: { id, sekolah_id },
    });
    if (deleted.count === 0) {
      throw new Error(
        `Mata pelajaran dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }
    return true;
  }

  // =========================================================================
  // 3. PENUGASAN MENGAJAR (TEACHING ASSIGNMENTS)
  // =========================================================================

  static async findTeachingAssignments(
    sekolah_id: string,
    options?: {
      guru_id?: string;
      mata_pelajaran_id?: string;
      rombel_id?: string;
      tahun_ajaran_id?: string;
      semester_id?: string;
      status?: StatusPenugasan;
      take?: number;
      skip?: number;
    }
  ): Promise<TeachingAssignmentDTO[]> {
    const where: Record<string, unknown> = { sekolah_id };

    if (options?.guru_id) where.guru_id = options.guru_id;
    if (options?.mata_pelajaran_id) where.mata_pelajaran_id = options.mata_pelajaran_id;
    if (options?.rombel_id) where.rombel_id = options.rombel_id;
    if (options?.tahun_ajaran_id) where.tahun_ajaran_id = options.tahun_ajaran_id;
    if (options?.semester_id) where.semester_id = options.semester_id;
    if (options?.status) where.status = options.status;

    const records = await prisma.penugasanMengajar.findMany({
      where,
      include: {
        guru: {
          select: {
            nama_lengkap: true,
            gelar_depan: true,
            gelar_belakang: true,
            nip: true,
            foto_url: true,
          },
        },
        mata_pelajaran: { select: { kode: true, nama: true } },
        tahun_ajaran: { select: { nama: true } },
        semester: { select: { nama: true } },
        rombel: {
          select: {
            nama: true,
            tingkat: { select: { nama: true } },
          },
        },
        _count: {
          select: {
            jadwal_pelajaran: true,
            sesi_kelas_aktual: true,
            lingkup_materi: true,
            publikasi_materi: true,
            publikasi_tugas: true,
            administrasi_pembelajaran: true,
          },
        },
      },
      orderBy: [
        { tahun_ajaran: { nama: "desc" } },
        { rombel: { nama: "asc" } },
        { mata_pelajaran: { nama: "asc" } },
      ],
      take: options?.take,
      skip: options?.skip,
    });

    return records.map((r) => {
      const namaGelar = [r.guru.gelar_depan, r.guru.nama_lengkap, r.guru.gelar_belakang]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const jumlahHistoriAkademik =
        r._count.jadwal_pelajaran +
        r._count.sesi_kelas_aktual +
        r._count.lingkup_materi +
        r._count.publikasi_materi +
        r._count.publikasi_tugas +
        r._count.administrasi_pembelajaran;

      return {
        id: r.id,
        sekolah_id: r.sekolah_id,
        guru_id: r.guru_id,
        mata_pelajaran_id: r.mata_pelajaran_id,
        tahun_ajaran_id: r.tahun_ajaran_id,
        semester_id: r.semester_id,
        rombel_id: r.rombel_id,
        jumlah_jam_minggu: r.jumlah_jam_minggu,
        berlaku_mulai: r.berlaku_mulai,
        berlaku_sampai: r.berlaku_sampai,
        status: r.status as StatusPenugasan,
        catatan: r.catatan,
        created_at: r.created_at,
        updated_at: r.updated_at,
        guru_nama: namaGelar,
        guru_nip: r.guru.nip,
        guru_foto_url: r.guru.foto_url,
        mata_pelajaran_kode: r.mata_pelajaran.kode,
        mata_pelajaran_nama: r.mata_pelajaran.nama,
        tahun_ajaran_nama: r.tahun_ajaran.nama,
        semester_nama: r.semester?.nama || null,
        rombel_nama: r.rombel.nama,
        tingkat_nama: r.rombel.tingkat?.nama || null,
        jumlah_histori_akademik: jumlahHistoriAkademik,
        bisa_hapus_permanen: jumlahHistoriAkademik === 0,
      };
    });
  }

  static async findTeachingAssignmentById(
    id: string,
    sekolah_id: string
  ): Promise<TeachingAssignmentDTO | null> {
    const r = await prisma.penugasanMengajar.findFirst({
      where: { id, sekolah_id },
      include: {
        guru: {
          select: {
            nama_lengkap: true,
            gelar_depan: true,
            gelar_belakang: true,
            nip: true,
            foto_url: true,
          },
        },
        mata_pelajaran: { select: { kode: true, nama: true } },
        tahun_ajaran: { select: { nama: true } },
        semester: { select: { nama: true } },
        rombel: {
          select: {
            nama: true,
            tingkat: { select: { nama: true } },
          },
        },
        _count: {
          select: {
            jadwal_pelajaran: true,
            sesi_kelas_aktual: true,
            lingkup_materi: true,
            publikasi_materi: true,
            publikasi_tugas: true,
            administrasi_pembelajaran: true,
          },
        },
      },
    });
    if (!r) return null;

    const namaGelar = [r.guru.gelar_depan, r.guru.nama_lengkap, r.guru.gelar_belakang]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const jumlahHistoriAkademik =
      r._count.jadwal_pelajaran +
      r._count.sesi_kelas_aktual +
      r._count.lingkup_materi +
      r._count.publikasi_materi +
      r._count.publikasi_tugas +
      r._count.administrasi_pembelajaran;

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      guru_id: r.guru_id,
      mata_pelajaran_id: r.mata_pelajaran_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      semester_id: r.semester_id,
      rombel_id: r.rombel_id,
      jumlah_jam_minggu: r.jumlah_jam_minggu,
      berlaku_mulai: r.berlaku_mulai,
      berlaku_sampai: r.berlaku_sampai,
      status: r.status as StatusPenugasan,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
      guru_nama: namaGelar,
      guru_nip: r.guru.nip,
      guru_foto_url: r.guru.foto_url,
      mata_pelajaran_kode: r.mata_pelajaran.kode,
      mata_pelajaran_nama: r.mata_pelajaran.nama,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      semester_nama: r.semester?.nama || null,
      rombel_nama: r.rombel.nama,
      tingkat_nama: r.rombel.tingkat?.nama || null,
      jumlah_histori_akademik: jumlahHistoriAkademik,
      bisa_hapus_permanen: jumlahHistoriAkademik === 0,
    };
  }

  static async findActiveAssignmentConflict(
    sekolah_id: string,
    mata_pelajaran_id: string,
    rombel_id: string,
    tahun_ajaran_id: string,
    semester_id?: string | null,
    excludeId?: string
  ) {
    const where: Record<string, unknown> = {
      sekolah_id,
      mata_pelajaran_id,
      rombel_id,
      tahun_ajaran_id,
      status: "AKTIF",
    };
    if (semester_id) {
      where.semester_id = semester_id;
    }
    if (excludeId) {
      where.id = { not: excludeId };
    }

    return prisma.penugasanMengajar.findFirst({
      where,
      include: {
        guru: { select: { nama_lengkap: true } },
        mata_pelajaran: { select: { nama: true } },
        rombel: { select: { nama: true } },
      },
    });
  }

  static async createTeachingAssignment(
    input: CreateTeachingAssignmentInput
  ): Promise<TeachingAssignmentDTO> {
    const id = generateUlid();
    const r = await prisma.penugasanMengajar.create({
      data: {
        id,
        sekolah_id: input.sekolah_id,
        guru_id: input.guru_id,
        mata_pelajaran_id: input.mata_pelajaran_id,
        tahun_ajaran_id: input.tahun_ajaran_id,
        semester_id: input.semester_id || null,
        rombel_id: input.rombel_id,
        jumlah_jam_minggu: input.jumlah_jam_minggu,
        berlaku_mulai: input.berlaku_mulai || new Date(),
        berlaku_sampai: input.berlaku_sampai || null,
        status: input.status || "AKTIF",
        catatan: input.catatan || null,
      },
      include: {
        guru: {
          select: {
            nama_lengkap: true,
            gelar_depan: true,
            gelar_belakang: true,
            nip: true,
            foto_url: true,
          },
        },
        mata_pelajaran: { select: { kode: true, nama: true } },
        tahun_ajaran: { select: { nama: true } },
        semester: { select: { nama: true } },
        rombel: {
          select: {
            nama: true,
            tingkat: { select: { nama: true } },
          },
        },
      },
    });

    const namaGelar = [r.guru.gelar_depan, r.guru.nama_lengkap, r.guru.gelar_belakang]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      guru_id: r.guru_id,
      mata_pelajaran_id: r.mata_pelajaran_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      semester_id: r.semester_id,
      rombel_id: r.rombel_id,
      jumlah_jam_minggu: r.jumlah_jam_minggu,
      berlaku_mulai: r.berlaku_mulai,
      berlaku_sampai: r.berlaku_sampai,
      status: r.status as StatusPenugasan,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
      guru_nama: namaGelar,
      guru_nip: r.guru.nip,
      guru_foto_url: r.guru.foto_url,
      mata_pelajaran_kode: r.mata_pelajaran.kode,
      mata_pelajaran_nama: r.mata_pelajaran.nama,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      semester_nama: r.semester?.nama || null,
      rombel_nama: r.rombel.nama,
      tingkat_nama: r.rombel.tingkat?.nama || null,
    };
  }

  static async updateTeachingAssignment(
    input: UpdateTeachingAssignmentInput
  ): Promise<TeachingAssignmentDTO> {
    const data: Record<string, unknown> = {};
    if (input.jumlah_jam_minggu !== undefined) data.jumlah_jam_minggu = input.jumlah_jam_minggu;
    if (input.status !== undefined) data.status = input.status;
    if (input.berlaku_sampai !== undefined) data.berlaku_sampai = input.berlaku_sampai || null;
    if (input.catatan !== undefined) data.catatan = input.catatan || null;

    const existing = await prisma.penugasanMengajar.findFirst({
      where: { id: input.id, ...(input.sekolah_id ? { sekolah_id: input.sekolah_id } : {}) },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Penugasan mengajar dengan ID '${input.id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    const r = await prisma.penugasanMengajar.update({
      where: { id: input.id },
      data,
      include: {
        guru: {
          select: {
            nama_lengkap: true,
            gelar_depan: true,
            gelar_belakang: true,
            nip: true,
            foto_url: true,
          },
        },
        mata_pelajaran: { select: { kode: true, nama: true } },
        tahun_ajaran: { select: { nama: true } },
        semester: { select: { nama: true } },
        rombel: {
          select: {
            nama: true,
            tingkat: { select: { nama: true } },
          },
        },
      },
    });

    const namaGelar = [r.guru.gelar_depan, r.guru.nama_lengkap, r.guru.gelar_belakang]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      guru_id: r.guru_id,
      mata_pelajaran_id: r.mata_pelajaran_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      semester_id: r.semester_id,
      rombel_id: r.rombel_id,
      jumlah_jam_minggu: r.jumlah_jam_minggu,
      berlaku_mulai: r.berlaku_mulai,
      berlaku_sampai: r.berlaku_sampai,
      status: r.status as StatusPenugasan,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
      guru_nama: namaGelar,
      guru_nip: r.guru.nip,
      guru_foto_url: r.guru.foto_url,
      mata_pelajaran_kode: r.mata_pelajaran.kode,
      mata_pelajaran_nama: r.mata_pelajaran.nama,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      semester_nama: r.semester?.nama || null,
      rombel_nama: r.rombel.nama,
      tingkat_nama: r.rombel.tingkat?.nama || null,
    };
  }

  static async closeTeachingAssignment(
    id: string,
    sekolah_id: string,
    status: StatusPenugasan = "SELESAI",
    berlaku_sampai: Date = new Date()
  ): Promise<boolean> {
    await prisma.penugasanMengajar.updateMany({
      where: { id, sekolah_id },
      data: { status, berlaku_sampai },
    });
    return true;
  }

  static async getTeachingAssignmentDependencySummary(
    id: string,
    sekolah_id: string
  ): Promise<TeachingAssignmentDependencySummary> {
    const [
      jadwalPelajaran,
      sesiKelasAktual,
      lingkupMateri,
      publikasiMateri,
      publikasiTugas,
      administrasiPembelajaran,
    ] = await prisma.$transaction([
      prisma.jadwalPelajaran.count({ where: { penugasan_mengajar_id: id, sekolah_id } }),
      prisma.sesiKelasAktual.count({ where: { penugasan_mengajar_id: id, sekolah_id } }),
      prisma.lingkupMateri.count({ where: { penugasan_mengajar_id: id, sekolah_id } }),
      prisma.publikasiMateri.count({ where: { penugasan_mengajar_id: id, sekolah_id } }),
      prisma.publikasiTugas.count({ where: { penugasan_mengajar_id: id, sekolah_id } }),
      prisma.administrasiPembelajaran.count({
        where: { penugasan_mengajar_id: id, sekolah_id },
      }),
    ]);

    return {
      jadwal_pelajaran: jadwalPelajaran,
      sesi_kelas_aktual: sesiKelasAktual,
      lingkup_materi: lingkupMateri,
      publikasi_materi: publikasiMateri,
      publikasi_tugas: publikasiTugas,
      administrasi_pembelajaran: administrasiPembelajaran,
      total:
        jadwalPelajaran +
        sesiKelasAktual +
        lingkupMateri +
        publikasiMateri +
        publikasiTugas +
        administrasiPembelajaran,
    };
  }

  static async deleteTeachingAssignment(id: string, sekolah_id: string): Promise<boolean> {
    const deleted = await prisma.penugasanMengajar.deleteMany({
      where: { id, sekolah_id },
    });
    return deleted.count === 1;
  }

  // =========================================================================
  // 4. PENUGASAN WALI KELAS (HOMEROOM ASSIGNMENTS)
  // =========================================================================

  static async findHomeroomAssignments(
    sekolah_id: string,
    options?: {
      guru_id?: string;
      rombel_id?: string;
      tahun_ajaran_id?: string;
      status?: StatusPenugasan;
      take?: number;
      skip?: number;
    }
  ): Promise<HomeroomAssignmentDTO[]> {
    const where: Record<string, unknown> = { sekolah_id };

    if (options?.guru_id) where.guru_id = options.guru_id;
    if (options?.rombel_id) where.rombel_id = options.rombel_id;
    if (options?.tahun_ajaran_id) where.tahun_ajaran_id = options.tahun_ajaran_id;
    if (options?.status) where.status = options.status;

    const records = await prisma.penugasanWaliKelas.findMany({
      where,
      include: {
        guru: {
          select: {
            nama_lengkap: true,
            gelar_depan: true,
            gelar_belakang: true,
            nip: true,
            foto_url: true,
          },
        },
        rombel: {
          select: {
            nama: true,
            tingkat: { select: { nama: true } },
            penempatan_rombel: { where: { status: "AKTIF" }, select: { id: true } },
          },
        },
        tahun_ajaran: { select: { nama: true } },
      },
      orderBy: [{ tahun_ajaran: { nama: "desc" } }, { rombel: { nama: "asc" } }],
      take: options?.take,
      skip: options?.skip,
    });

    return records.map((r) => {
      const namaGelar = [r.guru.gelar_depan, r.guru.nama_lengkap, r.guru.gelar_belakang]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      return {
        id: r.id,
        sekolah_id: r.sekolah_id,
        guru_id: r.guru_id,
        rombel_id: r.rombel_id,
        tahun_ajaran_id: r.tahun_ajaran_id,
        berlaku_mulai: r.berlaku_mulai,
        berlaku_sampai: r.berlaku_sampai,
        status: r.status as StatusPenugasan,
        catatan: r.catatan,
        created_at: r.created_at,
        updated_at: r.updated_at,
        guru_nama: namaGelar,
        guru_nip: r.guru.nip,
        guru_foto_url: r.guru.foto_url,
        rombel_nama: r.rombel.nama,
        tingkat_nama: r.rombel.tingkat?.nama || null,
        tahun_ajaran_nama: r.tahun_ajaran.nama,
        total_siswa_rombel: r.rombel.penempatan_rombel.length,
      };
    });
  }

  static async findHomeroomAssignmentById(
    id: string,
    sekolah_id: string
  ): Promise<HomeroomAssignmentDTO | null> {
    const r = await prisma.penugasanWaliKelas.findFirst({
      where: { id, sekolah_id },
      include: {
        guru: {
          select: {
            nama_lengkap: true,
            gelar_depan: true,
            gelar_belakang: true,
            nip: true,
            foto_url: true,
          },
        },
        rombel: {
          select: {
            nama: true,
            tingkat: { select: { nama: true } },
            penempatan_rombel: { where: { status: "AKTIF" }, select: { id: true } },
          },
        },
        tahun_ajaran: { select: { nama: true } },
      },
    });
    if (!r) return null;

    const namaGelar = [r.guru.gelar_depan, r.guru.nama_lengkap, r.guru.gelar_belakang]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      guru_id: r.guru_id,
      rombel_id: r.rombel_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      berlaku_mulai: r.berlaku_mulai,
      berlaku_sampai: r.berlaku_sampai,
      status: r.status as StatusPenugasan,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
      guru_nama: namaGelar,
      guru_nip: r.guru.nip,
      guru_foto_url: r.guru.foto_url,
      rombel_nama: r.rombel.nama,
      tingkat_nama: r.rombel.tingkat?.nama || null,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      total_siswa_rombel: r.rombel.penempatan_rombel.length,
    };
  }

  static async findActiveHomeroomByRombel(
    rombel_id: string,
    tahun_ajaran_id: string,
    sekolah_id: string,
    excludeId?: string
  ) {
    const where: Record<string, unknown> = {
      rombel_id,
      tahun_ajaran_id,
      sekolah_id,
      status: "AKTIF",
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    return prisma.penugasanWaliKelas.findFirst({
      where,
      include: {
        guru: { select: { nama_lengkap: true } },
        rombel: { select: { nama: true } },
      },
    });
  }

  static async assignHomeroom(input: AssignHomeroomInput): Promise<HomeroomAssignmentDTO> {
    const id = generateUlid();
    const r = await prisma.penugasanWaliKelas.create({
      data: {
        id,
        sekolah_id: input.sekolah_id,
        guru_id: input.guru_id,
        rombel_id: input.rombel_id,
        tahun_ajaran_id: input.tahun_ajaran_id,
        berlaku_mulai: input.berlaku_mulai || new Date(),
        status: "AKTIF",
        catatan: input.catatan || null,
      },
      include: {
        guru: {
          select: {
            nama_lengkap: true,
            gelar_depan: true,
            gelar_belakang: true,
            nip: true,
            foto_url: true,
          },
        },
        rombel: {
          select: {
            nama: true,
            tingkat: { select: { nama: true } },
            penempatan_rombel: { where: { status: "AKTIF" }, select: { id: true } },
          },
        },
        tahun_ajaran: { select: { nama: true } },
      },
    });

    const namaGelar = [r.guru.gelar_depan, r.guru.nama_lengkap, r.guru.gelar_belakang]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      id: r.id,
      sekolah_id: r.sekolah_id,
      guru_id: r.guru_id,
      rombel_id: r.rombel_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      berlaku_mulai: r.berlaku_mulai,
      berlaku_sampai: r.berlaku_sampai,
      status: r.status as StatusPenugasan,
      catatan: r.catatan,
      created_at: r.created_at,
      updated_at: r.updated_at,
      guru_nama: namaGelar,
      guru_nip: r.guru.nip,
      guru_foto_url: r.guru.foto_url,
      rombel_nama: r.rombel.nama,
      tingkat_nama: r.rombel.tingkat?.nama || null,
      tahun_ajaran_nama: r.tahun_ajaran.nama,
      total_siswa_rombel: r.rombel.penempatan_rombel.length,
    };
  }

  static async closeHomeroomAssignment(
    id: string,
    sekolah_id: string,
    status: StatusPenugasan = "SELESAI",
    berlaku_sampai: Date = new Date()
  ): Promise<boolean> {
    await prisma.penugasanWaliKelas.updateMany({
      where: { id, sekolah_id },
      data: { status, berlaku_sampai },
    });
    return true;
  }
}
