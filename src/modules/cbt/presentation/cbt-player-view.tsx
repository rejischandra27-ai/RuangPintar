"use client";

/**
 * Ruang Pintar — M14 CBT Secure Player View (Academic Glass UI v1.2)
 *
 * Invariant & Security Principles:
 * - Server Authoritative Timer: countdown sinkron dengan batas_waktu_server.
 * - Zero Answer Key Leakage: Hanya manifest_soal tanpa flag is_correct atau kunci_jawaban.
 * - Idempotent Autosave: Jawaban disimpan otomatis per pilihan / debounce teks.
 * - Anti-Cheat Integrity Guard:
 *   - Deteksi fullscreen exit, tab switch (visibilitychange), window blur.
 *   - Audio alert indicator ("Peringatan keluar layar").
 *   - Strike 1: Modal peringatan keras.
 *   - Strike 2: Attempt terkunci otomatis (TERKUNCI_PELANGGARAN) & lapor ke pengawas.
 */

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Maximize2,
  Minimize2,
  Send,
  HelpCircle,
  ShieldAlert,
  Loader2,
  Award,
  Check,
  RotateCcw,
  Volume2,
  X,
  Image as ImageIcon,
  ArrowRight,
  WifiOff,
} from "lucide-react";
import { SesiUjianSiswaDTO, ManifestItemSoal, HasilUjianCbtDTO } from "../domain/cbt-types";
import {
  autosaveAnswerAction,
  recordIntegrityEventAction,
  submitAttemptAction,
} from "@/app/actions/cbt-actions";
import { MathRenderer } from "@/shared/components/cbt/math-renderer";
import { ImageStimulus } from "@/shared/components/cbt/image-stimulus";
import { AudioStimulusPlayer } from "@/shared/components/cbt/audio-stimulus-player";

interface CbtPlayerViewProps {
  initialSession: SesiUjianSiswaDTO;
  manifest: ManifestItemSoal[];
  initialTimeRemainingSeconds: number;
  initialSavedAnswers: Record<
    string,
    {
      jawaban_pilihan?: string | null;
      jawaban_teks?: string | null;
      jawaban_kompleks?: string[] | null;
      jawaban_menjodohkan?: Record<string, string> | null;
      ragu_ragu?: boolean;
    }
  >;
  ujian: {
    judul: string;
    deskripsi: string | null;
    acak_soal: boolean;
  };
}

