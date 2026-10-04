"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerTeacherAction } from "@/app/actions/smart-onboarding-actions";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Camera,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Loader2,
} from "lucide-react";

export function RegisterView() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await registerTeacherAction(formData);

    if (!res.success) {
      setErrorMessage(res.error || "Pendaftaran gagal. Silakan periksa kembali formulir Anda.");
      setLoading(false);
      return;
    }

    // Berhasil daftar -> otomatis login & langsung arahkan ke dashboard
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Glass Lighting */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Mulai Uji Coba Gratis 30 Hari
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Ruang <span className="text-sky-400">Pintar</span>
          </h1>
          <p className="mt-2 text-base text-slate-400 max-w-xl mx-auto">
            Buku kerja guru digital modern: absen kelas kilat 15 detik, rekapitulasi otomatis format
            A4 resmi, dan asisten pemindai foto kelas via AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Keunggulan Guru Mandiri */}
          <div className="md:col-span-5 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-4">
                <GraduationCap className="w-5 h-5" />
                Didesain Khusus Guru Indonesia
              </div>

              <h3 className="text-xl font-bold text-white mb-4">
                Bebaskan Diri Anda dari Kerumitan Excel Manual
              </h3>

              <div className="space-y-4 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5 border border-emerald-500/20">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Absensi Cepat 15 Detik:</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tandai semua hadir sekali klik di HP atau laptop saat jam KBM dimulai.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 mt-0.5 border border-sky-500/20">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Scan Foto Kertas via AI:</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cukup foto kertas daftar siswa Anda, AI membaca dan menyiapkan kelas secara
                      otomatis.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5 border border-amber-500/20">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Cetak A4 & Ekspor Excel:</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Rekapitulasi bulanan resmi berstandar Kurikulum Merdeka siap serah ke Kepala
                      Sekolah.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Tanpa kartu kredit • Data terisolasi aman • Siap pakai</span>
              </div>
            </div>
          </div>

          {/* Right Column: Formulir Pendaftaran 4 Kolom */}
          <div className="md:col-span-7 bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-center">
            <h2 className="text-xl font-bold text-white mb-2">Daftar Akun Guru Mandiri</h2>
            <p className="text-xs text-slate-400 mb-6">
              Isi data singkat berikut untuk langsung memulai uji coba gratis 30 hari Anda:
            </p>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Lengkap & Gelar <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="nama_lengkap"
                  required
                  placeholder="Contoh: Budi Santoso, S.Pd"
                  className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
                />
              </div>

              <div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Aktif <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="nama@gmail.com"
                    className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Kata Sandi Baru <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white font-semibold rounded-xl text-sm shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyiapkan Ruang Pintar Anda...
                  </>
                ) : (
                  <>
                    <span>Mulai Coba Gratis 30 Hari</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
              Sudah memiliki akun?{" "}
              <Link
                href="/login"
                className="text-sky-400 hover:text-sky-300 font-semibold underline"
              >
                Masuk ke Aplikasi
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
