"use client";

/**
 * Ruang Pintar — Rombongan Belajar / Classes Management Component (Academic Glass UI v1.2)
 */

import React, { useState, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  AlertTriangle,
  GraduationCap,
  Calendar,
  Layers,
} from "lucide-react";
import {
  AcademicProgramDTO,
  AcademicYearDTO,
  GradeLevelDTO,
  PhaseDTO,
  RombelDTO,
  SemesterDTO,
  StatusRombel,
} from "../domain/academic-types";
import {
  createRombelAction,
  deleteRombelAction,
  updateRombelAction,
} from "@/app/actions/academic-actions";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Toast } from "@/shared/components/ui/toast";

interface RombelsViewProps {
  initialRombels: RombelDTO[];
  academicYears: AcademicYearDTO[];
  semesters: SemesterDTO[];
  gradeLevels: GradeLevelDTO[];
  phases: PhaseDTO[];
  programs: AcademicProgramDTO[];
  canManage: boolean;
  isTenantOwner?: boolean;
}

const emptySubscribe = () => () => {};

export function RombelsView({
  initialRombels,
  academicYears,
  semesters,
  gradeLevels,
  phases,
  programs,
  canManage,
  isTenantOwner = false,
}: RombelsViewProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [rombels, setRombels] = useState<RombelDTO[]>(initialRombels);

  // Active Academic Year default
  const activeYear = academicYears.find((y) => y.status === "AKTIF");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>(
    activeYear ? activeYear.id : "ALL"
  );
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("ALL");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>("ALL");

  // Modals state
  const [rombelModalMode, setRombelModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedRombel, setSelectedRombel] = useState<RombelDTO | null>(null);
  const [deleteRombelTarget, setDeleteRombelTarget] = useState<RombelDTO | null>(null);

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Toolbar & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtered rombels
  const filteredRombels = useMemo(() => {
    return rombels.filter((r) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.kode && r.kode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.program_nama && r.program_nama.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.tingkat_nama && r.tingkat_nama.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesYear = selectedYearFilter === "ALL" || r.tahun_ajaran_id === selectedYearFilter;

      const matchesGrade = selectedGradeFilter === "ALL" || r.tingkat_id === selectedGradeFilter;

      const matchesProgram =
        selectedProgramFilter === "ALL" || r.program_id === selectedProgramFilter;

      return matchesSearch && matchesYear && matchesGrade && matchesProgram;
    });
  }, [rombels, searchQuery, selectedYearFilter, selectedGradeFilter, selectedProgramFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRombels.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRombels = filteredRombels.slice(startIndex, startIndex + pageSize);

  function getStatusBadge(status: StatusRombel) {
    switch (status) {
      case "AKTIF":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Aktif
          </span>
        );
      case "NONAKTIF":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500">
            Nonaktif
          </span>
        );
      case "DIARSIPKAN":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Diarsipkan
          </span>
        );
      default:
        return null;
    }
  }

  async function handleRombelSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return;

    setLoading(true);
    setToastMessage(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    let res;

    if (rombelModalMode === "create") {
      res = await createRombelAction(formData);
    } else if (rombelModalMode === "edit" && selectedRombel) {
      res = await updateRombelAction(selectedRombel.id, formData);
    }

    if (res?.success) {
      setToastMessage({ type: "success", text: res.message ?? "Operasi rombel berhasil." });
      setRombelModalMode(null);
      setSelectedRombel(null);
      if (rombelModalMode === "create" && res.data) {
        setRombels((prev) => [res.data as RombelDTO, ...prev]);
      } else if (rombelModalMode === "edit" && res.data) {
        const updated = res.data as RombelDTO;
        setRombels((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      }
    } else if (res && !res.success) {
      setToastMessage({ type: "error", text: res.error });
      if (res.details) {
        setFieldErrors(res.details);
      }
    }
    setLoading(false);
  }

  async function handleDeleteRombelConfirm() {
    if (!deleteRombelTarget || !canManage) return;
    setLoading(true);
    setToastMessage(null);

    const res = await deleteRombelAction(deleteRombelTarget.id);
    if (res.success) {
      setToastMessage({ type: "success", text: res.message ?? "Rombel berhasil dihapus." });
      setRombels((prev) => prev.filter((r) => r.id !== deleteRombelTarget.id));
      setDeleteRombelTarget(null);
    } else if (!res.success) {
      setToastMessage({ type: "error", text: res.error });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.text}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Main Glass Container */}
      <div className="rounded-3xl bg-white border border-slate-100/90 p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100/80">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Rombongan Belajar (Rombel / Kelas)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Definisi kelompok belajar siswa periodik per tahun ajaran, tingkat kelas, dan program
              keahlian.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManage && !isTenantOwner && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRombel(null);
                  setFieldErrors({});
                  setRombelModalMode("create");
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Bentuk Rombel</span>
              </button>
            )}
          </div>
        </div>

        {rombels.length === 0 ? (
          <EmptyState
            title="Belum Ada Rombongan Belajar"
            description="Bentuk rombongan belajar pertama untuk mengelompokkan siswa berdasarkan tingkat dan program keahlian."
            action={
              canManage && !isTenantOwner ? (
                <Button
                  variant="cobalt"
                  onClick={() => {
                    setSelectedRombel(null);
                    setFieldErrors({});
                    setRombelModalMode("create");
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Bentuk Rombel Pertama
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {/* Toolbar Filters */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari nama rombel, kode, atau jurusan..."
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
                {/* Filter Tahun Ajaran */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 shadow-sm">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={selectedYearFilter}
                    onChange={(e) => {
                      setSelectedYearFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Tahun Ajaran</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.nama} {y.status === "AKTIF" ? "(Aktif)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Tingkat */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 shadow-sm">
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={selectedGradeFilter}
                    onChange={(e) => {
                      setSelectedGradeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Tingkat</option>
                    {gradeLevels.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Program */}
                {programs.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 shadow-sm">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <select
                      value={selectedProgramFilter}
                      onChange={(e) => {
                        setSelectedProgramFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Semua Jurusan</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} ({p.kode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 shadow-sm">
                  <span className="text-[11px] text-slate-400 font-medium">Baris:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredRombels.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-slate-200/60 space-y-2">
                <p className="text-sm font-bold text-slate-700">
                  Tidak ada rombongan belajar yang sesuai filter
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedYearFilter("ALL");
                    setSelectedGradeFilter("ALL");
                    setSelectedProgramFilter("ALL");
                  }}
                  className="mt-2 text-xs"
                >
                  Reset Semua Filter
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile Cards View (< 640px) */}
                <div className="block sm:hidden space-y-3">
                  {paginatedRombels.map((rombel) => (
                    <div
                      key={rombel.id}
                      className="p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563EB] flex-shrink-0 mt-0.5">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug">
                              {rombel.nama}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              T.A:{" "}
                              <strong className="text-slate-800">{rombel.tahun_ajaran_nama}</strong>
                              {rombel.semester_nama && ` • ${rombel.semester_nama}`}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(rombel.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Tingkat & Fase
                          </span>
                          <span className="font-semibold text-slate-700">
                            {rombel.tingkat_nama} {rombel.fase_nama ? `(${rombel.fase_nama})` : ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Program / Jurusan
                          </span>
                          <span className="font-semibold text-slate-700">
                            {rombel.program_nama ?? "Umum"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500 text-[11px]">
                          Kapasitas Rombel:{" "}
                          <strong className="text-slate-900 font-bold">
                            {rombel.kapasitas} siswa
                          </strong>
                        </span>
                        {rombel.kode && (
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            {rombel.kode}
                          </span>
                        )}
                      </div>

                      {canManage && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRombel(rombel);
                              setFieldErrors({});
                              setRombelModalMode("edit");
                            }}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100/90 hover:bg-blue-50 hover:text-[#2563EB] border border-slate-200/80 transition-all cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteRombelTarget(rombel)}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/90 hover:bg-rose-100 hover:text-rose-700 border border-rose-200/80 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table View (>= 640px) */}
                <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50/90 text-[11px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="py-3.5 px-4 font-bold">Nama Rombel</th>
                        <th className="py-3.5 px-4 font-bold">Tahun Ajaran</th>
                        <th className="py-3.5 px-4 font-bold">Tingkat & Fase</th>
                        <th className="py-3.5 px-4 font-bold">Program / Jurusan</th>
                        <th className="py-3.5 px-4 text-center font-bold">Kapasitas</th>
                        <th className="py-3.5 px-4 font-bold">Status</th>
                        {canManage && <th className="py-3.5 px-4 text-right font-bold">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-medium">
                      {paginatedRombels.map((rombel) => (
                        <tr key={rombel.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{rombel.nama}</span>
                            {rombel.kode && (
                              <span className="text-xs font-mono text-slate-400 block mt-0.5">
                                {rombel.kode}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                            {rombel.tahun_ajaran_nama}
                            {rombel.semester_nama && (
                              <span className="text-slate-400 block text-[11px] font-normal">
                                {rombel.semester_nama}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-700">
                            <span className="font-bold">{rombel.tingkat_nama}</span>
                            {rombel.fase_nama && (
                              <span className="ml-1 text-blue-600 font-medium">
                                ({rombel.fase_nama})
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            {rombel.program_nama ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                                {rombel.program_nama}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Umum</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-[#2563EB] border border-blue-100">
                              {rombel.kapasitas} Siswa
                            </span>
                          </td>
                          <td className="py-3.5 px-4">{getStatusBadge(rombel.status)}</td>
                          {canManage && (
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRombel(rombel);
                                    setFieldErrors({});
                                    setRombelModalMode("edit");
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100/90 hover:bg-blue-50 hover:text-[#2563EB] border border-slate-200/80 transition-all cursor-pointer shadow-xs"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteRombelTarget(rombel)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/90 hover:bg-rose-100 hover:text-rose-700 border border-rose-200/80 transition-all cursor-pointer shadow-xs"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                  <span>Hapus</span>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pagination Controls */}
            {filteredRombels.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Menampilkan{" "}
                  <strong className="text-slate-800 font-bold">
                    {startIndex + 1} - {Math.min(startIndex + pageSize, filteredRombels.length)}
                  </strong>{" "}
                  dari{" "}
                  <strong className="text-slate-800 font-bold">{filteredRombels.length}</strong>{" "}
                  rombel
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 w-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          safeCurrentPage === pageNum
                            ? "bg-[#2563EB] text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage >= totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                  >
                    <span>Selanjutnya</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL CREATE / EDIT ROMBEL */}
      {isMounted &&
        rombelModalMode &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rombel-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in"
          >
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100">
                    <Users className="h-4 w-4" />
                  </div>
                  <h3 id="rombel-modal-title" className="text-lg font-bold text-slate-900">
                    {rombelModalMode === "create" ? "Bentuk Rombel Baru" : "Edit Rombel"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRombelModalMode(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Tutup modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRombelSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="rombel-year"
                      className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
                    >
                      Tahun Ajaran <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="rombel-year"
                      name="tahun_ajaran_id"
                      required
                      defaultValue={
                        selectedRombel?.tahun_ajaran_id ??
                        (activeYear ? activeYear.id : (academicYears[0]?.id ?? ""))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563EB] transition-all cursor-pointer"
                    >
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.nama} {y.status === "AKTIF" ? "(Aktif)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="rombel-semester"
                      className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
                    >
                      Semester (Opsional)
                    </label>
                    <select
                      id="rombel-semester"
                      name="semester_id"
                      defaultValue={selectedRombel?.semester_id ?? ""}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563EB] transition-all cursor-pointer"
                    >
                      <option value="">-- Seluruh Semester (Tahunan) --</option>
                      {semesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} ({s.tahun_ajaran_nama})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="rombel-tingkat"
                      className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
                    >
                      Tingkat Kelas <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="rombel-tingkat"
                      name="tingkat_id"
                      required
                      defaultValue={selectedRombel?.tingkat_id ?? gradeLevels[0]?.id ?? ""}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563EB] transition-all cursor-pointer"
                    >
                      {gradeLevels.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nama} ({g.kode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="rombel-fase"
                      className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
                    >
                      Fase Pendidikan (Opsional)
                    </label>
                    <select
                      id="rombel-fase"
                      name="fase_id"
                      defaultValue={selectedRombel?.fase_id ?? ""}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563EB] transition-all cursor-pointer"
                    >
                      <option value="">-- Tanpa Spesifikasi Fase --</option>
                      {phases.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} ({p.kode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rombel-program"
                    className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
                  >
                    Program Keahlian / Jurusan (Opsional)
                  </label>
                  <select
                    id="rombel-program"
                    name="program_id"
                    defaultValue={selectedRombel?.program_id ?? ""}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563EB] transition-all cursor-pointer"
                  >
                    <option value="">-- Umum / Tanpa Jurusan Kejuruan --</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.kode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="rombel-nama"
                    className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
                  >
                    Nama Rombel / Kelas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="rombel-nama"
                    name="nama"
                    type="text"
                    required
                    defaultValue={selectedRombel?.nama ?? ""}
                    placeholder="Contoh: X RPL 1, XI TO 2, atau Kelas 7A"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563EB] transition-all"
                  />
                  {fieldErrors.nama && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.nama[0]}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="rombel-kode"
                      className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
                    >
                      Kode Rombel (Opsional)
                    </label>
                    <input
                      id="rombel-kode"
                      name="kode"
                      type="text"
                      defaultValue={selectedRombel?.kode ?? ""}
                      placeholder="Contoh: RBL-X-RPL-1"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-sm font-mono uppercase focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563EB] transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="rombel-kapasitas"
                      className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
                    >
                      Kapasitas Siswa (Maks) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="rombel-kapasitas"
                      name="kapasitas"
                      type="number"
                      min={1}
                      max={100}
                      required
                      defaultValue={selectedRombel?.kapasitas ?? 36}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563EB] transition-all"
                    />
                    {fieldErrors.kapasitas && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">
                        {fieldErrors.kapasitas[0]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="rombel-status"
                      className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
                    >
                      Status Rombel
                    </label>
                    <select
                      id="rombel-status"
                      name="status"
                      defaultValue={selectedRombel?.status ?? "AKTIF"}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563EB] transition-all cursor-pointer"
                    >
                      <option value="AKTIF">AKTIF</option>
                      <option value="NONAKTIF">NONAKTIF</option>
                      <option value="DIARSIPKAN">DIARSIPKAN</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="rombel-catatan"
                      className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5"
                    >
                      Catatan (Opsional)
                    </label>
                    <input
                      id="rombel-catatan"
                      name="catatan"
                      type="text"
                      defaultValue={selectedRombel?.catatan ?? ""}
                      placeholder="Contoh: Gedung A Lab Komputer"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563EB] transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRombelModalMode(null)}
                    disabled={loading}
                    className="cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="cobalt"
                    disabled={loading}
                    className="cursor-pointer"
                  >
                    {loading ? "Menyimpan..." : "Simpan Rombel"}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* CONFIRMATION DELETE ROMBEL */}
      {isMounted &&
        deleteRombelTarget &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-rombel-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in"
          >
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 p-6 sm:p-7 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center font-bold text-lg">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h3 id="del-rombel-title" className="text-lg font-bold text-slate-900">
                    Hapus Rombongan Belajar
                  </h3>
                  <p className="text-xs text-slate-500">Tindakan permanen di database</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus rombel{" "}
                <strong className="text-slate-900 font-semibold">{deleteRombelTarget.nama}</strong>{" "}
                ({deleteRombelTarget.tahun_ajaran_nama})?
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setDeleteRombelTarget(null)}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteRombelConfirm}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  {loading ? "Menghapus..." : "Ya, Hapus Rombel"}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