export function CbtPlayerView({
  initialSession,
  manifest,
  initialTimeRemainingSeconds,
  initialSavedAnswers,
  ujian,
}: CbtPlayerViewProps) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [currentIndex, setCurrentIndex] = useState(0);
  const STORAGE_KEY = `rp_cbt_answers_${session.id}`;

  // Exam Recovery: Restore answers from local cache on mount without cascading render
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`rp_cbt_answers_${initialSession.id}`);
        if (cached) {
          const localAnswers = JSON.parse(cached);
          if (localAnswers && typeof localAnswers === "object") {
            return { ...initialSavedAnswers, ...localAnswers };
          }
        }
      } catch {
        // LocalStorage fallback
      }
    }
    return initialSavedAnswers;
  });

  const [secondsLeft, setSecondsLeft] = useState(initialTimeRemainingSeconds);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return navigator.onLine;
    }
    return true;
  });
  const [saveStatus, setSaveStatus] = useState<"SAVED" | "SAVING" | "OFFLINE" | "ERROR">(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return "OFFLINE";
    }
    return "SAVED";
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<HasilUjianCbtDTO | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Network connection listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      setSaveStatus("SAVED");
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus("OFFLINE");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Anti-Cheat Strike State
  const [strikeCount, setStrikeCount] = useState(0);
  const [isStrikeModalOpen, setIsStrikeModalOpen] = useState(false);
  const [strikeMessage, setStrikeMessage] = useState("");
  const [internalLocked, setInternalLocked] = useState(false);
  const isLocked = internalLocked || session.status === "TERKUNCI_PELANGGARAN";

  const [isPending, startTransition] = useTransition();
  const activeQuestion = manifest[currentIndex];

  // ============================================================================
  // AUDIO SYNTHESIS ALERT INDICATOR
  // ============================================================================
  const playAlertSound = useCallback(() => {
    try {
      if (typeof window !== "undefined" && "AudioContext" in window) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        // Two-tone warning beep (800Hz -> 500Hz)
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(500, audioCtx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch {
      // Ignore audio failure if restricted by browser policy
    }
  }, []);

  // Periodic Countdown (Authoritative Server Deadline Invariant)
  const handleForceSubmit = useCallback(
    async (_reason: string) => {
      setIsSubmitting(true);
      try {
        const res = await submitAttemptAction(session.id);
        if (res.success && res.data) {
          setFinalResult(res.data);
        }
      } catch {
        // Ignored
      } finally {
        setIsSubmitting(false);
      }
    },
    [session.id]
  );

  useEffect(() => {
    if (finalResult || isLocked) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit when authoritative timer hits 0
          handleForceSubmit("Waktu ujian telah berakhir");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [finalResult, handleForceSubmit, isLocked]);

  // Audio warning on strike count increment
  useEffect(() => {
    if (strikeCount > 0) {
      playAlertSound();
    }
  }, [strikeCount, playAlertSound]);

  // ============================================================================
  // INTEGRITY MONITORING & AUDIT EVENT DISPATCH
  // ============================================================================
  const triggerIntegrityViolation = useCallback(
    async (type: "PINDAH_TAB_ATAU_WINDOW" | "KELUAR_LAYAR_PENUH", desc: string) => {
      if (finalResult || isLocked) return;

      try {
        const res = await recordIntegrityEventAction({
          sesi_ujian_siswa_id: session.id,
          nomor_urut_soal: activeQuestion?.nomor_urut || null,
          tipe_event: type,
          deskripsi: desc,
        });

        if (res.success && res.data) {
          const newStrike = strikeCount + 1;
          setStrikeCount(newStrike);
          setStrikeMessage(desc);

          if (res.data.isLocked || newStrike >= 2) {
            setInternalLocked(true);
            setIsStrikeModalOpen(false);
          } else {
            setIsStrikeModalOpen(true);
          }
        }
      } catch {
        // Fail-safe
      }
    },
    [activeQuestion, finalResult, isLocked, session.id, strikeCount]
  );

  useEffect(() => {
    if (finalResult || isLocked) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerIntegrityViolation(
          "PINDAH_TAB_ATAU_WINDOW",
          "Terdeteksi meninggalkan lembar ujian (pindah tab atau aplikasi lain)."
        );
      }
    };

    const handleBlur = () => {
      if (!isStrikeModalOpen && !showSubmitModal) {
        triggerIntegrityViolation(
          "PINDAH_TAB_ATAU_WINDOW",
          "Fokus jendela ujian terlepas (membuka jendela / notifikasi eksternal)."
        );
      }
    };

    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull && !isStrikeModalOpen && !showSubmitModal) {
        triggerIntegrityViolation(
          "KELUAR_LAYAR_PENUH",
          "Terdeteksi keluar dari mode layar penuh (fullscreen)."
        );
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Developer Tools (F12)
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }
      // Block Ctrl/Cmd combinations (Copy, Paste, Cut, Select All, View Source, Print, Save)
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (["c", "v", "x", "a", "u", "p", "s"].includes(key)) {
          e.preventDefault();
        }
      }
      // Block PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
      }
    };

    const handleCopyCutPaste = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    // Mobile AI menu blocker: Prevent long-press text selection popup ("Ask Gemini", "Search Web", "Copy")
    const handleSelectionChange = () => {
      const activeEl = document.activeElement;
      const isEditing =
        activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
      if (!isEditing) {
        const sel = window.getSelection();
        if (sel && sel.toString().length > 0) {
          sel.removeAllRanges();
        }
      }
    };

    // Mobile Split-Screen / Floating Window AI Detector
    let resizeDebounce: any;
    const handleResize = () => {
      clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        if (typeof window === "undefined") return;
        const isMobile =
          window.matchMedia("(max-width: 1024px)").matches || "ontouchstart" in window;
        if (isMobile && window.screen && window.screen.availHeight > 0) {
          const activeEl = document.activeElement;
          const isInputFocused =
            activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
          // If viewport height collapses significantly without keyboard open, split-screen / floating AI is active
          const heightRatio = window.innerHeight / window.screen.availHeight;
          if (!isInputFocused && heightRatio < 0.6 && !isStrikeModalOpen && !showSubmitModal) {
            triggerIntegrityViolation(
              "PINDAH_TAB_ATAU_WINDOW",
              "Terdeteksi mode layar terbelah (Split Screen / Floating Window AI). Sesi ujian mewajibkan satu layar penuh."
            );
          }
        }
      }, 300);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("copy", handleCopyCutPaste);
    document.addEventListener("cut", handleCopyCutPaste);
    document.addEventListener("paste", handleCopyCutPaste);
    document.addEventListener("selectionchange", handleSelectionChange);
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(resizeDebounce);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("copy", handleCopyCutPaste);
      document.removeEventListener("cut", handleCopyCutPaste);
      document.removeEventListener("paste", handleCopyCutPaste);
      document.removeEventListener("selectionchange", handleSelectionChange);
      window.removeEventListener("resize", handleResize);
    };
  }, [finalResult, isLocked, isStrikeModalOpen, showSubmitModal, triggerIntegrityViolation]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // ============================================================================
  // AUTOSAVE LOGIC
  // ============================================================================
  const persistAnswer = async (
    nomorUrut: number,
    patch: {
      jawaban_pilihan?: string | null;
      jawaban_teks?: string | null;
      jawaban_kompleks?: string[] | null;
      jawaban_menjodohkan?: Record<string, string> | null;
      ragu_ragu?: boolean;
    }
  ) => {
    const current = answers[nomorUrut] || {};
    const merged = { ...current, ...patch };

    // 1. Instant Write-Ahead Buffer to LocalStorage (Zero Answer Loss Invariant)
    setAnswers((prev) => {
      const updated = { ...prev, [nomorUrut]: merged };
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch {
        // Fallback if localStorage quota exceeded
      }
      return updated;
    });

    // Check offline status
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSaveStatus("OFFLINE");
      return;
    }

    setSaveStatus("SAVING");

    try {
      const res = await autosaveAnswerAction({
        sesi_ujian_siswa_id: session.id,
        nomor_urut: nomorUrut,
        jawaban_pilihan: merged.jawaban_pilihan,
        jawaban_teks: merged.jawaban_teks,
        jawaban_kompleks: merged.jawaban_kompleks,
        jawaban_menjodohkan: merged.jawaban_menjodohkan,
        ragu_ragu: merged.ragu_ragu,
      });

      if (res.success) {
        setSaveStatus("SAVED");
      } else {
        setSaveStatus("OFFLINE");
      }
    } catch {
      setSaveStatus("OFFLINE");
    }
  };

  const handleMatchingChange = (premiseId: string, val: string) => {
    if (isLocked || finalResult) return;
    const current = answers[activeQuestion.nomor_urut]?.jawaban_menjodohkan || {};
    const updated = { ...current, [premiseId]: val };
    persistAnswer(activeQuestion.nomor_urut, { jawaban_menjodohkan: updated });
  };

  const handleSelectChoice = (label: string) => {
    if (isLocked || finalResult) return;
    persistAnswer(activeQuestion.nomor_urut, { jawaban_pilihan: label });
  };

  const handleToggleComplexChoice = (label: string) => {
    if (isLocked || finalResult) return;
    const currentList: string[] = answers[activeQuestion.nomor_urut]?.jawaban_kompleks || [];
    const updated = currentList.includes(label)
      ? currentList.filter((item: string) => item !== label)
      : [...currentList, label];
    persistAnswer(activeQuestion.nomor_urut, { jawaban_kompleks: updated });
  };

  const handleTextChange = (text: string) => {
    if (isLocked || finalResult) return;
    persistAnswer(activeQuestion.nomor_urut, { jawaban_teks: text });
  };

  const handleToggleRagu = () => {
    if (isLocked || finalResult) return;
    const currentRagu = Boolean(answers[activeQuestion.nomor_urut]?.ragu_ragu);
    persistAnswer(activeQuestion.nomor_urut, { ragu_ragu: !currentRagu });
  };

  const handleSubmitAttempt = async () => {
    if (isSubmitting) return; // Prevent double-submit race condition
    setIsSubmitting(true);
    try {
      const res = await submitAttemptAction(session.id);
      if (res.success && res.data) {
        setFinalResult(res.data);
        setShowSubmitModal(false);
        // Clear local storage after verified submission
        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch {
          // Ignored
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsSubmitting(false);
    }
  };

  // Time formatter
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${hours > 0 ? `${hours.toString().padStart(2, "0")}:` : ""}${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Tally answered
  const answeredCount = Object.values(answers).filter(
    (a) =>
      a.jawaban_pilihan !== undefined ||
      (a.jawaban_teks && a.jawaban_teks.trim() !== "") ||
      (a.jawaban_kompleks && a.jawaban_kompleks.length > 0) ||
      (a.jawaban_menjodohkan && Object.keys(a.jawaban_menjodohkan).length > 0)
  ).length;
  const raguCount = Object.values(answers).filter((a) => a.ragu_ragu).length;

  // ============================================================================
  // RENDER FINAL RESULT SCREEN
  // ============================================================================
  if (finalResult) {
    const isPassed = finalResult.status_kelulusan === "TUNTAS";
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient academic glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-3xl p-8 text-center space-y-6 shadow-xl border border-slate-200/80 relative z-10">
          <div
            className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${
              isPassed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
            }`}
          >
            <Award className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <span
              className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                isPassed
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-amber-50 text-amber-700 border border-amber-200/60"
              }`}
            >
              {isPassed ? "Kompeten / Tuntas KKTP" : "Belum Mencapai KKTP"}
            </span>
            <h2 className="text-xl font-bold text-slate-900">{ujian.judul}</h2>
            <p className="text-xs text-slate-500">
              Ujian Anda telah berhasil dikumpulkan dan dinilai secara otomatis oleh server.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Skor Akhir</div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {finalResult.nilai_akhir}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Benar / Total</div>
              <div className="text-lg font-bold font-mono text-emerald-600">
                {finalResult.total_benar}{" "}
                <span className="text-xs text-slate-400">/ {manifest.length}</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Status</div>
              <div className="text-xs font-bold text-slate-800 mt-1">
                {finalResult.status_kelulusan}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 rounded-2xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER PLAYER SCREEN
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col select-none text-slate-900 relative [-webkit-touch-callout:none] [-webkit-user-select:none]">
      {/* Anti-Cheat & Anti-Leakage Dynamic Watermark */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden opacity-[0.035] select-none">
        <div className="text-center font-mono font-black text-xl text-slate-900 rotate-[-25deg] leading-loose whitespace-pre-wrap">
          {`RUANG PINTAR CBT • SESI: ${session.id}\nPESERTA TERVERIFIKASI • DILARANG MENYEBARLUASKAN`}
        </div>
      </div>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ring-2 ring-blue-500/20">
              RP
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {ujian.judul}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">
                  Soal {currentIndex + 1} dari {manifest.length}
                </span>
                <span>•</span>
                {/* Autosave badge */}
                <span className="flex items-center gap-1 font-medium">
                  {saveStatus === "SAVING" && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                      <span className="text-amber-600 font-semibold">Menyimpan...</span>
                    </>
                  )}
                  {saveStatus === "SAVED" && (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-600 font-semibold">Tersimpan di Cloud</span>
                    </>
                  )}
                  {saveStatus === "OFFLINE" && (
                    <>
                      <WifiOff className="h-3 w-3 text-amber-500" />
                      <span className="text-amber-700 font-semibold">
                        Tersimpan di Perangkat (Offline)
                      </span>
                    </>
                  )}
                  {saveStatus === "ERROR" && (
                    <>
                      <AlertTriangle className="h-3 w-3 text-rose-500" />
                      <span className="text-rose-600 font-semibold">
                        Koneksi Terganggu (Aman Lokal)
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Timer, Fullscreen, Finish */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Authoritative Timer */}
            <div
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl font-mono text-xs sm:text-sm font-bold transition shadow-xs ${
                secondsLeft < 300
                  ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                  : secondsLeft < 900
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200/80"
              }`}
            >
              <Clock className="h-4 w-4 shrink-0" />
              <span>{formattedTime}</span>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh"}
              className="p-2 rounded-xl border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition hidden sm:flex"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              disabled={isLocked}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Selesai</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Question Display + Navigator */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left 3 Columns: Active Question Card */}
        <div className="lg:col-span-3 bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xs flex flex-col min-h-[500px] overflow-hidden">
          {(() => {
            const currentQuestionType =
              activeQuestion.jenis_soal || activeQuestion.tipe_soal || "PILIHAN_GANDA";
            const currentQuestionOptions: Array<{ label: string; teks: string; urutan?: number }> =
              activeQuestion.opsi || (activeQuestion.opsi_jawaban as any) || [];

            // MENJODOHKAN pair extractor
            let menjodohkanPremis: Array<{ id: string; teks: string }> = [];
            let menjodohkanTargetChoices: string[] = [];
            if (currentQuestionType === "MENJODOHKAN") {
              const rawOpsi: any = activeQuestion.opsi_jawaban || activeQuestion.opsi;
              if (rawOpsi && typeof rawOpsi === "object" && !Array.isArray(rawOpsi)) {
                menjodohkanPremis = rawOpsi.premis || [];
                menjodohkanTargetChoices = rawOpsi.pilihan_target || [];
              } else if (Array.isArray(rawOpsi)) {
                menjodohkanPremis = rawOpsi.map((item: any, i: number) => ({
                  id: item.label || item.id || String(i + 1),
                  teks: item.teks || item.premis || "",
                }));
                menjodohkanTargetChoices = Array.from(
                  new Set(
                    rawOpsi
                      .map((item: any) => item.pasangan || item.target || item.respon)
                      .filter(Boolean)
                  )
                ).sort();
              }
            }

            return (
              <>
                {/* Question Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 font-mono font-bold text-sm flex items-center justify-center">
                      {activeQuestion.nomor_urut}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-700 border border-slate-200/60">
                      {currentQuestionType.replace(/_/g, " ")}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      Bobot: <strong className="text-slate-700">{activeQuestion.bobot}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleRagu}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      answers[activeQuestion.nomor_urut]?.ragu_ragu
                        ? "bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>Ragu-ragu</span>
                  </button>
                </div>

                {/* Question Body */}
                <div className="p-6 sm:p-8 flex-1 space-y-6">
                  {/* Audio Stimulus if present */}
                  {(() => {
                    const isAudioMedia = Boolean(
                      activeQuestion.gambar_url &&
                      (/\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(activeQuestion.gambar_url) ||
                        activeQuestion.gambar_url.startsWith("data:audio") ||
                        activeQuestion.gambar_url.startsWith("audio:"))
                    );
                    const audioMatch = activeQuestion.pertanyaan?.match(
                      /\[audio:(https?:\/\/[^\s|\]]+)(?:\|limit:(\d+))?\]/i
                    );
                    const extractedAudioUrl = audioMatch
                      ? audioMatch[1]
                      : isAudioMedia
                        ? activeQuestion.gambar_url
                        : null;
                    const audioPlayLimit =
                      audioMatch && audioMatch[2] ? parseInt(audioMatch[2], 10) : 2;
                    const cleanPertanyaan = activeQuestion.pertanyaan
                      ? activeQuestion.pertanyaan.replace(/\[audio:[^\]]+\]/gi, "").trim()
                      : "";

                    return (
                      <>
                        {extractedAudioUrl && (
                          <div className="my-2">
                            <AudioStimulusPlayer
                              src={extractedAudioUrl}
                              maxPlayCount={audioPlayLimit}
                              title={`Audio Listening — Soal No. ${activeQuestion.nomor_urut}`}
                            />
                          </div>
                        )}

                        {activeQuestion.gambar_url && !isAudioMedia && (
                          <div className="flex justify-center">
                            <ImageStimulus
                              src={activeQuestion.gambar_url}
                              alt="Ilustrasi / Stimulus Soal"
                              caption="Klik gambar untuk memperbesar resolusi penuh"
                            />
                          </div>
                        )}

                        <div className="text-sm sm:text-base font-normal text-slate-800 leading-relaxed">
                          <MathRenderer content={cleanPertanyaan} />
                        </div>
                      </>
                    );
                  })()}

                  {/* Answer Options according to question type */}
                  {(currentQuestionType === "PILIHAN_GANDA" ||
                    currentQuestionType === "BENAR_SALAH") &&
                    currentQuestionOptions.length > 0 && (
                      <div className="space-y-3 pt-2">
                        {currentQuestionOptions.map((op: any, opIdx: number) => {
                          const choiceLabel = op.label || op.id || String.fromCharCode(65 + opIdx);
                          const isSelected = Boolean(
                            answers[activeQuestion.nomor_urut]?.jawaban_pilihan &&
                            answers[activeQuestion.nomor_urut]?.jawaban_pilihan === choiceLabel
                          );
                          return (
                            <button
                              key={choiceLabel}
                              type="button"
                              onClick={() => handleSelectChoice(choiceLabel)}
                              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                                isSelected
                                  ? "bg-blue-50/90 border-2 border-blue-600 text-slate-900 font-semibold shadow-xs"
                                  : "bg-white border-slate-200/90 text-slate-700 hover:border-blue-300 hover:bg-blue-50/30 shadow-2xs"
                              }`}
                            >
                              <span
                                className={`w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {choiceLabel}
                              </span>
                              <MathRenderer
                                content={op.teks}
                                className="text-sm flex-1 leading-relaxed"
                              />
                              {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                  {currentQuestionType === "PILIHAN_GANDA_KOMPLEKS" &&
                    currentQuestionOptions.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <p className="text-xs text-blue-600 font-semibold">
                          * Pilih satu atau lebih jawaban yang benar.
                        </p>
                        {currentQuestionOptions.map((op: any, opIdx: number) => {
                          const choiceLabel = op.label || op.id || String.fromCharCode(65 + opIdx);
                          const currentComplex =
                            answers[activeQuestion.nomor_urut]?.jawaban_kompleks || [];
                          const isChecked = Boolean(
                            currentComplex && currentComplex.includes(choiceLabel)
                          );
                          return (
                            <button
                              key={choiceLabel}
                              type="button"
                              onClick={() => handleToggleComplexChoice(choiceLabel)}
                              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                                isChecked
                                  ? "bg-blue-50/90 border-2 border-blue-600 text-slate-900 font-semibold shadow-xs"
                                  : "bg-white border-slate-200/90 text-slate-700 hover:border-blue-300 hover:bg-blue-50/30 shadow-2xs"
                              }`}
                            >
                              <span
                                className={`w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                                  isChecked
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {choiceLabel}
                              </span>
                              <MathRenderer
                                content={op.teks}
                                className="text-sm flex-1 leading-relaxed"
                              />
                              {isChecked && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                  {currentQuestionType === "MENJODOHKAN" && menjodohkanPremis.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <p className="text-xs text-blue-600 font-semibold flex items-center gap-1.5">
                        <ArrowRight className="h-3.5 w-3.5" />
                        Pasangkan setiap butir di kolom kiri dengan jawaban yang sesuai di kolom
                        kanan.
                      </p>
                      <div className="space-y-3">
                        {menjodohkanPremis.map((item) => {
                          const currentMatches =
                            answers[activeQuestion.nomor_urut]?.jawaban_menjodohkan || {};
                          const selectedVal = currentMatches[item.id] || "";
                          return (
                            <div
                              key={item.id}
                              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                selectedVal
                                  ? "bg-blue-50/50 border-blue-300 shadow-xs"
                                  : "bg-white border-slate-200/90 shadow-2xs"
                              }`}
                            >
                              <div className="flex items-start sm:items-center gap-3 flex-1">
                                <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                  {item.id}
                                </span>
                                <MathRenderer
                                  content={item.teks}
                                  className="text-sm text-slate-800 font-medium leading-relaxed"
                                />
                              </div>

                              <div className="flex items-center gap-2 sm:w-72 shrink-0">
                                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
                                <select
                                  value={selectedVal}
                                  onChange={(e) => handleMatchingChange(item.id, e.target.value)}
                                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition text-slate-800"
                                >
                                  <option value="">-- Pilih Pasangan --</option>
                                  {menjodohkanTargetChoices.map((tc, tcIdx) => (
                                    <option key={tcIdx} value={tc}>
                                      {tc}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {currentQuestionType === "ISIAN_SINGKAT" && (
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Tuliskan Jawaban Singkat Anda:
                      </label>
                      <input
                        type="text"
                        value={answers[activeQuestion.nomor_urut]?.jawaban_teks || ""}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder="Ketik jawaban Anda di sini..."
                        className="w-full text-sm px-4 py-3 rounded-2xl border border-slate-200/90 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      />
                    </div>
                  )}

                  {(currentQuestionType === "URAIAN_ESAI" || currentQuestionType === "ESAI") && (
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Tuliskan Penjelasan / Uraian Lengkap Anda:
                      </label>
                      <textarea
                        rows={6}
                        value={answers[activeQuestion.nomor_urut]?.jawaban_teks || ""}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder="Tuliskan argumen atau uraian jawaban secara runut..."
                        className="w-full text-sm px-4 py-3 rounded-2xl border border-slate-200/90 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 leading-relaxed transition"
                      />
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* Question Footer Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </button>

            {currentIndex < manifest.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(manifest.length - 1, prev + 1))}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shadow-xs"
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
              >
                Selesaikan Ujian
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right 1 Column: Question Navigator Grid */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Navigasi Soal
            </h3>
            <span className="text-[11px] font-bold text-blue-600">
              {answeredCount}/{manifest.length} Terjawab
            </span>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Dijawab</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Ragu-ragu</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span>Belum</span>
            </div>
          </div>

          {/* Grid Numbers */}
          <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
            {manifest.map((item, idx) => {
              const ans = answers[item.nomor_urut];
              const isAnswered =
                ans?.jawaban_pilihan !== undefined ||
                (ans?.jawaban_teks && ans.jawaban_teks.trim() !== "") ||
                (ans?.jawaban_kompleks && ans.jawaban_kompleks.length > 0) ||
                (ans?.jawaban_menjodohkan && Object.keys(ans.jawaban_menjodohkan).length > 0);
              const isRagu = Boolean(ans?.ragu_ragu);
              const isActive = idx === currentIndex;

              return (
                <button
                  key={item.nomor_urut}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-10 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center relative ${
                    isActive ? "ring-2 ring-blue-600 ring-offset-2 scale-105 z-10" : ""
                  } ${
                    isRagu
                      ? "bg-amber-400 text-slate-900 shadow-2xs"
                      : isAnswered
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item.nomor_urut}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-xs"
          >
            Selesaikan Ujian Sekarang
          </button>
        </div>
      </main>

      {/* STRIKE / ANTI-CHEAT WARNING MODAL */}
      {isStrikeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 text-center space-y-4 shadow-2xl border-2 border-rose-500">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center animate-bounce">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              {isLocked ? "SESI UJIAN TERKUNCI!" : "PERINGATAN INTEGRITAS UJIAN"}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">{strikeMessage}</p>

            {isLocked ? (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                Status: TERKUNCI_PELANGGARAN. Silakan minta izin pengawas untuk membuka kembali sesi
                ujian Anda.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsStrikeModalOpen(false);
                  toggleFullscreen();
                }}
                className="w-full py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-xs hover:bg-rose-700 transition"
              >
                Saya Mengerti & Kembali ke Layar Penuh
              </button>
            )}
          </div>
        </div>
      )}

      {/* SUBMIT CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kumpulkan Lembar Ujian?</h3>
                <p className="text-xs text-slate-500">Pastikan seluruh butir soal telah dijawab.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Soal:</span>
                <span className="font-bold text-slate-800">{manifest.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sudah Dijawab:</span>
                <span className="font-bold text-emerald-600">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Belum Dijawab:</span>
                <span className="font-bold text-rose-600">{manifest.length - answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ditandai Ragu-ragu:</span>
                <span className="font-bold text-amber-600">{raguCount}</span>
              </div>
            </div>

            {manifest.length - answeredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Masih terdapat {manifest.length - answeredCount} butir soal yang belum Anda jawab.
                  Soal yang tidak terjawab akan dihitung 0 poin.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Periksa Kembali
              </button>
              <button
                type="button"
                onClick={handleSubmitAttempt}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Menilai...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Ya, Kumpulkan Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-3 shadow-2xl border border-slate-200 overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition z-10"
              title="Tutup Preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewImage}
              alt="Stimulus Soal Resolusi Penuh"
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-2xl"
            />
            <div className="p-3 text-center text-xs text-slate-500 font-medium">
              Resolusi Penuh • Klik di luar atau tombol silang untuk menutup
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
