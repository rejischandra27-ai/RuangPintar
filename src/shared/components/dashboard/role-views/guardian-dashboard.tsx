import * as React from "react";
import { AuthenticatedUser } from "@/shared/infrastructure/auth/auth-service";
import { GuardianService } from "@/modules/guardian/application/guardian-service";
import { GuardianDashboardData } from "@/modules/guardian/domain/guardian-types";
import { getActiveChildIdFromCookie, getSchoolRombelsAction } from "@/app/actions/guardian-actions";
import { GuardianDashboardClient } from "@/modules/guardian/presentation/guardian-dashboard-client";
import { GuardianClaimFlowView } from "@/modules/guardian/presentation/guardian-claim-flow-view";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { Sparkles } from "lucide-react";

export interface GuardianDashboardProps {
  user: AuthenticatedUser;
  initialData?: GuardianDashboardData;
}

export async function GuardianDashboard({ user, initialData }: GuardianDashboardProps) {
  let dashboardData = initialData;

  if (!dashboardData) {
    try {
      const activeChildId = await getActiveChildIdFromCookie();
      const guardianService = new GuardianService();
      dashboardData = await guardianService.getDashboardData(user, activeChildId);
    } catch {
      // Kasus wali belum memiliki data putra/putri yang terhubung (Fitur 01: Onboarding Klaim Mandiri)
      let schoolName = "Sekolah";
      if (user.sekolah_id) {
        const school = await prisma.sekolah.findUnique({
          where: { id: user.sekolah_id },
          select: { nama: true },
        });
        if (school) schoolName = school.nama;
      }

      const rombels = await getSchoolRombelsAction();

      return (
        <div className="space-y-6 pb-12">
          {/* Banner Selamat Datang */}
          <div className="rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50/90 to-indigo-50/70 p-5 text-blue-950 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold">
                  Selamat Datang di Portal Wali Murid Ruang Pintar
                </h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Akun Anda belum memiliki data putra/putri yang terhubung di{" "}
                  <strong>{schoolName}</strong>. Silakan verifikasi identitas siswa di formulir
                  bawah ini untuk langsung mengaktifkan pemantauan akademik, presensi harian, dan
                  buku rapor.
                </p>
              </div>
            </div>
          </div>

          {/* Form Klaim Mandiri (Fitur 01 & 02) */}
          <GuardianClaimFlowView
            rombelOptions={rombels}
            schoolName={schoolName}
            isEmbeddedInDashboard={true}
          />
        </div>
      );
    }
  }

  return <GuardianDashboardClient data={dashboardData} />;
}
