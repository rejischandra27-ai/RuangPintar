import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  GraduationCap,
  BookOpen,
  Clock,
  ShieldCheck,
  ClipboardCheck,
  Bell,
  ChevronRight,
  Users,
} from "lucide-react";
import { AuthenticatedUser } from "@/shared/infrastructure/auth/auth-service";
import { BaseRole } from "@/shared/infrastructure/authorization/types";
import { TeacherDashboardData, TeacherFacade } from "@/modules/teacher/application/teacher-facade";
import { scheduleService } from "@/modules/schedule/application/schedule-service";
import { classSessionService } from "@/modules/schedule/application/class-session-service";
import { CommunicationService } from "@/modules/communication/application/communication-service";
import { AnnouncementItem } from "@/modules/communication/domain/communication-types";
import {
  ClassSessionDTO,
  HariBelajar,
  ScheduleEntryDTO,
} from "@/modules/schedule/domain/schedule-types";
import {
  mergeConsecutiveScheduleEntries,
  MergedScheduleBlock,
} from "@/modules/schedule/domain/schedule-merger";
import { assessmentService } from "@/modules/assessment/application/assessment-service";
import { TrialBanner } from "@/modules/ai-assistant/presentation/trial-banner";
import { ManualCreateClassModal } from "@/modules/learning/presentation/manual-create-class-modal";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { DonutGauge } from "../cockpit/donut-gauge";
import { PerformanceBarChart, ClassPerformanceItem } from "../cockpit/performance-bar-chart";
import { AttentionQueueCard } from "../cockpit/attention-queue-card";
import { TeachingTimelineRail, UpcomingCalendarEvent } from "../cockpit/teaching-timeline-rail";
import { TeacherHeroActions } from "../cockpit/teacher-hero-actions";
import { TeacherTrialPill } from "../cockpit/teacher-trial-pill";
import { TeacherKpiGrid } from "../cockpit/teacher-kpi-grid";
import { AnimatedCounter } from "@/shared/components/motion/animated-counter";
import { TeacherOnboardingWizard } from "../cockpit/teacher-onboarding-wizard";
import { TeacherFirstClassSetupModal } from "../cockpit/teacher-first-class-setup-modal";
import { checkPermission } from "@/shared/infrastructure/authorization/authz-guard";
import { teacherOnboardingService } from "@/modules/teacher/application/teacher-onboarding-service";

export interface TeacherDashboardProps {
  user: AuthenticatedUser;
  initialData?: TeacherDashboardData;
  initialAnnouncements?: AnnouncementItem[];
}

