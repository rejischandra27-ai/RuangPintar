/**
 * Ruang Pintar — Student Academic Lifecycle Page (/data-siswa)
 * Academic Glass UI v1.2
 *
 * Server Component yang dilindungi requireAuth() dan otorisasi M02/M07.
 * Mendukung akses langsung Super Admin untuk multi-tenant SaaS.
 */

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Calendar, Layers, GraduationCap, School } from "lucide-react";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { checkPermission } from "@/shared/infrastructure/authorization/authz-guard";
import { staffCapabilityService } from "@/shared/infrastructure/authorization/staff-capability-service";
import { AcademicShell } from "@/shared/components/shell/academic-shell";
import { studentFacade } from "@/modules/student/application/student-facade";
import { StudentManagementTabs } from "@/modules/student/presentation/student-management-tabs";
import { schoolProfileService } from "@/modules/school/application/school-profile-service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AnimatedCounter } from "@/shared/components/motion/animated-counter";
import { getTenantEntitlement } from "@/shared/infrastructure/tenant/tenant-entitlement-service";

export const dynamic = "force-dynamic";

interface StudentLifecyclePageProps {
  searchParams?: Promise<{ sekolahId?: string; tab?: string }>;
}

export default async function StudentLifecyclePage(props: StudentLifecyclePageProps) {
  const user = await requireAuth();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const isSuperAdmin = user.peran_dasar === "SUPER_ADMIN";

  // Ambil daftar sekolah jika Super Admin
  let allSchools: Array<{ id: string; nama: string }> = [];
  if (isSuperAdmin) {
    allSchools = await prisma.sekolah.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    });
  }

  const effectiveSekolahId = isSuperAdmin
    ? searchParams?.sekolahId || user.sekolah_id || allSchools[0]?.id
    : user.sekolah_id;

  if (!effectiveSekolahId) {
    redirect("/dashboard");
  }

  // Ambil capability bundle jika peran adalah SCHOOL_STAFF atau TEACHER
  const staffCapabilities =
    user.peran_dasar === "SCHOOL_STAFF" || user.peran_dasar === "TEACHER"
      ? await staffCapabilityService.getUserCapabilities(user.id)
      : [];

  const school = await prisma.sekolah.findUnique({
    where: { id: effectiveSekolahId },
    select: { id: true, nama: true, tipe_lisensi: true },
  });

  const entitlement = await getTenantEntitlement(effectiveSekolahId);
  const isSubscribed = entitlement.status === "ACTIVE" || school?.tipe_lisensi === "SEKOLAH";

  // Hak kelola siswa untuk peran TEACHER HANYA berlaku bagi Guru Mandiri perorangan (Solo Workspace)
  // Guru di sekolah institusi formal/berlangganan DILARANG KERAS mengelola data siswa sekolah
  const isSoloTeacherOwner =
    user.peran_dasar === "TEACHER" &&
    !isSubscribed &&
    school?.tipe_lisensi !== "SEKOLAH" &&
    Boolean(user.is_owner_tenant);

  // Jika user adalah TEACHER di sekolah institusi formal/berlangganan, blokir akses total ke /data-siswa
  if (user.peran_dasar === "TEACHER" && !isSoloTeacherOwner) {
    redirect("/dashboard");
  }

  const isOwner = isSoloTeacherOwner;

  // Evaluasi Hak Akses Server-Side
  const canViewStudents =
    isSuperAdmin ||
    isOwner ||
    (await checkPermission("academic.students.view", {
      sekolah_id: effectiveSekolahId,
    }));

  const canManageStudents =
    isSuperAdmin ||
    isOwner ||
    (await checkPermission("academic.students.manage", {
      sekolah_id: effectiveSekolahId,
    }));

  // Jika tidak memiliki izin -> redirect ke dashboard
  if (!canViewStudents && !canManageStudents) {
    redirect("/dashboard");
  }

  // Pengambilan Data Dataset Kesiswaan & Profil Sekolah
  const [dataset, schoolProfile] = await Promise.all([
    studentFacade.getStudentManagementData(effectiveSekolahId),
    schoolProfileService.getProfile(effectiveSekolahId),
  ]);

  const activeStudentsCount = dataset.students.filter((s) => s.status_akademik === "AKTIF").length;

  return (
    <AcademicShell user={user} userCapabilities={staffCapabilities} isSubscribed={isSubscribed}>
      <div className="space-y-6">
        {/* Super Admin Tenant Context Switcher */}
        {isSuperAdmin && allSchools.length > 1 && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <School className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">
                  Supervisi Platform Multi-Tenant
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Pilih Institusi Sekolah untuk Data Kesiswaan:
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {allSchools.map((sch) => {
                const isSelected = sch.id === effectiveSekolahId;
                return (
                  <Link
                    key={sch.id}
                    href={`/data-siswa?sekolahId=${sch.id}`}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {sch.nama}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 1. HERO STUDENT DIRECTORY BANNER — Academic Glass UI v1.2 */}
        <div className="rounded-[28px] bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/25 p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_35px_-5px_rgba(37,99,235,0.18),0_10px_25px_-5px_rgba(0,0,0,0.5)] relative overflow-visible flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-72 h-44 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Left Content */}
          <div className="space-y-3.5 z-10 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 text-xs font-mono font-bold border border-blue-100 dark:border-blue-900/50">
                <Users className="h-3.5 w-3.5" />
                <span>Buku Induk & Siklus Siswa</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 text-[11px] font-mono font-bold">
                {schoolProfile.nama}
              </span>
            </div>

            <div>
              <h1 className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Siklus Akademik Siswa
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                Pusat pendataan profil siswa, keikutsertaan tahun ajaran (enrollment), dan
                penempatan rombongan belajar resmi sesuai regulasi akademik satuan pendidikan.
              </p>
            </div>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium pt-1">
              <Link href="/dashboard" className="hover:text-[#2563EB] transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                Data Kesiswaan
              </span>
            </div>
          </div>

          {/* Right 3D Student Lifecycle Illustration */}
          <div className="relative shrink-0 w-56 sm:w-72 md:w-80 h-52 sm:h-64 mt-2 sm:-mt-12 md:-mt-16 -mb-5 sm:-mb-7 mx-auto md:mr-0 pointer-events-none select-none flex items-end justify-center z-20">
            <Image
              src="/images/illustrations/astronaut-students-v2.png"
              alt="Ilustrasi Siswa Astronot Ruang Pintar"
              fill
              sizes="(max-width: 768px) 240px, (max-width: 1200px) 320px, 384px"
              priority
              className="object-contain object-bottom drop-shadow-[0_20px_30px_rgba(0,0,0,0.25)] dark:drop-shadow-[0_20px_35px_rgba(37,99,235,0.35)]"
            />
          </div>
        </div>

        {/* 2. TOP 4 METRIC CARDS — Academic Glass UI & Typography Konsisten */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Metric 1: Total Siswa */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 group cursor-default">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors truncate">
                Total Siswa
              </span>
              <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-2xs shrink-0">
                <Users className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white group-hover:text-[#2563EB] transition-colors">
                <AnimatedCounter value={dataset.students.length} decimals={0} />
              </span>
              <span className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400">
                Siswa
              </span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1 truncate">
              {activeStudentsCount} Aktif • {dataset.students.length - activeStudentsCount} Nonaktif
            </span>
          </div>

          {/* Metric 2: Siswa Aktif */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all duration-300 group cursor-default">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors truncate">
                Siswa Aktif
              </span>
              <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-2xs shrink-0">
                <GraduationCap className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 transition-colors">
                <AnimatedCounter value={activeStudentsCount} decimals={0} />
              </span>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                Siswa
              </span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1 truncate">
              Status Aktif Mengikuti KBM
            </span>
          </div>

          {/* Metric 3: Terdaftar di T.A */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500/40 hover:-translate-y-0.5 transition-all duration-300 group cursor-default">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors truncate">
                Keikutsertaan T.A
              </span>
              <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-2xs shrink-0">
                <Calendar className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 group-hover:text-amber-700 transition-colors">
                <AnimatedCounter value={dataset.enrollments.length} decimals={0} />
              </span>
              <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
                Pendaftar
              </span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1 truncate">
              {dataset.activeYear ? `Tahun ${dataset.activeYear.nama}` : "Tahun Ajaran Aktif"}
            </span>
          </div>

          {/* Metric 4: Penempatan Rombel */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-blue-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_0_25px_-5px_rgba(37,99,235,0.16)] hover:shadow-md hover:border-purple-300 dark:hover:border-purple-500/40 hover:-translate-y-0.5 transition-all duration-300 group cursor-default">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors truncate">
                Plotting Rombel
              </span>
              <div className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-2xs shrink-0">
                <Layers className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-purple-600 dark:text-purple-400 group-hover:text-purple-700 transition-colors">
                <AnimatedCounter value={dataset.placements.length} decimals={0} />
              </span>
              <span className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
                Siswa
              </span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1 truncate">
              Tersebar di {dataset.rombels.length} Rombel
            </span>
          </div>
        </div>

        {/* Content Tabs (Identitas Siswa, Keikutsertaan T.A., Penempatan Rombel) */}
        <StudentManagementTabs dataset={dataset} canManage={canManageStudents} />
      </div>
    </AcademicShell>
  );
}
