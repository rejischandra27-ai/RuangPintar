import { Metadata } from "next";
import { getCurrentUser } from "@/shared/infrastructure/auth/auth-guard";
import { RombelJoinView } from "@/modules/student/presentation/rombel-join-view";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const upper = code ? code.toUpperCase() : "";
  return {
    title: `Gabung Rombel ${upper} — Ruang Pintar`,
    description: `Pendaftaran mandiri siswa ke rombel dengan kode undangan ${upper}.`,
  };
}

export default async function JoinCodePage({ params }: PageProps) {
  const { code } = await params;
  const user = await getCurrentUser();

  return <RombelJoinView initialCode={code || ""} currentUser={user} />;
}
