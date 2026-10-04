"use client";

import * as React from "react";
import { X, ShieldAlert, AlertTriangle, CheckCircle2, User, Calendar, Plus } from "lucide-react";
import { createMonitoringNoteAction } from "@/app/actions/monitoring-actions";
import { KategoriCatatan, TingkatUrgensi } from "../domain/monitoring-types";

export interface CreateMonitoringNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rombelId: string;
  students: Array<{ id: string; nama: string; nis: string | null }>;
  preselectedStudentId?: string | null;
}

export function CreateMonitoringNoteModal({
  isOpen,
  onClose,
  onSuccess,
  rombelId,
  students,
  preselectedStudentId,
}: CreateMonitoringNoteModalProps) {
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(
    preselectedStudentId || (students[0]?.id ?? "")
  );
  const [prevPreselected, setPrevPreselected] = React.useState(preselectedStudentId);

  if (preselectedStudentId !== prevPreselected) {
    setPrevPreselected(preselectedStudentId);
    setSelectedStudentId(preselectedStudentId || (students[0]?.id ?? ""));
  }

  const [judul, setJudul] = React.useState("");
  const [isi, setIsi] = React.useState("");
  const [kategori, setKategori] = React.useState<KategoriCatatan>("AKADEMIK");
  const [tingkatUrgensi, setTingkatUrgensi] = React.useState<TingkatUrgensi>("SEDANG");
  const [withFollowUp, setWithFollowUp] = React.useState(false);
  const [tindakLanjutTindakan, setTindakLanjutTindakan] = React.useState("");
  const [tindakLanjutTanggal, setTindakLanjutTanggal] = React.useState("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setErrorMsg("Pilih siswa yang akan diberikan catatan pembinaan.");
      return;
    }
    if (!judul.trim() || judul.trim().length < 3) {
      setErrorMsg("Judul catatan minimal 3 karakter.");
      return;
    }
    if (!isi.trim() || isi.trim().length < 5) {
      setErrorMsg("Isi deskripsi catatan minimal 5 karakter.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await createMonitoringNoteAction({
        rombel_id: rombelId,
        siswa_id: selectedStudentId,
        judul: judul.trim(),
        isi: isi.trim(),
        kategori,
        tingkat_urgensi: tingkatUrgensi,
        tindak_lanjut_tindakan:
          withFollowUp && tindakLanjutTindakan.trim() ? tindakLanjutTindakan.trim() : undefined,
        tindak_lanjut_target_tanggal:
          withFollowUp && tindakLanjutTanggal ? tindakLanjutTanggal : undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
        // Reset form
        setJudul("");
        setIsi("");
        setKategori("AKADEMIK");
        setTingkatUrgensi("SEDANG");
        setWithFollowUp(false);
        setTindakLanjutTindakan("");
        setTindakLanjutTanggal("");
      } else {
        setErrorMsg(res.message || "Gagal menyimpan catatan.");
      }
    } catch {
      setErrorMsg("Terjadi kendala saat menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
              <ShieldAlert className="h-5 w-5 text-blue-100" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Buat Catatan Pembinaan Siswa</h2>
              <p className="text-xs text-blue-100/80">
                Pencatatan monitoring berkala oleh Wali Kelas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Pemilihan Siswa */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span>Target Siswa Binaan *</span>
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} {s.nis ? `(${s.nis})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Kategori & Tingkat Urgensi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Kategori Catatan *</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as KategoriCatatan)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                <option value="AKADEMIK">Akademik & Nilai</option>
                <option value="KEHADIRAN">Kehadiran & Absensi</option>
                <option value="PERILAKU">Perilaku & Disiplin</option>
                <option value="KESEHATAN">Kesehatan Siswa</option>
                <option value="SOSIAL">Sosial & Keluarga</option>
                <option value="LAINNYA">Lainnya / Umum</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tingkat Urgensi *</label>
              <select
                value={tingkatUrgensi}
                onChange={(e) => setTingkatUrgensi(e.target.value as TingkatUrgensi)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                <option value="RENDAH">Rendah (Info Berkala / Apresiasi)</option>
                <option value="SEDANG">Sedang (Perhatian Ringan)</option>
                <option value="TINGGI">Tinggi (Perlu Intervensi Segera)</option>
                <option value="KRITIS">Kritis (Panggilan Orang Tua / BK)</option>
              </select>
            </div>
          </div>

          {/* Judul Catatan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Judul Catatan Pembinaan *</label>
            <input
              type="text"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Keterlambatan masuk 3 hari berturut-turut"
              required
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Isi Catatan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Deskripsi / Hasil Observasi *
            </label>
            <textarea
              rows={4}
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              placeholder="Tuliskan temuan observasi di kelas, keterangan dari guru pengajar, atau hasil wawancara awal dengan siswa..."
              required
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Toggle Rencana Tindak Lanjut Sekaligus */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={withFollowUp}
                onChange={(e) => setWithFollowUp(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-800">
                Tambahkan Rencana Tindak Lanjut (Follow-Up) Sekarang
              </span>
            </label>
          </div>

          {withFollowUp && (
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Rencana Tindakan Pembinaan
                </label>
                <input
                  type="text"
                  value={tindakLanjutTindakan}
                  onChange={(e) => setTindakLanjutTindakan(e.target.value)}
                  placeholder="Contoh: Menghubungi orang tua siswa dan menjadwalkan konseling"
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-blue-600" />
                  <span>Target Tanggal Selesai</span>
                </label>
                <input
                  type="date"
                  value={tindakLanjutTanggal}
                  onChange={(e) => setTindakLanjutTanggal(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Footer Aksi */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Simpan Catatan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
