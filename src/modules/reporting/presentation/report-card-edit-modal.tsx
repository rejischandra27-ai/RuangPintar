"use client";

/**
 * Ruang Pintar — Module M18: Report Card Edit Modal
 * Form for Homeroom Teacher to edit student notes, follow-ups, and extracurricular activities.
 */

import React, { useState } from "react";
import { X, Plus, Trash2, Save, Sparkles, BookOpen } from "lucide-react";
import { ExtracurricularItem, ReportCardData } from "../domain/report-card-types";
import { saveReportCardNotesAction } from "@/app/actions/report-card-actions";

export interface ReportCardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportCard: ReportCardData;
  onSaved: () => void;
}

export function ReportCardEditModal({
  isOpen,
  onClose,
  reportCard,
  onSaved,
}: ReportCardEditModalProps) {
  const [catatan, setCatatan] = useState(reportCard.catatanWaliKelas || "");
  const [saran, setSaran] = useState(reportCard.saranTindakLanjut || "");
  const [ekskulList, setEkskulList] = useState<ExtracurricularItem[]>(
    reportCard.ekstrakurikuler || []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddEkskul = () => {
    const newItem: ExtracurricularItem = {
      id: "ekskul_" + Date.now(),
      nama: "",
      predikat: "Baik",
      deskripsi: "",
    };
    setEkskulList([...ekskulList, newItem]);
  };

  const handleUpdateEkskul = (index: number, field: keyof ExtracurricularItem, value: string) => {
    const updated = [...ekskulList];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setEkskulList(updated);
  };

  const handleRemoveEkskul = (index: number) => {
    setEkskulList(ekskulList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const validEkskul = ekskulList.filter((e) => e.nama.trim().length > 0);

      const res = await saveReportCardNotesAction({
        siswaId: reportCard.siswa.siswaId,
        penempatanRombelId: reportCard.siswa.rombelId,
        semesterId: reportCard.siswa.semesterId,
        tahunAjaranId: reportCard.siswa.tahunAjaranId,
        catatanWaliKelas: catatan,
        saranTindakLanjut: saran,
        ekstrakurikuler: validEkskul,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Gagal menyimpan catatan.");
      } else {
        onSaved();
        onClose();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Catatan & Ekstrakurikuler Rapor
              </h3>
              <p className="text-xs text-slate-400">
                {reportCard.siswa.namaLengkap} ({reportCard.siswa.rombelNama})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Section: Catatan Wali Kelas */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Catatan Perkembangan Karakter & Belajar
            </label>
            <p className="text-[11px] text-slate-500">
              Uraian perkembangan sikap, keaktifan belajar, dan pencapaian karakter siswa.
            </p>
            <textarea
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="Tuliskan catatan perkembangan siswa..."
              required
            />
          </div>

          {/* Section: Saran Tindak Lanjut */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Saran & Rekomendasi Tindak Lanjut
            </label>
            <p className="text-[11px] text-slate-500">
              Rekomendasi bagi siswa dan orang tua untuk peningkatan di semester berikutnya.
            </p>
            <textarea
              rows={3}
              value={saran}
              onChange={(e) => setSaran(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="Tuliskan saran tindak lanjut..."
              required
            />
          </div>

          {/* Section: Ekstrakurikuler */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Kegiatan Ekstrakurikuler
                </label>
                <p className="text-[11px] text-slate-500">
                  Catatan kegiatan bakat & minat siswa di semester ini.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddEkskul}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kegiatan</span>
              </button>
            </div>

            {ekskulList.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                Belum ada kegiatan ekstrakurikuler yang ditambahkan.
              </div>
            ) : (
              <div className="space-y-3">
                {ekskulList.map((ekskul, idx) => (
                  <div
                    key={ekskul.id || idx}
                    className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={ekskul.nama}
                          onChange={(e) => handleUpdateEkskul(idx, "nama", e.target.value)}
                          placeholder="Nama Kegiatan (cth: Pramuka, Futsal, Robotik)"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="w-32">
                        <select
                          value={ekskul.predikat}
                          onChange={(e) =>
                            handleUpdateEkskul(idx, "predikat", e.target.value as any)
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="Sangat Baik">Sangat Baik</option>
                          <option value="Baik">Baik</option>
                          <option value="Cukup">Cukup</option>
                          <option value="Kurang">Kurang</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveEkskul(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={ekskul.deskripsi}
                        onChange={(e) => handleUpdateEkskul(idx, "deskripsi", e.target.value)}
                        placeholder="Deskripsi capaian (cth: Aktif mengikuti latihan mingguan dan turnamen)"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Catatan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
