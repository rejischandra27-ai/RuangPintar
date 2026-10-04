"use client";

import React from "react";
import Link from "next/link";
import { ClipboardCheck, BookOpen } from "lucide-react";
import { motion } from "@/shared/components/motion/motion-elements";

export function TeacherHeroActions() {
  return (
    <div className="flex items-center gap-2.5 pt-1.5 flex-wrap">
      {/* 1. Presensi Kilat (Primary Blue, Compact) */}
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Link
          href="/presensi-kelas"
          className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-mono font-bold shadow-xs shadow-blue-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ClipboardCheck className="h-3.5 w-3.5" />
          <span>Presensi Kilat 15 Detik</span>
        </Link>
      </motion.div>

      {/* 2. Perangkat Ajar (Compact) */}
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Link
          href="/sesi-pembelajaran"
          className="px-3.5 py-2 rounded-xl bg-slate-50/90 hover:bg-slate-100/90 dark:bg-slate-900/70 dark:hover:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Perangkat Ajar</span>
        </Link>
      </motion.div>
    </div>
  );
}
