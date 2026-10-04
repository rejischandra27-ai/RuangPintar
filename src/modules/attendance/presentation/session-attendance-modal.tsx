"use client";

/**
 * Ruang Pintar — M12 Class Session Attendance Modal (Academic Glass UI v1.2)
 *
 * Antarmuka Presensi Lembar Akademik Kelas Berkapasitas Besar (30-40+ Siswa):
 * - Dual View: Mode Lembar Tabel Kompak (Dense Attendance Sheet) & Mode Grid Kartu
 * - Interactive KPI & Filter Pills (Semua, Hadir, Tidak Hadir, Sakit, Izin, Alpha)
 * - One-Click "Tandai Semua Hadir" untuk kecepatan guru
 * - Segmented Control Status Cepat (Hadir, Izin, Sakit, Alpha, Disp., Terl.)
 * - Inline Catatan KBM terpadu
 * - Fullscreen Workspace Toggle untuk kenyamanan mengabsen di ruang kelas
 * - Sticky Header, Sticky Table Head, dan Sticky Action Footer
 */

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Users,
  CheckCircle2,
  Clock,
  Search,
  CheckCheck,
  RotateCcw,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  Sparkles,
  LayoutList,
  LayoutGrid,
  Maximize2,
  Minimize2,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import {
  getSessionAttendanceAction,
  saveSessionAttendanceAction,
} from "@/app/actions/attendance-actions";
import {
  AttendanceStatus,
  ClassSessionAttendanceDTO,
  SaveAttendanceItemInput,
} from "../domain/attendance-types";

