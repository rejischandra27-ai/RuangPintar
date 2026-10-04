"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { saveTeacherAvatarAction } from "@/app/actions/teacher-onboarding-actions";

export interface AvatarOption {
  id: string;
  name: string;
  title: string;
  badgeColor: string;
  ringColor: string;
  bgGradient: string;
  helmetColor: string;
  visorGradient: string;
  accentSymbol: string;
}

export const AVATAR_LIST: AvatarOption[] = [
  {
    id: "kapten-kosmik",
    name: "Kapten Kosmik",
    title: "Pemimpin Misi Belajar",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    ringColor: "ring-blue-600 shadow-blue-500/25",
    bgGradient: "from-blue-600 via-indigo-600 to-slate-900",
    helmetColor: "#FFFFFF",
    visorGradient: "from-amber-300 via-amber-400 to-amber-500",
    accentSymbol: "🚀",
  },
  {
    id: "insinyur-orbit",
    name: "Insinyur Orbit",
    title: "Pakar Teknologi & Data",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    ringColor: "ring-emerald-600 shadow-emerald-500/25",
    bgGradient: "from-emerald-600 via-teal-700 to-slate-900",
    helmetColor: "#F1F5F9",
    visorGradient: "from-cyan-300 via-teal-400 to-emerald-500",
    accentSymbol: "🛰️",
  },
  {
    id: "profesor-nebula",
    name: "Profesor Nebula",
    title: "Penyelidik Kurikulum",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    ringColor: "ring-purple-600 shadow-purple-500/25",
    bgGradient: "from-purple-600 via-violet-700 to-slate-900",
    helmetColor: "#F8FAFC",
    visorGradient: "from-fuchsia-300 via-pink-400 to-purple-600",
    accentSymbol: "🦉",
  },
  {
    id: "pionir-surya",
    name: "Pionir Surya",
    title: "Pelopor Inovasi Kelas",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    ringColor: "ring-amber-500 shadow-amber-500/25",
    bgGradient: "from-amber-500 via-orange-600 to-slate-900",
    helmetColor: "#FFFFFF",
    visorGradient: "from-yellow-200 via-amber-400 to-orange-500",
    accentSymbol: "☀️",
  },
  {
    id: "navigator-bintang",
    name: "Navigator Bintang",
    title: "Pemandu Sukses Siswa",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-200",
    ringColor: "ring-sky-500 shadow-sky-500/25",
    bgGradient: "from-sky-500 via-cyan-600 to-slate-900",
    helmetColor: "#F1F5F9",
    visorGradient: "from-blue-200 via-sky-300 to-indigo-500",
    accentSymbol: "🌠",
  },
  {
    id: "kadet-galaksi",
    name: "Kadet Galaksi",
    title: "Penjelajah Antariksa",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    ringColor: "ring-rose-500 shadow-rose-500/25",
    bgGradient: "from-rose-500 via-pink-600 to-slate-900",
    helmetColor: "#FFFFFF",
    visorGradient: "from-rose-200 via-pink-300 to-rose-500",
    accentSymbol: "🪐",
  },
];

