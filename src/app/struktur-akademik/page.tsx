/**
 * Ruang Pintar — Academic Period & Structure Management Page (/struktur-akademik)
 *
 * Server Component yang dilindungi requireAuth() dan otorisasi M02/M06.
 * Mendukung akses langsung Super Admin untuk multi-tenant SaaS.
 */

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers, Sparkles, Calendar, BookOpen, Users, School } from "lucide-react";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { checkPermission } from "@/shared/infrastructure/authorization/authz-guard";
import { staffCapabilityService } from "@/shared/infrastructure/authorization/staff-capability-service";
import { AcademicShell } from "@/shared/components/shell/academic-shell";
import { academicFacade } from "@/modules/academic/application/academic-facade";
import { AcademicManagementTabs } from "@/modules/academic/presentation/academic-management-tabs";
import { schoolProfileService } from "@/modules/school/application/school-profile-service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const dynamic = "force-dynamic";

interface AcademicStructurePageProps {
  searchParams?: Promise<{ sekolahId?: string; tab?: string }>;
}

export default async function AcademicStructurePage(props: AcademicStructurePageProps) {
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

  // Evaluasi Hak Akses Server-Side
  const canViewStructure =
    isSuperAdmin ||
    (await checkPermission("academic.structure.view", {
      sekolah_id: effectiveSekolahId,
    }));

  const canManageStructure =
    isSuperAdmin ||
    (await checkPermission("academic.structure.manage", {
      sekolah_id: effectiveSekolahId,
    }));

  // Jika tidak memiliki izin lihat struktur -> redirect ke dashboard
  if (!canViewStructure && !canManageStructure) {
    redirect("/dashboard");
  }

  // Pengambilan Data Struktur Akademik & Profil Sekolah
  const [academicData, schoolProfile] = await Promise.all([
    academicFacade.getFullAcademicStructure(effectiveSekolahId),
    schoolProfileService.getProfile(effectiveSekolahId),
  ]);

  return (
    <AcademicShell user={user} userCapabilities={staffCapabilities}>
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
                  Pilih Institusi Sekolah untuk Struktur Kurikulum & Rombel:
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {allSchools.map((sch) => {
                const isSelected = sch.id === effectiveSekolahId;
                return (
                  <Link
                    key={sch.id}
                    href={`/struktur-akademik?sekolahId=${sch.id}`}
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
                <span className="text-slate-700 font-semibold">Struktur Akademik</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                    Struktur Akademik & Periode
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 font-bold text-xs">
                    {schoolProfile.nama}
                  </span>
                </div>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-2xl">
                  Pusat konfigurasi siklus tahun ajaran, pembagian semester, klasifikasi tingkat
                  kelas & fase kurikulum, program keahlian/jurusan, serta pembentukan rombongan
                  belajar (rombel).
                </p>
              </div>

              {/* Quick Status Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700">
                  <Calendar className="h-3.5 w-3.5 text-[#2563EB]" />
                  <span>
                    T.A:{" "}
                    <strong>
                      {academicData.activeYear ? academicData.activeYear.nama : "Belum Ada"}
                    </strong>
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700">
                  <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                  <span>
                    Semester:{" "}
                    <strong>
                      {academicData.activeSemester ? academicData.activeSemester.nama : "Belum Ada"}
                    </strong>
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700">
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                  <span>
                    Total Rombel: <strong>{academicData.rombels.length}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Graphic: 3D Pop-Out Visual */}
            <div className="w-full md:w-auto flex justify-center md:justify-end shrink-0">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-3xl blur-md opacity-40 group-hover:opacity-75 transition duration-500" />
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center p-2">
                  <Image
                    src="/images/academic-structure-3d.png"
                    alt="Struktur Akademik"
                    width={180}
                    height={180}
                    priority
                    className="object-contain filter drop-shadow-[0_12px_24px_rgba(37,99,235,0.18)] transform group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs (Tahun Ajaran, Semester, Tingkat & Fase, Program Keahlian, Rombel) */}
        <AcademicManagementTabs
          initialData={academicData}
          canManage={canManageStructure}
          isTenantOwner={user.is_owner_tenant ?? false}
        />
      </div>
    </AcademicShell>
  );
}
