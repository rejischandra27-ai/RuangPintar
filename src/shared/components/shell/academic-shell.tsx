"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileDrawer } from "./mobile-drawer";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { BreadcrumbItem } from "./breadcrumb";
import { BaseRole, CapabilityBundle } from "@/shared/infrastructure/authorization/types";
import { ThemeProvider } from "./theme-provider";
import { usePathname } from "next/navigation";

const teacherWorkspaceRoutes = [
  "/dashboard",
  "/kelas-saya",
  "/data-siswa",
  "/jadwal-saya",
  "/sesi-pembelajaran",
  "/kalender-akademik",
  "/presensi-kelas",
  "/penilaian",
  "/cbt-ujian",
  "/asisten-ai",
  "/guru-pengajaran",
  "/wali-kelas",
  "/pimpinan",
  "/onboarding",
];

export interface AcademicShellProps {
  user: {
    id: string;
    username: string;
    nama_lengkap: string;
    peran_dasar: string;
    sekolah_id?: string | null;
    foto_url?: string | null;
    avatar_id?: string | null;
    is_owner_tenant?: boolean;
  };
  userCapabilities?: CapabilityBundle[];
  breadcrumbItems?: BreadcrumbItem[];
  isSubscribed?: boolean;
  children: React.ReactNode;
}

export function AcademicShell({
  user,
  userCapabilities = [],
  breadcrumbItems,
  isSubscribed = false,
  children,
}: AcademicShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const isTeacherWorkspace =
      user.peran_dasar === "TEACHER" &&
      teacherWorkspaceRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

    document.documentElement.classList.toggle("teacher-workspace", isTeacherWorkspace);

    return () => document.documentElement.classList.remove("teacher-workspace");
  }, [pathname, user.peran_dasar]);

  // Global Keyboard Shortcut: Cmd+B / Ctrl+B to toggle sidebar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Hak owner tenant untuk peran TEACHER HANYA berlaku untuk Guru Mandiri (Solo Teacher Workspace di luar sekolah berlangganan)
  const isOwner =
    user.peran_dasar === "TEACHER"
      ? !isSubscribed && Boolean(user.is_owner_tenant)
      : Boolean(user.is_owner_tenant);

  return (
    <ThemeProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
        {/* Desktop Sidebar / Rail */}
        <Sidebar
          userRole={user.peran_dasar as BaseRole}
          userCapabilities={userCapabilities}
          isOwner={isOwner}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSubscribed={isSubscribed}
        />

        {/* Mobile Drawer */}
        <MobileDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          userRole={user.peran_dasar as BaseRole}
          userCapabilities={userCapabilities}
          isOwner={isOwner}
        />

        {/* Main Content Viewport */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <Topbar
            user={user}
            breadcrumbItems={breadcrumbItems}
            onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          {/* Scrollable Page Body with bottom clearance on mobile (< md) for MobileBottomNav */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 pb-24 md:pb-12 pt-2">
            <div className="w-full">{children}</div>
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar (< md) */}
        <MobileBottomNav
          userRole={user.peran_dasar as BaseRole}
          userCapabilities={userCapabilities}
          isOwner={isOwner}
          onOpenMenu={() => setIsMobileDrawerOpen(true)}
        />
      </div>
    </ThemeProvider>
  );
}
