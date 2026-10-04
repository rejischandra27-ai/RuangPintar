/**
 * Ruang Pintar — Route /cbt-ujian/proctor/[ujianId] (Live CBT Proctor Cockpit)
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { cbtService } from "@/modules/cbt/application/cbt-service";
import { CbtProctorCockpitView } from "@/modules/cbt/presentation/cbt-proctor-cockpit-view";

interface PageProps {
  params: Promise<{ ujianId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ujianId } = await params;
  return {
    title: `Live Proctor Cockpit — CBT Ruang Pintar`,
    description: `Monitoring pelaksanaan ujian online CBT ${ujianId}`,
  };
}

export default async function CbtProctorPage({ params }: PageProps) {
  const { ujianId } = await params;
  const user = await requireAuth();

  if (!user.sekolah_id) {
    redirect("/dashboard");
  }

  // Only Teacher or Super Admin
  if (user.peran_dasar !== "TEACHER" && user.peran_dasar !== "SUPER_ADMIN") {
    redirect("/cbt-ujian");
  }

  const isSuperAdmin = user.peran_dasar === "SUPER_ADMIN";
  let guruId: string | null = null;

  if (user.peran_dasar === "TEACHER") {
    const guru = await prisma.guru.findFirst({
      where: { sekolah_id: user.sekolah_id, pengguna_id: user.id },
    });
    if (guru) {
      guruId = guru.id;
    }
  }

  // Fallback for SUPER_ADMIN
  if (!guruId) {
    const fallbackGuru = await prisma.guru.findFirst({
      where: { sekolah_id: user.sekolah_id },
      orderBy: { created_at: "asc" },
    });
    if (fallbackGuru) {
      guruId = fallbackGuru.id;
    }
  }

  let data;
  try {
    data = await cbtService.getExamAttempts(ujianId, user.sekolah_id, guruId, isSuperAdmin);
  } catch {
    notFound();
  }

  if (!data || !data.ujian) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 px-4 sm:px-6">
      <CbtProctorCockpitView
        initialExam={{
          id: data.ujian.id,
          judul: data.ujian.judul,
          deskripsi: data.ujian.deskripsi ?? null,
          durasi_menit: data.ujian.durasi_menit,
          kktp: data.ujian.kkm_kktp ?? 75,
          status: data.ujian.status,
          gunakan_token: Boolean(data.ujian.gunakan_token),
          token_masuk: data.ujian.token_masuk ?? null,
          rombel_nama: data.ujian.rombel_nama,
          mata_pelajaran_nama: data.ujian.mata_pelajaran_nama,
          penugasan_mengajar_id: data.ujian.penugasan_mengajar_id,
        }}
        initialAttempts={data.attempts as any}
        penugasanId={data.ujian.penugasan_mengajar_id}
      />
    </div>
  );
}
