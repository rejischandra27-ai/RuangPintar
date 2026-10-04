/**
 * Ruang Pintar — Official Kurikulum Merdeka Report Card Print Route
 * Path: /rapor-siswa/cetak/[siswaId]
 *
 * Menyajikan lembar resmi e-Rapor siap cetak (A4 Portrait)
 * dengan kop sekolah resmi, tanda tangan, dan validasi tenant.
 */

import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, ShieldAlert } from "lucide-react";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { reportCardAggregationService } from "@/modules/reporting/application/report-card-aggregation-service";
import { reportCardRepository } from "@/modules/reporting/infrastructure/report-card-repository";
import { ReportCardPrintView } from "@/modules/reporting/presentation/report-card-print-view";
import { ReportCardPrintTriggerButton } from "@/modules/reporting/presentation/report-card-print-trigger-button";

export const metadata = {
  title: "Cetak e-Rapor Kurikulum Merdeka — Ruang Pintar",
  description:
    "Lembar resmi Laporan Hasil Belajar Siswa (e-Rapor Kurikulum Merdeka) siap cetak A4.",
};

export const dynamic = "force-dynamic";

interface PrintPageProps {
  params: Promise<{
    siswaId: string;
  }>;
}

export default async function ReportCardPrintPage({ params }: PrintPageProps) {
  const { siswaId } = await params;
  const user = await requireAuth();

  if (!user.sekolah_id) {
    redirect("/dashboard");
  }

  // Verifikasi otorisasi
  if (user.peran_dasar === "STUDENT") {
    const rawData = await reportCardRepository.getStudentRawAcademicData(siswaId, user.sekolah_id);
    if (!rawData || rawData.student.pengguna_id !== user.id) {
      redirect("/dashboard");
    }
  }

  let reportCard;
  try {
    reportCard = await reportCardAggregationService.aggregateStudentReportCard(
      siswaId,
      user.sekolah_id
    );
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 print:bg-white print:text-black">
      {/* Top Floating Control Bar (Non-Printable) */}
      <nav className="no-print sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/rapor-siswa"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </Link>
          <div className="text-xs">
            <span className="text-slate-400">Lembar e-Rapor: </span>
            <span className="font-semibold text-slate-200">
              {reportCard.siswa.namaLengkap} ({reportCard.siswa.rombelNama})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ReportCardPrintTriggerButton />
        </div>
      </nav>

      {/* Main Print Container */}
      <main className="py-6 px-3 sm:px-6 print:p-0">
        <div className="max-w-4xl mx-auto shadow-2xl rounded-xl overflow-hidden print:shadow-none print:rounded-none">
          <ReportCardPrintView data={reportCard} />
        </div>
      </main>
    </div>
  );
}
