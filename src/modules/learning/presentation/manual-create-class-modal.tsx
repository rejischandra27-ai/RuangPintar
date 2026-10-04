"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  PlusCircle,
  School,
  BookOpen,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  Clock,
  Calendar,
  Info,
} from "lucide-react";
import {
  createManualClassAction,
  getTeacherInitialScheduleOptionsAction,
  createTeacherInitialScheduleAction,
} from "@/app/actions/smart-onboarding-actions";
import { HariBelajar } from "@/modules/schedule/domain/schedule-types";

export interface ManualCreateClassModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const HARI_OPTIONS: Array<{ value: HariBelajar; label: string }> = [
  { value: "SENIN", label: "Senin" },
  { value: "SELASA", label: "Selasa" },
  { value: "RABU", label: "Rabu" },
  { value: "KAMIS", label: "Kamis" },
  { value: "JUMAT", label: "Jumat" },
  { value: "SABTU", label: "Sabtu" },
];

const JAM_KE_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Jam Ke-${index + 1}`,
}));

type ScheduleSessionInput = {
  hari: HariBelajar;
  jam_ke: string;
  jam_mulai: string;
  jam_selesai: string;
  label?: string;
};

export function ManualCreateClassModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}: ManualCreateClassModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const buildDefaultSessions = (): ScheduleSessionInput[] => [];

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [siswaText, setSiswaText] = useState<string>("");
  const [namaKelasInput, setNamaKelasInput] = useState<string>("");
  const [selectedTingkat, setSelectedTingkat] = useState<string>("10");
  const [hasManuallySetTingkat, setHasManuallySetTingkat] = useState<boolean>(false);

  const detectTingkatFromName = (name: string): string | null => {
    const trimmed = name.trim().toUpperCase();
    if (/^(XII\b|12\b|XII[\s\-_])/i.test(trimmed)) return "12";
    if (/^(XI\b|11\b|XI[\s\-_])/i.test(trimmed)) return "11";
    if (/^(X\b|10\b|X[\s\-_])/i.test(trimmed)) return "10";
    if (/^(IX\b|9\b|IX[\s\-_])/i.test(trimmed)) return "9";
    if (/^(VIII\b|8\b|VIII[\s\-_])/i.test(trimmed)) return "8";
    if (/^(VII\b|7\b|VII[\s\-_])/i.test(trimmed)) return "7";
    if (/^(VI\b|6\b|VI[\s\-_])/i.test(trimmed)) return "6";
    if (/^(V\b|5\b|V[\s\-_])/i.test(trimmed)) return "5";
    if (/^(IV\b|4\b|IV[\s\-_])/i.test(trimmed)) return "4";
    if (/^(III\b|3\b|III[\s\-_])/i.test(trimmed)) return "3";
    if (/^(II\b|2\b|II[\s\-_])/i.test(trimmed)) return "2";
    if (/^(I\b|1\b|I[\s\-_])/i.test(trimmed)) return "1";
    return null;
  };

  const handleNamaKelasChange = (val: string) => {
    setNamaKelasInput(val);
    if (!hasManuallySetTingkat) {
      const detected = detectTingkatFromName(val);
      if (detected) setSelectedTingkat(detected);
    }
  };

  // Step state: 1 = Form Kelas & Siswa, 2 = Jam Mengajar Pertama
  const [step, setStep] = useState<1 | 2>(1);
  const [createdClass, setCreatedClass] = useState<{
    rombelId: string;
    namaRombel: string;
    mataPelajaran?: string;
  } | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<
    Array<{ id: string; nama: string; jam_mulai: string; jam_selesai: string }>
  >([]);
  const [sessions, setSessions] = useState<ScheduleSessionInput[]>(buildDefaultSessions());
  const [isScheduleLocked, setIsScheduleLocked] = useState(false);

  const normalize24HourTime = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    const hour = digits.slice(0, 2);
    const minute = digits.slice(2, 4);
    const normalizedHour = Math.min(Number(hour) || 0, 23)
      .toString()
      .padStart(2, "0");
    const normalizedMinute = Math.min(Number(minute) || 0, 59)
      .toString()
      .padStart(2, "0");
    return `${normalizedHour}:${normalizedMinute}`;
  };

  const updateSession = (index: number, field: keyof ScheduleSessionInput, value: string) => {
    setSessions((prev) =>
      prev.map((session, sessionIndex) => {
        if (sessionIndex !== index) return session;

        const nextValue =
          field === "jam_mulai" || field === "jam_selesai" ? normalize24HourTime(value) : value;
        const nextSession = { ...session, [field]: nextValue };
        if (field === "jam_ke") {
          const jamKe = Number(value) || 1;
          nextSession.label = `Jam Ke-${jamKe}`;
        }

        return nextSession;
      })
    );
  };

  const addSession = () => {
    setSessions((prev) => [
      ...prev,
      {
        hari: "SENIN",
        jam_ke: String(Math.min(prev.length + 1, 12)),
        jam_mulai: "",
        jam_selesai: "",
        label: `Jam Ke-${Math.min(prev.length + 1, 12)}`,
      },
    ]);
  };

  const removeSession = (index: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== index));
  };

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setStep(1);
    setCreatedClass(null);
    setNamaKelasInput("");
    setSelectedTingkat("10");
    setHasManuallySetTingkat(false);
  };

  useEffect(() => {
    const handleOpenEvent = () => {
      setInternalOpen(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      setStep(1);
      setCreatedClass(null);
      setNamaKelasInput("");
      setSelectedTingkat("10");
      setHasManuallySetTingkat(false);
    };

    window.addEventListener("open-manual-class-modal", handleOpenEvent);
    return () => {
      window.removeEventListener("open-manual-class-modal", handleOpenEvent);
    };
  }, []);

  const handleDownloadTemplate = () => {
    const csvContent =
      "\uFEFFsep=,\r\nNIS,Nama Siswa,Jenis Kelamin (L/P)\r\n1001,Ahmad Fauzi,L\r\n1002,Dewi Sartika,P\r\n1003,Rian Hidayat,L\r\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template_siswa_rombel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((line) => line && !/^sep\s*=\s*[,;|\t]$/i.test(line));
      const dataLines =
        lines.length > 0 &&
        (lines[0].toLowerCase().includes("nama") || lines[0].toLowerCase().includes("nis"))
          ? lines.slice(1)
          : lines;
      setSiswaText((prev) => (prev ? prev + "\n" + dataLines.join("\n") : dataLines.join("\n")));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!isModalOpen) return null;

  // Submit Step 1: Create Class & Students
  const handleSubmitStep1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createManualClassAction(formData);
      if (res.success && res.data) {
        const cls = res.data;
        setCreatedClass(cls);
        setStep(2);
        setIsLoadingSlots(true);

        try {
          const slotRes = await getTeacherInitialScheduleOptionsAction(cls.rombelId);
          if (slotRes.success && slotRes.data) {
            setAvailableSlots(slotRes.data.slots);
            setIsScheduleLocked(Boolean(slotRes.data.isScheduleLocked));
          }
        } catch (err: any) {
          console.error("Gagal mengambil slot waktu:", err);
        } finally {
          setIsLoadingSlots(false);
        }
      } else {
        setErrorMsg(res.error || "Gagal membuat kelas.");
      }
    });
  };

  // Submit Step 2: Set Initial Schedule
  const handleSubmitStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdClass) return;

    const filledSessions = sessions.filter((session) => session.jam_mulai && session.jam_selesai);
    if (filledSessions.length === 0) {
      setErrorMsg("Isi minimal satu jam mengajar agar jadwal bisa disimpan.");
      return;
    }

    for (const [index, session] of filledSessions.entries()) {
      if (session.jam_mulai >= session.jam_selesai) {
        setErrorMsg(`Jam ${index + 1} tidak valid: jam selesai harus lebih dari jam mulai.`);
        return;
      }
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await createTeacherInitialScheduleAction({
        rombelId: createdClass.rombelId,
        sessions: filledSessions.map((session, index) => ({
          ...session,
          label: session.label || `Jam Ke-${session.jam_ke || index + 1}`,
        })),
      });

      if (res.success) {
        setSuccessMsg("Jam mengajar berhasil disimpan!");
        setTimeout(() => {
          handleClose();
          window.dispatchEvent(
            new CustomEvent("manual-class-created", {
              detail: { rombelId: createdClass.rombelId, namaRombel: createdClass.namaRombel },
            })
          );
        }, 1000);
      } else {
        setErrorMsg(res.error || "Gagal menyimpan jadwal.");
      }
    });
  };

  const handleSkipStep2 = () => {
    if (createdClass) {
      window.dispatchEvent(
        new CustomEvent("manual-class-created", {
          detail: { rombelId: createdClass.rombelId, namaRombel: createdClass.namaRombel },
        })
      );
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[90vh] rounded-[28px] bg-white dark:bg-slate-900/95 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/25 shadow-2xl p-6 sm:p-7 relative space-y-5 overflow-hidden flex flex-col">
        {/* Glow accent */}
        <div className="absolute top-0 right-10 w-48 h-32 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 shadow-2xs">
              {step === 1 ? <PlusCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {step === 1 ? "Tambah Kelas Manual" : "Langkah 2: Tentukan Jam Mengajar"}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold">
                  {step}/2
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {step === 1
                  ? "Buat rombel dan mata pelajaran secara mandiri untuk seluruh jenjang"
                  : `Tentukan jam mengajar pertama untuk kelas ${createdClass?.namaRombel || ""}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        {/* STEP 1: FORM PEMBUATAN KELAS & SISWA */}
        {step === 1 && (
          <form onSubmit={handleSubmitStep1} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Nama Kelas */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <School className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Nama Rombel / Kelas</span>
                </label>
                <input
                  type="text"
                  name="nama_kelas"
                  required
                  value={namaKelasInput}
                  onChange={(e) => handleNamaKelasChange(e.target.value)}
                  placeholder="Misal: 10-A, X RPL 1, 7-B, 1-A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                />
              </div>

              {/* Tingkat Kelas (SD, SMP, SMA) */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  Tingkat &amp; Fase
                </label>
                <select
                  name="tingkat_kelas"
                  value={selectedTingkat}
                  onChange={(e) => {
                    setSelectedTingkat(e.target.value);
                    setHasManuallySetTingkat(true);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all cursor-pointer"
                >
                  <optgroup label="Jenjang SD / MI (Fase A - C)">
                    <option value="1">Kelas 1 (Fase A)</option>
                    <option value="2">Kelas 2 (Fase A)</option>
                    <option value="3">Kelas 3 (Fase B)</option>
                    <option value="4">Kelas 4 (Fase B)</option>
                    <option value="5">Kelas 5 (Fase C)</option>
                    <option value="6">Kelas 6 (Fase C)</option>
                  </optgroup>
                  <optgroup label="Jenjang SMP / MTs (Fase D)">
                    <option value="7">Kelas 7 (Fase D)</option>
                    <option value="8">Kelas 8 (Fase D)</option>
                    <option value="9">Kelas 9 (Fase D)</option>
                  </optgroup>
                  <optgroup label="Jenjang SMA / SMK / MA (Fase E - F)">
                    <option value="10">Kelas 10 (Fase E)</option>
                    <option value="11">Kelas 11 (Fase F)</option>
                    <option value="12">Kelas 12 (Fase F)</option>
                  </optgroup>
                </select>
              </div>

              {/* Mata Pelajaran */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Mata Pelajaran</span>
                </label>
                <input
                  type="text"
                  name="mata_pelajaran"
                  required
                  placeholder="Misal: Pemrograman Web, Matematika"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                />
              </div>
            </div>

            {/* Daftar Siswa & Helper Download Excel */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Daftar Siswa &amp; NIS (Opsional)</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Unduh format file Excel/CSV rapi untuk diisi"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Format Excel</span>
                  </button>

                  <label
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Muat data siswa dari berkas CSV/Excel"
                  >
                    <Upload className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Impor CSV</span>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <textarea
                name="siswa_list"
                rows={4}
                value={siswaText}
                onChange={(e) => setSiswaText(e.target.value)}
                placeholder={
                  "Format per baris: NIS, Nama Siswa, L/P\nContoh:\n1001, Ahmad Fauzi, L\n1002, Dewi Sartika, P\n1003, Rian Hidayat, L\n(Atau langsung copy-paste 2 kolom dari Excel)"
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all resize-none font-mono"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
                Tips: Anda bisa langsung menyalin 2 kolom (NIS &amp; Nama) dari spreadsheet Excel
                lalu tempelkan di kotak di atas.
              </p>
            </div>

            {/* Buttons Step 1 */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-mono font-bold shadow-xs shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan Kelas...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Lanjut ke Jam Mengajar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: TENTUKAN JAM MENGAJAR PERTAMA */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Banner Konfirmasi Kelas Sukses */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                  Kelas {createdClass?.namaRombel} Berhasil Didaftarkan!
                </span>
                <span className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90">
                  {createdClass?.mataPelajaran || "Mata Pelajaran"} siap dijadwalkan ke jadwal
                  harian Anda.
                </span>
              </div>
            </div>

            {isLoadingSlots ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs font-mono">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span>Memuat pilihan slot jam mengajar...</span>
              </div>
            ) : isScheduleLocked ? (
              /* Jadwal Terkunci oleh Kurikulum Resmi */
              <div className="space-y-4 pt-1">
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>Jadwal Resmi Dikelola Kurikulum</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Sekolah Anda menggunakan sistem penjadwalan terpusat. Rombel baru ini telah
                    terdaftar dan siap dialokasikan jam mengajarnya oleh operator kurikulum sekolah.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSkipStep2}
                    className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-mono text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    Selesai &amp; Buka Kelas
                  </button>
                </div>
              </div>
            ) : (
              /* Form Pengaturan Jam Mengajar */
              <form
                onSubmit={handleSubmitStep2}
                className="space-y-4 pt-1 overflow-y-auto pr-1 flex-1"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <span>Jadwal Mengajar</span>
                    </label>
                    <button
                      type="button"
                      onClick={addSession}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 transition-all hover:bg-blue-100 cursor-pointer"
                    >
                      <span className="text-base leading-none">+</span>
                      <span>Tambah Jam</span>
                    </button>
                  </div>

                  {sessions.map((session, index) => (
                    <div
                      key={`session-${index}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        {sessions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSession(index)}
                            className="ml-auto text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                          >
                            Hapus
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          aria-label={`Hari sesi ${index + 1}`}
                          value={session.hari}
                          onChange={(e) => updateSession(index, "hari", e.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          {HARI_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label={`Jam ke sesi ${index + 1}`}
                          value={session.jam_ke || "1"}
                          onChange={(e) => updateSession(index, "jam_ke", e.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          {JAM_KE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <input
                          aria-label={`Jam mulai sesi ${index + 1}`}
                          type="text"
                          inputMode="numeric"
                          placeholder="HH:MM"
                          value={session.jam_mulai}
                          onChange={(e) => updateSession(index, "jam_mulai", e.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />

                        <input
                          aria-label={`Jam selesai sesi ${index + 1}`}
                          type="text"
                          inputMode="numeric"
                          placeholder="HH:MM"
                          value={session.jam_selesai}
                          onChange={(e) => updateSession(index, "jam_selesai", e.target.value)}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleSkipStep2}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Lewati / Atur Nanti
                  </button>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-mono font-bold shadow-xs shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Menyimpan Jadwal...</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5" />
                        <span>Simpan Jam Mengajar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
