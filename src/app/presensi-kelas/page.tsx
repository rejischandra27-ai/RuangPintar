/**
 * Ruang Pintar — M12 Presensi Kehadiran Kelas Route Page (/presensi-kelas)
 *
 * Halaman pusat presensi kehadiran siswa per sesi kelas aktual:
 * - Pencatatan presensi langsung per sesi kelas
 * - Rekapitulasi kehadiran per rombongan belajar
 * - Terintegrasi dengan hak akses guru pengampu dan supervisi admin
 */

import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { checkPermission } from "@/shared/infrastructure/authorization/authz-guard";
import { staffCapabilityService } from "@/shared/infrastructure/authorization/staff-capability-service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AcademicShell } from "@/shared/components/shell/academic-shell";
import { classSessionService } from "@/modules/schedule/application/class-session-service";
import { TeachingAssignmentService } from "@/modules/teacher/application/teaching-assignment-service";
import { attendanceService } from "@/modules/attendance/application/attendance-service";
import { schoolProfileService } from "@/modules/school/application/school-profile-service";
import {
  ClassAttendanceOverview,
  ClassAttendanceCardItem,
} from "@/modules/attendance/presentation/class-attendance-overview";

export const metadata: Metadata = {
  title: "Rekapitulasi Presensi Siswa — Ruang Pintar",
  description:
    "Monitoring dan rekapitulasi kehadiran belajar siswa per sesi kelas aktual dan rombongan belajar.",
};

export const dynamic = "force-dynamic";

export default async function PresensiKelasPage() {
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
  const isAdmin = user.peran_dasar === "SUPER_ADMIN" || user.peran_dasar === "SCHOOL_STAFF";

  const canViewAttendance = await checkPermission("attendance.session.view", {
    sekolah_id: user.sekolah_id,
  });
  const canRecordAttendance = await checkPermission("attendance.session.record", {
    sekolah_id: user.sekolah_id,
  });

  if (!isTeacher && !isAdmin && !canViewAttendance) {
    redirect("/dashboard");
  }

  // Profil Guru jika peran TEACHER
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

  // Ambil sesi kelas aktual, penugasan mengajar, dan profil sekolah secara paralel
  const [sessions, assignments, schoolProfile] = await Promise.all([
    classSessionService.listSessions(user.sekolah_id, {
      guru_id: isTeacher ? teacherId : undefined,
    }),
    TeachingAssignmentService.getTeachingAssignments(user.sekolah_id, {
      status: "AKTIF",
      guru_id: isTeacher ? teacherId : undefined,
    }),
    schoolProfileService.getProfile(user.sekolah_id),
  ]);

  // Ambil statistik kehadiran per penugasan mengajar
  const classesWithStats: ClassAttendanceCardItem[] = await Promise.all(
    assignments.map(async (a) => {
      const stats = await attendanceService.getOverallAttendanceStats(a.id, user.sekolah_id!);
      return {
        penugasanId: a.id,
        rombelId: a.rombel_id,
        rombelNama: a.rombel_nama,
        tingkatNama: a.tingkat_nama,
        mapelId: a.mata_pelajaran_id,
        mapelNama: a.mata_pelajaran_nama,
        mapelKode: a.mata_pelajaran_kode,
        guruNama: a.guru_nama,
        stats,
      };
    })
  );

  return (
    <AcademicShell
      user={user}
      userCapabilities={staffCapabilities}
      breadcrumbItems={[{ label: "Dashboard", href: "/dashboard" }, { label: "Rekap Presensi" }]}
    >
      <ClassAttendanceOverview
        sessions={sessions}
        classes={classesWithStats}
        schoolName={schoolProfile.nama}
        canManage={isTeacher || canRecordAttendance || isAdmin}
        isAdmin={isAdmin}
      />
    </AcademicShell>
  );
}
