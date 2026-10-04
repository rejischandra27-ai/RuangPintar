"use client";

import * as React from "react";
import Image from "next/image";
import {
  Users,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Clock,
  BookOpen,
  GraduationCap,
  Sparkles,
  Search,
  Filter,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Award,
  ChevronDown,
  CheckCircle2,
  FileText,
  UserCheck,
} from "lucide-react";
import { HomeroomOverviewDTO, StatusPerhatian } from "../domain/monitoring-types";
import { CreateMonitoringNoteModal } from "./create-monitoring-note-modal";
import { CreateFollowUpModal } from "./create-follow-up-modal";
import { StudentMonitoringDetailModal } from "./student-monitoring-detail-modal";
import {
  getHomeroomOverviewAction,
  updateFollowUpStatusAction,
} from "@/app/actions/monitoring-actions";
import { RombelJoinCodeCard } from "@/modules/student/presentation/rombel-join-code-card";
import { HomeroomReportCardTab } from "@/modules/reporting/presentation/homeroom-report-card-tab";

export interface HomeroomDashboardViewProps {
  initialData: HomeroomOverviewDTO;
  activeRombelsList?: Array<{
    rombel_id: string;
    rombel_nama: string;
    guru_nama: string;
    kapasitas: number;
  }>;
  isSuperAdmin?: boolean;
}

