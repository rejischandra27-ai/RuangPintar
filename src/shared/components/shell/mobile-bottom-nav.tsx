"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  PlayCircle,
  CalendarDays,
  UserCheck,
  TrendingUp,
  UserSquare2,
  Layers,
  GraduationCap,
  Building2,
  Menu,
  School,
  LucideIcon,
} from "lucide-react";
import { BaseRole, CapabilityBundle } from "@/shared/infrastructure/authorization/types";

export interface MobileBottomNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface MobileBottomNavProps {
  userRole: BaseRole;
  userCapabilities?: CapabilityBundle[];
  isOwner?: boolean;
  onOpenMenu: () => void;
  className?: string;
}

export function getMobileBottomNavItems(
  userRole: BaseRole,
  userCapabilities: CapabilityBundle[] = [],
  isOwner: boolean = false
): MobileBottomNavItem[] {
  switch (userRole) {
    case "TEACHER":
      if (isOwner) {
        return [
          { id: "home", label: "Beranda", href: "/dashboard", icon: LayoutDashboard },
          { id: "classes", label: "Kelas", href: "/kelas-saya", icon: School },
          { id: "students", label: "Siswa", href: "/data-siswa", icon: UserSquare2 },
          { id: "schedule", label: "Jadwal", href: "/jadwal-saya", icon: Calendar },
        ];
      }
      return [
        { id: "home", label: "Beranda", href: "/dashboard", icon: LayoutDashboard },
        { id: "schedule", label: "Jadwal", href: "/jadwal-saya", icon: Calendar },
        { id: "classes", label: "Kelas", href: "/kelas-saya", icon: School },
        { id: "sessions", label: "Sesi KBM", href: "/sesi-pembelajaran", icon: PlayCircle },
      ];

    case "SUPER_ADMIN":
      return [
        { id: "home", label: "Beranda", href: "/dashboard", icon: LayoutDashboard },
        { id: "students", label: "Siswa", href: "/data-siswa", icon: UserSquare2 },
        { id: "academic", label: "Akademik", href: "/struktur-akademik", icon: Layers },
        { id: "teachers", label: "Guru", href: "/guru-pengajaran", icon: GraduationCap },
      ];

    case "SCHOOL_STAFF": {
      const items: MobileBottomNavItem[] = [
        { id: "home", label: "Beranda", href: "/dashboard", icon: LayoutDashboard },
      ];
      if (userCapabilities.includes("STUDENT_DATA_OPERATOR")) {
        items.push({ id: "students", label: "Siswa", href: "/data-siswa", icon: UserSquare2 });
      }
      if (userCapabilities.includes("ACADEMIC_OPERATOR")) {
        items.push({ id: "academic", label: "Akademik", href: "/struktur-akademik", icon: Layers });
        if (items.length < 4) {
          items.push({
            id: "teachers",
            label: "Guru",
            href: "/guru-pengajaran",
            icon: GraduationCap,
          });
        }
      }
      if (items.length < 4) {
        items.push({ id: "school", label: "Sekolah", href: "/sekolah", icon: Building2 });
      }
      return items.slice(0, 4);
    }

    case "STUDENT":
      return [
        { id: "home", label: "Beranda", href: "/dashboard", icon: LayoutDashboard },
        { id: "schedule", label: "Jadwal", href: "/jadwal-saya", icon: Calendar },
        { id: "calendar", label: "Kalender", href: "/kalender-akademik", icon: CalendarDays },
      ];

    case "GUARDIAN":
      return [
        { id: "home", label: "Beranda", href: "/dashboard", icon: LayoutDashboard },
        { id: "attendance", label: "Presensi", href: "/presensi-anak", icon: UserCheck },
        { id: "grades", label: "Nilai", href: "/nilai-anak", icon: TrendingUp },
      ];

    default:
      return [{ id: "home", label: "Beranda", href: "/dashboard", icon: LayoutDashboard }];
  }
}

export function MobileBottomNav({
  userRole,
  userCapabilities = [],
  isOwner = false,
  onOpenMenu,
  className = "",
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const items = React.useMemo(
    () => getMobileBottomNavItems(userRole, userCapabilities, isOwner),
    [userRole, userCapabilities, isOwner]
  );

  return (
    <nav
      aria-label="Navigasi Bawah Mobile"
      className={`fixed bottom-0 left-0 right-0 z-30 flex md:hidden items-center justify-around bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-blue-500/20 px-1.5 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_25px_rgba(37,99,235,0.12)] ${className}`}
      style={{ paddingBottom: "max(0.45rem, env(safe-area-inset-bottom))" }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`group relative flex flex-1 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[48px] ${
              isActive
                ? "text-[#2563EB] dark:text-blue-400"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {/* Active Pill Container around Icon */}
            <div
              className={`flex items-center justify-center px-3.5 py-1 rounded-full transition-all duration-200 ${
                isActive
                  ? "bg-blue-50/90 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 shadow-2xs"
                  : "group-hover:bg-slate-100 dark:group-hover:bg-slate-800/80 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-transform group-active:scale-95 ${
                  isActive ? "stroke-[2.25]" : "stroke-[1.75]"
                }`}
              />
            </div>
            <span
              className={`mt-1 text-[10px] font-mono tracking-tight text-center truncate max-w-[64px] leading-tight transition-colors ${
                isActive
                  ? "font-bold text-[#2563EB] dark:text-blue-400"
                  : "font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Menu / Lainnya Drawer Trigger */}
      <button
        key="mobile-nav-menu"
        type="button"
        onClick={onOpenMenu}
        aria-label="Buka Menu Lainnya"
        className="group relative flex flex-1 flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[48px] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
      >
        <div className="flex items-center justify-center px-3.5 py-1 rounded-full transition-all duration-200 group-hover:bg-slate-100 dark:group-hover:bg-slate-800/80 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300">
          <Menu className="h-5 w-5 stroke-[1.75] transition-transform group-active:scale-95" />
        </div>
        <span className="mt-1 text-[10px] font-mono tracking-tight text-center truncate max-w-[64px] leading-tight font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
          Menu
        </span>
      </button>
    </nav>
  );
}
