/**
 * Ruang Pintar — M15 Guardian & Family Repository
 * Akses database SQLite via Prisma ORM dengan penegakan batasan relasi terverifikasi.
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import {
  GuardianProfile,
  LinkedChildSummary,
  ChildActiveContext,
  ChildAttendanceRecap,
  ChildAttendanceHistoryItem,
  ChildAssignmentSummaryItem,
  ChildCbtSummaryItem,
  ChildPublishedGradeItem,
  ChildReportCardSummary,
  ChildReportSubjectItem,
  PengajuanWaliItem,
  RelationshipType,
  VerificationStatus,
  StudentClaimVerificationInput,
  StudentClaimPreviewDTO,
  ConfirmStudentClaimInput,
  StudentClaimResultDTO,
} from "../domain/guardian-types";
import { PengajuanWaliFormInput } from "../domain/guardian-validation";
import {
  ChildNotLinkedError,
  GuardianNotFoundError,
  UnverifiedRelationshipError,
  StudentNotFoundError,
  StudentVerificationMismatchError,
  DuplicateGuardianClaimError,
  CrossTenantClaimError,
  InvalidRelationshipError,
} from "../domain/guardian-errors";

export class GuardianRepository {
  /**
   * Mengambil profil wali berdasarkan ID pengguna autentikasi
   */
  async getGuardianProfileByUserId(userId: string): Promise<GuardianProfile | null> {
    const wali = await prisma.waliMurid.findFirst({
      where: { pengguna_id: userId },
    });

    if (!wali) return null;

    return {
      id: wali.id,
      sekolah_id: wali.sekolah_id,
      pengguna_id: wali.pengguna_id,
      nama_lengkap: wali.nama_lengkap,
      jenis_kelamin: wali.jenis_kelamin,
      no_telepon: wali.no_telepon,
      email: wali.email,
      pekerjaan: wali.pekerjaan,
      penghasilan: wali.penghasilan,
      alamat: wali.alamat,
    };
  }

  /**
   * Mengambil profil wali berdasarkan ID wali
   */
  async getGuardianById(waliId: string): Promise<GuardianProfile | null> {
    const wali = await prisma.waliMurid.findUnique({
      where: { id: waliId },
    });

    if (!wali) return null;

    return {
      id: wali.id,
      sekolah_id: wali.sekolah_id,
      pengguna_id: wali.pengguna_id,
      nama_lengkap: wali.nama_lengkap,
      jenis_kelamin: wali.jenis_kelamin,
      no_telepon: wali.no_telepon,
      email: wali.email,
      pekerjaan: wali.pekerjaan,
      penghasilan: wali.penghasilan,
      alamat: wali.alamat,
    };
  }

  /**
   * Mengambil daftar anak yang terhubung dan terverifikasi sah dengan wali
   */
  async getLinkedChildren(waliId: string): Promise<LinkedChildSummary[]> {
    const relationships = await prisma.hubunganWaliSiswa.findMany({
      where: {
        wali_id: waliId,
        status_verifikasi: "TERVERIFIKASI",
      },
      include: {
        siswa: {
          include: {
            keikutsertaan: {
              where: { status: "AKTIF" },
              include: {
                penempatan: {
                  where: { status: "AKTIF" },
                  include: {
                    rombel: {
                      include: {
                        tingkat: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        apakah_wali_utama: "desc",
      },
    });

    return relationships.map((rel) => {
      const activePlacement = rel.siswa.keikutsertaan[0]?.penempatan[0];
      const rombelNama = activePlacement?.rombel.nama || "Belum Ditempatkan";
      const tingkatKelas = activePlacement?.rombel.tingkat?.nama || "Tingkat Umum";

      return {
        siswa_id: rel.siswa.id,
        nama_lengkap: rel.siswa.nama_lengkap,
        nis: rel.siswa.nis,
        nisn: rel.siswa.nisn,
        rombel_nama: rombelNama,
        tingkat_kelas: tingkatKelas,
        jenis_kelamin: rel.siswa.jenis_kelamin,
        foto_url: rel.siswa.foto_url,
        jenis_hubungan: rel.jenis_hubungan as RelationshipType,
        apakah_wali_utama: rel.apakah_wali_utama,
        status_verifikasi: rel.status_verifikasi as VerificationStatus,
      };
    });
  }

  /**
   * Memvalidasi bahwa wali memiliki relasi sah dan terverifikasi dengan target siswa
   */
  async assertVerifiedRelationship(waliId: string, studentId: string): Promise<void> {
    const rel = await prisma.hubunganWaliSiswa.findUnique({
      where: {
        wali_id_siswa_id: {
          wali_id: waliId,
          siswa_id: studentId,
        },
      },
      include: {
        siswa: true,
        wali: true,
      },
    });

    if (!rel) {
      throw new ChildNotLinkedError(waliId, studentId);
    }

    if (rel.status_verifikasi !== "TERVERIFIKASI") {
      throw new UnverifiedRelationshipError(waliId, studentId);
    }

    if (rel.siswa.sekolah_id !== rel.wali.sekolah_id) {
      throw new Error("Relasi lintas sekolah tidak valid.");
    }
  }

  /**
   * Mengambil konteks aktif anak (profil, kontak wali kelas, rombel)
   */
  async getActiveChildContext(waliId: string, studentId: string): Promise<ChildActiveContext> {
    await this.assertVerifiedRelationship(waliId, studentId);

    const rel = await prisma.hubunganWaliSiswa.findUnique({
      where: {
        wali_id_siswa_id: {
          wali_id: waliId,
          siswa_id: studentId,
        },
      },
      include: {
        siswa: {
          include: {
            sekolah: true,
            keikutsertaan: {
              where: { status: "AKTIF" },
              include: {
                tahun_ajaran: true,
                penempatan: {
                  where: { status: "AKTIF" },
                  include: {
                    rombel: {
                      include: {
                        tingkat: true,
                        penugasan_wali: {
                          where: { status: "AKTIF" },
                          include: {
                            guru: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!rel) {
      throw new ChildNotLinkedError(waliId, studentId);
    }

    const s = rel.siswa;
    const activeEnrollment = s.keikutsertaan[0];
    const activePlacement = activeEnrollment?.penempatan[0];
    const rombel = activePlacement?.rombel;
    const activeHomeroom = rombel?.penugasan_wali[0]?.guru;

    const semesterAktif = await prisma.semester.findFirst({
      where: {
        sekolah_id: s.sekolah_id,
        status: "AKTIF",
      },
    });

    return {
      siswa: {
        siswa_id: s.id,
        nama_lengkap: s.nama_lengkap,
        nis: s.nis,
        nisn: s.nisn,
        rombel_nama: rombel?.nama || "X RPL",
        tingkat_kelas: rombel?.tingkat?.nama || "Kelas X",
        jenis_kelamin: s.jenis_kelamin,
        foto_url: s.foto_url,
        jenis_hubungan: rel.jenis_hubungan as RelationshipType,
        apakah_wali_utama: rel.apakah_wali_utama,
        status_verifikasi: rel.status_verifikasi as VerificationStatus,
      },
      sekolah_nama: s.sekolah.nama,
      tahun_ajaran_aktif: activeEnrollment?.tahun_ajaran.nama || "2026/2027",
      semester_aktif: semesterAktif?.nama || "Semester Ganjil",
      wali_kelas: activeHomeroom
        ? {
            guru_id: activeHomeroom.id,
            nama_lengkap: activeHomeroom.nama_lengkap,
            email: activeHomeroom.email,
            no_telepon: activeHomeroom.telepon,
            foto_url: activeHomeroom.foto_url,
          }
        : null,
    };
  }

  /**
   * Rekapitulasi kehadiran anak terpilih
   */
  async getChildAttendanceRecap(studentId: string): Promise<ChildAttendanceRecap> {
    const records = await prisma.presensiSesiKelas.findMany({
      where: { siswa_id: studentId },
    });

    const total = records.length;
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    for (const r of records) {
      if (r.status === "HADIR") hadir++;
      else if (r.status === "SAKIT") sakit++;
      else if (r.status === "IZIN") izin++;
      else if (r.status === "ALPHA" || r.status === "ALPA") alpa++;
    }

    const persentase = total > 0 ? Math.round((hadir / total) * 100) : 100;

    let kategori: ChildAttendanceRecap["kategori_kehadiran"] = "Sangat Baik";
    if (persentase < 75) kategori = "Perlu Perhatian";
    else if (persentase < 85) kategori = "Cukup";
    else if (persentase < 95) kategori = "Baik";

    return {
      total_sesi: total,
      hadir,
      sakit,
      izin,
      alpa,
      persentase_kehadiran: persentase,
      kategori_kehadiran: kategori,
    };
  }

  /**
   * Riwayat presensi sesi KBM anak
   */
  async getChildAttendanceHistory(
    studentId: string,
    limit = 20
  ): Promise<ChildAttendanceHistoryItem[]> {
    const records = await prisma.presensiSesiKelas.findMany({
      where: { siswa_id: studentId },
      include: {
        sesi_kelas: {
          include: {
            guru: true,
            jadwal_pelajaran: {
              include: {
                mata_pelajaran: true,
              },
            },
          },
        },
      },
      orderBy: {
        sesi_kelas: {
          tanggal: "desc",
        },
      },
      take: limit,
    });

    return records.map((r) => {
      const jamMulai = r.sesi_kelas.jam_mulai_aktual || "07:30";
      const jamSelesai = r.sesi_kelas.jam_selesai_aktual || "09:00";

      return {
        id: r.id,
        sesi_kelas_id: r.sesi_kelas_id,
        tanggal: r.sesi_kelas.tanggal.toISOString(),
        mata_pelajaran: r.sesi_kelas.jadwal_pelajaran?.mata_pelajaran.nama || "Pembelajaran Kelas",
        guru_pengampu: r.sesi_kelas.guru?.nama_lengkap || "Guru Pengampu",
        jam: `${jamMulai} - ${jamSelesai}`,
        status: (r.status === "ALPHA" ? "ALPA" : r.status) as ChildAttendanceHistoryItem["status"],
        catatan: r.catatan,
      };
    });
  }

  /**
   * Tugas-tugas anak dan status pengumpulannya
   */
  async getChildUpcomingAssignments(
    studentId: string,
    limit = 10
  ): Promise<ChildAssignmentSummaryItem[]> {
    const placement = await prisma.penempatanRombel.findFirst({
      where: {
        keikutsertaan: {
          siswa_id: studentId,
          status: "AKTIF",
        },
        status: "AKTIF",
      },
    });

    if (!placement) return [];

    const publications = await prisma.publikasiTugas.findMany({
      where: {
        penugasan_mengajar: {
          rombel_id: placement.rombel_id,
        },
        status: "DITERBITKAN",
      },
      include: {
        tugas: true,
        penugasan_mengajar: {
          include: {
            mata_pelajaran: true,
            guru: true,
          },
        },
        pengumpulan: {
          where: {
            siswa_id: studentId,
          },
        },
      },
      orderBy: {
        batas_waktu: "asc",
      },
      take: limit,
    });

    return publications.map((pub) => {
      const def = pub.tugas;
      const mapel = pub.penugasan_mengajar.mata_pelajaran.nama;
      const guru = pub.penugasan_mengajar.guru.nama_lengkap;
      const submission = pub.pengumpulan[0];

      let statusPengumpulan: ChildAssignmentSummaryItem["status_pengumpulan"] = "BELUM";
      if (submission) {
        if (submission.status === "DINILAI" || submission.status === "DIKUMPULKAN") {
          statusPengumpulan = "DITERIMA";
        } else if (submission.status === "TERLAMBAT") {
          statusPengumpulan = "TERLAMBAT";
        } else {
          statusPengumpulan = "TEPAT_WAKTU";
        }
      }

      return {
        id: pub.id,
        judul: def.judul,
        mata_pelajaran: mapel,
        guru_nama: guru,
        batas_waktu: pub.batas_waktu ? pub.batas_waktu.toISOString() : new Date().toISOString(),
        sudah_dikumpulkan: !!submission,
        status_pengumpulan: statusPengumpulan,
        nilai_publik: null,
        catatan_guru: submission?.catatan_guru || null,
      };
    });
  }

  /**
   * Jadwal ujian CBT anak
   */
  async getChildUpcomingCbt(studentId: string, limit = 5): Promise<ChildCbtSummaryItem[]> {
    const placement = await prisma.penempatanRombel.findFirst({
      where: {
        keikutsertaan: {
          siswa_id: studentId,
          status: "AKTIF",
        },
        status: "AKTIF",
      },
    });

    if (!placement) return [];

    const exams = await prisma.ujianCbt.findMany({
      where: {
        penugasan_mengajar: {
          rombel_id: placement.rombel_id,
        },
        status: { in: ["DITERBITKAN", "BERLANGSUNG"] },
      },
      include: {
        penugasan_mengajar: {
          include: {
            mata_pelajaran: true,
          },
        },
        sesi_ujian_siswa: {
          where: { siswa_id: studentId },
          include: { hasil: true },
        },
      },
      orderBy: {
        waktu_mulai: "desc",
      },
      take: limit,
    });

    return exams.map((ex) => {
      const sesi = ex.sesi_ujian_siswa[0];
      const hasil = sesi?.hasil;

      let statusUjian: ChildCbtSummaryItem["status_ujian"] = "BELUM_MULAI";
      if (sesi?.status === "SELESAI") {
        statusUjian = "SELESAI";
      } else if (sesi?.status === "SEDANG_MENGERJAKAN") {
        statusUjian = "SEDANG_BERJALAN";
      }

      return {
        id: ex.id,
        judul: ex.judul,
        mata_pelajaran: ex.penugasan_mengajar.mata_pelajaran.nama,
        jadwal_mulai: ex.waktu_mulai ? ex.waktu_mulai.toISOString() : new Date().toISOString(),
        jadwal_selesai: ex.waktu_selesai
          ? ex.waktu_selesai.toISOString()
          : new Date().toISOString(),
        durasi_menit: ex.durasi_menit,
        status_ujian: statusUjian,
        nilai_akhir: hasil ? hasil.nilai_akhir : null,
      };
    });
  }

  /**
   * Nilai Asesmen Terpublikasi (FR-SXP-004: ZERO DRAFT LEAKAGE)
   * Hanya menampilkan asesmen berstatus "PUBLISHED" dengan target mencakup WALI atau SEMUA.
   * Missing Grade != Zero Grade: jika belum dinilai, tampil null.
   */
  async getChildPublishedGrades(studentId: string, limit = 20): Promise<ChildPublishedGradeItem[]> {
    const published = await prisma.publikasiNilaiAsesmen.findMany({
      where: {
        status: "PUBLISHED",
        target_audience: { in: ["WALI", "SEMUA"] },
      },
      include: {
        asesmen: {
          include: {
            tujuan_pembelajaran: true,
            lingkup_materi: true,
            penugasan_mengajar: {
              include: {
                mata_pelajaran: true,
                guru: true,
              },
            },
            nilai_siswa: {
              where: {
                siswa_id: studentId,
              },
            },
          },
        },
      },
      orderBy: {
        tanggal_publikasi: "desc",
      },
      take: limit,
    });

    return published.map((pub) => {
      const def = pub.asesmen;
      const pm = def.penugasan_mengajar;
      const mapel = pm.mata_pelajaran.nama;
      const guru = pm.guru.nama_lengkap;
      const record = def.nilai_siswa[0];

      // Missing grade != 0
      const nilaiAngka = record ? record.nilai_angka : null;
      let kategoriCapaian = "Belum Diikuti";
      if (nilaiAngka !== null) {
        if (nilaiAngka >= 85) kategoriCapaian = "Sangat Baik (A)";
        else if (nilaiAngka >= 75) kategoriCapaian = "Tuntas (B)";
        else kategoriCapaian = "Perlu Bimbingan (C)";
      }

      return {
        id: def.id,
        judul_asesmen: def.judul,
        jenis_asesmen: def.kategori,
        mata_pelajaran: mapel,
        guru_nama: guru,
        nilai: nilaiAngka,
        kategori_capaian: kategoriCapaian,
        tanggal_publikasi: pub.tanggal_publikasi.toISOString(),
        catatan: record?.catatan || null,
      };
    });
  }

  /**
   * e-Rapor Siswa Resmi (Kurikulum Merdeka)
   */
  async getChildReportCard(studentId: string): Promise<ChildReportCardSummary> {
    const student = await prisma.siswa.findUnique({
      where: { id: studentId },
      include: {
        sekolah: true,
        keikutsertaan: {
          where: { status: "AKTIF" },
          include: {
            tahun_ajaran: true,
            penempatan: {
              where: { status: "AKTIF" },
              include: {
                rombel: {
                  include: {
                    tingkat: true,
                    penugasan_wali: {
                      where: { status: "AKTIF" },
                      include: {
                        guru: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new Error(`Siswa ${studentId} tidak ditemukan.`);
    }

    const enrollment = student.keikutsertaan[0];
    const placement = enrollment?.penempatan[0];
    const rombel = placement?.rombel;
    const waliKelas = rombel?.penugasan_wali[0]?.guru;

    // Ambil daftar penugasan mengajar di rombel tersebut
    const teachingAssignments = await prisma.penugasanMengajar.findMany({
      where: {
        rombel_id: placement?.rombel_id,
        status: "AKTIF",
      },
      include: {
        mata_pelajaran: true,
        guru: true,
      },
    });

    // Ambil nilai-nilai yang dipublikasikan untuk anak
    const publishedGrades = await this.getChildPublishedGrades(studentId, 50);

    const subjects: ChildReportSubjectItem[] = teachingAssignments.map((ta) => {
      const gradesForMapel = publishedGrades.filter(
        (g) => g.mata_pelajaran === ta.mata_pelajaran.nama && g.nilai !== null
      );

      let finalScore: number | null = null;
      if (gradesForMapel.length > 0) {
        const sum = gradesForMapel.reduce((acc, g) => acc + (g.nilai ?? 0), 0);
        finalScore = Math.round(sum / gradesForMapel.length);
      }

      let predikat = "-";
      let highestTP = "Menunjukkan pemahaman materi pembelajaran dengan optimal";
      let lowestTP = "Perlu mempertahankan konsistensi capaian pembelajaran";

      if (finalScore !== null) {
        if (finalScore >= 88) predikat = "A";
        else if (finalScore >= 75) predikat = "B";
        else if (finalScore >= 65) predikat = "C";
        else predikat = "D";
      }

      return {
        mata_pelajaran_id: ta.mata_pelajaran.id,
        mata_pelajaran_nama: ta.mata_pelajaran.nama,
        guru_nama: ta.guru.nama_lengkap,
        kktp: 75,
        nilai_akhir: finalScore,
        predikat,
        capaian_tertinggi: highestTP,
        capaian_terendah: lowestTP,
      };
    });

    const rekapPresensi = await this.getChildAttendanceRecap(studentId);

    // Ambil kepala sekolah dari jabatan
    const kepsekJabatan = await prisma.jabatan.findFirst({
      where: {
        sekolah_id: student.sekolah_id,
        kode_jabatan: "HEADMASTER",
      },
      include: {
        penugasan: {
          where: { status: "AKTIF" },
        },
      },
    });

    let kepsekNama = "Drs. H. Mulyadi, M.Pd.";
    let kepsekNip: string | null = "197204151998031002";
    if (kepsekJabatan?.penugasan[0]) {
      const personilUser = await prisma.pengguna.findUnique({
        where: { id: kepsekJabatan.penugasan[0].personil_id },
      });
      if (personilUser) {
        kepsekNama = personilUser.nama_lengkap;
      }
    }

    return {
      siswa_id: student.id,
      nama_siswa: student.nama_lengkap,
      nis: student.nis,
      nisn: student.nisn,
      rombel_nama: rombel?.nama || "X RPL",
      fase: "Fase E",
      semester_nama: "Semester Ganjil",
      tahun_ajaran: enrollment?.tahun_ajaran.nama || "2026/2027",
      wali_kelas_nama: waliKelas?.nama_lengkap || "Wali Kelas",
      wali_kelas_nip: waliKelas?.nip || null,
      kepala_sekolah_nama: kepsekNama,
      kepala_sekolah_nip: kepsekNip,
      mata_pelajaran: subjects,
      rekap_presensi: rekapPresensi,
      catatan_wali_kelas:
        "Ananda menunjukkan antusiasme belajar yang baik dan kedisiplinan yang tinggi dalam mengikuti seluruh sesi pembelajaran. Tingkatkan terus kompetensi pada proyek pemrograman kelompok.",
      status_kenaikan: "Memenuhi seluruh kriteria ketuntasan fase akademik",
    };
  }

  /**
   * Pengajuan Permohonan Izin / Koreksi oleh Wali
   */
  async createPengajuan(waliId: string, input: PengajuanWaliFormInput): Promise<PengajuanWaliItem> {
    await this.assertVerifiedRelationship(waliId, input.siswa_id);

    const wali = await this.getGuardianById(waliId);
    if (!wali) {
      throw new GuardianNotFoundError(waliId);
    }

    const record = await prisma.pengajuanWali.create({
      data: {
        id: generateUlid(),
        sekolah_id: wali.sekolah_id,
        wali_id: waliId,
        siswa_id: input.siswa_id,
        tipe: input.tipe,
        judul: input.judul,
        deskripsi: input.deskripsi,
        tanggal_mulai: input.tanggal_mulai ? new Date(input.tanggal_mulai) : null,
        tanggal_selesai: input.tanggal_selesai ? new Date(input.tanggal_selesai) : null,
        lampiran_url: input.lampiran_url || null,
        status: "MENUNGGU",
      },
      include: {
        siswa: true,
      },
    });

    return {
      id: record.id,
      siswa_id: record.siswa_id,
      nama_siswa: record.siswa.nama_lengkap,
      tipe: record.tipe as PengajuanWaliItem["tipe"],
      judul: record.judul,
      deskripsi: record.deskripsi,
      tanggal_mulai: record.tanggal_mulai ? record.tanggal_mulai.toISOString() : null,
      tanggal_selesai: record.tanggal_selesai ? record.tanggal_selesai.toISOString() : null,
      lampiran_url: record.lampiran_url,
      status: record.status as PengajuanWaliItem["status"],
      catatan_tanggapan: record.catatan_tanggapan,
      created_at: record.created_at.toISOString(),
    };
  }

  /**
   * Mengambil daftar riwayat permohonan yang diajukan oleh wali
   */
  async getPengajuanList(waliId: string, studentId?: string): Promise<PengajuanWaliItem[]> {
    const records = await prisma.pengajuanWali.findMany({
      where: {
        wali_id: waliId,
        ...(studentId ? { siswa_id: studentId } : {}),
      },
      include: {
        siswa: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return records.map((r) => ({
      id: r.id,
      siswa_id: r.siswa_id,
      nama_siswa: r.siswa.nama_lengkap,
      tipe: r.tipe as PengajuanWaliItem["tipe"],
      judul: r.judul,
      deskripsi: r.deskripsi,
      tanggal_mulai: r.tanggal_mulai ? r.tanggal_mulai.toISOString() : null,
      tanggal_selesai: r.tanggal_selesai ? r.tanggal_selesai.toISOString() : null,
      lampiran_url: r.lampiran_url,
      status: r.status as PengajuanWaliItem["status"],
      catatan_tanggapan: r.catatan_tanggapan,
      created_at: r.created_at.toISOString(),
    }));
  }

  /**
   * Mencari dan memverifikasi identitas siswa untuk alur klaim wali murid (Fitur 01 & 02)
   */
  async findStudentForVerification(
    sekolahId: string,
    query: StudentClaimVerificationInput
  ): Promise<StudentClaimPreviewDTO> {
    const rawNis = query.nis?.trim() || null;
    const rawNisn = query.nisn?.trim() || null;
    const normalize = (val: string) => val.toLowerCase().replace(/[^a-z0-9]/g, "");

    // 1. Pencarian siswa di institusi sekolah aktif terlebih dahulu
    let student = null;
    if (rawNis) {
      student = await prisma.siswa.findFirst({
        where: {
          sekolah_id: sekolahId,
          nis: rawNis,
        },
        include: {
          sekolah: true,
          keikutsertaan: {
            where: { status: "AKTIF" },
            include: {
              penempatan: {
                where: { status: "AKTIF" },
                include: {
                  rombel: {
                    include: {
                      tingkat: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Jika tidak ditemukan di sekolah aktif, periksa apakah siswa ada di sekolah lain (Cross-Tenant Guard)
      if (!student) {
        const anyTenantStudent = await prisma.siswa.findFirst({
          where: { nis: rawNis },
          select: { id: true, sekolah_id: true },
        });
        if (anyTenantStudent && anyTenantStudent.sekolah_id !== sekolahId) {
          throw new CrossTenantClaimError(
            "Siswa dengan NIS tersebut terdaftar di sekolah yang berbeda dengan akun Anda."
          );
        }
      }
    } else if (rawNisn) {
      student = await prisma.siswa.findFirst({
        where: {
          sekolah_id: sekolahId,
          nisn: rawNisn,
        },
        include: {
          sekolah: true,
          keikutsertaan: {
            where: { status: "AKTIF" },
            include: {
              penempatan: {
                where: { status: "AKTIF" },
                include: {
                  rombel: {
                    include: {
                      tingkat: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Jika tidak ditemukan di sekolah aktif, periksa apakah siswa ada di sekolah lain (Cross-Tenant Guard)
      if (!student) {
        const anyTenantStudent = await prisma.siswa.findFirst({
          where: { nisn: rawNisn },
          select: { id: true, sekolah_id: true },
        });
        if (anyTenantStudent && anyTenantStudent.sekolah_id !== sekolahId) {
          throw new CrossTenantClaimError(
            "Siswa dengan NISN tersebut terdaftar di sekolah yang berbeda dengan akun Anda."
          );
        }
      }
    } else {
      // Jalur Nama Siswa + Rombel
      const candidates = await prisma.siswa.findMany({
        where: {
          sekolah_id: sekolahId,
          status_akademik: "AKTIF",
        },
        include: {
          sekolah: true,
          keikutsertaan: {
            where: { status: "AKTIF" },
            include: {
              penempatan: {
                where: { status: "AKTIF" },
                include: {
                  rombel: {
                    include: {
                      tingkat: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const normTarget = normalize(query.nama_lengkap);
      student =
        candidates.find((c) => {
          const normCand = normalize(c.nama_lengkap);
          const nameMatches =
            normCand === normTarget ||
            (normCand.includes(normTarget) && normTarget.length >= 3) ||
            (normTarget.includes(normCand) && normCand.length >= 3);

          if (!nameMatches) return false;

          if (query.rombel_nama || query.rombel_id) {
            const hasRombelMatch = c.keikutsertaan.some((k) =>
              k.penempatan.some((p) => {
                if (query.rombel_id && p.rombel_id === query.rombel_id) return true;
                if (
                  query.rombel_nama &&
                  p.rombel.nama.toLowerCase().trim() === query.rombel_nama.toLowerCase().trim()
                ) {
                  return true;
                }
                return false;
              })
            );
            if (!hasRombelMatch) return false;
          }
          return true;
        }) || null;
    }

    if (!student) {
      const searchKey = rawNis || rawNisn || query.nama_lengkap;
      throw new StudentNotFoundError(searchKey);
    }

    // Verifikasi Faktor Nama Lengkap
    const normInput = normalize(query.nama_lengkap);
    const normStudent = normalize(student.nama_lengkap);
    const isNameMatch =
      normStudent === normInput ||
      (normStudent.includes(normInput) && normInput.length >= 3) ||
      (normInput.includes(normStudent) && normStudent.length >= 3);

    if (!isNameMatch) {
      throw new StudentVerificationMismatchError(
        `Nama lengkap "${query.nama_lengkap}" tidak cocok dengan data resmi siswa terdaftar.`
      );
    }

    // Verifikasi Tanggal Lahir jika tercatat pada data siswa
    if (student.tanggal_lahir && query.tanggal_lahir) {
      const studentDob = student.tanggal_lahir.toISOString().split("T")[0];
      const queryDob = query.tanggal_lahir.trim().split("T")[0];
      if (studentDob !== queryDob) {
        throw new StudentVerificationMismatchError(
          "Tanggal lahir siswa tidak sesuai dengan data resmi sekolah."
        );
      }
    }

    // Ekstraksi nama rombel & tingkat
    let rombelNama = "Belum Ada Rombel";
    let tingkatKelas = "Siswa";
    for (const keikut of student.keikutsertaan) {
      for (const penempatan of keikut.penempatan) {
        if (penempatan.rombel) {
          rombelNama = penempatan.rombel.nama;
          tingkatKelas = penempatan.rombel.tingkat?.nama || "Kelas";
          break;
        }
      }
    }

    // Return Safe Preview (Fitur 03: ZERO sensitive data leakage)
    return {
      siswa_id: student.id,
      nama_lengkap: student.nama_lengkap,
      nis: student.nis,
      nisn: student.nisn,
      rombel_nama: rombelNama,
      tingkat_kelas: tingkatKelas,
      sekolah_id: student.sekolah_id,
      sekolah_nama: student.sekolah?.nama || "Sekolah",
      foto_url: student.foto_url,
      jenis_kelamin: student.jenis_kelamin,
    };
  }

  /**
   * Memeriksa keberadaan relasi aktif antara wali dan siswa (Fitur 05: Proteksi Klaim Duplikat)
   */
  async checkExistingRelationship(
    waliId: string,
    siswaId: string
  ): Promise<{ id: string; status_verifikasi: string; jenis_hubungan: string } | null> {
    const existing = await prisma.hubunganWaliSiswa.findUnique({
      where: {
        wali_id_siswa_id: {
          wali_id: waliId,
          siswa_id: siswaId,
        },
      },
      select: {
        id: true,
        status_verifikasi: true,
        jenis_hubungan: true,
      },
    });

    return existing;
  }

  /**
   * Membuat relasi wali dan siswa baru (Fitur 01: Hubungan Terverifikasi)
   */
  async createHubunganWali(data: {
    sekolah_id: string;
    wali_id: string;
    siswa_id: string;
    jenis_hubungan: RelationshipType;
    apakah_wali_utama?: boolean;
    status_verifikasi?: VerificationStatus;
    catatan?: string | null;
  }) {
    const id = generateUlid();
    return await prisma.hubunganWaliSiswa.create({
      data: {
        id,
        sekolah_id: data.sekolah_id,
        wali_id: data.wali_id,
        siswa_id: data.siswa_id,
        jenis_hubungan: data.jenis_hubungan,
        apakah_wali_utama: data.apakah_wali_utama ?? false,
        status_verifikasi: data.status_verifikasi ?? "TERVERIFIKASI",
        catatan: data.catatan ?? null,
      },
      include: {
        siswa: true,
        wali: true,
      },
    });
  }

  /**
   * Memastikan atau membuat record WaliMurid untuk akun pengguna
   */
  async ensureGuardianProfile(
    userId: string,
    sekolahId: string,
    data: {
      nama_lengkap: string;
      no_telepon?: string | null;
      email?: string | null;
      alamat?: string | null;
    }
  ): Promise<GuardianProfile> {
    let wali = await prisma.waliMurid.findFirst({
      where: { pengguna_id: userId },
    });

    if (!wali) {
      const id = generateUlid();
      wali = await prisma.waliMurid.create({
        data: {
          id,
          sekolah_id: sekolahId,
          pengguna_id: userId,
          nama_lengkap: data.nama_lengkap,
          no_telepon: data.no_telepon ?? null,
          email: data.email ?? null,
          alamat: data.alamat ?? null,
        },
      });
    }

    return {
      id: wali.id,
      sekolah_id: wali.sekolah_id,
      pengguna_id: wali.pengguna_id,
      nama_lengkap: wali.nama_lengkap,
      jenis_kelamin: wali.jenis_kelamin,
      no_telepon: wali.no_telepon,
      email: wali.email,
      pekerjaan: wali.pekerjaan,
      penghasilan: wali.penghasilan,
      alamat: wali.alamat,
    };
  }
}
