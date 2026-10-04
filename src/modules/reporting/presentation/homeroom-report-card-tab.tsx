"use client";

/**
 * Ruang Pintar — Module M18: Homeroom Report Card Tab
 * Academic Glass UI Cockpit for Homeroom Teachers to manage e-Rapor Kurikulum Merdeka.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  CheckCircle2,
  Send,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Edit3,
  Sparkles,
  BookOpen,
  Users,
  CheckCheck,
  RefreshCw,
  Printer,
  ChevronRight,
} from "lucide-react";
import {
  RombelReportOverviewDTO,
  RombelReportSummaryItem,
  ReportCardData,
  ValidationResult,
  ReportCardStatus,
} from "../domain/report-card-types";
import {
  getRombelReportCardsOverviewAction,
  getStudentReportCardAction,
  updateReportCardStatusAction,
  bulkTransitionRombelReportCardsAction,
} from "@/app/actions/report-card-actions";
import { ReportCardPreviewModal } from "./report-card-preview-modal";
import { ReportCardEditModal } from "./report-card-edit-modal";

export interface HomeroomReportCardTabProps {
  rombelId: string;
}

export function HomeroomReportCardTab({ rombelId }: HomeroomReportCardTabProps) {
  const [data, setData] = useState<RombelReportOverviewDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [completenessFilter, setCompletenessFilter] = useState<string>("ALL");

  // Modals state
  const [activePreviewReport, setActivePreviewReport] = useState<ReportCardData | null>(null);
  const [activeValidation, setActiveValidation] = useState<ValidationResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [activeEditReport, setActiveEditReport] = useState<ReportCardData | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getRombelReportCardsOverviewAction(rombelId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Gagal memuat ringkasan e-Rapor rombel.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  }, [rombelId]);

  useEffect(() => {
    let ignore = false;

    getRombelReportCardsOverviewAction(rombelId)
      .then((res) => {
        if (!ignore) {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.error || "Gagal memuat ringkasan e-Rapor rombel.");
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [rombelId]);

  // Open Preview Modal
  const handleOpenPreview = async (siswaId: string) => {
    try {
      const res = await getStudentReportCardAction(siswaId);
      if (res.success && res.data) {
        setActivePreviewReport(res.data.reportCard);
        setActiveValidation(res.data.validation);
        setIsPreviewOpen(true);
      }
    } catch (err) {
      alert("Gagal memuat pratinjau rapor.");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = async (siswaId: string) => {
    try {
      const res = await getStudentReportCardAction(siswaId);
      if (res.success && res.data) {
        setActiveEditReport(res.data.reportCard);
        setIsEditOpen(true);
      }
    } catch (err) {
      alert("Gagal memuat formulir catatan rapor.");
    }
  };

  // Fast inline status toggle
  const handleInlineStatus = async (
    raporId: string | null,
    siswaId: string,
    targetStatus: ReportCardStatus
  ) => {
    try {
      const res = await updateReportCardStatusAction({
        raporId: raporId || undefined,
        siswaId,
        targetStatus,
      });
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || "Gagal mengubah status rapor.");
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    }
  };

  // Bulk Actions
  const handleBulkAction = async (targetStatus: "VALIDATED" | "PUBLISHED") => {
    if (
      !confirm(
        `Apakah Anda yakin ingin memproses ${targetStatus} massal untuk seluruh siswa yang memenuhi syarat?`
      )
    ) {
      return;
    }

    setIsBulkProcessing(true);
    setBulkFeedback(null);
    try {
      const res = await bulkTransitionRombelReportCardsAction({
        rombelId,
        targetStatus,
      });

      if (res.success && res.data) {
        setBulkFeedback(
          `Berhasil memproses ${res.data.successCount} dari ${res.data.totalProcessed} siswa.` +
            (res.data.failureCount > 0
              ? ` (${res.data.failureCount} siswa belum memenuhi syarat/nilai belum lengkap)`
              : "")
        );
        await loadData();
      } else {
        setBulkFeedback(res.error || "Gagal memproses aksi massal.");
      }
    } catch (err) {
      setBulkFeedback("Terjadi kesalahan saat pemrosesan massal.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!data) return [];
    return data.siswaList.filter((s) => {
      const matchSearch =
        s.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nis && s.nis.includes(searchQuery)) ||
        (s.nisn && s.nisn.includes(searchQuery));

      if (!matchSearch) return false;

      if (statusFilter !== "ALL" && s.statusRapor !== statusFilter) {
        return false;
      }

      if (completenessFilter === "COMPLETE" && !s.isComplete) {
        return false;
      }
      if (completenessFilter === "INCOMPLETE" && s.isComplete) {
        return false;
      }

      return true;
    });
  }, [data, searchQuery, statusFilter, completenessFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-xs text-slate-400">Memuat data e-Rapor rombel...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-800/40 text-center space-y-2">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
        <h4 className="text-sm font-semibold text-rose-200">Gagal Memuat e-Rapor</h4>
        <p className="text-xs text-rose-400">{error || "Data tidak ditemukan."}</p>
        <button
          onClick={loadData}
          className="mt-2 px-3 py-1.5 text-xs text-rose-200 bg-rose-900/40 hover:bg-rose-900/60 rounded-lg border border-rose-800/60 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. KPI CARDS (Academic Glass UI)                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Siswa */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Siswa</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-100">{data.totalSiswa}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {data.totalLengkapNilai} siswa nilai lengkap (
            {Math.round((data.totalLengkapNilai / (data.totalSiswa || 1)) * 100)}%)
          </div>
        </div>

        {/* Draft */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Rapor DRAFT</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">{data.totalDraft}</div>
          <div className="mt-1 text-[11px] text-slate-500">Menunggu validasi wali kelas</div>
        </div>

        {/* Validated */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Rapor VALID</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-400">{data.totalValidated}</div>
          <div className="mt-1 text-[11px] text-slate-500">Siap diterbitkan resmi</div>
        </div>

        {/* Published */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Rapor PUBLISHED</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">{data.totalPublished}</div>
          <div className="mt-1 text-[11px] text-slate-500">Terbuka di portal siswa & wali</div>
        </div>
      </div>

      {/* Bulk Feedback Banner */}
      {bulkFeedback && (
        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{bulkFeedback}</span>
          </div>
          <button
            onClick={() => setBulkFeedback(null)}
            className="text-blue-400 hover:text-blue-200 text-xs"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TOOLBAR & BULK ACTIONS                                                 */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa berdasarkan nama atau NIS..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Semua Status Rapor</option>
            <option value="DRAFT">Status: DRAFT</option>
            <option value="VALIDATED">Status: VALIDATED</option>
            <option value="PUBLISHED">Status: PUBLISHED</option>
          </select>

          <select
            value={completenessFilter}
            onChange={(e) => setCompletenessFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Semua Kelengkapan Nilai</option>
            <option value="COMPLETE">Nilai Lengkap (100%)</option>
            <option value="INCOMPLETE">Nilai Belum Lengkap</option>
          </select>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleBulkAction("VALIDATED")}
            disabled={isBulkProcessing || data.totalDraft === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-200 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl transition-colors disabled:opacity-40"
          >
            <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Validasi Massal</span>
          </button>

          <button
            onClick={() => handleBulkAction("PUBLISHED")}
            disabled={isBulkProcessing || data.totalValidated === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-100 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publikasikan Rombel</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ROSTER TABLE (Academic Glass UI)                                       */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-slate-400 font-semibold">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelengkapan Nilai</th>
                <th className="py-3 px-4 text-center">Rerata</th>
                <th className="py-3 px-4 text-center">Presensi (S/I/A)</th>
                <th className="py-3 px-4 text-center">Status Rapor</th>
                <th className="py-3 px-4">Catatan & Ekskul</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ada siswa yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((siswa, idx) => (
                  <tr key={siswa.siswaId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                      {siswa.nomorAbsen || idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{siswa.namaLengkap}</div>
                      <div className="text-[11px] text-slate-500">
                        NIS: {siswa.nis || "-"} • NISN: {siswa.nisn || "-"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            siswa.isComplete ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {siswa.mapelLengkapCount}/{siswa.totalMapelCount} Mapel
                        </span>
                        {siswa.isComplete ? (
                          <span className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-500">(Belum Lengkap)</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-200">
                        {siswa.rerataNilai !== null ? siswa.rerataNilai : "-"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="text-slate-300 font-mono text-[11px]">
                        {siswa.presensi.sakit} / {siswa.presensi.izin} /{" "}
                        {siswa.presensi.tanpaKeterangan}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          siswa.statusRapor === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : siswa.statusRapor === "VALIDATED"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {siswa.statusRapor}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-[11px] text-slate-300 truncate">
                        {siswa.catatanWaliKelas ? (
                          `"${siswa.catatanWaliKelas}"`
                        ) : (
                          <span className="text-slate-500 italic">Default catatan</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {siswa.ekstrakurikulerCount} Ekskul terdaftar
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Catatan & Ekskul */}
                        <button
                          onClick={() => handleOpenEdit(siswa.siswaId)}
                          title="Kelola Catatan & Ekstrakurikuler"
                          className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Pratinjau / Cetak Rapor */}
                        <button
                          onClick={() => handleOpenPreview(siswa.siswaId)}
                          title="Pratinjau / Cetak e-Rapor"
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Inline Status Toggle */}
                        {siswa.statusRapor === "DRAFT" && (
                          <button
                            onClick={() =>
                              handleInlineStatus(siswa.raporId, siswa.siswaId, "VALIDATED")
                            }
                            title="Validasi Rapor"
                            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {siswa.statusRapor === "VALIDATED" && (
                          <button
                            onClick={() =>
                              handleInlineStatus(siswa.raporId, siswa.siswaId, "PUBLISHED")
                            }
                            title="Terbitkan Rapor"
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS (PREVIEW & EDIT)                                                */}
      {/* ========================================================================= */}
      <ReportCardPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        reportCard={activePreviewReport}
        validation={activeValidation}
        canManageWorkflow={true}
        onStatusUpdated={async () => {
          await loadData();
          if (activePreviewReport) {
            handleOpenPreview(activePreviewReport.siswa.siswaId);
          }
        }}
      />

      {activeEditReport && (
        <ReportCardEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          reportCard={activeEditReport}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
