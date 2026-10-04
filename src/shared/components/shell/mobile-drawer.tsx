"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  Calendar,
  Users,
  GraduationCap,
  FileCheck,
  BookOpen,
  Award,
  UserCheck,
  TrendingUp,
  Layers,
  UserSquare2,
  BarChart3,
  Settings,
  ShieldAlert,
  Building2,
  Sparkles,
  Megaphone,
  CalendarDays,
  Plug,
  PlayCircle,
  School,
  LucideIcon,
} from "lucide-react";
import { BaseRole, CapabilityBundle } from "@/shared/infrastructure/authorization/types";
import { getFilteredNavigation } from "./navigation-config";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Calendar,
  Users,
  GraduationCap,
  FileCheck,
  BookOpen,
  Award,
  UserCheck,
  TrendingUp,
  Layers,
  UserSquare2,
  BarChart3,
  Settings,
  ShieldAlert,
  Building2,
  Sparkles,
  Megaphone,
  CalendarDays,
  Plug,
  PlayCircle,
  School,
};

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: BaseRole;
  userCapabilities?: CapabilityBundle[];
  isOwner?: boolean;
}

export function MobileDrawer({
  isOpen,
  onClose,
  userRole,
  userCapabilities = [],
  isOwner = false,
}: MobileDrawerProps) {
  const pathname = usePathname();
  const navigationGroups = getFilteredNavigation(userRole, userCapabilities, isOwner);

  // Close drawer when route changes
  React.useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 md:hidden flex"
      role="dialog"
      aria-modal="true"
      aria-label="Menu Navigasi Mobile"
    >
      {/* Backdrop with soft blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer panel */}
      <div className="relative flex flex-col w-[290px] max-w-[85vw] bg-gradient-to-b from-[#1D4ED8] via-[#2563EB] to-[#1E40AF] text-white h-full shadow-2xl z-10 animate-in slide-in-from-left duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm p-1">
              <Image
                src="/images/brand/ruang-pintar-mark.png"
                alt="Logo Ruang Pintar"
                width={24}
                height={24}
                className="h-auto w-auto object-contain"
              />
            </div>
            <span className="text-sm font-bold text-white">Ruang Pintar</span>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup Menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer min-h-[44px] min-w-[44px]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
          {navigationGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold text-blue-200/75 uppercase tracking-wider mb-1">
                {group.title}
              </h4>
              <nav aria-label={group.title} className="space-y-0.5">
                {group.items.map((item) => {
                  const IconComponent = ICON_MAP[item.iconName] || LayoutDashboard;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors min-h-[44px] ${
                        isActive
                          ? "bg-white text-[#0F172A] font-bold shadow-md"
                          : "text-blue-100/90 hover:bg-white/10 hover:text-white"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <IconComponent
                        className={`h-4 w-4 flex-shrink-0 ${
                          isActive ? "text-[#2563EB]" : "text-blue-200"
                        }`}
                      />
                      <span className="truncate flex-1">{item.title}</span>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                            isActive ? "bg-blue-100 text-blue-700" : "bg-white/15 text-white"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
