"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Clock, Calendar, AlertCircle, CheckCircle2, Loader2, Info, Layers } from "lucide-react";
import {
  getTeacherInitialScheduleOptionsAction,
  createTeacherInitialScheduleAction,
} from "@/app/actions/smart-onboarding-actions";
import { HariBelajar } from "@/modules/schedule/domain/schedule-types";

export interface QuickSetScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  rombelId: string;
  penugasanId?: string;
  rombelNama: string;
  mataPelajaranNama: string;
  onSuccess?: () => void;
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

export function QuickSetScheduleModal({
  isOpen,
  onClose,
  rombelId,
  penugasanId,
  rombelNama,
  mataPelajaranNama,
  onSuccess,
}: QuickSetScheduleModalProps) {
  const router = useRouter();
  const buildDefaultSessions = (): ScheduleSessionInput[] => [];

  const [isPending, startTransition] = useTransition();
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [sessions, setSessions] = useState<ScheduleSessionInput[]>(buildDefaultSessions());
  const [isScheduleLocked, setIsScheduleLocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isOpen || !rombelId) return;

    let isMounted = true;

    getTeacherInitialScheduleOptionsAction(rombelId, penugasanId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setIsScheduleLocked(Boolean(res.data.isScheduleLocked));
        } else {
          setErrorMsg(res.error || "Gagal memuat pilihan jam mengajar.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMsg(err.message || "Gagal memuat jadwal.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, rombelId, penugasanId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const filledSessions = sessions.filter((session) => session.jam_mulai && session.jam_selesai);
    if (filledSessions.length === 0) {
      setErrorMsg("Isi minimal satu jam mengajar agar jadwal bisa disimpan.");
      return;
    }

    for (const [index, session] of filledSessions.entries()) {
      if (!session.jam_mulai || !session.jam_selesai) {
        setErrorMsg(`Jam ${index + 1} belum lengkap: isi jam mulai dan jam selesai.`);
        return;
      }
      if (session.jam_mulai >= session.jam_selesai) {
        setErrorMsg(`Jam ${index + 1} tidak valid: jam selesai harus lebih dari jam mulai.`);
        return;
      }
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await createTeacherInitialScheduleAction({
        rombelId,
        penugasanId,
        sessions: filledSessions.map((session, index) => ({
          ...session,
          label: session.label || `Jam Ke-${session.jam_ke || index + 1}`,
        })),
      });

      if (res.success) {
        setSuccessMsg("Jam mengajar berhasil disimpan!");
        router.refresh();
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      } else {
        setErrorMsg(res.error || "Gagal menyimpan jam mengajar.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[90vh] rounded-[28px] bg-white dark:bg-slate-900/95 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/25 shadow-2xl p-5 sm:p-6 relative space-y-5 overflow-hidden flex flex-col">
        {/* Glow accent */}
        <div className="absolute top-0 right-8 w-44 h-28 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-mono text-base font-black text-slate-900 dark:text-white tracking-tight">
                Atur Jam Mengajar
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tentukan hari & jam mengajar awal untuk rombel ini
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info Rombel & Mapel */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
              Rombel & Mata Pelajaran
            </span>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {rombelNama} • {mataPelajaranNama}
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold">
            Belum Dijadwalkan
          </span>
        </div>

        {/* Condition: Loading Slots */}
        {isLoadingSlots ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs font-mono">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span>Memuat pilihan slot jam...</span>
          </div>
        ) : isScheduleLocked ? (
          /* Condition: Schedule Locked by Central Curriculum */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 shrink-0" />
                <span>Jadwal Terpusat Kurikulum</span>
              </div>
              <p className="leading-relaxed text-[11px] sm:text-xs">
                Sekolah Anda telah menggunakan master jadwal resmi terpusat. Untuk menambahkan atau
                memindahkan jam mengajar rombel ini, silakan koordinasikan dengan operator kurikulum
                sekolah.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold font-mono transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          /* Condition: Interactive Schedule Setter Form */
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
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

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-bold font-mono transition-all cursor-pointer"
              >
                Nanti Saja
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="w-1/2 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold font-mono shadow-xs shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Jam</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