export function AvatarSvgIllustration({
  avatar,
  size = 64,
}: {
  avatar: AvatarOption;
  size?: number;
}) {
  return (
    <div
      className={`relative rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-gradient-to-br ${avatar.bgGradient} shadow-md`}
      style={{ width: size, height: size }}
    >
      {/* Background Star field dots */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-2 left-2 size-1 bg-white rounded-full animate-pulse" />
        <div className="absolute top-4 right-3 size-0.5 bg-white rounded-full" />
        <div className="absolute bottom-3 left-4 size-0.5 bg-white rounded-full" />
      </div>

      {/* Stylized Vector Astronaut Helmet */}
      <svg
        viewBox="0 0 100 100"
        className="size-4/5 drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Antenna */}
        <circle cx="50" cy="14" r="4" fill="#E2E8F0" />
        <line
          x1="50"
          y1="18"
          x2="50"
          y2="26"
          stroke="#CBD5E1"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Helmet Outer Shell */}
        <rect
          x="20"
          y="24"
          width="60"
          height="54"
          rx="24"
          fill={avatar.helmetColor}
          stroke="#94A3B8"
          strokeWidth="2"
        />

        {/* Visor */}
        <rect
          x="28"
          y="32"
          width="44"
          height="32"
          rx="12"
          fill="url(#visor-grad)"
          className="transition-all"
        />

        {/* Visor Glare / Reflection */}
        <path
          d="M32 38C34 35 38 34 42 34C38 38 36 44 34 50C33 48 32 44 32 38Z"
          fill="white"
          fillOpacity="0.6"
        />

        {/* Helmet Cheek Accents */}
        <circle cx="23" cy="54" r="2.5" fill="#64748B" />
        <circle cx="77" cy="54" r="2.5" fill="#64748B" />

        {/* Neck / Collar */}
        <path
          d="M34 76C34 74 42 73 50 73C58 73 66 74 66 76V82C66 84 58 85 50 85C42 85 34 84 34 82V76Z"
          fill="#CBD5E1"
        />

        {/* Visor Gradient Defs */}
        <defs>
          <linearGradient
            id="visor-grad"
            x1="28"
            y1="32"
            x2="72"
            y2="64"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#38BDF8" />
            <stop offset="0.5" stopColor="#0284C7" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating Badge Symbol */}
      <span className="absolute bottom-0.5 right-0.5 text-xs bg-white/90 rounded-full size-5 flex items-center justify-center shadow-xs">
        {avatar.accentSymbol}
      </span>
    </div>
  );
}

export function AvatarPicker({ initialAvatarId }: { initialAvatarId: string }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(initialAvatarId);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleContinue = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    const result = await saveTeacherAvatarAction(selectedId);
    setIsSaving(false);
    if (!result.success) {
      setErrorMessage(result.error ?? "Avatar belum dapat disimpan.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  };

  const handleSkip = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    const result = await saveTeacherAvatarAction("kapten-kosmik");
    setIsSaving(false);
    if (!result.success) {
      setErrorMessage(result.error ?? "Avatar default belum dapat disimpan.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Header Controls: Skip Option */}
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-semibold text-slate-500">
          Pilih salah satu karakter (bisa diubah nanti)
        </span>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isSaving}
          className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          Lewati dengan Avatar Default
        </button>
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          {errorMessage}
        </p>
      )}

      {/* 2x3 Grid of Astronaut Avatars */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3.5">
        {AVATAR_LIST.map((avatar) => {
          const isSelected = selectedId === avatar.id;
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => handleSelect(avatar.id)}
              disabled={isSaving}
              className={`group relative flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                isSelected
                  ? `bg-white border-blue-500 ring-2 ${avatar.ringColor} shadow-lg scale-[1.02]`
                  : "bg-white/80 hover:bg-white border-slate-200/80 hover:border-slate-300 shadow-xs"
              }`}
            >
              {/* Checkmark indicator badge */}
              {isSelected && (
                <div className="absolute top-2 right-2 size-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm animate-in zoom-in-50 duration-150">
                  <Check className="size-3 stroke-[3]" />
                </div>
              )}

              <div className="mb-2.5">
                <AvatarSvgIllustration avatar={avatar} size={58} />
              </div>

              <div className="font-bold text-xs sm:text-sm text-[#0F172A] tracking-tight group-hover:text-blue-600 transition-colors">
                {avatar.name}
              </div>

              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{avatar.title}</div>
            </button>
          );
        })}
      </div>

      {/* Continue Action */}
      <div className="flex flex-col gap-2.5 pt-2">
        <button
          type="button"
          onClick={handleContinue}
          disabled={isSaving}
          className="h-11 sm:h-12 w-full flex items-center justify-center gap-2 rounded-xl bg-[#1E293B] hover:bg-[#2B3B52] active:scale-[0.99] text-white font-semibold text-sm sm:text-base shadow-md shadow-slate-900/10 focus:outline-none focus:ring-3 focus:ring-slate-900/20 transition-all cursor-pointer"
        >
          <span>{isSaving ? "Menyimpan..." : "Simpan Avatar & Lanjutkan"}</span>
          <ArrowRight className="size-4 sm:size-5" />
        </button>

        <p className="text-center text-[11px] text-slate-500">
          Avatar ini akan tampil pada profil, kartu presensi, dan forum sekolah Anda.
        </p>
      </div>
    </div>
  );
}
