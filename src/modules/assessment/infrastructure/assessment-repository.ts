/**
 * Ruang Pintar — M13 Assessment & Gradebook Infrastructure Repository
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import {
  DefinisiAsesmenDTO,
  NilaiSiswaDTO,
  ClassGradebookDTO,
  GradebookColumnDTO,
  GradebookStudentRowDTO,
  AssessmentCategory,
  AssessmentTechnique,
  AssessmentStatus,
  GradeStatus,
  PublicationAudience,
  GradeItemInput,
} from "../domain/assessment-types";

export class AssessmentRepository {
  /**
   * Cari asesmen berdasarkan ID
   */
  async findById(id: string, sekolahId: string) {
    return prisma.definisiAsesmen.findFirst({
      where: { id, sekolah_id: sekolahId },
      include: {
        tujuan_pembelajaran: true,
        lingkup_materi: true,
        penugasan_mengajar: {
          include: {
            rombel: true,
            mata_pelajaran: true,
            guru: true,
          },
        },
        publikasi: {
          where: { status: "PUBLISHED" },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    });
  }

  /**
   * Ambil daftar asesmen untuk satu penugasan mengajar
   */
  async findByPenugasan(penugasanId: string, sekolahId: string): Promise<DefinisiAsesmenDTO[]> {
    // 1. Ambil total siswa aktif di rombel penugasan ini
    const penugasan = await prisma.penugasanMengajar.findFirst({
      where: { id: penugasanId, sekolah_id: sekolahId },
      select: { rombel_id: true },
    });

    const totalSiswaRombel = penugasan
      ? await prisma.penempatanRombel.count({
          where: {
            rombel_id: penugasan.rombel_id,
            sekolah_id: sekolahId,
            status: "AKTIF",
          },
        })
      : 0;

    // 2. Ambil seluruh asesmen
    const asesmenList = await prisma.definisiAsesmen.findMany({
      where: {
        penugasan_mengajar_id: penugasanId,
        sekolah_id: sekolahId,
      },
      include: {
        tujuan_pembelajaran: true,
        lingkup_materi: true,
        nilai_siswa: {
          select: {
            nilai_angka: true,
          },
        },
        publikasi: {
          where: { status: "PUBLISHED" },
          take: 1,
        },
      },
      orderBy: [{ tanggal_pelaksanaan: "desc" }, { created_at: "desc" }],
    });

    return asesmenList.map((a) => {
      const validGrades = a.nilai_siswa
        .map((n) => n.nilai_angka)
        .filter((val): val is number => val !== null && val !== undefined);

      const rataRata =
        validGrades.length > 0
          ? Number(
              (validGrades.reduce((acc, curr) => acc + curr, 0) / validGrades.length).toFixed(1)
            )
          : null;

      return {
        id: a.id,
        sekolah_id: a.sekolah_id,
        penugasan_mengajar_id: a.penugasan_mengajar_id,
        tp_id: a.tp_id,
        tp_kode: a.tujuan_pembelajaran?.kode || null,
        tp_deskripsi: a.tujuan_pembelajaran?.deskripsi || null,
        lingkup_materi_id: a.lingkup_materi_id,
        lingkup_materi_judul: a.lingkup_materi?.judul || null,
        judul: a.judul,
        deskripsi: a.deskripsi,
        kategori: a.kategori as AssessmentCategory,
        teknik_penilaian: a.teknik_penilaian as AssessmentTechnique,
        bobot: a.bobot,
        skala_maksimal: a.skala_maksimal,
        kkm_kktp: a.kkm_kktp,
        tanggal_pelaksanaan: a.tanggal_pelaksanaan.toISOString(),
        status: a.status as AssessmentStatus,
        is_published: a.publikasi.length > 0 || a.status === "PUBLISHED",
        total_siswa_dinilai: validGrades.length,
        total_siswa_rombel: totalSiswaRombel,
        rata_rata_nilai: rataRata,
        created_at: a.created_at.toISOString(),
        updated_at: a.updated_at.toISOString(),
      };
    });
  }

  /**
   * Ambil data nilai siswa untuk satu asesmen tertentu (termasuk siswa yang belum dinilai)
   */
  async findAssessmentGrades(asesmenId: string, sekolahId: string): Promise<NilaiSiswaDTO[]> {
    const asesmen = await this.findById(asesmenId, sekolahId);
    if (!asesmen) return [];

    const rombelId = asesmen.penugasan_mengajar.rombel_id;

    // Ambil seluruh siswa aktif di rombel
    const penempatanList = await prisma.penempatanRombel.findMany({
      where: {
        rombel_id: rombelId,
        sekolah_id: sekolahId,
        status: "AKTIF",
      },
      include: {
        keikutsertaan: {
          include: {
            siswa: true,
          },
        },
      },
      orderBy: [{ nomor_absen: "asc" }, { keikutsertaan: { siswa: { nama_lengkap: "asc" } } }],
    });

    // Ambil nilai yang sudah tersimpan
    const existingGrades = await prisma.nilaiSiswa.findMany({
      where: {
        asesmen_id: asesmenId,
        sekolah_id: sekolahId,
      },
    });

    const gradeMap = new Map(existingGrades.map((g) => [g.siswa_id, g]));

    return penempatanList.map((pr) => {
      const siswa = pr.keikutsertaan.siswa;
      const grade = gradeMap.get(siswa.id);

      const nilaiAngka = grade?.nilai_angka ?? null;
      const isTercapai = nilaiAngka !== null ? nilaiAngka >= asesmen.kkm_kktp : null;

      return {
        id: grade?.id || `draft-${siswa.id}`,
        sekolah_id: sekolahId,
        asesmen_id: asesmenId,
        siswa_id: siswa.id,
        penempatan_rombel_id: pr.id,
        siswa_nis: siswa.nis,
        siswa_nama: siswa.nama_lengkap,
        nomor_absen: pr.nomor_absen,
        nilai_angka: nilaiAngka,
        nilai_huruf: grade?.nilai_huruf || null,
        capaian_kompetensi: grade?.capaian_kompetensi || null,
        catatan: grade?.catatan || null,
        status: (grade?.status as GradeStatus) || "DRAFT",
        diinput_oleh: grade?.diinput_oleh || null,
        diubah_terakhir_oleh: grade?.diubah_terakhir_oleh || null,
        alasan_koreksi: grade?.alasan_koreksi || null,
        is_tercapai_kktp: isTercapai,
        created_at: grade?.created_at.toISOString() || new Date().toISOString(),
        updated_at: grade?.updated_at.toISOString() || new Date().toISOString(),
      };
    });
  }

  /**
   * Buat Asesmen Baru
   */
  async createAssessment(data: {
    sekolah_id: string;
    penugasan_mengajar_id: string;
    tp_id?: string | null;
    lingkup_materi_id?: string | null;
    judul: string;
    deskripsi?: string | null;
    kategori: AssessmentCategory;
    teknik_penilaian: AssessmentTechnique;
    bobot?: number;
    skala_maksimal?: number;
    kkm_kktp?: number;
    tanggal_pelaksanaan?: Date;
  }) {
    const id = generateUlid();
    return prisma.definisiAsesmen.create({
      data: {
        id,
        sekolah_id: data.sekolah_id,
        penugasan_mengajar_id: data.penugasan_mengajar_id,
        tp_id: data.tp_id || null,
        lingkup_materi_id: data.lingkup_materi_id || null,
        judul: data.judul,
        deskripsi: data.deskripsi || null,
        kategori: data.kategori,
        teknik_penilaian: data.teknik_penilaian,
        bobot: data.bobot ?? 1.0,
        skala_maksimal: data.skala_maksimal ?? 100.0,
        kkm_kktp: data.kkm_kktp ?? 75.0,
        tanggal_pelaksanaan: data.tanggal_pelaksanaan || new Date(),
        status: "DRAFT",
      },
    });
  }

  /**
   * Update Asesmen
   */
  async updateAssessment(
    id: string,
    sekolahId: string,
    data: {
      judul?: string;
      deskripsi?: string | null;
      kategori?: AssessmentCategory;
      teknik_penilaian?: AssessmentTechnique;
      bobot?: number;
      skala_maksimal?: number;
      kkm_kktp?: number;
      tanggal_pelaksanaan?: Date;
      status?: AssessmentStatus;
    }
  ) {
    return prisma.definisiAsesmen.update({
      where: { id, sekolah_id: sekolahId },
      data: {
        ...(data.judul && { judul: data.judul }),
        ...(data.deskripsi !== undefined && { deskripsi: data.deskripsi }),
        ...(data.kategori && { kategori: data.kategori }),
        ...(data.teknik_penilaian && { teknik_penilaian: data.teknik_penilaian }),
        ...(data.bobot !== undefined && { bobot: data.bobot }),
        ...(data.skala_maksimal !== undefined && { skala_maksimal: data.skala_maksimal }),
        ...(data.kkm_kktp !== undefined && { kkm_kktp: data.kkm_kktp }),
        ...(data.tanggal_pelaksanaan && { tanggal_pelaksanaan: data.tanggal_pelaksanaan }),
        ...(data.status && { status: data.status }),
      },
    });
  }

  /**
   * Hapus Asesmen
   */
  async deleteAssessment(id: string, sekolahId: string) {
    return prisma.definisiAsesmen.delete({
      where: { id, sekolah_id: sekolahId },
    });
  }

  /**
   * Simpan Sekaligus (Bulk Upsert) Nilai Siswa
   */
  async bulkSaveGrades(
    asesmenId: string,
    sekolahId: string,
    grades: GradeItemInput[],
    userId: string,
    alasanKoreksi?: string | null
  ) {
    return prisma.$transaction(async (tx) => {
      for (const item of grades) {
        // Cari apakah nilai untuk siswa ini sudah pernah ada
        const existing = await tx.nilaiSiswa.findUnique({
          where: {
            asesmen_id_siswa_id: {
              asesmen_id: asesmenId,
              siswa_id: item.siswa_id,
            },
          },
        });

        const nilaiAngka = item.nilai_angka !== undefined ? item.nilai_angka : null;
        let nilaiHuruf = null;
        if (nilaiAngka !== null) {
          if (nilaiAngka >= 90) nilaiHuruf = "A";
          else if (nilaiAngka >= 80) nilaiHuruf = "B";
          else if (nilaiAngka >= 70) nilaiHuruf = "C";
          else nilaiHuruf = "D";
        }

        if (existing) {
          // Update
          await tx.nilaiSiswa.update({
            where: { id: existing.id },
            data: {
              nilai_angka: nilaiAngka,
              nilai_huruf: nilaiHuruf,
              capaian_kompetensi: item.capaian_kompetensi || existing.capaian_kompetensi,
              catatan: item.catatan !== undefined ? item.catatan : existing.catatan,
              status: item.status || existing.status,
              diubah_terakhir_oleh: userId,
              alasan_koreksi: alasanKoreksi || item.alasan_koreksi || existing.alasan_koreksi,
            },
          });
        } else {
          // Create
          await tx.nilaiSiswa.create({
            data: {
              id: generateUlid(),
              sekolah_id: sekolahId,
              asesmen_id: asesmenId,
              siswa_id: item.siswa_id,
              penempatan_rombel_id: item.penempatan_rombel_id || null,
              nilai_angka: nilaiAngka,
              nilai_huruf: nilaiHuruf,
              capaian_kompetensi: item.capaian_kompetensi || null,
              catatan: item.catatan || null,
              status: item.status || "DRAFT",
              diinput_oleh: userId,
              alasan_koreksi: alasanKoreksi || null,
            },
          });
        }
      }

      return { success: true, count: grades.length };
    });
  }

  /**
   * Publikasikan Asesmen dan Nilai-nilainya
   */
  async publishAssessment(
    asesmenId: string,
    sekolahId: string,
    userId: string,
    targetAudience: PublicationAudience = "SEMUA",
    catatan?: string | null
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Buat catatan publikasi resmi
      const publikasiId = generateUlid();
      const pub = await tx.publikasiNilaiAsesmen.create({
        data: {
          id: publikasiId,
          sekolah_id: sekolahId,
          asesmen_id: asesmenId,
          target_audience: targetAudience,
          dipublikasikan_oleh: userId,
          status: "PUBLISHED",
          catatan: catatan || null,
        },
      });

      // 2. Update status asesmen menjadi PUBLISHED
      await tx.definisiAsesmen.update({
        where: { id: asesmenId, sekolah_id: sekolahId },
        data: { status: "PUBLISHED" },
      });

      // 3. Update status nilai yang sudah ada menjadi PUBLISHED
      await tx.nilaiSiswa.updateMany({
        where: { asesmen_id: asesmenId, sekolah_id: sekolahId },
        data: { status: "PUBLISHED" },
      });

      return pub;
    });
  }

  /**
   * Ambil data Matriks Buku Nilai (Gradebook) Komprehensif
   */
  async getGradebookData(penugasanId: string, sekolahId: string): Promise<ClassGradebookDTO> {
    const penugasan = await prisma.penugasanMengajar.findFirst({
      where: { id: penugasanId, sekolah_id: sekolahId },
      include: {
        rombel: true,
        mata_pelajaran: true,
      },
    });

    if (!penugasan) {
      throw new Error(`Penugasan mengajar '${penugasanId}' tidak ditemukan.`);
    }

    // 1. Ambil kolom-kolom asesmen
    const asesmenList = await prisma.definisiAsesmen.findMany({
      where: {
        penugasan_mengajar_id: penugasanId,
        sekolah_id: sekolahId,
      },
      include: {
        tujuan_pembelajaran: true,
        lingkup_materi: true,
        publikasi: {
          where: { status: "PUBLISHED" },
          take: 1,
        },
      },
      orderBy: [{ tanggal_pelaksanaan: "asc" }, { created_at: "asc" }],
    });

    const columns: GradebookColumnDTO[] = asesmenList.map((a) => ({
      id: a.id,
      judul: a.judul,
      kategori: a.kategori as AssessmentCategory,
      tp_id: a.tp_id || null,
      tp_kode: a.tujuan_pembelajaran?.kode || null,
      tp_deskripsi: a.tujuan_pembelajaran?.deskripsi || null,
      lingkup_materi_id: a.lingkup_materi_id || null,
      lingkup_materi_judul: a.lingkup_materi?.judul || null,
      bobot: a.bobot,
      kkm_kktp: a.kkm_kktp,
      status: a.status as AssessmentStatus,
      is_published: a.publikasi.length > 0 || a.status === "PUBLISHED",
      tanggal_pelaksanaan: a.tanggal_pelaksanaan.toISOString(),
    }));

    // 2. Ambil seluruh siswa aktif di rombel
    const penempatanList = await prisma.penempatanRombel.findMany({
      where: {
        rombel_id: penugasan.rombel_id,
        sekolah_id: sekolahId,
        status: "AKTIF",
      },
      include: {
        keikutsertaan: {
          include: {
            siswa: true,
          },
        },
      },
      orderBy: [{ nomor_absen: "asc" }, { keikutsertaan: { siswa: { nama_lengkap: "asc" } } }],
    });

    // 3. Ambil seluruh nilai untuk penugasan ini
    const asesmenIds = asesmenList.map((a) => a.id);
    const allGrades =
      asesmenIds.length > 0
        ? await prisma.nilaiSiswa.findMany({
            where: {
              asesmen_id: { in: asesmenIds },
              sekolah_id: sekolahId,
            },
          })
        : [];

    // Map: `${siswa_id}_${asesmen_id}` -> NilaiSiswa
    const gradeMap = new Map(allGrades.map((g) => [`${g.siswa_id}_${g.asesmen_id}`, g]));

    // 4. Susun baris siswa dan hitung rata-rata
    // Resolve dynamic KKTP: ambil KKTP dari asesmen riil pada penugasan ini, atau default 80 (SMK kejuruan/KKA), fallback 75
    const definedKktp = asesmenList.find(
      (a) => typeof a.kkm_kktp === "number" && a.kkm_kktp > 0
    )?.kkm_kktp;
    const defaultKKTP = definedKktp ?? 80.0;
    let totalAllScore = 0;
    let totalAllScoreCount = 0;
    let totalPassedKKTP = 0;

    const rows: GradebookStudentRowDTO[] = penempatanList.map((pr) => {
      const siswa = pr.keikutsertaan.siswa;
      const studentGrades: GradebookStudentRowDTO["grades"] = {};

      let totalFormatif = 0;
      let countFormatif = 0;
      let totalSumatif = 0;
      let countSumatif = 0;
      let totalWeighted = 0;
      let totalWeight = 0;
      let studentPassedCount = 0;
      let studentAssessedCount = 0;

      for (const col of columns) {
        const grade = gradeMap.get(`${siswa.id}_${col.id}`);
        const nilaiAngka = grade?.nilai_angka ?? null;

        studentGrades[col.id] = {
          nilai_id: grade?.id,
          nilai_angka: nilaiAngka,
          status: (grade?.status as GradeStatus) || "DRAFT",
          capaian_kompetensi: grade?.capaian_kompetensi || null,
        };

        if (nilaiAngka !== null) {
          studentAssessedCount++;
          if (nilaiAngka >= col.kkm_kktp) {
            studentPassedCount++;
          }

          if (col.kategori === "FORMATIF") {
            totalFormatif += nilaiAngka;
            countFormatif++;
          } else {
            totalSumatif += nilaiAngka;
            countSumatif++;
          }

          totalWeighted += nilaiAngka * col.bobot;
          totalWeight += col.bobot;

          totalAllScore += nilaiAngka;
          totalAllScoreCount++;
        }
      }

      const rataFormatif =
        countFormatif > 0 ? Number((totalFormatif / countFormatif).toFixed(1)) : null;
      const rataSumatif =
        countSumatif > 0 ? Number((totalSumatif / countSumatif).toFixed(1)) : null;
      const nilaiAkhir = totalWeight > 0 ? Number((totalWeighted / totalWeight).toFixed(1)) : null;
      const kktpPersen =
        studentAssessedCount > 0
          ? Math.round((studentPassedCount / studentAssessedCount) * 100)
          : null;

      if (nilaiAkhir !== null && nilaiAkhir >= defaultKKTP) {
        totalPassedKKTP++;
      }

      return {
        siswa_id: siswa.id,
        penempatan_rombel_id: pr.id,
        nis: siswa.nis,
        nisn: siswa.nisn || null,
        nama_lengkap: siswa.nama_lengkap,
        nomor_absen: pr.nomor_absen,
        grades: studentGrades,
        rata_rata_formatif: rataFormatif,
        rata_rata_sumatif: rataSumatif,
        nilai_akhir: nilaiAkhir,
        ketercapaian_kktp_persen: kktpPersen,
      };
    });

    const rataRataKelas =
      totalAllScoreCount > 0 ? Number((totalAllScore / totalAllScoreCount).toFixed(1)) : null;

    const tuntasPercent =
      rows.length > 0 ? Math.round((totalPassedKKTP / rows.length) * 100) : null;

    return {
      penugasan_id: penugasan.id,
      sekolah_id: sekolahId,
      rombel_id: penugasan.rombel_id,
      rombel_nama: penugasan.rombel.nama,
      mata_pelajaran_id: penugasan.mata_pelajaran_id,
      mata_pelajaran_nama: penugasan.mata_pelajaran.nama,
      kkm_default: defaultKKTP,
      columns,
      rows,
      statistics: {
        total_siswa: rows.length,
        total_asesmen: columns.length,
        total_formatif: columns.filter((c) => c.kategori === "FORMATIF").length,
        total_sumatif: columns.filter((c) => c.kategori !== "FORMATIF").length,
        rata_rata_kelas: rataRataKelas,
        persentase_tuntas_kktp: tuntasPercent,
      },
    };
  }

  /**
   * Ambil ringkasan seluruh penugasan mengajar untuk halaman buku nilai terpusat (/penilaian)
   */
  async getTeacherGradebookOverview(
    sekolahId: string,
    guruId?: string | null,
    isSuperAdmin = false
  ) {
    const whereClause: any = {
      sekolah_id: sekolahId,
      status: "AKTIF",
    };

    if (!isSuperAdmin && guruId) {
      whereClause.guru_id = guruId;
    }

    const penugasanList = await prisma.penugasanMengajar.findMany({
      where: whereClause,
      include: {
        guru: true,
        rombel: {
          include: {
            tingkat: true,
            _count: {
              select: {
                penempatan_rombel: {
                  where: {
                    sekolah_id: sekolahId,
                    status: "AKTIF",
                  },
                },
              },
            },
          },
        },
        mata_pelajaran: true,
        tahun_ajaran: true,
        definisi_asesmen: {
          select: {
            id: true,
            kategori: true,
            status: true,
            nilai_siswa: {
              select: {
                nilai_angka: true,
              },
            },
          },
        },
      },
      orderBy: [{ rombel: { nama: "asc" } }, { mata_pelajaran: { nama: "asc" } }],
    });

    return penugasanList.map((p) => {
      const totalSiswa = p.rombel._count.penempatan_rombel;

      const totalAsesmen = p.definisi_asesmen.length;
      const totalFormatif = p.definisi_asesmen.filter((a) => a.kategori === "FORMATIF").length;
      const totalSumatif = p.definisi_asesmen.filter((a) => a.kategori !== "FORMATIF").length;
      const totalPublished = p.definisi_asesmen.filter((a) => a.status === "PUBLISHED").length;

      const allGrades = p.definisi_asesmen.flatMap((a) =>
        a.nilai_siswa
          .map((n) => n.nilai_angka)
          .filter((v): v is number => v !== null && v !== undefined)
      );

      const rataRata =
        allGrades.length > 0
          ? Number((allGrades.reduce((acc, curr) => acc + curr, 0) / allGrades.length).toFixed(1))
          : null;

      return {
        penugasan_id: p.id,
        rombel_id: p.rombel_id,
        rombel_nama: p.rombel.nama,
        tingkat_nama: p.rombel.tingkat?.nama || null,
        mata_pelajaran_id: p.mata_pelajaran_id,
        mata_pelajaran_nama: p.mata_pelajaran.nama,
        guru_id: p.guru_id,
        guru_nama: p.guru.nama_lengkap,
        tahun_ajaran_nama: p.tahun_ajaran.nama,
        total_siswa: totalSiswa,
        total_asesmen: totalAsesmen,
        total_formatif: totalFormatif,
        total_sumatif: totalSumatif,
        total_published: totalPublished,
        rata_rata_kelas: rataRata,
      };
    });
  }
}

export const assessmentRepository = new AssessmentRepository();
