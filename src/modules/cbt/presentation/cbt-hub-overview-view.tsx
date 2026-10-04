"use client";

/**
 * Ruang Pintar — CBT Hub Overview View (Academic Glass UI v1.2)
 *
 * Pusat Pengelolaan & Direktori CBT (/cbt-ujian):
 * - Untuk Guru & Admin: Direktori kelas ampu, bank soal cepat, monitoring hasil & nilai
 * - Untuk Siswa: Daftar ujian daring terjadwal, status pengerjaan, dan tombol mulai ujian
 */

import React, { useState } from "react";
import Link from "next/link";
import {
  FileCheck,
  BookOpen,
  Clock,
  Layers,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  Eye,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Users,
  Award,
  Key,
  Copy,
  RefreshCw,
} from "lucide-react";
import { QuestionBankModal } from "./question-bank-modal";
import { ExamResultsModal } from "./exam-results-modal";

export interface TeacherCbtClassItem {
  penugasan_id: string;
  rombel_id: string;
  rombel_nama: string;
  mata_pelajaran_id: string;
  mata_pelajaran_nama: string;
  guru_nama: string;
  total_ujian: number;
  total_published: number;
  total_draft: number;
  total_selesai: number;
  exams: {
    id: string;
    judul: string;
    deskripsi?: string | null;
    durasi_menit: number;
    status: string;
    total_peserta: number;
    total_selesai: number;
    rata_rata: number | null;
    gunakan_token?: boolean;
    token_masuk?: string | null;
  }[];
}

export interface StudentCbtExamItem {
  id: string;
  judul: string;
  deskripsi?: string | null;
  durasi_menit: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status_ujian: string;
  mata_pelajaran_nama: string;
  guru_nama: string;
  rombel_nama: string;
  gunakan_token?: boolean;
  attempt_status?: "BELUM_DIKERJAKAN" | "SEDANG_DIKERJAKAN" | "SELESAI" | "TERKUNCI";
  attempt_id?: string;
  nilai_akhir?: number | null;
}

interface CbtHubOverviewViewProps {
  role: "TEACHER" | "SUPER_ADMIN" | "STUDENT";
  sekolahId: string;
  teacherClasses?: TeacherCbtClassItem[];
  studentExams?: StudentCbtExamItem[];
  isSuperAdmin?: boolean;
}

