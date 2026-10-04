"use client";

/**
 * Ruang Pintar — Academic Glass UI: Rombel Join Code Card
 * Komponen kendali kode & link undangan mandiri bagi Guru Mata Pelajaran / Wali Kelas.
 */

import React, { useState, useEffect, useTransition } from "react";
import {
  Copy,
  Check,
  RefreshCw,
  QrCode,
  Share2,
  Users,
  ShieldCheck,
  Power,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { RombelJoinCodeDTO } from "../domain/rombel-join-types";
import {
  getRombelJoinCodeAction,
  regenerateRombelJoinCodeAction,
  toggleRombelJoinCodeAction,
} from "@/app/actions/rombel-join-actions";

interface RombelJoinCodeCardProps {
  rombelId: string;
  rombelNama: string;
  initialData?: RombelJoinCodeDTO | null;
  className?: string;
}

export function RombelJoinCodeCard({
  rombelId,
  rombelNama,
  initialData,
  className = "",
}: RombelJoinCodeCardProps) {
  const [data, setData] = useState<RombelJoinCodeDTO | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!initialData && rombelId) {
      let isMounted = true;
      getRombelJoinCodeAction(rombelId)
        .then((res) => {
          if (isMounted) {
            if (res.success && res.data) {
              setData(res.data);
            } else {
              setErrorMessage(res.message || "Gagal memuat kode gabung.");
            }
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setErrorMessage(err.message);
            setLoading(false);
          }
        });
      return () => {
        isMounted = false;
      };
    }
  }, [rombelId, initialData]);

  const handleCopyCode = async () => {
    if (!data?.code) return;
    try {
      await navigator.clipboard.writeText(data.code);
      setCopyCodeSuccess(true);
      setTimeout(() => setCopyCodeSuccess(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleCopyLink = async () => {
    if (!data?.code) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullLink = `${origin}${data.shareLink}`;
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleRegenerate = () => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin memperbarui kode gabung? Kode lama tidak akan berlaku lagi."
      )
    ) {
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    startTransition(async () => {
      const res = await regenerateRombelJoinCodeAction(rombelId);
      if (res.success && res.data) {
        setData(res.data);
        setStatusMessage("Kode berhasil diperbarui.");
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setErrorMessage(res.message || "Gagal memperbarui kode.");
      }
    });
  };

  const handleToggle = () => {
    if (!data) return;
    const nextStatus = !data.isActive;
    setErrorMessage(null);
    setStatusMessage(null);
    startTransition(async () => {
      const res = await toggleRombelJoinCodeAction(rombelId, nextStatus);
      if (res.success && res.data) {
        setData(res.data);
        setStatusMessage(
          nextStatus ? "Pendaftaran via kode dibuka." : "Pendaftaran via kode ditutup."
        );
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setErrorMessage(res.message || "Gagal mengubah status pendaftaran.");
      }
    });
  };

  if (loading) {
    return (
      <div
        className={`p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md animate-pulse ${className}`}
      >
        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-3"></div>
        <div className="h-10 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl mb-3"></div>
        <div className="h-8 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>
    );
  }

  if (errorMessage && !data) {
    return (
      <div
        className={`p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3 ${className}`}
      >
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p>{errorMessage}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 backdrop-blur-xl ${
        data.isActive
          ? "border-emerald-500/20 dark:border-emerald-500/30 bg-gradient-to-br from-white/90 via-emerald-500/[0.02] to-white/70 dark:from-slate-900/90 dark:via-emerald-950/[0.05] dark:to-slate-900/70 shadow-sm"
          : "border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 opacity-90"
      } p-5 ${className}`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              data.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400 dark:bg-slate-600"
            }`}
          />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Kode Undangan Mandiri
          </h4>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
              data.isActive
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700"
            }`}
          >
            {data.isActive ? "Aktif" : "Nonaktif"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            disabled={isPending}
            title={
              data.isActive ? "Nonaktifkan pendaftaran mandiri" : "Aktifkan pendaftaran mandiri"
            }
            className={`p-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${
              data.isActive
                ? "text-slate-600 hover:text-rose-600 border-slate-200 hover:border-rose-300 bg-white/80 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-400 dark:hover:text-rose-400"
                : "text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{data.isActive ? "Tutup" : "Buka"}</span>
          </button>
        </div>
      </div>

      {/* Main Code Box */}
      <div className="relative mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/60 shadow-inner">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-0.5 tracking-wider">
            Kode Gabung Siswa
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-mono font-black tracking-widest text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-white">
              {data.code}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm"
          >
            {copyCodeSuccess ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copyCodeSuccess ? "Tersalin!" : "Salin Kode"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition"
          >
            {copyLinkSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span>{copyLinkSuccess ? "Tautan Tersalin!" : "Salin Link"}</span>
          </button>

          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isPending}
            title="Regenerasi kode baru (kode lama otomatis hangus)"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Footer Info / Micro Metrics */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" />
            <strong className="text-slate-700 dark:text-slate-300">{data.totalSiswa}</strong> /{" "}
            {data.kapasitas} Siswa
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Isolasi Tenant Terjamin
          </span>
        </div>

        <a
          href={data.shareLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium hover:underline text-[11px]"
        >
          <span>Buka Portal Join</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in">
          ✓ {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 font-medium animate-fade-in">
          ⚠ {errorMessage}
        </div>
      )}
    </div>
  );
}
