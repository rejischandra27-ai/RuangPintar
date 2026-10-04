"use client";

/**
 * Ruang Pintar — M14 CBT Question Bank Modal (Academic Glass UI v1.2)
 *
 * Mengelola Butir Soal dan Versi Soal (Question Versioning):
 * - Multiple choice, multiple select, true/false, matching (menjodohkan), fill-in, essay
 * - Dukungan Soal Bergambar (Image URL / Diagram Preview)
 * - Import Massal via Spreadsheet (Excel / CSV / Quick Paste)
 * - Asisten AI Gemini Pembuat Soal Otomatis (Kurikulum Merdeka)
 * - Poin, KKTP, Kunci Penilaian (Tersimpan aman di Server)
 */

import React, { useState, useEffect, useTransition, useCallback, useRef } from "react";
import Link from "next/link";
import {
  X,
  Plus,
  HelpCircle,
  Check,
  CheckCircle2,
  Trash2,
  GitBranch,
  Layers,
  AlertCircle,
  FileText,
  Search,
  FileSpreadsheet,
  Bot,
  Download,
  Upload,
  Image as ImageIcon,
  ArrowRight,
  RefreshCw,
  Eye,
  Key,
  Copy,
  Headphones,
  EyeOff,
} from "lucide-react";
import {
  BankSoalDTO,
  JenisSoalCbt,
  TingkatKesulitanCbt,
  OpsiJawaban,
  PasanganMenjodohkan,
} from "../domain/cbt-types";
import {
  getQuestionsAction,
  createQuestionAction,
  createQuestionVersionAction,
  bulkCreateQuestionsAction,
  generateAiQuestionsAction,
  getCbtMapelListAction,
} from "@/app/actions/cbt-actions";
import {
  parseSpreadsheetText,
  generateCsvTemplate,
  generateComprehensiveCsvTemplate,
  ParsedBulkQuestion,
} from "../infrastructure/cbt-bulk-import-parser";
import { MathFormulaToolbar } from "@/shared/components/cbt/math-formula-toolbar";
import { MathRenderer } from "@/shared/components/cbt/math-renderer";
import { ImageStimulus } from "@/shared/components/cbt/image-stimulus";
import { AudioStimulusPlayer } from "@/shared/components/cbt/audio-stimulus-player";

interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapelId?: string;
  onShowToast: (message: string, type: "success" | "error" | "info") => void;
}

type TabType = "LIST" | "CREATE" | "EXCEL_IMPORT" | "AI_GENERATOR" | "NEW_VERSION";