interface SessionAttendanceModalProps {
  sesiId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function SessionAttendanceModal({
  sesiId,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: SessionAttendanceModalProps) {
  if (!isOpen || !sesiId) return null;

  return (
    <SessionAttendanceModalContent
      sesiId={sesiId}
      onClose={onClose}
      onSuccess={onSuccess}
      onError={onError}
    />
  );
}

function SessionAttendanceModalContent({
  sesiId,
  onClose,
  onSuccess,
  onError,
}: {
  sesiId: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}) {
  const [sessionData, setSessionData] = useState<ClassSessionAttendanceDTO | null>(null);
  const [items, setItems] = useState<Record<string, { status: AttendanceStatus; catatan: string }>>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "HADIR" | "ABSENT" | "IZIN" | "SAKIT" | "ALPHA"
  >("ALL");
  const [viewMode, setViewMode] = useState<"TABLE" | "GRID">("TABLE");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sortBy, setSortBy] = useState<"ABSEN" | "NAME" | "STATUS">("ABSEN");
  const [alasanKoreksi, setAlasanKoreksi] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Ambil data sesi dan roster siswa saat modal dibuka
  useEffect(() => {
    let isMounted = true;

    getSessionAttendanceAction(sesiId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setSessionData(res.data);
          // Inisialisasi status tiap siswa
          const initialMap: Record<string, { status: AttendanceStatus; catatan: string }> = {};
          res.data.daftar_siswa.forEach((s) => {
            initialMap[s.siswa_id] = {
              status: s.status,
              catatan: s.catatan || "",
            };
          });
          setItems(initialMap);
        } else {
          onError?.(res.message);
          onClose();
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        onError?.(err instanceof Error ? err.message : "Gagal memuat data presensi sesi.");
        onClose();
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sesiId, onClose, onError]);

  // Handler ubah status individu siswa
  const handleStatusChange = (siswaId: string, newStatus: AttendanceStatus) => {
    setItems((prev) => ({
      ...prev,
      [siswaId]: {
        ...prev[siswaId],
        status: newStatus,
      },
    }));
  };

  // Handler ubah catatan individu siswa
  const handleCatatanChange = (siswaId: string, newCatatan: string) => {
    setItems((prev) => ({
      ...prev,
      [siswaId]: {
        ...prev[siswaId],
        catatan: newCatatan,
      },
    }));
  };

  // Quick Action: Tandai Semua Hadir
  const handleMarkAllPresent = () => {
    if (!sessionData) return;
    setItems((prev) => {
      const updated = { ...prev };
      sessionData.daftar_siswa.forEach((s) => {
        updated[s.siswa_id] = {
          ...updated[s.siswa_id],
          status: "HADIR",
        };
      });
      return updated;
    });
  };

  // Quick Action: Reset ke awal
  const handleResetToInitial = () => {
    if (!sessionData) return;
    const initialMap: Record<string, { status: AttendanceStatus; catatan: string }> = {};
    sessionData.daftar_siswa.forEach((s) => {
      initialMap[s.siswa_id] = {
        status: s.status,
        catatan: s.catatan || "",
      };
    });
    setItems(initialMap);
  };

  // Hitung metrik real-time dari state
  const totalSiswa = sessionData?.daftar_siswa.length || 0;
  let countHadir = 0;
  let countIzin = 0;
  let countSakit = 0;
  let countAlpha = 0;
  let countDispensasi = 0;
  let countTerlambat = 0;

  Object.values(items).forEach((item) => {
    if (item.status === "HADIR") countHadir++;
    else if (item.status === "IZIN") countIzin++;
    else if (item.status === "SAKIT") countSakit++;
    else if (item.status === "ALPHA") countAlpha++;
    else if (item.status === "DISPENSASI") countDispensasi++;
    else if (item.status === "TERLAMBAT") countTerlambat++;
  });

  const totalAbsent = countIzin + countSakit + countAlpha + countDispensasi;

  const livePercentage =
    totalSiswa > 0
      ? Math.round(((countHadir + countTerlambat + countDispensasi) / totalSiswa) * 100)
      : 0;

  // Filter dan Sort siswa berdasarkan search, status filter, dan sort order
  const filteredAndSortedStudents = useMemo(() => {
    if (!sessionData) return [];

    let list = sessionData.daftar_siswa.filter((s) => {
      const currentStatus = items[s.siswa_id]?.status || "HADIR";
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.nama_lengkap.toLowerCase().includes(q) ||
        (s.nis && s.nis.toLowerCase().includes(q)) ||
        (s.nisn && s.nisn.toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter === "HADIR") matchesStatus = currentStatus === "HADIR";
      else if (statusFilter === "ABSENT")
        matchesStatus = ["IZIN", "SAKIT", "ALPHA", "DISPENSASI"].includes(currentStatus);
      else if (statusFilter === "IZIN") matchesStatus = currentStatus === "IZIN";
      else if (statusFilter === "SAKIT") matchesStatus = currentStatus === "SAKIT";
      else if (statusFilter === "ALPHA") matchesStatus = currentStatus === "ALPHA";

      return matchesSearch && matchesStatus;
    });

    list.sort((a, b) => {
      if (sortBy === "ABSEN") {
        return (a.nomor_absen || 999) - (b.nomor_absen || 999);
      }
      if (sortBy === "NAME") {
        return a.nama_lengkap.localeCompare(b.nama_lengkap);
      }
      if (sortBy === "STATUS") {
        const statusA = items[a.siswa_id]?.status || "HADIR";
        const statusB = items[b.siswa_id]?.status || "HADIR";
        // Put absent students at the top
        if (statusA === "HADIR" && statusB !== "HADIR") return 1;
        if (statusA !== "HADIR" && statusB === "HADIR") return -1;
        return a.nama_lengkap.localeCompare(b.nama_lengkap);
      }
      return 0;
    });

    return list;
  }, [sessionData, items, searchQuery, statusFilter, sortBy]);

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionData) return;

    const payloadItems: SaveAttendanceItemInput[] = sessionData.daftar_siswa.map((s) => ({
      siswa_id: s.siswa_id,
      penempatan_rombel_id: s.penempatan_rombel_id,
      status: items[s.siswa_id]?.status || "HADIR",
      catatan: items[s.siswa_id]?.catatan || null,
    }));

    startTransition(async () => {
      const res = await saveSessionAttendanceAction({
        sesi_kelas_id: sessionData.sesi_id,
        sekolah_id: sessionData.sekolah_id,
        items: payloadItems,
        alasan_koreksi: alasanKoreksi.trim() || undefined,
      });

      if (res.success) {
        onSuccess?.(res.message);
        onClose();
      } else {
        onError?.(res.message);
      }
    });
  };

