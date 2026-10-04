/**
 * Ruang Pintar — M10 Sesi Pembelajaran Route Page (/sesi-pembelajaran)
 *
 * Server Component yang dilindungi requireAuth() dan otorisasi M02/M10.
 */

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlayCircle, CheckCircle2, BookOpen, Users } from "lucide-react";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { checkPermission } from "@/shared/infrastructure/authorization/authz-guard";
import { staffCapabilityService } from "@/shared/infrastructure/authorization/staff-capability-service";
import { AcademicShell } from "@/shared/components/shell/academic-shell";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { TeachingAssignmentService } from "@/modules/teacher/application/teaching-assignment-service";
import { TeacherProfileService } from "@/modules/teacher/application/teacher-profile-service";
import { classSessionService } from "@/modules/schedule/application/class-session-service";
import { ClassSessionsView } from "@/modules/schedule/presentation/class-sessions-view";
import { schoolProfileService } from "@/modules/school/application/school-profile-service";

export const metadata = {
  title: "Log & Audit Sesi KBM — Ruang Pintar",
  description:
    "Log audit riwayat sesi pembelajaran kelas, jurnal KBM, dan pengawasan operasional sekolah.",
};

export const dynamic = "force-dynamic";

export default async function SesiPembelajaranPage() {
  const user = await requireAuth();
  if (!user.sekolah_id) {
    redirect("/dashboard");
  }

  // Capability bundle if SCHOOL_STAFF or TEACHER
  const staffCapabilities =
    user.peran_dasar === "SCHOOL_STAFF" || user.peran_dasar === "TEACHER"
      ? await staffCapabilityService.getUserCapabilities(user.id)
      : [];

  const isTeacher = user.peran_dasar === "TEACHER";
  const canViewClass = await checkPermission("schedule.class.view", {
    sekolah_id: user.sekolah_id,
  });
  const canManageSchedule = await checkPermission("schedule.master.manage", {
    sekolah_id: user.sekolah_id,
  });

  const canManage = isTeacher || canViewClass || canManageSchedule;

  // Fetch teacher profile if teacher
  let teacherId: string | undefined;
  if (isTeacher) {
    const teacherProfile = await prisma.guru.findFirst({
      where: {
        sekolah_id: user.sekolah_id,
        OR: [{ pengguna_id: user.id }, { email: user.email }],
      },
    });
    teacherId = teacherProfile?.id;
  }

  // Fetch sessions, schoolProfile in parallel
  const [sessions, schoolProfile, rombelsData, assignments, teachers] = await Promise.all([
    classSessionService.listSessions(user.sekolah_id, {
      guru_id: isTeacher ? teacherId : undefined,
    }),
    schoolProfileService.getProfile(user.sekolah_id),
    prisma.rombel.findMany({
      where: { sekolah_id: user.sekolah_id, status: "AKTIF" },
      include: { tingkat: true },
      orderBy: { nama: "asc" },
    }),
    TeachingAssignmentService.getTeachingAssignments(user.sekolah_id, {
      status: "AKTIF",
      guru_id: isTeacher ? teacherId : undefined,
    }),
    TeacherProfileService.getTeachers(user.sekolah_id, {
      status_aktif: true,
    }),
  ]);

  const activeSessionsCount = sessions.filter((s) => s.status === "DIMULAI").length;
  const completedSessionsCount = sessions.filter((s) => s.status === "SELESAI").length;

  return (
    <AcademicShell user={user} userCapabilities={staffCapabilities}>
      <div className="space-y-6">
        {/* Modern 3D Pop-Out Hero Card */}
        <div className="relative rounded-3xl bg-white border border-slate-100/90 p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-visible">
          {/* Subtle Background Accent Gradient */}
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-50/60 to-transparent rounded-r-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Left Content */}
            <div className="w-full md:max-w-[60%] lg:max-w-[66%] space-y-3.5">
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Link href="/dashboard" className="hover:text-[#2563EB] transition-colors">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-slate-700 font-semibold">Log Sesi KBM</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                    Log & Audit Sesi KBM
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 font-bold text-xs">
                    {schoolProfile.nama}
                  </span>
                </div>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-2xl">
                  Log audit riwayat sesi pembelajaran kelas aktual, jurnal materi KBM, dan
                  pengawasan operasional sekolah. Untuk presensi siswa harian langsung, gunakan
                  Presensi Cepat di Dashboard atau Tab Presensi di Ruang Kelas Saya.
                </p>
              </div>

              {/* Quick Status Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/80 text-xs font-semibold text-emerald-700">
                  <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>
                    Kelas Berlangsung: <strong>{activeSessionsCount}</strong>
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-200/80 text-xs font-semibold text-[#2563EB]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#2563EB]" />
                  <span>
                    Selesai: <strong>{completedSessionsCount}</strong>
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50/80 border border-purple-200/80 text-xs font-semibold text-purple-700">
                  <BookOpen className="h-3.5 w-3.5 text-purple-600" />
                  <span>
                    Total Riwayat Sesi: <strong>{sessions.length}</strong>
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700">
                  <Users className="h-3.5 w-3.5 text-slate-600" />
                  <span>
                    Rombel Terlayani: <strong>{rombelsData.length}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Hero Illustration */}
            <div className="hidden md:flex flex-col items-center justify-center shrink-0 relative pr-4">
              <div className="relative w-44 h-36 lg:w-52 lg:h-44 transition-transform duration-500 hover:scale-105">
                <Image
                  src="/images/illustrations/student-lifecycle-3d.png"
                  alt="Class Session Illustration"
                  fill
                  sizes="(max-width: 1024px) 176px, 208px"
                  className="object-contain drop-shadow-xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Class Sessions View Component */}
        <ClassSessionsView
          initialSessions={sessions}
          rombels={rombelsData.map((r) => ({
            id: r.id,
            nama: r.nama,
            tingkat_nama: r.tingkat?.nama ?? null,
          }))}
          assignments={assignments}
          teachers={teachers}
          canManage={canManage}
        />
      </div>
    </AcademicShell>
  );
}
