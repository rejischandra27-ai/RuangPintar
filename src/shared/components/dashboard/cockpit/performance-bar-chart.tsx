"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, TrendingUp, BarChart2 } from "lucide-react";
import { motion } from "@/shared/components/motion/motion-elements";

export interface ClassPerformanceItem {
  id: string;
  name: string;
  score: number;
  subject?: string;
}

interface PerformanceBarChartProps {
  items: ClassPerformanceItem[];
  averageScore?: number | null;
  bestClass?: { name: string; score: number } | null;
}

export function PerformanceBarChart({
  items = [],
  averageScore,
  bestClass,
}: PerformanceBarChartProps) {
  const hasData = items.length > 0;
  const chartData = hasData ? items.slice(0, 6) : [];

  const highestScore = hasData ? Math.max(...chartData.map((d) => d.score), 0) : 0;
  const best = bestClass || (hasData ? chartData.find((d) => d.score === highestScore) : null);

  return (
    <div className="rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 p-6 shadow-xs dark:shadow-[0_0_30px_-5px_rgba(37,99,235,0.16)] flex flex-col justify-between h-full">
      {/* Header Row */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="font-mono text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Ketuntasan Penilaian
            </h3>
          </div>
          <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Semester Ini
          </span>
        </div>

        {hasData && best ? (
          /* Top Highlight & Action Button */
          <div className="flex items-end justify-between gap-4 mt-4">
            <div>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block">
                Kelas dengan Ketuntasan Tertinggi
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {best.score.toFixed(1)}
                </span>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold leading-tight">
                  <span>{best.name}</span>
                  <span className="block text-[10px] text-slate-400 font-normal">
                    Rata-rata Kelas
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/penilaian"
              className="px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-mono font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
            >
              <span>Semua Kelas</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="mt-4">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block">
              Ketuntasan Belajar Rombel
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                -
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Belum Ada Nilai Masuk
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content Area: Bar Chart or Genuine Empty State */}
      {hasData ? (
        <div className="pt-6 pb-2">
          <div className="grid grid-cols-6 gap-2 sm:gap-3 items-end h-32 sm:h-36 px-1">
            {chartData.map((c, idx) => {
              const isTop = c.score === highestScore;
              const heightPercent = Math.min(100, Math.max(15, c.score));

              return (
                <div key={c.id} className="flex flex-col items-center h-full justify-end group">
                  {/* Score floating above bar */}
                  <span className="font-mono text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1.5">
                    {c.score.toFixed(1)}
                  </span>

                  {/* Pill Track Bar Container */}
                  <div className="w-full max-w-[28px] sm:max-w-[34px] h-24 sm:h-28 rounded-full bg-slate-100 dark:bg-slate-800/80 p-1 flex flex-col justify-end overflow-hidden">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{
                        duration: 0.7,
                        delay: idx * 0.08,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className={`w-full rounded-full ${
                        isTop
                          ? "bg-gradient-to-t from-blue-600 to-indigo-500 shadow-sm shadow-blue-500/30"
                          : "bg-blue-500/80 dark:bg-blue-600/70 group-hover:bg-blue-600"
                      }`}
                    />
                  </div>

                  {/* Class Label underneath */}
                  <span
                    title={c.name}
                    className={`mt-2 text-[10px] sm:text-[11px] font-mono font-bold truncate max-w-full text-center ${
                      isTop
                        ? "text-blue-600 dark:text-blue-400 font-extrabold"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {c.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-6 px-4 text-center flex flex-col items-center justify-center space-y-3">
          <div className="h-11 w-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shadow-xs">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Belum Ada Penilaian Terbit
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              Input asesmen formatif atau sumatif untuk memvisualisasikan ketuntasan belajar rombel
              Anda.
            </p>
          </div>
          <Link
            href="/penilaian"
            className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 text-xs font-mono font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs"
          >
            <span>+ Input Penilaian</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
