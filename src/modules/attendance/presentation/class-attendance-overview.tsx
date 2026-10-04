"use client";

/**
 * Ruang Pintar — M12 Class Attendance Overview Component
 *
 * Pusat Presensi Kehadiran Siswa:
 * - Ringkasan KPI Kehadiran Siswa
 * - Sesi Pembelajaran Hari Ini & Sesi Terbuka dengan tombol langsung "Presensi"
 * - Rekapitulasi Kehadiran per Rombongan Belajar (Rombel)
 * - Integrasi langsung dengan SessionAttendanceModal
 */

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  PlayCircle,
  UserCheck,
  TrendingUp,
  Search,
  BookOpen,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Layers,
  TableProperties,
} from "lucide-react";
import { ClassSessionDTO } from "@/modules/schedule/domain/schedule-types";
import { SessionAttendanceModal } from "./session-attendance-modal";
import { ClassAttendanceRecapModal } from "./class-attendance-recap-modal";
import { Toast, ToastType } from "@/shared/components/ui/toast";

export interface ClassAttendanceCardItem {
  penugasanId: string;
  rombelId: string;
  rombelNama: string;
  tingkatNama?: string | null;
  mapelId: string;
  mapelNama: string;
  mapelKode: string;
  guruNama: string;
  stats: {
    total_sesi_terjadwal: number;
    total_sesi_selesai: number;
    total_presensi_diambil: number;
    rata_rata_kehadiran: number;
  };
}

interface ClassAttendanceOverviewProps {
  sessions: ClassSessionDTO[];
  classes: ClassAttendanceCardItem[];
  schoolName: string;
  canManage: boolean;
  isAdmin: boolean;
}

