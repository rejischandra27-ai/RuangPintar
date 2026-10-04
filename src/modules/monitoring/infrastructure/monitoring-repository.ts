/**
 * Ruang Pintar — M18 Student Monitoring Repository
 *
 * Mengelola pembacaan derived read model indikator siswa (presensi, tugas, nilai)
 * serta persistensi Catatan Pembinaan dan Tindak Lanjut Monitoring Wali Kelas.
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import {
  CatatanMonitoringItem,
  CreateFollowUpInput,
  CreateMonitoringNoteInput,
  HomeroomOverviewDTO,
  KategoriCatatan,
  StatusCatatan,
  StatusPerhatian,
  StatusTindakLanjut,
  StudentAssignmentIndicator,
  StudentAttendanceIndicator,
  StudentGradeIndicator,
  StudentMonitoringDetailDTO,
  StudentMonitoringSummary,
  TindakLanjutItem,
  TingkatUrgensi,
  UpdateFollowUpStatusInput,
  UpdateMonitoringNoteInput,
} from "../domain/monitoring-types";
import {
  FollowUpNotFoundError,
  HomeroomNotFoundError,
  MonitoringNoteNotFoundError,
} from "../domain/monitoring-errors";

export class MonitoringRepository {
  /**
   * Menemukan penugasan wali kelas aktif seorang guru
   */
  static async getTeacherActiveHomeroom(sekolahId: string, guruId: string) {
    return prisma.penugasanWaliKelas.findFirst({
      where: {
        sekolah_id: sekolahId,
        guru_id: guruId,
        status: "AKTIF",
      },
      include: {
        rombel: {
          include: {
            tingkat: true,
            tahun_ajaran: true,
            semester: true,
          },
        },
        guru: true,
      },
    });
  }

  /**
   * Mengambil daftar seluruh rombel dengan wali kelas aktif (untuk Super Admin / supervisi)
   */
  static async getAllActiveHomerooms(sekolahId: string) {
    return prisma.penugasanWaliKelas.findMany({
      where: {
        sekolah_id: sekolahId,
        status: "AKTIF",
      },
      include: {
        rombel: {
          include: {
            tingkat: true,
            tahun_ajaran: true,
            semester: true,
          },
        },
        guru: true,
      },
      orderBy: {
        rombel: {
          nama: "asc",
        },
      },
    });
  }

  /**
   * Mengambil gambaran komprehensif (overview) rombel perwalian:
   * Menghitung derived indicators (kehadiran, tugas, nilai) secara dinamis
   */
  static async getHomeroomOverview(
    sekolahId: string,
    rombelId: string
  ): Promise<HomeroomOverviewDTO> {
    const rombel = await prisma.rombel.findFirst({
      where: { id: rombelId, sekolah_id: sekolahId },
      include: {
        tahun_ajaran: true,
        semester: true,
        penugasan_wali: {
          where: { status: "AKTIF" },
          include: { guru: true },
        },
      },
    });

    if (!rombel) {
      throw new HomeroomNotFoundError(`Rombel dengan ID ${rombelId} tidak ditemukan.`);
    }

    const activeHomeroom = rombel.penugasan_wali[0];
    const waliKelasNama = activeHomeroom?.guru
      ? [
          activeHomeroom.guru.gelar_depan,
          activeHomeroom.guru.nama_lengkap,
          activeHomeroom.guru.gelar_belakang,
        ]
          .filter(Boolean)
          .join(" ")
          .trim()
      : "Belum Ditentukan";

    // 1. Ambil seluruh siswa aktif di rombel ini
    const penempatan = await prisma.penempatanRombel.findMany({
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
      orderBy: {
        keikutsertaan: {
          siswa: {
            nama_lengkap: "asc",
          },
        },
      },
    });

    const students = penempatan.map((p) => p.keikutsertaan.siswa);
    const studentIds = students.map((s) => s.id);

    // 2. Ambil seluruh sesi kelas aktual untuk rombel ini
    const sessions = await prisma.sesiKelasAktual.findMany({
      where: {
        rombel_id: rombelId,
        sekolah_id: sekolahId,
      },
      select: {
        id: true,
        tanggal: true,
        status: true,
      },
    });

    const sessionIds = sessions.map((s) => s.id);

    // 3. Ambil seluruh presensi sesi pada rombel ini
    const attendanceRecords =
      sessionIds.length > 0 && studentIds.length > 0
        ? await prisma.presensiSesiKelas.findMany({
            where: {
              sesi_kelas_id: { in: sessionIds },
              siswa_id: { in: studentIds },
            },
            select: {
              sesi_kelas_id: true,
              siswa_id: true,
              status: true,
            },
          })
        : [];

    // 4. Ambil seluruh tugas terpublikasi pada rombel ini
    const publishedAssignments = await prisma.publikasiTugas.findMany({
      where: {
        penugasan_mengajar: {
          rombel_id: rombelId,
        },
      },
      include: {
        tugas: true,
      },
    });

    const assignmentPubIds = publishedAssignments.map((pa) => pa.id);

    // 5. Ambil seluruh pengumpulan tugas oleh siswa rombel ini
    const submissions =
      assignmentPubIds.length > 0 && studentIds.length > 0
        ? await prisma.pengumpulanTugas.findMany({
            where: {
              publikasi_tugas_id: { in: assignmentPubIds },
              siswa_id: { in: studentIds },
            },
            select: {
              publikasi_tugas_id: true,
              siswa_id: true,
              status: true,
              tanggal_kumpul: true,
            },
          })
        : [];

    // 6. Ambil seluruh publikasi asesmen untuk rombel ini (Phase 13 Gradebook)
    const publishedAssessments = await prisma.publikasiNilaiAsesmen.findMany({
      where: {
        asesmen: {
          penugasan_mengajar: {
            rombel_id: rombelId,
          },
        },
        status: "PUBLISHED",
      },
      include: {
        asesmen: true,
      },
    });

    const assessmentIds = publishedAssessments.map((pa) => pa.asesmen_id);

    // 7. Ambil seluruh nilai siswa untuk asesmen terpublikasi ini
    const grades =
      assessmentIds.length > 0 && studentIds.length > 0
        ? await prisma.nilaiSiswa.findMany({
            where: {
              asesmen_id: { in: assessmentIds },
              siswa_id: { in: studentIds },
            },
            select: {
              asesmen_id: true,
              siswa_id: true,
              nilai_angka: true,
            },
          })
        : [];

    // 8. Ambil seluruh catatan monitoring dan tindak lanjut di rombel ini
    const notes = await prisma.catatanMonitoring.findMany({
      where: {
        rombel_id: rombelId,
        sekolah_id: sekolahId,
      },
      include: {
        penulis: {
          select: {
            id: true,
            nama_lengkap: true,
            peran_dasar: true,
          },
        },
        siswa: {
          select: {
            id: true,
            nama_lengkap: true,
            nis: true,
          },
        },
        tindak_lanjut: {
          include: {
            penanggung_jawab: {
              select: {
                id: true,
                nama_lengkap: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Petakan catatan per siswa
    const notesByStudent: Record<string, CatatanMonitoringItem[]> = {};
    const formattedNotes: CatatanMonitoringItem[] = notes.map((n) => {
      const item: CatatanMonitoringItem = {
        id: n.id,
        sekolah_id: n.sekolah_id,
        rombel_id: n.rombel_id,
        siswa_id: n.siswa_id,
        siswa_nama: n.siswa.nama_lengkap,
        siswa_nis: n.siswa.nis,
        penulis_id: n.penulis_id,
        penulis_nama: n.penulis.nama_lengkap,
        penulis_peran: n.penulis.peran_dasar,
        judul: n.judul,
        isi: n.isi,
        kategori: n.kategori as KategoriCatatan,
        tingkat_urgensi: n.tingkat_urgensi as TingkatUrgensi,
        status: n.status as StatusCatatan,
        created_at: n.created_at,
        updated_at: n.updated_at,
        tindak_lanjut: n.tindak_lanjut.map((tl) => ({
          id: tl.id,
          catatan_id: tl.catatan_id,
          penanggung_jawab_id: tl.penanggung_jawab_id,
          penanggung_jawab_nama: tl.penanggung_jawab?.nama_lengkap || null,
          tindakan: tl.tindakan,
          target_tanggal: tl.target_tanggal,
          status: tl.status as StatusTindakLanjut,
          hasil: tl.hasil,
          tanggal_penyelesaian: tl.tanggal_penyelesaian,
          created_at: tl.created_at,
          updated_at: tl.updated_at,
        })),
      };

      if (!notesByStudent[n.siswa_id]) {
        notesByStudent[n.siswa_id] = [];
      }
      notesByStudent[n.siswa_id].push(item);
      return item;
    });

    // 9. Hitung derived indicators untuk masing-masing siswa
    const totalSesi = sessionIds.length;
    const totalTugas = assignmentPubIds.length;
    const totalAsesmen = assessmentIds.length;

    let totalAttendancePercentageSum = 0;

    const studentSummaries: StudentMonitoringSummary[] = students.map((s) => {
      // a. Presensi
      const sAttendances = attendanceRecords.filter((a) => a.siswa_id === s.id);
      let hadir = 0;
      let izin = 0;
      let sakit = 0;
      let alpha = 0;
      let dispensasi = 0;
      let terlambat = 0;

      for (const att of sAttendances) {
        if (att.status === "HADIR") hadir++;
        else if (att.status === "IZIN") izin++;
        else if (att.status === "SAKIT") sakit++;
        else if (att.status === "ALPHA") alpha++;
        else if (att.status === "DISPENSASI") dispensasi++;
        else if (att.status === "TERLAMBAT") terlambat++;
      }

      const totalRecorded = hadir + izin + sakit + alpha + dispensasi + terlambat;
      // Persentase kehadiran positif (Hadir, Dispensasi, Terlambat)
      const presensiPersen =
        totalRecorded > 0
          ? Math.round(((hadir + dispensasi + terlambat) / totalRecorded) * 100)
          : 100;

      const presensiInd: StudentAttendanceIndicator = {
        total_sesi: totalRecorded || totalSesi,
        hadir,
        izin,
        sakit,
        alpha,
        dispensasi,
        terlambat,
        persentase_kehadiran: presensiPersen,
      };

      totalAttendancePercentageSum += presensiPersen;

      // b. Tugas
      const sSubmissions = submissions.filter((sub) => sub.siswa_id === s.id);
      const dikumpulkanCount = sSubmissions.length;
      let tepatWaktu = 0;
      let terlambatKumpul = 0;

      for (const sub of sSubmissions) {
        if (sub.status === "TERLAMBAT") {
          terlambatKumpul++;
        } else {
          tepatWaktu++;
        }
      }

      const belumMengumpulkan = Math.max(0, totalTugas - dikumpulkanCount);
      const tugasPersen = totalTugas > 0 ? Math.round((dikumpulkanCount / totalTugas) * 100) : 100;

      const tugasInd: StudentAssignmentIndicator = {
        total_tugas: totalTugas,
        dikumpulkan: dikumpulkanCount,
        tepat_waktu: tepatWaktu,
        terlambat: terlambatKumpul,
        belum_mengumpulkan: belumMengumpulkan,
        persentase_tuntas: tugasPersen,
      };

      // c. Nilai
      const sGrades = grades.filter((g) => g.siswa_id === s.id && g.nilai_angka !== null);
      const assessedCount = sGrades.length;

      let sumNilai = 0;
      let tuntasCount = 0;
      let belumTuntasCount = 0;

      for (const g of sGrades) {
        const val = g.nilai_angka as number;
        sumNilai += val;
        // Ambil KKTP asesmen
        const assDef = publishedAssessments.find((pa) => pa.asesmen_id === g.asesmen_id)?.asesmen;
        const kktp = assDef?.kkm_kktp || 75;
        if (val >= kktp) {
          tuntasCount++;
        } else {
          belumTuntasCount++;
        }
      }

      const rerataNilai =
        assessedCount > 0 ? Math.round((sumNilai / assessedCount) * 10) / 10 : null;
      const kktpPersen = assessedCount > 0 ? Math.round((tuntasCount / assessedCount) * 100) : 100;

      const nilaiInd: StudentGradeIndicator = {
        total_asesmen: totalAsesmen,
        dinilai: assessedCount,
        rerata_nilai: rerataNilai,
        jumlah_tuntas_kktp: tuntasCount,
        jumlah_belum_tuntas: belumTuntasCount,
        persentase_kktp: kktpPersen,
      };

      // d. Evaluasi Status Perhatian & Rekomendasi
      const rekomendasi: string[] = [];
      let statusPerhatian: StatusPerhatian = "NORMAL";

      if (alpha >= 3) {
        rekomendasi.push(`Alpha tinggi (${alpha} sesi tanpa keterangan)`);
      } else if (alpha >= 1) {
        rekomendasi.push(`Terdapat alpha (${alpha} sesi)`);
      }

      if (presensiPersen < 75 && totalRecorded >= 3) {
        rekomendasi.push(`Tingkat kehadiran kritis (${presensiPersen}%)`);
      } else if (presensiPersen < 85 && totalRecorded >= 3) {
        rekomendasi.push(`Kehadiran perlu ditingkatkan (${presensiPersen}%)`);
      }

      if (belumMengumpulkan >= 3 && totalTugas >= 3) {
        rekomendasi.push(`${belumMengumpulkan} tugas belum dikumpulkan`);
      } else if (belumMengumpulkan >= 1 && totalTugas >= 1) {
        rekomendasi.push(`${belumMengumpulkan} tugas belum diselesaikan`);
      }

      if (belumTuntasCount >= 2) {
        rekomendasi.push(`${belumTuntasCount} asesmen di bawah KKTP`);
      }

      // Klasifikasi Status
      if (
        alpha >= 3 ||
        (presensiPersen < 75 && totalRecorded >= 3) ||
        belumMengumpulkan >= 3 ||
        belumTuntasCount >= 3
      ) {
        statusPerhatian = "KRITIS";
      } else if (
        alpha >= 1 ||
        (presensiPersen < 85 && totalRecorded >= 3) ||
        belumMengumpulkan >= 1 ||
        belumTuntasCount >= 1
      ) {
        statusPerhatian = "PERHATIAN";
      } else if (
        rerataNilai !== null &&
        rerataNilai >= 85 &&
        presensiPersen === 100 &&
        belumMengumpulkan === 0
      ) {
        statusPerhatian = "BERPRESTASI";
      } else {
        statusPerhatian = "NORMAL";
      }

      const sNotes = notesByStudent[s.id] || [];

      return {
        siswa_id: s.id,
        nama_lengkap: s.nama_lengkap,
        nis: s.nis,
        nisn: s.nisn,
        jenis_kelamin: s.jenis_kelamin,
        foto_url: s.foto_url,
        status_akademik: s.status_akademik,
        status_perhatian: statusPerhatian,
        rekomendasi_perhatian: rekomendasi,
        presensi: presensiInd,
        tugas: tugasInd,
        nilai: nilaiInd,
        jumlah_catatan_aktif: sNotes.filter((n) => n.status === "AKTIF").length,
        catatan_terbaru: sNotes[0] || null,
      };
    });

    // 10. Agregasi Tingkat Rombel
    const totalStudents = students.length;
    const avgAttendance =
      totalStudents > 0 ? Math.round(totalAttendancePercentageSum / totalStudents) : 100;

    const jumlahKritis = studentSummaries.filter((s) => s.status_perhatian === "KRITIS").length;
    const jumlahPerhatian = studentSummaries.filter(
      (s) => s.status_perhatian === "PERHATIAN"
    ).length;
    const jumlahNormal = studentSummaries.filter((s) => s.status_perhatian === "NORMAL").length;
    const jumlahBerprestasi = studentSummaries.filter(
      (s) => s.status_perhatian === "BERPRESTASI"
    ).length;

    // Filter daftar perhatian cepat (KRITIS dahulu, lalu PERHATIAN)
    const daftarPerhatianCepat = studentSummaries
      .filter((s) => s.status_perhatian === "KRITIS" || s.status_perhatian === "PERHATIAN")
      .sort((a, b) => {
        if (a.status_perhatian === "KRITIS" && b.status_perhatian !== "KRITIS") return -1;
        if (a.status_perhatian !== "KRITIS" && b.status_perhatian === "KRITIS") return 1;
        return a.presensi.persentase_kehadiran - b.presensi.persentase_kehadiran;
      });

    return {
      rombel_id: rombel.id,
      rombel_nama: rombel.nama,
      rombel_kapasitas: rombel.kapasitas,
      wali_kelas_id: activeHomeroom?.guru_id || "",
      wali_kelas_nama: waliKelasNama,
      tahun_ajaran_id: rombel.tahun_ajaran_id,
      tahun_ajaran_nama: rombel.tahun_ajaran.nama,
      semester_id: rombel.semester_id,
      semester_nama: rombel.semester?.nama || null,
      total_siswa: totalStudents,
      rerata_kehadiran_rombel: avgAttendance,
      jumlah_kritis: jumlahKritis,
      jumlah_perhatian: jumlahPerhatian,
      jumlah_normal: jumlahNormal,
      jumlah_berprestasi: jumlahBerprestasi,
      daftar_perhatian_cepat: daftarPerhatianCepat,
      siswa_list: studentSummaries,
      catatan_list: formattedNotes,
    };
  }

  /**
   * Mengambil rincian detail pemantauan 1 siswa untuk modal investigasi holistik
   */
  static async getStudentMonitoringDetail(
    sekolahId: string,
    rombelId: string,
    siswaId: string
  ): Promise<StudentMonitoringDetailDTO> {
    const siswa = await prisma.siswa.findFirst({
      where: { id: siswaId, sekolah_id: sekolahId },
    });

    if (!siswa) {
      throw new HomeroomNotFoundError(`Siswa dengan ID ${siswaId} tidak ditemukan.`);
    }

    const rombel = await prisma.rombel.findFirst({
      where: { id: rombelId, sekolah_id: sekolahId },
      select: { id: true, nama: true },
    });

    if (!rombel) {
      throw new HomeroomNotFoundError(`Rombel dengan ID ${rombelId} tidak ditemukan.`);
    }

    // 1. Presensi Breakdown
    const sessionAttendances = await prisma.presensiSesiKelas.findMany({
      where: {
        siswa_id: siswaId,
        sesi_kelas: {
          rombel_id: rombelId,
        },
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
      take: 20,
    });

    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpha = 0;
    let dispensasi = 0;
    let terlambat = 0;

    const presensiBreakdown = sessionAttendances.map((sa) => {
      if (sa.status === "HADIR") hadir++;
      else if (sa.status === "IZIN") izin++;
      else if (sa.status === "SAKIT") sakit++;
      else if (sa.status === "ALPHA") alpha++;
      else if (sa.status === "DISPENSASI") dispensasi++;
      else if (sa.status === "TERLAMBAT") terlambat++;

      return {
        sesi_id: sa.sesi_kelas_id,
        tanggal: sa.sesi_kelas.tanggal,
        mata_pelajaran: sa.sesi_kelas.mata_pelajaran.nama,
        guru_nama: sa.sesi_kelas.guru.nama_lengkap,
        status: sa.status,
        catatan: sa.catatan,
      };
    });

    const totalRecorded = hadir + izin + sakit + alpha + dispensasi + terlambat;
    const presensiPersen =
      totalRecorded > 0
        ? Math.round(((hadir + dispensasi + terlambat) / totalRecorded) * 100)
        : 100;

    // 2. Tugas Breakdown
    const publishedTasks = await prisma.publikasiTugas.findMany({
      where: {
        penugasan_mengajar: {
          rombel_id: rombelId,
        },
      },
      include: {
        tugas: true,
        penugasan_mengajar: {
          include: {
            mata_pelajaran: true,
          },
        },
      },
      orderBy: {
        batas_waktu: "desc",
      },
    });

    const taskPubIds = publishedTasks.map((pt) => pt.id);
    const submissions =
      taskPubIds.length > 0
        ? await prisma.pengumpulanTugas.findMany({
            where: {
              publikasi_tugas_id: { in: taskPubIds },
              siswa_id: siswaId,
            },
          })
        : [];

    let dikumpulkanCount = 0;
    let tepatWaktu = 0;
    let terlambatKumpul = 0;

    const tugasBreakdown = publishedTasks.map((pt) => {
      const sub = submissions.find((s) => s.publikasi_tugas_id === pt.id);
      const isSub = Boolean(sub);
      if (isSub) dikumpulkanCount++;
      if (sub?.status === "TERLAMBAT") terlambatKumpul++;
      else if (isSub) tepatWaktu++;

      return {
        tugas_id: pt.id,
        judul: pt.tugas.judul,
        mata_pelajaran: pt.penugasan_mengajar.mata_pelajaran.nama,
        batas_waktu: pt.batas_waktu,
        status_pengumpulan: (sub
          ? sub.status === "TERLAMBAT"
            ? "TERLAMBAT"
            : "DIKUMPULKAN"
          : "BELUM") as "DIKUMPULKAN" | "TERLAMBAT" | "BELUM",
        dikumpulkan_pada: sub?.tanggal_kumpul || null,
        nilai: null,
      };
    });

    const belumMengumpulkan = Math.max(0, publishedTasks.length - dikumpulkanCount);
    const tugasPersen =
      publishedTasks.length > 0
        ? Math.round((dikumpulkanCount / publishedTasks.length) * 100)
        : 100;

    // 3. Nilai Breakdown
    const publishedAssessments = await prisma.publikasiNilaiAsesmen.findMany({
      where: {
        asesmen: {
          penugasan_mengajar: {
            rombel_id: rombelId,
          },
        },
        status: "PUBLISHED",
      },
      include: {
        asesmen: {
          include: {
            penugasan_mengajar: {
              include: {
                mata_pelajaran: true,
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

    const assIds = publishedAssessments.map((pa) => pa.asesmen_id);
    const studentGrades =
      assIds.length > 0
        ? await prisma.nilaiSiswa.findMany({
            where: {
              asesmen_id: { in: assIds },
              siswa_id: siswaId,
            },
          })
        : [];

    let assessedCount = 0;
    let sumNilai = 0;
    let tuntasCount = 0;
    let belumTuntasCount = 0;

    const nilaiBreakdown = publishedAssessments.map((pa) => {
      const g = studentGrades.find((gr) => gr.asesmen_id === pa.asesmen_id);
      const val = g?.nilai_angka ?? null;
      const kktp = pa.asesmen.kkm_kktp;
      const isAssessed = val !== null;
      if (isAssessed) {
        assessedCount++;
        sumNilai += val;
        if (val >= kktp) tuntasCount++;
        else belumTuntasCount++;
      }

      return {
        asesmen_id: pa.asesmen_id,
        judul: pa.asesmen.judul,
        mata_pelajaran: pa.asesmen.penugasan_mengajar.mata_pelajaran.nama,
        kategori: pa.asesmen.kategori,
        kktp: kktp,
        nilai_angka: val,
        apakah_tuntas: isAssessed ? val >= kktp : false,
        catatan: g?.catatan || null,
      };
    });

    const rerataNilai = assessedCount > 0 ? Math.round((sumNilai / assessedCount) * 10) / 10 : null;
    const kktpPersen = assessedCount > 0 ? Math.round((tuntasCount / assessedCount) * 100) : 100;

    // 4. Catatan & Follow-ups
    const rawNotes = await prisma.catatanMonitoring.findMany({
      where: {
        siswa_id: siswaId,
        rombel_id: rombelId,
        sekolah_id: sekolahId,
      },
      include: {
        penulis: {
          select: { id: true, nama_lengkap: true, peran_dasar: true },
        },
        tindak_lanjut: {
          include: {
            penanggung_jawab: {
              select: { id: true, nama_lengkap: true },
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const catatanList: CatatanMonitoringItem[] = rawNotes.map((n) => ({
      id: n.id,
      sekolah_id: n.sekolah_id,
      rombel_id: n.rombel_id,
      siswa_id: n.siswa_id,
      siswa_nama: siswa.nama_lengkap,
      siswa_nis: siswa.nis,
      penulis_id: n.penulis_id,
      penulis_nama: n.penulis.nama_lengkap,
      penulis_peran: n.penulis.peran_dasar,
      judul: n.judul,
      isi: n.isi,
      kategori: n.kategori as KategoriCatatan,
      tingkat_urgensi: n.tingkat_urgensi as TingkatUrgensi,
      status: n.status as StatusCatatan,
      created_at: n.created_at,
      updated_at: n.updated_at,
      tindak_lanjut: n.tindak_lanjut.map((tl) => ({
        id: tl.id,
        catatan_id: tl.catatan_id,
        penanggung_jawab_id: tl.penanggung_jawab_id,
        penanggung_jawab_nama: tl.penanggung_jawab?.nama_lengkap || null,
        tindakan: tl.tindakan,
        target_tanggal: tl.target_tanggal,
        status: tl.status as StatusTindakLanjut,
        hasil: tl.hasil,
        tanggal_penyelesaian: tl.tanggal_penyelesaian,
        created_at: tl.created_at,
        updated_at: tl.updated_at,
      })),
    }));

    // Status Perhatian
    const rekomendasi: string[] = [];
    if (alpha >= 1) rekomendasi.push(`${alpha} sesi Alpha`);
    if (presensiPersen < 80 && totalRecorded >= 3) rekomendasi.push(`Kehadiran ${presensiPersen}%`);
    if (belumMengumpulkan >= 1) rekomendasi.push(`${belumMengumpulkan} tugas belum dikumpulkan`);
    if (belumTuntasCount >= 1) rekomendasi.push(`${belumTuntasCount} asesmen di bawah KKTP`);

    let statusPerhatian: StatusPerhatian = "NORMAL";
    if (
      alpha >= 3 ||
      (presensiPersen < 75 && totalRecorded >= 3) ||
      belumMengumpulkan >= 3 ||
      belumTuntasCount >= 3
    ) {
      statusPerhatian = "KRITIS";
    } else if (
      alpha >= 1 ||
      (presensiPersen < 85 && totalRecorded >= 3) ||
      belumMengumpulkan >= 1 ||
      belumTuntasCount >= 1
    ) {
      statusPerhatian = "PERHATIAN";
    } else if (
      rerataNilai !== null &&
      rerataNilai >= 85 &&
      presensiPersen === 100 &&
      belumMengumpulkan === 0
    ) {
      statusPerhatian = "BERPRESTASI";
    }

    return {
      siswa: {
        id: siswa.id,
        nis: siswa.nis,
        nisn: siswa.nisn,
        nama_lengkap: siswa.nama_lengkap,
        jenis_kelamin: siswa.jenis_kelamin,
        foto_url: siswa.foto_url,
        status_akademik: siswa.status_akademik,
        nama_wali: siswa.nama_wali,
        telepon_wali: siswa.telepon_wali,
      },
      rombel: {
        id: rombel.id,
        nama: rombel.nama,
      },
      status_perhatian: statusPerhatian,
      rekomendasi_perhatian: rekomendasi,
      presensi: {
        total_sesi: totalRecorded || sessionAttendances.length,
        hadir,
        izin,
        sakit,
        alpha,
        dispensasi,
        terlambat,
        persentase_kehadiran: presensiPersen,
      },
      presensi_breakdown: presensiBreakdown,
      tugas: {
        total_tugas: publishedTasks.length,
        dikumpulkan: dikumpulkanCount,
        tepat_waktu: tepatWaktu,
        terlambat: terlambatKumpul,
        belum_mengumpulkan: belumMengumpulkan,
        persentase_tuntas: tugasPersen,
      },
      tugas_breakdown: tugasBreakdown,
      nilai: {
        total_asesmen: publishedAssessments.length,
        dinilai: assessedCount,
        rerata_nilai: rerataNilai,
        jumlah_tuntas_kktp: tuntasCount,
        jumlah_belum_tuntas: belumTuntasCount,
        persentase_kktp: kktpPersen,
      },
      nilai_breakdown: nilaiBreakdown,
      catatan_list: catatanList,
    };
  }

  /**
   * Membuat Catatan Monitoring Pembinaan Siswa Baru
   */
  static async createMonitoringNote(
    input: CreateMonitoringNoteInput
  ): Promise<CatatanMonitoringItem> {
    const noteId = generateUlid();

    const result = await prisma.$transaction(async (tx) => {
      const note = await tx.catatanMonitoring.create({
        data: {
          id: noteId,
          sekolah_id: input.sekolah_id,
          rombel_id: input.rombel_id,
          siswa_id: input.siswa_id,
          penulis_id: input.penulis_id,
          judul: input.judul.trim(),
          isi: input.isi.trim(),
          kategori: input.kategori || "AKADEMIK",
          tingkat_urgensi: input.tingkat_urgensi || "SEDANG",
          status: "AKTIF",
        },
        include: {
          penulis: {
            select: { id: true, nama_lengkap: true, peran_dasar: true },
          },
          siswa: {
            select: { id: true, nama_lengkap: true, nis: true },
          },
        },
      });

      let followUp: TindakLanjutItem | null = null;
      if (input.tindak_lanjut_awal && input.tindak_lanjut_awal.tindakan.trim()) {
        const followUpId = generateUlid();
        const createdTl = await tx.tindakLanjutMonitoring.create({
          data: {
            id: followUpId,
            catatan_id: noteId,
            penanggung_jawab_id: input.tindak_lanjut_awal.penanggung_jawab_id || input.penulis_id,
            tindakan: input.tindak_lanjut_awal.tindakan.trim(),
            target_tanggal: input.tindak_lanjut_awal.target_tanggal || null,
            status: "DIRENCANAKAN",
          },
          include: {
            penanggung_jawab: {
              select: { id: true, nama_lengkap: true },
            },
          },
        });

        followUp = {
          id: createdTl.id,
          catatan_id: createdTl.catatan_id,
          penanggung_jawab_id: createdTl.penanggung_jawab_id,
          penanggung_jawab_nama: createdTl.penanggung_jawab?.nama_lengkap || null,
          tindakan: createdTl.tindakan,
          target_tanggal: createdTl.target_tanggal,
          status: createdTl.status as StatusTindakLanjut,
          hasil: createdTl.hasil,
          tanggal_penyelesaian: createdTl.tanggal_penyelesaian,
          created_at: createdTl.created_at,
          updated_at: createdTl.updated_at,
        };
      }

      return { note, followUp };
    });

    return {
      id: result.note.id,
      sekolah_id: result.note.sekolah_id,
      rombel_id: result.note.rombel_id,
      siswa_id: result.note.siswa_id,
      siswa_nama: result.note.siswa.nama_lengkap,
      siswa_nis: result.note.siswa.nis,
      penulis_id: result.note.penulis_id,
      penulis_nama: result.note.penulis.nama_lengkap,
      penulis_peran: result.note.penulis.peran_dasar,
      judul: result.note.judul,
      isi: result.note.isi,
      kategori: result.note.kategori as KategoriCatatan,
      tingkat_urgensi: result.note.tingkat_urgensi as TingkatUrgensi,
      status: result.note.status as StatusCatatan,
      created_at: result.note.created_at,
      updated_at: result.note.updated_at,
      tindak_lanjut: result.followUp ? [result.followUp] : [],
    };
  }

  /**
   * Mengupdate Catatan Monitoring
   */
  static async updateMonitoringNote(
    id: string,
    input: UpdateMonitoringNoteInput,
    sekolahId?: string
  ): Promise<CatatanMonitoringItem> {
    const existing = await prisma.catatanMonitoring.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
      select: { id: true },
    });

    if (!existing) {
      throw new MonitoringNoteNotFoundError(
        `Catatan monitoring dengan ID ${id} tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    const updated = await prisma.catatanMonitoring.update({
      where: { id },
      data: {
        ...(input.judul && { judul: input.judul.trim() }),
        ...(input.isi && { isi: input.isi.trim() }),
        ...(input.kategori && { kategori: input.kategori }),
        ...(input.tingkat_urgensi && { tingkat_urgensi: input.tingkat_urgensi }),
        ...(input.status && { status: input.status }),
      },
      include: {
        penulis: {
          select: { id: true, nama_lengkap: true, peran_dasar: true },
        },
        siswa: {
          select: { id: true, nama_lengkap: true, nis: true },
        },
        tindak_lanjut: {
          include: {
            penanggung_jawab: {
              select: { id: true, nama_lengkap: true },
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
    });

    return {
      id: updated.id,
      sekolah_id: updated.sekolah_id,
      rombel_id: updated.rombel_id,
      siswa_id: updated.siswa_id,
      siswa_nama: updated.siswa.nama_lengkap,
      siswa_nis: updated.siswa.nis,
      penulis_id: updated.penulis_id,
      penulis_nama: updated.penulis.nama_lengkap,
      penulis_peran: updated.penulis.peran_dasar,
      judul: updated.judul,
      isi: updated.isi,
      kategori: updated.kategori as KategoriCatatan,
      tingkat_urgensi: updated.tingkat_urgensi as TingkatUrgensi,
      status: updated.status as StatusCatatan,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      tindak_lanjut: updated.tindak_lanjut.map((tl) => ({
        id: tl.id,
        catatan_id: tl.catatan_id,
        penanggung_jawab_id: tl.penanggung_jawab_id,
        penanggung_jawab_nama: tl.penanggung_jawab?.nama_lengkap || null,
        tindakan: tl.tindakan,
        target_tanggal: tl.target_tanggal,
        status: tl.status as StatusTindakLanjut,
        hasil: tl.hasil,
        tanggal_penyelesaian: tl.tanggal_penyelesaian,
        created_at: tl.created_at,
        updated_at: tl.updated_at,
      })),
    };
  }

  /**
   * Menambahkan Tindak Lanjut pada Catatan Monitoring
   */
  static async createFollowUp(input: CreateFollowUpInput): Promise<TindakLanjutItem> {
    const existing = await prisma.catatanMonitoring.findUnique({
      where: { id: input.catatan_id },
    });

    if (!existing) {
      throw new MonitoringNoteNotFoundError(
        `Catatan monitoring dengan ID ${input.catatan_id} tidak ditemukan.`
      );
    }

    const followUpId = generateUlid();
    const created = await prisma.tindakLanjutMonitoring.create({
      data: {
        id: followUpId,
        catatan_id: input.catatan_id,
        penanggung_jawab_id: input.penanggung_jawab_id || null,
        tindakan: input.tindakan.trim(),
        target_tanggal: input.target_tanggal || null,
        status: "DIRENCANAKAN",
      },
      include: {
        penanggung_jawab: {
          select: { id: true, nama_lengkap: true },
        },
      },
    });

    return {
      id: created.id,
      catatan_id: created.catatan_id,
      penanggung_jawab_id: created.penanggung_jawab_id,
      penanggung_jawab_nama: created.penanggung_jawab?.nama_lengkap || null,
      tindakan: created.tindakan,
      target_tanggal: created.target_tanggal,
      status: created.status as StatusTindakLanjut,
      hasil: created.hasil,
      tanggal_penyelesaian: created.tanggal_penyelesaian,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  /**
   * Mengupdate Status Tindak Lanjut
   */
  static async updateFollowUpStatus(
    input: UpdateFollowUpStatusInput,
    sekolahId?: string
  ): Promise<TindakLanjutItem> {
    const existing = await prisma.tindakLanjutMonitoring.findFirst({
      where: {
        id: input.id,
        ...(sekolahId ? { catatan: { sekolah_id: sekolahId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      throw new FollowUpNotFoundError(
        `Tindak lanjut monitoring dengan ID ${input.id} tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    const updated = await prisma.tindakLanjutMonitoring.update({
      where: { id: input.id },
      data: {
        status: input.status,
        ...(input.hasil !== undefined && { hasil: input.hasil }),
        ...(input.tanggal_penyelesaian !== undefined && {
          tanggal_penyelesaian: input.tanggal_penyelesaian,
        }),
      },
      include: {
        penanggung_jawab: {
          select: { id: true, nama_lengkap: true },
        },
      },
    });

    return {
      id: updated.id,
      catatan_id: updated.catatan_id,
      penanggung_jawab_id: updated.penanggung_jawab_id,
      penanggung_jawab_nama: updated.penanggung_jawab?.nama_lengkap || null,
      tindakan: updated.tindakan,
      target_tanggal: updated.target_tanggal,
      status: updated.status as StatusTindakLanjut,
      hasil: updated.hasil,
      tanggal_penyelesaian: updated.tanggal_penyelesaian,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }
}
