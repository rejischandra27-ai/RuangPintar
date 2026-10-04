"use client";

import * as React from "react";
import { Menu, PanelLeftClose, PanelLeft } from "lucide-react";
import { UserMenu } from "./user-menu";
import { NotificationEntry } from "./notification-entry";
import { ThemeSwitcher } from "./theme-switcher";
import { BreadcrumbItem } from "./breadcrumb";

export interface TopbarProps {
  user: {
    id: string;
    username: string;
    nama_lengkap: string;
    peran_dasar: string;
    sekolah_id?: string | null;
    foto_url?: string | null;
    avatar_id?: string | null;
  };
  breadcrumbItems?: BreadcrumbItem[];
  onOpenMobileDrawer: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  className?: string;
}

export function Topbar({
  user,
  breadcrumbItems = [{ label: "Dashboard", href: "/dashboard", isCurrent: true }],
  onOpenMobileDrawer,
  isSidebarCollapsed = false,
  onToggleSidebar,
  className = "",
}: TopbarProps) {
  return (
    <header
      className={`sticky top-0 z-40 flex h-20 w-full items-center justify-between bg-[#F8FAFC]/90 dark:bg-[#090D16]/90 backdrop-blur-md px-3 sm:px-6 lg:px-8 border-b border-transparent dark:border-slate-800/40 transition-colors duration-200 ${className}`}
    >
      {/* Left side: Mobile Drawer Trigger + Desktop Sidebar Toggle + Dashboard Title */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Smartphone Drawer Trigger (< md) */}
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          aria-label="Buka Menu Navigasi"
          className="md:hidden flex h-10 w-10 items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Sidebar Toggle Button */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
            title={isSidebarCollapsed ? "Perluas Sidebar (Ctrl+B)" : "Ciutkan Sidebar (Ctrl+B)"}
            className="hidden md:flex h-10 w-10 items-center justify-center text-slate-400 hover:text-[#2563EB] hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-blue-400 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 cursor-pointer flex-shrink-0"
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        )}

        {/* Tulisan Dashboard di samping ciutkan sidebar (Hidden on mobile view, visible on md+) */}
        <div className="hidden md:flex items-center pl-1">
          <span className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Dashboard
          </span>
        </div>
      </div>

      {/* Right side: Theme Switcher + Notifications + User Menu */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-1 justify-end min-w-0">
        {/* Action Controls Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Theme Mode Switcher (Ikon bersih tanpa lingkaran) */}
          <ThemeSwitcher />

          {/* Notification Bell */}
          <NotificationEntry />

          {/* User Profile */}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
