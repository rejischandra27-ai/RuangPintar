/**
 * Ruang Pintar — Role-Aware Navigation Configuration (Phase 05)
 *
 * Mengintegrasikan fondasi otorisasi Phase 04 untuk memfilter item navigasi
 * secara presisi berdasarkan peran pengguna dan capability bundle yang sah.
 */

import {
  BaseRole,
  CapabilityBundle,
  PermissionString,
} from "@/shared/infrastructure/authorization/types";

export interface NavItem {
  id: string;
  title: string;
  href: string;
  iconName: string;
  roles: BaseRole[];
  requiredPermission?: PermissionString;
  requiredCapability?: CapabilityBundle;
  requiredOwner?: boolean;
  badge?: string;
  isPhaseDeferred?: boolean;
  phaseNote?: string;
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export const CANONICAL_NAVIGATION_CONFIG: NavGroup[] = [
  {
    id: "main",
    title: "Menu Utama",
    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        href: "/dashboard",
        iconName: "LayoutDashboard",
        roles: ["SUPER_ADMIN", "SCHOOL_STAFF", "TEACHER", "STUDENT", "GUARDIAN"],
      },
      {
        id: "announcements",
        title: "Pengumuman",
        href: "/pengumuman",
        iconName: "Megaphone",
        roles: ["SUPER_ADMIN", "SCHOOL_STAFF", "TEACHER", "STUDENT", "GUARDIAN"],
        requiredPermission: "communication.announcement.view",
        isPhaseDeferred: false,
      },
    ],
  },

  // ==========================================
  // GURU (TEACHER)
  // ==========================================
  {
    id: "teacher-ops",
    title: "Akademik & Pengajaran",
    items: [
      {
        id: "teacher-workspace",
        title: "Kelas Saya",
        href: "/kelas-saya",
        iconName: "School",
        roles: ["TEACHER"],
        requiredPermission: "learning.material.view",
        isPhaseDeferred: false,
      },
      {
        id: "teacher-students",
        title: "Data Siswa",
        href: "/data-siswa",
        iconName: "UserSquare2",
        roles: ["TEACHER"],
        requiredOwner: true,
        isPhaseDeferred: false,
      },
      {
        id: "teacher-subject-catalog",
        title: "Mata Pelajaran",
        href: "/mata-pelajaran",
        iconName: "BookOpen",
        roles: ["TEACHER"],
        requiredPermission: "academic.structure.view",
        requiredOwner: true,
        isPhaseDeferred: false,
      },
      {
        id: "teacher-schedule",
        title: "Jadwal Mengajar",
        href: "/jadwal-saya",
        iconName: "Calendar",
        roles: ["TEACHER"],
        requiredPermission: "schedule.class.view",
        isPhaseDeferred: false,
      },
      {
        id: "teacher-class-sessions",
        title: "Log Sesi KBM",
        href: "/sesi-pembelajaran",
        iconName: "PlayCircle",
        roles: ["TEACHER"],
        requiredPermission: "schedule.class.view",
        isPhaseDeferred: false,
      },
      {
        id: "teacher-calendar",
        title: "Kalender Akademik",
        href: "/kalender-akademik",
        iconName: "CalendarDays",
        roles: ["TEACHER"],
        requiredPermission: "academic.calendar.view",
        isPhaseDeferred: false,
      },
      {
        id: "teacher-classes",
        title: "Rekap Presensi",
        href: "/presensi-kelas",
        iconName: "Users",
        roles: ["TEACHER"],
        requiredPermission: "attendance.session.record",
        isPhaseDeferred: false,
      },
      {
        id: "teacher-grades",
        title: "Buku Nilai & Rapor",
        href: "/penilaian",
        iconName: "GraduationCap",
        roles: ["TEACHER"],
        requiredPermission: "assessment.grades.manage",
        isPhaseDeferred: false,
      },
      {
        id: "teacher-cbt",
        title: "CBT Ujian Online",
        href: "/cbt-ujian",
        iconName: "FileCheck",
        roles: ["TEACHER"],
        requiredPermission: "cbt.exam.manage",
        isPhaseDeferred: false,
      },
      {
        id: "teacher-homeroom",
        title: "Wali Kelas",
        href: "/wali-kelas",
        iconName: "ShieldAlert",
        roles: ["TEACHER"],
        requiredCapability: "HOMEROOM_TEACHER",
        isPhaseDeferred: false,
      },
      {
        id: "teacher-leadership",
        title: "Portal Pimpinan",
        href: "/pimpinan",
        iconName: "BarChart3",
        roles: ["TEACHER"],
        requiredCapability: "LEADERSHIP_ROLE",
        isPhaseDeferred: false,
      },
      {
        id: "teacher-ai-assistant",
        title: "Asisten AI Guru",
        href: "/asisten-ai",
        iconName: "Sparkles",
        roles: ["TEACHER"],
        badge: "AI 2.0",
        isPhaseDeferred: false,
      },
    ],
  },

  // ==========================================
  // SISWA (STUDENT)
  // ==========================================
  {
    id: "student-ops",
    title: "Aktivitas Belajar",
    items: [
      {
        id: "student-schedule",
        title: "Jadwal Pelajaran",
        href: "/jadwal-saya",
        iconName: "Calendar",
        roles: ["STUDENT"],
        requiredPermission: "schedule.class.view",
        isPhaseDeferred: false,
      },
      {
        id: "student-calendar",
        title: "Kalender Akademik",
        href: "/kalender-akademik",
        iconName: "CalendarDays",
        roles: ["STUDENT"],
        requiredPermission: "academic.calendar.view",
        isPhaseDeferred: false,
      },
      {
        id: "student-cbt",
        title: "CBT Ujian Online",
        href: "/cbt-ujian",
        iconName: "FileCheck",
        roles: ["STUDENT"],
        requiredPermission: "cbt.attempt.start",
        isPhaseDeferred: false,
      },
      {
        id: "student-learning",
        title: "Materi & Tugas",
        href: "/tugas-siswa",
        iconName: "BookOpen",
        roles: ["STUDENT"],
        requiredPermission: "learning.assignment.submit",
        isPhaseDeferred: false,
      },
      {
        id: "student-grades",
        title: "Nilai & Rapor",
        href: "/rapor-siswa",
        iconName: "Award",
        roles: ["STUDENT"],
        requiredPermission: "assessment.report_card.view",
        isPhaseDeferred: false,
      },
    ],
  },

  // ==========================================
  // WALI / ORANG TUA (GUARDIAN)
  // ==========================================
  {
    id: "guardian-ops",
    title: "Monitoring Anak",
    items: [
      {
        id: "guardian-attendance",
        title: "Presensi Anak",
        href: "/presensi-anak",
        iconName: "UserCheck",
        roles: ["GUARDIAN"],
        requiredPermission: "attendance.session.view",
        isPhaseDeferred: false,
      },
      {
        id: "guardian-grades",
        title: "Perkembangan Nilai",
        href: "/nilai-anak",
        iconName: "TrendingUp",
        roles: ["GUARDIAN"],
        requiredPermission: "assessment.grades.view",
        isPhaseDeferred: false,
      },
    ],
  },

  // ==========================================
  // SUPER ADMIN (PLATFORM SAAS OPERATOR)
  // ==========================================
  {
    id: "saas-platform",
    title: "Kontrol Platform SaaS",
    items: [
      {
        id: "saas-schools",
        title: "Sekolah & Lisensi",
        href: "/sekolah",
        iconName: "Building2",
        roles: ["SUPER_ADMIN"],
        badge: "Tenant",
        isPhaseDeferred: false,
      },
      {
        id: "saas-users",
        title: "Guru & Penugasan SaaS",
        href: "/guru-pengajaran",
        iconName: "GraduationCap",
        roles: ["SUPER_ADMIN"],
        isPhaseDeferred: false,
      },
    ],
  },
  {
    id: "saas-global-data",
    title: "Direktori & Master Data",
    items: [
      {
        id: "saas-academic",
        title: "Struktur Kurikulum & Rombel",
        href: "/struktur-akademik",
        iconName: "Layers",
        roles: ["SUPER_ADMIN"],
        isPhaseDeferred: false,
      },
      {
        id: "saas-students",
        title: "Data Kesiswaan Global",
        href: "/data-siswa",
        iconName: "UserSquare2",
        roles: ["SUPER_ADMIN"],
        isPhaseDeferred: false,
      },
    ],
  },
  {
    id: "saas-system",
    title: "Sistem & Integrasi",
    items: [
      {
        id: "saas-integration",
        title: "Pusat Integrasi",
        href: "/integrasi",
        iconName: "Plug",
        roles: ["SUPER_ADMIN"],
        badge: "API Gateway",
        isPhaseDeferred: false,
      },
      {
        id: "saas-cbt",
        title: "CBT & Bank Ujian",
        href: "/cbt-ujian",
        iconName: "FileCheck",
        roles: ["SUPER_ADMIN"],
        isPhaseDeferred: false,
      },
      {
        id: "saas-reports",
        title: "Laporan & Analitik",
        href: "/pimpinan",
        iconName: "BarChart3",
        roles: ["SUPER_ADMIN"],
        isPhaseDeferred: false,
      },
    ],
  },

  // ==========================================
  // OPERASIONAL STAF SEKOLAH (SCHOOL_STAFF)
  // ==========================================
  {
    id: "staff-ops",
    title: "Manajemen Sekolah",
    items: [
      {
        id: "staff-school",
        title: "Profil & Organisasi",
        href: "/sekolah",
        iconName: "Building2",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "academic.school.view",
        isPhaseDeferred: false,
      },
      {
        id: "staff-academic",
        title: "Struktur Kurikulum",
        href: "/struktur-akademik",
        iconName: "Layers",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "academic.structure.manage",
        requiredCapability: "ACADEMIC_OPERATOR",
        isPhaseDeferred: false,
      },
      {
        id: "staff-students",
        title: "Data Kesiswaan",
        href: "/data-siswa",
        iconName: "UserSquare2",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "academic.students.manage",
        requiredCapability: "STUDENT_DATA_OPERATOR",
        isPhaseDeferred: false,
      },
      {
        id: "staff-teachers",
        title: "Guru & Penugasan",
        href: "/guru-pengajaran",
        iconName: "GraduationCap",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "academic.teachers.manage",
        requiredCapability: "ACADEMIC_OPERATOR",
        isPhaseDeferred: false,
      },
      {
        id: "staff-calendar",
        title: "Kalender Akademik",
        href: "/kalender-akademik",
        iconName: "CalendarDays",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "academic.calendar.view",
        requiredCapability: "ACADEMIC_OPERATOR",
        isPhaseDeferred: false,
      },
      {
        id: "staff-schedule",
        title: "Jadwal Pelajaran",
        href: "/jadwal-sekolah",
        iconName: "Calendar",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "schedule.master.view",
        requiredCapability: "ACADEMIC_OPERATOR",
        isPhaseDeferred: false,
      },
      {
        id: "staff-sessions",
        title: "Sesi Pembelajaran",
        href: "/sesi-pembelajaran",
        iconName: "PlayCircle",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "schedule.class.view",
        isPhaseDeferred: false,
      },
      {
        id: "staff-workspace",
        title: "Supervisi Pembelajaran",
        href: "/kelas-saya",
        iconName: "BookOpen",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "learning.material.view",
        requiredCapability: "ACADEMIC_OPERATOR",
        isPhaseDeferred: false,
      },
      {
        id: "staff-attendance",
        title: "Presensi Kehadiran",
        href: "/presensi-kelas",
        iconName: "Users",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "attendance.session.view",
        requiredCapability: "ACADEMIC_OPERATOR",
        isPhaseDeferred: false,
      },
      {
        id: "staff-reports",
        title: "Laporan & Pimpinan",
        href: "/pimpinan",
        iconName: "BarChart3",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "report.export",
        requiredCapability: "REPORT_OPERATOR",
        isPhaseDeferred: false,
      },
      {
        id: "staff-grades",
        title: "Buku Nilai & Rapor",
        href: "/penilaian",
        iconName: "GraduationCap",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "assessment.grades.manage",
        requiredCapability: "ACADEMIC_OPERATOR",
        isPhaseDeferred: false,
      },
      {
        id: "staff-cbt",
        title: "CBT Ujian Online",
        href: "/cbt-ujian",
        iconName: "FileCheck",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "cbt.exam.manage",
        isPhaseDeferred: false,
      },
      {
        id: "staff-ai-assistant",
        title: "Asisten AI Guru",
        href: "/asisten-ai",
        iconName: "Sparkles",
        roles: ["SCHOOL_STAFF"],
        badge: "AI 2.0",
        isPhaseDeferred: false,
      },
      {
        id: "staff-integration",
        title: "Pusat Integrasi",
        href: "/integrasi",
        iconName: "Plug",
        roles: ["SCHOOL_STAFF"],
        requiredPermission: "integration.view",
        requiredCapability: "SYSTEM_ADMIN",
        isPhaseDeferred: false,
      },
    ],
  },
];

