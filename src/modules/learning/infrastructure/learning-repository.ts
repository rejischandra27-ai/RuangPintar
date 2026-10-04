/**
 * Ruang Pintar — M11 Learning Prisma Repository
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import {
  CreateAdministrasiInput,
  CreateLingkupMateriInput,
  CreateMateriInput,
  CreateTugasInput,
  CreateTujuanPembelajaranInput,
  LingkupMateriDTO,
  MateriPembelajaranDTO,
  TeacherClassCardDTO,
  TeacherClassWorkspaceDTO,
  TujuanPembelajaranDTO,
  UpdateAdministrasiInput,
  UpdateLingkupMateriInput,
  UpdateMateriInput,
  UpdateTujuanPembelajaranInput,
  AdministrasiPembelajaranDTO,
  DefinisiTugasDTO,
} from "../domain/learning-types";

export class LearningRepository {
  /**
   * Mengambil seluruh penugasan mengajar aktif guru (Daftar Kelas Saya)
   */
  async listTeacherClasses(
    sekolahId: string,
    guruId?: string | null
  ): Promise<TeacherClassCardDTO[]> {
    const where: any = {
      sekolah_id: sekolahId,
      status: "AKTIF",
    };
    if (guruId) {
      where.guru_id = guruId;
    }

    const assignments = await prisma.penugasanMengajar.findMany({
      where,
      include: {
        guru: true,
        rombel: {
          include: {
            tingkat: true,
            penempatan_rombel: {
              where: { status: "AKTIF" },
            },
            penugasan_wali: {
              where: { status: "AKTIF" },
              include: { guru: { select: { nama_lengkap: true } } },
            },
          },
        },
        mata_pelajaran: true,
        tahun_ajaran: true,
        semester: true,
        lingkup_materi: {
          where: { status: "AKTIF" },
          select: { id: true },
        },
        publikasi_materi: {
          where: { status: "DITERBITKAN" },
          select: { id: true },
        },
        publikasi_tugas: {
          where: { status: "DITERBITKAN" },
          select: { id: true },
        },
        administrasi_pembelajaran: {
          select: { id: true },
        },
        jadwal_pelajaran: {
          select: { hari: true, slot_waktu: true },
        },
      },
      orderBy: [{ rombel: { nama: "asc" } }, { mata_pelajaran: { nama: "asc" } }],
    });

    const hariMap: Record<number, string> = {
      1: "SENIN",
      2: "SELASA",
      3: "RABU",
      4: "KAMIS",
      5: "JUMAT",
      6: "SABTU",
      0: "MINGGU",
    };
    const dayOrder: Record<string, number> = {
      SENIN: 1,
      SELASA: 2,
      RABU: 3,
      KAMIS: 4,
      JUMAT: 5,
      SABTU: 6,
      MINGGU: 7,
    };
    const dayNameId: Record<string, string> = {
      SENIN: "Senin",
      SELASA: "Selasa",
      RABU: "Rabu",
      KAMIS: "Kamis",
      JUMAT: "Jumat",
      SABTU: "Sabtu",
      MINGGU: "Minggu",
    };
    const todayName = hariMap[new Date().getDay()] || "SENIN";

    return assignments.map((a) => {
      const todaySchedule = a.jadwal_pelajaran.find((j) => j.hari === todayName);

      const schedules = a.jadwal_pelajaran;
      const byDay: Record<string, (typeof schedules)[0]["slot_waktu"][]> = {};
      for (const s of schedules) {
        if (!byDay[s.hari]) byDay[s.hari] = [];
        byDay[s.hari].push(s.slot_waktu);
      }
      const daysSorted = Object.keys(byDay).sort(
        (x, y) => (dayOrder[x] || 99) - (dayOrder[y] || 99)
      );
      const daySchedules = daysSorted.map((d) => {
        const slots = byDay[d].sort((x, y) => x.urutan - y.urutan);
        const start = slots[0]?.jam_mulai || "";
        const end = slots[slots.length - 1]?.jam_selesai || "";
        return {
          hari: dayNameId[d] || d,
          jam: start && end ? `${start}–${end}` : "",
          jp: slots.length,
        };
      });

      const hari_mengajar =
        daySchedules.length > 0 ? daySchedules.map((d) => d.hari).join(", ") : null;
      const jam_mengajar =
        daySchedules.length > 0
          ? daySchedules
              .map((d) => d.jam)
              .filter(Boolean)
              .join(", ")
          : null;
      const jadwal_ringkas =
        daySchedules.length > 0 ? daySchedules.map((d) => `${d.hari} ${d.jam}`).join(" • ") : null;

      return {
        id: a.id,
        guru_id: a.guru_id,
        guru_nama: a.guru.nama_lengkap,
        rombel_id: a.rombel_id,
        rombel_nama: a.rombel.nama,
        tingkat_nama: a.rombel.tingkat?.nama || null,
        mata_pelajaran_id: a.mata_pelajaran_id,
        mata_pelajaran_nama: a.mata_pelajaran.nama,
        mata_pelajaran_kode: a.mata_pelajaran.kode,
        tahun_ajaran_nama: a.tahun_ajaran.nama,
        semester_nama: a.semester?.nama || null,
        jumlah_jam_minggu: a.jumlah_jam_minggu,
        status: a.status,
        total_siswa: a.rombel.penempatan_rombel.length,
        total_bab: a.lingkup_materi.length,
        total_materi: a.publikasi_materi.length,
        total_tugas: a.publikasi_tugas.length,
        total_jurnal: a.administrasi_pembelajaran.length,
        jadwal_hari_ini: todaySchedule
          ? `${todaySchedule.slot_waktu.jam_mulai} - ${todaySchedule.slot_waktu.jam_selesai}`
          : null,
        hari_mengajar,
        jam_mengajar,
        jadwal_ringkas,
        wali_kelas_nama: a.rombel.penugasan_wali[0]?.guru?.nama_lengkap || null,
      };
    });
  }

  /**
   * Mengambil daftar guru yang memiliki penugasan mengajar aktif
   */
  async listTeachersWithAssignments(sekolahId: string): Promise<
    Array<{
      id: string;
      nama_lengkap: string;
      gelar_depan: string | null;
      gelar_belakang: string | null;
      total_kelas: number;
    }>
  > {
    const teachers = await prisma.guru.findMany({
      where: {
        sekolah_id: sekolahId,
        status_aktif: true,
        penugasan_mengajar: {
          some: { status: "AKTIF" },
        },
      },
      select: {
        id: true,
        nama_lengkap: true,
        gelar_depan: true,
        gelar_belakang: true,
        _count: {
          select: {
            penugasan_mengajar: {
              where: { status: "AKTIF" },
            },
          },
        },
      },
      orderBy: { nama_lengkap: "asc" },
    });

    return teachers.map((t) => ({
      id: t.id,
      nama_lengkap: t.nama_lengkap,
      gelar_depan: t.gelar_depan,
      gelar_belakang: t.gelar_belakang,
      total_kelas: t._count.penugasan_mengajar,
    }));
  }

  /**
   * Mengambil seluruh data Workspace Kelas Terpadu berdasarkan ID Penugasan Mengajar
   */
  async getTeacherClassWorkspace(
    penugasanId: string,
    sekolahId: string
  ): Promise<TeacherClassWorkspaceDTO | null> {
    const penugasan = await prisma.penugasanMengajar.findFirst({
      where: {
        id: penugasanId,
        sekolah_id: sekolahId,
      },
      include: {
        guru: true,
        rombel: {
          include: {
            tingkat: true,
            penempatan_rombel: {
              where: { status: "AKTIF" },
            },
          },
        },
        mata_pelajaran: true,
        tahun_ajaran: true,
        semester: true,
        jadwal_pelajaran: {
          include: {
            slot_waktu: true,
          },
          orderBy: [{ hari: "asc" }, { slot_waktu: { urutan: "asc" } }],
        },
      },
    });

    if (!penugasan) return null;

    // 1. Lingkup Materi & TP
    const lingkupMateriRaw = await prisma.lingkupMateri.findMany({
      where: {
        penugasan_mengajar_id: penugasanId,
        sekolah_id: sekolahId,
      },
      include: {
        tujuan_pembelajaran: {
          orderBy: { urutan: "asc" },
        },
      },
      orderBy: { urutan: "asc" },
    });

    // 2. Materi Terpublikasi di kelas ini
    const publikasiMateriRaw = await prisma.publikasiMateri.findMany({
      where: {
        penugasan_mengajar_id: penugasanId,
        sekolah_id: sekolahId,
      },
      include: {
        materi: {
          include: {
            lingkup_materi: true,
            mata_pelajaran: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // 3. Tugas Terpublikasi di kelas ini
    const publikasiTugasRaw = await prisma.publikasiTugas.findMany({
      where: {
        penugasan_mengajar_id: penugasanId,
        sekolah_id: sekolahId,
      },
      include: {
        tugas: {
          include: {
            lingkup_materi: true,
            mata_pelajaran: true,
          },
        },
        _count: {
          select: { pengumpulan: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // 4. Jurnal Administrasi Pembelajaran KBM
    const administrasiRaw = await prisma.administrasiPembelajaran.findMany({
      where: {
        penugasan_mengajar_id: penugasanId,
        sekolah_id: sekolahId,
      },
      include: {
        guru: true,
        tp_terkait: {
          include: { tp: true },
        },
      },
      orderBy: { pertemuan_ke: "desc" },
    });

    return {
      penugasan: {
        id: penugasan.id,
        sekolah_id: penugasan.sekolah_id,
        guru_id: penugasan.guru_id,
        guru_nama: penugasan.guru.nama_lengkap,
        mata_pelajaran_id: penugasan.mata_pelajaran_id,
        mata_pelajaran_nama: penugasan.mata_pelajaran.nama,
        mata_pelajaran_kode: penugasan.mata_pelajaran.kode,
        rombel_id: penugasan.rombel_id,
        rombel_nama: penugasan.rombel.nama,
        tingkat_nama: penugasan.rombel.tingkat?.nama || null,
        tahun_ajaran_id: penugasan.tahun_ajaran_id,
        tahun_ajaran_nama: penugasan.tahun_ajaran.nama,
        semester_id: penugasan.semester_id,
        semester_nama: penugasan.semester?.nama || null,
        jumlah_jam_minggu: penugasan.jumlah_jam_minggu,
        status: penugasan.status,
      },
      total_siswa: penugasan.rombel.penempatan_rombel.length,
      lingkup_materi: lingkupMateriRaw.map((lm) => ({
        id: lm.id,
        sekolah_id: lm.sekolah_id,
        penugasan_mengajar_id: lm.penugasan_mengajar_id,
        kode: lm.kode,
        judul: lm.judul,
        deskripsi: lm.deskripsi,
        urutan: lm.urutan,
        status: lm.status as any,
        created_at: lm.created_at,
        updated_at: lm.updated_at,
        tujuan_pembelajaran: lm.tujuan_pembelajaran.map((tp) => ({
          id: tp.id,
          sekolah_id: tp.sekolah_id,
          lingkup_materi_id: tp.lingkup_materi_id,
          kode: tp.kode,
          deskripsi: tp.deskripsi,
          urutan: tp.urutan,
          status: tp.status as any,
          created_at: tp.created_at,
          updated_at: tp.updated_at,
        })),
      })),
      materi_list: publikasiMateriRaw.map((pub) => ({
        id: pub.materi.id,
        sekolah_id: pub.materi.sekolah_id,
        guru_id: pub.materi.guru_id,
        lingkup_materi_id: pub.materi.lingkup_materi_id,
        lingkup_materi_judul: pub.materi.lingkup_materi?.judul || null,
        mata_pelajaran_id: pub.materi.mata_pelajaran_id,
        mata_pelajaran_nama: pub.materi.mata_pelajaran?.nama || null,
        judul: pub.materi.judul,
        deskripsi: pub.materi.deskripsi,
        tipe_konten: pub.materi.tipe_konten as any,
        konten_teks: pub.materi.konten_teks,
        tautan_url: pub.materi.tautan_url,
        berkas_id: pub.materi.berkas_id,
        status: pub.materi.status as any,
        created_at: pub.materi.created_at,
        updated_at: pub.materi.updated_at,
        is_published: pub.status === "DITERBITKAN",
      })),
      tugas_list: publikasiTugasRaw.map((pub) => ({
        id: pub.tugas.id,
        sekolah_id: pub.tugas.sekolah_id,
        guru_id: pub.tugas.guru_id,
        lingkup_materi_id: pub.tugas.lingkup_materi_id,
        lingkup_materi_judul: pub.tugas.lingkup_materi?.judul || null,
        mata_pelajaran_id: pub.tugas.mata_pelajaran_id,
        mata_pelajaran_nama: pub.tugas.mata_pelajaran?.nama || null,
        judul: pub.tugas.judul,
        petunjuk: pub.tugas.petunjuk,
        tipe_penyerahan: pub.tugas.tipe_penyerahan as any,
        berkas_id: pub.tugas.berkas_id,
        status: pub.tugas.status as any,
        created_at: pub.tugas.created_at,
        updated_at: pub.tugas.updated_at,
        publikasi_aktif: {
          id: pub.id,
          sekolah_id: pub.sekolah_id,
          tugas_id: pub.tugas_id,
          penugasan_mengajar_id: pub.penugasan_mengajar_id,
          tanggal_mulai: pub.tanggal_mulai,
          batas_waktu: pub.batas_waktu,
          izinkan_terlambat: pub.izinkan_terlambat,
          status: pub.status as any,
          catatan: pub.catatan,
          submission_count: pub._count.pengumpulan,
          created_at: pub.created_at,
          updated_at: pub.updated_at,
        },
      })),
      administrasi_list: administrasiRaw.map((adm) => ({
        id: adm.id,
        sekolah_id: adm.sekolah_id,
        penugasan_mengajar_id: adm.penugasan_mengajar_id,
        sesi_kelas_aktual_id: adm.sesi_kelas_aktual_id,
        guru_id: adm.guru_id,
        guru_nama: adm.guru.nama_lengkap,
        tanggal: adm.tanggal,
        pertemuan_ke: adm.pertemuan_ke,
        materi_disampaikan: adm.materi_disampaikan,
        kegiatan_pembelajaran: adm.kegiatan_pembelajaran,
        catatan_refleksi: adm.catatan_refleksi,
        status_realisasi: adm.status_realisasi as any,
        created_at: adm.created_at,
        updated_at: adm.updated_at,
        tp_ids: adm.tp_terkait.map((t) => t.tp_id),
        tp_terkait: adm.tp_terkait.map((t) => ({
          id: t.tp.id,
          sekolah_id: t.tp.sekolah_id,
          lingkup_materi_id: t.tp.lingkup_materi_id,
          kode: t.tp.kode,
          deskripsi: t.tp.deskripsi,
          urutan: t.tp.urutan,
          status: t.tp.status as any,
          created_at: t.tp.created_at,
          updated_at: t.tp.updated_at,
        })),
      })),
      jadwal_list: penugasan.jadwal_pelajaran.map((j) => ({
        hari: j.hari,
        jam_mulai: j.slot_waktu.jam_mulai,
        jam_selesai: j.slot_waktu.jam_selesai,
        ruangan: j.ruangan,
        slot_nama: j.slot_waktu.nama,
      })),
    };
  }

  // ==========================================
  // LINGKUP MATERI (BAB)
  // ==========================================

  async createLingkupMateri(input: CreateLingkupMateriInput): Promise<LingkupMateriDTO> {
    const penugasan = await prisma.penugasanMengajar.findFirst({
      where: { id: input.penugasan_mengajar_id, sekolah_id: input.sekolah_id },
    });
    if (!penugasan) {
      throw new Error(
        `Penugasan mengajar dengan ID '${input.penugasan_mengajar_id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    const id = generateUlid();
    const created = await prisma.lingkupMateri.create({
      data: {
        id,
        sekolah_id: input.sekolah_id,
        penugasan_mengajar_id: input.penugasan_mengajar_id,
        kode: input.kode || null,
        judul: input.judul,
        deskripsi: input.deskripsi || null,
        urutan: input.urutan || 1,
        status: "AKTIF",
      },
    });

    return {
      ...created,
      status: created.status as any,
    };
  }

  async updateLingkupMateri(
    id: string,
    input: UpdateLingkupMateriInput,
    sekolahId?: string
  ): Promise<LingkupMateriDTO> {
    const existing = await prisma.lingkupMateri.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (!existing) {
      throw new Error(`Lingkup materi dengan ID '${id}' tidak ditemukan.`);
    }

    const updated = await prisma.lingkupMateri.update({
      where: { id },
      data: {
        kode: input.kode,
        judul: input.judul,
        deskripsi: input.deskripsi,
        urutan: input.urutan,
        status: input.status,
      },
    });

    return {
      ...updated,
      status: updated.status as any,
    };
  }

  async deleteLingkupMateri(id: string, sekolahId?: string): Promise<void> {
    const existing = await prisma.lingkupMateri.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (!existing) {
      throw new Error(`Lingkup materi dengan ID '${id}' tidak ditemukan.`);
    }

    await prisma.lingkupMateri.delete({
      where: { id },
    });
  }

  // ==========================================
  // TUJUAN PEMBELAJARAN (TP)
  // ==========================================

  async createTujuanPembelajaran(
    input: CreateTujuanPembelajaranInput
  ): Promise<TujuanPembelajaranDTO> {
    const id = generateUlid();
    const created = await prisma.tujuanPembelajaran.create({
      data: {
        id,
        sekolah_id: input.sekolah_id,
        lingkup_materi_id: input.lingkup_materi_id,
        kode: input.kode || null,
        deskripsi: input.deskripsi,
        urutan: input.urutan || 1,
        status: "AKTIF",
      },
    });

    return {
      ...created,
      status: created.status as any,
    };
  }

  async updateTujuanPembelajaran(
    id: string,
    input: UpdateTujuanPembelajaranInput,
    sekolahId?: string
  ): Promise<TujuanPembelajaranDTO> {
    const existing = await prisma.tujuanPembelajaran.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (!existing) {
      throw new Error(`Tujuan pembelajaran dengan ID '${id}' tidak ditemukan.`);
    }

    const updated = await prisma.tujuanPembelajaran.update({
      where: { id },
      data: {
        kode: input.kode,
        deskripsi: input.deskripsi,
        urutan: input.urutan,
        status: input.status,
      },
    });

    return {
      ...updated,
      status: updated.status as any,
    };
  }

  async deleteTujuanPembelajaran(id: string, sekolahId?: string): Promise<void> {
    const existing = await prisma.tujuanPembelajaran.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (!existing) {
      throw new Error(`Tujuan pembelajaran dengan ID '${id}' tidak ditemukan.`);
    }

    await prisma.tujuanPembelajaran.delete({
      where: { id },
    });
  }

  // ==========================================
  // MATERI PEMBELAJARAN
  // ==========================================

  async createMateri(input: CreateMateriInput): Promise<MateriPembelajaranDTO> {
    const materiId = generateUlid();

    const created = await prisma.$transaction(async (tx) => {
      const m = await tx.materiPembelajaran.create({
        data: {
          id: materiId,
          sekolah_id: input.sekolah_id,
          guru_id: input.guru_id,
          lingkup_materi_id: input.lingkup_materi_id || null,
          mata_pelajaran_id: input.mata_pelajaran_id || null,
          judul: input.judul,
          deskripsi: input.deskripsi || null,
          tipe_konten: input.tipe_konten || "DOKUMEN",
          konten_teks: input.konten_teks || null,
          tautan_url: input.tautan_url || null,
          berkas_id: input.berkas_id || null,
          status: input.publish_langsung ? "PUBLISHED" : "DRAFT",
        },
        include: {
          lingkup_materi: true,
          mata_pelajaran: true,
        },
      });

      // Jika publish langsung, buat relasi PublikasiMateri
      if (input.publish_langsung) {
        const publikasiId = generateUlid();
        await tx.publikasiMateri.create({
          data: {
            id: publikasiId,
            sekolah_id: input.sekolah_id,
            materi_id: materiId,
            penugasan_mengajar_id: input.penugasan_mengajar_id,
            status: "DITERBITKAN",
          },
        });
      }

      return m;
    });

    return {
      id: created.id,
      sekolah_id: created.sekolah_id,
      guru_id: created.guru_id,
      lingkup_materi_id: created.lingkup_materi_id,
      lingkup_materi_judul: created.lingkup_materi?.judul || null,
      mata_pelajaran_id: created.mata_pelajaran_id,
      mata_pelajaran_nama: created.mata_pelajaran?.nama || null,
      judul: created.judul,
      deskripsi: created.deskripsi,
      tipe_konten: created.tipe_konten as any,
      konten_teks: created.konten_teks,
      tautan_url: created.tautan_url,
      berkas_id: created.berkas_id,
      status: created.status as any,
      created_at: created.created_at,
      updated_at: created.updated_at,
      is_published: input.publish_langsung,
    };
  }

  async updateMateri(
    id: string,
    input: UpdateMateriInput,
    sekolahId?: string
  ): Promise<MateriPembelajaranDTO> {
    const existing = await prisma.materiPembelajaran.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (!existing) {
      throw new Error(`Materi pembelajaran dengan ID '${id}' tidak ditemukan.`);
    }

    const updated = await prisma.materiPembelajaran.update({
      where: { id },
      data: {
        lingkup_materi_id: input.lingkup_materi_id,
        judul: input.judul,
        deskripsi: input.deskripsi,
        tipe_konten: input.tipe_konten,
        konten_teks: input.konten_teks,
        tautan_url: input.tautan_url,
        berkas_id: input.berkas_id,
        status: input.status,
      },
      include: {
        lingkup_materi: true,
        mata_pelajaran: true,
      },
    });

    return {
      id: updated.id,
      sekolah_id: updated.sekolah_id,
      guru_id: updated.guru_id,
      lingkup_materi_id: updated.lingkup_materi_id,
      lingkup_materi_judul: updated.lingkup_materi?.judul || null,
      mata_pelajaran_id: updated.mata_pelajaran_id,
      mata_pelajaran_nama: updated.mata_pelajaran?.nama || null,
      judul: updated.judul,
      deskripsi: updated.deskripsi,
      tipe_konten: updated.tipe_konten as any,
      konten_teks: updated.konten_teks,
      tautan_url: updated.tautan_url,
      berkas_id: updated.berkas_id,
      status: updated.status as any,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async deleteMateri(id: string, sekolahId?: string): Promise<void> {
    const existing = await prisma.materiPembelajaran.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (!existing) {
      throw new Error(`Materi pembelajaran dengan ID '${id}' tidak ditemukan.`);
    }

    await prisma.materiPembelajaran.delete({
      where: { id },
    });
  }

  // ==========================================
  // TUGAS PEMBELAJARAN
  // ==========================================

  async createTugas(input: CreateTugasInput): Promise<DefinisiTugasDTO> {
    const tugasId = generateUlid();
    const publikasiId = generateUlid();

    const created = await prisma.$transaction(async (tx) => {
      const t = await tx.definisiTugas.create({
        data: {
          id: tugasId,
          sekolah_id: input.sekolah_id,
          guru_id: input.guru_id,
          lingkup_materi_id: input.lingkup_materi_id || null,
          mata_pelajaran_id: input.mata_pelajaran_id || null,
          judul: input.judul,
          petunjuk: input.petunjuk,
          tipe_penyerahan: input.tipe_penyerahan || "FILE",
          berkas_id: input.berkas_id || null,
          status: "PUBLISHED",
        },
        include: {
          lingkup_materi: true,
          mata_pelajaran: true,
        },
      });

      const pub = await tx.publikasiTugas.create({
        data: {
          id: publikasiId,
          sekolah_id: input.sekolah_id,
          tugas_id: tugasId,
          penugasan_mengajar_id: input.penugasan_mengajar_id,
          tanggal_mulai: input.tanggal_mulai ? new Date(input.tanggal_mulai) : new Date(),
          batas_waktu: input.batas_waktu ? new Date(input.batas_waktu) : null,
          izinkan_terlambat: input.izinkan_terlambat || false,
          status: "DITERBITKAN",
        },
      });

      return { t, pub };
    });

    return {
      id: created.t.id,
      sekolah_id: created.t.sekolah_id,
      guru_id: created.t.guru_id,
      lingkup_materi_id: created.t.lingkup_materi_id,
      lingkup_materi_judul: created.t.lingkup_materi?.judul || null,
      mata_pelajaran_id: created.t.mata_pelajaran_id,
      mata_pelajaran_nama: created.t.mata_pelajaran?.nama || null,
      judul: created.t.judul,
      petunjuk: created.t.petunjuk,
      tipe_penyerahan: created.t.tipe_penyerahan as any,
      berkas_id: created.t.berkas_id,
      status: created.t.status as any,
      created_at: created.t.created_at,
      updated_at: created.t.updated_at,
    };
  }

  async deleteTugas(id: string, sekolahId?: string): Promise<void> {
    const existing = await prisma.definisiTugas.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (!existing) {
      throw new Error(`Tugas dengan ID '${id}' tidak ditemukan.`);
    }

    await prisma.definisiTugas.delete({
      where: { id },
    });
  }

  // ==========================================
  // ADMINISTRASI PEMBELAJARAN (JURNAL KBM)
  // ==========================================

  async createAdministrasi(input: CreateAdministrasiInput): Promise<AdministrasiPembelajaranDTO> {
    const id = generateUlid();

    const created = await prisma.$transaction(async (tx) => {
      const adm = await tx.administrasiPembelajaran.create({
        data: {
          id,
          sekolah_id: input.sekolah_id,
          penugasan_mengajar_id: input.penugasan_mengajar_id,
          sesi_kelas_aktual_id: input.sesi_kelas_aktual_id || null,
          guru_id: input.guru_id,
          tanggal: new Date(input.tanggal),
          pertemuan_ke: input.pertemuan_ke,
          materi_disampaikan: input.materi_disampaikan,
          kegiatan_pembelajaran: input.kegiatan_pembelajaran || null,
          catatan_refleksi: input.catatan_refleksi || null,
          status_realisasi: input.status_realisasi || "TERLAKSANA",
        },
        include: {
          guru: true,
        },
      });

      if (input.tp_ids && input.tp_ids.length > 0) {
        for (const tpId of input.tp_ids) {
          await tx.administrasiTujuanPembelajaran.create({
            data: {
              id: generateUlid(),
              administrasi_id: id,
              tp_id: tpId,
            },
          });
        }
      }

      return adm;
    });

    return {
      id: created.id,
      sekolah_id: created.sekolah_id,
      penugasan_mengajar_id: created.penugasan_mengajar_id,
      sesi_kelas_aktual_id: created.sesi_kelas_aktual_id,
      guru_id: created.guru_id,
      guru_nama: created.guru.nama_lengkap,
      tanggal: created.tanggal,
      pertemuan_ke: created.pertemuan_ke,
      materi_disampaikan: created.materi_disampaikan,
      kegiatan_pembelajaran: created.kegiatan_pembelajaran,
      catatan_refleksi: created.catatan_refleksi,
      status_realisasi: created.status_realisasi as any,
      created_at: created.created_at,
      updated_at: created.updated_at,
      tp_ids: input.tp_ids,
    };
  }

  async updateAdministrasi(
    id: string,
    input: UpdateAdministrasiInput,
    sekolahId?: string
  ): Promise<AdministrasiPembelajaranDTO> {
    const existing = await prisma.administrasiPembelajaran.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (!existing) {
      throw new Error(`Administrasi pembelajaran dengan ID '${id}' tidak ditemukan.`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const adm = await tx.administrasiPembelajaran.update({
        where: { id },
        data: {
          tanggal: input.tanggal ? new Date(input.tanggal) : undefined,
          pertemuan_ke: input.pertemuan_ke,
          materi_disampaikan: input.materi_disampaikan,
          kegiatan_pembelajaran: input.kegiatan_pembelajaran,
          catatan_refleksi: input.catatan_refleksi,
          status_realisasi: input.status_realisasi,
        },
        include: {
          guru: true,
        },
      });

      if (input.tp_ids !== undefined) {
        await tx.administrasiTujuanPembelajaran.deleteMany({
          where: { administrasi_id: id },
        });

        if (input.tp_ids && input.tp_ids.length > 0) {
          for (const tpId of input.tp_ids) {
            await tx.administrasiTujuanPembelajaran.create({
              data: {
                id: generateUlid(),
                administrasi_id: id,
                tp_id: tpId,
              },
            });
          }
        }
      }

      return adm;
    });

    return {
      id: updated.id,
      sekolah_id: updated.sekolah_id,
      penugasan_mengajar_id: updated.penugasan_mengajar_id,
      sesi_kelas_aktual_id: updated.sesi_kelas_aktual_id,
      guru_id: updated.guru_id,
      guru_nama: updated.guru.nama_lengkap,
      tanggal: updated.tanggal,
      pertemuan_ke: updated.pertemuan_ke,
      materi_disampaikan: updated.materi_disampaikan,
      kegiatan_pembelajaran: updated.kegiatan_pembelajaran,
      catatan_refleksi: updated.catatan_refleksi,
      status_realisasi: updated.status_realisasi as any,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      tp_ids: input.tp_ids,
    };
  }

  async deleteAdministrasi(id: string, sekolahId?: string): Promise<void> {
    const existing = await prisma.administrasiPembelajaran.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (!existing) {
      throw new Error(`Administrasi pembelajaran dengan ID '${id}' tidak ditemukan.`);
    }

    await prisma.administrasiPembelajaran.delete({
      where: { id },
    });
  }
}

export const learningRepository = new LearningRepository();
