"use client";

/**
 * Ruang Pintar — M13 Class Assessment Tab View (Academic Glass UI v1.2)
 *
 * Mengintegrasikan:
 * 1. Manajemen Asesmen Berbasis TP / BAB (Formatif & Sumatif)
 * 2. Matriks Buku Nilai Terpadu (Gradebook Matrix View)
 * 3. Alur Pengambilan & Publikasi Nilai Siswa
 */

import React, { useState, useTransition } from "react";
import {
  GraduationCap,
  Plus,
  Target,
  Layers,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  Edit3,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Users,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  DefinisiAsesmenDTO,
  ClassGradebookDTO,
  AssessmentCategory,
} from "../domain/assessment-types";
import { ClassAttendanceRecapDTO } from "@/modules/attendance/domain/attendance-types";
import { CreateAssessmentModal } from "./create-assessment-modal";
import { InputGradesModal } from "./input-grades-modal";
import { PublishAssessmentModal } from "./publish-assessment-modal";
import { UnifiedAcademicLedgerTable } from "./unified-academic-ledger-table";
import { deleteAssessmentAction } from "@/app/actions/assessment-actions";

interface ClassAssessmentTabViewProps {
  penugasanId: string;
  canManage: boolean;
  assessments: DefinisiAsesmenDTO[];
  gradebook: ClassGradebookDTO;
  lingkupMateriList: Array<{
    id: string;
    judul: string;
    tujuan_pembelajaran: Array<{
      id: string;
      kode?: string | null;
      deskripsi: string;
    }>;
  }>;
  attendanceRecap?: ClassAttendanceRecapDTO | null;
  onRefresh: () => void;
  onShowToast: (message: string, type: "success" | "error" | "info") => void;
}