export async function TeacherDashboard({
  user,
  initialData,
  initialAnnouncements,
}: TeacherDashboardProps) {
  const dashboardData =
    initialData ||
    (await TeacherFacade.getTeacherDashboardData(
      user.id,
      user.sekolah_id,
      user.is_owner_tenant ?? false
    ));

  let onboardingSnapshot = null;
  if (user.sekolah_id) {
    try {
      const canCreateClass = await checkPermission("academic.classes.manage", {
        sekolah_id: user.sekolah_id,
      });
      const canManageSubjects = await checkPermission("academic.structure.manage", {
        sekolah_id: user.sekolah_id,
      });
      onboardingSnapshot = await teacherOnboardingService.getSnapshot({
        userId: user.id,
        sekolahId: user.sekolah_id,
        isTenantOwner: user.is_owner_tenant ?? false,
        canCreateClass,
        canManageSubjects,
      });
    } catch {
      onboardingSnapshot = null;
    }
  }

  const {
    hasProfile,
    teacher,
    activeAssignments,
    activeHomeroom,
    totalJamMinggu,
    totalRombel,
    totalMataPelajaran = 0,
    pendingTasks = [],
    totalTugasPerluDiperiksa = 0,
    totalSiswaBinaan = 0,
  } = dashboardData;

  const uniqueMapelsCount =
    totalMataPelajaran || new Set(activeAssignments.map((a) => a.mata_pelajaran_id)).size;

  const namaGelar = teacher?.nama_dengan_gelar || user.nama_lengkap;

  const hariMap: Record<number, HariBelajar> = {
    1: "SENIN",
    2: "SELASA",
    3: "RABU",
    4: "KAMIS",
    5: "JUMAT",
    6: "SABTU",
    0: "MINGGU",
  };
  const todayHari = hariMap[new Date().getDay()] || "SENIN";

  let teacherSchedules: ScheduleEntryDTO[] = [];
  let todaySchedules: ScheduleEntryDTO[] = [];
  let actualSessions: ClassSessionDTO[] = [];
  let announcements: AnnouncementItem[] = initialAnnouncements || [];
  let upcomingEvents: UpcomingCalendarEvent[] = [];
  let classPerformanceItems: ClassPerformanceItem[] = [];
  let averageScore: number | null = null;
  let bestClass: { name: string; score: number } | null = null;
  let presensiRecords: { status: string; sesi_kelas_id: string }[] = [];
  let completedJournalsCount = 0;
  let totalCbtAktif = 0;

  if (user.sekolah_id) {
    const sekolahId = user.sekolah_id;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [schedulesRes, sessionsRes, overviewsRes, eventsRes, announcementsRes, cbtCountRes] =
        await Promise.all([
          teacher
            ? scheduleService.listTeacherSchedule(teacher.id, sekolahId, true)
            : Promise.resolve([]),
          teacher
            ? classSessionService.listSessions(sekolahId, {
                guru_id: teacher.id,
                tanggal: new Date(),
              })
            : Promise.resolve([]),
          teacher
            ? assessmentService.getTeacherOverview(sekolahId, teacher.id, false)
            : Promise.resolve([]),
          prisma.kalenderAkademik.findMany({
            where: {
              sekolah_id: sekolahId,
              tanggal_selesai: { gte: todayStart },
            },
            orderBy: { tanggal_mulai: "asc" },
            take: 3,
            select: {
              id: true,
              judul: true,
              tanggal_mulai: true,
              tipe_event: true,
            },
          }),
          initialAnnouncements
            ? Promise.resolve(initialAnnouncements)
            : new CommunicationService().getAnnouncementsForUser(sekolahId, {
                id: user.id,
                peran_dasar: user.peran_dasar as BaseRole,
              }),
          teacher
            ? prisma.ujianCbt.count({
                where: {
                  sekolah_id: sekolahId,
                  penugasan_mengajar: {
                    guru_id: teacher.id,
                  },
                  status: { in: ["PUBLISHED", "DIPUBLIKASI", "DITERBITKAN"] },
                },
              })
            : Promise.resolve(0),
        ]);

      teacherSchedules = schedulesRes;
      todaySchedules = teacherSchedules.filter((s) => s.hari === todayHari);
      actualSessions = sessionsRes;
      announcements = announcementsRes;
      upcomingEvents = eventsRes;
      totalCbtAktif = cbtCountRes;

      if (actualSessions.length > 0) {
        const sessionIds = actualSessions.map((s) => s.id);
        const [presensi, journals] = await Promise.all([
          prisma.presensiSesiKelas.findMany({
            where: {
              sekolah_id: sekolahId,
              sesi_kelas_id: { in: sessionIds },
            },
            select: { status: true, sesi_kelas_id: true },
          }),
          prisma.administrasiPembelajaran.count({
            where: {
              sekolah_id: sekolahId,
              sesi_kelas_aktual_id: { in: sessionIds },
            },
          }),
        ]);
        presensiRecords = presensi;
        completedJournalsCount = journals;
      }

      if (overviewsRes && overviewsRes.length > 0) {
        const scoredOverviews = overviewsRes.filter(
          (o) =>
            o.rata_rata_kelas !== null &&
            o.rata_rata_kelas !== undefined &&
            Number(o.rata_rata_kelas) > 0
        );
        if (scoredOverviews.length > 0) {
          classPerformanceItems = scoredOverviews.map((o) => ({
            id: o.rombel_id,
            name: o.rombel_nama,
            score: Number(o.rata_rata_kelas),
            subject: o.mata_pelajaran_nama,
          }));
          const validScores = classPerformanceItems.map((c) => c.score).filter((s) => s > 0);
          if (validScores.length > 0) {
            averageScore = Number(
              (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
            );
            const maxItem = classPerformanceItems.reduce(
              (prev, curr) => (curr.score > prev.score ? curr : prev),
              classPerformanceItems[0]
            );
            bestClass = { name: maxItem.name, score: maxItem.score };
          }
        }
      }
    } catch {
      // Graceful fallback for partial or disconnected data
    }
  }

  // Gabungkan jam pelajaran berurutan untuk jadwal hari ini
  const mergedTodayBlocks = mergeConsecutiveScheduleEntries(todaySchedules);
  const nextSession = mergedTodayBlocks[0];

  // Hitung metrik presensi & sesi KBM riil (strictly genuine, no fake data)
  const totalSessionsToday = actualSessions.length;
  const completedSessionsToday = actualSessions.filter((s) => s.status === "SELESAI").length;
  const hasSessionsToday = totalSessionsToday > 0;

  const totalPresensi = presensiRecords.length;
  const totalHadir = presensiRecords.filter((p) => p.status === "HADIR").length;
  const totalSakitIzin = presensiRecords.filter(
    (p) => p.status === "SAKIT" || p.status === "IZIN"
  ).length;
  const hadirPercent = totalPresensi > 0 ? Math.round((totalHadir / totalPresensi) * 100) : 0;
  const sakitIzinPercent =
    totalPresensi > 0 ? Math.round((totalSakitIzin / totalPresensi) * 100) : 0;
  const kbmProgressPercent = hasSessionsToday
    ? Math.round((completedSessionsToday / totalSessionsToday) * 100)
    : 0;
  const journalPercent =
    completedSessionsToday > 0
      ? Math.round((completedJournalsCount / completedSessionsToday) * 100)
      : 0;

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* 1. Modal Managers (Invisibly mounted, only opens on demand) */}
      <TrialBanner />
      <ManualCreateClassModal />
      <TeacherFirstClassSetupModal shouldOpen={false} teacherName={user.nama_lengkap} />
      {onboardingSnapshot?.onboardingEligible && !onboardingSnapshot.onboardingCompleted && (
        <TeacherOnboardingWizard
          key={`${user.id}:${user.sekolah_id}`}
          initialSnapshot={onboardingSnapshot}
        />
      )}

      {/* 2. Main Teaching Cockpit Grid: 12 Columns (8 Col Workspace, 4 Col Right Rail) */}
      {/* Padding top on container ensures both columns start at the exact same horizontal baseline */}
      <div className="pt-6 sm:pt-8 md:pt-10 grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-7 items-start">
        {/* LEFT WORKSPACE (8 Columns on XL) */}
        <div className="xl:col-span-8 space-y-6 sm:space-y-7">
          {/* A. Hero Greeting Banner (Astronaut Mascot Pop-Out + Sapaan + Aksi Cepat) */}
          <div className="rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/25 p-6 sm:p-7 shadow-xs dark:shadow-[0_0_35px_-5px_rgba(37,99,235,0.18),0_10px_25px_-5px_rgba(0,0,0,0.5)] relative overflow-hidden md:overflow-visible flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Ambient Glow in dark mode */}
            <div className="absolute top-0 right-1/4 w-72 h-44 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Left Content */}
            <div className="space-y-3.5 z-10 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 text-xs font-mono font-bold border border-blue-100 dark:border-blue-900/50">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Teaching Command Center</span>
                </div>
                <TeacherTrialPill />
              </div>

              <div>
                <h1 className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Halo, {namaGelar}!
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  {mergedTodayBlocks.length === 0
                    ? totalRombel === 0
                      ? user.is_owner_tenant
                        ? "Katalog mata pelajaran sekolah sudah disiapkan. Buat kelas pertama untuk mulai mengatur konteks belajar; penugasan dan jadwal resmi tetap dibuat terpisah."
                        : "Akun Anda siap digunakan. Minta sekolah menyiapkan kelas dan penugasan mengajar agar jadwal pertama dapat ditampilkan."
                      : "Tidak ada jadwal mengajar untuk hari ini. Jadwal resmi semester aktif belum diterbitkan oleh bagian kurikulum sekolah."
                    : completedSessionsToday >= mergedTodayBlocks.length
                      ? `Semua sesi mengajar hari ini telah selesai dilaksanakan (${completedSessionsToday} sesi). Selamat beristirahat atau persiapkan materi berikutnya.`
                      : nextSession
                        ? `Anda memiliki ${mergedTodayBlocks.length} sesi mengajar hari ini. Sesi terdekat: Kelas ${nextSession.rombel_nama} • ${nextSession.mata_pelajaran_nama} (${nextSession.jam_mulai} WIB).`
                        : `Anda memiliki ${mergedTodayBlocks.length} sesi mengajar hari ini.`}
                </p>
              </div>

              <TeacherHeroActions />
            </div>

            {/* Right 3D Astronaut Mascot with Pop-out Effect */}
            <div className="relative shrink-0 w-60 sm:w-72 md:w-80 h-48 sm:h-60 md:h-64 mt-4 sm:-mt-24 md:-mt-28 -mb-6 sm:-mb-7 mx-auto md:mr-0 pointer-events-none select-none flex items-end justify-center z-20">
              <Image
                src="/images/illustrations/astronaut-desk-hero.png"
                alt="Maskot Astronot Ruang Pintar"
                fill
                sizes="(max-width: 768px) 240px, 320px"
                priority
                className="object-contain object-bottom drop-shadow-[0_20px_25px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_20px_35px_rgba(37,99,235,0.35)]"
              />
            </div>
          </div>

          {/* B. Academic Reality KPI Stat Grid (100% Real Canonical Data with Motion Stagger & Interactive Physics) */}
          <TeacherKpiGrid
            isOwnerTenant={user.is_owner_tenant}
            totalRombel={totalRombel}
            activeAssignmentsCount={activeAssignments.length}
            uniqueMapelsCount={uniqueMapelsCount}
            totalSiswaBinaan={totalSiswaBinaan}
            totalJamMinggu={totalJamMinggu}
            totalTugasPerluDiperiksa={totalTugasPerluDiperiksa}
            totalCbtAktif={totalCbtAktif}
          />

          {/* C. Dual-Metric Cards (2 Columns: Performance Bar Chart + Attendance Donut Gauges) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-7 items-stretch">
            {/* Card 1: Performance / Ketuntasan Penilaian */}
            <PerformanceBarChart
              items={classPerformanceItems}
              averageScore={averageScore}
              bestClass={bestClass}
            />

            {/* Card 2: Attendance / Rekap Presensi Siswa */}
            <div className="rounded-[28px] bg-white dark:bg-slate-900/75 dark:backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 p-6 shadow-xs dark:shadow-[0_0_30px_-5px_rgba(37,99,235,0.16)] flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        hasSessionsToday ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    <h3 className="font-mono text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Rekap Presensi Rombel
                    </h3>
                  </div>
                  <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Hari Ini
                  </span>
                </div>

                <div className="mt-4">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block">
                    {totalPresensi > 0 ? "Kehadiran Siswa Hari Ini" : "Progres KBM Hari Ini"}
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                      {totalPresensi > 0 ? (
                        <AnimatedCounter
                          value={hadirPercent}
                          decimals={0}
                          suffix="%"
                          duration={1.2}
                        />
                      ) : hasSessionsToday ? (
                        <AnimatedCounter
                          value={kbmProgressPercent}
                          decimals={0}
                          suffix="%"
                          duration={1.2}
                        />
                      ) : (
                        "-"
                      )}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        totalPresensi > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : hasSessionsToday
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {totalPresensi > 0
                        ? `${totalHadir} Hadir (${totalPresensi} Siswa)`
                        : hasSessionsToday
                          ? `${completedSessionsToday} dari ${totalSessionsToday} Sesi Tuntas`
                          : "Belum Ada Jadwal KBM Hari Ini"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Donut Gauges in a clean 4-col row */}
              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                <DonutGauge
                  percentage={totalPresensi > 0 ? hadirPercent : 0}
                  displayValue={totalPresensi > 0 ? `${hadirPercent}%` : "-"}
                  label="Siswa Hadir"
                  color="emerald"
                  size={62}
                />
                <DonutGauge
                  percentage={hasSessionsToday ? kbmProgressPercent : 0}
                  displayValue={hasSessionsToday ? `${kbmProgressPercent}%` : "-"}
                  label="Tuntas KBM"
                  color="blue"
                  size={62}
                />
                <DonutGauge
                  percentage={totalPresensi > 0 ? sakitIzinPercent : 0}
                  displayValue={totalPresensi > 0 ? `${sakitIzinPercent}%` : "-"}
                  label="Sakit/Izin"
                  color="amber"
                  size={62}
                />
                <DonutGauge
                  percentage={completedSessionsToday > 0 ? journalPercent : 0}
                  displayValue={completedSessionsToday > 0 ? `${journalPercent}%` : "-"}
                  label="Jurnal Diisi"
                  color="indigo"
                  size={62}
                />
              </div>
            </div>
          </div>

          {/* C. Action Queue: Siswa Perlu Perhatian */}
          <AttentionQueueCard />
        </div>

        {/* RIGHT RAIL (4 Columns on XL) */}
        <div className="xl:col-span-4">
          <TeachingTimelineRail
            mergedBlocks={mergedTodayBlocks}
            actualSessions={actualSessions}
            announcements={announcements}
            upcomingEvents={upcomingEvents}
          />
        </div>
      </div>
    </div>
  );
}
