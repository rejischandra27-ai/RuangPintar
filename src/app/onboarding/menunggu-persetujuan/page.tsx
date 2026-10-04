import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { AuthLoginLayout } from "@/shared/components/auth/auth-login-layout";
import { Clock, ShieldCheck, ArrowRight, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Menunggu Persetujuan Sekolah — Ruang Pintar",
  description: "Permohonan bergabung Anda sedang ditinjau oleh pihak sekolah.",
};

export default function MenungguPersetujuanPage() {
  return (
    <AuthLoginLayout
      title="Menunggu Persetujuan"
      description="Permohonan bergabung Anda telah dikirimkan ke pihak sekolah terkait."
      badge="Verifikasi Sekolah"
    >
      <div className="flex flex-col items-center text-center w-full py-4 sm:py-6">
        <div className="relative mb-6">
          <div className="size-20 sm:size-24 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-700 flex items-center justify-center shadow-sm">
            <Clock className="size-10 sm:size-12 stroke-[1.75]" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1.5 shadow-md border-2 border-white flex items-center justify-center">
            <ShieldCheck className="size-4 stroke-[2.5]" />
          </div>
        </div>

        <div className="space-y-2 mb-6 max-w-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Permohonan Terkirim
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Administrator atau Kepala Sekolah akan memeriksa data Anda. Setelah disetujui, Anda akan
            langsung terhubung ke jadwal dan administrasi resmi sekolah.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 w-full max-w-sm mb-6 text-left space-y-2">
          <div className="text-xs font-semibold text-slate-700">Langkah Berikutnya:</div>
          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
            <li>Admin sekolah menerima notifikasi pengajuan akun Anda.</li>
            <li>Status keanggotaan akan aktif otomatis setelah disetujui.</li>
            <li>Anda tetap dapat masuk dan melihat ruang kerja sementara Anda.</li>
          </ul>
        </div>

        <div className="w-full max-w-sm space-y-2.5">
          <Link
            href="/dashboard"
            className="h-11 sm:h-12 w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm shadow-md transition-colors"
          >
            <Home className="size-4" />
            <span>Kembali ke Dashboard Sementara</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </AuthLoginLayout>
  );
}