export function CbtHubOverviewView({
  role,
  sekolahId,
  teacherClasses = [],
  studentExams = [],
  isSuperAdmin = false,
}: CbtHubOverviewViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedResultsExamId, setSelectedResultsExamId] = useState<string | null>(null);
  const [selectedResultsPenugasanId, setSelectedResultsPenugasanId] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text: message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isTeacherOrAdmin = role === "TEACHER" || role === "SUPER_ADMIN";

  // Filter for teacher
  const filteredTeacherClasses = teacherClasses.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.mata_pelajaran_nama.toLowerCase().includes(q) ||
      c.rombel_nama.toLowerCase().includes(q) ||
      c.guru_nama.toLowerCase().includes(q) ||
      c.exams.some((e) => e.judul.toLowerCase().includes(q))
    );
  });

  // Filter for student
  const filteredStudentExams = studentExams.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.judul.toLowerCase().includes(q) ||
      e.mata_pelajaran_nama.toLowerCase().includes(q) ||
      e.guru_nama.toLowerCase().includes(q)
    );
  });

  // Statistics for teacher
  const uniqueRombelCount = new Set(teacherClasses.map((c) => c.rombel_id)).size;
  const totalClasses = teacherClasses.length;
  const totalExamsAll = teacherClasses.reduce((acc, c) => acc + c.total_ujian, 0);
  const totalPublishedExams = teacherClasses.reduce((acc, c) => acc + c.total_published, 0);
  const totalStudentsAttempted = teacherClasses.reduce(
    (acc, c) => acc + c.exams.reduce((ea, e) => ea + e.total_peserta, 0),
    0
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Hero Header */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-bold">
              <FileCheck className="h-3.5 w-3.5" />
              {isTeacherOrAdmin ? "CBT Examination Engine" : "Portal Ujian Siswa"}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isTeacherOrAdmin ? "CBT Ujian Online & Bank Soal" : "Ujian Daring CBT Saya"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {isTeacherOrAdmin
                ? "Pusat evaluasi digital, blueprint soal terverifikasi, dan monitoring ujian daring"
                : "Daftar ujian terkomputerisasi yang ditugaskan oleh guru pengampu mata pelajaran"}
            </p>
          </div>

          {isTeacherOrAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/cbt-ujian/bank-soal/buat"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Plus className="h-4 w-4" />
                Buat Soal Baru
              </Link>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all"
              >
                <Layers className="h-4 w-4" />
                Buka Bank Soal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards (Teacher) */}
      {isTeacherOrAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Rombel Diajar
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800">{uniqueRombelCount}</span>
              <span className="text-xs text-slate-400">Rombel ({totalClasses} Penugasan)</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Ujian CBT
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800">{totalExamsAll}</span>
              <span className="text-xs text-slate-400">Ujian</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
              Ujian Terbit / Aktif
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-600">{totalPublishedExams}</span>
              <span className="text-xs text-blue-400">Siap Dikerjakan</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
              Total Partisipasi
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600">{totalStudentsAttempted}</span>
              <span className="text-xs text-emerald-500">Sesi Peserta</span>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isTeacherOrAdmin
                ? "Cari ujian, rombel, atau mapel..."
                : "Cari judul ujian atau mata pelajaran..."
            }
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
          />
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          {isTeacherOrAdmin
            ? `${filteredTeacherClasses.length} kelas ditemukan`
            : `${filteredStudentExams.length} ujian tersedia`}
        </span>
      </div>

      {/* CONTENT FOR TEACHER */}
      {isTeacherOrAdmin && (
        <div className="space-y-4">
          {filteredTeacherClasses.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center">
              <FileCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Belum Ada Data Ujian CBT</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Buka kelas ampu Anda pada menu &quot;Kelas Saya&quot; dan masuk ke Tab CBT untuk
                menyusun ujian CBT pertama Anda.
              </p>
            </div>
          ) : (
            filteredTeacherClasses.map((item) => (
              <div
                key={item.penugasan_id}
                className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {item.rombel_nama.slice(0, 3)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        {item.mata_pelajaran_nama} — Rombel {item.rombel_nama}
                      </h3>
                      <p className="text-[11px] text-slate-400">Pengampu: {item.guru_nama}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/kelas-saya/${item.penugasan_id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                    >
                      Kelola Kelas
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {/* Exam items in this class */}
                {item.exams.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    Belum ada ujian CBT yang dibuat di kelas ini.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {item.exams.map((exam) => (
                      <div
                        key={exam.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 flex flex-col justify-between gap-3 hover:border-blue-200 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                exam.status === "PUBLISHED" ||
                                exam.status === "DIPUBLIKASI" ||
                                exam.status === "DITERBITKAN"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : exam.status === "SELESAI"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {exam.status === "PUBLISHED" ||
                              exam.status === "DIPUBLIKASI" ||
                              exam.status === "DITERBITKAN"
                                ? "PUBLISHED (AKTIF)"
                                : exam.status === "SELESAI"
                                  ? "SELESAI"
                                  : "DRAFT"}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {exam.durasi_menit} Menit
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                            {exam.judul}
                          </h4>
                          {exam.deskripsi && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {exam.deskripsi}
                            </p>
                          )}
                          {exam.gunakan_token && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Key className="h-3 w-3 text-amber-600" />
                                Token:{" "}
                                <span className="font-mono tracking-wider">
                                  {exam.token_masuk || "-"}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                          <span className="text-[11px] text-slate-500">
                            Peserta:{" "}
                            <strong className="text-slate-700">{exam.total_selesai}</strong> /{" "}
                            {exam.total_peserta}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/cbt-ujian/proctor/${exam.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-bold shadow-2xs transition-all"
                            >
                              <ShieldCheck className="h-3 w-3 text-blue-600" />
                              Live Proctor
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedResultsExamId(exam.id);
                                setSelectedResultsPenugasanId(item.penugasan_id);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 text-[11px] font-bold shadow-2xs transition-all"
                            >
                              <Eye className="h-3 w-3 text-slate-600" />
                              Hasil
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* CONTENT FOR STUDENT */}
      {!isTeacherOrAdmin && (
        <div className="space-y-4">
          {filteredStudentExams.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Tidak Ada Ujian Daring Saat Ini</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Seluruh ujian terkomputerisasi yang ditugaskan kepada rombel Anda telah selesai atau
                belum diterbitkan oleh guru pengampu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudentExams.map((exam) => (
                <div
                  key={exam.id}
                  className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between gap-4 hover:shadow-md transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] text-[10px] font-bold">
                        {exam.mata_pelajaran_nama}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {exam.durasi_menit} Menit
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800">{exam.judul}</h3>
                      {exam.gunakan_token && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Key className="h-3 w-3 text-amber-600" />
                          Wajib Token
                        </span>
                      )}
                    </div>
                    {exam.deskripsi && (
                      <p className="text-xs text-slate-500 line-clamp-2">{exam.deskripsi}</p>
                    )}
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                      <span>Guru: {exam.guru_nama}</span>
                      <span>•</span>
                      <span>Kelas: {exam.rombel_nama}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {exam.attempt_status === "SELESAI" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Selesai ({exam.nilai_akhir ?? "-"})
                        </span>
                      ) : exam.attempt_status === "TERKUNCI" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Terkunci (Hubungi Pengawas)
                        </span>
                      ) : exam.attempt_status === "SEDANG_DIKERJAKAN" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl">
                          <Clock className="h-3.5 w-3.5" />
                          Sedang Dikerjakan
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Belum Dikerjakan</span>
                      )}
                    </div>

                    {exam.attempt_status !== "SELESAI" && exam.attempt_status !== "TERKUNCI" && (
                      <Link
                        href={`/cbt/start?ujianId=${exam.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        {exam.attempt_status === "SEDANG_DIKERJAKAN"
                          ? "Lanjutkan Ujian"
                          : "Mulai Kerjakan"}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : toastMessage.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Global Modals */}
      <QuestionBankModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        onShowToast={showToast}
      />

      <ExamResultsModal
        isOpen={!!selectedResultsExamId}
        onClose={() => setSelectedResultsExamId(null)}
        ujianId={selectedResultsExamId || ""}
        penugasanId={selectedResultsPenugasanId}
        onSuccess={(msg) => showToast(msg, "success")}
        onError={(msg) => showToast(msg, "error")}
      />
    </div>
  );
}
