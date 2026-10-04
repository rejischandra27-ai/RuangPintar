"use client";

/**
 * Ruang Pintar — M12 Class Attendance Recap Modal (Academic Glass UI v1.2)
 *
 * Modal pratinjau cepat rekapitulasi kehadiran seluruh siswa dalam satu rombel/kelas.
 */

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Loader2, AlertCircle, TableProperties, ArrowRight } from "lucide-react";
import { getClassAttendanceRecapAction } from "@/app/actions/attendance-actions";
import { ClassAttendanceRecapDTO } from "../domain/attendance-types";
import { StudentAttendanceRecapTable } from "./student-attendance-recap-table";

interface ClassAttendanceRecapModalProps {
  penugasanId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const emptySubscribe = () => () => {};

export function ClassAttendanceRecapModal({
  penugasanId,
  isOpen,
  onClose,
}: ClassAttendanceRecapModalProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recapData, setRecapData] = useState<ClassAttendanceRecapDTO | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    if (isOpen && penugasanId) {
      getClassAttendanceRecapAction(penugasanId)
        .then((res) => {
          if (!isSubscribed) return;
          if (res.success && res.data) {
            setRecapData(res.data);
            setError(null);
          } else {
            setError(res.message || "Gagal memuat rekapitulasi presensi kelas.");
          }
        })
        .catch((err) => {
          if (!isSubscribed) return;
          setError(err.message || "Terjadi kesalahan saat memuat rekap.");
        })
        .finally(() => {
          if (isSubscribed) setLoading(false);
        });
    }

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, penugasanId]);

  if (!isMounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-200/60">
              <TableProperties className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {recapData
                  ? `Rekapitulasi Presensi: ${recapData.mata_pelajaran_nama} (${recapData.rombel_nama})`
                  : "Rekapitulasi Presensi Siswa"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {recapData
                  ? `Pengampu: ${recapData.guru_nama} • Rombel: ${recapData.rombel_nama}`
                  : "Memuat informasi rombongan belajar..."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
              <p className="text-xs font-semibold">Memuat rekapitulasi presensi siswa...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && recapData && <StudentAttendanceRecapTable recap={recapData} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>

          {penugasanId && (
            <Link
              href={`/kelas-saya/${penugasanId}?tab=presensi`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
            >
              <span>Kelola Kelas Lengkap</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