export function ClassAttendanceOverview({
  sessions,
  classes,
  schoolName,
  canManage,
  isAdmin,
}: ClassAttendanceOverviewProps) {
  const [activeTab, setActiveTab] = useState<"sessions" | "classes">("sessions");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState("ALL");
  const [selectedRombel, setSelectedRombel] = useState("ALL");
  const [selectedMapel, setSelectedMapel] = useState("ALL");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedRecapPenugasanId, setSelectedRecapPenugasanId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Perhitungan KPI Ringkasan
  const activeSessionsCount = useMemo(
    () => sessions.filter((s) => s.status === "DIMULAI").length,
    [sessions]
  );
  const completedSessionsCount = useMemo(
    () => sessions.filter((s) => s.status === "SELESAI").length,
    [sessions]
  );
  const averageAttendanceOverall = useMemo(() => {
    const classesWithAttendance = classes.filter((c) => c.stats.total_presensi_diambil > 0);
    if (classesWithAttendance.length === 0) return null;
    const sum = classesWithAttendance.reduce(
      (acc, c) => acc + (c.stats.rata_rata_kehadiran || 0),
      0
    );
    return Math.round(sum / classesWithAttendance.length);
  }, [classes]);

  // Filter Sesi KBM
  const filteredSessions = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => {
      const weekday = new Intl.DateTimeFormat("id-ID", { weekday: "long" })
        .format(new Date(s.tanggal))
        .toUpperCase();
      return (
        (!q ||
          s.rombel_nama.toLowerCase().includes(q) ||
          s.mata_pelajaran_nama.toLowerCase().includes(q) ||
          s.guru_nama.toLowerCase().includes(q) ||
          (s.topik_pembelajaran && s.topik_pembelajaran.toLowerCase().includes(q))) &&
        (selectedDay === "ALL" || weekday === selectedDay) &&
        (selectedRombel === "ALL" || s.rombel_id === selectedRombel) &&
        (selectedMapel === "ALL" || s.mata_pelajaran_id === selectedMapel)
      );
    });
  }, [sessions, searchQuery, selectedDay, selectedRombel, selectedMapel]);

  // Filter Kelas Rombel
  const filteredClasses = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return classes.filter(
      (c) =>
        (!q ||
          c.rombelNama.toLowerCase().includes(q) ||
          c.mapelNama.toLowerCase().includes(q) ||
          c.mapelKode.toLowerCase().includes(q) ||
          c.guruNama.toLowerCase().includes(q)) &&
        (selectedRombel === "ALL" || c.rombelId === selectedRombel) &&
        (selectedMapel === "ALL" || c.mapelId === selectedMapel)
    );
  }, [classes, searchQuery, selectedRombel, selectedMapel]);

  const rombelOptions = useMemo(
    () => Array.from(new Map(classes.map((item) => [item.rombelId, item.rombelNama])).entries()),
    [classes]
  );
  const mapelOptions = useMemo(
    () => Array.from(new Map(classes.map((item) => [item.mapelId, item.mapelNama])).entries()),
    [classes]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DIMULAI":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "SELESAI":
        return "bg-blue-50 text-[#2563EB] border-blue-200";
      case "DIBATALKAN":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}

      {/* Modern Academic Glass Hero Banner */}
      <div className="relative rounded-3xl bg-white border border-slate-100/90 p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-visible">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-50/60 to-transparent rounded-r-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="w-full md:max-w-[70%] space-y-3.5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Link href="/dashboard" className="hover:text-[#2563EB] transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-700 font-semibold">Rekap Presensi</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                  Presensi Kehadiran Siswa
                </h1>
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 font-bold text-xs">
                  {schoolName}
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-2xl">
                Monitoring, audit, dan rekapitulasi kehadiran siswa per rombongan belajar dan
                riwayat sesi KBM. Untuk presensi harian langsung, gunakan Presensi Cepat di
                Dashboard atau Tab Presensi di Ruang Kelas Saya.
              </p>
            </div>

            {/* Quick Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/80 text-xs font-semibold text-emerald-700">
                <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  Kelas Berlangsung: <strong>{activeSessionsCount}</strong>
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-200/80 text-xs font-semibold text-[#2563EB]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#2563EB]" />
                <span>
                  Sesi Selesai: <strong>{completedSessionsCount}</strong>
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50/80 border border-indigo-200/80 text-xs font-semibold text-indigo-700">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                <span>
                  Rata-rata Kehadiran:{" "}
                  <strong>
                    {averageAttendanceOverall !== null ? `${averageAttendanceOverall}%` : "-"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Shortcut Buttons */}
          <div className="flex flex-wrap md:flex-col items-stretch gap-2.5 w-full md:w-auto shrink-0">
            <Link
              href="/kelas-saya"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              <span>Ruang Kelas Saya</span>
            </Link>
            <Link
              href="/sesi-pembelajaran"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <PlayCircle className="h-4 w-4 text-slate-500" />
              <span>Log Sesi KBM</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rombel Diajar
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#2563EB]">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {new Set(classes.map((c) => c.rombelId)).size} Rombel
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{classes.length} Penugasan KBM</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sesi Berlangsung
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <PlayCircle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">{activeSessionsCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Siap diabsen sekarang</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Riwayat Sesi
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-700">{sessions.length}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Pertemuan tercatat</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tingkat Kehadiran
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-indigo-700">
              {averageAttendanceOverall !== null ? `${averageAttendanceOverall}%` : "-"}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {averageAttendanceOverall !== null
                ? "Rata-rata persentase hadir"
                : "Belum ada presensi diambil"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm">
        {/* Symmetric Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "sessions"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Sesi KBM & Presensi Langsung</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100/60 text-blue-700 text-[10px]">
              {sessions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("classes")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "classes"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Rekapitulasi per Rombel</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
              {classes.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari rombel, mapel, guru..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-3">
        <label className="text-xs font-semibold text-slate-500" htmlFor="attendance-day-filter">
          Filter
        </label>
        <select
          id="attendance-day-filter"
          value={selectedDay}
          onChange={(event) => setSelectedDay(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <option value="ALL">Semua hari</option>
          {[
            ["SENIN", "Senin"],
            ["SELASA", "Selasa"],
            ["RABU", "Rabu"],
            ["KAMIS", "Kamis"],
            ["JUMAT", "Jumat"],
            ["SABTU", "Sabtu"],
            ["MINGGU", "Minggu"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter kelas"
          value={selectedRombel}
          onChange={(event) => setSelectedRombel(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <option value="ALL">Semua kelas</option>
          {rombelOptions.map(([value, label]) => (
            <option key={value} value={value}>
              Kelas: {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter mata pelajaran"
          value={selectedMapel}
          onChange={(event) => setSelectedMapel(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <option value="ALL">Semua mata pelajaran</option>
          {mapelOptions.map(([value, label]) => (
            <option key={value} value={value}>
              Mapel: {label}
            </option>
          ))}
        </select>
      </div>

      {/* TAB CONTENT 1: Sesi KBM & Presensi Cepat */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Tanggal & Waktu Aktual</th>
                    <th className="px-4 py-3.5">Rombel & Mapel</th>
                    <th className="px-4 py-3.5">Guru Pengampu</th>
                    <th className="px-4 py-3.5">Topik / Ruangan</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi Presensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-400 text-xs sm:text-sm"
                      >
                        Tidak ada data sesi kelas yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            {new Date(s.tanggal).toLocaleDateString("id-ID", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 font-mono">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>
                              {s.jam_mulai_aktual
                                ? new Date(s.jam_mulai_aktual).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                              {s.jam_selesai_aktual
                                ? ` - ${new Date(s.jam_selesai_aktual).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}`
                                : " (Aktif)"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-900 block">
                            {s.mata_pelajaran_nama}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold block">
                            {s.rombel_nama}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 block">{s.guru_nama}</span>
                          {s.guru_pengganti_nama && (
                            <span className="text-[11px] text-amber-600 font-medium block">
                              Pengganti: {s.guru_pengganti_nama}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-slate-800 block truncate max-w-xs">
                            {s.topik_pembelajaran || "Tanpa topik khusus"}
                          </span>
                          {s.ruangan_aktual && (
                            <span className="text-[11px] text-blue-600 font-semibold block">
                              Ruang: {s.ruangan_aktual}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                              s.status
                            )}`}
                          >
                            {s.status === "DIMULAI"
                              ? "Berlangsung"
                              : s.status === "SELESAI"
                                ? "Selesai"
                                : s.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedSessionId(s.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Presensi</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Rekapitulasi per Rombel */}
      {activeTab === "classes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-sm">
              Tidak ada data rombongan belajar yang cocok dengan pencarian.
            </div>
          ) : (
            filteredClasses.map((c) => (
              <div
                key={c.penugasanId}
                className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#2563EB] font-bold text-xs border border-blue-200/60">
                      {c.mapelKode}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                      {c.stats.rata_rata_kehadiran}% Kehadiran
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {c.mapelNama}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Rombel: {c.rombelNama} {c.tingkatNama ? `• ${c.tingkatNama}` : ""}
                    </p>
                    {isAdmin && (
                      <p className="text-[11px] text-slate-400 mt-1">Pengampu: {c.guruNama}</p>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Total Sesi</span>
                    <span className="font-bold text-slate-800">
                      {c.stats.total_sesi_terjadwal} Sesi
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Presensi Terekam
                    </span>
                    <span className="font-bold text-emerald-600">
                      {c.stats.total_presensi_diambil} Sesi
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedRecapPenugasanId(c.penugasanId)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs border border-blue-200/80 transition-colors cursor-pointer"
                  >
                    <TableProperties className="h-3.5 w-3.5" />
                    <span>Lihat Rekap Siswa</span>
                  </button>

                  <Link
                    href={`/kelas-saya/${c.penugasanId}?tab=presensi`}
                    className="flex items-center justify-center px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
                    title="Buka Lembar Presensi Kelas Lengkap"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Rekapitulasi Presensi Siswa */}
      <ClassAttendanceRecapModal
        penugasanId={selectedRecapPenugasanId}
        isOpen={Boolean(selectedRecapPenugasanId)}
        onClose={() => setSelectedRecapPenugasanId(null)}
      />

      {/* Modal Presensi Sesi Kelas */}
      <SessionAttendanceModal
        sesiId={selectedSessionId}
        isOpen={Boolean(selectedSessionId)}
        onClose={() => setSelectedSessionId(null)}
        onSuccess={(msg) => {
          setToast({ message: msg, type: "success" });
          setSelectedSessionId(null);
        }}
        onError={(err) => setToast({ message: err, type: "error" })}
      />
    </div>
  );
}
