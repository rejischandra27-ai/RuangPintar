"use client";

import * as React from "react";
import {
  ShieldCheck,
  Clock,
  Sparkles,
  X,
  CreditCard,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { updateSchoolLicenseAction } from "@/app/actions/school-actions";

export interface ManageLicenseSchool {
  id: string;
  nama: string;
  npsn: string | null;
  tipe_lisensi: string;
  trial_berakhir_pada: Date | string | null;
  currentPaket?: string;
  currentQuota?: number;
}

interface ManageLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  school: ManageLicenseSchool | null;
}

export function ManageLicenseModal({
  isOpen,
  onClose,
  onSuccess,
  school,
}: ManageLicenseModalProps) {
  const [tipeLisensi, setTipeLisensi] = React.useState<"FREEMIUM" | "SEKOLAH">("SEKOLAH");
  const [paket, setPaket] = React.useState<"TRIAL" | "BASIC" | "PRO" | "ENTERPRISE">("PRO");
  const [durasiBulan, setDurasiBulan] = React.useState<number>(12);
  const [kuotaSiswa, setKuotaSiswa] = React.useState<number>(500);
  const [nomorReferensi, setNomorReferensi] = React.useState<string>("");
  const [catatan, setCatatan] = React.useState<string>("");

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Sync state when school changes (React 19 pattern: adjusting state during render)
  const [prevSchoolId, setPrevSchoolId] = React.useState<string | null>(null);
  if (school && school.id !== prevSchoolId) {
    setPrevSchoolId(school.id);
    setTipeLisensi(school.tipe_lisensi === "SEKOLAH" ? "SEKOLAH" : "FREEMIUM");
    setPaket(
      school.currentPaket === "ENTERPRISE"
        ? "ENTERPRISE"
        : school.currentPaket === "PRO"
          ? "PRO"
          : school.currentPaket === "BASIC"
            ? "BASIC"
            : school.tipe_lisensi === "SEKOLAH"
              ? "PRO"
              : "TRIAL"
    );
    setKuotaSiswa(school.currentQuota || 500);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  if (!isOpen || !school) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await updateSchoolLicenseAction({
        sekolah_id: school.id,
        tipe_lisensi: tipeLisensi,
        paket,
        durasi_bulan: durasiBulan,
        kuota_siswa: kuotaSiswa,
        nomor_referensi: nomorReferensi.trim() || undefined,
        catatan: catatan.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error);
        return;
      }

      setSuccessMessage(res.message || "Lisensi sekolah berhasil diperbarui.");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Terjadi kesalahan internal saat memperbarui lisensi."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
              <CreditCard className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Atur Lisensi & Kuota Institusi
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider">
                  B2B Provisioning
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {school.nama} • {school.npsn ? `NPSN: ${school.npsn}` : "Tanpa NPSN"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Tipe Lisensi Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Model Lisensi Tenant
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTipeLisensi("SEKOLAH");
                  if (paket === "TRIAL") setPaket("PRO");
                }}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                  tipeLisensi === "SEKOLAH"
                    ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div
                  className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${
                    tipeLisensi === "SEKOLAH"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    Lisensi Penuh Institusi
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    BOS / Yayasan Tahunan
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipeLisensi("FREEMIUM");
                  setPaket("TRIAL");
                }}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                  tipeLisensi === "FREEMIUM"
                    ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div
                  className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${
                    tipeLisensi === "FREEMIUM"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  <Clock className="size-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    Freemium / Trial
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Evaluasi Terbatas
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Tier Paket & Durasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Paket Tier */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tingkat Paket (Feature Tier)
              </label>
              <select
                value={paket}
                onChange={(e) =>
                  setPaket(e.target.value as "TRIAL" | "BASIC" | "PRO" | "ENTERPRISE")
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
              >
                <option value="TRIAL">TRIAL — Uji Coba Terbatas</option>
                <option value="BASIC">BASIC — Modul Inti Akademik</option>
                <option value="PRO">PRO — Rapor Merdeka & CBT Pro</option>
                <option value="ENTERPRISE">ENTERPRISE — Ekosistem Penuh & AI</option>
              </select>
            </div>

            {/* Durasi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Durasi Masa Aktif
              </label>
              <select
                value={durasiBulan}
                onChange={(e) => setDurasiBulan(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
              >
                <option value={1}>1 Bulan (Trial / Bulanan)</option>
                <option value={6}>6 Bulan (1 Semester Penuh)</option>
                <option value={12}>12 Bulan (1 Tahun Ajaran)</option>
                <option value={24}>24 Bulan (2 Tahun)</option>
                <option value={36}>36 Bulan (3 Tahun Kontrak)</option>
              </select>
            </div>
          </div>

          {/* 3. Batas Kuota Siswa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Batas Kuota Siswa Aktif (Seat Quota)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[250, 500, 1000, 2500].map((quota) => (
                <button
                  type="button"
                  key={quota}
                  onClick={() => setKuotaSiswa(quota)}
                  className={`py-2 px-1 text-center rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                    kuotaSiswa === quota
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {quota} Siswa
                </button>
              ))}
            </div>
          </div>

          {/* 4. Nomor Referensi Billing & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                No. Referensi / PO / Kwitansi BOS
              </label>
              <input
                type="text"
                placeholder="Contoh: BOS-2026/SMK-01"
                value={nomorReferensi}
                onChange={(e) => setNomorReferensi(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Operasional Super Admin
              </label>
              <input
                type="text"
                placeholder="Catatan verifikasi lisensi..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  <span>Simpan Perubahan Lisensi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
