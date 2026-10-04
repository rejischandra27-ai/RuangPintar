/**
 * Ruang Pintar — Module M18: Digital Report Card Engine
 * Infrastructure Repository
 *
 * Mengelola interaksi basis data untuk lembar e-Rapor, nilai terpublikasi,
 * presensi semester, dan catatan wali kelas dengan strict tenant isolation.
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import { ReportCardStatus, ExtracurricularItem } from "../domain/report-card-types";

export interface SaveReportCardInput {
  sekolahId: string;
  siswaId: string;
  penempatanRombelId: string;
  semesterId: string;
  tahunAjaranId: string;
  catatanWaliKelas?: string | null;
  saranTindakLanjut?: string | null;
  ekstrakurikuler?: ExtracurricularItem[] | null;
}

export class ReportCardRepository {
  /**
   * Mengambil record rapor siswa berdasarkan siswaId dan semesterId.
   */
  async findByStudentAndSemester(siswaId: string, semesterId: string, sekolahId: string) {
    return prisma.raporSiswa.findFirst({
      where: {
        siswa_id: siswaId,
        semester_id: semesterId,
        sekolah_id: sekolahId,
      },
    });
  }

  /**
   * Mengambil record rapor siswa berdasarkan ID.
   */
  async findById(raporId: string, sekolahId: string) {
    return prisma.raporSiswa.findFirst({
      where: {
        id: raporId,
        sekolah_id: sekolahId,
      },
    });
  }

  /**
   * Upsert metadata rapor (catatan wali kelas, saran tindak lanjut, ekskul).
   */
  async upsertReportCard(input: SaveReportCardInput) {
    const existing = await prisma.raporSiswa.findUnique({
      where: {
        siswa_id_semester_id: {
          siswa_id: input.siswaId,
          semester_id: input.semesterId,
        },
      },
    });

    const ekskulJson = input.ekstrakurikuler ? JSON.stringify(input.ekstrakurikuler) : undefined;

    if (existing) {
      return prisma.raporSiswa.update({
        where: { id: existing.id },
        data: {
          catatan_wali_kelas:
            input.catatanWaliKelas !== undefined
              ? input.catatanWaliKelas
              : existing.catatan_wali_kelas,
          saran_tindak_lanjut:
            input.saranTindakLanjut !== undefined
              ? input.saranTindakLanjut
              : existing.saran_tindak_lanjut,
          ...(ekskulJson !== undefined ? { ekstrakurikuler_json: ekskulJson } : {}),
        },
      });
    }

    return prisma.raporSiswa.create({
      data: {
        id: generateUlid(),
        sekolah_id: input.sekolahId,
        siswa_id: input.siswaId,
        penempatan_rombel_id: input.penempatanRombelId,
        semester_id: input.semesterId,
        tahun_ajaran_id: input.tahunAjaranId,
        status: "DRAFT",
        catatan_wali_kelas: input.catatanWaliKelas || null,
        saran_tindak_lanjut: input.saranTindakLanjut || null,
        ekstrakurikuler_json: ekskulJson || null,
      },
    });
  }

  /**
   * Memperbarui status siklus rapor (DRAFT -> VALIDATED -> PUBLISHED).
   */
  async updateStatus(
    raporId: string,
    sekolahId: string,
    newStatus: ReportCardStatus,
    actorName: string
  ) {
    const data: {
      status: string;
      tanggal_validasi?: Date | null;
      divalidasi_oleh?: string | null;
      tanggal_publikasi?: Date | null;
      dipublikasikan_oleh?: string | null;
    } = {
      status: newStatus,
    };

    if (newStatus === "VALIDATED") {
      data.tanggal_validasi = new Date();
      data.divalidasi_oleh = actorName;
    } else if (newStatus === "PUBLISHED") {
      data.tanggal_publikasi = new Date();
      data.dipublikasikan_oleh = actorName;
    }

    return prisma.raporSiswa.update({
      where: {
        id: raporId,
        sekolah_id: sekolahId,
      },
      data,
    });
  }

  /**
   * Mengambil data lengkap siswa, rombel, penugasan mengajar, nilai, dan presensi.
   */
  async getStudentRawAcademicData(siswaId: string, sekolahId: string) {
    const student = await prisma.siswa.findFirst({
      where: {
        id: siswaId,
        sekolah_id: sekolahId,
      },
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
                    semester: true,
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
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student || student.keikutsertaan.length === 0) {
      return null;
    }

    const enrollment = student.keikutsertaan[0];
    const placement = enrollment.penempatan[0];
    if (!placement) {
      return null;
    }

    // Ambil data profil sekolah & kepala sekolah
    const school = await prisma.sekolah.findUnique({
      where: { id: sekolahId },
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

    // Ambil nilai-nilai terpublikasi untuk siswa ini
    const publishedGrades = await prisma.nilaiSiswa.findMany({
      where: {
        penempatan_rombel_id: placement.id,
        status: "TERBIT",
        asesmen: {
          sekolah_id: sekolahId,
          status: "DITERBITKAN",
        },
      },
      include: {
        asesmen: {
          include: {
            penugasan_mengajar: {
              include: {
                mata_pelajaran: true,
                guru: true,
              },
            },
            lingkup_materi: true,
            tujuan_pembelajaran: true,
          },
        },
      },
      orderBy: {
        asesmen: {
          tanggal_pelaksanaan: "asc",
        },
      },
    });

    // Ambil presensi semester siswa
    const presensiRecords = await prisma.presensiSesiKelas.findMany({
      where: {
        penempatan_rombel_id: placement.id,
        sekolah_id: sekolahId,
      },
      select: {
        status: true,
      },
    });

    const attendanceSummary = {
      sakit: presensiRecords.filter((p) => p.status === "SAKIT").length,
      izin: presensiRecords.filter((p) => p.status === "IZIN").length,
      tanpaKeterangan: presensiRecords.filter((p) => p.status === "ALPHA").length,
    };

    // Ambil record rapor existing (jika ada)
    const raporRecord = placement.rombel.semester_id
      ? await prisma.raporSiswa.findUnique({
          where: {
            siswa_id_semester_id: {
              siswa_id: siswaId,
              semester_id: placement.rombel.semester_id,
            },
          },
        })
      : null;

    return {
      student,
      enrollment,
      placement,
      rombel: placement.rombel,
      school,
      kepalaSekolahNama,
      kepalaSekolahNip,
      publishedGrades,
      attendanceSummary,
      raporRecord,
    };
  }

  /**
   * Mengambil seluruh siswa di suatu rombel beserta rapor dan agregasi ringkasnya.
   */
  async getRombelReportCardRoster(rombelId: string, sekolahId: string) {
    const rombel = await prisma.rombel.findFirst({
      where: {
        id: rombelId,
        sekolah_id: sekolahId,
      },
      include: {
        tingkat: true,
        semester: {
          include: {
            tahun_ajaran: true,
          },
        },
        penugasan_wali: {
          where: { status: "AKTIF" },
          include: { guru: true },
        },
        penugasan_mengajar: {
          where: { status: "AKTIF" },
          include: { mata_pelajaran: true },
        },
        penempatan_rombel: {
          where: { status: "AKTIF" },
          include: {
            keikutsertaan: {
              include: {
                siswa: true,
              },
            },
            rapor_siswa: true,
            nilai_siswa: {
              where: {
                status: "TERBIT",
                asesmen: { status: "DITERBITKAN" },
              },
              include: {
                asesmen: {
                  select: {
                    penugasan_mengajar_id: true,
                    kategori: true,
                  },
                },
              },
            },
            presensi_sesi_kelas: {
              select: { status: true },
            },
          },
          orderBy: [{ nomor_absen: "asc" }, { keikutsertaan: { siswa: { nama_lengkap: "asc" } } }],
        },
      },
    });

    return rombel;
  }
}

export const reportCardRepository = new ReportCardRepository();
