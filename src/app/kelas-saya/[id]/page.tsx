/**
 * Ruang Pintar — Route /kelas-saya/[id] (Workspace Kelas Terpadu)
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/shared/infrastructure/authorization/authz-guard";
import { staffCapabilityService } from "@/shared/infrastructure/authorization/staff-capability-service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { learningService } from "@/modules/learning/application/learning-service";
import { attendanceService } from "@/modules/attendance/application/attendance-service";
import { assessmentService } from "@/modules/assessment/application/assessment-service";
import { cbtService } from "@/modules/cbt/application/cbt-service";
import { ClassWorkspaceView } from "@/modules/learning/presentation/class-workspace-view";
import { AcademicShell } from "@/shared/components/shell/academic-shell";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Kelola Kelas — Ruang Pintar`,
    description: `Ruang kelola kelas pembelajaran terpadu penugasan ${id}`,
  };
}

export default async function ClassWorkspacePage({ params, searchParams }: PageProps) {
  const { id: penugasanId } = await params;
  const user = await requirePermission("learning.material.view");

  if (!user.sekolah_id) {
    redirect("/dashboard");
  }

  const isSuperAdmin = user.peran_dasar === "SUPER_ADMIN";
  const isAdmin = isSuperAdmin || user.peran_dasar === "SCHOOL_STAFF";

  const staffCapabilities =
    user.peran_dasar === "SCHOOL_STAFF" || user.peran_dasar === "TEACHER"
      ? await staffCapabilityService.getUserCapabilities(user.id)
      : [];

  let guruId: string | null = null;
  if (user.peran_dasar === "TEACHER") {
    const guru = await prisma.guru.findFirst({
      where: {
        sekolah_id: user.sekolah_id,
        pengguna_id: user.id,
      },
    });
    if (guru) {
      guruId = guru.id;
    }
  }

  let workspace;
  try {
    workspace = await learningService.getClassWorkspace(
      penugasanId,
      user.sekolah_id,
      guruId,
      isSuperAdmin
    );
  } catch (err: any) {
    if (err?.name === "TeacherClassAccessDeniedError") {
      redirect("/kelas-saya");
    }
    notFound();
  }

  // Ambil data presensi, riwayat sesi kelas, rekap presensi siswa, asesmen, gradebook, dan ujian CBT untuk penugasan ini
  const [attendanceHistory, attendanceStats, attendanceRecap, assessments, gradebook, exams] =
    await Promise.all([
      attendanceService.getAssignmentAttendanceHistory(penugasanId, user.sekolah_id),
      attendanceService.getOverallAttendanceStats(penugasanId, user.sekolah_id),
      attendanceService.getClassAttendanceRecap(penugasanId, user.sekolah_id, guruId, isSuperAdmin),
      assessmentService.getAssessments(penugasanId, user.sekolah_id, guruId, isSuperAdmin),
      assessmentService.getGradebook(penugasanId, user.sekolah_id, guruId, isSuperAdmin),
      cbtService.getExamsByPenugasan(penugasanId, user.sekolah_id, guruId, isSuperAdmin),
    ]);

  const searchParamsObj = searchParams ? await searchParams : undefined;
  const initialTab = searchParamsObj?.tab as any;

  const canManage = isSuperAdmin || (guruId !== null && workspace.penugasan.guru_id === guruId);

  return (
    <AcademicShell
      user={user}
      userCapabilities={staffCapabilities}
      breadcrumbItems={[
        { label: "Dashboard", href: "/dashboard" },
        {
          label: isAdmin ? "Supervisi Pembelajaran" : "Kelas Saya",
          href: "/kelas-saya",
        },
        {
          label: `${workspace.penugasan.rombel_nama} - ${workspace.penugasan.mata_pelajaran_nama}`,
        },
      ]}
    >
      <ClassWorkspaceView
        workspace={workspace}
        canManage={Boolean(canManage)}
        attendanceHistory={attendanceHistory}
        attendanceStats={attendanceStats}
        attendanceRecap={attendanceRecap}
        assessments={assessments}
        gradebook={gradebook}
        exams={exams}
        initialTab={initialTab}
      />
    </AcademicShell>
  );
}
