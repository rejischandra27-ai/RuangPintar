import React from "react";
import { Metadata } from "next";
import { AuthLoginLayout } from "@/shared/components/auth/auth-login-layout";
import { AvatarPicker } from "./avatar-picker";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const metadata: Metadata = {
  title: "Pilih Avatar — Ruang Pintar",
  description: "Pilih avatar karakter astronot untuk profil akun Ruang Pintar Anda",
};

export default async function PilihAvatarPage() {
  const user = await requireAuth();
  if (user.peran_dasar !== "TEACHER" || !user.sekolah_id) redirect("/dashboard");
  const profile = await prisma.pengguna.findUnique({
    where: { id: user.id },
    select: { avatar_id: true },
  });

  return (
    <AuthLoginLayout
      title="Pilih Avatar Anda"
      description="Pilih karakter astronot favorit Anda untuk mewakili profil belajar dan aktivitas akademik Anda di Ruang Pintar."
      badge="Langkah 2 dari 3"
      backLink={{ href: "/register", label: "Kembali ke Registrasi" }}
      wideForm={true}
    >
      <AvatarPicker initialAvatarId={profile?.avatar_id ?? "kapten-kosmik"} />
    </AuthLoginLayout>
  );
}
