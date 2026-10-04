"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { User, Power, KeyRound, ChevronDown, Shield, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth-actions";
import { Badge } from "../ui/badge";
import { AVATAR_LIST, AvatarSvgIllustration } from "@/app/onboarding/pilih-avatar/avatar-picker";

const emptySubscribe = () => () => {};

export interface UserMenuProps {
  user: {
    id: string;
    username: string;
    nama_lengkap: string;
    peran_dasar: string;
    sekolah_id?: string | null;
    foto_url?: string | null;
    avatar_id?: string | null;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
  const [isClosingModal, setIsClosingModal] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const handleCloseLogoutModal = React.useCallback(() => {
    if (process.env.NODE_ENV === "test") {
      setIsLogoutModalOpen(false);
      setIsClosingModal(false);
      return;
    }
    setIsClosingModal(true);
    setTimeout(() => {
      setIsLogoutModalOpen(false);
      setIsClosingModal(false);
    }, 200);
  }, []);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        if (isLogoutModalOpen) {
          handleCloseLogoutModal();
        }
      }
    }
    if (isOpen || isLogoutModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isLogoutModalOpen, handleCloseLogoutModal]);

  const roleLabelMap: Record<
    string,
    { label: string; variant: "cobalt" | "academic" | "success" | "info" | "warning" }
  > = {
    SUPER_ADMIN: { label: "Super Admin", variant: "academic" },
    SCHOOL_STAFF: { label: "Staf Sekolah", variant: "info" },
    TEACHER: { label: "Guru", variant: "cobalt" },
    STUDENT: { label: "Siswa", variant: "success" },
    GUARDIAN: { label: "Wali Siswa", variant: "warning" },
  };

  const roleMeta = roleLabelMap[user.peran_dasar] || {
    label: user.peran_dasar,
    variant: "cobalt",
  };
  const selectedAvatar = AVATAR_LIST.find((avatar) => avatar.id === user.avatar_id);

  // Get initials for avatar
  const initials =
    user.nama_lengkap
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || user.username.slice(0, 2).toUpperCase();

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Menu Pengguna"
        className="flex items-center gap-2 sm:gap-2.5 p-1 sm:p-1.5 sm:pl-2 sm:pr-2.5 rounded-2xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 cursor-pointer shrink-0"
      >
        <div className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full bg-gradient-to-tr from-[#1D4ED8] to-[#3B82F6] text-white text-xs font-extrabold shadow-xs overflow-hidden shrink-0 ring-1 ring-slate-200 dark:ring-slate-700">
          {user.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.foto_url} alt={user.nama_lengkap} className="size-full object-cover" />
          ) : selectedAvatar ? (
            <AvatarSvgIllustration avatar={selectedAvatar} size={32} />
          ) : (
            initials
          )}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight max-w-[140px] truncate">
            {user.nama_lengkap}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
            {roleMeta.label}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-160 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu (Academic Glass UI selaras dengan ThemeSwitcher, tanpa backdrop blur) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-1.5 shadow-2xl border border-slate-200/80 dark:border-slate-800 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Identity Header */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center gap-2.5">
            <div className="size-10 rounded-full bg-gradient-to-tr from-[#1D4ED8] to-[#3B82F6] text-white text-xs font-extrabold flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-slate-200 dark:ring-slate-700">
              {user.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.foto_url}
                  alt={user.nama_lengkap}
                  className="size-full object-cover"
                />
              ) : selectedAvatar ? (
                <AvatarSvgIllustration avatar={selectedAvatar} size={40} />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-medium text-slate-400">Akun Aktif</span>
                <Badge variant={roleMeta.variant}>{roleMeta.label}</Badge>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {user.nama_lengkap}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                @{user.username}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-0.5">
            <Link
              href="/profil"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 group cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <User className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold">Profil Saya</span>
            </Link>

            <Link
              href="/ganti-password"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 group cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <KeyRound className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold">Ganti Kata Sandi</span>
            </Link>

            <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1" />

            {/* Logout Trigger Button with Power Off Icon */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsLogoutModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 group cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-500 transition-colors">
                <Power className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold">Keluar dari Akun</span>
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal Dialog with Smooth Zoom-In / Zoom-Out */}
      {isMounted &&
        isLogoutModalOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity duration-200 ease-out ${
              isClosingModal ? "opacity-0" : "opacity-100 animate-in fade-in-0"
            }`}
            onClick={handleCloseLogoutModal}
          >
            <div
              className={`relative w-full max-w-md rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 sm:p-7 shadow-2xl border border-white/60 dark:border-slate-800 text-center flex flex-col items-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu ${
                isClosingModal
                  ? "scale-90 opacity-0"
                  : "scale-100 opacity-100 animate-in zoom-in-95 duration-200"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close X Button */}
              <button
                type="button"
                onClick={handleCloseLogoutModal}
                aria-label="Tutup Dialog"
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Warning Power Off Icon Badge */}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-100/80 dark:border-red-900/50 shadow-xs mb-4">
                <Power className="h-6 w-6" />
              </div>

              {/* Title & Description */}
              <h3
                id="logout-modal-title"
                className="text-lg font-bold text-slate-900 dark:text-white mb-1.5"
              >
                Konfirmasi Keluar
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4 max-w-xs">
                Apakah Anda yakin ingin keluar dari sesi akun Ruang Pintar? Pastikan seluruh
                pekerjaan Anda telah tersimpan.
              </p>

              {/* User Session Identity Card */}
              <div className="flex items-center gap-3 w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-750 mb-6 text-left">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#1D4ED8] to-[#3B82F6] text-white text-xs font-bold shadow-xs flex-shrink-0">
                  {initials}
                </div>
                <div className="flex flex-col overflow-hidden flex-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {user.nama_lengkap}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    @{user.username} • {roleMeta.label}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={handleCloseLogoutModal}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-[13px] font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <form action={logoutAction} className="flex-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-[13px] font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Power className="h-4 w-4" />
                    Ya, Keluar
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
