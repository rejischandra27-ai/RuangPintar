/**
 * Ruang Pintar — Route /kelas-saya (Teacher Classes & Learning Supervision Directory)
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/shared/infrastructure/authorization/authz-guard";
import { staffCapabilityService } from "@/shared/infrastructure/authorization/staff-capability-service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { learningService } from "@/modules/learning/application/learning-service";
import { TeacherClassesView } from "@/modules/learning/presentation/teacher-classes-view";
import { AcademicShell } from "@/shared/components/shell/academic-shell";
import { getTenantEntitlement } from "@/shared/infrastructure/tenant/tenant-entitlement-service";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Badge } from "@/shared/components/ui/badge";
import { BookOpen, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Kelas Saya — Ruang Pintar",
  description: "Daftar kelas pembelajaran yang diampu guru dan supervisi kurikulum",
};

export default async function KelasSayaPage() {
  const user = await requirePermission("learning.material.view");

  if (!user.sekolah_id) {
    redirect("/dashboard");
  }

  const isAdmin = user.peran_dasar === "SUPER_ADMIN" || user.peran_dasar === "SCHOOL_STAFF";

  const staffCapabilities =
    user.peran_dasar === "SCHOOL_STAFF" || user.peran_dasar === "TEACHER"
      ? await staffCapabilityService.getUserCapabilities(user.id)
      : [];

  let guruId: string | null = null;
  let teacherName = user.nama_lengkap;
  let teachersList: Array<{
    id: string;
    nama_lengkap: string;
    gelar_depan: string | null;
    gelar_belakang: string | null;
    total_kelas: number;
  }> = [];

  if (user.peran_dasar === "TEACHER") {
    const guru = await prisma.guru.findFirst({
      where: {
        sekolah_id: user.sekolah_id,
        pengguna_id: user.id,
      },
    });

    if (guru) {
      guruId = guru.id;
      teacherName = guru.nama_lengkap;
    }
  }

  // Jika Super Admin / Staff, muat daftar seluruh guru pengampu untuk filter supervisi
  if (isAdmin) {
    teachersList = await learningService.listTeachersWithAssignments(user.sekolah_id);
  }

  // Ambil data penugasan kelas:
  // - Guru: hanya kelas yang diampunya
  // - Admin: seluruh kelas sekolah (bisa difilter per guru di UI)
  const classes = await learningService.listTeacherClasses(
    user.sekolah_id,
    isAdmin ? null : guruId
  );

  const school = await prisma.sekolah.findUnique({
    where: { id: user.sekolah_id },
    select: { id: true, nama: true, tipe_lisensi: true },
  });

  const entitlement = await getTenantEntitlement(user.sekolah_id);
  const isSubscribed = entitlement.status === "ACTIVE" || school?.tipe_lisensi === "SEKOLAH";

  // Kontrol mutasi rombel (Ubah/Hapus) HANYA berlaku untuk Guru Mandiri perorangan (Solo Workspace).
  // Guru di sekolah institusi formal/berlangganan DILARANG KERAS memutasi rombel sekolah.
  const isSoloTeacher =
    !isSubscribed && school?.tipe_lisensi !== "SEKOLAH" && Boolean(user.is_owner_tenant);

  return (
    <AcademicShell
      user={user}
      userCapabilities={staffCapabilities}
      isSubscribed={isSubscribed}
      breadcrumbItems={[
        { label: "Dashboard", href: "/dashboard" },
        { label: isAdmin ? "Supervisi Pembelajaran" : "Kelas Saya" },
      ]}
    >
      <div className="pt-2 sm:pt-4">
        <TeacherClassesView
          classes={classes}
          teacherName={teacherName}
          isAdmin={isAdmin}
          teachersList={teachersList}
          isSubscribed={isSubscribed}
          isTenantOwner={isSoloTeacher}
        />
      </div>
    </AcademicShell>
  );
}
