/**
 * Ruang Pintar — M10 Jadwal Pelajaran Saya Route Page (/jadwal-saya)
 *
 * Server Component yang dilindungi requireAuth().
 * Menampilkan jadwal spesifik personal (Guru / Siswa).
 */

import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { staffCapabilityService } from "@/shared/infrastructure/authorization/staff-capability-service";
import { AcademicShell } from "@/shared/components/shell/academic-shell";
import { scheduleService } from "@/modules/schedule/application/schedule-service";
import { MyScheduleView } from "@/modules/schedule/presentation/my-schedule-view";
import { ScheduleHeroBanner } from "@/modules/schedule/presentation/schedule-hero-banner";
import { schoolProfileService } from "@/modules/school/application/school-profile-service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const metadata = {
  title: "Jadwal Pelajaran Saya — Ruang Pintar",
  description: "Daftar jadwal pelajaran personal siswa atau penugasan mengajar guru.",
};

export const dynamic = "force-dynamic";

export default async function JadwalSayaPage() {
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
  const [schoolProfile] = await Promise.all([schoolProfileService.getProfile(user.sekolah_id)]);

  let entries: any[] = [];
  let teacherProfile: any = null;
  let initialScheduleRombelId: string | undefined;

  if (isTeacher) {
    teacherProfile = await prisma.guru.findFirst({
      where: {
        sekolah_id: user.sekolah_id,
        OR: [{ pengguna_id: user.id }, { email: user.email }],
      },
    });

    if (teacherProfile) {
      entries = await scheduleService.listTeacherSchedule(teacherProfile.id, user.sekolah_id, true);
      if (entries.length === 0) {
        const assignment = await prisma.penugasanMengajar.findFirst({
          where: { sekolah_id: user.sekolah_id, guru_id: teacherProfile.id, status: "AKTIF" },
          select: { rombel_id: true },
          orderBy: { created_at: "asc" },
        });
        initialScheduleRombelId = assignment?.rombel_id;
      }
    }
  } else if (user.peran_dasar === "STUDENT") {
    // Look up student's active enrollment and rombel placement
    const student = await prisma.siswa.findFirst({
      where: {
        sekolah_id: user.sekolah_id,
        pengguna_id: user.id,
      },
      include: {
        keikutsertaan: {
          where: { status: "AKTIF" },
          include: {
            penempatan: {
              where: { status: "AKTIF" },
              include: { rombel: true },
            },
          },
        },
      },
    });

    const activePlacement = student?.keikutsertaan[0]?.penempatan[0];
    const activeRombelId = activePlacement?.rombel_id;
    if (activeRombelId) {
      const activeVersion = await prisma.versiJadwal.findFirst({
        where: { sekolah_id: user.sekolah_id, status: "PUBLISHED" },
      });
      if (activeVersion) {
        const allEntries = await scheduleService.listEntriesByVersion(
          activeVersion.id,
          user.sekolah_id
        );
        entries = allEntries.filter((e) => e.rombel_id === activeRombelId);
      }
    }
  } else {
    // For admin / staff preview: show published master entries
    const activeVersion = await prisma.versiJadwal.findFirst({
      where: { sekolah_id: user.sekolah_id, status: "PUBLISHED" },
    });
    if (activeVersion) {
      entries = await scheduleService.listEntriesByVersion(activeVersion.id, user.sekolah_id);
    }
  }

  const uniqueSubjects = new Set(entries.map((e) => e.mata_pelajaran_nama)).size;
  const uniqueRombels = new Set(entries.map((e) => e.rombel_nama)).size;

  return (
    <AcademicShell user={user} userCapabilities={staffCapabilities}>
      <div className="relative space-y-6">
        {/* Ambient Backlight Orbs for Academic Glass Refraction */}
        <div className="absolute -top-20 left-1/4 w-[520px] h-[520px] bg-gradient-to-br from-blue-500/15 via-sky-400/10 to-transparent rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 -right-20 w-[480px] h-[480px] bg-gradient-to-bl from-indigo-500/15 via-purple-400/10 to-transparent rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute bottom-10 -left-10 w-[480px] h-[480px] bg-gradient-to-tr from-emerald-400/10 via-teal-300/10 to-transparent rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Modern Animated Hero Card */}
        <ScheduleHeroBanner
          isTeacher={isTeacher}
          schoolName={schoolProfile.nama}
          totalSessions={entries.length}
          totalSubjects={uniqueSubjects}
          totalRombels={uniqueRombels}
        />

        {/* My Schedule View Component */}
        <MyScheduleView
          entries={entries}
          teacherName={teacherProfile?.nama_lengkap ?? user.nama_lengkap}
          isTeacher={isTeacher}
          initialScheduleRombelId={initialScheduleRombelId}
        />
      </div>
    </AcademicShell>
  );
}
