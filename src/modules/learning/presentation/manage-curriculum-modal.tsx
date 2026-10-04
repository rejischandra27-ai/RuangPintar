"use client";

/**
 * Ruang Pintar — M11 Manage Curriculum & Multi-Rombel Broadcast Modal
 *
 * Pusat Pengelolaan BAB & Materi Ajar untuk Guru Pengampu:
 * Memungkinkan pembuatan BAB dan unggah materi 1 kali untuk langsung
 * didistribusikan ke seluruh rombel paralel yang diampu (e.g. 11 kelas sekaligus).
 */

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  BookOpen,
  FolderPlus,
  UploadCloud,
  FileText,
  Link as LinkIcon,
  AlignLeft,
  Check,
  CheckSquare,
  Square,
  Loader2,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  Calendar,
} from "lucide-react";
import {
  createBabMultiRombelAction,
  createMateriMultiRombelAction,
  getCurriculumSummaryAction,
  syncCurriculumToAllRombelsAction,
} from "@/app/actions/learning-actions";
import { TeacherClassCardDTO } from "../domain/learning-types";

interface ManageCurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: TeacherClassCardDTO[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function ManageCurriculumModal({
  isOpen,
  onClose,
  classes,
  onSuccess,
  onError,
}: ManageCurriculumModalProps) {
  // 1. Group classes by Mata Pelajaran
  const subjectsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        nama: string;
        kode: string;
        classes: TeacherClassCardDTO[];
      }
    >();

    for (const c of classes) {
      if (!map.has(c.mata_pelajaran_id)) {
        map.set(c.mata_pelajaran_id, {
          id: c.mata_pelajaran_id,
          nama: c.mata_pelajaran_nama,
          kode: c.mata_pelajaran_kode,
          classes: [],
        });
      }
      map.get(c.mata_pelajaran_id)!.classes.push(c);
    }

    const list = Array.from(map.values());
    // Urutkan mapel berdasarkan rombel terbanyak sehingga mapel utama guru tampil pertama
    list.sort((a, b) => b.classes.length - a.classes.length);
    return list;
  }, [classes]);

  const [userSelectedSubjectId, setUserSelectedSubjectId] = useState<string | null>(null);

  const currentSubject = useMemo(() => {
    if (userSelectedSubjectId) {
      const found = subjectsMap.find((s) => s.id === userSelectedSubjectId);
      if (found) return found;
    }
    return subjectsMap[0];
  }, [subjectsMap, userSelectedSubjectId]);

  const selectedSubjectId = currentSubject?.id || "";

  const targetClasses = useMemo(() => {
    return currentSubject?.classes || [];
  }, [currentSubject]);

  // Active Tab: "BAB" | "MATERI" | "OVERVIEW"
  const [activeTab, setActiveTab] = useState<"MATERI" | "BAB" | "OVERVIEW">("MATERI");

  // Multi-Rombel Checkboxes: jika null, seluruh rombel dari currentSubject otomatis terpilih
  const [customPenugasanIds, setCustomPenugasanIds] = useState<string[] | null>(null);

  const selectedPenugasanIds = useMemo(() => {
    if (customPenugasanIds === null) {
      return targetClasses.map((c) => c.id);
    }
    const validIds = new Set(targetClasses.map((c) => c.id));
    return customPenugasanIds.filter((id) => validIds.has(id));
  }, [customPenugasanIds, targetClasses]);

  const handleSelectSubject = (subjId: string) => {
    setUserSelectedSubjectId(subjId);
    setCustomPenugasanIds(null); // Reset agar semua rombel dari mapel baru otomatis terpilih
  };

  // Form State: BAB
  const [babKode, setBabKode] = useState("");
  const [babJudul, setBabJudul] = useState("");
  const [babDeskripsi, setBabDeskripsi] = useState("");

  // Form State: Materi
  const [materiBabJudul, setMateriBabJudul] = useState("");
  const [materiJudul, setMateriJudul] = useState("");
  const [materiDeskripsi, setMateriDeskripsi] = useState("");
  const [tipeKonten, setTipeKonten] = useState<"DOKUMEN" | "TEKS" | "TAUTAN">("DOKUMEN");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tautanUrl, setTautanUrl] = useState("");
  const [kontenTeks, setKontenTeks] = useState("");

  // Existing BABs summary
  const [existingBabs, setExistingBabs] = useState<
    Array<{ id: string; kode?: string | null; judul: string; deskripsi?: string | null }>
  >([]);
  const [totalMateriCount, setTotalMateriCount] = useState(0);

  const [isPending, startTransition] = useTransition();

  // Load curriculum overview when modal opens or subject changes
  useEffect(() => {
    if (!isOpen || !selectedSubjectId) return;

    let isMounted = true;
    getCurriculumSummaryAction(selectedSubjectId).then((res) => {
      if (isMounted && res.success) {
        setExistingBabs(res.babs);
        setTotalMateriCount(res.materiCount);
        if (res.babs.length > 0 && !materiBabJudul) {
          setMateriBabJudul(res.babs[0].judul);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedSubjectId, materiBabJudul]);

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Toggle selection
  const handleToggleAllRombels = () => {
    if (selectedPenugasanIds.length === targetClasses.length) {
      setCustomPenugasanIds([]);
    } else {
      setCustomPenugasanIds(targetClasses.map((c) => c.id));
    }
  };

  const handleTogglePenugasan = (id: string) => {
    if (selectedPenugasanIds.includes(id)) {
      setCustomPenugasanIds(selectedPenugasanIds.filter((item) => item !== id));
    } else {
      setCustomPenugasanIds([...selectedPenugasanIds, id]);
    }
  };

  // Submit BAB
  const handleSaveBab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!babJudul.trim()) {
      onError("Mohon masukkan Judul BAB / Lingkup Materi terlebih dahulu.");
      return;
    }
    if (selectedPenugasanIds.length === 0) {
      onError("Pilih minimal satu kelas target.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("penugasan_ids", JSON.stringify(selectedPenugasanIds));
      if (babKode) formData.set("kode", babKode);
      formData.set("judul", babJudul);
      if (babDeskripsi) formData.set("deskripsi", babDeskripsi);

      const res = await createBabMultiRombelAction(null, formData);
      if (res.success) {
        onSuccess(res.message);
        setBabJudul("");
        setBabKode("");
        setBabDeskripsi("");
        // Refresh summary
        getCurriculumSummaryAction(selectedSubjectId).then((data) => {
          if (data.success) {
            setExistingBabs(data.babs);
            setTotalMateriCount(data.materiCount);
          }
        });
        setActiveTab("MATERI");
      } else {
        onError(res.message);
      }
    });
  };

  // Sinkronkan seluruh BAB & TP master ke rombel paralel yang dipilih
  const handleSyncAllBabs = () => {
    if (targetClasses.length === 0) return;
    startTransition(async () => {
      const res = await syncCurriculumToAllRombelsAction(
        selectedSubjectId,
        targetClasses.map((c) => c.id)
      );
      if (res.success) {
        onSuccess(res.message);
        getCurriculumSummaryAction(selectedSubjectId).then((data) => {
          if (data.success) {
            setExistingBabs(data.babs);
            setTotalMateriCount(data.materiCount);
          }
        });
      } else {
        onError(res.message);
      }
    });
  };

  // Submit Materi
  const handleSaveMateri = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materiJudul.trim()) {
      onError("Judul materi pembelajaran tidak boleh kosong.");
      return;
    }
    if (selectedPenugasanIds.length === 0) {
      onError("Pilih minimal satu kelas target penerima.");
      return;
    }
    if (tipeKonten === "DOKUMEN" && !selectedFile) {
      onError("Silakan pilih file dokumen modul ajar yang ingin diunggah.");
      return;
    }
    if (tipeKonten === "TAUTAN" && !tautanUrl.trim()) {
      onError("Tautan URL materi / video tidak boleh kosong.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("penugasan_ids", JSON.stringify(selectedPenugasanIds));
      formData.set("mata_pelajaran_id", selectedSubjectId);
      if (materiBabJudul) formData.set("bab_judul", materiBabJudul);
      formData.set("judul", materiJudul);
      if (materiDeskripsi) formData.set("deskripsi", materiDeskripsi);
      formData.set("tipe_konten", tipeKonten);
      if (selectedFile) formData.set("file", selectedFile);
      if (tautanUrl) formData.set("tautan_url", tautanUrl);
      if (kontenTeks) formData.set("konten_teks", kontenTeks);

      const res = await createMateriMultiRombelAction(null, formData);
      if (res.success) {
        onSuccess(res.message);
        setMateriJudul("");
        setMateriDeskripsi("");
        setSelectedFile(null);
        setTautanUrl("");
        setKontenTeks("");
        onClose();
      } else {
        onError(res.message);
      }
    });
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header Dialog */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-[#2563EB] shadow-xs">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Kelola BAB & Materi Pembelajaran
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold uppercase">
                  Multi-Rombel
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Buat 1 kali untuk langsung didistribusikan ke seluruh kelas paralel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mata Pelajaran Selector (Dropdown jika > 1 mapel, atau info bar jika 1 mapel) */}
        {subjectsMap.length > 1 ? (
          <div className="px-5 sm:px-6 py-2.5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <label
                htmlFor="select-mapel-curriculum"
                className="text-xs font-bold text-slate-600 shrink-0 flex items-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                <span>Pilih Mapel:</span>
              </label>
              <div className="relative flex-1 max-w-md">
                <select
                  id="select-mapel-curriculum"
                  value={selectedSubjectId}
                  onChange={(e) => handleSelectSubject(e.target.value)}
                  className="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] shadow-2xs appearance-none cursor-pointer truncate"
                >
                  {subjectsMap.map((subj) => (
                    <option key={subj.id} value={subj.id}>
                      {subj.nama} ({subj.classes.length} Rombel Kelas)
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 font-medium text-xs flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                <strong>{targetClasses.length} Rombel</strong> Siap Distribusi
              </span>
            </div>
          </div>
        ) : (
          subjectsMap[0] && (
            <div className="px-5 sm:px-6 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2 text-slate-600 font-semibold truncate">
                <Layers className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Mata Pelajaran:</span>
                <span className="text-slate-900 font-bold">{subjectsMap[0].nama}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] shrink-0">
                {subjectsMap[0].classes.length} Rombel
              </span>
            </div>
          )
        )}

        {/* Tab Switcher: Upload Materi vs Buat BAB */}
        <div className="px-5 sm:px-6 pt-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("MATERI")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "MATERI"
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <UploadCloud className="h-4 w-4" />
            <span>Unggah Materi / Modul</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BAB")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "BAB"
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FolderPlus className="h-4 w-4" />
            <span>+ Buat BAB Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ml-auto ${
              activeTab === "OVERVIEW"
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Ringkasan BAB ({existingBabs.length})</span>
          </button>
        </div>

        {/* Form Body Viewport */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* =========================================================
              TAB 1: UNGGAH MATERI / MODUL AJAR (DEFAULT)
             ========================================================= */}
          {activeTab === "MATERI" && (
            <form id="materi-multi-form" onSubmit={handleSaveMateri} className="space-y-4">
              {/* PILIH BAB */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bagian dari BAB / Lingkup Materi
                </label>
                {existingBabs.length > 0 ? (
                  <div className="flex gap-2 items-center">
                    <select
                      value={materiBabJudul}
                      onChange={(e) => setMateriBabJudul(e.target.value)}
                      className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    >
                      <option value="">-- Pilih BAB Terdaftar --</option>
                      {existingBabs.map((b) => (
                        <option key={b.id} value={b.judul}>
                          {b.kode ? `${b.kode}: ` : ""}
                          {b.judul}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setActiveTab("BAB")}
                      className="shrink-0 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold"
                      title="Buat BAB baru jika belum ada di daftar"
                    >
                      + BAB Baru
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                    <span>Belum ada BAB. Buat BAB terlebih dahulu agar materi tersusun rapi.</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("BAB")}
                      className="ml-2 font-bold underline hover:text-amber-900 cursor-pointer"
                    >
                      Buat BAB Sekarang
                    </button>
                  </div>
                )}
              </div>

              {/* JUDUL MATERI */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Judul Materi Pembelajaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Modul 1 - Algoritma Dasar & Flowchart"
                  value={materiJudul}
                  onChange={(e) => setMateriJudul(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                />
              </div>

              {/* TIPE KONTEN & UPLOAD */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tipe Konten Materi
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setTipeKonten("DOKUMEN")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      tipeKonten === "DOKUMEN"
                        ? "border-[#2563EB] bg-blue-50/50 text-[#2563EB] shadow-2xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>File / Modul PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipeKonten("TAUTAN")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      tipeKonten === "TAUTAN"
                        ? "border-[#2563EB] bg-blue-50/50 text-[#2563EB] shadow-2xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <LinkIcon className="h-4 w-4" />
                    <span>Link / Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipeKonten("TEKS")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      tipeKonten === "TEKS"
                        ? "border-[#2563EB] bg-blue-50/50 text-[#2563EB] shadow-2xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <AlignLeft className="h-4 w-4" />
                    <span>Teks Bacaan</span>
                  </button>
                </div>

                {/* FORM SESUAI TIPE */}
                {tipeKonten === "DOKUMEN" && (
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 sm:p-5 text-center bg-slate-50/50 transition-colors">
                    <input
                      type="file"
                      id="materi-file-upload"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                    />
                    <label
                      htmlFor="materi-file-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <UploadCloud className="h-8 w-8 text-blue-500 mb-1.5" />
                      <span className="text-xs font-bold text-slate-800">
                        {selectedFile ? selectedFile.name : "Klik atau seret file ke sini"}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Mendukung PDF, DOCX, PPTX, XLSX (Maks. 25 MB)
                      </span>
                    </label>
                  </div>
                )}

                {tipeKonten === "TAUTAN" && (
                  <div>
                    <input
                      type="url"
                      placeholder="https://youtube.com/watch?v=... atau link Google Drive"
                      value={tautanUrl}
                      onChange={(e) => setTautanUrl(e.target.value)}
                      className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                )}

                {tipeKonten === "TEKS" && (
                  <div>
                    <textarea
                      rows={3}
                      placeholder="Tuliskan materi atau instruksi bacaan langsung di sini..."
                      value={kontenTeks}
                      onChange={(e) => setKontenTeks(e.target.value)}
                      className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                    />
                  </div>
                )}
              </div>

              {/* TARGET DISTRIBUSI ROMBEL */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Distribusikan ke Rombel Paralel:</span>
                    <span className="px-2 py-0.2 rounded-full bg-blue-50 text-blue-600 font-extrabold text-[10px]">
                      {selectedPenugasanIds.length} / {targetClasses.length} Terpilih
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleAllRombels}
                    className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    {selectedPenugasanIds.length === targetClasses.length
                      ? "Batal Pilih Semua"
                      : "Pilih Semua Rombel"}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                  {targetClasses.map((cls) => {
                    const isChecked = selectedPenugasanIds.includes(cls.id);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => handleTogglePenugasan(cls.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs font-bold transition-all cursor-pointer ${
                          isChecked
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            isChecked
                              ? "bg-white text-blue-600 border-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="truncate">{cls.rombel_nama}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          )}

          {/* =========================================================
              TAB 2: BUAT BAB BARU (LINGKUP MATERI)
             ========================================================= */}
          {activeTab === "BAB" && (
            <form id="bab-multi-form" onSubmit={handleSaveBab} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                <Info className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  BAB (Lingkup Materi) yang Anda buat di sini akan otomatis disinkronkan ke seluruh
                  rombel paralel yang dipilih, sehingga Anda tidak perlu mengetik ulang di setiap
                  kelas.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Kode BAB</label>
                  <input
                    type="text"
                    placeholder="BAB 1"
                    value={babKode}
                    onChange={(e) => setBabKode(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Judul BAB / Lingkup Materi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ketik judul BAB (misal: Berpikir Komputasional)"
                    value={babJudul}
                    onChange={(e) => setBabJudul(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                  />
                  {!babJudul.trim() && (
                    <p className="text-[11px] text-amber-600 mt-1 font-medium">
                      * Ketik judul BAB di sini agar dapat diterapkan ke seluruh rombel paralel
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deskripsi / Capaian Pembelajaran (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat tentang materi dan tujuan pembelajaran pada BAB ini..."
                  value={babDeskripsi}
                  onChange={(e) => setBabDeskripsi(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                />
              </div>

              {/* TARGET DISTRIBUSI ROMBEL */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Terapkan BAB ini ke Rombel Paralel:</span>
                    <span className="px-2 py-0.2 rounded-full bg-blue-50 text-blue-600 font-extrabold text-[10px]">
                      {selectedPenugasanIds.length} / {targetClasses.length} Terpilih
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleAllRombels}
                    className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    {selectedPenugasanIds.length === targetClasses.length
                      ? "Batal Pilih Semua"
                      : "Pilih Semua Rombel"}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                  {targetClasses.map((cls) => {
                    const isChecked = selectedPenugasanIds.includes(cls.id);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => handleTogglePenugasan(cls.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs font-bold transition-all cursor-pointer ${
                          isChecked
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            isChecked
                              ? "bg-white text-blue-600 border-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="truncate">{cls.rombel_nama}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          )}

          {/* =========================================================
              TAB 3: RINGKASAN BAB & KURIKULUM
             ========================================================= */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                <span>Daftar BAB pada {currentSubject?.nama}:</span>
                <span className="font-bold text-slate-700">Total {existingBabs.length} BAB</span>
              </div>

              {existingBabs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200/60">
                  <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Belum ada BAB yang dibuat</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Klik tab &quot;+ Buat BAB Baru&quot; untuk menyusun bab kurikulum Anda.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("BAB")}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold"
                  >
                    + Buat BAB Sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Sync Action Banner */}
                  <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-blue-950">
                      <Sparkles className="h-4 w-4 text-[#2563EB] shrink-0" />
                      <span>
                        Pastikan seluruh <strong>{targetClasses.length} rombel paralel</strong>{" "}
                        memiliki struktur BAB & TP yang seragam.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSyncAllBabs}
                      disabled={isPending}
                      className="px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shrink-0 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      ) : (
                        <CheckSquare className="h-3.5 w-3.5" />
                      )}
                      <span>Sinkronkan ke Semua Rombel</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {existingBabs.map((b, idx) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between shadow-2xs hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563EB] text-xs font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              {b.kode && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
                                  {b.kode}
                                </span>
                              )}
                              <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                                {b.judul}
                              </h4>
                            </div>
                            {b.deskripsi && (
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {b.deskripsi}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMateriBabJudul(b.judul);
                            setActiveTab("MATERI");
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-[#2563EB] hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                          <span>+ Isi Materi</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>

          {activeTab === "MATERI" && (
            <button
              type="submit"
              form="materi-multi-form"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Menerbitkan ke {selectedPenugasanIds.length} Kelas...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>Terbitkan ke {selectedPenugasanIds.length} Kelas Sekaligus</span>
                </>
              )}
            </button>
          )}

          {activeTab === "BAB" && (
            <button
              type="submit"
              form="bab-multi-form"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Menerapkan BAB ke {selectedPenugasanIds.length} Kelas...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="h-4 w-4" />
                  <span>Terapkan BAB ke {selectedPenugasanIds.length} Kelas</span>
                </>
              )}
            </button>
          )}

          {activeTab === "OVERVIEW" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncAllBabs}
                disabled={isPending || existingBabs.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 text-[#2563EB] hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckSquare className="h-3.5 w-3.5" />
                )}
                <span>Sinkronkan ke Semua Rombel</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("MATERI")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Lanjut Upload Materi</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
