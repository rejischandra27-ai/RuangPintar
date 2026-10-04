"use client";

/**
 * Ruang Pintar — Academic Glass UI: Student Self-Service Rombel Join View (Stage 15)
 * Halaman gabung rombel mandiri untuk siswa dengan kode atau link undangan.
 */

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Sparkles,
  School,
  Calendar,
  Users,
  UserCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { RombelJoinPreviewDTO, JoinRombelResultDTO } from "../domain/rombel-join-types";
import {
  previewRombelJoinCodeAction,
  joinRombelWithCodeAction,
} from "@/app/actions/rombel-join-actions";
import { AuthenticatedUser } from "@/shared/infrastructure/auth/auth-service";

interface RombelJoinViewProps {
  initialCode?: string;
  currentUser?: AuthenticatedUser | null;
}

export function RombelJoinView({ initialCode = "", currentUser }: RombelJoinViewProps) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [preview, setPreview] = useState<RombelJoinPreviewDTO | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(Boolean(initialCode));
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [joinResult, setJoinResult] = useState<JoinRombelResultDTO | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, startJoinTransition] = useTransition();

  const handlePreview = async (inputCode: string) => {
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;

    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreview(null);
    setJoinResult(null);
    setJoinError(null);

    try {
      const res = await previewRombelJoinCodeAction(clean);
      if (res.success && res.data) {
        setPreview(res.data);
      } else {
        setPreviewError(res.message || "Kode gabung tidak ditemukan atau tidak aktif.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memeriksa kode.";
      setPreviewError(message);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (initialCode) {
      const clean = initialCode.trim().toUpperCase();
      if (clean) {
        void previewRombelJoinCodeAction(clean)
          .then((res) => {
            if (!ignore) {
              if (res.success && res.data) {
                setPreview(res.data);
              } else {
                setPreviewError(res.message || "Kode gabung tidak ditemukan atau tidak aktif.");
              }
              setIsLoadingPreview(false);
            }
          })
          .catch((err: unknown) => {
            if (!ignore) {
              const msg =
                err instanceof Error ? err.message : "Terjadi kesalahan saat memeriksa kode.";
              setPreviewError(msg);
              setIsLoadingPreview(false);
            }
          });
      }
    }
    return () => {
      ignore = true;
    };
  }, [initialCode]);

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      handlePreview(code);
    }
  };

  const handleJoin = () => {
    if (!preview) return;
    setJoinError(null);

    startJoinTransition(async () => {
      const res = await joinRombelWithCodeAction(preview.code);
      if (res.success && res.data) {
        setJoinResult(res.data);
      } else {
        setJoinError(res.message || "Gagal bergabung ke rombel.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            Ruang<span className="text-emerald-400">Pintar</span>
          </span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Pendaftaran Mandiri Rombel
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
          Bergabung ke kelas Anda dengan memasukkan kode unik atau link undangan dari guru/wali
          kelas.
        </p>
      </div>

      {/* Main Glass Card */}
      <div className="w-full max-w-lg bg-slate-950/70 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* SUCCESS STATE */}
        {joinResult ? (
          <div className="text-center py-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Pendaftaran Berhasil!</h2>
            <p className="text-sm text-slate-400 mb-6">
              Selamat datang di kelas,{" "}
              <strong className="text-emerald-400">{joinResult.siswaNama}</strong>.
            </p>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 text-left space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Sekolah</span>
                <span className="font-semibold text-slate-200">{joinResult.namaSekolah}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Rombel</span>
                <span className="font-semibold text-emerald-400">{joinResult.rombelNama}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Nomor Absen</span>
                <span className="font-mono font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded text-xs">
                  {joinResult.nomorAbsen}
                </span>
              </div>
            </div>

            <Link
              href="/dashboard/student"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/30"
            >
              <span>Buka Dashboard Siswa</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div>
            {/* INPUT FORM */}
            <form onSubmit={handleSubmitCode} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Masukkan Kode Gabung Rombel
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: XTO1-2027"
                    className="w-full pl-10 pr-24 py-3 bg-slate-900/90 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-white font-mono font-bold text-base tracking-wider placeholder:text-slate-600 transition"
                  />
                  <button
                    type="submit"
                    disabled={isLoadingPreview || !code.trim()}
                    className="absolute inset-y-1.5 right-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1 transition"
                  >
                    {isLoadingPreview ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Periksa</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* ERROR DISPLAY */}
            {previewError && (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-2.5 mb-6 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <p>{previewError}</p>
              </div>
            )}

            {/* PREVIEW CARD */}
            {preview && (
              <div className="border border-emerald-500/30 bg-emerald-500/[0.03] rounded-2xl p-5 mb-6 animate-fade-in">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                        Rombel Ditemukan
                      </span>
                      <h3 className="text-base font-bold text-white">{preview.rombelNama}</h3>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
                    {preview.tingkat}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <School className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{preview.namaSekolah}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{preview.tahunAjaran}</span>
                  </div>
                  {preview.waliKelas && (
                    <div className="flex items-center gap-2 text-slate-300 col-span-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">Wali Kelas: {preview.waliKelas}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-300 col-span-2">
                    <Users className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>
                      Kapasitas: {preview.totalSiswa} / {preview.kapasitas} siswa (Sisa kuota:{" "}
                      {preview.sisaKuota})
                    </span>
                  </div>
                </div>

                {/* JOIN ACTION OR LOGIN PROMPT */}
                {joinError && (
                  <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}

                {currentUser ? (
                  currentUser.peran_dasar === "STUDENT" ||
                  currentUser.peran_dasar === "SUPER_ADMIN" ? (
                    <button
                      type="button"
                      onClick={handleJoin}
                      disabled={isJoining || preview.sisaKuota <= 0}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/30"
                    >
                      {isJoining ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Mendaftarkan...</span>
                        </>
                      ) : (
                        <>
                          <span>Konfirmasi Bergabung ke Kelas Ini</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      Akun Anda saat ini masuk sebagai <strong>{currentUser.peran_dasar}</strong>.
                      Hanya akun siswa yang dapat mendaftar mandiri ke rombel.
                    </div>
                  )
                ) : (
                  <Link
                    href={`/login?callbackUrl=/join/${preview.code}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/30"
                  >
                    <span>Masuk untuk Bergabung</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )}

            {/* HELP TEXT */}
            <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2 pt-2 border-t border-slate-800/80">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verifikasi otomatis oleh sistem Ruang Pintar</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom link back to portal */}
      <div className="mt-6 text-center">
        <Link href="/login" className="text-xs text-slate-400 hover:text-emerald-400 transition">
          ← Kembali ke Halaman Masuk
        </Link>
      </div>
    </div>
  );
}