  const formattedDate = sessionData
    ? new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(sessionData.tanggal))
    : "";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full bg-white flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-0 h-screen w-screen rounded-none z-50 border-0"
            : "max-w-6xl max-h-[92vh] sm:rounded-3xl border border-slate-200/80 shadow-2xl"
        }`}
      >
        {/* ========================================================= */}
        {/* HEADER MODAL (STICKY ACADEMIC HEADER)                      */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/90 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-100/80 text-[#2563EB] font-bold text-xs">
                Presensi Sesi KBM
              </span>
              {sessionData?.sudah_diabsen ? (
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100/80 text-emerald-700 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Sudah Pernah Diabsen
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-100/80 text-amber-700 font-bold text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-600" />
                  Sesi Baru (Belum Disimpan)
                </span>
              )}
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-400">
                • {totalSiswa} Siswa Terdaftar
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-tight truncate">
                {sessionData ? sessionData.mata_pelajaran_nama : "Memuat Sesi..."}
              </h2>
              <span className="text-xs sm:text-sm font-bold text-[#2563EB]">
                {sessionData?.rombel_nama}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                {formattedDate}
              </span>
              {sessionData?.ruangan && (
                <>
                  <span>•</span>
                  <span>Ruang: {sessionData.ruangan}</span>
                </>
              )}
            </div>
          </div>

          {/* Top Right Controls: Fullscreen toggle & Close */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={
                isFullscreen ? "Keluar dari Layar Penuh" : "Buka Layar Penuh (Fokus Mengabsen)"
              }
              className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="p-16 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-[#2563EB] animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Memuat lembar presensi siswa...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* ========================================================= */}
            {/* KPI METRIC BAR & QUICK INTERACTIVE CHIPS                   */}
            {/* ========================================================= */}
            <div className="p-3 sm:px-6 sm:py-3 bg-white border-b border-slate-100 shrink-0 space-y-2.5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Progress Bar & Rate */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm shadow-xs shrink-0">
                    {livePercentage}%
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">Kehadiran Kelas</span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        ({countHadir} dari {totalSiswa} Siswa)
                      </span>
                    </div>
                    {/* Linear Progress Meter */}
                    <div className="w-36 sm:w-48 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                        style={{ width: `${livePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Interactive Status Summary Badges (Act as Quick Filter shortcuts!) */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      statusFilter === "ALL"
                        ? "bg-slate-800 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Semua: {totalSiswa}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("HADIR")}
                    className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      statusFilter === "HADIR"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                    }`}
                  >
                    Hadir: {countHadir}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ABSENT")}
                    className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      statusFilter === "ABSENT"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60"
                    }`}
                  >
                    Tidak Hadir: {totalAbsent}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("IZIN")}
                    className={`px-2 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                      statusFilter === "IZIN"
                        ? "bg-sky-600 text-white font-bold"
                        : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                    }`}
                  >
                    Izin: {countIzin}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("SAKIT")}
                    className={`px-2 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                      statusFilter === "SAKIT"
                        ? "bg-amber-600 text-white font-bold"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    Sakit: {countSakit}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALPHA")}
                    className={`px-2 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                      statusFilter === "ALPHA"
                        ? "bg-rose-600 text-white font-bold"
                        : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                    }`}
                  >
                    Alpha: {countAlpha}
                  </button>
                </div>
              </div>

              {/* ========================================================= */}
              {/* ACTION TOOLBAR, SEARCH, AND VIEW SWITCHER                 */}
              {/* ========================================================= */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                {/* Search box & Sort */}
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari siswa atau NISN..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>

                  {/* Sort Order */}
                  <button
                    type="button"
                    onClick={() => {
                      if (sortBy === "ABSEN") setSortBy("NAME");
                      else if (sortBy === "NAME") setSortBy("STATUS");
                      else setSortBy("ABSEN");
                    }}
                    title={`Urutkan: ${sortBy === "ABSEN" ? "No. Absen" : sortBy === "NAME" ? "Nama A-Z" : "Yang Absen di Atas"}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 shrink-0 cursor-pointer"
                  >
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    <span className="hidden md:inline">
                      {sortBy === "ABSEN"
                        ? "No. Absen"
                        : sortBy === "NAME"
                          ? "Nama A-Z"
                          : "Absen Teratas"}
                    </span>
                  </button>
                </div>

                {/* Bulk Actions & View Mode Toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* View Mode Toggle */}
                  <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setViewMode("TABLE")}
                      title="Tampilan Lembar Tabel (Sangat direkomendasikan untuk 30+ siswa)"
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewMode === "TABLE"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <LayoutList className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Tabel Kompak</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("GRID")}
                      title="Tampilan Kartu Grid"
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewMode === "GRID"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Kartu Grid</span>
                    </button>
                  </div>

                  {/* Mark All Present */}
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    title="Atur status seluruh siswa menjadi Hadir dalam 1-klik"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Tandai Semua Hadir</span>
                  </button>

                  {/* Reset */}
                  <button
                    type="button"
                    onClick={handleResetToInitial}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
                    title="Kembalikan status awal"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* STUDENT ROSTER CONTAINER                                   */}
            {/* ========================================================= */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
              {filteredAndSortedStudents.length === 0 ? (
                <div className="p-16 text-center text-slate-400 space-y-2">
                  <Users className="h-8 w-8 mx-auto text-slate-300" />
                  {totalSiswa === 0 ? (
                    <>
                      <p className="text-xs font-bold text-slate-600">
                        Belum ada siswa terdaftar pada rombel ini.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Silakan hubungi staf kurikulum atau administrator untuk penempatan siswa ke
                        rombel ini.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-slate-600">
                        Tidak ada siswa yang sesuai filter.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Coba sesuaikan kata kunci pencarian atau ganti filter status.
                      </p>
                    </>
                  )}
                </div>
              ) : viewMode === "TABLE" ? (
                /* ========================================================= */
                /* MODE LEMBAR TABEL (DATA DENSE ATTENDANCE SHEET)           */
                /* ========================================================= */
                <div className="min-w-full inline-block align-middle">
                  <table className="min-w-full divide-y divide-slate-200/80 text-left">
                    {/* STICKY THEAD */}
                    <thead className="bg-slate-100/95 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200">
                      <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th scope="col" className="w-12 px-3 py-2.5 text-center">
                          No
                        </th>
                        <th scope="col" className="px-3 py-2.5 min-w-[200px]">
                          Siswa
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-center w-[330px]">
                          Status Presensi
                        </th>
                        <th scope="col" className="px-3 py-2.5 min-w-[220px]">
                          Catatan / Keterangan KBM
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredAndSortedStudents.map((s, idx) => {
                        const currentStatus = items[s.siswa_id]?.status || "HADIR";
                        const currentCatatan = items[s.siswa_id]?.catatan || "";
                        const isAbsent = currentStatus !== "HADIR";

                        return (
                          <tr
                            key={s.siswa_id}
                            className={`transition-colors ${
                              isAbsent
                                ? "bg-rose-50/30 hover:bg-rose-50/50"
                                : idx % 2 === 0
                                  ? "bg-white hover:bg-slate-50/80"
                                  : "bg-slate-50/30 hover:bg-slate-50/80"
                            }`}
                          >
                            {/* No. Absen */}
                            <td className="px-3 py-2 text-center text-xs font-bold text-slate-500">
                              <span
                                className={`inline-flex items-center justify-center size-6 rounded-lg text-[11px] font-bold ${
                                  isAbsent
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {s.nomor_absen || idx + 1}
                              </span>
                            </td>

                            {/* Identitas Siswa */}
                            <td className="px-3 py-2 min-w-[200px]">
                              <div className="flex items-center gap-2.5">
                                <div className="size-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 overflow-hidden">
                                  {s.foto_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={s.foto_url}
                                      alt={s.nama_lengkap}
                                      className="size-full object-cover"
                                    />
                                  ) : (
                                    s.nama_lengkap.slice(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate leading-snug">
                                    {s.nama_lengkap}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono leading-none pt-0.5">
                                    {s.nisn
                                      ? `NISN: ${s.nisn}`
                                      : s.nis
                                        ? `NIS: ${s.nis}`
                                        : "Siswa Aktif"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Segmented Control Status */}
                            <td className="px-3 py-2 text-center w-[330px]">
                              <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200/80 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(s.siswa_id, "HADIR")}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    currentStatus === "HADIR"
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-emerald-700 hover:bg-white"
                                  }`}
                                >
                                  Hadir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(s.siswa_id, "IZIN")}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    currentStatus === "IZIN"
                                      ? "bg-sky-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-sky-700 hover:bg-white"
                                  }`}
                                >
                                  Izin
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(s.siswa_id, "SAKIT")}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    currentStatus === "SAKIT"
                                      ? "bg-amber-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-amber-700 hover:bg-white"
                                  }`}
                                >
                                  Sakit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(s.siswa_id, "ALPHA")}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    currentStatus === "ALPHA"
                                      ? "bg-rose-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-rose-700 hover:bg-white"
                                  }`}
                                >
                                  Alpha
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(s.siswa_id, "DISPENSASI")}
                                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    currentStatus === "DISPENSASI"
                                      ? "bg-purple-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-purple-700 hover:bg-white"
                                  }`}
                                >
                                  Disp.
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(s.siswa_id, "TERLAMBAT")}
                                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    currentStatus === "TERLAMBAT"
                                      ? "bg-orange-600 text-white shadow-xs"
                                      : "text-slate-600 hover:text-orange-700 hover:bg-white"
                                  }`}
                                >
                                  Terl.
                                </button>
                              </div>
                            </td>

                            {/* Catatan / Keterangan KBM (Hanya aktif jika tidak Hadir) */}
                            <td className="px-3 py-2 min-w-[220px]">
                              {isAbsent ? (
                                <input
                                  type="text"
                                  value={currentCatatan}
                                  onChange={(e) => handleCatatanChange(s.siswa_id, e.target.value)}
                                  placeholder="Alasan / no surat..."
                                  className="w-full px-2.5 py-1 rounded-xl text-xs border border-amber-300 bg-amber-50/50 text-slate-900 font-medium placeholder-amber-700/60 focus:bg-white focus:ring-2 focus:ring-amber-400 shadow-2xs"
                                  autoFocus
                                />
                              ) : (
                                <span className="text-[11px] text-slate-400 italic pl-1">
                                  — Hadir tepat waktu —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ========================================================= */
                /* MODE KARTU GRID (COMPACT GRID VIEW)                       */
                /* ========================================================= */
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredAndSortedStudents.map((s, idx) => {
                    const currentStatus = items[s.siswa_id]?.status || "HADIR";
                    const currentCatatan = items[s.siswa_id]?.catatan || "";
                    const isAbsent = currentStatus !== "HADIR";

                    return (
                      <div
                        key={s.siswa_id}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                          isAbsent
                            ? "bg-rose-50/40 border-rose-200/80 shadow-2xs"
                            : "bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`size-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                isAbsent
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {s.nomor_absen || idx + 1}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {s.nama_lengkap}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                {s.nisn ? `NISN: ${s.nisn}` : s.nis ? `NIS: ${s.nis}` : "Siswa"}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                              currentStatus === "HADIR"
                                ? "bg-emerald-100 text-emerald-700"
                                : currentStatus === "IZIN"
                                  ? "bg-sky-100 text-sky-700"
                                  : currentStatus === "SAKIT"
                                    ? "bg-amber-100 text-amber-700"
                                    : currentStatus === "ALPHA"
                                      ? "bg-rose-100 text-rose-700"
                                      : currentStatus === "DISPENSASI"
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {currentStatus}
                          </span>
                        </div>

                        {/* Status Buttons in Card */}
                        <div className="flex rounded-xl p-0.5 bg-slate-100 border border-slate-200/80 justify-between">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.siswa_id, "HADIR")}
                            className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                              currentStatus === "HADIR"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-emerald-700"
                            }`}
                          >
                            Hadir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.siswa_id, "IZIN")}
                            className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                              currentStatus === "IZIN"
                                ? "bg-sky-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-sky-700"
                            }`}
                          >
                            Izin
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.siswa_id, "SAKIT")}
                            className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                              currentStatus === "SAKIT"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-amber-700"
                            }`}
                          >
                            Sakit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.siswa_id, "ALPHA")}
                            className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                              currentStatus === "ALPHA"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-rose-700"
                            }`}
                          >
                            Alpha
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.siswa_id, "DISPENSASI")}
                            className={`px-1.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                              currentStatus === "DISPENSASI"
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-purple-700"
                            }`}
                          >
                            Disp.
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.siswa_id, "TERLAMBAT")}
                            className={`px-1.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                              currentStatus === "TERLAMBAT"
                                ? "bg-orange-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-orange-700"
                            }`}
                          >
                            Terl.
                          </button>
                        </div>

                        {/* Catatan Field (Hanya jika tidak Hadir) */}
                        {isAbsent && (
                          <input
                            type="text"
                            value={currentCatatan}
                            onChange={(e) => handleCatatanChange(s.siswa_id, e.target.value)}
                            placeholder="Alasan / no surat..."
                            className="w-full px-2.5 py-1 rounded-xl border border-amber-300 bg-amber-50/50 text-xs text-slate-850 placeholder-amber-700/60 focus:bg-white focus:ring-1 focus:ring-amber-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* FOOTER MODAL (STICKY AUDIT & ACTION FOOTER)               */}
            {/* ========================================================= */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/95 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              {/* Alasan Koreksi jika sudah pernah diabsen */}
              <div className="flex-1 max-w-md">
                {sessionData?.sudah_diabsen ? (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                    <input
                      type="text"
                      value={alasanKoreksi}
                      onChange={(e) => setAlasanKoreksi(e.target.value)}
                      placeholder="Alasan koreksi (opsional)..."
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/40 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    Data presensi langsung tersimpan dan terekam ke rekapitulasi semester.
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menyimpan Presensi...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Simpan Presensi Kelas ({totalSiswa} Siswa)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
