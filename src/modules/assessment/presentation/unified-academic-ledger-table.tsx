"use client";

/**
 * Ruang Pintar — Unified Academic Ledger Table (Buku Nilai & Presensi Terpadu)
 * Academic Glass UI v1.2 / Kurikulum Merdeka
 *
 * Mengimplementasikan struktur Leger Buku Nilai & Absensi Guru Nyata:
 * - Header Multi-Tier:
 *   [Identitas Siswa (No | NIS/NISN | Nama Siswa)]
 *   [Kehadiran (H | S | I | A | %)]
 *   [FORMATIF (Lingkup Materi 1 [TP1, TP2...], Lingkup Materi 2 [TP1...]) - TP dinamis per LM]
 *   [SUMATIF LINGKUP MATERI (LM1, LM2...)]
 *   [SUMATIF AKHIR SEMESTER (SAS)]
 *   [REKAPITULASI NILAI AKHIR (Rerata Formatif | Rerata Sumatif | Nilai Akhir | Ketuntasan)]
 *
 * Invariant:
 * - Missing Grade ≠ Zero Grade (nilai kosong ditampilkan "-", bukan 0)
 * - TP dinamis per Lingkup Materi (tidak selalu 5 TP per LM)
 * - Sticky freeze columns untuk No, NIS/NISN, Nama Siswa
 * - Ekspor CSV Lengkap & Cetak A4 Landscape
 */

import React, { useState, useMemo, useTransition } from "react";
import {
  Download,
  Printer,
  Search,
  Filter,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  HelpCircle,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  ClassGradebookDTO,
  DefinisiAsesmenDTO,
  GradebookColumnDTO,
} from "../domain/assessment-types";
import { ClassAttendanceRecapDTO } from "@/modules/attendance/domain/attendance-types";
import { exportGradebookExcelAction } from "@/app/actions/assessment-actions";

export interface UnifiedLedgerColumn {
  id: string; // unique key for col
  assessmentId?: string | null;
  tpId?: string | null;
  lmId?: string | null;
  kategori: "FORMATIF" | "SUMATIF" | "SUMATIF_AKHIR";
  title: string;
  fullTitle: string;
  subTitle?: string;
  tooltip?: string;
  kkm: number;
  bobot: number;
  isPlaceholder?: boolean;
}

export interface UnifiedLedgerLmGroup {
  lmId: string;
  judul: string;
  kode?: string | null;
  columns: UnifiedLedgerColumn[];
}

interface UnifiedAcademicLedgerTableProps {
  penugasanId: string;
  canManage: boolean;
  gradebook: ClassGradebookDTO;
  lingkupMateriList: Array<{
    id: string;
    judul: string;
    kode?: string | null;
    urutan?: number;
    tujuan_pembelajaran: Array<{
      id: string;
      kode?: string | null;
      deskripsi: string;
      urutan?: number;
    }>;
  }>;
  assessments: DefinisiAsesmenDTO[];
  attendanceRecap?: ClassAttendanceRecapDTO | null;
  onOpenInputGrades?: (asesmenId: string) => void;
  onOpenCreateAssessment?: (tpId?: string, lmId?: string) => void;
}

