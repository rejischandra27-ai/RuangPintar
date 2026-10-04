"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Users,
  Target,
  Layers,
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";

export interface TeacherGradebookOverviewItem {
  penugasan_id: string;
  rombel_id: string;
  rombel_nama: string;
  tingkat_nama: string | null;
  mata_pelajaran_id: string;
  mata_pelajaran_nama: string;
  guru_id: string;
  guru_nama: string;
  tahun_ajaran_nama: string;
  total_siswa: number;
  total_asesmen: number;
  total_formatif: number;
  total_sumatif: number;
  total_published: number;
  rata_rata_kelas: number | null;
}

interface TeacherGradebookOverviewViewProps {
  overviewList: TeacherGradebookOverviewItem[];
  isSuperAdmin: boolean;
}

export function TeacherGradebookOverviewView({
  overviewList,
  isSuperAdmin,
}: TeacherGradebookOverviewViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRombel, setSelectedRombel] = useState<string>("ALL");

  const rombelOptions = Array.from(new Set(overviewList.map((item) => item.rombel_nama)));

  const filteredList = overviewList.filter((item) => {
    const matchSearch =
      item.mata_pelajaran_nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rombel_nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.guru_nama.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRombel = selectedRombel === "ALL" || item.rombel_nama === selectedRombel;
    return matchSearch && matchRombel;
  });

  const totalClasses = overviewList.length;
  const totalAssessmentsAll = overviewList.reduce((acc, curr) => acc + curr.total_asesmen, 0);
  const totalStudentsAll = overviewList.reduce((acc, curr) => acc + curr.total_siswa, 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Hero Header */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-bold">
              <GraduationCap className="h-3.5 w-3.5" />
              Buku Nilai & e-Rapor
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Buku Nilai & Penilaian TP
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Pusat pengelolaan penilaian formatif, sumatif, dan buku nilai seluruh rombel KBM
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-400">Total Rombel:</span>
              <strong className="text-slate-800 text-sm">
                {new Set(overviewList.map((item) => item.rombel_id)).size} Rombel
              </strong>
              <span className="text-slate-400 text-[11px]">({totalClasses} Penugasan)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mata pelajaran, kelas, atau guru..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-400">Rombel:</span>
          <select
            value={selectedRombel}
            onChange={(e) => setSelectedRombel(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">Semua Rombel</option>
            {rombelOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Classes */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <GraduationCap className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Tidak Ada Kelas Penugasan Ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Pastikan penugasan mengajar aktif telah dikonfigurasi pada struktur kurikulum sekolah.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((c) => (
            <div
              key={c.penugasan_id}
              className="group rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-50 text-[#2563EB] mb-1">
                      {c.rombel_nama}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors line-clamp-1">
                      {c.mata_pelajaran_nama}
                    </h3>
                  </div>
                  {isSuperAdmin && (
                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                      {c.guru_nama}
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-100 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Siswa</span>
                    <span className="font-bold text-slate-800">{c.total_siswa}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Asesmen</span>
                    <span className="font-bold text-slate-800">{c.total_asesmen}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Rata-rata</span>
                    <span className="font-bold text-[#2563EB]">
                      {c.rata_rata_kelas !== null ? c.rata_rata_kelas : "-"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Formatif: <strong>{c.total_formatif}</strong> | Sumatif:{" "}
                    <strong>{c.total_sumatif}</strong>
                  </span>
                  <span className="text-emerald-600 font-semibold">
                    {c.total_published} Dipublikasi
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <Link
                  href={`/kelas-saya/${c.penugasan_id}?tab=PENILAIAN`}
                  className="w-full h-9 rounded-xl bg-slate-100 hover:bg-[#2563EB] text-slate-700 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Buka Buku Nilai
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
