/**
 * Ruang Pintar — School & Organization Management Page (/sekolah)
 *
 * Mendukung 2 mode operasional:
 * 1. Platform SaaS Multi-Tenant (SUPER_ADMIN): Menampilkan direktori seluruh sekolah & lisensi
 *    jika diakses tanpa parameter sekolahId.
 * 2. Institusi Sekolah Tunggal: Menampilkan profil, unit kerja, struktur jabatan & penugasan personil
 *    untuk sekolah aktif staf institusi atau sekolah yang dipilih oleh SUPER_ADMIN.
 */

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Sparkles, School, ArrowLeft } from "lucide-react";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { checkPermission } from "@/shared/infrastructure/authorization/authz-guard";
import { staffCapabilityService } from "@/shared/infrastructure/authorization/staff-capability-service";
import { AcademicShell } from "@/shared/components/shell/academic-shell";
import { SchoolManagementTabs } from "@/modules/school/presentation/school-management-tabs";
import { SuperAdminSchoolDirectoryView } from "@/modules/school/presentation/super-admin-school-directory-view";
import { schoolProfileService } from "@/modules/school/application/school-profile-service";
import { organizationUnitService } from "@/modules/school/application/organization-unit-service";
import { positionService } from "@/modules/school/application/position-service";
import { positionAssignmentService } from "@/modules/school/application/position-assignment-service";
import { prisma } from "@/shared/infrastructure/database/prisma";

interface SchoolManagementPageProps {
  searchParams?: Promise<{ sekolahId?: string; tab?: string }>;
}

export default async function SchoolManagementPage(props: SchoolManagementPageProps) {
  const user = await requireAuth();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const isSuperAdmin = user.peran_dasar === "SUPER_ADMIN";

  // Mode 1: SUPER_ADMIN membuka direktori multi-tenant sekolah & lisensi
  if (isSuperAdmin && !searchParams?.sekolahId) {
    const rawSchools = await prisma.sekolah.findMany({
      orderBy: { created_at: "desc" },
      include: {
        _count: {
          select: {
            siswa: true,
            guru: true,
            rombel: true,
            ujian_cbt: true,
            pengguna: true,
          },
        },
        langganan_tenant: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
        transaksi_langganan: {
          where: { status: "PAID" },
          orderBy: { dibayar_pada: "desc" },
          take: 1,
        },
      },
    });

    return (
      <AcademicShell user={user} userCapabilities={[]}>
        <SuperAdminSchoolDirectoryView schools={rawSchools} currentUser={user} />
      </AcademicShell>
    );
  }

  // Mode 2: Halaman detail institusi sekolah tunggal
  const effectiveSekolahId = isSuperAdmin
    ? (searchParams?.sekolahId ?? user.sekolah_id)
    : user.sekolah_id;

  if (!effectiveSekolahId) {
    redirect(isSuperAdmin ? "/sekolah" : "/dashboard");
  }

  // Ambil capability bundle jika peran adalah SCHOOL_STAFF atau TEACHER
  const staffCapabilities =
    user.peran_dasar === "SCHOOL_STAFF" || user.peran_dasar === "TEACHER"
      ? await staffCapabilityService.getUserCapabilities(user.id)
      : [];

  // Evaluasi Hak Akses Server-Side
  const canViewSchool = isSuperAdmin
    ? true
    : await checkPermission("academic.school.view", { sekolah_id: effectiveSekolahId });

  const canManageSchool = isSuperAdmin
    ? true
    : await checkPermission("academic.school.manage", { sekolah_id: effectiveSekolahId });

  const canViewStructure = isSuperAdmin
    ? true
    : await checkPermission("academic.structure.view", { sekolah_id: effectiveSekolahId });

  const canManageStructure = isSuperAdmin
    ? true
    : await checkPermission("academic.structure.manage", { sekolah_id: effectiveSekolahId });

  // Jika tidak memiliki izin lihat profil maupun struktur -> redirect
  if (!canViewSchool && !canViewStructure) {
    redirect("/dashboard");
  }

  // Pengambilan Data Sesuai Izin dengan penanganan graceful jika ID sekolah tidak ditemukan
  let profile;
  try {
    profile = await schoolProfileService.getProfile(effectiveSekolahId);
  } catch {
    redirect(isSuperAdmin ? "/sekolah" : "/dashboard");
  }

  const units = canViewStructure ? await organizationUnitService.getUnits(effectiveSekolahId) : [];

  const positions = canViewStructure ? await positionService.getPositions(effectiveSekolahId) : [];

  const assignments = canViewStructure
    ? await positionAssignmentService.getAssignments(effectiveSekolahId)
    : [];

  const personnel = canManageStructure
    ? await positionAssignmentService.getAssignablePersonnel(effectiveSekolahId)
    : [];

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
              {isSuperAdmin ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <Link href="/dashboard" className="hover:text-[#2563EB] transition-colors">
                    Dashboard
                  </Link>
                  <span>/</span>
                  <Link href="/sekolah" className="hover:text-[#2563EB] transition-colors">
                    Sekolah & Lisensi
                  </Link>
                  <span>/</span>
                  <span className="text-slate-700 font-semibold truncate max-w-[200px]">
                    {profile.nama}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <Link href="/dashboard" className="hover:text-[#2563EB] transition-colors">
                    Dashboard
                  </Link>
                  <span>/</span>
                  <span className="text-slate-700 font-semibold">Manajemen Sekolah</span>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  {isSuperAdmin && (
                    <Link
                      href="/sekolah"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors mr-1"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Kembali ke Direktori</span>
                    </Link>
                  )}
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                    {profile.nama}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 font-bold text-xs">
                    Jenjang {profile.jenjang}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Pusat tata kelola profil resmi institusi, struktur unit kerja, master jabatan
                  struktural, dan penugasan personil aktif sekolah.
                </p>
              </div>

              {/* Status & Metadata Badges */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 font-medium">
                  <Building2 className="h-3.5 w-3.5 text-[#2563EB]" />
                  <span>
                    NPSN: <strong className="text-slate-800">{profile.npsn || "-"}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Status: Terverifikasi Aktif</span>
                </div>
              </div>
            </div>

            {/* Right Side: 3D Pop-Out School Illustration */}
            <div className="hidden md:block absolute -top-8 -right-2 lg:-right-4 w-72 lg:w-80 h-52 lg:h-60 pointer-events-none z-20">
              <Image
                src="/images/illustrations/school-hero-3d.png"
                alt="Ilustrasi Gedung Sekolah 3D"
                width={360}
                height={270}
                priority
                unoptimized
                className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:scale-105 transition-transform duration-300 pointer-events-auto cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Sub-module Tabs */}
        <SchoolManagementTabs
          profile={profile}
          units={units}
          positions={positions}
          assignments={assignments}
          personnel={personnel}
          canManageSchool={canManageSchool}
          canViewStructure={canViewStructure}
          canManageStructure={canManageStructure}
          initialTab={searchParams?.tab || "profil"}
        />
      </div>
    </AcademicShell>
  );
}
