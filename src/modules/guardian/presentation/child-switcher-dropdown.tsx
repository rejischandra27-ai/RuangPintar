"use client";

/**
 * Ruang Pintar — Multi-Child Context Switcher Dropdown (M15 / Phase 16)
 * Memungkinkan orang tua yang memiliki lebih dari satu anak (multi-child)
 * untuk beralih konteks anak secara mulus di seluruh portal wali.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, ChevronDown, Check, GraduationCap, PlusCircle } from "lucide-react";
import { LinkedChildSummary } from "../domain/guardian-types";
import { switchActiveChildAction } from "@/app/actions/guardian-actions";

export interface ChildSwitcherDropdownProps {
  linkedChildren: LinkedChildSummary[];
  activeChildId: string;
}

export function ChildSwitcherDropdown({
  linkedChildren,
  activeChildId,
}: ChildSwitcherDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const activeChild = linkedChildren.find((c) => c.siswa_id === activeChildId) || linkedChildren[0];

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectChild = (childId: string) => {
    if (childId === activeChild?.siswa_id) {
      setIsOpen(false);
      return;
    }

    startTransition(async () => {
      await switchActiveChildAction(childId);
      setIsOpen(false);
      router.refresh();
    });
  };

  if (!activeChild) return null;

  // Single child display if guardian only has 1 child
  if (linkedChildren.length <= 1) {
    return (
      <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs font-semibold text-slate-700">
        <GraduationCap className="h-4 w-4 text-[#2563EB]" />
        <span>
          {activeChild.nama_lengkap} ({activeChild.rombel_nama})
        </span>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        data-testid="child-switcher-button"
        className="inline-flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-white/95 hover:bg-slate-50 border border-slate-200/90 shadow-sm text-xs font-bold text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 disabled:opacity-60 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold text-[11px]">
            {activeChild.nama_lengkap.charAt(0)}
          </div>
          <div className="text-left">
            <span className="block text-slate-900 leading-tight">{activeChild.nama_lengkap}</span>
            <span className="block text-[10px] text-slate-500 font-normal">
              {activeChild.rombel_nama} • {activeChild.jenis_hubungan}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          data-testid="child-switcher-menu"
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-slate-100 ring-1 ring-black/5 focus:outline-none z-50 p-1.5 space-y-1"
        >
          <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Pilih Putra/Putri ({linkedChildren.length} Terdaftar)
          </div>

          {linkedChildren.map((child) => {
            const isSelected = child.siswa_id === activeChild.siswa_id;
            return (
              <button
                key={child.siswa_id}
                type="button"
                onClick={() => handleSelectChild(child.siswa_id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#2563EB]/10 text-[#2563EB] font-bold"
                    : "hover:bg-slate-50 text-slate-700 font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-extrabold ${
                      isSelected ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {child.nama_lengkap.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs text-slate-900">{child.nama_lengkap}</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      NIS: {child.nis || "-"} • {child.rombel_nama}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="h-4 w-4 text-[#2563EB]" />}
              </button>
            );
          })}

          <div className="pt-1 border-t border-slate-100">
            <Link
              href="/guardian/klaim-anak"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#2563EB] hover:bg-blue-50 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Klaim Putra/Putri Lainnya</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
