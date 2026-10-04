"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Camera,
  Clock3,
  School,
  Users,
  X,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Info,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import {
  createManualClassAction,
  createTeacherInitialScheduleAction,
  getTeacherInitialScheduleOptionsAction,
} from "@/app/actions/smart-onboarding-actions";

type ScheduleOptions = {
  rombelNama: string;
  mataPelajaran: string;
  slots: Array<{ id: string; nama: string; jam_mulai: string; jam_selesai: string }>;
};

const HARI = [
  ["SENIN", "Senin"],
  ["SELASA", "Selasa"],
  ["RABU", "Rabu"],
  ["KAMIS", "Kamis"],
  ["JUMAT", "Jumat"],
  ["SABTU", "Sabtu"],
] as const;

const POPULAR_SUBJECTS = [
  "Informatika",
  "Pemrograman Web",
  "Pemrograman Berorientasi Objek (PBO)",
  "Pemrograman Perangkat Bergerak (PPB)",
  "Rekayasa Perangkat Lunak (RPL)",
  "Basis Data",
  "Struktur Data",
  "Matematika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Projek IPAS",
  "Pendidikan Pancasila",
];

export interface TeacherFirstClassSetupModalProps {
  shouldOpen: boolean;
  teacherName?: string;
}

export function TeacherFirstClassSetupModal({
  shouldOpen,
  teacherName,
}: TeacherFirstClassSetupModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3 | 4>(1);

  // Storage key spesifik per guru agar tidak saling kunci
  const storageKey = React.useMemo(() => {
    return teacherName
      ? `rp_setup_seen_${teacherName.replace(/[^a-zA-Z0-9]/g, "_")}`
      : "rp_first_class_setup_seen";
  }, [teacherName]);

  // Step 1 State: Peran & Tugas Mengajar
  const [isWaliKelas, setIsWaliKelas] = React.useState(true);

  // Step 2 State: Mata Pelajaran yang diampu
  const [selectedMapels, setSelectedMapels] = React.useState<string[]>([
    "Informatika",
    "Pemrograman Web",
  ]);
  const [customMapelInput, setCustomMapelInput] = React.useState("");

  // Step 3 State: Rombel & Siswa Form Langsung
  const [namaKelas, setNamaKelas] = React.useState("X RPL 1");
  const [tingkatKelas, setTingkatKelas] = React.useState("10");
  const [hasManuallySetTingkat, setHasManuallySetTingkat] = React.useState(false);

  const detectTingkatFromName = (name: string): string | null => {
    const trimmed = name.trim().toUpperCase();
    if (/^(XII\b|12\b|XII[\s\-_])/i.test(trimmed)) return "12";
    if (/^(XI\b|11\b|XI[\s\-_])/i.test(trimmed)) return "11";
    if (/^(X\b|10\b|X[\s\-_])/i.test(trimmed)) return "10";
    if (/^(IX\b|9\b|IX[\s\-_])/i.test(trimmed)) return "9";
    if (/^(VIII\b|8\b|VIII[\s\-_])/i.test(trimmed)) return "8";
    if (/^(VII\b|7\b|VII[\s\-_])/i.test(trimmed)) return "7";
    return null;
  };

  const handleNamaKelasChange = (val: string) => {
    setNamaKelas(val);
    if (!hasManuallySetTingkat) {
      const detected = detectTingkatFromName(val);
      if (detected) setTingkatKelas(detected);
    }
  };

  const [selectedMapelForClass, setSelectedMapelForClass] = React.useState("Pemrograman Web");
  const [siswaRawText, setSiswaRawText] = React.useState(
    "1001, Ahmad Fauzi, L\n1002, Dewi Sartika, P\n1003, Rian Hidayat, L"
  );
  const [isCreatingClass, setIsCreatingClass] = React.useState(false);
  const [classCreationError, setClassCreationError] = React.useState<string | null>(null);

  // Step 4 State: Jadwal Mengajar
  const [rombelId, setRombelId] = React.useState<string | null>(null);
  const [createdClassName, setCreatedClassName] = React.useState<string>("X RPL 1");
  const [createdClassSubject, setCreatedClassSubject] = React.useState<string>("Pemrograman Web");
  const [options, setOptions] = React.useState<ScheduleOptions | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = React.useState(false);
  const [scheduleError, setScheduleError] = React.useState<string | null>(null);
  const [hari, setHari] = React.useState<(typeof HARI)[number][0]>("SENIN");
  const [slotWaktuId, setSlotWaktuId] = React.useState("");
  const [jamMulai, setJamMulai] = React.useState("08:00");
  const [jamSelesai, setJamSelesai] = React.useState("09:30");
  // Nilai mata pelajaran efektif yang diturunkan langsung saat render
  const effectiveMapelForClass =
    selectedMapelForClass && selectedMapels.includes(selectedMapelForClass)
      ? selectedMapelForClass
      : selectedMapels[0] || "Informatika";

  // Buka setup jadwal untuk rombel yang baru dibuat
  const openScheduleSetup = React.useCallback(
    async (nextRombelId: string, customRombelNama?: string, customMapel?: string) => {
      setRombelId(nextRombelId);
      if (customRombelNama) setCreatedClassName(customRombelNama);
      if (customMapel) setCreatedClassSubject(customMapel);
      setOptions(null);
      setScheduleError(null);
      setCurrentStep(4);
      setIsOpen(true);
      setIsLoadingSlots(true);
      setJamMulai("08:00");
      setJamSelesai("09:30");

      const result = await getTeacherInitialScheduleOptionsAction(nextRombelId);
      if (result.success && result.data) {
        setOptions(result.data);
        setCreatedClassName(result.data.rombelNama);
        setCreatedClassSubject(result.data.mataPelajaran);
        setSlotWaktuId(result.data.slots[0]?.id ?? "");
      } else {
        setScheduleError(result.error ?? "Pilihan slot jam mengajar belum dapat disiapkan.");
      }
      setIsLoadingSlots(false);
    },
    []
  );

  React.useEffect(() => {
    if (!shouldOpen || sessionStorage.getItem(storageKey)) return;
    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [shouldOpen, storageKey]);

  React.useEffect(() => {
    const handleClassCreated = (event: Event) => {
      const detail = (
        event as CustomEvent<{ rombelId?: string; namaRombel?: string; mapel?: string }>
      ).detail;
      if (detail?.rombelId) {
        void openScheduleSetup(detail.rombelId, detail.namaRombel, detail.mapel);
      }
    };
    const handleOpenSchedule = (event: Event) => {
      const detail = (event as CustomEvent<{ rombelId?: string }>).detail;
      if (detail?.rombelId) void openScheduleSetup(detail.rombelId);
    };
    window.addEventListener("manual-class-created", handleClassCreated);
    window.addEventListener("open-teacher-schedule-setup", handleOpenSchedule);
    return () => {
      window.removeEventListener("manual-class-created", handleClassCreated);
      window.removeEventListener("open-teacher-schedule-setup", handleOpenSchedule);
    };
  }, [openScheduleSetup]);

  const close = () => {
    sessionStorage.setItem(storageKey, "1");
    setIsOpen(false);
    setClassCreationError(null);
    setScheduleError(null);
  };

  const toggleMapel = (mapel: string) => {
    setSelectedMapels((prev) =>
      prev.includes(mapel) ? prev.filter((m) => m !== mapel) : [...prev, mapel]
    );
  };

  const handleAddCustomMapel = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customMapelInput.trim();
    if (!trimmed) return;
    if (!selectedMapels.includes(trimmed)) {
      setSelectedMapels((prev) => [...prev, trimmed]);
      setSelectedMapelForClass(trimmed);
    }
    setCustomMapelInput("");
  };

  // Langsung submit pembuatan kelas di Step 3 tanpa menutup modal
  const handleSaveClassStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassCreationError(null);

    if (!namaKelas.trim()) {
      setClassCreationError("Nama kelas wajib diisi (contoh: X RPL 1).");
      return;
    }
    if (!effectiveMapelForClass.trim()) {
      setClassCreationError("Mata pelajaran wajib dipilih.");
      return;
    }

    setIsCreatingClass(true);
    const formData = new FormData();
    formData.append("nama_kelas", namaKelas.trim());
    formData.append("tingkat_kelas", tingkatKelas);
    formData.append("mata_pelajaran", effectiveMapelForClass.trim());
    formData.append("siswa_list", siswaRawText.trim());

    const res = await createManualClassAction(formData);
    setIsCreatingClass(false);

    if (res.success && res.data) {
      const created = res.data;
      setRombelId(created.rombelId);
      setCreatedClassName(created.namaRombel);
      setCreatedClassSubject(created.mataPelajaran);

      // Otomatis geser ke Step 4 (Jadwal) tanpa menutup modal!
      void openScheduleSetup(created.rombelId, created.namaRombel, created.mataPelajaran);
    } else {
      setClassCreationError(res.error || "Gagal membuat kelas. Silakan periksa kembali.");
    }
  };

  // Submit Step 4: Simpan Jadwal & Selesai
  const handleSaveScheduleStep4 = async () => {
    if (!rombelId) return;
    if (!jamMulai || !jamSelesai) {
      setScheduleError("Silakan tentukan jam mulai dan jam selesai mengajar.");
      return;
    }
    if (jamMulai >= jamSelesai) {
      setScheduleError("Jam selesai harus lebih dari jam mulai.");
      return;
    }
    setIsSavingSchedule(true);
    setScheduleError(null);

    const result = await createTeacherInitialScheduleAction({
      rombelId,
      slotWaktuId: slotWaktuId || undefined,
      hari,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
    });
    setIsSavingSchedule(false);

    if (!result.success) {
      setScheduleError(result.error ?? "Jadwal awal belum dapat disimpan.");
      return;
    }

    // Sukses selesai! Tandai riwayat dan bawa ke jadwal / dashboard
    close();
    router.push("/jadwal-saya");
    router.refresh();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-setup-title"
        className="w-full max-w-lg rounded-[28px] border border-white/20 dark:border-blue-500/25 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-7 relative overflow-hidden transition-all duration-300 space-y-5 max-h-[92vh] flex flex-col"
      >
        {/* Glow Ambient Accent */}
        <div className="absolute top-0 right-10 w-48 h-32 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* 1. STEPPER BAR (1 - 2 - 3 - 4) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 relative z-10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 w-full">
            {[
              { num: 1, label: "Peran" },
              { num: 2, label: "Mapel" },
              { num: 3, label: "Rombel" },
              { num: 4, label: "Jadwal" },
            ].map((s, idx, arr) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`size-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-200 ${
                      currentStep === s.num
                        ? "bg-[#2563EB] text-white shadow-xs shadow-blue-500/40 ring-4 ring-blue-500/20"
                        : currentStep > s.num
                          ? "bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-black"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {currentStep > s.num ? <Check className="size-3.5 stroke-[3]" /> : s.num}
                  </div>
                  <span
                    className={`text-[11px] font-bold hidden sm:inline ${
                      currentStep === s.num
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 rounded-full transition-colors ${
                      currentStep > s.num ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Tutup setup awal"
            className="ml-3 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 2. STEP CONTENTS (Scrollable if needed on mobile) */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4">
          {/* ========================================================================= */}
          {/* STEP 1: PILIH PERAN & TUGAS MENGAJAR DENGAN SWITCH TOGGLE ON/OFF          */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2
                  id="teacher-setup-title"
                  className="font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight"
                >
                  Selamat Datang,{" "}
                  <span className="text-[#2563EB] dark:text-blue-400">
                    {teacherName || "Bapak/Ibu Guru"}
                  </span>{" "}
                  👋
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Agar Ruang Pintar dapat menyesuaikan fitur yang Anda butuhkan, silakan tentukan
                  tugas mengajar Anda semester ini.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {/* Card 1: Guru Mata Pelajaran (Otomatis Terpilih / ON Terkunci) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/90 dark:border-blue-500/20 shadow-xs flex items-center justify-between gap-4 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <BookOpen className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Guru Mata Pelajaran
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 text-[10px] font-mono font-bold">
                          Tugas Pokok
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Mengajar siswa, mengelola materi, tugas, penilaian, dan aktivitas
                        pembelajaran.
                      </p>
                    </div>
                  </div>

                  {/* Tactile Switch Toggle ON (Locked Active) */}
                  <div
                    className="h-8 w-16 px-1 rounded-full bg-[#2563EB] flex items-center justify-between shadow-xs shadow-blue-500/30 cursor-default select-none shrink-0"
                    title="Tugas Pokok Pendidik (Wajib Aktif)"
                    aria-label="Guru Mata Pelajaran Aktif"
                  >
                    <span className="text-[10px] font-black font-mono text-white pl-1.5 tracking-wider">
                      ON
                    </span>
                    <div className="size-6 rounded-full bg-white shadow-sm flex items-center justify-center" />
                  </div>
                </div>

                {/* Card 2: Wali Kelas (Interaktif ON / OFF Switch) */}
                <div
                  onClick={() => setIsWaliKelas((prev) => !prev)}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none ${
                    isWaliKelas
                      ? "bg-white dark:bg-slate-800/80 border-blue-300 dark:border-blue-500/40 shadow-xs"
                      : "bg-slate-50/70 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`size-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isWaliKelas
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <Users className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Wali Kelas
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Mengelola rombel binaan, memantau perkembangan siswa, dan rekap nilai rapor.
                      </p>
                    </div>
                  </div>

                  {/* Tactile Switch Toggle Button (Interactive ON/OFF) */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isWaliKelas}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsWaliKelas((prev) => !prev);
                    }}
                    className={`h-8 w-16 px-1 rounded-full flex items-center justify-between cursor-pointer select-none transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 shrink-0 ${
                      isWaliKelas
                        ? "bg-[#2563EB] shadow-xs shadow-blue-500/30"
                        : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    {isWaliKelas ? (
                      <>
                        <span className="text-[10px] font-black font-mono text-white pl-1.5 tracking-wider">
                          ON
                        </span>
                        <div className="size-6 rounded-full bg-white shadow-sm transition-transform" />
                      </>
                    ) : (
                      <>
                        <div className="size-6 rounded-full bg-white shadow-sm transition-transform" />
                        <span className="text-[10px] font-black font-mono text-slate-600 dark:text-slate-300 pr-1.5 tracking-wider">
                          OFF
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Info Hint */}
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center gap-2 text-blue-700 dark:text-blue-300 text-xs">
                <Info className="size-4 shrink-0" />
                <span>
                  Mengaktifkan Wali Kelas akan membuka menu Leger Rapor & Presensi Rombel Binaan.
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PILIH MATA PELAJARAN YANG DIAMPU                                   */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2
                  id="teacher-setup-title"
                  className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight"
                >
                  Mata pelajaran apa yang Anda ampu?
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Pilih satu atau beberapa mata pelajaran yang Anda ajarkan pada semester aktif ini.
                </p>
              </div>

              {/* Subject Chips Grid */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {POPULAR_SUBJECTS.map((mapel) => {
                  const isSelected = selectedMapels.includes(mapel);
                  return (
                    <button
                      key={mapel}
                      type="button"
                      onClick={() => toggleMapel(mapel)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#2563EB] text-white border-blue-600 shadow-xs shadow-blue-500/25 font-bold"
                          : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                      }`}
                    >
                      {isSelected && <Check className="size-3 stroke-[3]" />}
                      <span>{mapel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Subject Input */}
              <form onSubmit={handleAddCustomMapel} className="flex gap-2">
                <input
                  type="text"
                  value={customMapelInput}
                  onChange={(e) => setCustomMapelInput(e.target.value)}
                  placeholder="+ Tambah mata pelajaran lain..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  type="submit"
                  disabled={!customMapelInput.trim()}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="size-4" />
                </button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: SIAPKAN ROMBEL & SISWA LANGSUNG DALAM WIZARD (NO POPUP HOPPING)   */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <form
              onSubmit={handleSaveClassStep3}
              className="space-y-3.5 animate-in fade-in duration-200"
            >
              <div>
                <h2
                  id="teacher-setup-title"
                  className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight"
                >
                  Siapkan rombel pertama Anda
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Masukkan rombel dan daftar siswa Anda. Setelah ini, Anda langsung diarahkan
                  memilih jadwal mengajar.
                </p>
              </div>

              {classCreationError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="size-4 shrink-0 text-rose-500" />
                  <span>{classCreationError}</span>
                </div>
              )}

              {/* Form Input Rombel & Mapel */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Rombel / Kelas
                  </label>
                  <input
                    type="text"
                    required
                    value={namaKelas}
                    onChange={(e) => handleNamaKelasChange(e.target.value)}
                    placeholder="Contoh: X RPL 1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tingkat Kelas
                  </label>
                  <select
                    value={tingkatKelas}
                    onChange={(e) => {
                      setTingkatKelas(e.target.value);
                      setHasManuallySetTingkat(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="10">Kelas 10 (Fase E)</option>
                    <option value="11">Kelas 11 (Fase F)</option>
                    <option value="12">Kelas 12 (Fase F)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mata Pelajaran untuk Rombel Ini
                </label>
                <select
                  value={effectiveMapelForClass}
                  onChange={(e) => setSelectedMapelForClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {selectedMapels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Daftar Nama Siswa
                  </label>
                  <span className="text-[10px] text-slate-400">
                    1 baris per siswa (NIS, Nama, L/P)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={siswaRawText}
                  onChange={(e) => setSiswaRawText(e.target.value)}
                  placeholder="1001, Ahmad Fauzi, L&#10;1002, Dewi Sartika, P&#10;1003, Rian Hidayat, L"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Kembali</span>
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClass}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-mono text-xs font-bold shadow-xs shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {isCreatingClass ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Menyimpan Rombel...</span>
                    </>
                  ) : (
                    <>
                      <span>Simpan & Atur Jadwal</span>
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: TENTUKAN JADWAL AWAL & SELESAI (SEAMLESS IN THE SAME WIZARD!)      */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-mono font-bold">
                  <Check className="size-3" />
                  <span>Rombel {createdClassName} Siap!</span>
                </div>
                <h2
                  id="teacher-setup-title"
                  className="mt-1.5 text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight"
                >
                  Tentukan jadwal mengajar pertama
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Pilih hari dan jam mengajar untuk kelas{" "}
                  <strong className="text-slate-900 dark:text-white">{createdClassName}</strong>{" "}
                  pada mata pelajaran{" "}
                  <strong className="text-slate-900 dark:text-white">{createdClassSubject}</strong>.
                </p>
              </div>

              {isLoadingSlots ? (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-5 text-xs font-medium text-slate-500 dark:text-slate-400 text-center animate-pulse flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin text-blue-600" />
                  <span>Menyiapkan pilihan slot jam mengajar sekolah...</span>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 pt-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Hari mengajar
                    <select
                      value={hari}
                      onChange={(event) => setHari(event.target.value as typeof hari)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {HARI.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Jam mulai
                      <input
                        aria-label="Jam mulai"
                        type="time"
                        value={jamMulai}
                        onChange={(event) => setJamMulai(event.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Jam selesai
                      <input
                        aria-label="Jam selesai"
                        type="time"
                        value={jamSelesai}
                        onChange={(event) => setJamSelesai(event.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>
                  </div>
                </div>
              )}

              {scheduleError && (
                <p
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-medium text-rose-700 dark:text-rose-300"
                >
                  {scheduleError}
                </p>
              )}

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={close}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Atur nanti
                </button>
                <button
                  type="button"
                  onClick={handleSaveScheduleStep4}
                  disabled={isLoadingSlots || isSavingSchedule}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-mono text-xs font-bold shadow-xs shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingSchedule ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Clock3 className="size-4" />
                      <span>Simpan Jadwal & Siap Mengajar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. STEP 1 & STEP 2 BOTTOM ACTIONS (Only for step 1 & 2) */}
        {currentStep === 1 && (
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={close}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Lewati Dulu
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-mono text-xs font-bold shadow-xs shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <span>Lanjutkan</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Kembali</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              disabled={selectedMapels.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-mono text-xs font-bold shadow-xs shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Lanjutkan ({selectedMapels.length} Mapel)</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
