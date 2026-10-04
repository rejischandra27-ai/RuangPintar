import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { staffCapabilityService } from "@/shared/infrastructure/authorization/staff-capability-service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AcademicShell } from "@/shared/components/shell/academic-shell";
import { CreateQuestionFullView } from "@/modules/cbt/presentation/create-question-full-view";

export const metadata: Metadata = {
  title: "Buat Soal untuk Saya — CBT Ruang Pintar",
  description:
    "Editor pembuatan butir soal CBT dengan stimulus formula matematika KaTeX, teks Arab, gambar, dan audio listening",
};

export default async function BuatSoalPage({
  searchParams,
}: {
  searchParams?: Promise<{ mapelId?: string }>;
}) {
  const user = await requireAuth();

  if (!user.sekolah_id) {
    redirect("/dashboard");
  }

  const role = user.peran_dasar;
  if (role !== "TEACHER" && role !== "SUPER_ADMIN" && role !== "SCHOOL_STAFF") {
    redirect("/cbt-ujian");
  }

  const staffCapabilities =
    role === "SCHOOL_STAFF" || role === "TEACHER"
      ? await staffCapabilityService.getUserCapabilities(user.id)
      : [];

  const [sekolah, guruProfile] = await Promise.all([
    prisma.sekolah.findUnique({
      where: { id: user.sekolah_id },
      select: { tipe_lisensi: true },
    }),
    role === "TEACHER"
      ? prisma.guru.findFirst({
          where: { sekolah_id: user.sekolah_id, pengguna_id: user.id },
          include: {
            penugasan_mengajar: {
              where: { status: "AKTIF" },
              include: {
                mata_pelajaran: {
                  select: { id: true, nama: true, kode: true },
                },
              },
            },
          },
        })
      : null,
  ]);

  const isSubscribed = sekolah?.tipe_lisensi === "SEKOLAH";

  // Filter Mata Pelajaran: Guru HANYA melihat mata pelajaran yang diampunya
  let mapelList: Array<{ id: string; nama: string; kode: string }> = [];

  if (role === "TEACHER" && guruProfile && guruProfile.penugasan_mengajar.length > 0) {
    const mapelMap = new Map<string, { id: string; nama: string; kode: string }>();
    for (const p of guruProfile.penugasan_mengajar) {
      if (p.mata_pelajaran) {
        mapelMap.set(p.mata_pelajaran.id, p.mata_pelajaran);
      }
    }
    mapelList = Array.from(mapelMap.values()).sort((a, b) => a.nama.localeCompare(b.nama));
  }

  // Fallback untuk Super Admin / Staf Sekolah atau jika belum ada penugasan spesifik
  if (mapelList.length === 0) {
    mapelList = await prisma.mataPelajaran.findMany({
      where: { sekolah_id: user.sekolah_id },
      select: { id: true, nama: true, kode: true },
      orderBy: { nama: "asc" },
    });
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  let initialMapelId = resolvedParams?.mapelId;

  if (!initialMapelId && mapelList.length > 0) {
    initialMapelId = mapelList[0].id;
  }

  return (
    <AcademicShell
      user={user}
      userCapabilities={staffCapabilities}
      isSubscribed={isSubscribed}
      breadcrumbItems={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "CBT Ujian Online", href: "/cbt-ujian" },
        { label: "Bank Soal", href: "/cbt-ujian" },
        { label: "Buat Soal", href: "/cbt-ujian/bank-soal/buat", isCurrent: true },
      ]}
    >
      <CreateQuestionFullView
        sekolahId={user.sekolah_id}
        mapelList={mapelList}
        initialMapelId={initialMapelId}
      />
    </AcademicShell>
  );
}
