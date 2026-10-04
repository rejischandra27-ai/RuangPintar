"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
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
  ChevronLeft,
  HelpCircle,
  Sparkles,
  Megaphone,
  School,
  Presentation,
  PlayCircle,
  CalendarDays,
  FileSpreadsheet,
  MonitorPlay,
  Plug,
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
  School,
  Presentation,
  PlayCircle,
  CalendarDays,
  FileSpreadsheet,
  MonitorPlay,
  Plug,
};

export interface SidebarProps {
  userRole: BaseRole;
  userCapabilities?: CapabilityBundle[];
  isOwner?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isSubscribed?: boolean;
  className?: string;
}

export function Sidebar({
  userRole,
  userCapabilities = [],
  isOwner = false,
  isCollapsed,
  onToggleCollapse,
  isSubscribed = false,
  className = "",
}: SidebarProps) {
  const pathname = usePathname();
  const navigationGroups = getFilteredNavigation(userRole, userCapabilities, isOwner);

  return (
    <aside
      aria-label="Navigasi Utama"
      className={`hidden md:flex flex-col bg-gradient-to-b from-[#1D4ED8] via-[#2563EB] to-[#1E40AF] text-white transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] z-30 select-none flex-shrink-0 relative ${
        isCollapsed ? "w-18" : "w-18 xl:w-64"
      } ${className}`}
    >
      {/* Brand Header */}
      <div
        className={`flex h-20 items-center gap-3.5 flex-shrink-0 ${isCollapsed ? "justify-center px-0" : "justify-center xl:justify-start px-0 xl:px-5"}`}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-3 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-xl"
          aria-label="Beranda Ruang Pintar"
        >
          <div
            className={`flex items-center justify-center bg-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] p-1.5 flex-shrink-0 ${
              isCollapsed ? "h-11 w-11 rounded-full" : "h-10 w-10 rounded-full xl:rounded-xl"
            }`}
          >
            <Image
              src="/images/brand/ruang-pintar-mark.png"
              alt="Logo Ruang Pintar"
              width={26}
              height={26}
              priority
              className="h-auto w-auto object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="hidden xl:flex flex-col overflow-hidden">
              <span className="text-base font-bold text-white tracking-tight leading-tight truncate">
                Ruang Pintar
              </span>
              <span className="text-[11px] text-blue-200/90 font-medium tracking-wide leading-tight truncate">
                Academic Learning Platform
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2 pb-4 space-y-4 no-scrollbar">
        {navigationGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {!isCollapsed && (
              <h4 className="hidden xl:block px-5 text-[10px] font-bold text-blue-200/75 uppercase tracking-wider mb-1 truncate">
                {group.title}
              </h4>
            )}
            <nav aria-label={group.title} className="space-y-0.5">
              {group.items.map((item) => {
                const IconComponent = ICON_MAP[item.iconName] || LayoutDashboard;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <div key={item.id} className="relative group">
                    <Link
                      href={item.href}
                      className={`flex items-center transition-all duration-150 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                        isActive
                          ? isCollapsed
                            ? "ml-3 mr-0 pl-0 pr-0 justify-center bg-[#F8FAFC] dark:bg-[#090D16] text-[#2563EB] dark:text-blue-400 font-bold rounded-l-2xl relative z-10 shadow-[-2px_0_10px_rgba(0,0,0,0.03)]"
                            : "ml-3 xl:ml-3.5 mr-0 pl-0 xl:pl-3.5 pr-0 xl:pr-3.5 justify-center xl:justify-start bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-white font-bold rounded-l-2xl relative z-10 shadow-[-2px_0_10px_rgba(0,0,0,0.03)] gap-0 xl:gap-3"
                          : isCollapsed
                            ? "mx-3 p-3 justify-center rounded-xl text-blue-100/90 hover:bg-white/10 hover:text-white font-medium"
                            : "mx-3 xl:mx-3.5 px-0 xl:px-3.5 py-3 justify-center xl:justify-start rounded-xl text-blue-100/90 hover:bg-white/10 hover:text-white font-medium gap-0 xl:gap-3"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {/* Curved Notch Top & Bottom for Active State */}
                      {isActive && (
                        <>
                          <span
                            aria-hidden="true"
                            className="absolute -top-5 right-0 w-5 h-5 bg-transparent pointer-events-none rounded-br-2xl shadow-[8px_8px_0_0_#F8FAFC] dark:shadow-[8px_8px_0_0_#090D16]"
                          />
                          <span
                            aria-hidden="true"
                            className="absolute -bottom-5 right-0 w-5 h-5 bg-transparent pointer-events-none rounded-tr-2xl shadow-[8px_-8px_0_0_#F8FAFC] dark:shadow-[8px_-8px_0_0_#090D16]"
                          />
                        </>
                      )}

                      <IconComponent
                        className={`h-5 w-5 flex-shrink-0 transition-colors ${
                          isActive ? "text-[#2563EB]" : "text-blue-200/90 group-hover:text-white"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="hidden xl:inline truncate flex-1 text-xs sm:text-[13px]">
                          {item.title}
                        </span>
                      )}
                      {!isCollapsed && item.badge && (
                        <span
                          className={`hidden xl:inline text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                            isActive ? "bg-blue-100 text-blue-700" : "bg-white/15 text-white"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>

                    {/* Accessible Hover Tooltip for Compact Rail */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-160 pointer-events-none">
                      <span>{item.title}</span>
                      {item.badge && <span className="text-[10px] opacity-75">({item.badge})</span>}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        ))}

        {/* Promo Upgrade Card in Sidebar: HANYA tampil untuk Guru Mandiri (Solo Teacher) yang belum berlangganan, bukan untuk Super Admin atau guru sekolah mitra berlisensi */}
        {!isCollapsed && !isSubscribed && userRole === "TEACHER" && Boolean(isOwner) && (
          <div className="hidden xl:flex mx-3.5 my-3 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-[0_8px_20px_rgba(0,0,0,0.06)] flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 text-white">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-white leading-tight">
                  Tingkatkan Pengalaman
                </span>
                <span className="text-[10px] text-blue-100/80 leading-tight truncate">
                  Temukan fitur premium sekolah.
                </span>
              </div>
            </div>
            <button
              type="button"
              className="w-full mt-1 py-2 rounded-xl bg-white text-[#2563EB] hover:bg-blue-50 text-xs font-bold shadow-sm transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Footer Area: Help Center */}
      <div className="p-2 sm:p-3 border-t border-white/10 flex flex-col gap-1 flex-shrink-0">
        <Link
          href="#"
          aria-label="Pusat Bantuan"
          title="Pusat Bantuan"
          className={`flex items-center gap-3 rounded-xl text-xs font-medium text-blue-100/85 hover:bg-white/10 hover:text-white transition-colors min-h-[40px] ${
            isCollapsed
              ? "justify-center p-2"
              : "justify-center xl:justify-start p-2 xl:px-3 xl:py-2.5"
          }`}
        >
          <HelpCircle className="h-4 w-4 text-blue-200/90 flex-shrink-0" />
          {!isCollapsed && <span className="hidden xl:inline truncate flex-1">Pusat Bantuan</span>}
        </Link>
      </div>
    </aside>
  );
}
