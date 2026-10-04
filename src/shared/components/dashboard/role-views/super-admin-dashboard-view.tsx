"use client";

import * as React from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  Building2,
  Calendar,
  School,
  Activity,
  ArrowRight,
  TrendingUp,
  Eye,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Server,
  Clock,
  Layers,
  HardDrive,
  FileCheck,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Laptop,
  Smartphone,
  Tablet,
  X,
  CreditCard,
  Plus,
  BarChart3,
  Flame,
  Info,
} from "lucide-react";
import { SystemStatusIndicator } from "@/shared/components/dashboard/system-status-indicator";
import { ConcentricRingGauge } from "@/shared/components/motion/concentric-ring-gauge";
import { AnimatedCounter } from "@/shared/components/motion/animated-counter";

export interface SuperAdminDashboardViewProps {
  user: {
    nama_lengkap: string;
    peran_dasar: string;
    username: string;
  };
  stats: {
    totalSiswa: number;
    totalGuru: number;
    totalSekolah: number;
    totalSekolahFreemium: number;
    totalSekolahInstitusi: number;
    totalRombel: number;
    totalSesiAktual: number;
    totalMataPelajaran: number;
    totalRapor: number;
  };
  telemetry: {
    concurrencyActive: number;
    peakEstimate: number;
    cbtTotal: number;
    cbtActive: number;
    cbtRunningSessions: number;
    cbtCompletedSessions: number;
    p95LatencyMs: number;
    storageFilesCount: number;
    storageTotalMb: number;
    aiRequestsCount: number;
    failedLoginLast24h: number;
    estimatedMrr: number;
  };
  attendance: {
    totalPresensiRecorded: number;
    totalPresensiHadir: number;
    totalPresensiIzinSakit: number;
    totalPresensiAlpha: number;
    hadirPct: number;
    izinSakitPct: number;
    alphaPct: number;
  };
  rombelList: Array<{
    id: string;
    nama: string;
    siswaCount: number;
    mapelNama: string;
    guruNama: string;
    completion: number;
    sessionCount: number;
  }>;
  sekolahList: Array<{
    id: string;
    nama: string;
    npsn: string | null;
    jenjang: string;
    tipe_lisensi: string;
    statusAktif: boolean;
    rombelCount: number;
    siswaCount: number;
    guruCount: number;
    cbtCount: number;
    guruKontak: string;
  }>;
  guruList: Array<{
    id: string;
    nama_lengkap: string;
    email: string | null;
    sekolahNama: string;
    penugasanCount: number;
  }>;
  auditLogs: Array<{
    id: string;
    aktor_role: string;
    aksi: string;
    tipe_sumber: string;
    id_sumber: string;
    dibuat_pada: string;
    timeAgo: string;
    payload_sebelum?: string | null;
    payload_sesudah?: string | null;
    ip_address?: string | null;
  }>;
  deviceStats: {
    mobilePct: number;
    desktopPct: number;
    sesiList: Array<{
      id: string;
      nama: string;
      sekolah: string;
      deviceType: "mobile" | "tablet" | "desktop";
      deviceBrand: string;
      presenceLabel: string;
      presenceBadgeClass: string;
      presenceDotClass: string;
    }>;
  };
  activityDays?: {
    SENIN?: number;
    SELASA?: number;
    RABU?: number;
    KAMIS?: number;
    JUMAT?: number;
    SABTU?: number;
  };
}

