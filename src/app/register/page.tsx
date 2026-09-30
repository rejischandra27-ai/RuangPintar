import { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { AuthLoginLayout } from "@/shared/components/auth/auth-login-layout";
import {
  GOOGLE_PENDING_REGISTRATION_COOKIE,
  readGooglePendingRegistrationCookie,
} from "@/shared/infrastructure/auth/google-oauth-service";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Daftar Akun — Ruang Pintar",
  description: "Daftar akun Ruang Pintar untuk guru mandiri dan wali murid sekolah.",
};

export default async function RegisterPage() {
  const pendingCookie = (await cookies()).get(GOOGLE_PENDING_REGISTRATION_COOKIE)?.value;
  const googlePending = readGooglePendingRegistrationCookie(pendingCookie);

  return (
    <AuthLoginLayout
      title="Daftar Akun Ruang Pintar"
      description="Buat akun baru untuk memulai pengalaman administrasi dan pembelajaran modern terintegrasi."
      badge="Registrasi Cepat"
      backLink={{ href: "/login", label: "Kembali ke Masuk" }}
    >
      <Suspense
        fallback={
          <div className="p-8 text-center text-slate-500 text-sm">
            Memuat formulir pendaftaran...
          </div>
        }
      >
        <RegisterForm googlePending={googlePending} />
      </Suspense>
    </AuthLoginLayout>
  );
}
