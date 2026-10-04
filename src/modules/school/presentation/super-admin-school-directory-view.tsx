"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  School,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  LogIn,
  LogOut,
  Users,
  BookOpen,
  Layers,
  FileCheck2,
  Loader2,
  AlertTriangle,
  Radio,
  ArrowRight,
} from "lucide-react";
import {
  AcademicDataTable,
  DataTableColumn,
  DataTableFilterOption,
} from "@/shared/components/ui/academic-data-table";
import { CreateSchoolModal } from "./create-school-modal";
import { ManageLicenseModal, ManageLicenseSchool } from "./manage-license-modal";
import { switchActiveTenantAction, clearActiveTenantAction } from "@/app/actions/tenant-actions";
import { toggleSchoolActiveStatusAction } from "@/app/actions/school-actions";

export interface SchoolTenantItem {
  id: string;
  nama: string;
  npsn: string | null;
  jenjang: string;
  tipe_lisensi: string;
  trial_berakhir_pada: Date | string | null;
  status_aktif: boolean;
  alamat: string | null;
  telepon: string | null;
  email: string | null;
  created_at: Date | string;
  _count?: {
    siswa: number;
    guru: number;
    rombel: number;
    ujian_cbt: number;
    pengguna: number;
  };
  langganan_tenant?: Array<{
    id: string;
    paket: string;
    status: string;
    mulai_pada: Date | string;
    berakhir_pada: Date | string | null;
    entitlement_json: string | null;
  }>;
  transaksi_langganan?: Array<{
    id: string;
    total_bayar: number;
    status: string;
    dibayar_pada: Date | string | null;
  }>;
}

interface SuperAdminSchoolDirectoryViewProps {
  schools: SchoolTenantItem[];
  currentUser?: {
    id: string;
    nama_lengkap: string;
    peran_dasar: string;
    sekolah_id?: string | null;
  };
}

