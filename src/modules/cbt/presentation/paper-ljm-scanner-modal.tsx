"use client";

/**
 * Ruang Pintar — M14 Paper LJM Scanner & Makeup Exam Correction Modal (Academic Glass UI v1.2)
 *
 * Mengakomodasi:
 * 1. Siswa susulan (misal Siswa A) yang mengerjakan naskah kertas / offline.
 * 2. Pemindaian otomatis foto Lembar Jawaban Manual (LJM) via AI Vision (OMR).
 * 3. Input cepat manual kunci jawaban kertas (Grid A-B-C-D-E).
 * 4. Koreksi instan & pencatatan nilai langsung ke buku nilai / database CBT.
 */

import React, { useState, useTransition, useRef } from "react";
import {
  X,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileCheck,
  User,
  Award,
  RotateCcw,
  Send,
  Loader2,
  Eye,
  Check,
} from "lucide-react";
import { submitPaperLjmExamAction, scanPaperLjmPhotoAction } from "@/app/actions/cbt-actions";

interface StudentOption {
  id: string;
  nama_lengkap: string;
  nisn: string | null;
  status: string;
}

interface PaperLjmScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ujianId: string;
  ujianJudul: string;
  penugasanId: string;
  totalSoal: number;
  kktp: number;
  studentList: StudentOption[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function PaperLjmScannerModal({
  isOpen,
  onClose,
  ujianId,
  ujianJudul,
  penugasanId,
  totalSoal,
  kktp,
  studentList,
  onSuccess,
  onError,
}: PaperLjmScannerModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"CAMERA" | "MANUAL">("CAMERA");

  // Camera / Image upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResultNotes, setScanResultNotes] = useState<string | null>(null);

  // Answers Map: Nomor Urut (1..N) -> "A" | "B" | "C" | "D" | "E"
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Graded Preview State
  const [gradedResult, setGradedResult] = useState<{
    nilai_akhir: number;
    total_benar: number;
    total_salah: number;
    apakah_tuntas: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setScanResultNotes(null);
    };
    reader.readAsDataURL(file);
  };

  const handleScanWithAi = async () => {
    if (!imagePreview) {
      onError("Unggah atau ambil foto lembar jawaban kertas terlebih dahulu.");
      return;
    }

    setIsScanning(true);
    setScanResultNotes(null);

    try {
      const res = await scanPaperLjmPhotoAction(ujianId, imagePreview);
      if (res.success && res.data) {
        const scanData = res.data;
        setAnswers((prev) => ({
          ...prev,
          ...scanData.detectedAnswers,
        }));
        setScanResultNotes(
          `${scanData.notes} Terdeteksi ${Object.keys(scanData.detectedAnswers).length} jawaban (Tingkat keyakinan: ${Math.round(
            scanData.confidence * 100
          )}%).`
        );

        // Jika nama siswa terdeteksi dari OCR dan belum dipilih
        if (scanData.detectedStudentName && !selectedStudentId) {
          const match = studentList.find((s) =>
            s.nama_lengkap.toLowerCase().includes(scanData.detectedStudentName!.toLowerCase())
          );
          if (match) setSelectedStudentId(match.id);
        }
      } else {
        onError(res.message || "Gagal memindai foto lembar jawaban.");
      }
    } catch {
      onError("Terjadi kesalahan saat memproses citra lembar jawaban.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectChoice = (nomor: number, choice: string) => {
    setAnswers((prev) => {
      if (prev[nomor] === choice) {
        const copy = { ...prev };
        delete copy[nomor];
        return copy;
      }
      return { ...prev, [nomor]: choice };
    });
  };

  const handleClearAll = () => {
    setAnswers({});
    setImagePreview(null);
    setScanResultNotes(null);
    setGradedResult(null);
  };

  const handleSubmit = () => {
    if (!selectedStudentId) {
      onError("Pilih nama siswa yang melaksanakan ujian susulan / kertas.");
      return;
    }

    if (Object.keys(answers).length === 0) {
      onError("Belum ada jawaban yang diisi atau terdeteksi dari lembar jawaban.");
      return;
    }

    startTransition(async () => {
      const res = await submitPaperLjmExamAction(ujianId, selectedStudentId, answers, penugasanId);

      if (res.success && res.data) {
        setGradedResult({
          nilai_akhir: res.data.nilai_akhir,
          total_benar: res.data.total_benar ?? res.data.jumlah_benar ?? 0,
          total_salah: res.data.total_salah ?? res.data.jumlah_salah ?? 0,
          apakah_tuntas: res.data.apakah_tuntas,
        });
        onSuccess(res.message);
      } else {
        onError(res.message);
      }
    });
  };

  const answeredCount = Object.keys(answers).length;
  const targetStudent = studentList.find((s) => s.id === selectedStudentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Koreksi LJM Kertas / Ujian Susulan (OMR AI)
              </h2>
              <p className="text-xs text-slate-500">
                {ujianJudul} • Total: {totalSoal} Soal • KKTP: {kktp}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Pilih Siswa Susulan */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span>1. Pilih Siswa yang Melaksanakan Ujian Susulan / Kertas</span>
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="">-- Pilih Siswa (Rombel ini) --</option>
              {studentList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.nama_lengkap} ({st.nisn || "Tanpa NISN"}) — Status:{" "}
                  {st.status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            {targetStudent && (
              <p className="text-[11px] text-blue-700 font-medium">
                Hasil koreksi lembar jawaban akan langsung dicatat atas nama:{" "}
                <strong>{targetStudent.nama_lengkap}</strong>.
              </p>
            )}
          </div>

          {/* Step 2: Tab Switcher (Kamera AI vs Input Manual) */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("CAMERA")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "CAMERA"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Pindai Foto Kamera AI</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("MANUAL")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "MANUAL"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span>Input Cepat Manual</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">
                Terisi: <strong className="text-blue-600 font-mono">{answeredCount}</strong> /{" "}
                {totalSoal}
              </span>
              {answeredCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-rose-600 hover:underline text-[11px] font-bold"
                >
                  Bersihkan
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: CAMERA SCAN */}
          {activeTab === "CAMERA" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-3xl p-6 text-center hover:border-blue-400 bg-slate-50/50 transition">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Foto Lembar Jawaban LJM"
                      className="max-h-56 mx-auto rounded-2xl object-contain border border-slate-200 shadow-xs"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                      >
                        Ganti Foto
                      </button>
                      <button
                        type="button"
                        onClick={handleScanWithAi}
                        disabled={isScanning}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Menganalisis LJM...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Pindai dengan AI Vision</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="space-y-2 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Klik untuk Ambil Foto Lembar Jawaban (Kamera HP) atau Unggah Berkas
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Pastikan seluruh lembar LJM (Nomor 1 s/d {totalSoal}) terlihat jelas dan
                        terang
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {scanResultNotes && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    {scanResultNotes} Anda dapat memeriksa atau mengubah butir jawaban di bawah.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* GRID BUBBLE SHEET JAWABAN (Nomor 1..N: A B C D E) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Pilihan Jawaban Siswa (Nomor 1 s/d {totalSoal})
              </label>
              <span className="text-[11px] text-slate-400">
                Klik tombol huruf untuk memilih atau mengubah jawaban
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {Array.from({ length: totalSoal }, (_, idx) => {
                const no = idx + 1;
                const currentAnswer = answers[no];

                return (
                  <div
                    key={no}
                    className={`p-2.5 rounded-2xl border transition ${
                      currentAnswer
                        ? "bg-blue-50/60 border-blue-200"
                        : "bg-slate-50/50 border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-xs text-slate-700">No. {no}</span>
                      {currentAnswer ? (
                        <span className="font-mono font-bold text-xs text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-md">
                          {currentAnswer}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">kosong</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      {["A", "B", "C", "D", "E"].map((opt) => {
                        const isSelected = currentAnswer === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectChoice(no, opt)}
                            className={`w-6 h-6 rounded-lg font-mono text-[11px] font-bold transition flex items-center justify-center ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-2xs"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Graded Result Preview if already submitted */}
          {gradedResult && (
            <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <Award className="h-4 w-4 text-emerald-600" />
                <span>Koreksi Selesai & Berhasil Disimpan ke Sistem!</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-2xl bg-white border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block">Nilai Akhir</span>
                  <span className="text-xl font-bold font-mono text-emerald-700">
                    {gradedResult.nilai_akhir}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block">Benar</span>
                  <span className="text-lg font-bold font-mono text-emerald-600">
                    {gradedResult.total_benar}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block">Salah</span>
                  <span className="text-lg font-bold font-mono text-rose-600">
                    {gradedResult.total_salah}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block">Status KKTP</span>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      gradedResult.apakah_tuntas
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {gradedResult.apakah_tuntas ? "Tuntas" : "Remedial"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !selectedStudentId || answeredCount === 0}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Mengoreksi Nilai...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Koreksi & Simpan Nilai Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
