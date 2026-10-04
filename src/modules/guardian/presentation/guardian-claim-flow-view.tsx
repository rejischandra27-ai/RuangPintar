"use client";

/**
 * Ruang Pintar — Guardian Claim & Student Linkage Flow View (Stage 16)
 * Komponen interaktif Academic Glass UI untuk verifikasi mandiri dan klaim siswa oleh wali murid.
 */

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  School,
  Lock,
  UserCheck,
  PlusCircle,
  Loader2,
} from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import {
  StudentClaimPreviewDTO,
  StudentClaimResultDTO,
  RelationshipType,
} from "../domain/guardian-types";
import {
  previewStudentClaimAction,
  confirmStudentClaimAction,
} from "@/app/actions/guardian-actions";

export interface GuardianClaimFlowViewProps {
  rombelOptions?: Array<{ id: string; nama: string; tingkat: string }>;
  schoolName?: string;
  isEmbeddedInDashboard?: boolean;
}

export function GuardianClaimFlowView({
  rombelOptions = [],
  schoolName,
  isEmbeddedInDashboard = false,
}: GuardianClaimFlowViewProps) {
  const router = useRouter();
  const [step, setStep] = useState<"VERIFY" | "PREVIEW" | "SUCCESS">("VERIFY");
  const [verifyMode, setVerifyMode] = useState<"NIS" | "ROMBEL">("NIS");

  // Form Step 1: Identifikasi Siswa
  const [namaLengkap, setNamaLengkap] = useState("");
  const [nis, setNis] = useState("");
  const [nisn, setNisn] = useState("");
  const [selectedRombelNama, setSelectedRombelNama] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");

  // Form Step 2: Konfirmasi Relasi
  const [previewData, setPreviewData] = useState<StudentClaimPreviewDTO | null>(null);
  const [jenisHubungan, setJenisHubungan] = useState<RelationshipType>("AYAH");
  const [apakahWaliUtama, setApakahWaliUtama] = useState(false);
  const [catatan, setCatatan] = useState("");

  // Result
  const [claimResult, setClaimResult] = useState<StudentClaimResultDTO | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset form untuk klaim anak lain
  const handleResetForNextChild = () => {
    setNamaLengkap("");
    setNis("");
    setNisn("");
    setSelectedRombelNama("");
    setTanggalLahir("");
    setPreviewData(null);
    setJenisHubungan("AYAH");
    setApakahWaliUtama(false);
    setCatatan("");
    setClaimResult(null);
    setErrorMessage(null);
    setStep("VERIFY");
  };

  // Submit Step 1: Verifikasi & Pratinjau
  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!namaLengkap.trim()) {
      setErrorMessage("Nama lengkap siswa wajib diisi.");
      return;
    }

    if (verifyMode === "NIS" && !nis.trim() && !nisn.trim()) {
      setErrorMessage("Masukkan setidaknya NIS atau NISN siswa.");
      return;
    }

    if (verifyMode === "ROMBEL" && !selectedRombelNama.trim()) {
      setErrorMessage("Pilih atau tuliskan nama rombel / kelas siswa.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          nama_lengkap: namaLengkap.trim(),
          nis: verifyMode === "NIS" && nis.trim() ? nis.trim() : null,
          nisn: verifyMode === "NIS" && nisn.trim() ? nisn.trim() : null,
          rombel_nama: verifyMode === "ROMBEL" ? selectedRombelNama.trim() : null,
          tanggal_lahir: tanggalLahir ? tanggalLahir : null,
        };

        const res = await previewStudentClaimAction(payload);
        if (!res.success || !res.data) {
          setErrorMessage(res.message || "Gagal memverifikasi identitas siswa.");
          return;
        }

        setPreviewData(res.data);
        setStep("PREVIEW");
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan saat verifikasi.");
      }
    });
  };

  // Submit Step 2: Konfirmasi Klaim
  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewData) return;
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await confirmStudentClaimAction({
          siswa_id: previewData.siswa_id,
          jenis_hubungan: jenisHubungan,
          apakah_wali_utama: apakahWaliUtama,
          catatan: catatan.trim() || null,
        });

        if (!res.success || !res.data) {
          setErrorMessage(res.message || "Gagal mengonfirmasi klaim siswa.");
          return;
        }

        setClaimResult(res.data);
        setStep("SUCCESS");
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : "Terjadi kesalahan saat konfirmasi klaim."
        );
      }
    });
  };

  return (
    <div
      className={`w-full max-w-3xl mx-auto rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-[0_12px_40px_rgba(15,23,42,0.06)] p-6 sm:p-8 space-y-6 ${
        isEmbeddedInDashboard ? "my-2" : ""
      }`}
    >
      {/* Header Wizard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#2563EB] text-xs font-bold border border-blue-200/60 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Portal Mandiri Wali Murid
            </span>
            {schoolName && (
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1">
                <School className="h-3 w-3" />
                {schoolName}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight mt-1.5">
            Klaim & Hubungkan Data Putra/Putri
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Verifikasi identitas siswa secara otomatis tanpa perlu antre di ruang Tata Usaha.
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              step === "VERIFY"
                ? "bg-[#1E293B] text-white shadow-xs"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <span>1</span>
            <span>Verifikasi</span>
          </div>
          <span className="text-slate-300">→</span>
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              step === "PREVIEW"
                ? "bg-[#1E293B] text-white shadow-xs"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <span>2</span>
            <span>Pratinjau</span>
          </div>
          <span className="text-slate-300">→</span>
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              step === "SUCCESS"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <span>3</span>
            <span>Selesai</span>
          </div>
        </div>
      </div>

      {/* Alert Error Box */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs sm:text-sm text-rose-800 shadow-xs animate-in fade-in duration-200"
        >
          <AlertCircle className="size-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-bold">Verifikasi Belum Berhasil</h4>
            <p className="text-rose-700 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* STEP 1: FORM VERIFIKASI IDENTITAS SISWA */}
      {step === "VERIFY" && (
        <form onSubmit={handleVerifySubmit} className="space-y-5">
          {/* Mode Selector Tab */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Metode Pencarian Siswa
            </Label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setVerifyMode("NIS")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  verifyMode === "NIS"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Nomor Induk (NIS / NISN)
              </button>
              <button
                type="button"
                onClick={() => setVerifyMode("ROMBEL")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  verifyMode === "ROMBEL"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Nama Siswa & Rombel Kelas
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              {verifyMode === "NIS"
                ? "Gunakan nomor induk yang tercantum pada kartu pelajar, buku rapor, atau berkas pendaftaran."
                : "Cocok untuk siswa baru atau mutasi yang belum memiliki nomor induk resmi di sistem."}
            </p>
          </div>

          {/* Nama Lengkap Siswa */}
          <div className="space-y-1.5">
            <Label htmlFor="nama_lengkap" className="text-xs sm:text-sm font-bold text-[#0F172A]">
              Nama Lengkap Siswa <span className="text-rose-600">*</span>
            </Label>
            <Input
              id="nama_lengkap"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              placeholder="cth: Ahmad Fatoni atau Alif Adhitya"
              required
              disabled={isPending}
              className="h-11 bg-white text-slate-900 border-slate-200 shadow-xs"
            />
            <p className="text-[11px] text-slate-400">
              Wajib sesuai dengan nama yang tercantum pada Akta Kelahiran / Kartu Keluarga.
            </p>
          </div>

          {/* Mode NIS / NISN */}
          {verifyMode === "NIS" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nis" className="text-xs sm:text-sm font-bold text-[#0F172A]">
                  NIS (Nomor Induk Siswa Sekolah)
                </Label>
                <Input
                  id="nis"
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="cth: 1001"
                  disabled={isPending}
                  className="h-11 bg-white text-slate-900 border-slate-200 shadow-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nisn" className="text-xs sm:text-sm font-bold text-[#0F172A]">
                  NISN (10 Digit Nasional)
                </Label>
                <Input
                  id="nisn"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  placeholder="cth: 0081234567"
                  disabled={isPending}
                  className="h-11 bg-white text-slate-900 border-slate-200 shadow-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Mode Rombel Kelas */}
          {verifyMode === "ROMBEL" && (
            <div className="space-y-1.5">
              <Label htmlFor="rombel" className="text-xs sm:text-sm font-bold text-[#0F172A]">
                Rombel / Kelas Siswa <span className="text-rose-600">*</span>
              </Label>
              {rombelOptions.length > 0 ? (
                <select
                  id="rombel"
                  value={selectedRombelNama}
                  onChange={(e) => setSelectedRombelNama(e.target.value)}
                  disabled={isPending}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="">-- Pilih Kelas Siswa --</option>
                  {rombelOptions.map((r) => (
                    <option key={r.id} value={r.nama}>
                      {r.nama} ({r.tingkat})
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="rombel"
                  value={selectedRombelNama}
                  onChange={(e) => setSelectedRombelNama(e.target.value)}
                  placeholder="cth: X TO 3 atau XI TKRO 1"
                  required
                  disabled={isPending}
                  className="h-11 bg-white text-slate-900 border-slate-200 shadow-xs"
                />
              )}
            </div>
          )}

          {/* Tanggal Lahir (Opsional) */}
          <div className="space-y-1.5">
            <Label htmlFor="tanggal_lahir" className="text-xs sm:text-sm font-bold text-[#0F172A]">
              Tanggal Lahir Siswa <span className="text-slate-400 font-normal">(Opsional)</span>
            </Label>
            <Input
              id="tanggal_lahir"
              type="date"
              value={tanggalLahir}
              onChange={(e) => setTanggalLahir(e.target.value)}
              disabled={isPending}
              className="h-11 bg-white text-slate-900 border-slate-200 shadow-xs"
            />
          </div>

          {/* Tombol Verifikasi */}
          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              variant="primary"
              disabled={isPending}
              className="w-full h-12 rounded-2xl bg-[#1E293B] hover:bg-[#26364B] text-white font-bold text-sm sm:text-base shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memverifikasi Identitas Siswa...</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  <span>Verifikasi & Lanjut ke Pratinjau</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* STEP 2: PRATINJAU SISWA & KONFIRMASI RELASI */}
      {step === "PREVIEW" && previewData && (
        <form onSubmit={handleConfirmSubmit} className="space-y-6">
          {/* Kartu Pratinjau Siswa (Fitur 03: Safe Preview Tanpa Nilai & Absensi) */}
          <div className="rounded-2xl border border-blue-200/80 bg-linear-to-br from-blue-50/70 to-indigo-50/50 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-blue-100">
              <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Data Siswa Terverifikasi Resmi
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-blue-100/80 text-blue-900">
                {previewData.sekolah_nama}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-[#2563EB] text-white font-black text-lg flex items-center justify-center shadow-xs">
                {previewData.nama_lengkap
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")}
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {previewData.nama_lengkap}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  NIS:{" "}
                  <strong className="text-slate-800 font-mono">{previewData.nis || "-"}</strong>
                  {previewData.nisn ? ` • NISN: ${previewData.nisn}` : ""} • Kelas:{" "}
                  <strong className="text-slate-800">{previewData.rombel_nama}</strong>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Jenis Kelamin: {previewData.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"} •{" "}
                  {previewData.tingkat_kelas}
                </p>
              </div>
            </div>

            {/* Invariant Note: Zero Sensitive Data Leakage before confirmation */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/80 border border-blue-100 text-[11px] text-slate-600">
              <Lock className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
              <span>
                Riwayat akademik, nilai buku rapor, dan presensi harian terkunci demi privasi sampai
                hubungan wali ini dikonfirmasi.
              </span>
            </div>
          </div>

          {/* Pilihan Hubungan Wali Murid */}
          <div className="space-y-3">
            <Label className="text-xs sm:text-sm font-bold text-[#0F172A]">
              Pilih Hubungan Anda dengan Siswa Ini <span className="text-rose-600">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {(["AYAH", "IBU", "WALI"] as RelationshipType[]).map((rel) => (
                <button
                  key={rel}
                  type="button"
                  onClick={() => setJenisHubungan(rel)}
                  className={`p-3 rounded-2xl border text-center font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    jenisHubungan === rel
                      ? "border-[#2563EB] bg-blue-50/80 text-[#2563EB] shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {rel === "AYAH" ? "Ayah" : rel === "IBU" ? "Ibu" : "Wali Sah"}
                </button>
              ))}
            </div>
          </div>

          {/* Opsi Wali Utama */}
          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={apakahWaliUtama}
              onChange={(e) => setApakahWaliUtama(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-[#2563EB] focus:ring-[#2563EB]"
            />
            <div className="text-xs space-y-0.5">
              <span className="font-bold text-slate-900 block">
                Tetapkan sebagai Wali Utama untuk siswa ini
              </span>
              <span className="text-slate-500">
                Pihak sekolah akan mengutamakan kontak Anda untuk notifikasi kehadiran, panggilan
                konseling, dan surat undangan sekolah.
              </span>
            </div>
          </label>

          {/* Catatan Tambahan (Opsional) */}
          <div className="space-y-1.5">
            <Label htmlFor="catatan" className="text-xs sm:text-sm font-bold text-[#0F172A]">
              Catatan Hubungan <span className="text-slate-400 font-normal">(Opsional)</span>
            </Label>
            <Input
              id="catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="cth: Tinggal serumah bersama orang tua"
              disabled={isPending}
              className="h-10 bg-white text-slate-900 border-slate-200 shadow-xs text-xs sm:text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("VERIFY")}
              disabled={isPending}
              className="h-11 rounded-2xl border-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Kembali / Cari Ulang
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              className="flex-1 h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menghubungkan Relasi...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Konfirmasi & Hubungkan Siswa</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* STEP 3: SUKSES TERHUBUNG */}
      {step === "SUCCESS" && claimResult && (
        <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              Hubungan Terverifikasi Aktif
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Alhamdulillah! Anda Berhasil Terhubung
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Akun Anda kini resmi terhubung dengan data akademik ananda{" "}
              <strong className="text-slate-900 font-bold">{claimResult.nama_siswa}</strong> sebagai{" "}
              <strong className="text-slate-900 font-bold">{claimResult.jenis_hubungan}</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                router.push("/dashboard");
                router.refresh();
              }}
              className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-[#1E293B] hover:bg-[#26364B] text-white font-bold cursor-pointer flex items-center justify-center gap-2"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Buka Dashboard Anak</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            {/* Multi-Child Button (Fitur 04) */}
            <Button
              type="button"
              variant="outline"
              onClick={handleResetForNextChild}
              className="w-full sm:w-auto h-11 px-6 rounded-2xl border-slate-200 text-slate-800 font-bold hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <PlusCircle className="h-4 w-4 text-[#2563EB]" />
              <span>Klaim Putra/Putri Lainnya (Multi-Anak)</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
