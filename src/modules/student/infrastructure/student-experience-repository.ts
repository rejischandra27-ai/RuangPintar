/**
 * Ruang Pintar — Student Experience Repository (Phase 15 / M15)
 *
 * Data Access Layer untuk Student Experience berbasis self-scope:
 * - Profile & Rombel Context
 * - Jadwal KBM Hari Ini
 * - Materi Pembelajaran
 * - Tugas & Pengumpulan
 * - Presensi Pribadi
 * - Nilai Published (FR-SXP-004: Strict Zero Draft Leakage)
 * - Kompilasi e-Rapor Kurikulum Merdeka
 * - CBT Terjadwal & Status Attempt
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import {
  StudentProfileContext,
  StudentTodayScheduleItem,
  StudentAssignmentItem,
  StudentMaterialItem,
  StudentAttendanceSummary,
  StudentPublishedGradeItem,
  StudentSubjectReportCard,
  StudentReportCardCompilation,
  StudentCbtExamItem,
  StudentDashboardData,
} from "../domain/student-experience-types";
import {
  AssignmentNotFoundError,
  AssignmentSubmissionDeadlinePassedError,
  StudentEnrollmentNotFoundError,
  StudentNotFoundError,
} from "../domain/student-experience-errors";
import { SubmitAssignmentInput } from "../domain/student-experience-validation";

export class StudentExperienceRepository {
  /**
   * Mengambil konteks profil lengkap siswa berdasarkan User ID.
   */
  async getStudentProfileByUserId(
    userId: string,
    schoolId?: string
  ): Promise<StudentProfileContext | null> {
    const siswa = await prisma.siswa.findFirst({
      where: {
        pengguna_id: userId,
        ...(schoolId ? { sekolah_id: schoolId } : {}),
      },
      include: {
        keikutsertaan: {
          where: { status: "AKTIF" },
          orderBy: { created_at: "desc" },
          include: {
            tahun_ajaran: true,
            tingkat: true,
            penempatan: {
              where: { status: "AKTIF" },
              orderBy: { created_at: "desc" },
              include: {
                rombel: {
                  include: {
                    penugasan_wali: {
                      where: { status: "AKTIF" },
                      include: { guru: true },
                    },
                    semester: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!siswa) {
      return null;
    }

    const activeEnrollment = siswa.keikutsertaan[0];
    const activePlacement = activeEnrollment?.penempatan[0];
    const activeRombel = activePlacement?.rombel;

    if (!activeEnrollment || !activePlacement || !activeRombel) {
      return null;
    }

    const waliKelas = activeRombel.penugasan_wali[0]?.guru;
    const waliKelasNama = waliKelas
      ? `${waliKelas.gelar_depan ? waliKelas.gelar_depan + " " : ""}${waliKelas.nama_lengkap}${waliKelas.gelar_belakang ? ", " + waliKelas.gelar_belakang : ""}`
      : null;

    // Semester name fallback
    let semesterNama = "Semester Ganjil";
    if (activeRombel.semester) {
      semesterNama = activeRombel.semester.nama;
    } else {
      const activeSem = await prisma.semester.findFirst({
        where: {
          tahun_ajaran_id: activeEnrollment.tahun_ajaran_id,
          status: "AKTIF",
        },
      });
      if (activeSem) {
        semesterNama = activeSem.nama;
      }
    }

    return {
      siswaId: siswa.id,
      namaLengkap: siswa.nama_lengkap,
      nis: siswa.nis,
      nisn: siswa.nisn,
      fotoUrl: siswa.foto_url,
      statusAkademik: siswa.status_akademik,
      tahunAjaranId: activeEnrollment.tahun_ajaran_id,
      tahunAjaranNama: activeEnrollment.tahun_ajaran.nama,
      semesterId: activeRombel.semester_id || null,
      semesterNama,
      rombelId: activeRombel.id,
      rombelNama: activeRombel.nama,
      tingkatNama: activeEnrollment.tingkat?.nama || "Tingkat 10",
      waliKelasNama,
      nomorAbsen: activePlacement.nomor_absen,
    };
  }

  /**
   * Mengambil jadwal pelajaran siswa hari ini.
   */
  async getTodaySchedule(rombelId: string, schoolId: string): Promise<StudentTodayScheduleItem[]> {
    const daysMap = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
    const todayIndex = new Date().getDay();
    const todayName = daysMap[todayIndex];

    const activeVersion = await prisma.versiJadwal.findFirst({
      where: {
        sekolah_id: schoolId,
        status: "PUBLISHED",
      },
    });

    if (!activeVersion) {
      return [];
    }

    const entries = await prisma.jadwalPelajaran.findMany({
      where: {
        sekolah_id: schoolId,
        versi_jadwal_id: activeVersion.id,
        rombel_id: rombelId,
        hari: todayName,
      },
      include: {
        mata_pelajaran: true,
        guru: true,
        slot_waktu: true,
      },
      orderBy: {
        slot_waktu: {
          urutan: "asc",
        },
      },
    });

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`;

    return entries.map((entry) => {
      let status: "SELESAI" | "AKTIF" | "MENDATANG" = "MENDATANG";
      if (entry.slot_waktu.jam_selesai < currentTimeStr) {
        status = "SELESAI";
      } else if (
        entry.slot_waktu.jam_mulai <= currentTimeStr &&
        entry.slot_waktu.jam_selesai >= currentTimeStr
      ) {
        status = "AKTIF";
      }

      const guru = entry.guru;
      const guruNama = `${guru.gelar_depan ? guru.gelar_depan + " " : ""}${guru.nama_lengkap}${guru.gelar_belakang ? ", " + guru.gelar_belakang : ""}`;

      return {
        id: entry.id,
        mataPelajaranNama: entry.mata_pelajaran.nama,
        mataPelajaranKode: entry.mata_pelajaran.kode,
        guruNama,
        jamMulai: entry.slot_waktu.jam_mulai,
        jamSelesai: entry.slot_waktu.jam_selesai,
        urutan: entry.slot_waktu.urutan,
        ruangan: entry.ruangan,
        status,
        penugasanMengajarId: entry.penugasan_mengajar_id,
      };
    });
  }

  /**
   * Mengambil materi pembelajaran yang diterbitkan untuk rombel siswa.
   */
  async getStudentMaterials(rombelId: string, schoolId: string): Promise<StudentMaterialItem[]> {
    const penugasanList = await prisma.penugasanMengajar.findMany({
      where: {
        sekolah_id: schoolId,
        rombel_id: rombelId,
        status: "AKTIF",
      },
      select: { id: true },
    });

    const penugasanIds = penugasanList.map((p) => p.id);
    if (penugasanIds.length === 0) {
      return [];
    }

    const publications = await prisma.publikasiMateri.findMany({
      where: {
        sekolah_id: schoolId,
        penugasan_mengajar_id: { in: penugasanIds },
        status: "DITERBITKAN",
      },
      include: {
        materi: {
          include: {
            berkas: true,
            lingkup_materi: true,
          },
        },
        penugasan_mengajar: {
          include: {
            mata_pelajaran: true,
            guru: true,
          },
        },
      },
      orderBy: {
        tanggal_publikasi: "desc",
      },
    });

    return publications.map((pub) => {
      const guru = pub.penugasan_mengajar.guru;
      const guruNama = `${guru.gelar_depan ? guru.gelar_depan + " " : ""}${guru.nama_lengkap}${guru.gelar_belakang ? ", " + guru.gelar_belakang : ""}`;

      return {
        id: pub.id,
        materiId: pub.materi_id,
        judul: pub.materi.judul,
        deskripsi: pub.materi.deskripsi,
        tipeKonten: pub.materi.tipe_konten as any,
        kontenTeks: pub.materi.konten_teks,
        tautanUrl: pub.materi.tautan_url,
        berkas: pub.materi.berkas
          ? {
              id: pub.materi.berkas.id,
              namaFileAsli: pub.materi.berkas.nama_file_asli,
              ukuranByte: pub.materi.berkas.ukuran_byte,
              mimeType: pub.materi.berkas.mime_type,
            }
          : null,
        tanggalPublikasi: pub.tanggal_publikasi,
        tanggalPublikasiFormatted: pub.tanggal_publikasi.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        mataPelajaranNama: pub.penugasan_mengajar.mata_pelajaran.nama,
        guruNama,
        babJudul: pub.materi.lingkup_materi?.judul || null,
        penugasanMengajarId: pub.penugasan_mengajar_id,
      };
    });
  }

  /**
   * Mengambil daftar tugas dan status penyerahan siswa.
   */
  async getStudentAssignments(
    siswaId: string,
    rombelId: string,
    schoolId: string
  ): Promise<StudentAssignmentItem[]> {
    const penugasanList = await prisma.penugasanMengajar.findMany({
      where: {
        sekolah_id: schoolId,
        rombel_id: rombelId,
        status: "AKTIF",
      },
      select: { id: true },
    });

    const penugasanIds = penugasanList.map((p) => p.id);
    if (penugasanIds.length === 0) {
      return [];
    }

    const publications = await prisma.publikasiTugas.findMany({
      where: {
        sekolah_id: schoolId,
        penugasan_mengajar_id: { in: penugasanIds },
        status: "DITERBITKAN",
      },
      include: {
        tugas: {
          include: {
            berkas: true,
          },
        },
        penugasan_mengajar: {
          include: {
            mata_pelajaran: true,
            guru: true,
          },
        },
        pengumpulan: {
          where: {
            siswa_id: siswaId,
          },
          include: {
            berkas: true,
          },
        },
      },
      orderBy: {
        batas_waktu: "asc",
      },
    });

    const now = new Date();

    return publications.map((pub) => {
      const guru = pub.penugasan_mengajar.guru;
      const guruNama = `${guru.gelar_depan ? guru.gelar_depan + " " : ""}${guru.nama_lengkap}${guru.gelar_belakang ? ", " + guru.gelar_belakang : ""}`;
      const submission = pub.pengumpulan[0] || null;

      const isPastDeadline = pub.batas_waktu ? now > pub.batas_waktu : false;

      let statusPengerjaan: "BELUM_DIKUMPULKAN" | "SUDAH_DIKUMPULKAN" | "TERLAMBAT" =
        "BELUM_DIKUMPULKAN";

      if (submission) {
        statusPengerjaan = submission.status === "TERLAMBAT" ? "TERLAMBAT" : "SUDAH_DIKUMPULKAN";
      } else if (isPastDeadline) {
        statusPengerjaan = "TERLAMBAT";
      }

      return {
        id: pub.id,
        tugasId: pub.tugas_id,
        judul: pub.tugas.judul,
        petunjuk: pub.tugas.petunjuk,
        tipePenyerahan: pub.tugas.tipe_penyerahan as any,
        batasWaktu: pub.batas_waktu,
        batasWaktuFormatted: pub.batas_waktu
          ? pub.batas_waktu.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Tanpa Batas Waktu",
        izinkanTerlambat: pub.izinkan_terlambat,
        statusPublikasi: pub.status,
        mataPelajaranNama: pub.penugasan_mengajar.mata_pelajaran.nama,
        guruNama,
        penugasanMengajarId: pub.penugasan_mengajar_id,
        lampiranBerkas: pub.tugas.berkas
          ? {
              id: pub.tugas.berkas.id,
              namaFileAsli: pub.tugas.berkas.nama_file_asli,
              ukuranByte: pub.tugas.berkas.ukuran_byte,
            }
          : null,
        pengumpulan: submission
          ? {
              id: submission.id,
              tanggalKumpul: submission.tanggal_kumpul,
              tanggalKumpulFormatted: submission.tanggal_kumpul.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
              status: submission.status as any,
              teksJawaban: submission.teks_jawaban,
              berkas: submission.berkas
                ? {
                    id: submission.berkas.id,
                    namaFileAsli: submission.berkas.nama_file_asli,
                    ukuranByte: submission.berkas.ukuran_byte,
                  }
                : null,
              catatanSiswa: submission.catatan_siswa,
              catatanGuru: submission.catatan_guru,
            }
          : null,
        isPastDeadline,
        statusPengerjaan,
      };
    });
  }

  /**
   * Mengumpulkan jawaban tugas oleh siswa.
   */
  async submitAssignment(siswaId: string, schoolId: string, input: SubmitAssignmentInput) {
    const publication = await prisma.publikasiTugas.findFirst({
      where: {
        id: input.publikasi_tugas_id,
        sekolah_id: schoolId,
        status: "DITERBITKAN",
      },
    });

    if (!publication) {
      throw new AssignmentNotFoundError();
    }

    const now = new Date();
    const isPastDeadline = publication.batas_waktu ? now > publication.batas_waktu : false;

    if (isPastDeadline && !publication.izinkan_terlambat) {
      throw new AssignmentSubmissionDeadlinePassedError();
    }

    const status = isPastDeadline ? "TERLAMBAT" : "DIKUMPULKAN";

    const existingSubmission = await prisma.pengumpulanTugas.findUnique({
      where: {
        publikasi_tugas_id_siswa_id: {
          publikasi_tugas_id: publication.id,
          siswa_id: siswaId,
        },
      },
    });

    if (existingSubmission) {
      if (existingSubmission.sekolah_id !== schoolId) {
        throw new Error(`Pengumpulan tugas bukan milik sekolah aktif.`);
      }
      return prisma.pengumpulanTugas.update({
        where: { id: existingSubmission.id },
        data: {
          teks_jawaban: input.teks_jawaban ?? existingSubmission.teks_jawaban,
          berkas_id: input.berkas_id !== undefined ? input.berkas_id : existingSubmission.berkas_id,
          catatan_siswa: input.catatan_siswa ?? existingSubmission.catatan_siswa,
          status,
          tanggal_kumpul: now,
        },
      });
    }

    return prisma.pengumpulanTugas.create({
      data: {
        id: generateUlid(),
        sekolah_id: schoolId,
        publikasi_tugas_id: publication.id,
        siswa_id: siswaId,
        teks_jawaban: input.teks_jawaban || null,
        berkas_id: input.berkas_id || null,
        catatan_siswa: input.catatan_siswa || null,
        status,
        tanggal_kumpul: now,
      },
    });
  }

  /**
   * Mengambil ringkasan dan riwayat presensi sesi kelas pribadi siswa.
   */
  async getStudentAttendanceSummary(
    siswaId: string,
    schoolId: string
  ): Promise<StudentAttendanceSummary> {
    const records = await prisma.presensiSesiKelas.findMany({
      where: {
        siswa_id: siswaId,
        sekolah_id: schoolId,
      },
      include: {
        sesi_kelas: {
          include: {
            mata_pelajaran: true,
            guru: true,
          },
        },
      },
      orderBy: {
        sesi_kelas: {
          tanggal: "desc",
        },
      },
    });

    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpha = 0;
    let dispensasi = 0;
    let terlambat = 0;

    const riwayatPresensi = records.map((rec) => {
      const st = rec.status;
      if (st === "HADIR") hadir++;
      else if (st === "IZIN") izin++;
      else if (st === "SAKIT") sakit++;
      else if (st === "ALPHA") alpha++;
      else if (st === "DISPENSASI") dispensasi++;
      else if (st === "TERLAMBAT") terlambat++;

      const guru = rec.sesi_kelas.guru;
      const guruNama = `${guru.gelar_depan ? guru.gelar_depan + " " : ""}${guru.nama_lengkap}${guru.gelar_belakang ? ", " + guru.gelar_belakang : ""}`;

      return {
        id: rec.id,
        tanggal: rec.sesi_kelas.tanggal,
        tanggalFormatted: rec.sesi_kelas.tanggal.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        mataPelajaranNama: rec.sesi_kelas.mata_pelajaran.nama,
        guruNama,
        status: rec.status,
        catatan: rec.catatan,
        ruangan: rec.sesi_kelas.ruangan_aktual,
      };
    });

    const totalSesi = records.length;
    const effectivePresent = hadir + dispensasi + terlambat;
    const persentaseKehadiran =
      totalSesi > 0 ? Math.round((effectivePresent / totalSesi) * 100) : 100;

    return {
      totalSesi,
      hadir,
      izin,
      sakit,
      alpha,
      dispensasi,
      terlambat,
      persentaseKehadiran,
      riwayatPresensi,
    };
  }

  /**
   * Mengambil daftar nilai yang SUDAH DIPUBLIKASIKAN untuk siswa.
   *
   * DOMAIN INVARIANT CRITICAL (FR-SXP-004):
   * Siswa HANYA dapat melihat nilai yang memiliki PublikasiNilaiAsesmen
   * dengan status 'PUBLISHED' dan target 'SISWA' atau 'SEMUA'.
   * Draft grade dilarang keras bocor ke response siswa.
   */
  async getStudentPublishedGrades(
    siswaId: string,
    schoolId: string
  ): Promise<StudentPublishedGradeItem[]> {
    // 1. Cari asesmen yang telah dipublikasikan ke siswa
    const publications = await prisma.publikasiNilaiAsesmen.findMany({
      where: {
        sekolah_id: schoolId,
        status: "PUBLISHED",
        target_audience: { in: ["SISWA", "SEMUA"] },
      },
      select: {
        asesmen_id: true,
      },
    });

    const publishedAsesmenIds = publications.map((p) => p.asesmen_id);
    if (publishedAsesmenIds.length === 0) {
      return [];
    }

    // 2. Ambil nilai siswa pada asesmen tersebut
    const grades = await prisma.nilaiSiswa.findMany({
      where: {
        sekolah_id: schoolId,
        siswa_id: siswaId,
        asesmen_id: { in: publishedAsesmenIds },
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
          },
        },
      },
      orderBy: {
        asesmen: {
          tanggal_pelaksanaan: "desc",
        },
      },
    });

    return grades.map((g) => {
      const guru = g.asesmen.penugasan_mengajar.guru;
      const guruNama = `${guru.gelar_depan ? guru.gelar_depan + " " : ""}${guru.nama_lengkap}${guru.gelar_belakang ? ", " + guru.gelar_belakang : ""}`;

      const nilaiAngka = g.nilai_angka;
      const isTuntas = nilaiAngka !== null ? nilaiAngka >= g.asesmen.kkm_kktp : false;

      return {
        asesmenId: g.asesmen_id,
        judulAsesmen: g.asesmen.judul,
        kategori: g.asesmen.kategori,
        teknik: g.asesmen.teknik_penilaian,
        mataPelajaranNama: g.asesmen.penugasan_mengajar.mata_pelajaran.nama,
        guruNama,
        tpKode: g.asesmen.tujuan_pembelajaran?.kode || null,
        tpDeskripsi: g.asesmen.tujuan_pembelajaran?.deskripsi || null,
        babJudul: g.asesmen.lingkup_materi?.judul || null,
        kkmKktp: g.asesmen.kkm_kktp,
        nilaiAngka,
        nilaiHuruf: g.nilai_huruf,
        capaianKompetensi: g.capaian_kompetensi,
        isTuntas,
        tanggalPelaksanaan: g.asesmen.tanggal_pelaksanaan,
        tanggalPelaksanaanFormatted: g.asesmen.tanggal_pelaksanaan.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      };
    });
  }

  /**
   * Mengompilasi lembar e-Rapor resmi Kurikulum Merdeka siswa.
   */
  async getStudentReportCardCompilation(
    siswaId: string,
    schoolId: string
  ): Promise<StudentReportCardCompilation> {
    const student = await prisma.siswa.findUnique({
      where: { id: siswaId },
      include: {
        keikutsertaan: {
          where: { status: "AKTIF" },
          include: {
            tahun_ajaran: true,
            tingkat: true,
            penempatan: {
              where: { status: "AKTIF" },
              include: {
                rombel: {
                  include: {
                    penugasan_wali: {
                      where: { status: "AKTIF" },
                      include: { guru: true },
                    },
                    penugasan_mengajar: {
                      where: { status: "AKTIF" },
                      include: {
                        mata_pelajaran: true,
                        guru: true,
                      },
                    },
                    semester: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student || student.keikutsertaan.length === 0) {
      throw new StudentNotFoundError();
    }

    const enrollment = student.keikutsertaan[0];
    const placement = enrollment.penempatan[0];
    if (!placement) {
      throw new StudentEnrollmentNotFoundError();
    }

    const rombel = placement.rombel;
    const wali = rombel.penugasan_wali[0]?.guru;
    const waliKelasNama = wali
      ? `${wali.gelar_depan ? wali.gelar_depan + " " : ""}${wali.nama_lengkap}${wali.gelar_belakang ? ", " + wali.gelar_belakang : ""}`
      : "Wali Kelas";

    // Data Sekolah & Kepala Sekolah
    const school = await prisma.sekolah.findUnique({
      where: { id: schoolId },
      include: {
        jabatan: {
          where: { kode_jabatan: "HEADMASTER" },
          include: {
            penugasan: {
              where: { status: "AKTIF" },
            },
          },
        },
      },
    });

    let kepalaSekolahNama = "Drs. H. Mulyadi, M.Pd.";
    let kepalaSekolahNip: string | null = "197204151998021001";

    if (school?.jabatan[0]?.penugasan[0]) {
      const kepalaUserId = school.jabatan[0].penugasan[0].personil_id;
      const kepalaUser = await prisma.pengguna.findUnique({
        where: { id: kepalaUserId },
      });
      if (kepalaUser) {
        kepalaSekolahNama = kepalaUser.nama_lengkap;
      }
    }

    // Ambil nilai published
    const publishedGrades = await this.getStudentPublishedGrades(siswaId, schoolId);

    // Group by Mata Pelajaran
    const subjectMap = new Map<string, StudentPublishedGradeItem[]>();
    for (const g of publishedGrades) {
      const list = subjectMap.get(g.mataPelajaranNama) || [];
      list.push(g);
      subjectMap.set(g.mataPelajaranNama, list);
    }

    // Bangun kompilasi per mata pelajaran aktif di rombel
    const mataPelajaranList: StudentSubjectReportCard[] = [];
    let totalScoreSum = 0;
    let gradedSubjectCount = 0;

    for (const penugasan of rombel.penugasan_mengajar) {
      const mapelName = penugasan.mata_pelajaran.nama;
      const mapelGrades = subjectMap.get(mapelName) || [];

      const formatifGrades = mapelGrades.filter(
        (g) => g.kategori === "FORMATIF" && g.nilaiAngka !== null
      );
      const sumatifGrades = mapelGrades.filter(
        (g) => (g.kategori === "SUMATIF" || g.kategori === "SUMATIF_AKHIR") && g.nilaiAngka !== null
      );

      const rerataFormatif =
        formatifGrades.length > 0
          ? Math.round(
              formatifGrades.reduce((a, b) => a + (b.nilaiAngka || 0), 0) / formatifGrades.length
            )
          : null;

      const rerataSumatif =
        sumatifGrades.length > 0
          ? Math.round(
              sumatifGrades.reduce((a, b) => a + (b.nilaiAngka || 0), 0) / sumatifGrades.length
            )
          : null;

      let nilaiAkhir: number | null = null;
      if (rerataFormatif !== null && rerataSumatif !== null) {
        nilaiAkhir = Math.round(rerataFormatif * 0.4 + rerataSumatif * 0.6);
      } else if (rerataSumatif !== null) {
        nilaiAkhir = rerataSumatif;
      } else if (rerataFormatif !== null) {
        nilaiAkhir = rerataFormatif;
      }

      if (nilaiAkhir !== null) {
        totalScoreSum += nilaiAkhir;
        gradedSubjectCount++;
      }

      const kkmKktp = 75; // Baseline KKTP Kurikulum Merdeka
      const isTuntas = nilaiAkhir !== null ? nilaiAkhir >= kkmKktp : false;

      let predikat = "-";
      if (nilaiAkhir !== null) {
        if (nilaiAkhir >= 90) predikat = "A";
        else if (nilaiAkhir >= 80) predikat = "B";
        else if (nilaiAkhir >= 70) predikat = "C";
        else predikat = "D";
      }

      // Analisis Capaian Tertinggi & Perlu Peningkatan
      let deskripsiCapaianTertinggi = "Menunjukkan penguasaan capaian pembelajaran dengan baik.";
      let deskripsiPerluPeningkatan = "Perlu mempertahankan konsistensi belajar pada materi pokok.";

      if (mapelGrades.length > 0) {
        const sorted = [...mapelGrades]
          .filter((g) => g.nilaiAngka !== null)
          .sort((a, b) => (b.nilaiAngka || 0) - (a.nilaiAngka || 0));

        if (sorted.length > 0) {
          const highest = sorted[0];
          const topicName = highest.tpDeskripsi || highest.babJudul || highest.judulAsesmen;
          deskripsiCapaianTertinggi = `Menunjukkan pemahaman sangat optimal dalam materi ${topicName}.`;

          if (sorted.length > 1) {
            const lowest = sorted[sorted.length - 1];
            if ((lowest.nilaiAngka || 0) < 80) {
              const lowTopic = lowest.tpDeskripsi || lowest.babJudul || lowest.judulAsesmen;
              deskripsiPerluPeningkatan = `Perlu bimbingan dan peningkatan pemahaman dalam topik ${lowTopic}.`;
            }
          }
        }
      }

      const guru = penugasan.guru;
      const guruNama = `${guru.gelar_depan ? guru.gelar_depan + " " : ""}${guru.nama_lengkap}${guru.gelar_belakang ? ", " + guru.gelar_belakang : ""}`;

      mataPelajaranList.push({
        mataPelajaranId: penugasan.mata_pelajaran_id,
        mataPelajaranNama: mapelName,
        guruNama,
        kkmKktp,
        rerataFormatif,
        rerataSumatif,
        nilaiAkhir,
        predikat,
        isTuntas,
        deskripsiCapaianTertinggi,
        deskripsiPerluPeningkatan,
        totalAsesmen: mapelGrades.length,
      });
    }

    const rerataKeseluruhan =
      gradedSubjectCount > 0 ? Math.round((totalScoreSum / gradedSubjectCount) * 10) / 10 : null;

    // Presensi rekapitulasi semester
    const attendance = await this.getStudentAttendanceSummary(siswaId, schoolId);

    const profileContext: StudentProfileContext = {
      siswaId: student.id,
      namaLengkap: student.nama_lengkap,
      nis: student.nis,
      nisn: student.nisn,
      fotoUrl: student.foto_url,
      statusAkademik: student.status_akademik,
      tahunAjaranId: enrollment.tahun_ajaran_id,
      tahunAjaranNama: enrollment.tahun_ajaran.nama,
      semesterId: rombel.semester_id,
      semesterNama: rombel.semester?.nama || "Semester Ganjil",
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      tingkatNama: enrollment.tingkat?.nama || "Tingkat 10",
      waliKelasNama,
      nomorAbsen: placement.nomor_absen,
    };

    const raporRecord = rombel.semester_id
      ? await prisma.raporSiswa.findUnique({
          where: {
            siswa_id_semester_id: {
              siswa_id: siswaId,
              semester_id: rombel.semester_id,
            },
          },
        })
      : null;

    let catatanWaliKelas =
      raporRecord?.catatan_wali_kelas ||
      "Ananda memiliki motivasi belajar yang konsisten dan aktif berpartisipasi dalam diskusi kelas. Pertahankan prestasinya.";
    if (!raporRecord?.catatan_wali_kelas && rerataKeseluruhan !== null && rerataKeseluruhan < 75) {
      catatanWaliKelas =
        "Perlu meningkatkan kehadiran, kedisiplinan pengumpulan tugas, dan konsultasi dengan guru mata pelajaran.";
    }

    return {
      siswa: profileContext,
      sekolahNama: school?.nama || "SMK OTOMINDO",
      sekolahAlamat: school?.alamat || "Jakarta",
      sekolahNpsn: school?.npsn || "20100001",
      sekolahLogo: school?.logo_url || null,
      kepalaSekolahNama,
      kepalaSekolahNip,
      tahunAjaran: enrollment.tahun_ajaran.nama,
      semester: rombel.semester?.nama || "Semester Ganjil",
      mataPelajaranList,
      rerataKeseluruhan,
      presensi: {
        sakit: attendance.sakit,
        izin: attendance.izin,
        tanpaKeterangan: attendance.alpha,
      },
      catatanWaliKelas,
      tanggalCetak: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  }

  /**
   * Mengambil daftar ujian CBT yang diterbitkan untuk rombel siswa.
   */
  async getStudentCbtExams(
    siswaId: string,
    rombelId: string,
    schoolId: string
  ): Promise<StudentCbtExamItem[]> {
    const penugasanList = await prisma.penugasanMengajar.findMany({
      where: {
        sekolah_id: schoolId,
        rombel_id: rombelId,
        status: "AKTIF",
      },
      select: { id: true },
    });

    const penugasanIds = penugasanList.map((p) => p.id);
    if (penugasanIds.length === 0) {
      return [];
    }

    const exams = await prisma.ujianCbt.findMany({
      where: {
        sekolah_id: schoolId,
        penugasan_mengajar_id: { in: penugasanIds },
        status: { in: ["DITERBITKAN", "BERLANGSUNG"] },
      },
      include: {
        penugasan_mengajar: {
          include: {
            mata_pelajaran: true,
            guru: true,
          },
        },
        sesi_ujian_siswa: {
          where: {
            siswa_id: siswaId,
          },
          include: {
            hasil: true,
          },
          orderBy: {
            attempt_ke: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return exams.map((exam) => {
      const guru = exam.penugasan_mengajar.guru;
      const guruNama = `${guru.gelar_depan ? guru.gelar_depan + " " : ""}${guru.nama_lengkap}${guru.gelar_belakang ? ", " + guru.gelar_belakang : ""}`;
      const latestAttempt = exam.sesi_ujian_siswa[0] || null;

      let actionLabel = "Mulai Ujian Online";
      let isAvailable = true;

      if (latestAttempt) {
        if (latestAttempt.status === "SEDANG_MENGERJAKAN") {
          actionLabel = "Lanjutkan Ujian";
        } else if (
          latestAttempt.status === "DIKUMPULKAN" ||
          latestAttempt.status === "WAKTU_HABIS"
        ) {
          actionLabel = "Selesai (Lihat Rekap)";
          isAvailable = false;
        } else if (latestAttempt.status === "TERKUNCI_PELANGGARAN") {
          actionLabel = "Sesi Terkunci";
          isAvailable = false;
        }
      }

      return {
        ujianId: exam.id,
        judul: exam.judul,
        deskripsi: exam.deskripsi,
        mataPelajaranNama: exam.penugasan_mengajar.mata_pelajaran.nama,
        guruNama,
        durasiMenit: exam.durasi_menit,
        waktuMulai: exam.waktu_mulai,
        waktuSelesai: exam.waktu_selesai,
        gunakanToken: exam.gunakan_token,
        kkmKktp: exam.kkm_kktp,
        statusUjian: exam.status,
        attempt: latestAttempt
          ? {
              id: latestAttempt.id,
              attemptKe: latestAttempt.attempt_ke,
              status: latestAttempt.status,
              waktuMulai: latestAttempt.waktu_mulai,
              nilaiAkhir: latestAttempt.hasil?.nilai_akhir ?? null,
              apakahTuntas: latestAttempt.hasil?.apakah_tuntas ?? null,
            }
          : null,
        isAvailable,
        actionLabel,
      };
    });
  }

  /**
   * Mengambil data agregasi terpadu untuk Dashboard Siswa.
   */
  async getStudentDashboardData(userId: string, schoolId?: string): Promise<StudentDashboardData> {
    const profile = await this.getStudentProfileByUserId(userId, schoolId);

    if (!profile) {
      return {
        profile: null,
        statCards: {
          rombelNama: "-",
          waliKelasNama: "-",
          persentaseKehadiran: 0,
          totalHadir: 0,
          totalAlpha: 0,
          tugasPerluDikerjakan: 0,
          totalTugasAktif: 0,
          nilaiRataRata: null,
          cbtAktifCount: 0,
        },
        jadwalHariIni: [],
        tugasMendatang: [],
        cbtMendatang: [],
        nilaiTerbaru: [],
      };
    }

    const effectiveSchoolId = schoolId || profile.tahunAjaranId; // fallback

    const [jadwalHariIni, assignments, attendance, publishedGrades, cbtExams] = await Promise.all([
      this.getTodaySchedule(profile.rombelId, effectiveSchoolId),
      this.getStudentAssignments(profile.siswaId, profile.rombelId, effectiveSchoolId),
      this.getStudentAttendanceSummary(profile.siswaId, effectiveSchoolId),
      this.getStudentPublishedGrades(profile.siswaId, effectiveSchoolId),
      this.getStudentCbtExams(profile.siswaId, profile.rombelId, effectiveSchoolId),
    ]);

    const tugasPerluDikerjakan = assignments.filter(
      (a) => a.statusPengerjaan !== "SUDAH_DIKUMPULKAN"
    ).length;

    const gradedItems = publishedGrades.filter((g) => g.nilaiAngka !== null);
    const nilaiRataRata =
      gradedItems.length > 0
        ? Math.round(
            (gradedItems.reduce((acc, curr) => acc + (curr.nilaiAngka || 0), 0) /
              gradedItems.length) *
              10
          ) / 10
        : null;

    const cbtAktifCount = cbtExams.filter((c) => c.isAvailable).length;

    return {
      profile,
      statCards: {
        rombelNama: profile.rombelNama,
        waliKelasNama: profile.waliKelasNama || "Belum Ditentukan",
        persentaseKehadiran: attendance.persentaseKehadiran,
        totalHadir: attendance.hadir,
        totalAlpha: attendance.alpha,
        tugasPerluDikerjakan,
        totalTugasAktif: assignments.length,
        nilaiRataRata,
        cbtAktifCount,
      },
      jadwalHariIni,
      tugasMendatang: assignments.slice(0, 5),
      cbtMendatang: cbtExams.slice(0, 5),
      nilaiTerbaru: publishedGrades.slice(0, 5),
    };
  }
}

export const studentExperienceRepository = new StudentExperienceRepository();
