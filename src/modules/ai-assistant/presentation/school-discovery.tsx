"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, MapPin, Search } from "lucide-react";
import { searchSchoolsAction } from "@/app/actions/smart-onboarding-actions";
import { Input } from "@/shared/components/ui/input";
import { TeacherSchoolRegistrationChoice } from "../domain/ai-types";

type SchoolSearchResult = {
  id: string;
  nama: string;
  jenjang: string;
  lokasi: string | null;
  npsn: string | null;
};

const JENJANG_OPTIONS = ["SD", "SMP", "SMA", "SMK", "UMUM"] as const;

export function SchoolDiscovery({
  selectedChoice,
  onSelect,
}: {
  selectedChoice: TeacherSchoolRegistrationChoice | null;
  onSelect: (choice: TeacherSchoolRegistrationChoice | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [newSchoolName, setNewSchoolName] = useState("");
  const [jenjang, setJenjang] = useState<(typeof JENJANG_OPTIONS)[number]>("UMUM");
  const [schools, setSchools] = useState<SchoolSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const term = query.trim();
    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setSchools([]);
        setHasSearched(false);
        setSearchError(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(false);
      setSearchError(null);
      const result = await searchSchoolsAction(term);
      if (!current) return;
      setIsSearching(false);
      setHasSearched(true);
      if (!result.success || !result.data) {
        setSearchError(result.error || "Pencarian sekolah gagal.");
        setSchools([]);
        return;
      }
      setSchools(result.data);
    }, 300);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setNewSchoolName(value);
    onSelect(null);
  };
  const selectedNewSchool =
    selectedChoice && "nama_sekolah" in selectedChoice ? selectedChoice : null;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="school-discovery-title">
      <div>
        <h2 id="school-discovery-title" className="text-sm font-bold text-slate-900 lg:text-lg">
          Cari Sekolah
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-600 lg:text-sm">
          Cari dengan nama sekolah atau NPSN. Jika belum terdaftar, buat profil sekolah baru.
        </p>
      </div>

      <label className="relative block">
        <span className="sr-only">Nama sekolah atau NPSN</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
        />
        <Input
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Nama sekolah atau NPSN"
          autoComplete="off"
          className="h-11 rounded-lg border-slate-300 bg-white pl-10 text-sm text-slate-900 placeholder:text-slate-500 lg:h-12 lg:text-base"
        />
      </label>

      {isSearching && (
        <p className="flex min-h-10 items-center gap-2 text-sm text-slate-600" role="status">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Mencari sekolah...
        </p>
      )}

      {searchError && (
        <p className="text-sm text-rose-700" role="alert">
          {searchError}
        </p>
      )}

      {hasSearched && schools.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {schools.map((school) => (
            <li
              key={school.id}
              className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-6 lg:p-5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 lg:break-words lg:text-base">
                  {school.nama}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 lg:hidden">
                  <span>{school.jenjang}</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                    {school.lokasi
                      ? `Kota/Kabupaten: ${school.lokasi}`
                      : "Kota/Kabupaten belum tersedia"}
                  </span>
                  {school.npsn && <span>NPSN {school.npsn}</span>}
                </div>
                <div className="mt-1 hidden lg:block">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-700">
                    <span>{school.jenjang}</span>
                    <span aria-hidden="true" className="text-slate-400">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" />
                      {school.lokasi || "Kota/Kabupaten belum tersedia"}
                    </span>
                  </p>
                  {school.npsn && (
                    <p className="mt-1.5 text-xs text-slate-500">NPSN {school.npsn}</p>
                  )}
                </div>
              </div>
              <div className="w-full sm:w-auto lg:border-l lg:border-slate-200 lg:pl-6">
                <button
                  type="button"
                  onClick={() => onSelect({ sekolah_id: school.id })}
                  aria-pressed={
                    selectedChoice !== null &&
                    "sekolah_id" in selectedChoice &&
                    selectedChoice.sekolah_id === school.id
                  }
                  className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-blue-700 px-4 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:w-auto lg:min-w-48 lg:px-5"
                >
                  <Building2 aria-hidden="true" className="size-4" />
                  {selectedChoice !== null &&
                  "sekolah_id" in selectedChoice &&
                  selectedChoice.sekolah_id === school.id
                    ? "Sekolah dipilih"
                    : "Ajukan Bergabung"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasSearched && !isSearching && schools.length === 0 && !searchError && (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Sekolah belum ditemukan</p>
          <p className="text-xs leading-relaxed text-slate-600">
            Buat sekolah baru dengan nama dan jenjang. Tidak ada data lain yang diperlukan.
          </p>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-800">
            Nama Sekolah
            <Input
              value={newSchoolName}
              onChange={(event) => setNewSchoolName(event.target.value)}
              maxLength={120}
              className="h-11 rounded-lg border-slate-300 bg-white text-sm font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-800">
            Jenjang
            <select
              value={jenjang}
              onChange={(event) =>
                setJenjang(event.target.value as (typeof JENJANG_OPTIONS)[number])
              }
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              {JENJANG_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => onSelect({ nama_sekolah: newSchoolName.trim(), jenjang })}
            disabled={newSchoolName.trim().length < 3}
            aria-pressed={
              selectedNewSchool?.nama_sekolah === newSchoolName.trim() &&
              selectedNewSchool?.jenjang === jenjang
            }
            className="min-h-11 rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buat Sekolah Baru
          </button>
        </div>
      )}

      {!hasSearched && query.trim().length < 2 && (
        <p className="text-xs text-slate-500">Masukkan minimal 2 karakter untuk mulai mencari.</p>
      )}

      {selectedChoice && (
        <p className="text-xs font-medium text-blue-800" role="status">
          {"sekolah_id" in selectedChoice
            ? "Sekolah untuk keanggotaan sudah dipilih."
            : `Sekolah baru: ${selectedChoice.nama_sekolah} (${selectedChoice.jenjang}).`}
        </p>
      )}
    </section>
  );
}
