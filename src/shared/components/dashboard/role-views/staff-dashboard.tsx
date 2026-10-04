import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Layers,
  TrendingUp,
  GraduationCap,
  Calendar,
  Settings,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { StatCard } from "@/shared/components/dashboard/stat-card";
import { AuthenticatedUser } from "@/shared/infrastructure/auth/auth-service";
import { CapabilityBundle } from "@/shared/infrastructure/authorization/types";

export interface StaffDashboardProps {
  user: AuthenticatedUser;
  capabilities?: CapabilityBundle[];
}

export function StaffDashboard({ user, capabilities = [] }: StaffDashboardProps) {
  const capabilityLabels: Record<CapabilityBundle, { label: string; desc: string; href: string }> =
    {
      SYSTEM_ADMIN: {
        label: "Admin Sistem",
        desc: "Konfigurasi sistem & log audit platform",
        href: "/sekolah",
      },
      ACADEMIC_OPERATOR: {
        label: "Operator Akademik",
        desc: "Profil sekolah, unit organisasi, jabatan & penugasan",
        href: "/sekolah",
      },
      STUDENT_DATA_OPERATOR: {
        label: "Operator Kesiswaan",
        desc: "Data induk siswa, rombel & presensi",
        href: "/dashboard",
      },
      REPORT_OPERATOR: {
        label: "Operator Laporan",
        desc: "Rekapitulasi nilai, rapor & buku induk",
        href: "/dashboard",
      },
      HOMEROOM_TEACHER: {
        label: "Wali Kelas",
        desc: "Monitoring rombel & bimbingan siswa",
        href: "/wali-kelas",
      },
      LEADERSHIP_ROLE: {
        label: "Pimpinan Sekolah",
        desc: "Portal kepemimpinan & analitik sekolah",
        href: "/pimpinan",
      },
    };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A]">
              Dashboard Operasional
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#2563EB] text-xs font-bold border border-blue-100">
              Staf Tata Usaha
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pusat administrasi operasional sekolah dan pengelolaan data platform.
          </p>
        </div>

        {/* Header Metadata Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-sm text-xs font-semibold text-slate-700">
            <Calendar className="h-4 w-4 text-[#2563EB]" />
            <span>Tahun Ajaran 2026/2027</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200/70 text-xs font-bold text-emerald-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Operasional Normal</span>
          </div>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Siswa"
          value="1.245"
          icon={<GraduationCap className="h-6 w-6" />}
          trend={{ value: "4,8%", label: "dari bulan lalu", isPositive: true }}
          watermarkIcon={<GraduationCap className="h-28 w-28" />}
        />
        <StatCard
          label="Guru & Tenaga Kerja"
          value="82"
          icon={<Users className="h-6 w-6" />}
          trend={{ value: "2,5%", label: "dari bulan lalu", isPositive: true }}
          watermarkIcon={<Users className="h-28 w-28" />}
        />
        <StatCard
          label="Rombongan Belajar"
          value="36"
          icon={<Building2 className="h-6 w-6" />}
          trend={{ value: "3", label: "dibanding tahun lalu", isPositive: true }}
          watermarkIcon={<Building2 className="h-28 w-28" />}
        />
        <StatCard
          label="Presensi Sekolah"
          value="96%"
          icon={<TrendingUp className="h-6 w-6" />}
          trend={{ value: "2,1%", label: "dari kemarin", isPositive: true }}
          watermarkIcon={<TrendingUp className="h-28 w-28" />}
        />
      </div>

      {/* Middle Section: Assigned Capabilities & Operational Modules */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Capabilities and Assigned Workspaces */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-100/90 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Modul Operasional & Wewenang</h3>
              <p className="text-xs text-slate-500">
                Capability bundle resmi yang ditugaskan ke akun Anda.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700">
              {capabilities.length} Hak Akses Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {capabilities.map((cap) => {
              const info = capabilityLabels[cap] || {
                label: cap,
                desc: "Wewenang operasional",
                href: "/dashboard",
              };
              return (
                <div
                  key={cap}
                  className="p-4 rounded-2xl bg-slate-50/80 hover:bg-blue-50/60 border border-slate-100 hover:border-blue-200 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-200/80 text-[#2563EB] flex items-center justify-center flex-shrink-0">
                      <Layers className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-700">
                      AKTIF
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors">
                      {info.label}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{info.desc}</p>
                  </div>

                  <Link
                    href={info.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] group-hover:underline pt-2 border-t border-slate-200/60"
                  >
                    <span>Buka Modul</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Aksi Cepat Staf */}
        <div className="rounded-2xl bg-white border border-slate-100/90 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#2563EB]" />
            <h3 className="text-base font-bold text-[#0F172A]">Aksi Cepat Staf</h3>
          </div>

          <div className="space-y-2.5">
            <Link
              href="/sekolah"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-blue-50/70 border border-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-100/70 text-[#2563EB] flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Manajemen Sekolah</span>
                  <span className="text-[10px] text-slate-500">Profil, Unit & Jabatan</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#2563EB] transition-colors" />
            </Link>

            <Link
              href="/sekolah?tab=billing"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-amber-50/70 border border-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-100/70 text-amber-600 flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Langganan Tenant</span>
                  <span className="text-[10px] text-slate-500">Paket, Kuota & Billing SaaS</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </Link>

            <Link
              href="#"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-emerald-50/70 border border-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Buku Induk Siswa</span>
                  <span className="text-[10px] text-slate-500">Registrasi & Mutasi Siswa</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </Link>

            <Link
              href="#"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-purple-50/70 border border-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-100/70 text-purple-600 flex items-center justify-center">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Ekspor Laporan</span>
                  <span className="text-[10px] text-slate-500">Rekapitulasi Semester</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