export function SuperAdminDashboardView({
  user: _user,
  stats,
  telemetry,
  attendance,
  rombelList,
  sekolahList,
  guruList: _guruList,
  auditLogs,
  deviceStats: _deviceStats,
  activityDays,
}: SuperAdminDashboardViewProps) {
  // Live Server Clock
  const [clockWib, setClockWib] = React.useState<string>("");

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      setClockWib(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
    };
    update();

    if (process.env.NODE_ENV === "test") {
      return;
    }

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cursor Spotlight Animation State
  const [mousePos, setMousePos] = React.useState({ x: -1000, y: -1000 });
  const [isHovering, setIsHovering] = React.useState(false);

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  // Pagination for Performa Rombongan Belajar (5 items per page)
  const [rombelPage, setRombelPage] = React.useState(1);
  const ROMBEL_PAGE_SIZE = 5;
  const totalRombelPages = Math.max(1, Math.ceil(rombelList.length / ROMBEL_PAGE_SIZE));
  const paginatedRombel = React.useMemo(() => {
    const start = (rombelPage - 1) * ROMBEL_PAGE_SIZE;
    return rombelList.slice(start, start + ROMBEL_PAGE_SIZE);
  }, [rombelList, rombelPage]);

  // Filter & Pagination for Audit Trail (5 items per page)
  const [auditFilterAksi, setAuditFilterAksi] = React.useState<string>("ALL");
  const [auditPage, setAuditPage] = React.useState(1);
  const AUDIT_PAGE_SIZE = 5;

  const filteredAuditLogs = React.useMemo(() => {
    if (auditFilterAksi === "ALL") return auditLogs;
    return auditLogs.filter((log) => log.aksi === auditFilterAksi);
  }, [auditLogs, auditFilterAksi]);

  const totalAuditPages = Math.max(1, Math.ceil(filteredAuditLogs.length / AUDIT_PAGE_SIZE));
  const paginatedAuditLogs = React.useMemo(() => {
    const start = (auditPage - 1) * AUDIT_PAGE_SIZE;
    return filteredAuditLogs.slice(start, start + AUDIT_PAGE_SIZE);
  }, [filteredAuditLogs, auditPage]);

  // Selected Log for Activity Detail Modal
  const [selectedLog, setSelectedLog] = React.useState<(typeof auditLogs)[0] | null>(null);
  const [isClosingModal, setIsClosingModal] = React.useState(false);

  const handleOpenLogModal = React.useCallback((log: (typeof auditLogs)[0]) => {
    setSelectedLog(log);
    setIsClosingModal(false);
  }, []);

  const handleCloseLogModal = React.useCallback(() => {
    setIsClosingModal(true);
    setTimeout(() => {
      setSelectedLog(null);
      setIsClosingModal(false);
    }, 200);
  }, []);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedLog) {
        handleCloseLogModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLog, handleCloseLogModal]);

  // Interactive Day Hover for Ringkasan Aktivitas Pembelajaran
  const [hoveredDay, setHoveredDay] = React.useState<number | null>(null);

  // Sebaran Hari Riil KBM Berdasarkan Data Sesi Database (Senin s/d Sabtu)
  const daysActivity = React.useMemo(() => {
    const dayKeys: Array<{ label: string; key: keyof NonNullable<typeof activityDays> }> = [
      { label: "Senin", key: "SENIN" },
      { label: "Selasa", key: "SELASA" },
      { label: "Rabu", key: "RABU" },
      { label: "Kamis", key: "KAMIS" },
      { label: "Jumat", key: "JUMAT" },
      { label: "Sabtu", key: "SABTU" },
    ];

    return dayKeys.map(({ label, key }) => {
      const count = activityDays?.[key] ?? 0;
      return {
        day: label,
        count,
        pct: stats.totalSesiAktual > 0 ? Math.round((count / stats.totalSesiAktual) * 100) : 0,
      };
    });
  }, [activityDays, stats.totalSesiAktual]);

  // Kalkulasi Koordinat Matematis Murni (X & Y Dinamis sesuai Count)
  const chartPoints = React.useMemo(() => {
    const xCoords = [35, 120, 205, 295, 385, 465];
    const maxVal = Math.max(...daysActivity.map((d) => d.count), 1);

    return daysActivity.map((d, i) => {
      // Dasar grafik pada y = 105 (0 sesi). Puncak grafik pada y = 25 (maksimal sesi).
      const y = Math.round(105 - (d.count / maxVal) * 80);
      return {
        x: xCoords[i],
        y,
        day: d.day,
        count: d.count,
        pct: d.pct,
      };
    });
  }, [daysActivity]);

  // Konstruksi Path Garis & Area Kurva Berbasis Koordinat Riil
  const { linePath, areaPath } = React.useMemo(() => {
    if (chartPoints.length === 0) return { linePath: "", areaPath: "" };

    let line = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      const prev = chartPoints[i - 1];
      const curr = chartPoints[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    const firstX = chartPoints[0].x;
    const lastX = chartPoints[chartPoints.length - 1].x;
    const area = `${line} L ${lastX} 115 L ${firstX} 115 Z`;

    return { linePath: line, areaPath: area };
  }, [chartPoints]);

  // Deteksi Hari Teraktif Riil Berdasarkan Nilai Tertinggi
  const peakDayInfo = React.useMemo(() => {
    let max = -1;
    let peakDays: string[] = [];
    for (const d of daysActivity) {
      if (d.count > max) {
        max = d.count;
        peakDays = [d.day];
      } else if (d.count === max && max > 0) {
        peakDays.push(d.day);
      }
    }
    if (max <= 0) return "Belum Ada Sesi";
    return peakDays.join(" & ");
  }, [daysActivity]);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="relative space-y-6 sm:space-y-7 pb-20 font-lato overflow-hidden pt-2 sm:pt-1 scroll-smooth"
    >
      {/* ─────────────────────────────────────────────────────────────
          CURSOR SPOTLIGHT INTERACTIVE ANIMATION (LUXURY SAAS GLOW)
      ───────────────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 hidden md:block"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(37, 99, 235, 0.07), transparent 75%)`,
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          1. TOPBAR & DASHBOARD HEADER (Contract Match & Blue Gradient)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in-50 duration-300">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-lato">
              Dashboard Super Admin
            </h1>
            {/* Year Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-blue-700/15 border border-blue-500/30 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-2xs whitespace-nowrap">
              <Calendar className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Tahun Ajaran 2026/2027</span>
            </div>
          </div>
          {/* Subtitle contract string */}
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal font-lato">
            Pusat pemantauan ekosistem SaaS: adopsi sekolah, guru mandiri, dan operasional akademik.
          </p>
        </div>

        {/* Right Controls: Sidebar-style Gradient Blue Pills (Tanpa Hitam) */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Concurrency Badge */}
          <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#1E40AF] text-white flex items-center gap-2 shadow-md shadow-blue-500/15 border border-blue-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5">
            <Activity className="size-4 text-cyan-300 animate-pulse" />
            <span className="text-xs font-mono font-bold text-cyan-200">
              {telemetry.concurrencyActive} Live Sesi
            </span>
          </div>

          {/* Clock */}
          <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#1E40AF] text-white flex items-center gap-2 shadow-md shadow-blue-500/15 border border-blue-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5">
            <Clock className="size-4 text-blue-200" />
            <span className="text-xs font-mono font-bold text-white tracking-wider">
              {clockWib || "08.00.00 WIB"}
            </span>
          </div>

          {/* Operational Status Indicator */}
          <div className="p-1 rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-xs border border-blue-100 dark:border-slate-800 shrink-0">
            <SystemStatusIndicator initialStatus="normal" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MISSION CONTROL EXECUTIVE TELEMETRY STRIP (Sidebar Gradient Blue)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 p-5 rounded-3xl bg-gradient-to-br from-[#1E3A8A] via-[#1D4ED8] to-[#1E40AF] text-white shadow-xl shadow-blue-900/20 border border-blue-400/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden animate-in fade-in-50 slide-in-from-bottom-2 duration-400">
        {/* Metric 1: MRR & Monetization */}
        <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-white/10 flex items-center gap-3.5 transition-all duration-300 hover:bg-white/15 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="size-11 rounded-2xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 shadow-inner">
            <CreditCard className="size-5.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold tracking-wider text-blue-200 block">
              Estimasi MRR SaaS
            </span>
            <span className="text-lg font-black font-mono text-emerald-300 block truncate mt-0.5">
              Rp {telemetry.estimatedMrr.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Metric 2: Live CBT Concurrency */}
        <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-white/10 flex items-center gap-3.5 transition-all duration-300 hover:bg-white/15 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="size-11 rounded-2xl bg-purple-400/20 text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldCheck className="size-5.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold tracking-wider text-blue-200 block">
              Beban Ujian CBT Live
            </span>
            <span className="text-lg font-black font-mono text-purple-200 block truncate mt-0.5">
              {telemetry.cbtRunningSessions} Sesi Berjalan
            </span>
          </div>
        </div>

        {/* Metric 3: Storage & Footprint */}
        <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-white/10 flex items-center gap-3.5 transition-all duration-300 hover:bg-white/15 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="size-11 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
            <HardDrive className="size-5.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold tracking-wider text-blue-200 block">
              Disk Storage & AI
            </span>
            <span className="text-lg font-black font-mono text-amber-200 block truncate mt-0.5">
              {telemetry.storageTotalMb} MB ({telemetry.storageFilesCount} Berkas)
            </span>
          </div>
        </div>

        {/* Metric 4: Platform Health */}
        <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-white/10 flex items-center gap-3.5 transition-all duration-300 hover:bg-white/15 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="size-11 rounded-2xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0 shadow-inner">
            <Server className="size-5.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase font-bold tracking-wider text-blue-200 block">
              SLA & Latensi p95
            </span>
            <span className="text-lg font-black font-mono text-cyan-200 block truncate mt-0.5">
              99.98% • {telemetry.p95LatencyMs}ms p95
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. AKSI CEPAT SUPER ADMIN TOOLBAR (Contract Match)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-blue-100 dark:border-slate-800 shadow-sm animate-in fade-in-50 duration-400">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mr-1 font-lato">
            Aksi Cepat Super Admin
          </span>
          <Link
            href="/sekolah"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md shrink-0"
          >
            <Plus className="size-3.5" />
            <span>Daftarkan Sekolah Baru</span>
          </Link>
          <Link
            href="/data-siswa"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 shrink-0"
          >
            <Users className="size-3.5 text-indigo-500" />
            <span>Data Siswa ({stats.totalSiswa})</span>
          </Link>
          <Link
            href="/guru-pengajaran"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 shrink-0"
          >
            <GraduationCap className="size-3.5 text-emerald-500" />
            <span>Direktori Guru ({stats.totalGuru})</span>
          </Link>
          <Link
            href="/cbt-ujian"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 shrink-0"
          >
            <ShieldCheck className="size-3.5 text-purple-500" />
            <span>Bilik CBT ({telemetry.cbtTotal})</span>
          </Link>
          <Link
            href="/rapor-siswa"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 shrink-0"
          >
            <FileCheck className="size-3.5 text-amber-500" />
            <span>e-Rapor Merdeka</span>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. KEY METRICS ROW (4-Column Stat Cards - Contract Match)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Siswa Terdata */}
        <div className="rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-400/50">
          <div className="flex items-center justify-between">
            <div className="size-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Users className="size-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl whitespace-nowrap">
              <span>Real Siswa</span>
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-lato">
              Total Siswa Terdata
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono">
              <AnimatedCounter value={stats.totalSiswa} />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
              {stats.totalSiswa > 0
                ? `${stats.totalSiswa} siswa terdaftar di database`
                : "Belum ada siswa terdaftar"}
            </p>
          </div>
        </div>

        {/* Card 2: Guru Terdaftar (SaaS) */}
        <div className="rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-400/50">
          <div className="flex items-center justify-between">
            <div className="size-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <GraduationCap className="size-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl whitespace-nowrap">
              <span>{stats.totalGuru > 0 ? "Aktif" : "0 Guru"}</span>
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-lato">
              Guru Terdaftar (SaaS)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono">
              <AnimatedCounter value={stats.totalGuru} />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
              {stats.totalGuru > 0
                ? `${stats.totalGuru} pendidik siap mengajar & mengelola KBM`
                : "Belum ada guru yang mendaftar"}
            </p>
          </div>
        </div>

        {/* Card 3: Total Sekolah Pengguna */}
        <div className="rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-amber-400/50">
          <div className="flex items-center justify-between">
            <div className="size-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <School className="size-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-xl whitespace-nowrap">
              <span>{stats.totalSekolahInstitusi} Institusi</span>
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-lato">
              Total Sekolah Pengguna
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono">
              <AnimatedCounter value={stats.totalSekolah} />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
              {stats.totalSekolahFreemium} Freemium • {stats.totalSekolahInstitusi} Lisensi Penuh
            </p>
          </div>
        </div>

        {/* Card 4: Total Rombel / Kelas */}
        <div className="rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-rose-400/50">
          <div className="flex items-center justify-between">
            <div className="size-11 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Building2 className="size-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-xl whitespace-nowrap">
              <span>{stats.totalRombel > 0 ? "Rombel Aktif" : "0 Rombel"}</span>
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-lato">
              Total Rombel / Kelas
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono">
              <AnimatedCounter value={stats.totalRombel} />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
              {stats.totalRombel > 0
                ? `${stats.totalRombel} rombongan belajar terjadwal`
                : "Belum ada rombel terdaftar"}
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. TENANT DIRECTORY COCKPIT (Pusat Pengawasan Sekolah B2B)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight font-lato">
                Direktori Tenant Sekolah & Lisensi Aktif
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Supervisi data multi-tenant, kuota siswa, lisensi B2B, dan kesehatan operasional
              institusi
            </p>
          </div>
          <Link
            href="/sekolah"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
          >
            <span>Buka Manajemen Tenant</span>
            <ExternalLink className="size-3 text-slate-400" />
          </Link>
        </div>

        <div className="overflow-x-auto no-scrollbar pt-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
                <th className="pb-3 pr-4 font-semibold">Nama Sekolah & NPSN</th>
                <th className="pb-3 pr-4 font-semibold">Jenjang & Lisensi</th>
                <th className="pb-3 pr-4 font-semibold">Roster (Siswa / Guru)</th>
                <th className="pb-3 pr-4 font-semibold">Rombel & CBT</th>
                <th className="pb-3 text-right font-semibold">Status & Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sekolahList.map((sch) => (
                <tr
                  key={sch.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                >
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs font-mono">
                        {sch.nama.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm block">
                          {sch.nama}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          NPSN: {sch.npsn || "Belum Terdaftar"} • ID: {sch.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        {sch.tipe_lisensi === "SEKOLAH" ? "INSTITUSI LISENSI" : "FREEMIUM"}
                      </span>
                      <span className="text-[11px] text-slate-500 block">{sch.jenjang}</span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 font-mono">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {sch.siswaCount} Siswa
                    </span>{" "}
                    • <span className="text-slate-500">{sch.guruCount} Guru</span>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-slate-700 dark:text-slate-300">
                    <span>{sch.rombelCount} Rombel</span> • <span>{sch.cbtCount} Ujian CBT</span>
                  </td>
                  <td className="py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        Aktif
                      </span>
                      <Link
                        href={`/kelas-saya`}
                        className="ml-2 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition"
                      >
                        Lihat Kelas
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. ACADEMIC PULSE: Ringkasan Aktivitas Pembelajaran & Engagement
      ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-stretch">
        {/* Left 6 Cols: Ringkasan Aktivitas Pembelajaran (Kurva Dinamis & Interaktif) */}
        <div className="lg:col-span-6 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:border-blue-400/40">
          <div>
            <div className="flex items-center justify-between pb-2 flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight font-lato">
                    Ringkasan Aktivitas Pembelajaran
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Monitoring frekuensi pelaksanaan sesi Kegiatan Belajar Mengajar (KBM) harian oleh
                  guru di kelas
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-[11px] font-bold">
                <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Live KBM Sync</span>
              </div>
            </div>

            {/* Interactive Dynamic Wave & Data Points */}
            <div className="pt-4 relative">
              <svg className="w-full h-36 overflow-visible" viewBox="0 0 500 120">
                <defs>
                  <linearGradient id="realWaveGradBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                <line
                  x1="0"
                  y1="25"
                  x2="500"
                  y2="25"
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="65"
                  x2="500"
                  y2="65"
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="105"
                  x2="500"
                  y2="105"
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeDasharray="3 3"
                />

                {/* Area path */}
                {areaPath && (
                  <path
                    d={areaPath}
                    fill="url(#realWaveGradBlue)"
                    className="transition-all duration-500 ease-out"
                  />
                )}
                {/* Wave Curve */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500 ease-out"
                  />
                )}

                {/* Interactive Day Points */}
                {chartPoints.map((pt, i) => (
                  <g
                    key={pt.day}
                    onMouseEnter={() => setHoveredDay(i)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="cursor-pointer group"
                  >
                    {/* Hover Pulse Ring */}
                    {hoveredDay === i && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={10}
                        className="fill-blue-500/20 stroke-blue-500/40 stroke-1 animate-pulse"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredDay === i ? 6.5 : 4.5}
                      className={`stroke-white dark:stroke-slate-900 stroke-2 transition-all duration-200 ${
                        pt.count > 0 ? "fill-blue-600" : "fill-slate-400 dark:fill-slate-600"
                      }`}
                    />
                    {/* Tooltip Badge on SVG Hover */}
                    {hoveredDay === i && (
                      <g className="pointer-events-none transition-all">
                        <rect
                          x={Math.max(8, Math.min(410, pt.x - 42))}
                          y={Math.max(4, pt.y - 28)}
                          width="84"
                          height="20"
                          rx="5"
                          className="fill-slate-900/90 dark:fill-slate-800/95 stroke-slate-700/50 stroke-1 shadow-sm"
                        />
                        <text
                          x={Math.max(8, Math.min(410, pt.x - 42)) + 42}
                          y={Math.max(4, pt.y - 28) + 14}
                          textAnchor="middle"
                          className="text-[10px] font-bold fill-white font-mono"
                        >
                          {pt.day}: {pt.count} sesi
                        </text>
                      </g>
                    )}
                  </g>
                ))}
              </svg>

              {/* Day Labels and Activity Tooltips */}
              <div className="grid grid-cols-6 text-center text-xs font-bold text-slate-500 dark:text-slate-400 pt-2 px-1">
                {daysActivity.map((d, i) => (
                  <div
                    key={d.day}
                    onMouseEnter={() => setHoveredDay(i)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`py-1 rounded-xl transition-all cursor-pointer ${
                      hoveredDay === i
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-extrabold shadow-2xs"
                        : "hover:text-blue-600"
                    }`}
                  >
                    <span className="block text-[11px]">{d.day}</span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      {d.count} Sesi
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Insights: Kenapa grafik ini sangat penting & informatif */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Hari Teraktif
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400 text-xs mt-0.5 block">
                {peakDayInfo}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Total Sesi KBM
              </span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">
                {stats.totalSesiAktual} Sesi Terdata
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Status KBM
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5 block">
                {stats.totalSesiAktual > 0 ? "Sesi Berjalan" : "Terkoneksi"}
              </span>
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Learner Engagement Ring Gauge & Quick Stats */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 flex-1 transition-all duration-300 hover:shadow-lg hover:border-blue-400/40">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight font-lato">
                Learner Engagement
              </h2>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Keaktifan Siswa
              </span>
            </div>

            <div className="pt-2">
              <ConcentricRingGauge
                title=""
                subtitle=""
                centerValue={attendance.hadirPct}
                centerLabel={
                  attendance.totalPresensiRecorded > 0 ? "Rata-rata Kehadiran" : "0 Sesi Masuk"
                }
                segments={[
                  {
                    id: "hadir",
                    label: "Siswa Hadir Tepat Waktu",
                    count: attendance.totalPresensiHadir,
                    percentage: attendance.hadirPct,
                    color: "#2563EB",
                    strokeColor: "#2563EB",
                    bgColor: "bg-blue-500",
                  },
                  {
                    id: "izinsakit",
                    label: "Izin & Sakit Terverifikasi",
                    count: attendance.totalPresensiIzinSakit,
                    percentage: attendance.izinSakitPct,
                    color: "#F59E0B",
                    strokeColor: "#F59E0B",
                    bgColor: "bg-amber-500",
                  },
                  {
                    id: "alpha",
                    label: "Alpha / Perlu Perhatian",
                    count: attendance.totalPresensiAlpha,
                    percentage: attendance.alphaPct,
                    color: "#F43F5E",
                    strokeColor: "#F43F5E",
                    bgColor: "bg-rose-500",
                  },
                ]}
              />
            </div>
          </div>

          {/* Quick Stats Widget: Gradient Blue seperti Sidebar (Bukan Hitam) */}
          <div className="rounded-2xl bg-gradient-to-br from-[#1D4ED8] via-[#2563EB] to-[#1E40AF] text-white p-5 sm:p-6 shadow-lg shadow-blue-600/20 border border-blue-400/40 space-y-3 transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-blue-200">
                Penyampaian Nilai Akademik
              </span>
              <FileCheck className="size-4 text-emerald-300" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1 font-mono">
              <div>
                <span className="text-2xl font-black text-white">{stats.totalRapor}</span>
                <span className="text-[11px] text-blue-200 block font-lato font-normal">
                  e-Rapor Dicetak
                </span>
              </div>
              <div>
                <span className="text-2xl font-black text-white">{stats.totalMataPelajaran}</span>
                <span className="text-[11px] text-blue-200 block font-lato font-normal">
                  Mata Pelajaran Aktif
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          7. DUA KOLOM BERSEBELAHAN RAMPING DENGAN PAGINATION (5 ITEMS/HAL):
             - KOLOM KIRI: Performa Rombongan Belajar & KBM
             - KOLOM KANAN: Audit Trail Transaksi & Mutasi Sistem
      ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 items-start">
        {/* ── KOLOM KIRI: PERFORMA ROMBONGAN BELAJAR & KBM (5 Baris / Halaman) ── */}
        <div className="rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4 transition-all duration-300 hover:shadow-lg hover:border-blue-400/40">
          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="size-4.5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight font-lato">
                  Performa Rombongan Belajar & KBM
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Data tingkat kehadiran & siswa terdaftar (5 kelas per halaman)
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-900">
              <span>{rombelList.length} Rombel</span>
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar pt-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-3 pr-3 font-semibold">Kelas & Guru</th>
                  <th className="pb-3 pr-3 font-semibold">Siswa & Mapel</th>
                  <th className="pb-3 text-right font-semibold">Status KBM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedRombel.length > 0 ? (
                  paginatedRombel.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                            {item.nama.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-blue-600 transition-colors truncate">
                              {item.nama}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.guruNama}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {item.siswaCount} Siswa
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.mapelNama}
                        </div>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 font-mono">
                          {item.sessionCount > 0 ? `${item.completion}% Hadir` : "0 Sesi"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                      Belum ada data rombel aktif.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Rombel */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Hal <span className="font-bold text-slate-800 dark:text-white">{rombelPage}</span>{" "}
              dari {totalRombelPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRombelPage((p) => Math.max(1, p - 1))}
                disabled={rombelPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setRombelPage((p) => Math.min(totalRombelPages, p + 1))}
                disabled={rombelPage === totalRombelPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── KOLOM KANAN: AUDIT TRAIL TRANSAKSI & MUTASI SISTEM (5 Baris / Halaman) ── */}
        <div className="rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4 transition-all duration-300 hover:shadow-lg hover:border-blue-400/40">
          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight font-lato">
                  Audit Trail Transaksi & Mutasi Sistem
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Append-only log mutasi data platform (5 transaksi per halaman)
              </p>
            </div>
            {/* Inline Filter Aksi Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {["ALL", "CREATE", "UPDATE", "DELETE"].map((aksi) => (
                <button
                  key={aksi}
                  type="button"
                  onClick={() => {
                    setAuditFilterAksi(aksi);
                    setAuditPage(1);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    auditFilterAksi === aksi
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {aksi}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar pt-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-3 pr-2 font-semibold">Waktu & Aktor</th>
                  <th className="pb-3 pr-2 font-semibold">Tindakan & Modul</th>
                  <th className="pb-3 text-right font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedAuditLogs.length > 0 ? (
                  paginatedAuditLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => handleOpenLogModal(log)}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {log.aksi === "CREATE" ? "+" : log.aksi === "DELETE" ? "×" : "✎"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block truncate">
                              {log.aktor_role}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {log.timeAgo}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              log.aksi === "CREATE"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : log.aksi === "DELETE"
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                            }`}
                          >
                            {log.aksi}
                          </span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400 text-xs truncate">
                            {log.tipe_sumber}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenLogModal(log);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 hover:text-blue-600 transition text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <Eye className="size-3" />
                          <span>Lihat</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada rekaman audit log sesuai filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Audit */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Hal <span className="font-bold text-slate-800 dark:text-white">{auditPage}</span> dari{" "}
              {totalAuditPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                disabled={auditPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                disabled={auditPage === totalAuditPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          8. AUDIT LOG DETAIL MODAL (Inspect Snapshot Payload)
      ───────────────────────────────────────────────────────────── */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 ${
            isClosingModal ? "opacity-0" : "opacity-100 animate-in fade-in-0"
          }`}
          onClick={handleCloseLogModal}
        >
          <div
            className={`w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-200 ${
              isClosingModal ? "scale-95 opacity-0" : "scale-100 opacity-100 animate-in zoom-in-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-slate-900 dark:to-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {selectedLog.aksi === "CREATE" ? "+" : selectedLog.aksi === "DELETE" ? "×" : "✎"}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white font-lato">
                    Audit Snapshot Mutasi Data
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">ID: {selectedLog.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseLogModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-lato">
                    Aktor (Pelaku)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {selectedLog.aktor_role}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-lato">
                    Tipe Mutasi
                  </span>
                  <span className="font-black text-blue-600 dark:text-blue-400 mt-0.5 block font-mono">
                    {selectedLog.aksi}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-lato">
                    Modul Terkait
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {selectedLog.tipe_sumber}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-lato">
                    Waktu Transaksi
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 mt-0.5 block text-[11px]">
                    {selectedLog.dibuat_pada}
                  </span>
                </div>
              </div>

              {selectedLog.payload_sesudah ? (
                <div>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">
                    Snapshot Data Terkini (JSON):
                  </span>
                  <pre className="p-3.5 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed border border-slate-800">
                    {selectedLog.payload_sesudah}
                  </pre>
                </div>
              ) : (
                <div className="py-4 text-center text-slate-400">
                  <p>Tidak ada snapshot payload tersimpan untuk transaksi ini.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleCloseLogModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition shadow-xs"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
