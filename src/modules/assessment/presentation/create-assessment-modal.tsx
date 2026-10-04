"use client";

import React, { useState, useTransition } from "react";
import { X, Target, Award, Calendar, Layers, ShieldCheck } from "lucide-react";
import { createAssessmentAction } from "@/app/actions/assessment-actions";
import { AssessmentCategory, AssessmentTechnique } from "../domain/assessment-types";

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  penugasanId: string;
  defaultKktp?: number;
  lingkupMateriList: Array<{
    id: string;
    judul: string;
    tujuan_pembelajaran: Array<{
      id: string;
      kode?: string | null;
      deskripsi: string;
    }>;
  }>;
  initialBabId?: string;
  initialTpId?: string;
  initialKategori?: AssessmentCategory;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function CreateAssessmentModal({
  isOpen,
  onClose,
  penugasanId,
  defaultKktp,
  lingkupMateriList,
  initialBabId,
  initialTpId,
  initialKategori,
  onSuccess,
  onError,
}: CreateAssessmentModalProps) {
  const [isPending, startTransition] = useTransition();

  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [kategori, setKategori] = useState<AssessmentCategory>(initialKategori || "FORMATIF");
  const [teknikPenilaian, setTeknikPenilaian] = useState<AssessmentTechnique>("TES_TERTULIS");
  const [selectedBabId, setSelectedBabId] = useState(initialBabId || "");
  const [selectedTpId, setSelectedTpId] = useState(initialTpId || "");
  const [bobot, setBobot] = useState(1);
  const [kkmKktp, setKkmKktp] = useState(defaultKktp ?? 80);
  const [tanggalPelaksanaan, setTanggalPelaksanaan] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      if (initialBabId) setSelectedBabId(initialBabId);
      if (initialTpId) setSelectedTpId(initialTpId);
      if (initialKategori) setKategori(initialKategori);
      if (defaultKktp !== undefined) setKkmKktp(defaultKktp);
    }
  }

  if (!isOpen) return null;

  // Filter TP berdasarkan BAB yang dipilih
  const availableTps =
    lingkupMateriList.find((lm) => lm.id === selectedBabId)?.tujuan_pembelajaran || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) {
      onError("Judul asesmen wajib diisi.");
      return;
    }

    startTransition(async () => {
      const res = await createAssessmentAction({
        penugasan_mengajar_id: penugasanId,
        lingkup_materi_id: selectedBabId || null,
        tp_id: selectedTpId || null,
        judul: judul.trim(),
        deskripsi: deskripsi.trim() || null,
        kategori,
        teknik_penilaian: teknikPenilaian,
        bobot: Number(bobot) || 1,
        kkm_kktp: Number(kkmKktp) || 75,
        tanggal_pelaksanaan: tanggalPelaksanaan,
      });

      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        onError(res.message);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-assessment-title"
    >
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="create-assessment-title"
                className="text-base font-bold font-sans tracking-normal text-slate-800 dark:text-slate-100"
                style={{ fontFamily: "var(--font-sans), sans-serif", letterSpacing: "normal" }}
              >
                Buat Asesmen Pembelajaran Baru
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mendukung penilaian berbasis TP dalam Lingkup Materi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Judul Asesmen */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Judul Asesmen <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Formatif TP 1.1: Pemrograman Modular"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          {/* Kategori & Teknik Penilaian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Kategori Asesmen
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as AssessmentCategory)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
              >
                <option value="FORMATIF">Formatif (Tujuan Pembelajaran)</option>
                <option value="SUMATIF">Sumatif (Lingkup Materi / BAB)</option>
                <option value="SUMATIF_AKHIR">Sumatif Akhir Semester (SAS)</option>
                <option value="TUGAS">Tugas / Proyek Mandiri</option>
                <option value="PRAKTIK">Unjuk Kerja / Praktik Lab</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Teknik Penilaian
              </label>
              <select
                value={teknikPenilaian}
                onChange={(e) => setTeknikPenilaian(e.target.value as AssessmentTechnique)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
              >
                <option value="TES_TERTULIS">Tes Tertulis</option>
                <option value="TES_LISAN">Tes Lisan</option>
                <option value="PENUGASAN">Penugasan</option>
                <option value="KINERJA">Kinerja / Praktik</option>
                <option value="PORTOFOLIO">Portofolio</option>
              </select>
            </div>
          </div>

          {/* Lingkup Materi (BAB) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Lingkup Materi (BAB)
              </label>
              <select
                value={selectedBabId}
                onChange={(e) => {
                  setSelectedBabId(e.target.value);
                  setSelectedTpId("");
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
              >
                <option value="">-- Pilih BAB (Opsional) --</option>
                {lingkupMateriList.map((lm) => (
                  <option key={lm.id} value={lm.id}>
                    {lm.judul}
                  </option>
                ))}
              </select>
            </div>

            {/* Tujuan Pembelajaran (TP) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Tujuan Pembelajaran (TP)
              </label>
              <select
                value={selectedTpId}
                disabled={!selectedBabId}
                onChange={(e) => setSelectedTpId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-slate-100 dark:disabled:bg-slate-800/40 disabled:text-slate-400 dark:disabled:text-slate-600 cursor-pointer"
              >
                <option value="">-- Pilih TP Terkait --</option>
                {availableTps.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.kode ? `${tp.kode} - ` : ""}
                    {tp.deskripsi.slice(0, 45)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bobot, KKTP, Tanggal */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Bobot Nilai
              </label>
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={bobot}
                onChange={(e) => setBobot(Number(e.target.value))}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                KKTP / KKM
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={kkmKktp}
                onChange={(e) => setKkmKktp(Number(e.target.value))}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-semibold text-blue-600 dark:text-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Tanggal
              </label>
              <input
                type="date"
                value={tanggalPelaksanaan}
                onChange={(e) => setTanggalPelaksanaan(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Deskripsi Asesmen */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Deskripsi / Petunjuk Penilaian
            </label>
            <textarea
              rows={2}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Catatan pelaksanaan atau kisi-kisi penilaian..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Menyimpan..." : "Simpan Asesmen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