/**
 * Filter navigasi yang sah untuk pengguna berdasarkan peran dasar dan capability bundle.
 */
export function getFilteredNavigation(
  userRole: BaseRole,
  userCapabilities: CapabilityBundle[] = [],
  isOwner: boolean = false
): NavGroup[] {
  const filteredGroups: NavGroup[] = [];
  const seenHrefs = new Set<string>();

  for (const group of CANONICAL_NAVIGATION_CONFIG) {
    const matchingItems: NavItem[] = [];

    for (const item of group.items) {
      // 1. Periksa apakah Base Role diizinkan
      if (!item.roles.includes(userRole)) {
        continue;
      }

      // 2. Jika item butuh hak owner tenant
      if (item.requiredOwner && !isOwner) {
        continue;
      }

      // 3. Jika item butuh capability bundle tertentu
      if (item.requiredCapability) {
        if (!userCapabilities.includes(item.requiredCapability)) {
          continue;
        }
      }

      // 3. Deduplikasi mutlak: dilarang menampilkan link rute yang sama dua kali
      if (seenHrefs.has(item.href)) {
        continue;
      }
      seenHrefs.add(item.href);

      matchingItems.push(item);
    }

    if (matchingItems.length > 0) {
      filteredGroups.push({
        ...group,
        items: matchingItems,
      });
    }
  }

  return filteredGroups;
}