export function HomeroomDashboardView({
  initialData,
  activeRombelsList = [],
  isSuperAdmin = false,
}: HomeroomDashboardViewProps) {
  const [data, setData] = React.useState<HomeroomOverviewDTO>(initialData);
  const [selectedRombelId, setSelectedRombelId] = React.useState<string>(initialData.rombel_id);
  const [isLoading, setIsLoading] = React.useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [activeTab, setActiveTab] = React.useState<
    "roster" | "attention" | "notes" | "analytics" | "rapor"
  >("roster");

  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = React.useState(false);
  const [preselectedStudentForNote, setPreselectedStudentForNote] = React.useState<string | null>(
    null
  );

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = React.useState(false);
  const [targetNoteForFollowUp, setTargetNoteForFollowUp] = React.useState<{
    id: string;
    judul: string;
    siswaNama: string;
  } | null>(null);

  const [detailStudentId, setDetailStudentId] = React.useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);

  // Reload data saat rombelId berubah
  const handleRombelChange = async (newRombelId: string) => {
    setSelectedRombelId(newRombelId);
    setIsLoading(true);
    try {
      const res = await getHomeroomOverviewAction(newRombelId);
      if (res.success && res.data) {
        setData(res.data as HomeroomOverviewDTO);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const res = await getHomeroomOverviewAction(selectedRombelId);
      if (res.success && res.data) {
        setData(res.data as HomeroomOverviewDTO);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Filter siswa berdasarkan search query & status perhatian
  const filteredStudents = React.useMemo(() => {
    return data.siswa_list.filter((s) => {
      const matchesSearch =
        s.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nis && s.nis.includes(searchQuery)) ||
        (s.nisn && s.nisn.includes(searchQuery));

      const matchesStatus = statusFilter === "ALL" || s.status_perhatian === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data.siswa_list, searchQuery, statusFilter]);

  // Students untuk dropdown modal
  const studentDropdownList = React.useMemo(() => {
    return data.siswa_list.map((s) => ({
      id: s.siswa_id,
      nama: s.nama_lengkap,
      nis: s.nis,
    }));
  }, [data.siswa_list]);

  const handleOpenCreateNote = (siswaId?: string) => {
    setPreselectedStudentForNote(siswaId || null);
    setIsNoteModalOpen(true);
  };

  const handleOpenFollowUp = (catatanId: string, catatanJudul: string, siswaNama: string) => {
    setTargetNoteForFollowUp({ id: catatanId, judul: catatanJudul, siswaNama });
    setIsFollowUpModalOpen(true);
  };

  const handleOpenStudentDetail = (siswaId: string) => {
    setDetailStudentId(siswaId);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Header Akademik Glass (Hero Banner) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-black border border-blue-400/30 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                <span>PORTAL WALI KELAS</span>
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {data.tahun_ajaran_nama} {data.semester_nama ? `• ${data.semester_nama}` : ""}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5 flex-wrap">
              <span>Wali Kelas:</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-200">
                {data.rombel_nama}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pusat monitoring menyeluruh perkembangan siswa, keteraturan presensi, ketuntasan tugas
              lintas mata pelajaran, serta pencatatan pembinaan dan intervensi terarah.
            </p>
          </div>

          {/* Right Action / Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {isSuperAdmin && activeRombelsList.length > 1 && (
              <div className="relative">
                <select
                  value={selectedRombelId}
                  onChange={(e) => handleRombelChange(e.target.value)}
                  disabled={isLoading}
                  className="appearance-none px-4 py-2 pr-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all cursor-pointer"
                >
                  {activeRombelsList.map((r) => (
                    <option key={r.rombel_id} value={r.rombel_id} className="text-slate-900">
                      Rombel: {r.rombel_nama} ({r.guru_nama})
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 text-white/70 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <button
              type="button"
              onClick={() => handleOpenCreateNote()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Catatan Pembinaan</span>
            </button>
          </div>
        </div>

        {/* Mini Meta Info */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Guru Wali Kelas:</span>
            <span className="font-bold text-white">{data.wali_kelas_nama}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Kapasitas Rombel: <strong>{data.total_siswa}</strong> / {data.rombel_kapasitas} Siswa
            </span>
          </div>
        </div>
      </div>

      {/* 2. 4 Kartu KPI Rombel (Academic Glass UI v1.2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Siswa */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-400 block truncate">
              Total Siswa Binaan
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 block truncate">
              {data.total_siswa} Siswa
            </span>
            <span className="text-[10px] text-slate-500 block truncate">
              {data.jumlah_normal + data.jumlah_berprestasi} kondisi baik
            </span>
          </div>
        </div>

        {/* KPI 2: Rerata Kehadiran */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-400 block truncate">
              Rerata Presensi Rombel
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 block truncate">
              {data.rerata_kehadiran_rombel}%
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold block truncate">
              {data.rerata_kehadiran_rombel >= 90
                ? "Disiplin Sangat Baik"
                : data.rerata_kehadiran_rombel >= 80
                  ? "Cukup Baik"
                  : "Perlu Ditingkatkan"}
            </span>
          </div>
        </div>

        {/* KPI 3: Perlu Perhatian */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-400 block truncate">
              Perlu Perhatian Khusus
            </span>
            <span className="text-lg sm:text-xl font-black text-rose-900 block truncate">
              {data.jumlah_kritis + data.jumlah_perhatian} Siswa
            </span>
            <span className="text-[10px] text-rose-700 font-semibold block truncate">
              {data.jumlah_kritis} Kritis • {data.jumlah_perhatian} Waspada
            </span>
          </div>
        </div>

        {/* KPI 4: Berprestasi */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-400 block truncate">
              Siswa Berprestasi
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-900 block truncate">
              {data.jumlah_berprestasi} Siswa
            </span>
            <span className="text-[10px] text-amber-700 font-semibold block truncate">
              Kehadiran 100% & Nilai Tinggi
            </span>
          </div>
        </div>
      </div>

      {/* 3. Tab Navigasi Utama */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 overflow-x-auto gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("roster")}
            className={`py-2.5 px-3.5 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "roster"
                ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Roster Siswa & Indikator</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
              {data.total_siswa}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attention")}
            className={`py-2.5 px-3.5 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "attention"
                ? "border-rose-600 text-rose-600 bg-white shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            <span>Pusat Perhatian (Attention)</span>
            {data.daftar_perhatian_cepat.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">
                {data.daftar_perhatian_cepat.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`py-2.5 px-3.5 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "notes"
                ? "border-indigo-600 text-indigo-600 bg-white shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Catatan Pembinaan & Follow-Up</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
              {data.catatan_list.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`py-2.5 px-3.5 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "analytics"
                ? "border-emerald-600 text-emerald-600 bg-white shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Distribusi & Capaian</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rapor")}
            className={`py-2.5 px-3.5 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "rapor"
                ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span>e-Rapor Merdeka</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
              Resmi
            </span>
          </button>
        </div>
      </div>

      {/* 4. Konten Tab */}

      {/* TAB 1: ROSTER SISWA & INDIKATOR HOLISTIK */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          {/* Kartu Kendali Kode Undangan Mandiri Rombel */}
          <RombelJoinCodeCard rombelId={data.rombel_id} rombelNama={data.rombel_nama} />

          {/* Toolbar Pencarian & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa atau NIS..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="h-3 w-3" />
                <span>Filter:</span>
              </span>

              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua ({data.total_siswa})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("KRITIS")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === "KRITIS"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                Kritis ({data.jumlah_kritis})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("PERHATIAN")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === "PERHATIAN"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                Perhatian ({data.jumlah_perhatian})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("BERPRESTASI")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === "BERPRESTASI"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Berprestasi ({data.jumlah_berprestasi})
              </button>
            </div>
          </div>

          {/* Tabel Roster Siswa */}
          <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Siswa Binaan</th>
                    <th className="py-3 px-3 text-center">Presensi Sesi</th>
                    <th className="py-3 px-3 text-center">Ketuntasan Tugas</th>
                    <th className="py-3 px-3 text-center">Rerata Nilai</th>
                    <th className="py-3 px-3 text-center">Status Perhatian</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Tidak ada siswa yang sesuai kriteria pencarian atau filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((siswa) => (
                      <tr key={siswa.siswa_id} className="hover:bg-blue-50/30 transition-colors">
                        {/* Kolom Siswa */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-black text-xs flex items-center justify-center shrink-0 overflow-hidden">
                              {siswa.foto_url ? (
                                <Image
                                  src={siswa.foto_url}
                                  alt={siswa.nama_lengkap}
                                  width={32}
                                  height={32}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span>{siswa.nama_lengkap.slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">
                                {siswa.nama_lengkap}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                NIS: {siswa.nis || "-"} •{" "}
                                {siswa.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Kolom Presensi */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-slate-900">
                              {siswa.presensi.persentase_kehadiran}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {siswa.presensi.hadir} Hadir
                              {siswa.presensi.alpha > 0 && (
                                <span className="text-rose-600 font-bold ml-1">
                                  ({siswa.presensi.alpha} Alpha)
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Kolom Tugas */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-slate-900">
                              {siswa.tugas.persentase_tuntas}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {siswa.tugas.dikumpulkan} / {siswa.tugas.total_tugas} Selesai
                              {siswa.tugas.belum_mengumpulkan > 0 && (
                                <span className="text-amber-600 font-bold ml-1">
                                  ({siswa.tugas.belum_mengumpulkan} Belum)
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Kolom Nilai */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-slate-900">
                              {siswa.nilai.rerata_nilai !== null ? siswa.nilai.rerata_nilai : "-"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {siswa.nilai.persentase_kktp}% Tuntas KKTP
                            </span>
                          </div>
                        </td>

                        {/* Kolom Status Perhatian */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              siswa.status_perhatian === "KRITIS"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : siswa.status_perhatian === "PERHATIAN"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : siswa.status_perhatian === "BERPRESTASI"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                siswa.status_perhatian === "KRITIS"
                                  ? "bg-rose-600 animate-pulse"
                                  : siswa.status_perhatian === "PERHATIAN"
                                    ? "bg-amber-600"
                                    : siswa.status_perhatian === "BERPRESTASI"
                                      ? "bg-emerald-600"
                                      : "bg-blue-600"
                              }`}
                            />
                            <span>{siswa.status_perhatian}</span>
                          </span>
                        </td>

                        {/* Kolom Aksi */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCreateNote(siswa.siswa_id)}
                              title="Beri Catatan Pembinaan"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenStudentDetail(siswa.siswa_id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                            >
                              <span>Detail</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
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

      {/* TAB 2: PUSAT PERHATIAN (ATTENTION CENTER) */}
      {activeTab === "attention" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Pusat Intervensi & Perhatian Khusus Rombel</h4>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Daftar siswa yang terdeteksi memerlukan perhatian proaktif dari wali kelas
                berdasarkan indikator absensi (alpha/terlambat tinggi), penumpukan tugas yang belum
                diselesaikan, atau nilai di bawah kriteria ketercapaian tujuan pembelajaran (KKTP).
              </p>
            </div>
          </div>

          {data.daftar_perhatian_cepat.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                Kondisi Rombel Terpantau Kondusif!
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tidak ada siswa yang berada dalam kategori perhatian kritis saat ini. Seluruh siswa
                mempertahankan kedisiplinan dan capaian pembelajaran yang baik.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.daftar_perhatian_cepat.map((siswa) => (
                <div
                  key={siswa.siswa_id}
                  className={`p-4 rounded-2xl bg-white border shadow-2xs flex flex-col justify-between space-y-3 transition-all ${
                    siswa.status_perhatian === "KRITIS"
                      ? "border-rose-300 hover:border-rose-400"
                      : "border-amber-300 hover:border-amber-400"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-black text-xs flex items-center justify-center shrink-0 overflow-hidden">
                          {siswa.foto_url ? (
                            <Image
                              src={siswa.foto_url}
                              alt={siswa.nama_lengkap}
                              width={36}
                              height={36}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{siswa.nama_lengkap.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{siswa.nama_lengkap}</h4>
                          <span className="text-[10px] text-slate-500">
                            NIS: {siswa.nis || "-"}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          siswa.status_perhatian === "KRITIS"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {siswa.status_perhatian}
                      </span>
                    </div>

                    {/* Rincian Masalah */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Faktor Perhatian:
                      </span>
                      {siswa.rekomendasi_perhatian.map((rek, idx) => (
                        <div
                          key={idx}
                          className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span>{rek}</span>
                        </div>
                      ))}
                    </div>

                    {/* Metrik Mini */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">Presensi</span>
                        <span className="font-bold text-slate-800">
                          {siswa.presensi.persentase_kehadiran}%
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">Tugas</span>
                        <span className="font-bold text-slate-800">
                          {siswa.tugas.dikumpulkan}/{siswa.tugas.total_tugas}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50">
                        <span className="text-[10px] text-slate-400 block">Rerata</span>
                        <span className="font-bold text-slate-800">
                          {siswa.nilai.rerata_nilai ?? "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenCreateNote(siswa.siswa_id)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors"
                    >
                      Beri Catatan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenStudentDetail(siswa.siswa_id)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <span>Investigasi Detail</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CATATAN PEMBINAAN & TINDAK LANJUT */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Catatan Pembinaan & Intervensi Rombel
            </h3>
            <button
              type="button"
              onClick={() => handleOpenCreateNote()}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Catatan</span>
            </button>
          </div>

          {data.catatan_list.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
              <FileText className="h-10 w-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Belum Ada Catatan Pembinaan</h4>
              <p className="text-xs text-slate-400">
                Gunakan tombol &quot;Tambah Catatan&quot; untuk mendokumentasikan hasil pengamatan
                atau pembinaan siswa.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.catatan_list.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{note.judul}</span>
                        <span
                          className={`px-2 py-0.2 rounded text-[10px] font-black uppercase ${
                            note.tingkat_urgensi === "KRITIS"
                              ? "bg-rose-100 text-rose-800"
                              : note.tingkat_urgensi === "TINGGI"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {note.tingkat_urgensi}
                        </span>
                        <span className="px-2 py-0.2 rounded bg-slate-100 text-[10px] font-bold text-slate-600">
                          {note.kategori}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Target Siswa:{" "}
                        <strong className="text-slate-800">
                          {note.siswa_nama} ({note.siswa_nis})
                        </strong>{" "}
                        • Dicatat oleh {note.penulis_nama} •{" "}
                        {new Date(note.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenFollowUp(note.id, note.judul, note.siswa_nama)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-xs font-bold text-slate-700 transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Tindak Lanjut</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenStudentDetail(note.siswa_id)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                      >
                        Lihat Siswa
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl leading-relaxed">
                    {note.isi}
                  </p>

                  {/* Section Tindak Lanjut */}
                  {note.tindak_lanjut.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Rencana Tindak Lanjut & Intervensi ({note.tindak_lanjut.length}):
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {note.tindak_lanjut.map((tl) => (
                          <div
                            key={tl.id}
                            className="p-3 rounded-xl bg-blue-50/40 border border-blue-100 text-xs flex flex-col justify-between space-y-2"
                          >
                            <div>
                              <span className="font-bold text-slate-900 block">{tl.tindakan}</span>
                              {tl.target_tanggal && (
                                <span className="text-[10px] text-slate-500 block mt-0.5">
                                  Target:{" "}
                                  {new Date(tl.target_tanggal).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              )}
                              {tl.hasil && (
                                <p className="text-[11px] text-emerald-800 italic mt-1 bg-white/80 p-1.5 rounded">
                                  Hasil: {tl.hasil}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  tl.status === "SELESAI"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : tl.status === "PROSES"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {tl.status}
                              </span>

                              <button
                                type="button"
                                onClick={async () => {
                                  const newStatus = tl.status === "SELESAI" ? "PROSES" : "SELESAI";
                                  await updateFollowUpStatusAction({
                                    id: tl.id,
                                    status: newStatus,
                                    hasil:
                                      newStatus === "SELESAI"
                                        ? "Diselesaikan oleh wali kelas."
                                        : null,
                                  });
                                  refreshData();
                                }}
                                className="text-[11px] font-bold text-blue-600 hover:underline"
                              >
                                {tl.status === "SELESAI" ? "Batalkan Selesai" : "Tandai Selesai ✓"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DISTRIBUSI & CAPAIAN */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span>Distribusi Status Perhatian Siswa</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Siswa Berprestasi</span>
                  </span>
                  <span className="font-bold text-slate-900">{data.jumlah_berprestasi} Siswa</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${(data.jumlah_berprestasi / (data.total_siswa || 1)) * 100}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Kondisi Normal / Baik</span>
                  </span>
                  <span className="font-bold text-slate-900">{data.jumlah_normal} Siswa</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${(data.jumlah_normal / (data.total_siswa || 1)) * 100}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Perlu Perhatian (Waspada)</span>
                  </span>
                  <span className="font-bold text-slate-900">{data.jumlah_perhatian} Siswa</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{
                      width: `${(data.jumlah_perhatian / (data.total_siswa || 1)) * 100}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>Perhatian Kritis</span>
                  </span>
                  <span className="font-bold text-slate-900">{data.jumlah_kritis} Siswa</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-rose-500"
                    style={{
                      width: `${(data.jumlah_kritis / (data.total_siswa || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Pedoman Etik & Wewenang Wali Kelas</span>
              </h4>
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-700 space-y-2 leading-relaxed">
                <p>
                  <strong>Domain Rule Kanonikal:</strong> Wali Kelas memiliki hak memantau seluruh
                  aspek perkembangan akademik, kehadiran, dan tugas siswa di rombel perwaliannya.
                </p>
                <p className="text-slate-600">
                  Wali kelas <strong>tidak secara otomatis</strong> dapat mengubah nilai atau
                  presensi sesi milik guru mata pelajaran lain. Koordinasi dilakukan melalui catatan
                  pembinaan dan tindak lanjut terstruktur.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: E-RAPOR MERDEKA COCKPIT */}
      {activeTab === "rapor" && <HomeroomReportCardTab rombelId={selectedRombelId} />}

      {/* MODALS */}
      <CreateMonitoringNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setPreselectedStudentForNote(null);
        }}
        onSuccess={refreshData}
        rombelId={selectedRombelId}
        students={studentDropdownList}
        preselectedStudentId={preselectedStudentForNote}
      />

      {targetNoteForFollowUp && (
        <CreateFollowUpModal
          isOpen={isFollowUpModalOpen}
          onClose={() => {
            setIsFollowUpModalOpen(false);
            setTargetNoteForFollowUp(null);
          }}
          onSuccess={refreshData}
          catatanId={targetNoteForFollowUp.id}
          catatanJudul={targetNoteForFollowUp.judul}
          siswaNama={targetNoteForFollowUp.siswaNama}
        />
      )}

      <StudentMonitoringDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailStudentId(null);
        }}
        rombelId={selectedRombelId}
        siswaId={detailStudentId}
        onOpenCreateNote={(sId) => {
          handleOpenCreateNote(sId);
        }}
        onOpenCreateFollowUp={handleOpenFollowUp}
        onRefreshOverview={refreshData}
      />
    </div>
  );
}