export function QuestionBankModal({
  isOpen,
  onClose,
  mapelId,
  onShowToast,
}: QuestionBankModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("LIST");
  const [questions, setQuestions] = useState<BankSoalDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedQuestion, setSelectedQuestion] = useState<BankSoalDTO | null>(null);
  const [mapelList, setMapelList] = useState<Array<{ id: string; nama: string; kode: string }>>([]);
  const [selectedMapelId, setSelectedMapelId] = useState<string>(mapelId || "");

  // Form State for Creating / Editing Question
  const [kode, setKode] = useState("");
  const [jenisSoal, setJenisSoal] = useState<JenisSoalCbt>("PILIHAN_GANDA");
  const [tingkatKesulitan, setTingkatKesulitan] = useState<TingkatKesulitanCbt>("SEDANG");
  const [bobotDefault, setBobotDefault] = useState(1);
  const [kontenPertanyaan, setKontenPertanyaan] = useState("");
  const [gambarUrl, setGambarUrl] = useState("");
  const [opsiList, setOpsiList] = useState<
    Array<{ label: string; teks: string; isCorrect: boolean }>
  >([
    { label: "A", teks: "", isCorrect: true },
    { label: "B", teks: "", isCorrect: false },
    { label: "C", teks: "", isCorrect: false },
    { label: "D", teks: "", isCorrect: false },
  ]);
  const [pasanganList, setPasanganList] = useState<PasanganMenjodohkan[]>([
    { id: "1", premis: "", pasangan: "" },
    { id: "2", premis: "", pasangan: "" },
    { id: "3", premis: "", pasangan: "" },
  ]);
  const [kunciSingkat, setKunciSingkat] = useState("");
  const [rubrikEsai, setRubrikEsai] = useState("");
  const [alasanPerubahan, setAlasanPerubahan] = useState("");

  // Rich Multi-Format State (KaTeX, Arabic RTL, Audio, Stimulus Preview)
  const [isArabicActive, setIsArabicActive] = useState(false);
  const [showRichPreview, setShowRichPreview] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioPlayLimit, setAudioPlayLimit] = useState(2);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Bulk Import State
  const [rawSpreadsheetText, setRawSpreadsheetText] = useState("");
  const [bulkParsedList, setBulkParsedList] = useState<ParsedBulkQuestion[]>([]);
  const [guideQuestionType, setGuideQuestionType] = useState<
    "PG" | "PG_KOMPLEKS" | "BENAR_SALAH" | "MENJODOHKAN" | "ISIAN_SINGKAT" | "URAIAN_ESAI"
  >("PG");
  const [copiedRowKey, setCopiedRowKey] = useState<string | null>(null);

  // AI Generator State
  const [aiTopik, setAiTopik] = useState("");
  const [aiJumlah, setAiJumlah] = useState(5);
  const [aiKesulitan, setAiKesulitan] = useState<any>("SEDANG");
  const [aiJenis, setAiJenis] = useState<any>("PILIHAN_GANDA");
  const [aiApiKey, setAiApiKey] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("rp_gemini_api_key") || "" : ""
  );
  const [aiGeneratedList, setAiGeneratedList] = useState<any[]>([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  const handleInsertFormula = (latexFormula: string) => {
    if (!textareaRef.current) {
      setKontenPertanyaan((prev) => prev + (prev.endsWith(" ") ? "" : " ") + latexFormula);
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = el.value;
    const nextValue = current.substring(0, start) + latexFormula + current.substring(end);
    setKontenPertanyaan(nextValue);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + latexFormula.length, start + latexFormula.length);
    }, 0);
  };

  const handleClipboardPasteImage = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const blob = item.getAsFile();
        if (!blob) continue;
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          const base64Data = loadEvt.target?.result as string;
          if (base64Data) {
            setGambarUrl(base64Data);
            onShowToast("Gambar dari clipboard berhasil disematkan!", "success");
          }
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  };

  const resetForm = useCallback(() => {
    setKode("");
    setJenisSoal("PILIHAN_GANDA");
    setTingkatKesulitan("SEDANG");
    setBobotDefault(1);
    setKontenPertanyaan("");
    setGambarUrl("");
    setAudioUrl("");
    setAudioPlayLimit(2);
    setIsArabicActive(false);
    setShowRichPreview(false);
    setOpsiList([
      { label: "A", teks: "", isCorrect: true },
      { label: "B", teks: "", isCorrect: false },
      { label: "C", teks: "", isCorrect: false },
      { label: "D", teks: "", isCorrect: false },
    ]);
    setPasanganList([
      { id: "1", premis: "", pasangan: "" },
      { id: "2", premis: "", pasangan: "" },
      { id: "3", premis: "", pasangan: "" },
    ]);
    setKunciSingkat("");
    setRubrikEsai("");
    setAlasanPerubahan("");
    setSelectedQuestion(null);
  }, []);

  const loadQuestions = useCallback(
    async (overrideMapelId?: string) => {
      setIsLoading(true);
      const targetMapelId =
        overrideMapelId !== undefined ? overrideMapelId : selectedMapelId || mapelId;
      const res = await getQuestionsAction({ mapelId: targetMapelId || undefined });
      if (res.success && res.data) {
        setQuestions(res.data);
      } else {
        onShowToast(res.message || "Gagal memuat bank soal", "error");
      }
      setIsLoading(false);
    },
    [mapelId, selectedMapelId, onShowToast]
  );

  const handleClose = () => {
    resetForm();
    setActiveTab("LIST");
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const mapelRes = await getCbtMapelListAction();
        let targetMapel = selectedMapelId || mapelId;
        if (isMounted && mapelRes.success && mapelRes.data && mapelRes.data.length > 0) {
          setMapelList(mapelRes.data);
          if (!targetMapel) {
            targetMapel = mapelRes.data[0].id;
            setSelectedMapelId(targetMapel);
          }
        }

        if (isMounted) {
          setIsLoading(true);
        }
        const questionsRes = await getQuestionsAction({ mapelId: targetMapel || undefined });
        if (isMounted) {
          if (questionsRes.success && questionsRes.data) {
            setQuestions(questionsRes.data);
          } else {
            onShowToast(questionsRes.message || "Gagal memuat bank soal", "error");
          }
          setIsLoading(false);
        }
      } catch {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, mapelId, selectedMapelId, onShowToast]);

  const handleAddOption = () => {
    const nextLabel = String.fromCharCode(65 + opsiList.length);
    setOpsiList([...opsiList, { label: nextLabel, teks: "", isCorrect: false }]);
  };

  const handleRemoveOption = (index: number) => {
    if (opsiList.length <= 2) return;
    const updated = opsiList
      .filter((_, i) => i !== index)
      .map((op, i) => ({
        ...op,
        label: String.fromCharCode(65 + i),
      }));
    setOpsiList(updated);
  };

  const handleOptionCorrectChange = (index: number, isMulti: boolean) => {
    if (isMulti) {
      const updated = [...opsiList];
      updated[index].isCorrect = !updated[index].isCorrect;
      setOpsiList(updated);
    } else {
      const updated = opsiList.map((op, i) => ({
        ...op,
        isCorrect: i === index,
      }));
      setOpsiList(updated);
    }
  };

  // Menjodohkan handlers
  const handleAddPair = () => {
    const nextId = String(pasanganList.length + 1);
    setPasanganList([...pasanganList, { id: nextId, premis: "", pasangan: "" }]);
  };

  const handleRemovePair = (index: number) => {
    if (pasanganList.length <= 2) return;
    setPasanganList(pasanganList.filter((_, i) => i !== index));
  };

  const handleUpdatePair = (index: number, field: "premis" | "pasangan", val: string) => {
    const updated = [...pasanganList];
    updated[index][field] = val;
    setPasanganList(updated);
  };

  const handleCreateQuestion = () => {
    if (!kontenPertanyaan.trim()) {
      onShowToast("Teks pertanyaan tidak boleh kosong.", "error");
      return;
    }

    startTransition(async () => {
      let formatOpsi: OpsiJawaban[] | undefined = undefined;
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
        formatOpsi = pasanganList.map((p, idx) => ({
          label: p.id || String(idx + 1),
          teks: p.premis.trim(),
          pasangan: p.pasangan.trim(),
          urutan: idx + 1,
        }));
        const pairMap: Record<string, string> = {};
        pasanganList.forEach((p, idx) => {
          if (p.premis.trim()) {
            pairMap[p.id || String(idx + 1)] = p.pasangan.trim();
          }
        });
        kunciJawaban = { pasangan: pairMap, daftar_pasangan: pasanganList };
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
          rubrik_penilaian: rubrikEsai || "Penilaian manual oleh guru.",
          pedoman_penskoran: "Skor 0-100",
        };
      }

      let finalPertanyaan = kontenPertanyaan.trim();
      if (audioUrl.trim()) {
        finalPertanyaan = `${finalPertanyaan}\n\n[audio:${audioUrl.trim()}|limit:${audioPlayLimit || 2}]`;
      }

      const targetMapelId = selectedMapelId || mapelId;
      if (!targetMapelId) {
        onShowToast("Silakan pilih mata pelajaran terlebih dahulu.", "error");
        return;
      }

      const payload = {
        mata_pelajaran_id: targetMapelId,
        kode: kode || undefined,
        jenis_soal: jenisSoal,
        tingkat_kesulitan: tingkatKesulitan,
        bobot_default: Number(bobotDefault) || 1,
        pertanyaan: finalPertanyaan,
        gambar_url: gambarUrl.trim() || undefined,
        opsi: formatOpsi,
        kunci_jawaban: kunciJawaban,
      };

      const res = await createQuestionAction(payload);
      if (res.success) {
        onShowToast("Soal berhasil ditambahkan ke Bank Soal.", "success");
        await loadQuestions();
        setActiveTab("LIST");
        resetForm();
      } else {
        onShowToast(res.message, "error");
      }
    });
  };

  const handleCreateNewVersion = () => {
    if (!selectedQuestion) return;
    if (!kontenPertanyaan.trim()) {
      onShowToast("Teks pertanyaan tidak boleh kosong.", "error");
      return;
    }

    startTransition(async () => {
      let formatOpsi: OpsiJawaban[] | undefined = undefined;
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
        const pairMap: Record<string, string> = {};
        pasanganList.forEach((p) => {
          if (p.premis.trim()) {
            pairMap[p.id || p.premis] = p.pasangan.trim();
          }
        });
        kunciJawaban = { pasangan: pairMap, daftar_pasangan: pasanganList };
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
          rubrik_penilaian: rubrikEsai || "Penilaian manual oleh guru.",
          pedoman_penskoran: "Skor 0-100",
        };
      }

      let finalPertanyaan = kontenPertanyaan.trim();
      if (audioUrl.trim()) {
        finalPertanyaan = `${finalPertanyaan}\n\n[audio:${audioUrl.trim()}|limit:${audioPlayLimit || 2}]`;
      }

      const payload = {
        pertanyaan: finalPertanyaan,
        gambar_url: gambarUrl.trim() || undefined,
        opsi: formatOpsi,
        kunci_jawaban: kunciJawaban,
        bobot: Number(bobotDefault) || 1,
        alasan_perubahan: alasanPerubahan || "Pembaruan versi soal",
      };

      const res = await createQuestionVersionAction(selectedQuestion.id, payload);
      if (res.success) {
        onShowToast("Versi baru butir soal berhasil diterbitkan.", "success");
        await loadQuestions();
        setActiveTab("LIST");
        resetForm();
      } else {
        onShowToast(res.message, "error");
      }
    });
  };

  // Bulk Spreadsheet Parser
  const handleParseSpreadsheet = () => {
    if (!rawSpreadsheetText.trim()) {
      onShowToast("Tempelkan teks data spreadsheet atau pilih file CSV terlebih dahulu.", "error");
      return;
    }
    const parsed = parseSpreadsheetText(rawSpreadsheetText);
    if (parsed.length === 0) {
      onShowToast("Tidak dapat membaca data soal. Pastikan kolom sesuai template.", "error");
      return;
    }
    setBulkParsedList(parsed);
    onShowToast(`Berhasil membaca ${parsed.length} butir soal dari spreadsheet.`, "success");
  };

  const handleDownloadTemplate = (
    formatType: "excel_semicolon" | "standard_csv" | "tsv" = "excel_semicolon"
  ) => {
    let delimiter: ";" | "," | "\t" = ";";
    let filename = "template_bank_soal_cbt_excel.csv";
    let mime = "text/csv;charset=utf-8;";

    if (formatType === "standard_csv") {
      delimiter = ",";
      filename = "template_bank_soal_cbt_standard.csv";
    } else if (formatType === "tsv") {
      delimiter = "\t";
      filename = "template_bank_soal_cbt_paste.txt";
      mime = "text/plain;charset=utf-8;";
    }

    const csvContent = generateComprehensiveCsvTemplate(delimiter);
    // Prepend UTF-8 BOM (\uFEFF) so Microsoft Excel displays characters and splits columns properly!
    const blob = new Blob(["\uFEFF" + csvContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast(
      `Template (${filename}) berhasil diunduh. Siap dibuka di Microsoft Excel!`,
      "success"
    );
  };

  const handleCopySampleRow = (type: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRowKey(type);
    onShowToast("Contoh baris format disalin ke clipboard! Siap ditempel di Excel.", "success");
    setTimeout(() => setCopiedRowKey(null), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setRawSpreadsheetText(text);
        const parsed = parseSpreadsheetText(text);
        setBulkParsedList(parsed);
        onShowToast(`File ${file.name} berhasil dibaca (${parsed.length} butir soal).`, "success");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveBulkQuestions = () => {
    const validQuestions = bulkParsedList.filter((q) => q.isValid);
    if (validQuestions.length === 0) {
      onShowToast("Tidak ada butir soal yang valid untuk disimpan.", "error");
      return;
    }

    startTransition(async () => {
      const questionsToSave = validQuestions.map((q) => {
        let opsiPayload: any = undefined;
        let kunciPayload: any = {};

        if (q.tipe_soal === "PILIHAN_GANDA" || !q.tipe_soal) {
          opsiPayload = q.opsi.map((o, idx) => ({
            label: o.label,
            teks: o.teks,
            urutan: idx + 1,
          }));
          kunciPayload = { pilihan_benar: q.kunci_benar };
        } else if (q.tipe_soal === "PILIHAN_GANDA_KOMPLEKS") {
          opsiPayload = q.opsi.map((o, idx) => ({
            label: o.label,
            teks: o.teks,
            urutan: idx + 1,
          }));
          const correctLabels = q.opsi.filter((o) => o.isCorrect).map((o) => o.label);
          kunciPayload = {
            pilihan_benar:
              correctLabels.length > 0
                ? correctLabels
                : q.kunci_benar.split(/[^A-E]/).filter(Boolean),
          };
        } else if (q.tipe_soal === "BENAR_SALAH") {
          opsiPayload = q.opsi.map((o, idx) => ({
            label: o.label,
            teks: o.teks,
            urutan: idx + 1,
          }));
          kunciPayload = { pilihan_benar: q.kunci_benar.startsWith("B") ? "B" : "A" };
        } else if (q.tipe_soal === "MENJODOHKAN") {
          const pairs = q.pasangan_menjodohkan || [
            { id: "1", premis: q.pertanyaan, target: q.kunci_benar },
          ];
          opsiPayload = pairs.map((p, idx) => ({
            label: p.id || String(idx + 1),
            teks: p.premis,
            pasangan: p.target,
            urutan: idx + 1,
          }));
          const pairMap: Record<string, string> = {};
          pairs.forEach((p) => {
            pairMap[p.id || p.premis] = p.target;
          });
          kunciPayload = { pasangan: pairMap, daftar_pasangan: pairs };
        } else if (q.tipe_soal === "URAIAN_ESAI" || q.tipe_soal === "ESAI") {
          kunciPayload = {
            rubrik_penilaian: q.rubrik_esai || q.kunci_benar || "Penilaian manual oleh guru.",
            pedoman_penskoran: `Skor maksimal ${q.bobot || 4}`,
          };
        } else if (q.tipe_soal === "ISIAN_SINGKAT") {
          kunciPayload = {
            kata_kunci: q.kunci_benar
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean),
            case_sensitive: false,
          };
        }

        return {
          kode: `Q-IMP-${Date.now().toString(36).slice(-4)}-${q.nomor}`,
          pertanyaan: q.pertanyaan,
          gambar_url: q.gambar_url || null,
          jenis_soal: q.tipe_soal || "PILIHAN_GANDA",
          tingkat_kesulitan: q.tingkat_kesulitan,
          bobot: q.bobot,
          opsi: opsiPayload,
          kunci_jawaban: kunciPayload,
        };
      });

      const targetMapelId = selectedMapelId || mapelId;
      const res = await bulkCreateQuestionsAction(questionsToSave, targetMapelId);
      if (res.success) {
        onShowToast(res.message, "success");
        await loadQuestions();
        setBulkParsedList([]);
        setRawSpreadsheetText("");
        setActiveTab("LIST");
      } else {
        onShowToast(res.message, "error");
      }
    });
  };

  // AI Question Generator Handlers
  const handleGenerateAi = async () => {
    if (!aiTopik.trim()) {
      onShowToast("Tuliskan topik atau materi pokok untuk AI.", "error");
      return;
    }

    setIsAiGenerating(true);
    setAiMessage("");

    // Save apiKey to localStorage if user typed one
    if (aiApiKey.trim() && typeof window !== "undefined") {
      localStorage.setItem("rp_gemini_api_key", aiApiKey.trim());
    }

    try {
      const res = await generateAiQuestionsAction({
        topikMateri: aiTopik,
        jumlahSoal: aiJumlah,
        tingkatKesulitan: aiKesulitan,
        jenisSoal: aiJenis,
        apiKey: aiApiKey || undefined,
      });

      if (res.success && res.data) {
        setAiGeneratedList(res.data);
        setAiMessage(res.message);
        onShowToast(res.message, "success");
      } else {
        onShowToast(res.message || "Gagal menghasilkan soal dengan AI.", "error");
      }
    } catch {
      onShowToast("Kendala pada pemanggilan AI Asisten.", "error");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveAiQuestions = () => {
    if (aiGeneratedList.length === 0) return;

    startTransition(async () => {
      const questionsToSave = aiGeneratedList.map((q, idx) => ({
        kode: q.kode || `AI-${idx + 1}`,
        pertanyaan: q.pertanyaan,
        gambar_url: q.gambar_url || null,
        jenis_soal: q.jenis_soal || aiJenis,
        tingkat_kesulitan: q.tingkat_kesulitan || aiKesulitan,
        bobot: q.bobot || 1,
        opsi: q.opsi,
        kunci_jawaban: q.kunci_jawaban,
        pembahasan: q.pembahasan,
      }));

      const targetMapelId = selectedMapelId || mapelId;
      const res = await bulkCreateQuestionsAction(questionsToSave, targetMapelId);
      if (res.success) {
        onShowToast(
          `Berhasil menyimpan ${res.data?.count || questionsToSave.length} soal AI ke Bank Soal!`,
          "success"
        );
        await loadQuestions();
        setAiGeneratedList([]);
        setActiveTab("LIST");
      } else {
        onShowToast(res.message, "error");
      }
    });
  };

  const startVersionEdit = (q: BankSoalDTO) => {
    setSelectedQuestion(q);
    const latest =
      (typeof q.versi_aktif === "object" ? q.versi_aktif : null) ||
      (Array.isArray(q.versi) ? q.versi[0] : null);
    const qType = q.jenis_soal || q.tipe_soal || "PILIHAN_GANDA";
    setJenisSoal(qType);
    setTingkatKesulitan(q.tingkat_kesulitan);
    setBobotDefault(latest?.bobot ?? q.bobot_default ?? 1);

    const rawPertanyaan = latest?.pertanyaan || q.pertanyaan || "";
    const audioMatch = rawPertanyaan.match(/\[audio:(https?:\/\/[^\s|\]]+)(?:\|limit:(\d+))?\]/i);
    if (audioMatch) {
      setAudioUrl(audioMatch[1]);
      setAudioPlayLimit(audioMatch[2] ? parseInt(audioMatch[2], 10) : 2);
      setKontenPertanyaan(rawPertanyaan.replace(/\[audio:[^\]]+\]/gi, "").trim());
    } else {
      const gUrl = latest?.gambar_url || q.gambar_url || "";
      const isAudioMedia = /\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(gUrl);
      if (isAudioMedia) {
        setAudioUrl(gUrl);
        setGambarUrl("");
      } else {
        setAudioUrl("");
      }
      setAudioPlayLimit(2);
      setKontenPertanyaan(rawPertanyaan);
    }

    if (!/\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(latest?.gambar_url || q.gambar_url || "")) {
      setGambarUrl(latest?.gambar_url || q.gambar_url || "");
    }
    const optionsArray = latest?.opsi || latest?.opsi_jawaban || q.opsi_jawaban || q.opsi;
    if (optionsArray && Array.isArray(optionsArray)) {
      const correctKeys: string[] = Array.isArray(latest?.kunci_jawaban?.pilihan_benar)
        ? latest.kunci_jawaban.pilihan_benar
        : [latest?.kunci_jawaban?.pilihan_benar || "A"];
      setOpsiList(
        optionsArray.map((op: { label: string; teks: string }) => ({
          label: op.label,
          teks: op.teks,
          isCorrect: correctKeys.includes(op.label),
        }))
      );
    }
    setAlasanPerubahan("");
    setActiveTab("NEW_VERSION");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Bank Soal CBT & Asisten AI</h2>
              <p className="text-xs text-slate-500">
                Penyusunan butir soal, import massal spreadsheet, dan AI Generator
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher & Mapel Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 bg-slate-50/40">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("LIST")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "LIST"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Daftar Soal ({questions.length})
            </button>
            <button
              onClick={() => {
                resetForm();
                setActiveTab("CREATE");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "CREATE"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Input Satu-per-Satu
            </button>
            <button
              onClick={() => setActiveTab("EXCEL_IMPORT")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "EXCEL_IMPORT"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Import Excel / CSV
            </button>
            <button
              onClick={() => setActiveTab("AI_GENERATOR")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "AI_GENERATOR"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs"
                  : "text-blue-700 bg-blue-50/60 hover:bg-blue-100"
              }`}
            >
              <Bot className="h-3.5 w-3.5" /> Asisten AI Gemini
            </button>
            {activeTab === "NEW_VERSION" && selectedQuestion && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1.5 shrink-0">
                <GitBranch className="h-3.5 w-3.5" />
                Versi Baru: {selectedQuestion.kode || selectedQuestion.id.slice(-6)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Mapel:</label>
            <select
              value={selectedMapelId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMapelId(val);
                loadQuestions(val);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[200px] truncate"
            >
              {mapelList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                </option>
              ))}
            </select>
            <Link
              href="/cbt-ujian/bank-soal/buat"
              onClick={handleClose}
              title="Buka Editor Layar Penuh (Portal Sekolah Style)"
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
            >
              <span>Layar Penuh</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: LIST */}
          {activeTab === "LIST" && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-12 text-center text-sm text-slate-400">Memuat butir soal...</div>
              ) : questions.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl p-6">
                  <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Bank Soal Masih Kosong</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Belum ada butir soal pada mata pelajaran ini. Anda dapat menginput satu per
                    satu, mengimport dari Excel, atau menggunakan Asisten AI Gemini.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => {
                        resetForm();
                        setActiveTab("CREATE");
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition"
                    >
                      <Plus className="h-4 w-4" />
                      Input Satu per Satu
                    </button>
                    <button
                      onClick={() => setActiveTab("EXCEL_IMPORT")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      Import Excel
                    </button>
                    <button
                      onClick={() => setActiveTab("AI_GENERATOR")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition"
                    >
                      <Bot className="h-4 w-4 text-indigo-600" />
                      Buat dengan AI
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {questions.map((q, idx) => {
                    const activeVer =
                      (typeof q.versi_aktif === "object" ? q.versi_aktif : null) ||
                      (Array.isArray(q.versi) ? q.versi[0] : null);
                    const qType = (q.jenis_soal || q.tipe_soal || "").replace(/_/g, " ");
                    const hasImage = Boolean(activeVer?.gambar_url || q.gambar_url);
                    return (
                      <div
                        key={q.id}
                        className="p-4 bg-white hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                              #{idx + 1} {q.kode ? `(${q.kode})` : ""}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold">
                              {qType}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                q.tingkat_kesulitan === "MUDAH"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : q.tingkat_kesulitan === "SEDANG"
                                    ? "bg-blue-50 text-blue-700"
                                    : q.tingkat_kesulitan === "SULIT"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-purple-50 text-purple-700"
                              }`}
                            >
                              {q.tingkat_kesulitan}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              Bobot: {activeVer?.bobot ?? q.bobot_default ?? 1}
                            </span>
                            <span className="text-[11px] font-mono text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded">
                              v{activeVer?.nomor_versi ?? 1}
                            </span>
                            {hasImage && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                                <ImageIcon className="h-3 w-3" />
                                Bergambar
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                            {activeVer?.pertanyaan || "(Teks pertanyaan belum tersedia)"}
                          </p>

                          {/* Render Image Thumbnail if exists */}
                          {hasImage && (
                            <div className="mt-2">
                              <img
                                src={activeVer?.gambar_url || q.gambar_url}
                                alt="Gambar Stimulus Soal"
                                className="max-h-32 max-w-xs rounded-xl border border-slate-200 object-cover"
                              />
                            </div>
                          )}

                          {activeVer?.opsi && Array.isArray(activeVer.opsi) && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              {activeVer.opsi.map((op: any) => {
                                const isCorrect =
                                  activeVer.kunci_jawaban?.pilihan_benar === op.label ||
                                  (Array.isArray(activeVer.kunci_jawaban?.pilihan_benar) &&
                                    activeVer.kunci_jawaban.pilihan_benar.includes(op.label));
                                return (
                                  <div
                                    key={op.label}
                                    className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                      isCorrect
                                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-800 font-medium"
                                        : "bg-slate-50 border-slate-100 text-slate-600"
                                    }`}
                                  >
                                    <span className="font-bold">{op.label}.</span>
                                    <span className="truncate">{op.teks}</span>
                                    {isCorrect && (
                                      <Check className="h-3 w-3 text-emerald-600 ml-auto shrink-0" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => startVersionEdit(q)}
                            title="Buat Versi Baru Soal"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-blue-200 text-blue-700 bg-blue-50/40 hover:bg-blue-100/70 text-xs font-semibold transition"
                          >
                            <GitBranch className="h-3.5 w-3.5" />
                            Versi Baru
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE OR NEW_VERSION */}
          {(activeTab === "CREATE" || activeTab === "NEW_VERSION") && (
            <div className="space-y-4">
              {activeTab === "NEW_VERSION" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Pembuatan Versi Baru (Question Versioning)</p>
                    <p className="text-[11px] text-amber-700">
                      Ujian terdahulu yang telah dibekukan dalam snapshot tidak akan terpengaruh
                      oleh perubahan ini. Versi baru akan otomatis menjadi versi aktif untuk ujian
                      mendatang.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedMapelId}
                    onChange={(e) => setSelectedMapelId(e.target.value)}
                    disabled={activeTab === "NEW_VERSION"}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-100"
                  >
                    {mapelList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Soal (Opsional)
                  </label>
                  <input
                    type="text"
                    value={kode}
                    onChange={(e) => setKode(e.target.value)}
                    placeholder="Misal: MAT-IX-01"
                    disabled={activeTab === "NEW_VERSION"}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Soal</label>
                  <select
                    value={jenisSoal}
                    onChange={(e) => setJenisSoal(e.target.value as any)}
                    disabled={activeTab === "NEW_VERSION"}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-100"
                  >
                    <option value="PILIHAN_GANDA">Pilihan Ganda Tunggal</option>
                    <option value="PILIHAN_GANDA_KOMPLEKS">Pilihan Ganda Kompleks</option>
                    <option value="BENAR_SALAH">Benar / Salah</option>
                    <option value="MENJODOHKAN">Menjodohkan (Matching Pairs)</option>
                    <option value="ISIAN_SINGKAT">Isian Singkat</option>
                    <option value="URAIAN_ESAI">Uraian / Esai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tingkat Kesulitan
                  </label>
                  <select
                    value={tingkatKesulitan}
                    onChange={(e) => setTingkatKesulitan(e.target.value as any)}
                    disabled={activeTab === "NEW_VERSION"}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-100"
                  >
                    <option value="MUDAH">Mudah (C1-C2)</option>
                    <option value="SEDANG">Sedang (C3-C4)</option>
                    <option value="SULIT">Sulit (C5)</option>
                    <option value="HOTS">HOTS (C6 / Analisis Tinggi)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Konten Pertanyaan / Stimulus</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRichPreview(!showRichPreview)}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition ${
                      showRichPreview
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {showRichPreview ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {showRichPreview ? "Tutup Pratinjau Siswa" : "Pratinjau Tampilan Siswa"}
                    </span>
                  </button>
                </div>

                {/* Virtual Math & Arabic Toolbar */}
                <MathFormulaToolbar
                  onInsertLatex={handleInsertFormula}
                  onToggleArabic={() => setIsArabicActive(!isArabicActive)}
                  isArabicActive={isArabicActive}
                />

                <textarea
                  ref={textareaRef}
                  dir={isArabicActive ? "rtl" : "ltr"}
                  rows={4}
                  value={kontenPertanyaan}
                  onChange={(e) => setKontenPertanyaan(e.target.value)}
                  onPaste={handleClipboardPasteImage}
                  placeholder={
                    isArabicActive
                      ? "اكتب نص السؤال هنا... (يدعم التشكيل والرموز الرياضية)"
                      : "Tuliskan narasi pertanyaan atau stimulus soal di sini... (Mendukung rumus LaTeX $..$ dan gambar)"
                  }
                  className={`w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition ${
                    isArabicActive ? "font-serif text-base leading-relaxed text-right" : "font-sans"
                  }`}
                />
                <div className="text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-1">
                  <span>
                    💡 <span className="font-semibold text-slate-600">Tips Cepat:</span> Tekan{" "}
                    <kbd className="px-1 py-0.5 rounded bg-slate-100 border text-[10px] font-mono text-slate-700">
                      Ctrl+V
                    </kbd>{" "}
                    di textarea ini untuk menempelkan gambar tangkapan layar langsung!
                  </span>
                  <span>
                    LaTeX: <code>$x^2$</code> atau <code>$$\frac&#123;a&#125;&#123;b&#125;$$</code>
                  </span>
                </div>
              </div>

              {/* URL / Path Gambar Stimulus & Audio Listening Stimulus */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gambar Stimulus */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                      <span>Gambar / Diagram Soal</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      URL atau Tangkapan Layar
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={gambarUrl}
                      onChange={(e) => setGambarUrl(e.target.value)}
                      placeholder="Contoh: https://.../grafik.png atau paste Ctrl+V"
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                    {gambarUrl && (
                      <button
                        type="button"
                        onClick={() => setGambarUrl("")}
                        className="px-2.5 py-2 rounded-xl text-xs text-rose-600 border border-rose-200 hover:bg-rose-50"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  {gambarUrl && (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-medium mb-1">
                        Pratinjau Stimulus Gambar:
                      </p>
                      <ImageStimulus
                        src={gambarUrl}
                        alt="Stimulus Soal"
                        caption="Klik untuk zoom resolusi penuh"
                        className="max-h-32"
                      />
                    </div>
                  )}
                </div>

                {/* Audio Listening Stimulus */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Headphones className="h-3.5 w-3.5 text-purple-600" />
                      <span>Audio Stimulus (Listening)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      MP3 / WAV / Cloud Audio
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      placeholder="Contoh: https://.../listening.mp3"
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                    <div className="w-24 shrink-0">
                      <select
                        value={audioPlayLimit}
                        onChange={(e) => setAudioPlayLimit(Number(e.target.value))}
                        title="Batas pemutaran audio oleh siswa"
                        className="w-full text-xs px-2 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
                      >
                        <option value={1}>Maks 1x</option>
                        <option value={2}>Maks 2x</option>
                        <option value={3}>Maks 3x</option>
                        <option value={99}>Bebas</option>
                      </select>
                    </div>
                    {audioUrl && (
                      <button
                        type="button"
                        onClick={() => setAudioUrl("")}
                        className="px-2.5 py-2 rounded-xl text-xs text-rose-600 border border-rose-200 hover:bg-rose-50"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  {audioUrl && (
                    <div className="p-2 bg-purple-50/50 border border-purple-200/80 rounded-xl">
                      <AudioStimulusPlayer
                        src={audioUrl}
                        maxPlayCount={audioPlayLimit}
                        title="Uji Putar Audio Listening (Guru Preview)"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE PREVIEW PANE (SISWA VIEW SIMULATION) */}
              {showRichPreview && (
                <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 border border-blue-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span>Simulasi Tampilan di Layar Siswa (CBT Player)</span>
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Live KaTeX & Media
                    </span>
                  </div>

                  {audioUrl && (
                    <AudioStimulusPlayer
                      src={audioUrl}
                      maxPlayCount={audioPlayLimit}
                      title="Audio Listening — Soal Pratinjau"
                    />
                  )}

                  {gambarUrl && (
                    <div className="flex justify-center">
                      <ImageStimulus
                        src={gambarUrl}
                        alt="Stimulus Pratinjau"
                        caption="Klik gambar untuk memperbesar resolusi penuh"
                      />
                    </div>
                  )}

                  <div className="text-sm text-slate-800 leading-relaxed font-normal bg-white p-3 rounded-xl border border-slate-200/80">
                    <MathRenderer content={kontenPertanyaan || "(Teks pertanyaan belum diisi)"} />
                  </div>

                  {(jenisSoal === "PILIHAN_GANDA" ||
                    jenisSoal === "PILIHAN_GANDA_KOMPLEKS" ||
                    jenisSoal === "BENAR_SALAH") && (
                    <div className="space-y-2 pt-1">
                      {opsiList.map((op) => (
                        <div
                          key={op.label}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs transition ${
                            op.isCorrect
                              ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium"
                              : "bg-white border-slate-200 text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                              op.isCorrect
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {op.label}
                          </span>
                          <div className="flex-1">
                            <MathRenderer content={op.teks || `(Pilihan ${op.label})`} />
                          </div>
                          {op.isCorrect && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 shrink-0">
                              Kunci Jawaban
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* OPSI & KUNCI JAWABAN BERDASARKAN TIPE */}
              {(jenisSoal === "PILIHAN_GANDA" ||
                jenisSoal === "PILIHAN_GANDA_KOMPLEKS" ||
                jenisSoal === "BENAR_SALAH") && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Pilihan Opsi Jawaban (Tandai yang Benar)
                    </label>
                    {jenisSoal !== "BENAR_SALAH" && (
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Tambah Opsi
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {opsiList.map((op, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleOptionCorrectChange(idx, jenisSoal === "PILIHAN_GANDA_KOMPLEKS")
                          }
                          className={`w-7 h-7 shrink-0 rounded-lg text-xs font-bold flex items-center justify-center transition ${
                            op.isCorrect
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                          title={op.isCorrect ? "Jawaban Benar" : "Tandai sebagai Jawaban Benar"}
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
                          placeholder={`Teks jawaban pilihan ${op.label}`}
                          className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                        {opsiList.length > 2 && jenisSoal !== "BENAR_SALAH" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MENJODOHKAN FORM */}
              {jenisSoal === "MENJODOHKAN" && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block">
                        Daftar Pasangan Menjodohkan (Premis Kiri ↔ Pasangan Benar Kanan)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Sistem otomatis mengacak pasangan kanan saat disajikan kepada siswa.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPair}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tambah Pasangan
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {pasanganList.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={p.premis}
                          onChange={(e) => handleUpdatePair(idx, "premis", e.target.value)}
                          placeholder={`Premis / Konsep #${idx + 1} (Kolom Kiri)`}
                          className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                        <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={p.pasangan}
                          onChange={(e) => handleUpdatePair(idx, "pasangan", e.target.value)}
                          placeholder={`Pasangan Cocok #${idx + 1} (Kolom Kanan)`}
                          className="flex-1 text-xs px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/20 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                        {pasanganList.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePair(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jenisSoal === "ISIAN_SINGKAT" && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kata Kunci Kunci Jawaban (Pisahkan dengan koma jika ada sinonim)
                  </label>
                  <input
                    type="text"
                    value={kunciSingkat}
                    onChange={(e) => setKunciSingkat(e.target.value)}
                    placeholder="Contoh: Fotosintesis, fotosintesa, Asimilasi karbon"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              )}

              {jenisSoal === "URAIAN_ESAI" && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rubrik Penilaian & Pedoman Penskoran
                  </label>
                  <textarea
                    rows={2}
                    value={rubrikEsai}
                    onChange={(e) => setRubrikEsai(e.target.value)}
                    placeholder="Tuliskan kata kunci esensial dan pedoman skor jawaban siswa..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bobot Soal</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={bobotDefault}
                    onChange={(e) => setBobotDefault(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                {activeTab === "NEW_VERSION" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Alasan Pembaruan Versi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={alasanPerubahan}
                      onChange={(e) => setAlasanPerubahan(e.target.value)}
                      placeholder="Misal: Perbaikan typo pada opsi C"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("LIST");
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={activeTab === "CREATE" ? handleCreateQuestion : handleCreateNewVersion}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isPending ? (
                    "Menyimpan..."
                  ) : activeTab === "CREATE" ? (
                    <>
                      <Plus className="h-4 w-4" />
                      Simpan Soal ke Bank
                    </>
                  ) : (
                    <>
                      <GitBranch className="h-4 w-4" />
                      Terbitkan Versi Baru
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: EXCEL_IMPORT (IMPORT MASSAL SPREADSHEET) */}
          {activeTab === "EXCEL_IMPORT" && (
            <div className="space-y-6">
              {/* Instructions & Template Download */}
              <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-blue-950">
                        Format Kolom & Panduan Import Spreadsheet
                      </h3>
                      <p className="text-[11px] text-blue-700">
                        Mendukung Pilihan Ganda, PG Kompleks, Benar/Salah, Menjodohkan, Isian
                        Singkat, dan Esai.
                      </p>
                    </div>
                  </div>

                  {/* Download Options */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate("excel_semicolon")}
                      title="Format titik koma (;) dengan UTF-8 BOM, terbuka otomatis rapi di Microsoft Excel"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Unduh CSV (Excel Indonesia)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate("standard_csv")}
                      title="Format standar pemisah koma (,) untuk Google Sheets & CSV umum"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-bold transition shrink-0"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-500" />
                      CSV Standar (Koma)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadTemplate("tsv")}
                      title="Format tab separated untuk langsung copy/paste ke Excel atau Google Sheets"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shrink-0"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" />
                      TSV (Tab)
                    </button>
                  </div>
                </div>

                {/* Question Type Interactive Selector */}
                <div className="pt-2 border-t border-blue-100">
                  <p className="text-[11px] font-bold text-blue-900 mb-2">
                    Pilih Jenis Soal untuk Melihat Susunan Kolom & Contoh Format:
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { key: "PG", label: "Pilihan Ganda" },
                      { key: "PG_KOMPLEKS", label: "PG Kompleks" },
                      { key: "BENAR_SALAH", label: "Benar / Salah" },
                      { key: "MENJODOHKAN", label: "Menjodohkan" },
                      { key: "ISIAN_SINGKAT", label: "Isian Singkat" },
                      { key: "URAIAN_ESAI", label: "Uraian / Esai" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setGuideQuestionType(tab.key as any)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          guideQuestionType === tab.key
                            ? "bg-blue-700 text-white shadow-2xs"
                            : "bg-white/80 border border-blue-200/70 text-blue-800 hover:bg-white"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Format Detail Box */}
                  <div className="mt-3 p-3 bg-white rounded-xl border border-blue-200/80 space-y-2">
                    {guideQuestionType === "PG" && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800">
                            Format Kolom: Pilihan Ganda Tunggal
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopySampleRow(
                                "PG",
                                "1\tBagian sel yang berfungsi sebagai pusat pengendali kegiatan sel adalah...\tSitoplasma\tNukleus (Inti Sel)\tMitokondria\tRibosom\tBadan Golgi\tC1\tB\t2"
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedRowKey === "PG" ? "Tersalin!" : "Salin Baris Contoh"}
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <code className="text-[11px] font-mono text-blue-900 bg-blue-50/70 px-2 py-1 rounded block whitespace-nowrap">
                            No | Soal | Pilihan A | Pilihan B | Pilihan C | Pilihan D | Pilihan E |
                            Tingkat Kesulitan | Jawaban Benar | Bobot
                          </code>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          • <strong>Jawaban Benar:</strong> Cukup 1 huruf opsi benar (A, B, C, D,
                          atau E).
                          <br />• <strong>Tingkat Kesulitan:</strong> C1-C2 (Mudah), C3-C4 (Sedang),
                          C5-C6 / HOTS.
                          <br />• <strong>Opsi:</strong> Minimal 2 opsi (A dan B), maksimal 5 opsi
                          (A s.d E).
                        </p>
                      </>
                    )}

                    {guideQuestionType === "PG_KOMPLEKS" && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800">
                            Format Kolom: Pilihan Ganda Kompleks (Multiple Correct Answers)
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopySampleRow(
                                "PG_KOMPLEKS",
                                "1\tManakah pernyataan berikut yang benar mengenai sel prokariotik?\tTidak memiliki membran inti\tMemiliki mitokondria\tMateri genetik berada di nukleoid\tMemiliki dinding sel peptidoglikan\tMemiliki retikulum endoplasma\tC4\tA, C, D\t3"
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedRowKey === "PG_KOMPLEKS" ? "Tersalin!" : "Salin Baris Contoh"}
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <code className="text-[11px] font-mono text-blue-900 bg-blue-50/70 px-2 py-1 rounded block whitespace-nowrap">
                            No | Soal | Pilihan A | Pilihan B | Pilihan C | Pilihan D | Pilihan E |
                            Tingkat Kesulitan | Jawaban Benar | Bobot
                          </code>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          • <strong>Jawaban Benar:</strong> Tuliskan semua opsi benar dipisahkan
                          koma (contoh:{" "}
                          <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">A, C</code>{" "}
                          atau{" "}
                          <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">
                            A, C, D
                          </code>
                          ).
                          <br />• Sistem otomatis menandai butir sebagai Pilihan Ganda Kompleks.
                        </p>
                      </>
                    )}

                    {guideQuestionType === "BENAR_SALAH" && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800">
                            Format Kolom: Benar / Salah
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopySampleRow(
                                "BENAR_SALAH",
                                "1\tRibosom berperan dalam proses sintesis protein.\tBENAR\tC1\t1"
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedRowKey === "BENAR_SALAH" ? "Tersalin!" : "Salin Baris Contoh"}
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <code className="text-[11px] font-mono text-blue-900 bg-blue-50/70 px-2 py-1 rounded block whitespace-nowrap">
                            No | Pernyataan | Jawaban Benar (BENAR / SALAH) | Tingkat Kesulitan |
                            Bobot
                          </code>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          • <strong>Jawaban Benar:</strong> Tuliskan{" "}
                          <code className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">
                            BENAR
                          </code>{" "}
                          atau{" "}
                          <code className="bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-bold">
                            SALAH
                          </code>{" "}
                          (bisa juga B / S atau TRUE / FALSE).
                          <br />• Siswa akan diberikan 2 opsi interaktif di layar ujian: A. Benar,
                          B. Salah.
                        </p>
                      </>
                    )}

                    {guideQuestionType === "MENJODOHKAN" && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800">
                            Format Kolom: Menjodohkan (Matching Pairs)
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopySampleRow(
                                "MENJODOHKAN",
                                "1\tFitoplankton & Tumbuhan Hijau\tProdusen Primer (Autotrof)\tKonsumen Tersier\tC2\t2"
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedRowKey === "MENJODOHKAN" ? "Tersalin!" : "Salin Baris Contoh"}
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <code className="text-[11px] font-mono text-purple-900 bg-purple-50/70 px-2 py-1 rounded block whitespace-nowrap">
                            No | Pertanyaan (Premis Kiri) | Jawaban Benar (Target Kanan) | Pengecoh
                            (Opsional) | Tingkat Kesulitan | Bobot
                          </code>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          • <strong>Kolom Premis:</strong> Konsep/pernyataan di sisi kiri.
                          <br />• <strong>Kolom Target:</strong> Pasangan yang benar di sisi kanan.
                          <br />• <strong>Kolom Pengecoh (Opsional):</strong> Pilihan jawaban salah
                          di sisi kanan sebagai pengacau.
                          <br />• Sistem CBT secara otomatis mengacak susunan target kanan dan
                          menilai secara proporsional.
                        </p>
                      </>
                    )}

                    {guideQuestionType === "ISIAN_SINGKAT" && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800">
                            Format Kolom: Isian Singkat
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopySampleRow(
                                "ISIAN_SINGKAT",
                                "1\tOrganel yang menghasilkan pigmen klorofil untuk fotosintesis adalah...\tKloroplas, Plastida\tC1\t2"
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedRowKey === "ISIAN_SINGKAT" ? "Tersalin!" : "Salin Baris Contoh"}
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <code className="text-[11px] font-mono text-blue-900 bg-blue-50/70 px-2 py-1 rounded block whitespace-nowrap">
                            No | Pertanyaan / Soal Isian | Kunci Jawaban (Kata Kunci) | Tingkat
                            Kesulitan | Bobot
                          </code>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          • Siswa mengetikkan jawaban singkat (case-insensitive).
                          <br />• <strong>Kunci Jawaban:</strong> Tuliskan kata kunci yang benar.
                          Jika ada variasi ejaan atau sinonim, pisahkan dengan koma (contoh:{" "}
                          <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">
                            Fotosintesis, Fotosintesa, Asimilasi Karbon
                          </code>
                          ).
                        </p>
                      </>
                    )}

                    {guideQuestionType === "URAIAN_ESAI" && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800">
                            Format Kolom: Uraian / Esai
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopySampleRow(
                                "URAIAN_ESAI",
                                "1\tJelaskan tahapan utama dalam siklus Calvin pada reaksi gelap fotosintesis!\tFiksasi CO2 oleh RuBP, Reduksi PGA menjadi PGAL, dan Regenerasi RuBP menggunakan ATP & NADPH\tC4\t4"
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedRowKey === "URAIAN_ESAI" ? "Tersalin!" : "Salin Baris Contoh"}
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <code className="text-[11px] font-mono text-amber-900 bg-amber-50/70 px-2 py-1 rounded block whitespace-nowrap">
                            No | Soal Esai | Pedoman Penilaian / Rubrik Jawaban | Tingkat Kesulitan
                            | Bobot
                          </code>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          • <strong>Pedoman Penilaian:</strong> Tuliskan kata kunci esensial atau
                          rubrik jawaban yang menjadi panduan koreksi manual bagi guru.
                          <br />• Bobot default esai biasanya 4 atau disesuaikan dengan tingkat
                          kerumitan soal.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload File & Paste Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block">
                      Unggah File CSV atau Tempel Data Spreadsheet
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Bisa langsung Copy baris dari Microsoft Excel / Google Sheets lalu Paste (Ctrl
                      + V) di sini.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition shrink-0">
                    <Upload className="h-3.5 w-3.5 text-blue-600" />
                    Pilih File CSV
                    <input
                      type="file"
                      accept=".csv,.txt,.tsv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  rows={6}
                  value={rawSpreadsheetText}
                  onChange={(e) => setRawSpreadsheetText(e.target.value)}
                  placeholder="Tempel baris-baris dari Microsoft Excel atau Google Sheets di sini (Ctrl + V)..."
                  className="w-full text-xs font-mono p-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">
                    Sistem otomatis mendeteksi pemisah tab / titik koma (;) / koma (,).
                  </p>
                  <button
                    type="button"
                    onClick={handleParseSpreadsheet}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Pratinjau Data Soal ({bulkParsedList.length})
                  </button>
                </div>
              </div>

              {/* Parsed Preview Table */}
              {bulkParsedList.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span>Hasil Pratinjau Butir Soal</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                        {bulkParsedList.filter((q) => q.isValid).length} Valid
                      </span>
                      {bulkParsedList.filter((q) => !q.isValid).length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold">
                          {bulkParsedList.filter((q) => !q.isValid).length} Bermasalah
                        </span>
                      )}
                    </h4>

                    <button
                      type="button"
                      onClick={handleSaveBulkQuestions}
                      disabled={isPending || bulkParsedList.filter((q) => q.isValid).length === 0}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      {isPending
                        ? "Menyimpan ke Bank Soal..."
                        : `Simpan ${bulkParsedList.filter((q) => q.isValid).length} Soal ke Bank Soal`}
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {bulkParsedList.map((q, idx) => (
                      <div
                        key={idx}
                        className={`p-3 text-xs flex items-start gap-3 ${
                          q.isValid ? "bg-white hover:bg-slate-50" : "bg-rose-50/50"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                            q.isValid ? "bg-blue-50 text-blue-700" : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {q.nomor}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                q.tipe_soal === "MENJODOHKAN"
                                  ? "bg-purple-100 text-purple-700"
                                  : q.tipe_soal === "URAIAN_ESAI"
                                    ? "bg-amber-100 text-amber-800"
                                    : q.tipe_soal === "PILIHAN_GANDA_KOMPLEKS"
                                      ? "bg-indigo-100 text-indigo-700"
                                      : q.tipe_soal === "BENAR_SALAH"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : q.tipe_soal === "ISIAN_SINGKAT"
                                          ? "bg-cyan-100 text-cyan-800"
                                          : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {q.tipe_soal === "MENJODOHKAN"
                                ? "MENJODOHKAN"
                                : q.tipe_soal === "URAIAN_ESAI"
                                  ? "ESAI / URAIAN"
                                  : q.tipe_soal === "PILIHAN_GANDA_KOMPLEKS"
                                    ? "PG KOMPLEKS"
                                    : q.tipe_soal === "BENAR_SALAH"
                                      ? "BENAR / SALAH"
                                      : q.tipe_soal === "ISIAN_SINGKAT"
                                        ? "ISIAN SINGKAT"
                                        : "PILIHAN GANDA"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Bobot: {q.bobot} | {q.tingkat_kesulitan}
                            </span>
                          </div>
                          <p className="font-medium text-slate-900 leading-relaxed">
                            {q.pertanyaan}
                          </p>

                          {(q.tipe_soal === "PILIHAN_GANDA" ||
                            q.tipe_soal === "PILIHAN_GANDA_KOMPLEKS" ||
                            q.tipe_soal === "BENAR_SALAH") &&
                            q.opsi.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                                {q.opsi.map((op) => (
                                  <span
                                    key={op.label}
                                    className={`px-1.5 py-0.5 rounded ${
                                      op.isCorrect
                                        ? "bg-emerald-100 text-emerald-800 font-bold"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {op.label}: {op.teks}
                                  </span>
                                ))}
                                <span className="ml-auto font-bold text-blue-700">
                                  Kunci: {q.kunci_benar}
                                </span>
                              </div>
                            )}

                          {q.tipe_soal === "MENJODOHKAN" && (
                            <div className="flex items-center gap-2 text-[11px] text-purple-700 bg-purple-50/60 px-2 py-1 rounded-lg border border-purple-200/50">
                              <span className="font-semibold">Pasangan Benar:</span>
                              <span className="font-bold">{q.kunci_benar}</span>
                            </div>
                          )}

                          {q.tipe_soal === "ISIAN_SINGKAT" && (
                            <div className="flex items-center gap-2 text-[11px] text-cyan-800 bg-cyan-50/60 px-2 py-1 rounded-lg border border-cyan-200/50">
                              <span className="font-semibold">Kata Kunci:</span>
                              <span className="font-bold">{q.kunci_benar}</span>
                            </div>
                          )}

                          {q.tipe_soal === "URAIAN_ESAI" && (
                            <div className="text-[11px] text-amber-800 bg-amber-50/60 px-2 py-1 rounded-lg border border-amber-200/50">
                              <span className="font-semibold">Rubrik / Pedoman: </span>
                              <span>{q.rubrik_esai || q.kunci_benar}</span>
                            </div>
                          )}
                          {!q.isValid && (
                            <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5" />
                              {q.errorDetail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AI_GENERATOR (ASISTEN AI GEMINI) */}
          {activeTab === "AI_GENERATOR" && (
            <div className="space-y-6">
              {/* Gemini Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 text-white relative overflow-hidden shadow-lg">
                <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-sm font-bold">Asisten AI Guru — Pembuat Soal Otomatis</h3>
                  <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-blue-100">
                    Google Gemini 2.0
                  </span>
                </div>
                <p className="text-xs text-blue-100/90 leading-relaxed max-w-2xl">
                  Rancang butir soal Kurikulum Merdeka secara instan lengkap dengan narasi stimulus,
                  opsi pengecoh berkualitas, dan taksonomi Bloom.
                </p>
              </div>

              {/* Generator Configuration Form */}
              <div className="p-5 rounded-3xl bg-slate-50/70 border border-slate-200/80 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Topik Pokok / Capaian Pembelajaran <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={aiTopik}
                      onChange={(e) => setAiTopik(e.target.value)}
                      placeholder="Misal: Hukum Newton & Penerapannya pada Gerak Benda, Sistem Fotosintesis Kelas 8..."
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Format Jenis Soal
                    </label>
                    <select
                      value={aiJenis}
                      onChange={(e) => setAiJenis(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                    >
                      <option value="PILIHAN_GANDA">Pilihan Ganda (A-D/E)</option>
                      <option value="MENJODOHKAN">Menjodohkan (Matching Pairs)</option>
                      <option value="BENAR_SALAH">Benar / Salah</option>
                      <option value="ISIAN_SINGKAT">Isian Singkat</option>
                      <option value="URAIAN_ESAI">Uraian / Esai</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tingkat Kesulitan
                    </label>
                    <select
                      value={aiKesulitan}
                      onChange={(e) => setAiKesulitan(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                    >
                      <option value="SEDANG">Sedang (C3-C4)</option>
                      <option value="MUDAH">Mudah (C1-C2)</option>
                      <option value="SULIT">Sulit (C5)</option>
                      <option value="HOTS">HOTS (Analisis Tinggi / C6)</option>
                      <option value="CAMPURAN">Campuran Proporsional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jumlah Butir Soal ({aiJumlah} butir)
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      value={aiJumlah}
                      onChange={(e) => setAiJumlah(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Google Gemini API Key (Opsional)</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Tersimpan lokal di browser
                      </span>
                    </label>
                    <div className="relative">
                      <Key className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="password"
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        placeholder="AIzaSy... (kosongkan untuk asisten internal)"
                        className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateAi}
                    disabled={isAiGenerating || !aiTopik.trim()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50"
                  >
                    {isAiGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        AI Sedang Merancang Soal...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4" />
                        Susun Soal dengan AI Gemini
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AI Generation Results */}
              {aiMessage && (
                <p className="text-xs text-indigo-700 bg-indigo-50/70 border border-indigo-200/60 p-3 rounded-2xl flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-600 shrink-0" />
                  {aiMessage}
                </p>
              )}

              {aiGeneratedList.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">
                      Rancangan Soal Dihasilkan ({aiGeneratedList.length} butir)
                    </h4>
                    <button
                      type="button"
                      onClick={handleSaveAiQuestions}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      {isPending ? "Menyimpan ke Bank..." : "Simpan Semua Hasil AI ke Bank Soal"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {aiGeneratedList.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-mono text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {q.jenis_soal.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                            {q.tingkat_kesulitan}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium ml-auto">
                            Bobot: {q.bobot}
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed font-normal">
                          {q.pertanyaan}
                        </p>

                        {/* If matching pairs */}
                        {q.pasangan_menjodohkan && Array.isArray(q.pasangan_menjodohkan) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                            {q.pasangan_menjodohkan.map((p: any, pIdx: number) => (
                              <div
                                key={pIdx}
                                className="text-[11px] p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                              >
                                <span className="font-semibold text-slate-700">{p.premis}</span>
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                  {p.pasangan}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* If Multiple Choice options */}
                        {q.opsi && Array.isArray(q.opsi) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                            {q.opsi.map((op: any) => {
                              const isCorrect =
                                q.kunci_jawaban?.pilihan_benar === op.label ||
                                (Array.isArray(q.kunci_jawaban?.pilihan_benar) &&
                                  q.kunci_jawaban.pilihan_benar.includes(op.label));
                              return (
                                <div
                                  key={op.label}
                                  className={`text-[11px] p-2 rounded-xl border flex items-center gap-2 ${
                                    isCorrect
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-medium"
                                      : "bg-slate-50 border-slate-100 text-slate-600"
                                  }`}
                                >
                                  <span className="font-bold">{op.label}.</span>
                                  <span>{op.teks}</span>
                                  {isCorrect && (
                                    <Check className="h-3.5 w-3.5 text-emerald-600 ml-auto shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.pembahasan && (
                          <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                            💡 Pembahasan: {q.pembahasan}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
