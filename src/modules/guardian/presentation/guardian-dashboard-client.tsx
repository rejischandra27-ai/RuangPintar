"use client";

/**
 * Ruang Pintar — Guardian Dashboard Client Interactivity (Phase 16)
 * Komponen client untuk mengelola interaksi modal izin dan child switcher di dashboard.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  CheckCircle2,
  Award,
  Calendar,
  GraduationCap,
  Sparkles,
  PhoneCall,
  Download,
  FileCheck,
  ArrowRight,
  MonitorPlay,
  FileText,
  Clock,
  PlusCircle,
} from "lucide-react";
import { StatCard } from "@/shared/components/dashboard/stat-card";
import { GuardianDashboardData } from "../domain/guardian-types";
import { ChildSwitcherDropdown } from "./child-switcher-dropdown";
import { PengajuanIzinModal } from "./pengajuan-izin-modal";
import { switchActiveChildAction } from "@/app/actions/guardian-actions";

export interface GuardianDashboardClientProps {
  data: GuardianDashboardData;
}

export function GuardianDashboardClient({ data }: GuardianDashboardClientProps) {
  const router = useRouter();
  const [isIzinModalOpen, setIsIzinModalOpen] = React.useState(false);
  const [isSwitching, startSwitchTransition] = React.useTransition();

  const handleSwitchChild = (childId: string) => {
    startSwitchTransition(async () => {
      await switchActiveChildAction(childId);
      router.refresh();
    });
  };

  const {
    guardian,
    linkedChildren,
    activeChild,
    attendanceRecap,
    upcomingAssignments,
    upcomingCbt,
    recentPublishedGrades,
    recentPengajuan,
  } = data;

  const child = activeChild.siswa;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
              Selamat Datang, Bapak/Ibu {guardian.nama_lengkap}
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
              Wali Murid
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Portal pemantauan aktivitas belajar, presensi harian, dan capaian nilai putra/putri Anda
            di {activeChild.sekolah_nama}.
          </p>
        </div>

        {/* Multi-Child Switcher & Meta Badge */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-700">
            <Calendar className="h-4 w-4 text-[#2563EB]" />
            <span>
              {activeChild.tahun_ajaran_aktif} • {activeChild.semester_aktif}
            </span>
          </div>

          <ChildSwitcherDropdown linkedChildren={linkedChildren} activeChildId={child.siswa_id} />

          <Link
            href="/guardian/klaim-anak"
            data-testid="header-button-klaim-anak"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200/80 shadow-2xs text-xs font-bold transition-all cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Klaim Anak Lain</span>
          </Link>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Putra/Putri Terdaftar"
          value={`${linkedChildren.length} Anak`}
          icon={<GraduationCap className="h-6 w-6" />}
          trend={{
            value: child.nama_lengkap,
            label: `• ${child.rombel_nama}`,
            isPositive: true,
          }}
          watermarkIcon={<GraduationCap className="h-28 w-28" />}
        />
        <StatCard
          label="Presensi Kehadiran"
          value={`${attendanceRecap.persentase_kehadiran}%`}
          icon={<CheckCircle2 className="h-6 w-6" />}
          trend={{
            value: attendanceRecap.kategori_kehadiran,
            label: `• ${attendanceRecap.hadir}/${attendanceRecap.total_sesi} sesi KBM`,
            isPositive: attendanceRecap.persentase_kehadiran >= 85,
          }}
          watermarkIcon={<CheckCircle2 className="h-28 w-28" />}
        />
        <StatCard
          label="Ketuntasan Tugas"
          value={`${upcomingAssignments.filter((t) => t.sudah_dikumpulkan).length} / ${
            upcomingAssignments.length > 0 ? upcomingAssignments.length : 1
          }`}
          icon={<Award className="h-6 w-6" />}
          trend={{
            value: "Terkontrol",
            label: "tugas kelas aktif",
            isPositive: true,
          }}
          watermarkIcon={<Award className="h-28 w-28" />}
        />
        <StatCard
          label="Ujian CBT Terjadwal"
          value={`${upcomingCbt.length} Ujian`}
          icon={<MonitorPlay className="h-6 w-6" />}
          trend={{
            value: upcomingCbt.some((c) => c.status_ujian === "SELESAI")
              ? "Ada Selesai"
              : "Siap Ujian",
            label: "asesmen digital",
            isPositive: true,
          }}
          watermarkIcon={<MonitorPlay className="h-28 w-28" />}
        />
      </div>

      {/* Multi-Child Cards Section (Fitur 04 & Fitur 08: Academic Glass UI) */}
      <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#0F172A]">
              Daftar Putra/Putri Terhubung ({linkedChildren.length} Siswa)
            </h3>
          </div>
          <Link
            href="/guardian/klaim-anak"
            className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Klaim Siswa Lain</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {linkedChildren.map((c) => {
            const isActive = c.siswa_id === child.siswa_id;
            return (
              <div
                key={c.siswa_id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isActive
                    ? "bg-blue-50/70 border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-xs"
                    : "bg-slate-50/80 border-slate-200/80 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-extrabold shadow-2xs ${
                        isActive ? "bg-[#2563EB] text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {c.nama_lengkap
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {c.nama_lengkap}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        NIS: {c.nis || "-"} • Kelas:{" "}
                        <strong className="text-slate-700">{c.rombel_nama}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    {c.jenis_hubungan} {c.apakah_wali_utama ? "(Utama)" : ""}
                  </span>

                  {isActive ? (
                    <span className="text-[10px] font-bold text-[#2563EB] flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Sedang Aktif</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSwitchChild(c.siswa_id)}
                      disabled={isSwitching}
                      className="text-[10px] font-bold text-slate-700 hover:text-[#2563EB] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Beralih ke Anak Ini</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left 2 Cols (Child Details & Academics), Right 1 Col (Services & Requests) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Child Profile Card */}
          <div className="rounded-2xl bg-white border border-slate-100/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#2563EB]" />
                <h3 className="text-base font-bold text-[#0F172A]">
                  Profil Pembelajaran — {child.nama_lengkap}
                </h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Relasi: {child.jenis_hubungan} {child.apakah_wali_utama ? "(Wali Utama)" : ""}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-[#2563EB] text-white font-extrabold flex items-center justify-center text-base shadow-xs">
                  {child.nama_lengkap
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{child.nama_lengkap}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    NIS: {child.nis} {child.nisn ? `• NISN: ${child.nisn}` : ""} • Rombel:{" "}
                    <strong className="text-slate-700">{child.rombel_nama}</strong>
                  </p>
                </div>
              </div>

              {activeChild.wali_kelas ? (
                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Wali Kelas:
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {activeChild.wali_kelas.nama_lengkap}
                  </span>
                  {activeChild.wali_kelas.no_telepon && (
                    <span className="text-[10px] text-slate-500 block">
                      {activeChild.wali_kelas.no_telepon}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400">Wali kelas belum ditentukan</span>
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">Kehadiran Sesi KBM</span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {attendanceRecap.hadir} Hadir / {attendanceRecap.total_sesi} Sesi
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs">
                    {attendanceRecap.persentase_kehadiran}%
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">
                  Catatan Izin / Sakit
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {attendanceRecap.sakit} Sakit • {attendanceRecap.izin} Izin
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-xs">
                    {attendanceRecap.alpa} Alpa
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">
                  Tugas Perlu Diperhatikan
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {upcomingAssignments.filter((t) => !t.sudah_dikumpulkan).length} Belum Kumpul
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#2563EB] font-bold text-xs">
                    Aktif
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Published Grades Section (FR-SXP-004: Zero Draft Leakage) */}
          <div className="rounded-2xl bg-white border border-slate-100/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-[#2563EB]" />
                <h3 className="text-base font-bold text-[#0F172A]">
                  Capaian Nilai Asesmen Terpublikasi Resmi
                </h3>
              </div>
              <Link
                href="/nilai-anak"
                className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
              >
                <span>Lihat Buku Rapor</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentPublishedGrades.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-slate-100">
                Belum ada nilai asesmen resmi yang dipublikasikan oleh dewan guru untuk periode ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentPublishedGrades.map((g) => (
                  <div
                    key={g.id}
                    className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] px-1.5 py-0.5 bg-blue-50 rounded">
                          {g.jenis_asesmen}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 mt-1">{g.judul_asesmen}</h5>
                        <p className="text-[11px] text-slate-500">{g.mata_pelajaran}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          {g.nilai !== null ? g.nilai : "-"}
                        </span>
                        <span className="block text-[10px] font-semibold text-emerald-700">
                          {g.kategori_capaian}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Assignments & CBT Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tugas Terjadwal */}
            <div className="rounded-2xl bg-white border border-slate-100/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Tugas & Proyek Kelas
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  {upcomingAssignments.length} Tugas
                </span>
              </div>

              {upcomingAssignments.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Tidak ada tugas aktif saat ini.
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingAssignments.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-800 block truncate">{t.judul}</span>
                        <span className="text-[10px] text-slate-500">{t.mata_pelajaran}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                          t.sudah_dikumpulkan
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {t.sudah_dikumpulkan ? "Terkumpul" : "Belum"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Jadwal CBT */}
            <div className="rounded-2xl bg-white border border-slate-100/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MonitorPlay className="h-4 w-4 text-[#2563EB]" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">Jadwal Ujian CBT</h4>
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  {upcomingCbt.length} Asesmen
                </span>
              </div>

              {upcomingCbt.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Tidak ada agenda ujian CBT saat ini.
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingCbt.slice(0, 4).map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-800 block truncate">{c.judul}</span>
                        <span className="text-[10px] text-slate-500">
                          {c.mata_pelajaran} • {c.durasi_menit} Menit
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                          c.status_ujian === "SELESAI"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-[#2563EB]"
                        }`}
                      >
                        {c.status_ujian === "SELESAI" ? "Selesai" : "Terjadwal"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Layanan Orang Tua & Riwayat Pengajuan Izin */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="rounded-2xl bg-white border border-slate-100/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#2563EB]" />
              <h3 className="text-base font-bold text-[#0F172A]">Layanan Orang Tua</h3>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setIsIzinModalOpen(true)}
                data-testid="button-ajukan-izin"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-purple-50/70 hover:bg-purple-100/70 border border-purple-100 text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Pengajuan Izin / Sakit
                    </span>
                    <span className="text-[10px] text-slate-500">Dispensasi & surat dokter</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-purple-400 group-hover:text-purple-600 transition-colors" />
              </button>

              <Link
                href="/presensi-anak"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-emerald-50/70 border border-slate-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Log Presensi Harian
                    </span>
                    <span className="text-[10px] text-slate-500">Detail absensi sesi KBM</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </Link>

              <Link
                href="/nilai-anak"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-blue-50/70 border border-slate-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-100/70 text-[#2563EB] flex items-center justify-center">
                    <Download className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      e-Rapor Kurikulum Merdeka
                    </span>
                    <span className="text-[10px] text-slate-500">Hasil belajar & cetak A4</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#2563EB] transition-colors" />
              </Link>
            </div>
          </div>

          {/* Riwayat Permohonan Izin Wali */}
          <div className="rounded-2xl bg-white border border-slate-100/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <h4 className="text-sm font-bold text-slate-900">Riwayat Permohonan</h4>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                {recentPengajuan.length} Terkirim
              </span>
            </div>

            {recentPengajuan.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Belum ada permohonan izin yang diajukan.
              </p>
            ) : (
              <div className="space-y-3">
                {recentPengajuan.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 leading-tight">
                        {p.judul}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          p.status === "DISETUJUI"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "DITOLAK"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {p.deskripsi}
                    </p>
                    {p.catatan_tanggapan && (
                      <div className="pt-1 text-[10px] text-slate-600 italic border-t border-slate-200/50">
                        Catatan: &ldquo;{p.catatan_tanggapan}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Pengajuan Izin */}
      <PengajuanIzinModal
        isOpen={isIzinModalOpen}
        onClose={() => setIsIzinModalOpen(false)}
        linkedChildren={linkedChildren}
        activeChildId={child.siswa_id}
      />
    </div>
  );
}
