"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Users, Clock, ClipboardCheck, ShieldCheck } from "lucide-react";
import {
  StaggerContainer,
  StaggerItem,
  InteractiveCard,
} from "@/shared/components/motion/motion-elements";
import { AnimatedCounter } from "@/shared/components/motion/animated-counter";

export interface TeacherKpiGridProps {
  isOwnerTenant?: boolean;
  totalRombel: number;
  activeAssignmentsCount: number;
  uniqueMapelsCount: number;
  totalSiswaBinaan: number;
  totalJamMinggu: number;
  totalTugasPerluDiperiksa: number;
  totalCbtAktif: number;
}

export function TeacherKpiGrid({
  isOwnerTenant = false,
  totalRombel,
  activeAssignmentsCount,
  uniqueMapelsCount,
  totalSiswaBinaan,
  totalJamMinggu,
  totalTugasPerluDiperiksa,
  totalCbtAktif,
}: TeacherKpiGridProps) {
  return (
    <StaggerContainer
      staggerDelay={0.06}
      delayChildren={0.02}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4"
    >
      {/* 1. Total Rombel & Penugasan Mengajar */}
      <StaggerItem>
        <Link href="/kelas-saya" className="block h-full group">
          <InteractiveCard
            hoverY={-3}
            hoverScale={1.02}
            className="h-full p-4 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isOwnerTenant ? "Total Kelas" : "Rombel Diajar"}
              </span>
              <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 group-hover:scale-110 transition-transform">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                <AnimatedCounter value={totalRombel} decimals={0} suffix=" Rombel" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {activeAssignmentsCount} Penugasan • {uniqueMapelsCount} Mapel
              </p>
            </div>
          </InteractiveCard>
        </Link>
      </StaggerItem>

      {/* 2. Total Siswa Riil */}
      <StaggerItem>
        <InteractiveCard
          hoverY={-3}
          hoverScale={1.02}
          className="h-full p-4 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isOwnerTenant ? "Siswa Workspace" : "Siswa Binaan"}
            </span>
            <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="font-mono text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              <AnimatedCounter value={totalSiswaBinaan} decimals={0} />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Total Siswa Aktif
            </p>
          </div>
        </InteractiveCard>
      </StaggerItem>

      {/* 3. Total Beban Mengajar (JP Riil) */}
      <StaggerItem>
        <Link href="/jadwal-saya" className="block h-full group">
          <InteractiveCard
            hoverY={-3}
            hoverScale={1.02}
            className="h-full p-4 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Beban KBM
              </span>
              <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="font-mono text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                <AnimatedCounter value={totalJamMinggu} decimals={0} suffix=" JP" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Jam per Minggu
              </p>
            </div>
          </InteractiveCard>
        </Link>
      </StaggerItem>

      {/* 4. Tugas Belum Dinilai */}
      <StaggerItem>
        <Link href="/penilaian" className="block h-full group">
          <InteractiveCard
            hoverY={-3}
            hoverScale={1.02}
            className="h-full p-4 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Koreksi Tugas
              </span>
              <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                <AnimatedCounter value={totalTugasPerluDiperiksa} decimals={0} />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {totalTugasPerluDiperiksa > 0 ? "Menunggu Penilaian" : "Semua Terkoreksi"}
              </p>
            </div>
          </InteractiveCard>
        </Link>
      </StaggerItem>

      {/* 5. CBT & Ujian Aktif */}
      <StaggerItem className="col-span-2 sm:col-span-1">
        <Link href="/cbt-ujian" className="block h-full group">
          <InteractiveCard
            hoverY={-3}
            hoverScale={1.02}
            className="h-full p-4 rounded-2xl bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                CBT Aktif
              </span>
              <div className="p-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                <AnimatedCounter value={totalCbtAktif} decimals={0} />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {totalCbtAktif > 0 ? "Ujian Berlangsung" : "Tidak Ada Ujian Aktif"}
              </p>
            </div>
          </InteractiveCard>
        </Link>
      </StaggerItem>
    </StaggerContainer>
  );
}
