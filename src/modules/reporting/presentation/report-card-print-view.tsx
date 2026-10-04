"use client";

/**
 * Ruang Pintar — Module M18: Digital Report Card Print View
 * Kurikulum Merdeka Official A4 Layout
 *
 * Sesuai panduan resmi e-Rapor Kemendikbudristek:
 * - Kop Sekolah resmi dengan garis ganda
 * - Format A4 Portrait terstruktur
 * - Tabel Nilai Akhir & Capaian Kompetensi
 * - Rekapitulasi Presensi Semester
 * - Rekapitulasi Ekstrakurikuler
 * - Catatan Perkembangan & Saran Tindak Lanjut
 * - Pengesahan 3 Kolom: Orang Tua/Wali, Wali Kelas, Kepala Sekolah
 */

import React from "react";
import Image from "next/image";
import { ReportCardData } from "../domain/report-card-types";

export interface ReportCardPrintViewProps {
  data: ReportCardData;
}

export function ReportCardPrintView({ data }: ReportCardPrintViewProps) {
  const {
    sekolah,
    siswa,
    mataPelajaranList,
    presensi,
    ekstrakurikuler,
    catatanWaliKelas,
    saranTindakLanjut,
    status,
    tanggalCetak,
  } = data;

  return (
    <div className="report-card-print-root bg-white text-slate-900 font-serif leading-normal p-6 sm:p-10 max-w-4xl mx-auto shadow-sm print:shadow-none print:p-0 print:m-0 print:max-w-none text-xs sm:text-sm">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Draft / Watermark Notice for non-published reports */}
      {status !== "PUBLISHED" && (
        <div className="no-print mb-4 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 flex items-center justify-between text-xs font-sans">
          <div className="flex items-center gap-2">
            <span className="font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-800">
              {status}
            </span>
            <span>
              Dokumen ini masih berstatus <strong>{status}</strong> dan belum merupakan salinan
              e-Rapor resmi terpublikasi.
            </span>
          </div>
          <span className="text-[11px] text-amber-700">Ruang Pintar e-Rapor Engine</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. KOP SURAT SEKOLAH                                                      */}
      {/* ========================================================================= */}
      <div className="border-b-4 border-double border-slate-900 pb-3 mb-4 flex items-center gap-4">
        {sekolah.logoUrl ? (
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
            <Image
              src={sekolah.logoUrl}
              alt="Logo Sekolah"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-slate-400 flex items-center justify-center font-bold text-lg text-slate-700 shrink-0">
            RP
          </div>
        )}
        <div className="flex-1 text-center font-sans">
          <h3 className="text-xs uppercase tracking-widest text-slate-600">
            Pemerintah Provinsi {sekolah.provinsi || "DKI Jakarta"}
          </h3>
          <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-slate-950">
            {sekolah.sekolahNama}
          </h1>
          <p className="text-[11px] text-slate-600 mt-0.5">
            NPSN: {sekolah.npsn} {sekolah.alamat ? `• ${sekolah.alamat}` : ""}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
            Laporan Hasil Belajar Siswa (e-Rapor Kurikulum Merdeka)
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. IDENTITAS SISWA & ROMBEL                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-5 font-sans text-xs border border-slate-300 p-3 rounded bg-slate-50/50">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-slate-600">Nama Peserta Didik</span>
            <span className="mr-2">:</span>
            <span className="font-semibold text-slate-900 uppercase">{siswa.namaLengkap}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-600">NIS / NISN</span>
            <span className="mr-2">:</span>
            <span className="text-slate-800">
              {siswa.nis || "-"} / {siswa.nisn || "-"}
            </span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-600">Kelas / Rombel</span>
            <span className="mr-2">:</span>
            <span className="text-slate-800 font-medium">{siswa.rombelNama}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-slate-600">Fase / Tingkat</span>
            <span className="mr-2">:</span>
            <span className="text-slate-800">{siswa.tingkatNama}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-600">Semester</span>
            <span className="mr-2">:</span>
            <span className="text-slate-800">{siswa.semesterNama}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-600">Tahun Ajaran</span>
            <span className="mr-2">:</span>
            <span className="text-slate-800">{siswa.tahunAjaranNama}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TABEL NILAI AKADEMIK & CAPAIAN KOMPETENSI                             */}
      {/* ========================================================================= */}
      <div className="mb-5">
        <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5 flex items-center justify-between">
          <span>A. Capaian Hasil Belajar Mata Pelajaran</span>
          <span className="text-[10px] font-normal text-slate-500">Standar KKTP: 75</span>
        </h4>
        <table className="w-full border-collapse border border-slate-400 font-sans text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-850 text-center font-semibold">
              <th className="border border-slate-400 px-2 py-1.5 w-8">No</th>
              <th className="border border-slate-400 px-2 py-1.5 text-left w-48">Mata Pelajaran</th>
              <th className="border border-slate-400 px-1 py-1.5 w-12 text-center">Nilai Akhir</th>
              <th className="border border-slate-400 px-1 py-1.5 w-12 text-center">Predikat</th>
              <th className="border border-slate-400 px-2 py-1.5 text-left">Capaian Kompetensi</th>
            </tr>
          </thead>
          <tbody>
            {mataPelajaranList.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border border-slate-400 text-center py-4 text-slate-500 italic"
                >
                  Belum ada mata pelajaran terdaftar pada rombel ini.
                </td>
              </tr>
            ) : (
              mataPelajaranList.map((mapel, idx) => (
                <tr key={mapel.mataPelajaranId} className="align-top hover:bg-slate-50">
                  <td className="border border-slate-400 px-2 py-1.5 text-center font-medium">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-400 px-2 py-1.5">
                    <div className="font-semibold text-slate-900">{mapel.mataPelajaranNama}</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Guru: {mapel.guruNama}
                    </div>
                  </td>
                  <td className="border border-slate-400 px-1 py-1.5 text-center font-bold text-slate-900">
                    {mapel.nilaiAkhir !== null ? (
                      mapel.nilaiAkhir
                    ) : (
                      <span className="text-amber-600 font-medium italic text-[11px]">-</span>
                    )}
                  </td>
                  <td className="border border-slate-400 px-1 py-1.5 text-center font-bold">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                        mapel.predikat === "A"
                          ? "text-emerald-700 bg-emerald-50"
                          : mapel.predikat === "B"
                            ? "text-blue-700 bg-blue-50"
                            : mapel.predikat === "C"
                              ? "text-amber-700 bg-amber-50"
                              : mapel.predikat === "D"
                                ? "text-rose-700 bg-rose-50"
                                : "text-slate-400"
                      }`}
                    >
                      {mapel.predikat}
                    </span>
                  </td>
                  <td className="border border-slate-400 px-2 py-1.5 text-[11px] leading-relaxed text-slate-700">
                    <p className="mb-0.5">{mapel.deskripsiCapaianTertinggi}</p>
                    {mapel.deskripsiPerluPeningkatan && (
                      <p className="text-slate-500 italic">{mapel.deskripsiPerluPeningkatan}</p>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 4. EKSTRAKURIKULER & PRESENSI (2 KOLOM COMPACT)                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 avoid-break">
        {/* Ekstrakurikuler */}
        <div>
          <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5">
            B. Kegiatan Ekstrakurikuler
          </h4>
          <table className="w-full border-collapse border border-slate-400 font-sans text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-left font-semibold">
                <th className="border border-slate-400 px-2 py-1 w-8 text-center">No</th>
                <th className="border border-slate-400 px-2 py-1">Kegiatan</th>
                <th className="border border-slate-400 px-2 py-1 w-20 text-center">Predikat</th>
                <th className="border border-slate-400 px-2 py-1">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {ekstrakurikuler.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="border border-slate-400 text-center py-2 text-slate-400 italic text-[11px]"
                  >
                    Belum mengikuti kegiatan ekstrakurikuler semester ini.
                  </td>
                </tr>
              ) : (
                ekstrakurikuler.map((ekskul, i) => (
                  <tr key={ekskul.id || i} className="align-top">
                    <td className="border border-slate-400 px-2 py-1 text-center">{i + 1}</td>
                    <td className="border border-slate-400 px-2 py-1 font-medium">{ekskul.nama}</td>
                    <td className="border border-slate-400 px-2 py-1 text-center font-semibold text-slate-800">
                      {ekskul.predikat}
                    </td>
                    <td className="border border-slate-400 px-2 py-1 text-[11px] text-slate-600">
                      {ekskul.deskripsi}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Presensi Semester */}
        <div>
          <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5">
            C. Ketidakhadiran Semester
          </h4>
          <table className="w-full border-collapse border border-slate-400 font-sans text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-left font-semibold">
                <th className="border border-slate-400 px-2 py-1">Alasan Ketidakhadiran</th>
                <th className="border border-slate-400 px-2 py-1 w-28 text-center">Jumlah Hari</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-400 px-2 py-1">Sakit (S)</td>
                <td className="border border-slate-400 px-2 py-1 text-center font-medium">
                  {presensi.sakit} hari
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1">Izin (I)</td>
                <td className="border border-slate-400 px-2 py-1 text-center font-medium">
                  {presensi.izin} hari
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2 py-1">Tanpa Keterangan (A)</td>
                <td className="border border-slate-400 px-2 py-1 text-center font-medium">
                  {presensi.tanpaKeterangan} hari
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. CATATAN WALI KELAS & SARAN TINDAK LANJUT                               */}
      {/* ========================================================================= */}
      <div className="mb-6 avoid-break">
        <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-slate-800 mb-1.5">
          D. Catatan Perkembangan Karakter & Saran Tindak Lanjut
        </h4>
        <div className="border border-slate-400 p-3 rounded font-sans text-xs space-y-2 bg-slate-50/30">
          <div>
            <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wide mb-0.5">
              Catatan Wali Kelas:
            </span>
            <p className="text-slate-700 leading-relaxed italic">{catatanWaliKelas}</p>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wide mb-0.5">
              Saran & Rekomendasi:
            </span>
            <p className="text-slate-700 leading-relaxed italic">{saranTindakLanjut}</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. KOLOM TANDA TANGAN RESMI (3 KOLOM)                                     */}
      {/* ========================================================================= */}
      <div className="avoid-break font-sans text-xs pt-2">
        <div className="text-right text-slate-700 mb-4">
          <span>{sekolah.kabupatenKota || "Jakarta"}, </span>
          <span>{tanggalCetak}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          {/* Kolom 1: Orang Tua / Wali */}
          <div className="flex flex-col justify-between h-28">
            <span className="text-slate-700">
              Mengetahui,
              <br />
              Orang Tua / Wali Murid,
            </span>
            <div>
              <div className="border-b border-slate-500 w-36 mx-auto mb-1"></div>
              <span className="text-[11px] text-slate-500">
                ( ............................................ )
              </span>
            </div>
          </div>

          {/* Kolom 2: Wali Kelas */}
          <div className="flex flex-col justify-between h-28">
            <span className="text-slate-700">Wali Kelas,</span>
            <div>
              <div className="font-bold underline text-slate-900">{siswa.waliKelasNama}</div>
              <span className="text-[11px] text-slate-600">NIP. {siswa.waliKelasNip || "—"}</span>
            </div>
          </div>

          {/* Kolom 3: Kepala Sekolah */}
          <div className="flex flex-col justify-between h-28">
            <span className="text-slate-700">Kepala Sekolah,</span>
            <div>
              <div className="font-bold underline text-slate-900">{sekolah.kepalaSekolahNama}</div>
              <span className="text-[11px] text-slate-600">
                NIP. {sekolah.kepalaSekolahNip || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
