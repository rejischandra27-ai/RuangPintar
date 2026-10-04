"use client";

import React, { useState } from "react";
import { Sigma, ChevronDown } from "lucide-react";
import { MathRenderer } from "./math-renderer";

interface MathFormulaToolbarProps {
  onInsertLatex: (latex: string) => void;
  onToggleArabic?: () => void;
  isArabicActive?: boolean;
}

export function MathFormulaToolbar({
  onInsertLatex,
  onToggleArabic,
  isArabicActive = false,
}: MathFormulaToolbarProps) {
  const [activeTab, setActiveTab] = useState<"dasar" | "lanjutan" | "simbol" | "arab">("dasar");
  const [isOpen, setIsOpen] = useState(false);

  const formulaPresets = {
    dasar: [
      { label: "a/b", latex: "\\frac{a}{b}", display: "$\\frac{a}{b}$", desc: "Pecahan" },
      { label: "√x", latex: "\\sqrt{x}", display: "$\\sqrt{x}$", desc: "Akar Kuadrat" },
      { label: "x²", latex: "x^{2}", display: "$x^2$", desc: "Pangkat" },
      { label: "x_i", latex: "x_{i}", display: "$x_i$", desc: "Indeks Bawah" },
      { label: "±", latex: "\\pm", display: "$\\pm$", desc: "Plus Minus" },
      { label: "×", latex: "\\times", display: "$\\times$", desc: "Kali" },
      { label: "÷", latex: "\\div", display: "$\\div$", desc: "Bagi" },
      { label: "≠", latex: "\\neq", display: "$\\neq$", desc: "Tidak Sama Dengan" },
      { label: "≤", latex: "\\le", display: "$\\le$", desc: "Kurang dari Sama dengan" },
      { label: "≥", latex: "\\ge", display: "$\\ge$", desc: "Lebih dari Sama dengan" },
      { label: "°", latex: "^{\\circ}", display: "$^{\\circ}$", desc: "Derajat" },
    ],
    lanjutan: [
      {
        label: "∫ f(x)dx",
        latex: "\\int_{a}^{b} f(x) \\, dx",
        display: "$\\int_{a}^{b} f(x) dx$",
        desc: "Integral Tentu",
      },
      {
        label: "∑ x_i",
        latex: "\\sum_{i=1}^{n} x_i",
        display: "$\\sum_{i=1}^{n}$",
        desc: "Sigma / Penjumlahan",
      },
      {
        label: "lim",
        latex: "\\lim_{x \\to 0} f(x)",
        display: "$\\lim_{x \\to 0}$",
        desc: "Limit",
      },
      { label: "n√x", latex: "\\sqrt[n]{x}", display: "$\\sqrt[n]{x}$", desc: "Akar Pangkat n" },
      { label: "log_b(x)", latex: "\\log_{b}(x)", display: "$\\log_{b}(x)$", desc: "Logaritma" },
      {
        label: "Matriks",
        latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
        display: "$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$",
        desc: "Matriks 2x2",
      },
      { label: "Kimia →", latex: "\\rightarrow", display: "$\\rightarrow$", desc: "Panah Reaksi" },
      {
        label: "Kimia ⇌",
        latex: "\\rightleftharpoons",
        display: "$\\rightleftharpoons$",
        desc: "Reaksi Bolak Balik",
      },
    ],
    simbol: [
      { label: "π", latex: "\\pi", display: "$\\pi$", desc: "Pi" },
      { label: "α", latex: "\\alpha", display: "$\\alpha$", desc: "Alpha" },
      { label: "β", latex: "\\beta", display: "$\\beta$", desc: "Beta" },
      { label: "θ", latex: "\\theta", display: "$\\theta$", desc: "Theta" },
      { label: "λ", latex: "\\lambda", display: "$\\lambda$", desc: "Lambda" },
      { label: "μ", latex: "\\mu", display: "$\\mu$", desc: "Mu / Mikro" },
      { label: "σ", latex: "\\sigma", display: "$\\sigma$", desc: "Sigma Kecil" },
      { label: "Δ", latex: "\\Delta", display: "$\\Delta$", desc: "Delta" },
      { label: "∞", latex: "\\infty", display: "$\\infty$", desc: "Tak Hingga" },
      { label: "≈", latex: "\\approx", display: "$\\approx$", desc: "Mendekati" },
      { label: "∈", latex: "\\in", display: "$\\in$", desc: "Elemen dari" },
    ],
    arab: [
      {
        label: "Bismillah",
        latex: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
        display: "بِسْمِ اللَّهِ",
        desc: "Basmalah",
      },
      {
        label: "SAW",
        latex: "صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ",
        display: "ﷺ",
        desc: "Shallallahu 'alaihi wa sallam",
      },
      {
        label: "SWT",
        latex: "سُبْحَانَهُ وَتَعَالَىٰ",
        display: "سُبْحَانَهُ وَتَعَالَىٰ",
        desc: "Subhanahu wa ta'ala",
      },
      {
        label: "Alhamdulillah",
        latex: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
        display: "الْحَمْدُ لِلَّهِ",
        desc: "Hamdalah",
      },
    ],
  };

  const handleInsert = (latex: string, isMath: boolean = true) => {
    if (isMath) {
      onInsertLatex(`$${latex}$`);
    } else {
      onInsertLatex(latex);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
      {/* Top Bar Quick Toggles */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/80 dark:border-indigo-900 transition-colors cursor-pointer"
          >
            <Sigma className="h-3.5 w-3.5" />
            <span>Simbol Rumus Matematika / Sains</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {onToggleArabic && (
            <button
              type="button"
              onClick={onToggleArabic}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                isArabicActive
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>{isArabicActive ? "✓ Mode Arab (RTL) Aktif" : "Mode Arab (RTL)"}</span>
            </button>
          )}
        </div>

        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
          Klik simbol untuk menyisipkan ke soal
        </span>
      </div>

      {/* Dropdown Palette Panel */}
      {isOpen && (
        <div className="p-3 bg-white dark:bg-slate-900 space-y-2.5 border-t border-slate-100 dark:border-slate-800">
          {/* Sub-Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
            {(["dasar", "lanjutan", "simbol", "arab"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Button Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1">
            {formulaPresets[activeTab].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsert(item.latex, activeTab !== "arab")}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-center transition-all flex flex-col items-center justify-center gap-1 group cursor-pointer"
                title={`${item.desc} (${item.latex})`}
              >
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                  {activeTab === "arab" ? (
                    <span dir="rtl" className="font-serif text-sm">
                      {item.display}
                    </span>
                  ) : (
                    <MathRenderer content={item.display} className="text-xs" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400 truncate max-w-full">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
