import { Metadata } from "next";
import { getCurrentUser } from "@/shared/infrastructure/auth/auth-guard";
import { RombelJoinView } from "@/modules/student/presentation/rombel-join-view";

export const metadata: Metadata = {
  title: "Gabung Rombel — Ruang Pintar",
  description: "Pendaftaran mandiri siswa ke rombel menggunakan kode atau tautan undangan.",
};

interface PageProps {
  searchParams?: Promise<{ code?: string }>;
}

export default async function JoinPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const search = searchParams ? await searchParams : undefined;
  const initialCode = search?.code || "";

  return <RombelJoinView initialCode={initialCode} currentUser={user} />;
}
