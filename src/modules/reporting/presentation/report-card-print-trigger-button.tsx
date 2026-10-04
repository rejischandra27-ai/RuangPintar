"use client";

import React from "react";
import { Printer } from "lucide-react";

export function ReportCardPrintTriggerButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm cursor-pointer"
    >
      <Printer className="w-4 h-4" />
      <span>Cetak A4 / Simpan PDF</span>
    </button>
  );
}
