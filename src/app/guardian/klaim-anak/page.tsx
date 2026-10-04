import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { getSchoolRombelsAction } from "@/app/actions/guardian-actions";
import { GuardianClaimFlowView } from "@/modules/guardian/presentation/guardian-claim-flow-view";

export const metadata: Metadata = {
  title: "Klaim Siswa & Hubungkan Akun — Ruang Pintar",
  description:
    "Portal mandiri orang tua / wali murid untuk memverifikasi dan menghubungkan data putra/putri.",
};

export default async function GuardianClaimPage() {
  const user = await requireAuth();

  if (user.peran_dasar !== "GUARDIAN") {
    redirect("/dashboard");
  }

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
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Navbar / Breadcrumb */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-[#2563EB] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Dashboard</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Users className="h-4 w-4 text-[#2563EB]" />
            <span>Konektivitas Keluarga & Sekolah</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        <GuardianClaimFlowView rombelOptions={rombels} schoolName={schoolName} />
      </div>
    </div>
  );
}
