import { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { resolveUserCapabilities } from "@/shared/infrastructure/authorization/staff-capability-service";
import { AcademicShell } from "@/shared/components/shell/academic-shell";
import { leadershipAnalyticsService } from "@/modules/reporting/application/leadership-analytics-service";
import { LeadershipPortalView } from "@/modules/reporting/presentation/leadership-portal-view";
import {
  UserLeadershipContext,
  HeadmasterOverviewDTO,
  CurriculumOverviewDTO,
  StudentAffairsOverviewDTO,
  ProgramHeadOverviewDTO,
  RiwayatEksporItemDTO,
} from "@/modules/reporting/domain/reporting-types";
import { ShieldCheck, Building2, ChevronRight, School } from "lucide-react";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const metadata: Metadata = {
  title: "Portal Kepemimpinan & Laporan — Ruang Pintar",
  description:
    "Dashboard pimpinan sekolah, evaluasi kurikulum, kesiswaan, dan pusat ekspor laporan.",
};

export const dynamic = "force-dynamic";

interface LeadershipPageProps {
  searchParams?: Promise<{ sekolahId?: string; role?: string }>;
}

export default async function LeadershipPage(props: LeadershipPageProps) {
  const user = await requireAuth();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const isSuperAdmin = user.peran_dasar === "SUPER_ADMIN";

  const capabilities = await resolveUserCapabilities(user);

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Portal Kepemimpinan & Laporan", href: "/pimpinan", isCurrent: true },
  ];

  let leadershipContext: UserLeadershipContext | null = null;
  let initialHeadmasterData: HeadmasterOverviewDTO | null = null;
  let initialCurriculumData: CurriculumOverviewDTO | null = null;
  let initialStudentAffairsData: StudentAffairsOverviewDTO | null = null;
  let initialProgramHeadData: ProgramHeadOverviewDTO | null = null;
  let initialExportHistory: RiwayatEksporItemDTO[] = [];
  let authError: string | null = null;

  // Daftar sekolah untuk Super Admin Switcher
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

  try {
    leadershipContext = await leadershipAnalyticsService.resolveLeadershipContext(
      user,
      searchParams?.role as any,
      effectiveSekolahId || undefined
    );

    if (leadershipContext.sekolah_id) {
      if (leadershipContext.active_role === "HEADMASTER") {
        const res = await leadershipAnalyticsService.getHeadmasterOverview(
          user,
          leadershipContext.sekolah_id
        );
        initialHeadmasterData = res.data;
      } else if (leadershipContext.active_role === "VICE_PRINCIPAL_CURRICULUM") {
        const res = await leadershipAnalyticsService.getCurriculumOverview(
          user,
          leadershipContext.sekolah_id
        );
        initialCurriculumData = res.data;
      } else if (leadershipContext.active_role === "VICE_PRINCIPAL_STUDENT_AFFAIRS") {
        const res = await leadershipAnalyticsService.getStudentAffairsOverview(
          user,
          leadershipContext.sekolah_id
        );
        initialStudentAffairsData = res.data;
      } else if (leadershipContext.active_role === "PROGRAM_HEAD") {
        const res = await leadershipAnalyticsService.getProgramHeadOverview(
          user,
          undefined,
          leadershipContext.sekolah_id
        );
        initialProgramHeadData = res.data;
      }

      initialExportHistory = await leadershipAnalyticsService.getExportHistory(
        user,
        leadershipContext.sekolah_id
      );
    }
  } catch (err: any) {
    authError =
      err.message ||
      "Akses kepemimpinan memerlukan penugasan jabatan struktural aktif pada institusi sekolah.";
  }

  return (
    <AcademicShell user={user} userCapabilities={capabilities} breadcrumbItems={breadcrumbItems}>
      {/* Super Admin Tenant Context Switcher */}
      {isSuperAdmin && allSchools.length > 1 && (
        <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <School className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">
                Supervisi Platform Multi-Tenant
              </span>
              <span className="text-xs font-bold text-slate-800">
                Pilih Sekolah untuk Tinjauan Kepemimpinan:
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {allSchools.map((sch) => {
              const isSelected = sch.id === effectiveSekolahId;
              return (
                <Link
                  key={sch.id}
                  href={`/pimpinan?sekolahId=${sch.id}`}
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

      {authError || !leadershipContext || !leadershipContext.sekolah_id ? (
        <div className="rounded-3xl bg-white border border-slate-200/80 p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-2xs">
          <div className="h-16 w-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
            Portal Kepemimpinan & Analisis Eksekutif
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
            {authError ??
              "Portal ini dikhususkan bagi personil yang mengemban Penugasan Jabatan struktural (Kepala Sekolah, Wakasek, Kepala Program) atau Administrator Platform SaaS."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Kembali ke Dashboard Utama</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <LeadershipPortalView
          initialContext={leadershipContext}
          initialHeadmasterData={initialHeadmasterData}
          initialCurriculumData={initialCurriculumData}
          initialStudentAffairsData={initialStudentAffairsData}
          initialProgramHeadData={initialProgramHeadData}
          initialExportHistory={initialExportHistory}
        />
      )}
    </AcademicShell>
  );
}
