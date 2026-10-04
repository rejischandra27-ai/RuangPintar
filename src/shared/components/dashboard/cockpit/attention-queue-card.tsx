"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, MessageSquare, CheckCircle2, ChevronRight } from "lucide-react";

export interface StudentAttentionItem {
  id: string;
  nama: string;
  rombel: string;
  kategori: "REMEDIAL" | "ABSENSI" | "TUGAS";
  keterangan: string;
  nomorWaOrangTua?: string;
  avatarUrl?: string;
}

interface AttentionQueueCardProps {
  items?: StudentAttentionItem[];
}

export function AttentionQueueCard({ items = [] }: AttentionQueueCardProps) {
  const hasItems = items.length > 0;

  return (
    <div className="rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 p-6 shadow-xs dark:shadow-[0_0_30px_-5px_rgba(37,99,235,0.16)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-mono text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Siswa Perlu Perhatian
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
              Tindak lanjut kendala akademik, tugas, dan absensi rombel
            </span>
          </div>
        </div>

        <Link
          href="/data-siswa"
          className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
        >
          <span>Lihat Semua</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Content: List or Genuine Empty State */}
      {hasItems ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {items.map((item) => {
            const badgeStyle =
              item.kategori === "ABSENSI"
                ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60"
                : item.kategori === "REMEDIAL"
                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60"
                  : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/60";

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 border border-slate-200/70 dark:border-blue-500/20 p-3.5 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition-all"
              >
                <div className="space-y-2">
                  {/* Header: Avatar + Name + Class Badge */}
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-2xs">
                      {item.nama.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.nama}
                      </h4>
                      <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">
                        {item.rombel}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold border shrink-0 ${badgeStyle}`}
                    >
                      {item.kategori}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                    {item.keterangan}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    Hubungi Orang Tua
                  </span>

                  <div className="flex items-center gap-1.5">
                    {item.nomorWaOrangTua && (
                      <a
                        href={`https://wa.me/${item.nomorWaOrangTua}?text=Halo%20Bapak%2FIbu%20Wali%20Murid%20dari%20${encodeURIComponent(
                          item.nama
                        )},%20kami%20dari%20sekolah%20ingin%20menginformasikan%20terkait%20${encodeURIComponent(
                          item.keterangan
                        )}.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Kirim Pesan WhatsApp ke Orang Tua"
                        className="h-7 w-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </a>
                    )}

                    <Link
                      href={`/penilaian`}
                      title="Buka Buku Nilai Siswa"
                      className="h-7 w-7 rounded-lg bg-slate-200/70 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-950/60 text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-7 px-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-blue-500/10 text-center flex flex-col items-center justify-center space-y-2.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Menunggu Aktivitas Pembelajaran
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Belum ada catatan tindak lanjut. Data perhatian khusus siswa (remedial nilai, tugas
              tertunda, atau absensi) akan terakumulasi otomatis seiring berjalannya KBM.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
