"use client";

/**
 * Ruang Pintar — Module M18: Report Card Preview Modal
 * Academic Glass UI Modal for Official Report Card Preview & Workflow Actions
 */

import React, { useState } from "react";
import {
  X,
  Printer,
  CheckCircle2,
  Send,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download,
  ShieldAlert,
} from "lucide-react";
import { ReportCardData, ValidationResult } from "../domain/report-card-types";
import { ReportCardPrintView } from "./report-card-print-view";
import { updateReportCardStatusAction } from "@/app/actions/report-card-actions";

export interface ReportCardPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportCard: ReportCardData | null;
  validation: ValidationResult | null;
  onStatusUpdated?: () => void;
  canManageWorkflow?: boolean;
}

export function ReportCardPreviewModal({
  isOpen,
  onClose,
  reportCard,
  validation,
  onStatusUpdated,
  canManageWorkflow = false,
}: ReportCardPreviewModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !reportCard) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleTransition = async (targetStatus: "DRAFT" | "VALIDATED" | "PUBLISHED") => {
    setIsProcessing(true);
    setActionError(null);

    try {
      const res = await updateReportCardStatusAction({
        raporId: reportCard.id,
        siswaId: reportCard.siswa.siswaId,
        targetStatus,
      });

      if (!res.success) {
        setActionError(res.error || "Gagal mengubah status rapor.");
      } else {
        if (onStatusUpdated) {
          onStatusUpdated();
        }
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Control Bar (Non-Printable) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Pratinjau e-Rapor: {reportCard.siswa.namaLengkap}
                </h3>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    reportCard.status === "PUBLISHED"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : reportCard.status === "VALIDATED"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {reportCard.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {reportCard.siswa.rombelNama} • {reportCard.siswa.semesterNama}{" "}
                {reportCard.siswa.tahunAjaranNama}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Lembar A4</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Validation Issues Alert Banner */}
        {validation && validation.issues.length > 0 && (
          <div className="no-print px-6 py-2.5 bg-amber-950/40 border-b border-amber-800/40 flex items-start gap-2.5 text-xs text-amber-200 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-amber-300">Peringatan Integritas Nilai: </span>
              {validation.issues.map((iss, i) => (
                <span key={i} className="mr-2">
                  • {iss.pesan}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Error Banner */}
        {actionError && (
          <div className="no-print px-6 py-2.5 bg-rose-950/50 border-b border-rose-800/50 flex items-center gap-2 text-xs text-rose-300 shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Scrollable Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/50">
          <div className="max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-slate-700/50">
            <ReportCardPrintView data={reportCard} />
          </div>
        </div>

        {/* Bottom Actions Workflow Bar */}
        {canManageWorkflow && (
          <div className="no-print flex items-center justify-between px-6 py-3.5 border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-md shrink-0">
            <div className="text-xs text-slate-400">
              {reportCard.status === "DRAFT" && (
                <span>Lakukan pemeriksaan data sebelum melakukan validasi.</span>
              )}
              {reportCard.status === "VALIDATED" && (
                <span className="text-blue-400">
                  Rapor telah divalidasi dan siap diterbitkan ke portal siswa/wali.
                </span>
              )}
              {reportCard.status === "PUBLISHED" && (
                <span className="text-emerald-400">
                  Rapor telah terbit dan dapat diakses siswa & orang tua murid.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {reportCard.status !== "DRAFT" && (
                <button
                  disabled={isProcessing}
                  onClick={() => handleTransition("DRAFT")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Buka Revisi (Draft)</span>
                </button>
              )}

              {reportCard.status === "DRAFT" && (
                <button
                  disabled={isProcessing || (validation ? !validation.canValidate : false)}
                  onClick={() => handleTransition("VALIDATED")}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-blue-100 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Validasi Rapor</span>
                </button>
              )}

              {reportCard.status === "VALIDATED" && (
                <button
                  disabled={isProcessing || (validation ? !validation.canPublish : false)}
                  onClick={() => handleTransition("PUBLISHED")}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-emerald-100 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Terbitkan e-Rapor Resmi</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