export function UnifiedAcademicLedgerTable({
  penugasanId,
  canManage,
  gradebook,
  lingkupMateriList,
  assessments,
  attendanceRecap,
  onOpenInputGrades,
  onOpenCreateAssessment,
}: UnifiedAcademicLedgerTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "TUNTAS" | "BELUM_TUNTAS" | "ATTENTION">(
    "ALL"
  );

  // 1. Susun Kolom Formatif (Dikelompokkan per Lingkup Materi, dengan TP dinamis)
  const { formatifGroups, allFormatifColumns } = useMemo(() => {
    const groups: UnifiedLedgerLmGroup[] = [];
    const allCols: UnifiedLedgerColumn[] = [];

    // Jika ada Lingkup Materi yang sudah dibuat
    if (lingkupMateriList && lingkupMateriList.length > 0) {
      lingkupMateriList.forEach((lm, lmIdx) => {
        const lmCols: UnifiedLedgerColumn[] = [];
        const lmNumber = lmIdx + 1;
        const lmKode = lm.kode || `LM ${lmNumber}`;

        // Asesmen formatif yang terikat ke LM ini
        const formatifAssessmentsInLm = assessments.filter(
          (a) => a.lingkup_materi_id === lm.id && a.kategori === "FORMATIF"
        );

        if (lm.tujuan_pembelajaran && lm.tujuan_pembelajaran.length > 0) {
          // Buat kolom untuk setiap TP dalam LM ini (Dinamis! Tidak selalu 5 TP)
          lm.tujuan_pembelajaran.forEach((tp, tpIdx) => {
            const tpNumber = tpIdx + 1;
            const tpKode = tp.kode || `TP ${tpNumber}`;

            // Cari apakah ada asesmen yang dibuat khusus untuk TP ini
            const matchedAssessment = formatifAssessmentsInLm.find((a) => a.tp_id === tp.id);

            const col: UnifiedLedgerColumn = {
              id: `col_formatif_${lm.id}_${tp.id}`,
              assessmentId: matchedAssessment?.id || null,
              tpId: tp.id,
              lmId: lm.id,
              kategori: "FORMATIF",
              title: tpKode,
              fullTitle: `${tpKode} (${lmKode})`,
              subTitle: `KKTP: ${matchedAssessment?.kkm_kktp || gradebook.kkm_default}`,
              tooltip:
                tp.deskripsi || matchedAssessment?.judul || `Tujuan Pembelajaran ${tpNumber}`,
              kkm: matchedAssessment?.kkm_kktp || gradebook.kkm_default,
              bobot: matchedAssessment?.bobot || 1,
              isPlaceholder: !matchedAssessment,
            };

            lmCols.push(col);
            allCols.push(col);
          });

          // Asesmen formatif di LM ini yang tidak memilih TP spesifik
          formatifAssessmentsInLm
            .filter((a) => !a.tp_id || !lm.tujuan_pembelajaran.some((tp) => tp.id === a.tp_id))
            .forEach((a, extraIdx) => {
              const col: UnifiedLedgerColumn = {
                id: `col_formatif_extra_${a.id}`,
                assessmentId: a.id,
                lmId: lm.id,
                kategori: "FORMATIF",
                title: a.tp_kode || `F-${extraIdx + 1}`,
                fullTitle: a.judul,
                subTitle: `KKTP: ${a.kkm_kktp}`,
                tooltip: a.judul,
                kkm: a.kkm_kktp,
                bobot: a.bobot,
                isPlaceholder: false,
              };
              lmCols.push(col);
              allCols.push(col);
            });
        } else {
          // Jika LM belum memiliki TP yang didefinisikan
          if (formatifAssessmentsInLm.length > 0) {
            formatifAssessmentsInLm.forEach((a, aIdx) => {
              const col: UnifiedLedgerColumn = {
                id: `col_formatif_asm_${a.id}`,
                assessmentId: a.id,
                lmId: lm.id,
                kategori: "FORMATIF",
                title: a.tp_kode || `TP ${aIdx + 1}`,
                fullTitle: a.judul,
                subTitle: `KKTP: ${a.kkm_kktp}`,
                tooltip: a.judul,
                kkm: a.kkm_kktp,
                bobot: a.bobot,
                isPlaceholder: false,
              };
              lmCols.push(col);
              allCols.push(col);
            });
          } else {
            // Placeholder kolom TP 1 agar tabel tetap berstruktur
            const col: UnifiedLedgerColumn = {
              id: `col_formatif_placeholder_${lm.id}`,
              assessmentId: null,
              lmId: lm.id,
              kategori: "FORMATIF",
              title: "TP 1",
              fullTitle: `TP 1 (${lm.judul})`,
              subTitle: `KKTP: ${gradebook.kkm_default}`,
              tooltip: `Belum ada TP dibuat di ${lm.judul}`,
              kkm: gradebook.kkm_default,
              bobot: 1,
              isPlaceholder: true,
            };
            lmCols.push(col);
            allCols.push(col);
          }
        }

        groups.push({
          lmId: lm.id,
          judul: lm.judul,
          kode: lm.kode || `Lingkup Materi ${lmNumber}`,
          columns: lmCols,
        });
      });

      // Asesmen formatif umum (tidak terikat ke LM manapun)
      const unlinkedFormatif = assessments.filter(
        (a) => !a.lingkup_materi_id && a.kategori === "FORMATIF"
      );
      if (unlinkedFormatif.length > 0) {
        const extraCols: UnifiedLedgerColumn[] = unlinkedFormatif.map((a, idx) => ({
          id: `col_formatif_unlinked_${a.id}`,
          assessmentId: a.id,
          kategori: "FORMATIF",
          title: a.tp_kode || `TP ${idx + 1}`,
          fullTitle: a.judul,
          subTitle: `KKTP: ${a.kkm_kktp}`,
          tooltip: a.judul,
          kkm: a.kkm_kktp,
          bobot: a.bobot,
          isPlaceholder: false,
        }));
        groups.push({
          lmId: "unlinked",
          judul: "Formatif Lainnya",
          kode: "Formatif Umum",
          columns: extraCols,
        });
        allCols.push(...extraCols);
      }
    } else {
      // Fallback jika belum ada Lingkup Materi sama sekali
      const formatifAssessments = assessments.filter((a) => a.kategori === "FORMATIF");
      if (formatifAssessments.length > 0) {
        const cols = formatifAssessments.map((a, idx) => ({
          id: `col_formatif_raw_${a.id}`,
          assessmentId: a.id,
          kategori: "FORMATIF" as const,
          title: a.tp_kode || `TP ${idx + 1}`,
          fullTitle: a.judul,
          subTitle: `KKTP: ${a.kkm_kktp}`,
          tooltip: a.judul,
          kkm: a.kkm_kktp,
          bobot: a.bobot,
          isPlaceholder: false,
        }));
        groups.push({
          lmId: "default",
          judul: "Lingkup Materi 1",
          kode: "LM 1",
          columns: cols,
        });
        allCols.push(...cols);
      } else {
        // Default 2 placeholder TP
        const p1: UnifiedLedgerColumn = {
          id: "col_f_p1",
          assessmentId: null,
          kategori: "FORMATIF",
          title: "TP 1",
          fullTitle: "Tujuan Pembelajaran 1",
          subTitle: `KKTP: ${gradebook.kkm_default}`,
          tooltip: "Belum ada asesmen formatif",
          kkm: gradebook.kkm_default,
          bobot: 1,
          isPlaceholder: true,
        };
        const p2: UnifiedLedgerColumn = {
          id: "col_f_p2",
          assessmentId: null,
          kategori: "FORMATIF",
          title: "TP 2",
          fullTitle: "Tujuan Pembelajaran 2",
          subTitle: `KKTP: ${gradebook.kkm_default}`,
          tooltip: "Belum ada asesmen formatif",
          kkm: gradebook.kkm_default,
          bobot: 1,
          isPlaceholder: true,
        };
        groups.push({
          lmId: "default",
          judul: "Lingkup Materi 1",
          kode: "LM 1",
          columns: [p1, p2],
        });
        allCols.push(p1, p2);
      }
    }

    return { formatifGroups: groups, allFormatifColumns: allCols };
  }, [lingkupMateriList, assessments, gradebook.kkm_default]);

  // 2. Susun Kolom Sumatif Lingkup Materi (SLM)
  const sumatifLmColumns = useMemo(() => {
    const cols: UnifiedLedgerColumn[] = [];

    if (lingkupMateriList && lingkupMateriList.length > 0) {
      lingkupMateriList.forEach((lm, lmIdx) => {
        const lmNumber = lmIdx + 1;
        const matched = assessments.find(
          (a) => a.lingkup_materi_id === lm.id && a.kategori === "SUMATIF"
        );

        cols.push({
          id: `col_slm_${lm.id}`,
          assessmentId: matched?.id || null,
          lmId: lm.id,
          kategori: "SUMATIF",
          title: `LM ${lmNumber}`,
          fullTitle: matched?.judul || `Sumatif LM ${lmNumber} (${lm.judul})`,
          subTitle: `KKTP: ${matched?.kkm_kktp || gradebook.kkm_default}`,
          tooltip: matched?.judul || `Sumatif untuk ${lm.judul}`,
          kkm: matched?.kkm_kktp || gradebook.kkm_default,
          bobot: matched?.bobot || 1,
          isPlaceholder: !matched,
        });
      });

      // Sumatif lain yang tidak terikat ke LM
      assessments
        .filter(
          (a) =>
            a.kategori === "SUMATIF" &&
            (!a.lingkup_materi_id || !lingkupMateriList.some((lm) => lm.id === a.lingkup_materi_id))
        )
        .forEach((a, extraIdx) => {
          cols.push({
            id: `col_slm_extra_${a.id}`,
            assessmentId: a.id,
            kategori: "SUMATIF",
            title: `S-${extraIdx + 1}`,
            fullTitle: a.judul,
            subTitle: `KKTP: ${a.kkm_kktp}`,
            tooltip: a.judul,
            kkm: a.kkm_kktp,
            bobot: a.bobot,
            isPlaceholder: false,
          });
        });
    } else {
      const sumatifAssessments = assessments.filter((a) => a.kategori === "SUMATIF");
      if (sumatifAssessments.length > 0) {
        sumatifAssessments.forEach((a, idx) => {
          cols.push({
            id: `col_slm_raw_${a.id}`,
            assessmentId: a.id,
            kategori: "SUMATIF",
            title: `LM ${idx + 1}`,
            fullTitle: a.judul,
            subTitle: `KKTP: ${a.kkm_kktp}`,
            tooltip: a.judul,
            kkm: a.kkm_kktp,
            bobot: a.bobot,
            isPlaceholder: false,
          });
        });
      } else {
        cols.push({
          id: "col_slm_placeholder",
          assessmentId: null,
          kategori: "SUMATIF",
          title: "LM 1",
          fullTitle: "Sumatif Lingkup Materi 1",
          subTitle: `KKTP: ${gradebook.kkm_default}`,
          tooltip: "Belum ada asesmen sumatif lingkup materi",
          kkm: gradebook.kkm_default,
          bobot: 1,
          isPlaceholder: true,
        });
      }
    }

    return cols;
  }, [lingkupMateriList, assessments, gradebook.kkm_default]);

  // 3. Susun Kolom Sumatif Akhir Semester (SAS / AS)
  const sasColumns = useMemo(() => {
    const cols: UnifiedLedgerColumn[] = [];
    const sasAssessments = assessments.filter((a) => a.kategori === "SUMATIF_AKHIR");

    if (sasAssessments.length > 0) {
      sasAssessments.forEach((a) => {
        cols.push({
          id: `col_sas_${a.id}`,
          assessmentId: a.id,
          kategori: "SUMATIF_AKHIR",
          title: "SAS",
          fullTitle: a.judul,
          subTitle: `KKTP: ${a.kkm_kktp}`,
          tooltip: a.judul,
          kkm: a.kkm_kktp,
          bobot: a.bobot,
          isPlaceholder: false,
        });
      });
    } else {
      cols.push({
        id: "col_sas_placeholder",
        assessmentId: null,
        kategori: "SUMATIF_AKHIR",
        title: "SAS",
        fullTitle: "Sumatif Akhir Semester",
        subTitle: `KKTP: ${gradebook.kkm_default}`,
        tooltip: "Belum ada asesmen sumatif akhir semester",
        kkm: gradebook.kkm_default,
        bobot: 1,
        isPlaceholder: true,
      });
    }

    return cols;
  }, [assessments, gradebook.kkm_default]);

  // 4. Map Presensi Siswa dari Attendance Recap
  const studentAttendanceMap = useMemo(() => {
    const map = new Map<
      string,
      {
        hadir: number;
        sakit: number;
        izin: number;
        alpha: number;
        persen: number;
        status_evaluasi: string;
      }
    >();

    if (attendanceRecap && attendanceRecap.daftar_siswa) {
      attendanceRecap.daftar_siswa.forEach((s) => {
        map.set(s.siswa_id, {
          hadir: s.hadir,
          sakit: s.sakit,
          izin: s.izin,
          alpha: s.alpha,
          persen: s.persentase_kehadiran,
          status_evaluasi: s.status_evaluasi,
        });
      });
    }

    return map;
  }, [attendanceRecap]);

  // 5. Filter Siswa berdasarkan Search & Status Ketuntasan
  const filteredRows = useMemo(() => {
    return gradebook.rows.filter((row) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        row.nama_lengkap.toLowerCase().includes(q) ||
        (row.nis && row.nis.toLowerCase().includes(q)) ||
        (row.nisn && row.nisn.toLowerCase().includes(q));

      if (!matchSearch) return false;

      const att = studentAttendanceMap.get(row.siswa_id);
      const isLulus = row.nilai_akhir !== null && row.nilai_akhir >= gradebook.kkm_default;

      if (statusFilter === "TUNTAS") {
        return isLulus;
      }
      if (statusFilter === "BELUM_TUNTAS") {
        return row.nilai_akhir !== null && !isLulus;
      }
      if (statusFilter === "ATTENTION") {
        const hasLowAttendance = att ? att.alpha > 0 || att.persen < 75 : false;
        const isNotPassing = row.nilai_akhir !== null && !isLulus;
        return hasLowAttendance || isNotPassing;
      }

      return true;
    });
  }, [gradebook.rows, searchQuery, statusFilter, studentAttendanceMap, gradebook.kkm_default]);

  // 6. Hitung Statistik Rerata Kolom (Footer Averages)
  const columnStats = useMemo(() => {
    const calcAvg = (colId: string, assessmentId?: string | null) => {
      if (!assessmentId) return null;
      let sum = 0;
      let count = 0;
      gradebook.rows.forEach((r) => {
        const val = r.grades[assessmentId]?.nilai_angka;
        if (val !== null && val !== undefined) {
          sum += val;
          count++;
        }
      });
      return count > 0 ? Number((sum / count).toFixed(1)) : null;
    };

    const formatifAverages: Record<string, number | null> = {};
    allFormatifColumns.forEach((col) => {
      formatifAverages[col.id] = calcAvg(col.id, col.assessmentId);
    });

    const sumatifLmAverages: Record<string, number | null> = {};
    sumatifLmColumns.forEach((col) => {
      sumatifLmAverages[col.id] = calcAvg(col.id, col.assessmentId);
    });

    const sasAverages: Record<string, number | null> = {};
    sasColumns.forEach((col) => {
      sasAverages[col.id] = calcAvg(col.id, col.assessmentId);
    });

    // Kehadiran total
    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpha = 0;
    let sumPersen = 0;
    let countAtt = 0;

    gradebook.rows.forEach((r) => {
      const att = studentAttendanceMap.get(r.siswa_id);
      if (att) {
        totalHadir += att.hadir;
        totalSakit += att.sakit;
        totalIzin += att.izin;
        totalAlpha += att.alpha;
        sumPersen += att.persen;
        countAtt++;
      }
    });

    const avgPersenKehadiran = countAtt > 0 ? Math.round(sumPersen / countAtt) : 100;

    return {
      formatifAverages,
      sumatifLmAverages,
      sasAverages,
      attendanceTotals: {
        hadir: totalHadir,
        sakit: totalSakit,
        izin: totalIzin,
        alpha: totalAlpha,
        rerataPersen: avgPersenKehadiran,
      },
    };
  }, [allFormatifColumns, sumatifLmColumns, sasColumns, gradebook.rows, studentAttendanceMap]);

  // 7. Handler Ekspor CSV Leger
  const handleExportCsv = () => {
    const csvHeaderRow1 = [
      "No",
      "No. Absen",
      "NIS",
      "NISN",
      "Nama Siswa",
      "Hadir (H)",
      "Sakit (S)",
      "Izin (I)",
      "Alpha (A)",
      "Kehadiran (%)",
      ...allFormatifColumns.map((c) => `Formatif: ${c.fullTitle}`),
      ...sumatifLmColumns.map((c) => `Sumatif LM: ${c.fullTitle}`),
      ...sasColumns.map((c) => `SAS: ${c.fullTitle}`),
      "Rerata Formatif",
      "Rerata Sumatif",
      "Nilai Akhir",
      "Ketuntasan",
    ];

    const csvRows = filteredRows.map((row, idx) => {
      const att = studentAttendanceMap.get(row.siswa_id) || {
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpha: 0,
        persen: 100,
      };

      const formatifScores = allFormatifColumns.map((col) => {
        if (!col.assessmentId) return "";
        const score = row.grades[col.assessmentId]?.nilai_angka;
        return score !== null && score !== undefined ? score : "";
      });

      const sumatifLmScores = sumatifLmColumns.map((col) => {
        if (!col.assessmentId) return "";
        const score = row.grades[col.assessmentId]?.nilai_angka;
        return score !== null && score !== undefined ? score : "";
      });

      const sasScores = sasColumns.map((col) => {
        if (!col.assessmentId) return "";
        const score = row.grades[col.assessmentId]?.nilai_angka;
        return score !== null && score !== undefined ? score : "";
      });

      const isLulus = row.nilai_akhir !== null && row.nilai_akhir >= gradebook.kkm_default;

      return [
        idx + 1,
        row.nomor_absen || idx + 1,
        row.nis ? `="${row.nis}"` : '=""',
        row.nisn ? `="${row.nisn}"` : '=""',
        `"${row.nama_lengkap.replace(/"/g, '""')}"`,
        att.hadir,
        att.sakit,
        att.izin,
        att.alpha,
        `${att.persen}%`,
        ...formatifScores,
        ...sumatifLmScores,
        ...sasScores,
        row.rata_rata_formatif ?? "",
        row.rata_rata_sumatif ?? "",
        row.nilai_akhir ?? "",
        row.nilai_akhir !== null ? (isLulus ? "TUNTAS" : "BELUM TUNTAS") : "BELUM LENGKAP",
      ].join(",");
    });

    const csvContent = [csvHeaderRow1.join(","), ...csvRows].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Leger_Nilai_Presensi_${gradebook.rombel_nama.replace(/\s+/g, "_")}_${gradebook.mata_pelajaran_nama.replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 7b. Handler Ekspor Excel (.xlsx) Resmi (Multi-Sheet, Rumus & Rubrik)
  const [isExportingExcel, startExportExcelTransition] = useTransition();

  const handleExportExcel = () => {
    startExportExcelTransition(async () => {
      try {
        const res = await exportGradebookExcelAction(penugasanId);
        if (res.success && res.data) {
          const binaryString = window.atob(res.data.base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes.buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = res.data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          alert(res.message || "Gagal mengunduh file Excel.");
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Terjadi kesalahan saat mengunduh berkas Excel.";
        alert(msg);
      }
    });
  };

  // 8. Cetak A4 Landscape
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Action Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-2xs print:hidden">
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Siswa, NIS, NISN..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Semua ({gradebook.rows.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("TUNTAS")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === "TUNTAS"
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400"
              }`}
            >
              Tuntas
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("BELUM_TUNTAS")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === "BELUM_TUNTAS"
                  ? "bg-rose-600 text-white shadow-2xs font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400"
              }`}
            >
              Belum Tuntas
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ATTENTION")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                statusFilter === "ATTENTION"
                  ? "bg-amber-600 text-white shadow-2xs font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400"
              }`}
            >
              Perlu Perhatian
            </button>
          </div>
        </div>

        {/* Right: Export & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Ekspor Excel (.xlsx) Resmi */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Unduh Leger Nilai resmi (.xlsx) sesuai format kurikulum sekolah (dengan rumus & sheet rubrik)"
          >
            {isExportingExcel ? (
              <Loader2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{isExportingExcel ? "Mengunduh..." : "Ekspor Excel (.xlsx)"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Unduh berkas CSV Leger Nilai & Presensi"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Cetak format cetak A4 Landscape"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            <span>Cetak Leger</span>
          </button>

          {canManage && onOpenCreateAssessment && (
            <button
              type="button"
              onClick={() => onOpenCreateAssessment()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Asesmen Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Leger Context Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-300 px-1 print:mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white">{gradebook.rombel_nama}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-slate-700 dark:text-slate-200">{gradebook.mata_pelajaran_nama}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60 font-semibold text-[11px]">
            KKTP Target: {gradebook.kkm_default}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-xs bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700"></span>
            ≥ KKTP
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-xs bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700"></span>
            &lt; KKTP
          </span>
          <span className="italic text-slate-400 dark:text-slate-500">* (-) = Belum Dinilai</span>
        </div>
      </div>

      {/* Table Container with Horizontal Scroll & Sticky Left Columns */}
      <div className="rounded-2xl border border-slate-300/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden print:border-slate-400 print:shadow-none">
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="w-full border-collapse text-left text-xs font-sans">
            {/* ========================================================================= */}
            {/* THE REAL-WORLD 3-TIER KURIKULUM MERDEKA ACADEMIC LEDGER HEADER            */}
            {/* ========================================================================= */}
            <thead className="sticky top-0 z-30 shadow-xs select-none">
              {/* HEADER ROW 1: MAJOR CATEGORIES */}
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                {/* 1. Sticky Identity Columns */}
                <th
                  rowSpan={3}
                  className="py-2 px-2.5 text-center border-r border-slate-300 dark:border-slate-700 sticky left-0 z-40 bg-slate-100 dark:bg-slate-800 w-10 min-w-[40px]"
                >
                  No
                </th>
                <th
                  rowSpan={3}
                  className="py-2 px-3 border-r border-slate-300 dark:border-slate-700 sticky left-[40px] z-40 bg-slate-100 dark:bg-slate-800 w-28 min-w-[110px]"
                >
                  NIS / NISN
                </th>
                <th
                  rowSpan={3}
                  className="py-2 px-3 border-r-2 border-slate-400 dark:border-slate-600 sticky left-[150px] z-40 bg-slate-100 dark:bg-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.04)] dark:shadow-[2px_0_5px_rgba(0,0,0,0.3)] min-w-[180px] max-w-[220px]"
                >
                  Nama Siswa
                </th>

                {/* 2. Kehadiran */}
                <th
                  colSpan={5}
                  className="py-2 px-2 text-center border-r-2 border-slate-400 dark:border-slate-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 font-extrabold"
                >
                  Kehadiran
                </th>

                {/* 3. FORMATIF (Multi-TP grouped by Lingkup Materi) */}
                <th
                  colSpan={Math.max(1, allFormatifColumns.length)}
                  className="py-2 px-3 text-center border-r-2 border-slate-400 dark:border-slate-600 bg-blue-50 dark:bg-blue-950/60 text-blue-950 dark:text-blue-300 font-extrabold"
                >
                  FORMATIF
                </th>

                {/* 4. SUMATIF LINGKUP MATERI */}
                <th
                  colSpan={Math.max(1, sumatifLmColumns.length)}
                  className="py-2 px-3 text-center border-r-2 border-slate-400 dark:border-slate-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-300 font-extrabold"
                >
                  SUMATIF LINGKUP MATERI
                </th>

                {/* 5. SUMATIF AKHIR SEMESTER (SAS) */}
                <th
                  colSpan={Math.max(1, sasColumns.length)}
                  className="py-2 px-2 text-center border-r-2 border-slate-400 dark:border-slate-600 bg-purple-50 dark:bg-purple-950/60 text-purple-950 dark:text-purple-300 font-extrabold"
                >
                  SUMATIF AKHIR
                </th>

                {/* 6. REKAPITULASI NILAI AKHIR */}
                <th
                  colSpan={4}
                  className="py-2 px-3 text-center bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300 font-extrabold"
                >
                  NILAI AKHIR
                </th>
              </tr>

              {/* HEADER ROW 2: SUB-GROUPINGS */}
              <tr className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                {/* Under Kehadiran: H, S, I, A, % */}
                <th
                  rowSpan={2}
                  className="py-1.5 px-1.5 text-center border-r border-slate-200 dark:border-slate-700 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 w-8"
                  title="Hadir"
                >
                  H
                </th>
                <th
                  rowSpan={2}
                  className="py-1.5 px-1.5 text-center border-r border-slate-200 dark:border-slate-700 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 w-8"
                  title="Sakit"
                >
                  S
                </th>
                <th
                  rowSpan={2}
                  className="py-1.5 px-1.5 text-center border-r border-slate-200 dark:border-slate-700 bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 w-8"
                  title="Izin"
                >
                  I
                </th>
                <th
                  rowSpan={2}
                  className="py-1.5 px-1.5 text-center border-r border-slate-200 dark:border-slate-700 bg-rose-50/70 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 w-8"
                  title="Alpha"
                >
                  A
                </th>
                <th
                  rowSpan={2}
                  className="py-1.5 px-1.5 text-center border-r-2 border-slate-400 dark:border-slate-600 bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 w-11"
                  title="Persentase Kehadiran (%)"
                >
                  %
                </th>

                {/* Under FORMATIF: Lingkup Materi Headers with Dynamic Colspan */}
                {formatifGroups.map((grp) => (
                  <th
                    key={grp.lmId}
                    colSpan={grp.columns.length}
                    className="py-1.5 px-2 text-center border-r border-slate-300 dark:border-slate-700 bg-blue-100/50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 font-bold"
                    title={grp.judul}
                  >
                    <div className="truncate max-w-[160px] mx-auto">{grp.kode || grp.judul}</div>
                  </th>
                ))}

                {/* Under SUMATIF LINGKUP MATERI: Columns */}
                {sumatifLmColumns.map((col) => (
                  <th
                    key={col.id}
                    rowSpan={2}
                    className={`py-1.5 px-2 text-center border-r border-slate-300 dark:border-slate-700 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 min-w-[56px] transition-colors ${
                      col.assessmentId && canManage
                        ? "cursor-pointer hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60"
                        : ""
                    }`}
                    onClick={() => {
                      if (col.assessmentId && onOpenInputGrades) {
                        onOpenInputGrades(col.assessmentId);
                      } else if (!col.assessmentId && onOpenCreateAssessment && canManage) {
                        onOpenCreateAssessment(undefined, col.lmId || undefined);
                      }
                    }}
                    title={`${col.fullTitle} — Klik untuk input nilai asesmen`}
                  >
                    <div className="font-extrabold text-[11px]">{col.title}</div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">
                      {col.assessmentId ? `K:${col.kkm}` : "(+)"}
                    </div>
                  </th>
                ))}

                {/* Under SUMATIF AKHIR SEMESTER (SAS) */}
                {sasColumns.map((col) => (
                  <th
                    key={col.id}
                    rowSpan={2}
                    className={`py-1.5 px-2 text-center border-r-2 border-slate-400 dark:border-slate-600 bg-purple-50/60 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 min-w-[56px] transition-colors ${
                      col.assessmentId && canManage
                        ? "cursor-pointer hover:bg-purple-100/80 dark:hover:bg-purple-900/60"
                        : ""
                    }`}
                    onClick={() => {
                      if (col.assessmentId && onOpenInputGrades) {
                        onOpenInputGrades(col.assessmentId);
                      } else if (!col.assessmentId && onOpenCreateAssessment && canManage) {
                        onOpenCreateAssessment();
                      }
                    }}
                    title={`${col.fullTitle} — Klik untuk input nilai SAS`}
                  >
                    <div className="font-extrabold text-[11px]">{col.title}</div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">
                      {col.assessmentId ? `K:${col.kkm}` : "(+)"}
                    </div>
                  </th>
                ))}

                {/* Under REKAPITULASI: R. Formatif, R. Sumatif, Nilai Akhir, Ketuntasan */}
                <th
                  rowSpan={2}
                  className="py-1.5 px-2 text-center border-r border-slate-300 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-950/40 text-slate-700 dark:text-slate-300 w-16"
                  title="Rata-rata Nilai Formatif"
                >
                  R. For
                </th>
                <th
                  rowSpan={2}
                  className="py-1.5 px-2 text-center border-r border-slate-300 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-950/40 text-slate-700 dark:text-slate-300 w-16"
                  title="Rata-rata Nilai Sumatif (SLM & SAS)"
                >
                  R. Sum
                </th>
                <th
                  rowSpan={2}
                  className="py-1.5 px-2 text-center border-r border-slate-300 dark:border-slate-700 bg-blue-100/70 dark:bg-blue-900/50 text-[#2563EB] dark:text-blue-400 font-black w-16 text-[11px]"
                  title="Nilai Akhir Rapor Siswa"
                >
                  NA
                </th>
                <th
                  rowSpan={2}
                  className="py-1.5 px-2 text-center bg-amber-50/50 dark:bg-amber-950/40 text-slate-700 dark:text-slate-300 w-20"
                  title="Status Ketuntasan KKTP"
                >
                  Status
                </th>
              </tr>

              {/* HEADER ROW 3: INDIVIDUAL TP HEADERS UNDER FORMATIF */}
              <tr className="bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                {allFormatifColumns.map((col) => (
                  <th
                    key={col.id}
                    className={`py-1.5 px-1.5 text-center border-r border-slate-200 dark:border-slate-700 min-w-[50px] transition-colors ${
                      col.assessmentId
                        ? "bg-blue-50/40 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 cursor-pointer hover:bg-blue-100/70 dark:hover:bg-blue-900/50"
                        : "bg-slate-50/60 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    onClick={() => {
                      if (col.assessmentId && onOpenInputGrades) {
                        onOpenInputGrades(col.assessmentId);
                      } else if (!col.assessmentId && onOpenCreateAssessment && canManage) {
                        onOpenCreateAssessment(col.tpId || undefined, col.lmId || undefined);
                      }
                    }}
                    title={`${col.fullTitle}: ${col.tooltip} — ${
                      col.assessmentId
                        ? "Klik untuk input nilai"
                        : "Klik untuk buat asesmen pada TP ini"
                    }`}
                  >
                    <div className="font-bold text-slate-800 dark:text-slate-200">{col.title}</div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">
                      {col.assessmentId ? `K:${col.kkm}` : "(+)"}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* ========================================================================= */}
            {/* TABLE BODY: STUDENT ROWS                                                  */}
            {/* ========================================================================= */}
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      3 +
                      5 +
                      allFormatifColumns.length +
                      sumatifLmColumns.length +
                      sasColumns.length +
                      4
                    }
                    className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs"
                  >
                    Tidak ada data siswa yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const att = studentAttendanceMap.get(row.siswa_id) || {
                    hadir: 0,
                    sakit: 0,
                    izin: 0,
                    alpha: 0,
                    persen: 100,
                    status_evaluasi: "Baik",
                  };

                  const isLulus =
                    row.nilai_akhir !== null && row.nilai_akhir >= gradebook.kkm_default;

                  return (
                    <tr
                      key={row.siswa_id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group text-[11px]"
                    >
                      {/* Sticky 1: No */}
                      <td className="py-2 px-2 text-center text-slate-400 dark:text-slate-500 font-mono border-r border-slate-200 dark:border-slate-800 sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850">
                        {row.nomor_absen || idx + 1}
                      </td>

                      {/* Sticky 2: NIS / NISN */}
                      <td className="py-2 px-2.5 font-mono text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 sticky left-[40px] z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{row.nis || "-"}</div>
                        {row.nisn && (
                          <div className="text-[9px] text-slate-400 dark:text-slate-500 tracking-tight">{row.nisn}</div>
                        )}
                      </td>

                      {/* Sticky 3: Nama Siswa */}
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white border-r-2 border-slate-400 dark:border-slate-700 sticky left-[150px] z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850 shadow-[2px_0_5px_rgba(0,0,0,0.04)] dark:shadow-[2px_0_5px_rgba(0,0,0,0.3)] truncate max-w-[220px]">
                        <span title={row.nama_lengkap}>{row.nama_lengkap}</span>
                      </td>

                      {/* Kehadiran: H, S, I, A, % */}
                      <td className="py-2 px-1 text-center font-mono text-emerald-800 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 border-r border-slate-200 dark:border-slate-800">
                        {att.hadir}
                      </td>
                      <td className="py-2 px-1 text-center font-mono text-amber-800 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/20 border-r border-slate-200 dark:border-slate-800">
                        {att.sakit}
                      </td>
                      <td className="py-2 px-1 text-center font-mono text-blue-800 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20 border-r border-slate-200 dark:border-slate-800">
                        {att.izin}
                      </td>
                      <td
                        className={`py-2 px-1 text-center font-mono border-r border-slate-200 dark:border-slate-800 ${
                          att.alpha > 0
                            ? "text-rose-700 dark:text-rose-400 font-bold bg-rose-100/70 dark:bg-rose-950/50"
                            : "text-slate-400 dark:text-slate-600"
                        }`}
                      >
                        {att.alpha}
                      </td>
                      <td
                        className={`py-2 px-1 text-center font-mono font-bold border-r-2 border-slate-400 dark:border-slate-700 ${
                          att.persen < 75
                            ? "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
                            : "text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
                        }`}
                      >
                        {att.persen}%
                      </td>

                      {/* Formatif TP Columns */}
                      {allFormatifColumns.map((col) => {
                        if (!col.assessmentId) {
                          return (
                            <td
                              key={col.id}
                              className="py-2 px-1 text-center font-mono text-slate-300 dark:text-slate-600 border-r border-slate-200 dark:border-slate-800"
                              title="Asesmen belum dibuat untuk TP ini"
                            >
                              -
                            </td>
                          );
                        }

                        const gradeItem = row.grades[col.assessmentId];
                        const score = gradeItem?.nilai_angka;
                        const hasScore = score !== null && score !== undefined;
                        const isAbove = hasScore && score >= col.kkm;

                        return (
                          <td
                            key={col.id}
                            className="py-2 px-1 text-center font-mono border-r border-slate-200 dark:border-slate-800"
                          >
                            {hasScore ? (
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                  isAbove
                                    ? "text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 dark:border dark:border-emerald-800/60"
                                    : "text-rose-800 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/60 dark:border dark:border-rose-800/60 font-black"
                                }`}
                              >
                                {score}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Sumatif Lingkup Materi Columns */}
                      {sumatifLmColumns.map((col) => {
                        if (!col.assessmentId) {
                          return (
                            <td
                              key={col.id}
                              className="py-2 px-1 text-center font-mono text-slate-300 dark:text-slate-600 border-r border-slate-200 dark:border-slate-800 bg-indigo-50/20 dark:bg-indigo-950/20"
                              title="Sumatif LM belum diambil"
                            >
                              -
                            </td>
                          );
                        }

                        const gradeItem = row.grades[col.assessmentId];
                        const score = gradeItem?.nilai_angka;
                        const hasScore = score !== null && score !== undefined;
                        const isAbove = hasScore && score >= col.kkm;

                        return (
                          <td
                            key={col.id}
                            className="py-2 px-1 text-center font-mono border-r border-slate-200 dark:border-slate-800 bg-indigo-50/20 dark:bg-indigo-950/20"
                          >
                            {hasScore ? (
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                  isAbove
                                    ? "text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 dark:border dark:border-emerald-800/60"
                                    : "text-rose-800 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/60 dark:border dark:border-rose-800/60 font-black"
                                }`}
                              >
                                {score}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Sumatif Akhir Semester (SAS) Columns */}
                      {sasColumns.map((col) => {
                        if (!col.assessmentId) {
                          return (
                            <td
                              key={col.id}
                              className="py-2 px-1 text-center font-mono text-slate-300 dark:text-slate-600 border-r-2 border-slate-400 dark:border-slate-700 bg-purple-50/20 dark:bg-purple-950/20"
                              title="SAS belum diambil"
                            >
                              -
                            </td>
                          );
                        }

                        const gradeItem = row.grades[col.assessmentId];
                        const score = gradeItem?.nilai_angka;
                        const hasScore = score !== null && score !== undefined;
                        const isAbove = hasScore && score >= col.kkm;

                        return (
                          <td
                            key={col.id}
                            className="py-2 px-1 text-center font-mono border-r-2 border-slate-400 dark:border-slate-700 bg-purple-50/20 dark:bg-purple-950/20"
                          >
                            {hasScore ? (
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                  isAbove
                                    ? "text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 dark:border dark:border-emerald-800/60"
                                    : "text-rose-800 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/60 dark:border dark:border-rose-800/60 font-black"
                                }`}
                              >
                                {score}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Rekapitulasi: Rerata Formatif */}
                      <td className="py-2 px-2 text-center font-mono text-slate-700 dark:text-slate-300 bg-amber-50/20 dark:bg-amber-950/20 border-r border-slate-200 dark:border-slate-800">
                        {row.rata_rata_formatif !== null ? row.rata_rata_formatif : "-"}
                      </td>

                      {/* Rekapitulasi: Rerata Sumatif */}
                      <td className="py-2 px-2 text-center font-mono text-slate-700 dark:text-slate-300 bg-amber-50/20 dark:bg-amber-950/20 border-r border-slate-200 dark:border-slate-800">
                        {row.rata_rata_sumatif !== null ? row.rata_rata_sumatif : "-"}
                      </td>

                      {/* Rekapitulasi: Nilai Akhir (NA) */}
                      <td className="py-2 px-2 text-center font-mono font-black text-sm text-[#2563EB] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40 border-r border-slate-200 dark:border-slate-800">
                        {row.nilai_akhir !== null ? row.nilai_akhir : "-"}
                      </td>

                      {/* Rekapitulasi: Status Ketuntasan */}
                      <td className="py-2 px-2 text-center bg-amber-50/20 dark:bg-amber-950/20">
                        {row.nilai_akhir !== null ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-tight ${
                              isLulus
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 dark:border dark:border-emerald-800/60"
                                : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 dark:border dark:border-rose-800/60"
                            }`}
                          >
                            {isLulus ? "TUNTAS" : "REMIDI"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* ========================================================================= */}
            {/* TABLE FOOTER: CLASS SUMMARY & AVERAGES                                    */}
            {/* ========================================================================= */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-850 border-t-2 border-slate-400 dark:border-slate-700 font-semibold text-[10px] text-slate-700 dark:text-slate-300 select-none">
              <tr>
                <td
                  colSpan={3}
                  className="py-2 px-3 text-right font-bold uppercase tracking-wider border-r-2 border-slate-400 dark:border-slate-700 sticky left-0 z-20 bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.04)] dark:shadow-[2px_0_5px_rgba(0,0,0,0.3)]"
                >
                  Rerata Kelas
                </td>

                {/* Kehadiran Summary */}
                <td className="py-2 px-1 text-center font-mono text-emerald-800 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/50">
                  {columnStats.attendanceTotals.hadir}
                </td>
                <td className="py-2 px-1 text-center font-mono text-amber-800 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-950/50">
                  {columnStats.attendanceTotals.sakit}
                </td>
                <td className="py-2 px-1 text-center font-mono text-blue-800 dark:text-blue-300 border-r border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/50">
                  {columnStats.attendanceTotals.izin}
                </td>
                <td className="py-2 px-1 text-center font-mono text-rose-800 dark:text-rose-300 border-r border-slate-200 dark:border-slate-700 bg-rose-50 dark:bg-rose-950/50">
                  {columnStats.attendanceTotals.alpha}
                </td>
                <td className="py-2 px-1 text-center font-mono font-bold text-emerald-900 dark:text-emerald-200 border-r-2 border-slate-400 dark:border-slate-700 bg-emerald-100 dark:bg-emerald-900/50">
                  {columnStats.attendanceTotals.rerataPersen}%
                </td>

                {/* Formatif Averages */}
                {allFormatifColumns.map((col) => (
                  <td
                    key={col.id}
                    className="py-2 px-1 text-center font-mono border-r border-slate-200 dark:border-slate-700 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200"
                  >
                    {columnStats.formatifAverages[col.id] !== null
                      ? columnStats.formatifAverages[col.id]
                      : "-"}
                  </td>
                ))}

                {/* Sumatif LM Averages */}
                {sumatifLmColumns.map((col) => (
                  <td
                    key={col.id}
                    className="py-2 px-1 text-center font-mono border-r border-slate-200 dark:border-slate-700 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200"
                  >
                    {columnStats.sumatifLmAverages[col.id] !== null
                      ? columnStats.sumatifLmAverages[col.id]
                      : "-"}
                  </td>
                ))}

                {/* SAS Averages */}
                {sasColumns.map((col) => (
                  <td
                    key={col.id}
                    className="py-2 px-1 text-center font-mono border-r-2 border-slate-400 dark:border-slate-700 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200"
                  >
                    {columnStats.sasAverages[col.id] !== null
                      ? columnStats.sasAverages[col.id]
                      : "-"}
                  </td>
                ))}

                {/* Overall Rerata Formatif */}
                <td className="py-2 px-2 text-center font-mono border-r border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-950/40 text-slate-700 dark:text-slate-300">
                  -
                </td>

                {/* Overall Rerata Sumatif */}
                <td className="py-2 px-2 text-center font-mono border-r border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-950/40 text-slate-700 dark:text-slate-300">
                  -
                </td>

                {/* Rata-rata Nilai Akhir Kelas */}
                <td className="py-2 px-2 text-center font-mono font-black text-xs text-[#2563EB] dark:text-blue-400 bg-blue-100/70 dark:bg-blue-900/50 border-r border-slate-200 dark:border-slate-700">
                  {gradebook.statistics.rata_rata_kelas !== null
                    ? gradebook.statistics.rata_rata_kelas
                    : "-"}
                </td>

                {/* Ketuntasan Kelas (%) */}
                <td className="py-2 px-2 text-center font-bold text-slate-800 dark:text-slate-200 bg-amber-50 dark:bg-amber-950/40">
                  {gradebook.statistics.persentase_tuntas_kktp !== null
                    ? `${gradebook.statistics.persentase_tuntas_kktp}%`
                    : "-"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Helper Legend / Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500 pt-1 print:hidden">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <span>
            Klik pada judul kolom asesmen (<strong>TP</strong>, <strong>LM</strong>, atau{" "}
            <strong>SAS</strong>) untuk membuka form input nilai siswa secara instan.
          </span>
        </div>
        <div>
          Total Siswa Rombel: <strong className="text-slate-700 dark:text-slate-300">{gradebook.rows.length}</strong>
        </div>
      </div>
    </div>
  );
}
