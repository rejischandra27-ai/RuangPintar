"use client";

/**
 * Ruang Pintar — M14 CBT Exam Results & Proctoring Modal (Academic Glass UI v1.2)
 *
 * Mengintegrasikan:
 * - Monitor Sesi Ujian Siswa & Status Integritas (Anti-Cheating Logs)
 * - Pembukaan Kunci Sesi Siswa (Unlock Attempt)
 * - Jembatan Transfer Nilai ke Buku Nilai M13 (Gradebook Transfer)
 */

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  X,
  Users,
  Award,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Send,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Clock,
  Search,
  Printer,
  ExternalLink,
} from "lucide-react";
import { UjianCbtDTO, SesiUjianSiswaDTO, HasilUjianCbtDTO } from "../domain/cbt-types";
import {
  getExamAttemptsAction,
  unlockAttemptAction,
  transferToGradebookAction,
} from "@/app/actions/cbt-actions";

interface ExamResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ujianId: string;
  penugasanId: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function ExamResultsModal({
  isOpen,
  onClose,
  ujianId,
  penugasanId,
  onSuccess,
  onError,
}: ExamResultsModalProps) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<{
    ujian: UjianCbtDTO;
    attempts: Array<
      SesiUjianSiswaDTO & {
        siswa: { id: string; nama_lengkap: string; nisn: string | null };
        hasil: HasilUjianCbtDTO | null;
        integrityEventCount: number;
      }
    >;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Gradebook Transfer Form State
  const [namaAsesmen, setNamaAsesmen] = useState("");
  const [kategori, setKategori] = useState<"SUMATIF" | "FORMATIF">("SUMATIF");
  const [jenisAsesmen, setJenisAsesmen] = useState("SUMATIF_TENGAH_SEMESTER");
  const [bobotAsesmen, setBobotAsesmen] = useState(1);
  const [showTransferForm, setShowTransferForm] = useState(false);

  const loadAttempts = useCallback(async () => {
    setIsLoading(true);
    const res = await getExamAttemptsAction(ujianId);
    if (res.success && res.data) {
      setData(res.data);
      setNamaAsesmen(res.data.ujian.judul);
    } else {
      onError(res.message || "Gagal memuat sesi ujian.");
    }
    setIsLoading(false);
  }, [ujianId, onError]);

  const handleClose = () => {
    setShowTransferForm(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    getExamAttemptsAction(ujianId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setData(res.data);
          setNamaAsesmen(res.data.ujian.judul);
        } else {
          onError(res.message || "Gagal memuat sesi ujian.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, ujianId, onError]);

  const handleUnlock = (attemptId: string) => {
    startTransition(async () => {
      const res = await unlockAttemptAction(attemptId, penugasanId);
      if (res.success) {
        onSuccess(res.message);
        loadAttempts();
      } else {
        onError(res.message);
      }
    });
  };

  const handleTransfer = () => {
    if (!namaAsesmen.trim()) {
      onError("Nama asesmen untuk Buku Nilai wajib diisi.");
      return;
    }

    startTransition(async () => {
      const res = await transferToGradebookAction(
        {
          ujian_cbt_id: ujianId,
          nama_asesmen: namaAsesmen,
          kategori,
          jenis_asesmen: jenisAsesmen,
          bobot: Number(bobotAsesmen) || 1,
        },
        penugasanId
      );

      if (res.success) {
        onSuccess(res.message);
        setShowTransferForm(false);
        onClose();
      } else {
        onError(res.message);
      }
    });
  };

  if (!isOpen) return null;

  const filteredAttempts = (data?.attempts || []).filter((att) =>
    att.siswa.nama_lengkap.toLowerCase().includes(search.toLowerCase())
  );

  const totalAktif = data?.attempts.filter((a) => a.status === "SEDANG_MENGERJAKAN").length ?? 0;

  const totalSelesai =
    data?.attempts.filter(
      (a) => a.status === "DIKUMPULKAN" || a.status === "SELESAI" || a.status === "TERLAMBAT"
    ).length ?? 0;

  const totalLocked = data?.attempts.filter((a) => a.status === "TERKUNCI_PELANGGARAN").length ?? 0;

  const totalAutosaveBerhasil =
    data?.attempts.reduce((sum, a: any) => sum + (a.savedAnswersCount ?? 0), 0) ?? 0;

  const nilaiList =
    data?.attempts
      .filter((a) => a.hasil && typeof a.hasil.nilai_akhir === "number")
      .map((a) => a.hasil!.nilai_akhir) ?? [];

  const rataRata =
    nilaiList.length > 0
      ? (nilaiList.reduce((acc, curr) => acc + curr, 0) / nilaiList.length).toFixed(1)
      : "0";

  const tuntasCount = data?.attempts.filter((a) => a.hasil && a.hasil.apakah_tuntas).length ?? 0;

  const tuntasRate = totalSelesai > 0 ? Math.round((tuntasCount / totalSelesai) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {data?.ujian.judul || "Hasil & Monitoring Ujian CBT"}
              </h2>
              <p className="text-xs text-slate-500">
                KKTP: {data?.ujian.kktp ?? 75} • Durasi: {data?.ujian.durasi_menit ?? 60} Menit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/cbt-ujian/proctor/${ujianId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 shadow-2xs transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Live Proctor Cockpit</span>
            </Link>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Metric Summary Cards — Academic Glass UI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 px-6 pt-4">
          <div className="p-3 rounded-2xl bg-cyan-50/60 border border-cyan-100">
            <div className="flex items-center justify-between text-cyan-700 text-xs font-semibold mb-1">
              <span>Peserta Aktif</span>
              <Clock className="h-3.5 w-3.5 text-cyan-500 animate-pulse" />
            </div>
            <div className="text-lg font-bold text-cyan-900">{totalAktif}</div>
            <span className="text-[10px] text-cyan-600 font-medium">sedang mengerjakan</span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
              <span>Autosave Berhasil</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold text-emerald-900">{totalAutosaveBerhasil}</div>
            <span className="text-[10px] text-emerald-600 font-medium">jawaban tersimpan</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mb-1">
              <span>Peserta Selesai</span>
              <Users className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-900">
              {totalSelesai}{" "}
              <span className="text-xs font-normal text-slate-400">
                / {data?.attempts.length ?? 0}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">tuntas {tuntasRate}%</span>
          </div>

          <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
            <div className="flex items-center justify-between text-blue-700 text-xs font-semibold mb-1">
              <span>Rata-rata Nilai</span>
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-lg font-bold text-slate-900">{rataRata}</div>
            <span className="text-[10px] text-blue-600 font-medium">{tuntasCount} siswa lolos</span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-amber-700 text-xs font-semibold mb-1">
              <span>Terkunci</span>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="text-lg font-bold text-amber-900">{totalLocked}</div>
            <span className="text-[10px] text-amber-600 font-medium">pelanggaran integritas</span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama siswa..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/cbt/cetak/${ujianId}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>Cetak Naskah & LJM</span>
            </Link>

            <button
              onClick={() => setShowTransferForm(!showTransferForm)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {showTransferForm ? "Tutup Form Transfer" : "Transfer ke Buku Nilai (M13)"}
            </button>
          </div>
        </div>

        {/* Transfer to Gradebook Panel */}
        {showTransferForm && (
          <div className="m-6 p-5 rounded-2xl bg-blue-50/40 border border-blue-200 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Jembatan Transfer Nilai CBT ke Modul Penilaian (M13)
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Nilai CBT peserta yang telah selesai akan otomatis disinkronkan ke dalam Buku Nilai
              kelas sebagai satu entri asesmen resmi. Tidak menduplikasi tabel buku nilai.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Asesmen di Buku Nilai
                </label>
                <input
                  type="text"
                  value={namaAsesmen}
                  onChange={(e) => setNamaAsesmen(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value as any)}
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="SUMATIF">Sumatif</option>
                  <option value="FORMATIF">Formatif</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bobot Asesmen</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={bobotAsesmen}
                  onChange={(e) => setBobotAsesmen(Number(e.target.value))}
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTransferForm(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTransfer}
                disabled={isPending || totalSelesai === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {isPending ? "Mentransfer..." : `Transfer ${totalSelesai} Nilai Sekarang`}
              </button>
            </div>
          </div>
        )}

        {/* Student Attempts Table */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Memuat hasil ujian...</div>
          ) : filteredAttempts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada peserta yang memulai ujian ini.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Nama Siswa / NISN</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Integritas</th>
                  <th className="py-2.5 px-3 text-right">Nilai Akhir</th>
                  <th className="py-2.5 px-3 text-center">Status KKTP</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttempts.map((att, idx) => {
                  const isLocked = att.status === "TERKUNCI_PELANGGARAN";
                  const isPassed = att.hasil && att.hasil.nilai_akhir >= (data?.ujian.kktp ?? 75);

                  return (
                    <tr key={att.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{att.siswa.nama_lengkap}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {att.siswa.nisn || "Tanpa NISN"}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            att.status === "SELESAI"
                              ? "bg-emerald-100 text-emerald-800"
                              : att.status === "SEDANG_MENGERJAKAN"
                                ? "bg-blue-100 text-blue-800"
                                : att.status === "TERKUNCI_PELANGGARAN"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {att.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {att.integrityEventCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="h-3 w-3" />
                            {att.integrityEventCount} Pelanggaran
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Bersih</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                        {att.hasil?.nilai_akhir !== undefined ? att.hasil.nilai_akhir : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {att.hasil ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPassed
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {isPassed ? "Tuntas" : "Belum Tuntas"}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isLocked && (
                          <button
                            type="button"
                            onClick={() => handleUnlock(att.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition"
                          >
                            <Unlock className="h-3 w-3" />
                            Buka Kunci
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={() =>
              window.open(`/cbt/cetak/${ujianId}?penugasanId=${penugasanId}`, "_blank")
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span>Cetak Naskah Soal & LJM (A4)</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