export function SuperAdminSchoolDirectoryView({
  schools,
  currentUser,
}: SuperAdminSchoolDirectoryViewProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = React.useState(false);
  const [selectedSchoolForLicense, setSelectedSchoolForLicense] =
    React.useState<ManageLicenseSchool | null>(null);

  const [switchingSchoolId, setSwitchingSchoolId] = React.useState<string | null>(null);
  const [isClearingTenant, setIsClearingTenant] = React.useState(false);
  const [togglingSchoolId, setTogglingSchoolId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Financial & Operational Metrics (100% Real Canonical Data)
  const totalSchools = schools.length;
  const totalFullLicense = schools.filter((s) => s.tipe_lisensi === "SEKOLAH").length;
  const totalFreemium = schools.filter((s) => s.tipe_lisensi === "FREEMIUM").length;
  const totalActive = schools.filter((s) => s.status_aktif).length;

  const totalSiswaAll = schools.reduce((acc, s) => acc + (s._count?.siswa ?? 0), 0);
  const totalGuruAll = schools.reduce((acc, s) => acc + (s._count?.guru ?? 0), 0);
  const totalRombelAll = schools.reduce((acc, s) => acc + (s._count?.rombel ?? 0), 0);
  const totalCbtAll = schools.reduce((acc, s) => acc + (s._count?.ujian_cbt ?? 0), 0);

  // Schools nearing trial expiration (<= 7 days remaining or already expired)
  const now = new Date();
  const expiringSoonCount = schools.filter((s) => {
    if (s.tipe_lisensi !== "FREEMIUM" || !s.trial_berakhir_pada) return false;
    const diffDays =
      (new Date(s.trial_berakhir_pada).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }).length;

  // Active impersonation check
  const activeImpersonatedSchool = schools.find((s) => s.id === currentUser?.sekolah_id);

  // Impersonate / Switch Tenant
  const handleImpersonate = async (schoolId: string) => {
    setSwitchingSchoolId(schoolId);
    setFeedback(null);
    try {
      const res = await switchActiveTenantAction(schoolId);
      if (!res.success) {
        setFeedback({ type: "error", text: res.error });
        return;
      }
      setFeedback({
        type: "success",
        text: "Berhasil beralih ke sesi sekolah. Membuka dashboard sekolah...",
      });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat berpindah sekolah." });
    } finally {
      setSwitchingSchoolId(null);
    }
  };

  // Exit Impersonation / Clear Tenant
  const handleClearImpersonation = async () => {
    setIsClearingTenant(true);
    setFeedback(null);
    try {
      const res = await clearActiveTenantAction();
      if (!res.success) {
        setFeedback({ type: "error", text: res.error });
        return;
      }
      setFeedback({
        type: "success",
        text: "Berhasil kembali ke tampilan global platform Super Admin.",
      });
      router.push("/sekolah");
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Gagal membersihkan sesi tenant aktif.",
      });
    } finally {
      setIsClearingTenant(false);
    }
  };

  // Toggle Active / Suspended
  const handleToggleStatus = async (school: SchoolTenantItem) => {
    const nextStatus = !school.status_aktif;
    const confirmText = nextStatus
      ? `Apakah Anda yakin ingin mengaktifkan kembali sekolah ${school.nama}?`
      : `PERINGATAN: Menonaktifkan sekolah ${school.nama} akan men-suspend akses staf dan siswa ke sekolah ini. Lanjutkan?`;

    if (!window.confirm(confirmText)) return;

    setTogglingSchoolId(school.id);
    setFeedback(null);
    try {
      const res = await toggleSchoolActiveStatusAction(
        school.id,
        nextStatus,
        "Diubah oleh Super Admin dari direktori lisensi"
      );
      if (!res.success) {
        setFeedback({ type: "error", text: res.error });
        return;
      }
      setFeedback({ type: "success", text: res.message || "Status sekolah berhasil diubah." });
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Terjadi kesalahan saat memperbarui status operasional.",
      });
    } finally {
      setTogglingSchoolId(null);
    }
  };

  // Open License Modal
  const handleOpenLicenseModal = (school: SchoolTenantItem) => {
    let quota = 500;
    const latestSub = school.langganan_tenant?.[0];
    if (latestSub?.entitlement_json) {
      try {
        const ent = JSON.parse(latestSub.entitlement_json);
        if (ent.kuota_siswa) quota = Number(ent.kuota_siswa);
      } catch {
        // fallback
      }
    }

    setSelectedSchoolForLicense({
      id: school.id,
      nama: school.nama,
      npsn: school.npsn,
      tipe_lisensi: school.tipe_lisensi,
      trial_berakhir_pada: school.trial_berakhir_pada,
      currentPaket: latestSub?.paket,
      currentQuota: quota,
    });
    setIsLicenseModalOpen(true);
  };

  // Columns Definition for AcademicDataTable
  const columns: DataTableColumn<SchoolTenantItem>[] = React.useMemo(
    () => [
      {
        key: "nama",
        header: "Nama Sekolah",
        sortable: true,
        sortAccessor: (s) => s.nama,
        cell: (school) => {
          const isCurrentActive = school.id === currentUser?.sekolah_id;
          return (
            <div className="flex items-center gap-3">
              <div
                className={`size-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                  isCurrentActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400"
                    : "bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400"
                }`}
              >
                <School className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {school.nama}
                  </span>
                  {isCurrentActive && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-black border border-blue-300 dark:border-blue-700">
                      Sesi Aktif
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                    {school.jenjang}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                    ID: {school.id.slice(0, 10)}...
                  </span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: "npsn",
        header: "NPSN & Wilayah",
        sortable: true,
        sortAccessor: (s) => s.npsn || "",
        cell: (school) => (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                {school.npsn || <span className="text-slate-400 font-sans italic">Tanpa NPSN</span>}
              </span>
              {school.npsn && (
                <span className="px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                  Resmi
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[190px] mt-0.5">
              {school.alamat || "-"}
            </div>
          </div>
        ),
      },
      {
        key: "tipe_lisensi",
        header: "Lisensi & Paket",
        sortable: true,
        sortAccessor: (s) => s.tipe_lisensi,
        cell: (school) => {
          const isFull = school.tipe_lisensi === "SEKOLAH";
          const latestSub = school.langganan_tenant?.[0];
          const paketName = latestSub?.paket || (isFull ? "PRO" : "TRIAL");

          // Calculate trial remaining days
          let trialDaysText = null;
          let trialStatusVariant = "emerald";

          if (!isFull && school.trial_berakhir_pada) {
            const diffDays = Math.ceil(
              (new Date(school.trial_berakhir_pada).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            if (diffDays < 0) {
              trialDaysText = "Trial Kadaluarsa";
              trialStatusVariant = "rose";
            } else if (diffDays <= 7) {
              trialDaysText = `Sisa ${diffDays} Hari`;
              trialStatusVariant = "amber";
            } else {
              trialDaysText = `Sisa ${diffDays} Hari`;
              trialStatusVariant = "emerald";
            }
          }

          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isFull ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-[11px] font-bold">
                    <ShieldCheck className="size-3" /> Lisensi Penuh
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 text-[11px] font-bold">
                    <Clock className="size-3" /> Freemium
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold font-mono">
                  {paketName}
                </span>
              </div>
              {trialDaysText && (
                <div className="text-[10px]">
                  <span
                    className={`font-semibold ${
                      trialStatusVariant === "rose"
                        ? "text-rose-600 dark:text-rose-400"
                        : trialStatusVariant === "amber"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {trialDaysText}
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "kapasitas",
        header: "Kapasitas & Data",
        sortable: false,
        cell: (school) => {
          const sCount = school._count?.siswa ?? 0;
          const gCount = school._count?.guru ?? 0;
          const rCount = school._count?.rombel ?? 0;
          const cCount = school._count?.ujian_cbt ?? 0;

          return (
            <div className="space-y-0.5 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="font-bold text-blue-600 dark:text-blue-400">{sCount}</span>
                <span className="text-slate-400 text-[10px] font-sans">Siswa</span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{gCount}</span>
                <span className="text-slate-400 text-[10px] font-sans">Guru</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2 font-sans">
                <span>{rCount} Rombel</span>
                <span>•</span>
                <span>{cCount} Ujian CBT</span>
              </div>
            </div>
          );
        },
      },
      {
        key: "status_aktif",
        header: "Status Tenant",
        sortable: true,
        sortAccessor: (s) => (s.status_aktif ? 1 : 0),
        cell: (school) => {
          const isToggling = togglingSchoolId === school.id;
          return (
            <button
              type="button"
              onClick={() => handleToggleStatus(school)}
              disabled={isToggling}
              title={school.status_aktif ? "Klik untuk suspend" : "Klik untuk aktifkan"}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                school.status_aktif
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200/60"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200/60"
              }`}
            >
              {isToggling ? (
                <Loader2 className="size-3 animate-spin" />
              ) : school.status_aktif ? (
                <CheckCircle2 className="size-3.5" />
              ) : (
                <XCircle className="size-3.5" />
              )}
              <span>{school.status_aktif ? "Aktif" : "Suspended"}</span>
            </button>
          );
        },
      },
      {
        key: "aksi",
        header: "Orkestrasi Tenant",
        align: "right",
        sortable: false,
        cell: (school) => {
          const isCurrentActive = school.id === currentUser?.sekolah_id;
          const isSwitching = switchingSchoolId === school.id;

          return (
            <div className="flex items-center justify-end gap-1.5">
              {/* Tombol 1: Masuk Sebagai Sekolah (Ghost Mode / Impersonate) */}
              {isCurrentActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-300 dark:border-blue-800">
                  <Radio className="size-3 animate-pulse text-blue-600" />
                  <span>Sesi Aktif</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleImpersonate(school.id)}
                  disabled={isSwitching || !school.status_aktif}
                  title="Masuk sebagai administrator sekolah ini tanpa password"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSwitching ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <LogIn className="size-3" />
                  )}
                  <span>Masuk</span>
                </button>
              )}

              {/* Tombol 2: Atur Lisensi & Kuota */}
              <button
                type="button"
                onClick={() => handleOpenLicenseModal(school)}
                title="Kelola Lisensi, Kuota Siswa, dan Masa Aktif"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 text-xs font-bold transition cursor-pointer"
              >
                <CreditCard className="size-3" />
                <span>Lisensi</span>
              </button>

              {/* Tombol 3: Kelola Struktur & Profil */}
              <Link
                href={`/sekolah?sekolahId=${school.id}`}
                title="Buka Struktur Organisasi, Jabatan & Profil Sekolah"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                <Building2 className="size-3" />
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          );
        },
      },
    ],
    [currentUser?.sekolah_id, switchingSchoolId, togglingSchoolId]
  );

  const filters: DataTableFilterOption<SchoolTenantItem>[] = React.useMemo(
    () => [
      {
        id: "jenjang",
        label: "Jenjang",
        options: [
          { value: "ALL", label: "Semua Jenjang" },
          { value: "SD", label: "SD" },
          { value: "SMP", label: "SMP" },
          { value: "SMA", label: "SMA" },
          { value: "SMK", label: "SMK" },
          { value: "UMUM", label: "UMUM" },
        ],
        filterAccessor: (school, selected) => school.jenjang === selected,
      },
      {
        id: "lisensi",
        label: "Lisensi",
        options: [
          { value: "ALL", label: "Semua Lisensi" },
          { value: "SEKOLAH", label: "Lisensi Penuh (Institusi)" },
          { value: "FREEMIUM", label: "Freemium / Trial" },
        ],
        filterAccessor: (school, selected) => school.tipe_lisensi === selected,
      },
      {
        id: "status",
        label: "Status",
        options: [
          { value: "ALL", label: "Semua Status" },
          { value: "AKTIF", label: "Aktif" },
          { value: "NONAKTIF", label: "Suspended" },
        ],
        filterAccessor: (school, selected) =>
          selected === "AKTIF" ? school.status_aktif : !school.status_aktif,
      },
    ],
    []
  );

  const renderMobileSchoolCard = (school: SchoolTenantItem) => {
    const isCurrentActive = school.id === currentUser?.sekolah_id;
    return (
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 font-lato">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              <School className="size-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                {school.nama}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                  {school.jenjang}
                </span>
                {school.npsn && (
                  <span className="font-mono text-[10px] text-slate-500">NPSN: {school.npsn}</span>
                )}
              </div>
            </div>
          </div>

          <span className="shrink-0">
            {school.status_aktif ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                Aktif
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                Suspended
              </span>
            )}
          </span>
        </div>

        {/* Lisensi & Kapasitas Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[10px] text-slate-400 block font-sans">Model Lisensi</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {school.tipe_lisensi === "SEKOLAH" ? "Lisensi Penuh" : "Freemium"}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[10px] text-slate-400 block font-sans">Kapasitas Siswa</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {school._count?.siswa ?? 0} Siswa
            </span>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
          {isCurrentActive ? (
            <span className="px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1">
              <Radio className="size-3 text-blue-600" />
              <span>Sesi Aktif</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handleImpersonate(school.id)}
              disabled={!school.status_aktif}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <LogIn className="size-3" />
              <span>Masuk</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenLicenseModal(school)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
            >
              Lisensi
            </button>
            <Link
              href={`/sekolah?sekolahId=${school.id}`}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer flex items-center gap-1"
            >
              <span>Detail</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-7 pb-16 font-lato">
      {/* ─────────────────────────────────────────────────────────────
          1. GHOST MODE / IMPERSONATION NOTICE BANNER (IF ACTIVE)
      ───────────────────────────────────────────────────────────── */}
      {activeImpersonatedSchool && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-4 sm:p-5 shadow-lg shadow-blue-500/20 border border-blue-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in-0 duration-300">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold shrink-0">
              <Radio className="size-5 animate-pulse text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                  Mode Impersonasi Aktif
                </span>
                <span className="text-xs text-blue-100 font-mono">
                  Tenant: {activeImpersonatedSchool.nama}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                Anda sedang melihat sistem dalam konteks sekolah{" "}
                <strong>{activeImpersonatedSchool.nama}</strong>. Seluruh dashboard pengajaran dan
                akademik saat ini merefleksikan data sekolah ini.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearImpersonation}
            disabled={isClearingTenant}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            {isClearingTenant ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <LogOut className="size-3.5" />
            )}
            <span>Keluar ke Mode Global Platform</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. FEEDBACK ALERT MESSAGE
      ───────────────────────────────────────────────────────────── */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="size-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. HEADER BANNER WITH 3D SCHOOL SPACE ILLUSTRATION
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/30 dark:from-slate-900/90 dark:via-slate-900/95 dark:to-blue-950/40 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-7 shadow-xs">
        {/* Subtle Decorative Glow in Background */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            {/* Breadcrumb */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Link
                href="/dashboard"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                Kontrol Platform SaaS
              </span>
              <span>/</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                Sekolah & Lisensi
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Direktori Sekolah & Lisensi Multi-Tenant
              </h1>
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs whitespace-nowrap">
                B2B Provisioning Engine
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Pusat orkestrasi seluruh institusi sekolah mitra dalam ekosistem Ruang Pintar. Kelola
              status lisensi, batas kuota siswa, aktivasi tenant, dan impersonasi konteks sekolah
              secara aman.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Data Isolation SLA 99.9%
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold">
                Tenant Context: Level-1 First-Class
              </span>
            </div>
          </div>

          {/* 3D Space / School Isometric Hero Visual */}
          <div className="relative shrink-0 flex items-center justify-center md:justify-end self-center md:self-auto">
            <div className="relative w-36 h-32 sm:w-44 sm:h-36 md:w-52 md:h-44 group cursor-pointer">
              <div className="absolute inset-0 bg-blue-500/15 dark:bg-blue-600/20 rounded-full blur-2xl group-hover:bg-blue-500/25 transition-all duration-500" />
              <Image
                src="/images/illustrations/school-hero-3d.png"
                alt="Ruang Pintar School 3D Space"
                width={240}
                height={200}
                priority
                className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(37,99,235,0.22)] transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. B2B COMMERCIAL & OPERATIONAL KPI CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Tenant Terdaftar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300/50 dark:hover:border-blue-700/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Total Tenant Mitra
            </span>
            <div className="size-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {totalSchools}
            </span>
            <span className="text-xs text-slate-400 font-medium">Institusi</span>
          </div>
          <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            {totalActive} Operasional Aktif
          </div>
        </div>

        {/* Lisensi Penuh Institusi */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-300/50 dark:hover:border-emerald-700/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Lisensi Penuh (BOS / Paid)
            </span>
            <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {totalFullLicense}
            </span>
            <span className="text-xs text-slate-400 font-medium">Sekolah</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400">Kontrak Langganan Tahunan</div>
        </div>

        {/* Freemium & Trial Radar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-300/50 dark:hover:border-amber-700/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Freemium (Trial 30 Hari)
            </span>
            <div className="size-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {totalFreemium}
            </span>
            <span className="text-xs text-slate-400 font-medium">Evaluasi</span>
          </div>
          <div className="mt-2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
            {expiringSoonCount > 0
              ? `${expiringSoonCount} Perlu Follow-Up (≤ 7 Hari)`
              : "Semua Masa Trial Aman"}
          </div>
        </div>

        {/* Kapasitas Siswa Terkelola */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-300/50 dark:hover:border-indigo-700/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Siswa Terdaftar Ekosistem
            </span>
            <div className="size-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {totalSiswaAll}
            </span>
            <span className="text-xs text-slate-400 font-medium">Siswa Terdata</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-mono">
            {totalGuruAll} Guru • {totalRombelAll} Rombel
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. ACADEMIC DATA TABLE MULTI-TENANT DIRECTORY
      ───────────────────────────────────────────────────────────── */}
      <AcademicDataTable<SchoolTenantItem>
        data={schools}
        columns={columns}
        filters={filters}
        searchPlaceholder="Cari nama sekolah, NPSN, atau kota/alamat..."
        searchKeys={["nama", "npsn", "alamat", "email", "telepon"]}
        exportFilename="direktori-sekolah-lisensi-ruang-pintar"
        emptyStateTitle="Belum Ada Institusi Sekolah Terdaftar"
        emptyStateDescription="Platform SaaS Ruang Pintar saat ini belum memiliki tenant sekolah terdaftar atau tidak ada data yang cocok dengan filter pencarian."
        primaryAction={
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="size-4" />
            <span>Tambah Sekolah</span>
          </button>
        }
        renderMobileCard={renderMobileSchoolCard}
        pageSizeOptions={[10, 25, 50, 100]}
        defaultPageSize={10}
      />

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL DAFTARKAN SEKOLAH BARU
      ───────────────────────────────────────────────────────────── */}
      <CreateSchoolModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          7. MODAL PROVISIONING LISENSI & KUOTA B2B
      ───────────────────────────────────────────────────────────── */}
      <ManageLicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => {
          setIsLicenseModalOpen(false);
          setSelectedSchoolForLicense(null);
        }}
        onSuccess={() => {
          setFeedback({
            type: "success",
            text: "Lisensi dan kuota tenant berhasil disimpan secara transaksional.",
          });
          router.refresh();
        }}
        school={selectedSchoolForLicense}
      />
    </div>
  );
}
