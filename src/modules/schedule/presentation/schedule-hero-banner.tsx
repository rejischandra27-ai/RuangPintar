"use client";

/**
 * Ruang Pintar — M10 Schedule Hero Banner (Dashboard Aligned, Clean & Professional)
 *
 * Mengadopsi arsitektur visual resmi dashboard:
 * - Breadcrumb navigation terstruktur
 * - Tipografi rapih dan konsisten tanpa fluktuasi warna
 * - Badges & pills proporsional (Total Sesi, Mata Pelajaran, Rombel)
 * - Ilustrasi 3D terpadu (academic-structure-3d.png) dengan layout proporsional
 */

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, BookOpen, Layers } from "lucide-react";
import { AnimatedCounter } from "@/shared/components/motion/animated-counter";

interface ScheduleHeroBannerProps {
  isTeacher: boolean;
  schoolName: string;
  totalSessions: number;
  totalSubjects: number;
  totalRombels: number;
}

export function ScheduleHeroBanner({
  isTeacher,
  schoolName,
  totalSessions,
  totalSubjects,
  totalRombels,
}: ScheduleHeroBannerProps) {
  return (
    <div className="relative rounded-3xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Subtle Right-side Ambient Gradient */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-50/70 dark:from-blue-950/30 to-transparent rounded-r-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left Content */}
        <div className="w-full md:max-w-[65%] lg:max-w-[70%] space-y-3.5">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Link href="/dashboard" className="hover:text-[#2563EB] transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Jadwal Saya</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {isTeacher ? "Jadwal Mengajar Saya" : "Jadwal Pelajaran Saya"}
              </h1>
              {schoolName && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 text-[#2563EB] dark:text-blue-400 font-bold text-xs font-mono">
                  {schoolName}
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed max-w-2xl">
              {isTeacher
                ? "Daftar alokasi waktu mengajar mingguan resmi dan akses langsung pembukaan sesi kelas KBM."
                : "Jadwal mata pelajaran mingguan rombel belajar Anda berdasarkan publikasi kurikulum resmi."}
            </p>
          </div>

          {/* Quick Status Badges (Konsisten & Rapi) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
              <Clock className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-400" />
              <span>
                Total Sesi:{" "}
                <strong className="font-mono text-slate-900 dark:text-white">
                  {totalSessions > 0 ? (
                    <AnimatedCounter value={totalSessions} duration={0.8} suffix=" Sesi" />
                  ) : (
                    "0 Sesi"
                  )}
                </strong>
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                Mata Pelajaran:{" "}
                <strong className="font-mono text-emerald-900 dark:text-emerald-100">
                  <AnimatedCounter value={totalSubjects} duration={0.8} />
                </strong>
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-medium text-indigo-700 dark:text-indigo-300">
              <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>
                Rombel:{" "}
                <strong className="font-mono text-indigo-900 dark:text-indigo-100">
                  <AnimatedCounter value={totalRombels} duration={0.8} />
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Hero Illustration (Proportional 3D Isometric, Non-Clipping) */}
        <div className="hidden md:flex flex-col items-center justify-center shrink-0 relative pr-2">
          <div className="relative w-44 h-36 lg:w-52 lg:h-44 transition-transform duration-300 hover:scale-102">
            <Image
              src="/images/illustrations/academic-structure-3d.png"
              alt="Ilustrasi Jadwal Akademik"
              fill
              sizes="(max-width: 1024px) 176px, 208px"
              className="object-contain drop-shadow-md"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