export function ClassAssessmentTabView({
  penugasanId,
  canManage,
  assessments,
  gradebook,
  lingkupMateriList,
  attendanceRecap,
  onRefresh,
  onShowToast,
}: ClassAssessmentTabViewProps) {
  const [isPending, startTransition] = useTransition();
  const [activeSubTab, setActiveSubTab] = useState<"GRADEBOOK" | "ASESMEN">("GRADEBOOK");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createInitialBabId, setCreateInitialBabId] = useState<string | undefined>(undefined);
  const [createInitialTpId, setCreateInitialTpId] = useState<string | undefined>(undefined);
  const [inputGradesTargetId, setInputGradesTargetId] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<DefinisiAsesmenDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    judul: string;
    detail?: string;
  } | null>(null);

  // Filter asesmen
  const filteredAssessments = assessments.filter((a) => {
    const matchCat = filterCategory === "ALL" || a.kategori === filterCategory;
    const matchSearch =
      a.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.tp_kode && a.tp_kode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.tp_deskripsi && a.tp_deskripsi.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const res = await deleteAssessmentAction(deleteTarget.id, penugasanId);
      if (res.success) {
        onShowToast(res.message, "success");
        setDeleteTarget(null);
        onRefresh();
      } else {
        onShowToast(res.message, "error");
      }
    });
  };

  // KPI Statistics
  const totalAsesmen = assessments.length;
  const totalFormatif = assessments.filter((a) => a.kategori === "FORMATIF").length;
  const totalSumatif = assessments.filter((a) => a.kategori !== "FORMATIF").length;
  const rataRataKelas = gradebook.statistics.rata_rata_kelas ?? "-";
  const tuntasKktpPersen = gradebook.statistics.persentase_tuntas_kktp ?? "-";

  return (
    <div className="space-y-6">
      {/* 1. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 p-4 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Target className="h-4 w-4 text-[#2563EB] dark:text-blue-400" />
            Total Asesmen
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{totalAsesmen}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Seluruh kegiatan nilai</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 p-4 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <GraduationCap className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            Formatif (TP)
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{totalFormatif}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Penilaian tujuan belajar</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 p-4 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Layers className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            Sumatif (BAB/SAS)
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{totalSumatif}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Evaluasi lingkup materi</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 p-4 shadow-xs">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            Rata-rata Kelas
          </div>
          <div className="mt-2 text-2xl font-bold text-[#2563EB] dark:text-blue-400">{rataRataKelas}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Rerata seluruh nilai</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Ketuntasan KKTP
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {tuntasKktpPersen !== "-" ? `${tuntasKktpPersen}%` : "-"}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Ambang batas KKTP {gradebook.kkm_default}
          </p>
        </div>
      </div>

      {/* 2. Sub-tab switcher & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs">
        {/* Toggle View Mode */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSubTab("GRADEBOOK")}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "GRADEBOOK"
                ? "bg-white dark:bg-slate-700 text-[#2563EB] dark:text-blue-400 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Buku Nilai & Presensi (Leger Terpadu)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("ASESMEN")}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "ASESMEN"
                ? "bg-white dark:bg-slate-700 text-[#2563EB] dark:text-blue-400 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            Daftar Asesmen
          </button>
        </div>

        {/* Right side Actions */}
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Buat Asesmen Baru
            </button>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* SUB-TAB 1: DAFTAR ASESMEN                  */}
      {/* ========================================== */}
      {activeSubTab === "ASESMEN" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul asesmen atau TP..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-400 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 dark:text-slate-500 text-xs">Kategori:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="FORMATIF">Formatif (TP)</option>
                <option value="SUMATIF">Sumatif (BAB)</option>
                <option value="SUMATIF_AKHIR">Sumatif Akhir (SAS)</option>
                <option value="TUGAS">Tugas</option>
                <option value="PRAKTIK">Praktik</option>
              </select>
            </div>
          </div>

          {/* Cards / Table List */}
          {filteredAssessments.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
              <Target className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Belum Ada Asesmen Pembelajaran</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Mulai buat asesmen formatif berdasarkan Tujuan Pembelajaran (TP) atau asesmen
                sumatif lingkup materi BAB untuk mengambil nilai siswa.
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  Buat Asesmen Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAssessments.map((a) => {
                const isComplete =
                  a.total_siswa_rombel > 0 && a.total_siswa_dinilai >= a.total_siswa_rombel;

                return (
                  <div
                    key={a.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              a.kategori === "FORMATIF"
                                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40"
                                : a.kategori === "SUMATIF"
                                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40"
                                  : "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40"
                            }`}
                          >
                            {a.kategori}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            Bobot: {a.bobot}x
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {a.is_published ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                              <CheckCircle2 className="h-3 w-3" />
                              Dipublikasikan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              <Clock className="h-3 w-3" />
                              Draf Internal
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Judul & TP Context */}
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{a.judul}</h4>
                      {a.tp_kode ? (
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                          {a.tp_kode} • {a.tp_deskripsi || ""}
                        </p>
                      ) : a.lingkup_materi_judul ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          BAB: {a.lingkup_materi_judul}
                        </p>
                      ) : null}

                      {/* Detail Metrics */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Status Siswa</span>
                          <span
                            className={`font-bold ${
                              isComplete ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            {a.total_siswa_dinilai}/{a.total_siswa_rombel}
                          </span>
                        </div>

                        <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">KKTP</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{a.kkm_kktp}</span>
                        </div>

                        <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Rata-rata</span>
                          <span className="font-bold text-[#2563EB] dark:text-blue-400">
                            {a.rata_rata_nilai !== null ? a.rata_rata_nilai : "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(a.tanggal_pelaksanaan).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                id: a.id,
                                judul: a.judul,
                                detail: `${a.total_siswa_dinilai}/${a.total_siswa_rombel} Siswa Terdata Nilai`,
                              })
                            }
                            title="Hapus Asesmen"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        {canManage && !a.is_published && a.total_siswa_dinilai > 0 && (
                          <button
                            type="button"
                            onClick={() => setPublishTarget(a)}
                            title="Publikasikan ke Siswa/Wali"
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="h-3 w-3" />
                            Publikasi
                          </button>
                        )}

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setInputGradesTargetId(a.id)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Award className="h-3.5 w-3.5" />
                            Input Nilai
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* SUB-TAB 2: BUKU NILAI (GRADEBOOK MATRIX)   */}
      {/* ========================================== */}
      {activeSubTab === "GRADEBOOK" && (
        <UnifiedAcademicLedgerTable
          penugasanId={penugasanId}
          canManage={canManage}
          gradebook={gradebook}
          lingkupMateriList={lingkupMateriList}
          assessments={assessments}
          attendanceRecap={attendanceRecap}
          onOpenInputGrades={(id) => setInputGradesTargetId(id)}
          onOpenCreateAssessment={(tpId, lmId) => {
            setCreateInitialTpId(tpId);
            setCreateInitialBabId(lmId);
            setIsCreateModalOpen(true);
          }}
        />
      )}

      {/* Modals */}
      <CreateAssessmentModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateInitialBabId(undefined);
          setCreateInitialTpId(undefined);
        }}
        penugasanId={penugasanId}
        defaultKktp={gradebook?.kkm_default || 80}
        lingkupMateriList={lingkupMateriList}
        initialBabId={createInitialBabId}
        initialTpId={createInitialTpId}
        onSuccess={(msg) => {
          onShowToast(msg, "success");
          onRefresh();
        }}
        onError={(msg) => onShowToast(msg, "error")}
      />

      {inputGradesTargetId && (
        <InputGradesModal
          asesmenId={inputGradesTargetId}
          penugasanId={penugasanId}
          isOpen={Boolean(inputGradesTargetId)}
          onClose={() => setInputGradesTargetId(null)}
          onSuccess={(msg) => {
            onShowToast(msg, "success");
            onRefresh();
          }}
          onError={(msg) => onShowToast(msg, "error")}
        />
      )}

      {publishTarget && (
        <PublishAssessmentModal
          asesmen={publishTarget}
          penugasanId={penugasanId}
          isOpen={Boolean(publishTarget)}
          onClose={() => setPublishTarget(null)}
          onSuccess={(msg) => {
            onShowToast(msg, "success");
            onRefresh();
          }}
          onError={(msg) => onShowToast(msg, "error")}
        />
      )}

      {/* Modal Konfirmasi Hapus Asesmen (Academic Glass UI) */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-assessment-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1 text-left flex-1">
                <h3 id="delete-assessment-title" className="text-base font-bold text-slate-900">
                  Hapus Definisi Asesmen
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tindakan ini tidak dapat dibatalkan. Seluruh rekaman nilai siswa pada lembar
                  asesmen ini akan dihapus secara permanen dari buku nilai.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-xs font-semibold text-slate-800 line-clamp-2">
                {deleteTarget.judul}
              </div>
              {deleteTarget.detail && (
                <div className="text-[11px] font-medium text-slate-500">{deleteTarget.detail}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Ya, Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
