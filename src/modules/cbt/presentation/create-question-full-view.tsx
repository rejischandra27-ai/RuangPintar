"use client";

/**
 * Ruang Pintar — CBT Full Page Question Editor ("Buat Soal untuk Saya")
 * Professional Academic Glass UI with Multi-Format Rich Stimulus:
 * - Stimulus Gambar: Upload file lokal, Drag & Drop, Paste Clipboard (Ctrl+V), dan Ukuran Gambar Dinamis
 * - Stimulus Audio Listening: Upload file audio lokal, Play Limit Controller, dan Preview Player
 * - Formula KaTeX Matematika/Sains inline ($...$) & block ($$...$$)
 * - Teks Arab RTL
 * - Multi-Tipe Soal (Pilihan Ganda, PG Kompleks, Benar/Salah, Menjodohkan Terpisah + Pengecoh, Isian Singkat, Esai)
 * - High-Contrast Dark Mode & Academic Glass Aesthetics
 */

import React, { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Image as ImageIcon,
  Headphones,
  Eye,
  EyeOff,
  Upload,
  Link as LinkIcon,
  Maximize2,
  FileAudio,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { JenisSoalCbt, TingkatKesulitanCbt, OpsiJawaban } from "../domain/cbt-types";
import { createQuestionAction } from "@/app/actions/cbt-actions";
import { MathFormulaToolbar } from "@/shared/components/cbt/math-formula-toolbar";
import { MathRenderer } from "@/shared/components/cbt/math-renderer";
import { ImageStimulus } from "@/shared/components/cbt/image-stimulus";
import { AudioStimulusPlayer } from "@/shared/components/cbt/audio-stimulus-player";

export interface CreateQuestionFullViewProps {
  sekolahId: string;
  mapelList: Array<{ id: string; nama: string; kode: string }>;
  initialMapelId?: string;
}

export type ImageSizeMode = "SM" | "MD" | "LG" | "FULL";

export function CreateQuestionFullView({
  sekolahId,
  mapelList,
  initialMapelId,
}: CreateQuestionFullViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [selectedMapelId, setSelectedMapelId] = useState<string>(
    initialMapelId || (mapelList.length > 0 ? mapelList[0].id : "")
  );
  const [kode, setKode] = useState("");
  const [jenisSoal, setJenisSoal] = useState<JenisSoalCbt>("PILIHAN_GANDA");
  const [tingkatKesulitan, setTingkatKesulitan] = useState<TingkatKesulitanCbt>("SEDANG");
  const [bobotDefault, setBobotDefault] = useState(1);
  const [kontenPertanyaan, setKontenPertanyaan] = useState("");
  const [pembahasan, setPembahasan] = useState("");

  // Stimulus Gambar State
  const [gambarUrl, setGambarUrl] = useState("");
  const [gambarSize, setGambarSize] = useState<ImageSizeMode>("MD");
  const [isInputtingImageUrl, setIsInputtingImageUrl] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Stimulus Audio State
  const [audioUrl, setAudioUrl] = useState("");
  const [audioPlayLimit, setAudioPlayLimit] = useState(2);
  const [isInputtingAudioUrl, setIsInputtingAudioUrl] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Options State: Pilihan Ganda & Benar/Salah
  const [opsiList, setOpsiList] = useState<
    Array<{ label: string; teks: string; isCorrect: boolean }>
  >([
    { label: "A", teks: "", isCorrect: true },
    { label: "B", teks: "", isCorrect: false },
    { label: "C", teks: "", isCorrect: false },
    { label: "D", teks: "", isCorrect: false },
  ]);

  // Options State: Menjodohkan (Premis Kiri, Pilihan Jawaban Kanan dengan Pengecoh, dan Kunci Pasangan)
  const [menjodohkanPremis, setMenjodohkanPremis] = useState<Array<{ id: number; teks: string }>>([
    { id: 1, teks: "" },
    { id: 2, teks: "" },
    { id: 3, teks: "" },
  ]);
  const [menjodohkanPilihan, setMenjodohkanPilihan] = useState<
    Array<{ label: string; teks: string }>
  >([
    { label: "A", teks: "" },
    { label: "B", teks: "" },
    { label: "C", teks: "" },
    { label: "D", teks: "" },
    { label: "E", teks: "" },
  ]);
  // Mapping Premis ID -> Pilihan Label (misal { 1: "C", 2: "A", 3: "E" })
  const [kunciPasanganMap, setKunciPasanganMap] = useState<Record<number, string>>({
    1: "A",
    2: "B",
    3: "C",
  });

  const [kunciSingkat, setKunciSingkat] = useState("");
  const [rubrikEsai, setRubrikEsai] = useState("");

  // Rich Stimulus State
  const [isArabicActive, setIsArabicActive] = useState(false);
  const [showRichPreview, setShowRichPreview] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Clipboard Paste Handler for Image Stimulus
  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const result = uploadEvent.target?.result as string;
            if (result) {
              setGambarUrl(result);
              showToast(
                "Gambar dari clipboard berhasil ditempelkan sebagai stimulus soal!",
                "success"
              );
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }
  };

  // Local File Upload Handler for Image
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Format berkas harus berupa gambar (PNG, JPG, WEBP, GIF).", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("Ukuran gambar maksimal 10MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        setGambarUrl(result);
        showToast(`Gambar "${file.name}" berhasil diunggah!`, "success");
      }
    };
    reader.readAsDataURL(file);
  };

  // Local File Upload Handler for Audio
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      showToast("Format berkas harus berupa audio (MP3, WAV, AAC, M4A, OGG).", "error");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast("Ukuran audio maksimal 25MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        setAudioUrl(result);
        showToast(`Audio "${file.name}" berhasil diunggah!`, "success");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInsertFormula = (latexFormula: string) => {
    if (!textareaRef.current) {
      setKontenPertanyaan((prev) => prev + (prev.endsWith(" ") ? "" : " ") + latexFormula);
      return;
    }
    const target = textareaRef.current;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const current = kontenPertanyaan;
    const updated = current.substring(0, start) + latexFormula + current.substring(end);
    setKontenPertanyaan(updated);

    setTimeout(() => {
      target.focus();
      target.setSelectionRange(start + latexFormula.length, start + latexFormula.length);
    }, 50);
  };

  // Option handlers for Multiple Choice
  const handleAddOption = () => {
    const nextLabel = String.fromCharCode(65 + opsiList.length);
    setOpsiList([...opsiList, { label: nextLabel, teks: "", isCorrect: false }]);
  };

  const handleRemoveOption = (index: number) => {
    if (opsiList.length <= 2) {
      showToast("Minimal harus memiliki 2 pilihan jawaban.", "error");
      return;
    }
    const filtered = opsiList.filter((_, idx) => idx !== index);
    const reindexed = filtered.map((op, i) => ({
      ...op,
      label: String.fromCharCode(65 + i),
    }));
    setOpsiList(reindexed);
  };

  // Menjodohkan Handlers
  const handleAddPremis = () => {
    const nextId = menjodohkanPremis.length + 1;
    setMenjodohkanPremis([...menjodohkanPremis, { id: nextId, teks: "" }]);
    // Default assignment to first available choice
    if (menjodohkanPilihan.length > 0) {
      setKunciPasanganMap((prev) => ({ ...prev, [nextId]: menjodohkanPilihan[0].label }));
    }
  };

  const handleRemovePremis = (idToRemove: number) => {
    if (menjodohkanPremis.length <= 1) {
      showToast("Minimal harus memiliki 1 butir premis.", "error");
      return;
    }
    const filtered = menjodohkanPremis.filter((p) => p.id !== idToRemove);
    const reindexed = filtered.map((p, i) => ({ ...p, id: i + 1 }));
    setMenjodohkanPremis(reindexed);

    // Update keys
    const newMap: Record<number, string> = {};
    reindexed.forEach((p) => {
      newMap[p.id] = kunciPasanganMap[p.id] || "A";
    });
    setKunciPasanganMap(newMap);
  };

  const handleAddTargetChoice = () => {
    const nextLabel = String.fromCharCode(65 + menjodohkanPilihan.length);
    setMenjodohkanPilihan([...menjodohkanPilihan, { label: nextLabel, teks: "" }]);
  };

  const handleRemoveTargetChoice = (index: number) => {
    if (menjodohkanPilihan.length <= 2) {
      showToast("Minimal harus memiliki 2 pilihan jawaban / pengecoh.", "error");
      return;
    }
    const filtered = menjodohkanPilihan.filter((_, idx) => idx !== index);
    const reindexed = filtered.map((op, i) => ({
      ...op,
      label: String.fromCharCode(65 + i),
    }));
    setMenjodohkanPilihan(reindexed);
  };

  const handleSave = (shouldContinue = false) => {
    if (!selectedMapelId) {
      showToast("Silakan pilih mata pelajaran terlebih dahulu.", "error");
      return;
    }
    if (!kontenPertanyaan.trim()) {
      showToast("Teks pertanyaan soal wajib diisi.", "error");
      return;
    }

    startTransition(async () => {
      let formatOpsi: any = undefined;
      let kunciJawaban: any = {};

      if (jenisSoal === "PILIHAN_GANDA" || jenisSoal === "BENAR_SALAH") {
        formatOpsi = opsiList.map((op) => ({
          label: op.label,
          teks: op.teks,
          urutan: op.label.charCodeAt(0) - 64,
        }));
        const correct = opsiList.find((op) => op.isCorrect);
        kunciJawaban = { pilihan_benar: correct?.label || "A" };
      } else if (jenisSoal === "PILIHAN_GANDA_KOMPLEKS") {
        formatOpsi = opsiList.map((op) => ({
          label: op.label,
          teks: op.teks,
          urutan: op.label.charCodeAt(0) - 64,
        }));
        kunciJawaban = {
          pilihan_benar: opsiList.filter((op) => op.isCorrect).map((op) => op.label),
        };
      } else if (jenisSoal === "MENJODOHKAN") {
        // Construct rich matching pair structure with distractor support
        const pairMap: Record<string, string> = {};
        const legacyPairs: Array<{ id: string; premis: string; pasangan: string }> = [];

        menjodohkanPremis.forEach((p) => {
          const selectedChoiceLabel = kunciPasanganMap[p.id] || "A";
          const choiceObj = menjodohkanPilihan.find((c) => c.label === selectedChoiceLabel);
          const choiceText = choiceObj
            ? `${choiceObj.label}. ${choiceObj.teks}`
            : selectedChoiceLabel;

          pairMap[String(p.id)] = choiceText;
          legacyPairs.push({
            id: String(p.id),
            premis: p.teks,
            pasangan: choiceText,
          });
        });

        // Opsi format for cbt-player-view (reads rawOpsi.premis and rawOpsi.pilihan_target)
        formatOpsi = {
          premis: menjodohkanPremis.map((p) => ({ id: String(p.id), teks: p.teks })),
          pilihan_target: menjodohkanPilihan.map((c) => `${c.label}. ${c.teks}`),
        };

        kunciJawaban = {
          pasangan: pairMap,
          kunci_pasangan: kunciPasanganMap, // e.g. { "1": "C", "2": "J", "3": "A" }
          premis: menjodohkanPremis,
          pilihan: menjodohkanPilihan,
          daftar_pasangan: legacyPairs,
        };
      } else if (jenisSoal === "ISIAN_SINGKAT") {
        kunciJawaban = {
          kata_kunci: kunciSingkat
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          case_sensitive: false,
        };
      } else if (jenisSoal === "URAIAN_ESAI") {
        kunciJawaban = {
          rubrik_penilaian: rubrikEsai || "Penilaian manual oleh guru pengampu.",
          pedoman_penskoran: "Skor 0-100",
        };
      }

      let finalPertanyaan = kontenPertanyaan.trim();
      if (audioUrl.trim()) {
        finalPertanyaan = `${finalPertanyaan}\n\n[audio:${audioUrl.trim()}|limit:${audioPlayLimit || 2}]`;
      }

      // Encode image size into URL metadata if applicable
      let finalGambarUrl = gambarUrl.trim() || undefined;
      if (finalGambarUrl && gambarSize !== "MD") {
        finalGambarUrl = `${finalGambarUrl}#size=${gambarSize}`;
      }

      const payload = {
        mata_pelajaran_id: selectedMapelId,
        kode: kode.trim() || undefined,
        jenis_soal: jenisSoal,
        tingkat_kesulitan: tingkatKesulitan,
        bobot_default: Number(bobotDefault) || 1,
        pertanyaan: finalPertanyaan,
        gambar_url: finalGambarUrl,
        pembahasan: pembahasan.trim() || undefined,
        opsi: formatOpsi,
        kunci_jawaban: kunciJawaban,
      };

      const res = await createQuestionAction(payload);
      if (res.success) {
        showToast("Butir soal berhasil disimpan ke Bank Soal!", "success");
        if (shouldContinue) {
          setKontenPertanyaan("");
          setKode("");
          setGambarUrl("");
          setAudioUrl("");
          setPembahasan("");
          setOpsiList([
            { label: "A", teks: "", isCorrect: true },
            { label: "B", teks: "", isCorrect: false },
            { label: "C", teks: "", isCorrect: false },
            { label: "D", teks: "", isCorrect: false },
          ]);
          setMenjodohkanPremis([
            { id: 1, teks: "" },
            { id: 2, teks: "" },
            { id: 3, teks: "" },
          ]);
          setMenjodohkanPilihan([
            { label: "A", teks: "" },
            { label: "B", teks: "" },
            { label: "C", teks: "" },
            { label: "D", teks: "" },
            { label: "E", teks: "" },
          ]);
          setKunciPasanganMap({ 1: "A", 2: "B", 3: "C" });
        } else {
          setTimeout(() => {
            router.push("/cbt-ujian");
            router.refresh();
          }, 600);
        }
      } else {
        showToast(res.message || "Gagal menyimpan butir soal.", "error");
      }
    });
  };

  return (
    <div className="space-y-6 pb-20 font-lato max-w-5xl mx-auto">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-lg transition-all animate-in fade-in-0 duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : toastMessage.type === "error"
                ? "bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                : "bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. HEADER CARD WITH PROFESSIONAL BUTTONS
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs dark:shadow-xl dark:shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Link
              href="/cbt-ujian"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              CBT Ujian Online
            </Link>
            <span>/</span>
            <span>Bank Soal</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">
              Buat Soal untuk Saya
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <span>Buat Soal untuk Saya</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Penyusunan butir soal evaluasi digital dengan stimulus multi-format (Formula KaTeX, Arab
            RTL, Gambar, dan Audio Listening)
          </p>
        </div>

        {/* Action Buttons Cluster */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/cbt-ujian"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali</span>
          </Link>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 text-xs font-extrabold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Simpan & Buat Lagi</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isPending ? "Menyimpan..." : "Simpan Butir Soal"}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN FORM BODY (ACADEMIC GLASS CONTAINER)
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs dark:shadow-xl dark:shadow-black/20 space-y-6">
        {/* Row 1: Kategori / Mapel & Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Kategori / Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedMapelId}
              onChange={(e) => setSelectedMapelId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition shadow-2xs cursor-pointer"
            >
              {mapelList.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  className="dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {m.nama} ({m.kode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Tipe Soal <span className="text-rose-500">*</span>
            </label>
            <select
              value={jenisSoal}
              onChange={(e) => setJenisSoal(e.target.value as any)}
              className="w-full text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition shadow-2xs cursor-pointer"
            >
              <option value="PILIHAN_GANDA" className="dark:bg-slate-900">
                Pilihan Ganda (Satu Jawaban Benar)
              </option>
              <option value="PILIHAN_GANDA_KOMPLEKS" className="dark:bg-slate-900">
                Pilihan Ganda Kompleks (Multi-Jawaban)
              </option>
              <option value="BENAR_SALAH" className="dark:bg-slate-900">
                Benar / Salah
              </option>
              <option value="MENJODOHKAN" className="dark:bg-slate-900">
                Menjodohkan (Matching Pairs)
              </option>
              <option value="ISIAN_SINGKAT" className="dark:bg-slate-900">
                Isian Singkat (Kata Kunci)
              </option>
              <option value="URAIAN_ESAI" className="dark:bg-slate-900">
                Uraian / Esai (Penilaian Rubrik)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Tingkat Kesulitan <span className="text-rose-500">*</span>
            </label>
            <select
              value={tingkatKesulitan}
              onChange={(e) => setTingkatKesulitan(e.target.value as any)}
              className="w-full text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition shadow-2xs cursor-pointer"
            >
              <option value="MUDAH" className="dark:bg-slate-900">
                Mudah (C1-C2)
              </option>
              <option value="SEDANG" className="dark:bg-slate-900">
                Sedang (C3-C4)
              </option>
              <option value="SULIT" className="dark:bg-slate-900">
                Sulit (C5)
              </option>
              <option value="HOTS" className="dark:bg-slate-900">
                Tinggi / HOTS (C6)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Kode / Tag Soal (Opsional)
            </label>
            <input
              type="text"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              placeholder="Misal: MAT-IX-001"
              className="w-full text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition shadow-2xs font-mono"
            />
          </div>
        </div>

        {/* Row 2: Teks Soal & Rich Toolbar */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Teks Soal / Pertanyaan <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800">
                Bisa Paste (Ctrl+V) Gambar Langsung
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsArabicActive(!isArabicActive)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isArabicActive
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-2xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {isArabicActive ? "RTL Arab Aktif (يمين)" : "Teks Arab (RTL)"}
              </button>
              <button
                type="button"
                onClick={() => setShowRichPreview(!showRichPreview)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all cursor-pointer"
              >
                {showRichPreview ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                <span>{showRichPreview ? "Tutup Preview" : "Preview Formula"}</span>
              </button>
            </div>
          </div>

          {/* KaTeX Math Toolbar */}
          <MathFormulaToolbar onInsertLatex={handleInsertFormula} />

          {/* Textarea dengan High-Contrast Dark Mode & Paste Event Capture */}
          <textarea
            ref={textareaRef}
            rows={5}
            dir={isArabicActive ? "rtl" : "ltr"}
            value={kontenPertanyaan}
            onChange={(e) => setKontenPertanyaan(e.target.value)}
            onPaste={handleTextareaPaste}
            placeholder={
              isArabicActive
                ? "اكتب نص السؤال هنا..."
                : "Tuliskan narasi pertanyaan atau stimulus soal di sini. Anda juga bisa menempelkan (Ctrl+V) screenshot gambar langsung ke sini, atau gunakan $formula$ untuk rumus matematika KaTeX."
            }
            className={`w-full text-sm px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 dark:focus:border-blue-500 shadow-2xs transition-colors ${
              isArabicActive ? "font-serif text-base leading-relaxed text-right" : ""
            }`}
          />

          {/* Live Preview rendered */}
          {showRichPreview && kontenPertanyaan && (
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 space-y-2">
              <span className="text-[11px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                Live Preview Tampilan Soal di Layar Siswa:
              </span>
              <MathRenderer
                content={kontenPertanyaan}
                className={
                  isArabicActive
                    ? "text-right font-serif text-lg leading-loose"
                    : "text-slate-900 dark:text-white"
                }
              />
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. MEDIA STIMULUS (UPLOAD FILE GAMBAR & AUDIO LISTENING)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* A. GAMBAR STIMULUS DENGAN UPLOAD & UKURAN DINAMIS */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Gambar Stimulus / Diagram</span>
              </div>
              <button
                type="button"
                onClick={() => setIsInputtingImageUrl(!isInputtingImageUrl)}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                <LinkIcon className="h-3 w-3" />
                <span>{isInputtingImageUrl ? "Upload Berkas" : "Gunakan URL Web"}</span>
              </button>
            </div>

            {/* Hidden Native File Input */}
            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />

            {/* Input URL atau Upload Button */}
            {isInputtingImageUrl ? (
              <input
                type="text"
                value={gambarUrl}
                onChange={(e) => setGambarUrl(e.target.value)}
                placeholder="https://example.com/gambar-soal.png"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Pilih Gambar dari Komputer</span>
                </button>
                <span className="text-[10px] text-slate-400">PNG, JPG, WEBP maks 10MB</span>
              </div>
            )}

            {/* Preview Gambar & Dynamic Size Controls */}
            {gambarUrl.trim() && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  {/* Pilihan Ukuran Gambar Dinamis */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Ukuran:</span>
                    {(["SM", "MD", "LG", "FULL"] as ImageSizeMode[]).map((sz) => (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => setGambarSize(sz)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                          gambarSize === sz
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                        }`}
                      >
                        {sz === "SM" ? "25%" : sz === "MD" ? "50%" : sz === "LG" ? "75%" : "100%"}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setGambarUrl("")}
                    className="text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                  >
                    Hapus Gambar
                  </button>
                </div>

                <div
                  className={`overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 mx-auto ${
                    gambarSize === "SM"
                      ? "max-w-[180px]"
                      : gambarSize === "MD"
                        ? "max-w-[340px]"
                        : gambarSize === "LG"
                          ? "max-w-[500px]"
                          : "w-full"
                  }`}
                >
                  <img
                    src={gambarUrl.trim().split("#")[0]}
                    alt="Preview Stimulus"
                    className="w-full h-auto object-contain max-h-64"
                  />
                </div>
              </div>
            )}
          </div>

          {/* B. AUDIO LISTENING DENGAN UPLOAD BERKAS */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Headphones className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Audio Listening / Bahasa</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-bold">Maks Putar:</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={audioPlayLimit}
                    onChange={(e) => setAudioPlayLimit(Number(e.target.value) || 2)}
                    className="w-10 text-center text-xs px-1 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsInputtingAudioUrl(!isInputtingAudioUrl)}
                  className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <LinkIcon className="h-3 w-3" />
                  <span>{isInputtingAudioUrl ? "Upload Berkas" : "Gunakan URL"}</span>
                </button>
              </div>
            </div>

            {/* Hidden Native File Input Audio */}
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioFileChange}
              className="hidden"
            />

            {isInputtingAudioUrl ? (
              <input
                type="text"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://example.com/listening-sample.mp3"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30"
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => audioFileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Unggah Rekaman Audio MP3</span>
                </button>
                <span className="text-[10px] text-slate-400">MP3, WAV maks 25MB</span>
              </div>
            )}

            {audioUrl.trim() && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <AudioStimulusPlayer src={audioUrl.trim()} maxPlayCount={audioPlayLimit} />
                </div>
                <button
                  type="button"
                  onClick={() => setAudioUrl("")}
                  className="text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer shrink-0"
                >
                  Hapus Audio
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. PILIHAN JAWABAN & KUNCI SESUAI JENIS SOAL
        ───────────────────────────────────────────────────────────── */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Konfigurasi Kunci & Pilihan Jawaban <span className="text-rose-500">*</span>
            </label>
            {(jenisSoal === "PILIHAN_GANDA" || jenisSoal === "PILIHAN_GANDA_KOMPLEKS") && (
              <button
                type="button"
                onClick={handleAddOption}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Opsi ({String.fromCharCode(65 + opsiList.length)})</span>
              </button>
            )}
          </div>

          {/* 1. PILIHAN GANDA & PG KOMPLEKS */}
          {(jenisSoal === "PILIHAN_GANDA" || jenisSoal === "PILIHAN_GANDA_KOMPLEKS") && (
            <div className="space-y-3">
              {opsiList.map((op, idx) => (
                <div key={op.label} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (jenisSoal === "PILIHAN_GANDA") {
                        setOpsiList(
                          opsiList.map((item, i) => ({
                            ...item,
                            isCorrect: i === idx,
                          }))
                        );
                      } else {
                        const updated = [...opsiList];
                        updated[idx].isCorrect = !updated[idx].isCorrect;
                        setOpsiList(updated);
                      }
                    }}
                    title={
                      op.isCorrect
                        ? "Kunci jawaban benar (klik untuk batalkan)"
                        : "Klik untuk jadikan kunci jawaban benar"
                    }
                    className={`size-9 rounded-2xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      op.isCorrect
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {op.label}
                  </button>
                  <input
                    type="text"
                    value={op.teks}
                    onChange={(e) => {
                      const updated = [...opsiList];
                      updated[idx].teks = e.target.value;
                      setOpsiList(updated);
                    }}
                    placeholder={`Teks pilihan jawaban ${op.label}...`}
                    className="flex-1 text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition"
                  />
                  {op.isCorrect && (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-2.5 py-1 rounded-xl shrink-0 border border-emerald-300 dark:border-emerald-800">
                      Kunci Benar
                    </span>
                  )}
                  {opsiList.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 2. BENAR / SALAH */}
          {jenisSoal === "BENAR_SALAH" && (
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                type="button"
                onClick={() =>
                  setOpsiList([
                    { label: "A", teks: "Benar", isCorrect: true },
                    { label: "B", teks: "Salah", isCorrect: false },
                  ])
                }
                className={`p-4 rounded-2xl border text-center font-bold text-sm transition-all cursor-pointer ${
                  opsiList[0]?.isCorrect
                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-500/20"
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                }`}
              >
                Kunci: BENAR
              </button>
              <button
                type="button"
                onClick={() =>
                  setOpsiList([
                    { label: "A", teks: "Benar", isCorrect: false },
                    { label: "B", teks: "Salah", isCorrect: true },
                  ])
                }
                className={`p-4 rounded-2xl border text-center font-bold text-sm transition-all cursor-pointer ${
                  opsiList[1]?.isCorrect
                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-500/20"
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                }`}
              >
                Kunci: SALAH
              </button>
            </div>
          )}

          {/* 3. MENJODOHKAN (DUAL COLUMN + PENGECOH + KUNCI JAWABAN MAPPING) */}
          {jenisSoal === "MENJODOHKAN" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Kolom Kiri: Butir Pernyataan / Premis */}
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Kolom Kiri: Butir Premis / Soal
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {menjodohkanPremis.length} Butir Pernyataan
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPremis}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 transition cursor-pointer"
                    >
                      <Plus className="size-3" />
                      <span>Tambah Premis</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {menjodohkanPremis.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="size-7 rounded-xl bg-blue-600 text-white font-mono text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                          {p.id}
                        </span>
                        <input
                          type="text"
                          value={p.teks}
                          onChange={(e) => {
                            const updated = menjodohkanPremis.map((item) =>
                              item.id === p.id ? { ...item, teks: e.target.value } : item
                            );
                            setMenjodohkanPremis(updated);
                          }}
                          placeholder={`Pernyataan butir ${p.id}...`}
                          className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                        />
                        {menjodohkanPremis.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePremis(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kolom Kanan: Pilihan Jawaban Target (Bisa lebih banyak sebagai Pengecoh) */}
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Kolom Kanan: Opsi Jawaban (Termasuk Pengecoh)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {menjodohkanPilihan.length} Pilihan Jawaban Acak
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTargetChoice}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      <Plus className="size-3" />
                      <span>Tambah Opsi / Pengecoh</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {menjodohkanPilihan.map((c, cIdx) => (
                      <div key={c.label} className="flex items-center gap-2">
                        <span className="size-7 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs font-black flex items-center justify-center shrink-0">
                          {c.label}
                        </span>
                        <input
                          type="text"
                          value={c.teks}
                          onChange={(e) => {
                            const updated = [...menjodohkanPilihan];
                            updated[cIdx].teks = e.target.value;
                            setMenjodohkanPilihan(updated);
                          }}
                          placeholder={`Teks respon / pilihan ${c.label}...`}
                          className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                        />
                        {menjodohkanPilihan.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTargetChoice(cIdx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Kunci Pasangan Benar (Answer Key Mapping: 1 = C, 2 = J, 3 = A ...) */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Check className="size-4 text-blue-600 dark:text-blue-400" />
                    <span>Penentuan Kunci Jawaban Pasangan yang Benar:</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {menjodohkanPremis.length} Premis Terpetakan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {menjodohkanPremis.map((p) => {
                    const currentChoice = kunciPasanganMap[p.id] || "A";
                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="size-6 rounded-lg bg-blue-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                            {p.id}
                          </span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                            {p.teks ? p.teks : `Premis ${p.id}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs font-bold text-slate-400">➔</span>
                          <select
                            value={currentChoice}
                            onChange={(e) =>
                              setKunciPasanganMap({
                                ...kunciPasanganMap,
                                [p.id]: e.target.value,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 font-mono text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                          >
                            {menjodohkanPilihan.map((c) => (
                              <option key={c.label} value={c.label}>
                                {c.label} {c.teks ? `(${c.teks.slice(0, 15)}...)` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 4. ISIAN SINGKAT */}
          {jenisSoal === "ISIAN_SINGKAT" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Kata Kunci Jawaban Benar (Pisahkan dengan tanda koma jika ada alternatif ejaan):
              </label>
              <input
                type="text"
                value={kunciSingkat}
                onChange={(e) => setKunciSingkat(e.target.value)}
                placeholder="Misal: fotosintesis, fotosintesa, photosynthesis"
                className="w-full text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          )}

          {/* 5. URAIAN / ESAI */}
          {jenisSoal === "URAIAN_ESAI" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Rubrik Penilaian & Pedoman Skor Guru (Opsional):
              </label>
              <textarea
                rows={3}
                value={rubrikEsai}
                onChange={(e) => setRubrikEsai(e.target.value)}
                placeholder="Tuliskan kata kunci wajib, poin per argumen, atau kriteria penilaian guru..."
                className="w-full text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. POIN & PEMBAHASAN SOAL
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Poin / Bobot Skor Default <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={bobotDefault}
              onChange={(e) => setBobotDefault(Number(e.target.value) || 1)}
              className="w-full text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 shadow-2xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Pembahasan Soal (Opsional, Ditampilkan saat Evaluasi / Review)
            </label>
            <input
              type="text"
              value={pembahasan}
              onChange={(e) => setPembahasan(e.target.value)}
              placeholder="Penjelasan ringkas cara penyelesaian soal ini..."
              className="w-full text-xs px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 shadow-2xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
