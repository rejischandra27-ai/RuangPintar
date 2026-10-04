"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, ArrowRight, Sparkles, Users, GraduationCap } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { PasswordInput } from "@/shared/components/ui/password-input";
import {
  completeGoogleTeacherRegistrationAction,
  registerTeacherAction,
} from "@/app/actions/smart-onboarding-actions";
import { registerGuardianAction, getAvailableSchoolsAction } from "@/app/actions/guardian-actions";
import { SchoolDiscovery } from "@/modules/ai-assistant/presentation/school-discovery";
import { TeacherSchoolRegistrationChoice } from "@/modules/ai-assistant/domain/ai-types";

export function RegisterForm({
  googlePending,
}: {
  googlePending?: { nama_lengkap: string; email: string } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole =
    !googlePending && searchParams.get("role") === "guardian" ? "GUARDIAN" : "TEACHER";

  const [role, setRole] = useState<"TEACHER" | "GUARDIAN">(initialRole);
  const [teacherMode, setTeacherMode] = useState<"TRIAL" | "JOIN">("TRIAL");
  const [schools, setSchools] = useState<Array<{ id: string; nama: string; npsn: string | null }>>(
    []
  );
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [teacherSchoolChoice, setTeacherSchoolChoice] =
    useState<TeacherSchoolRegistrationChoice | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(
    searchParams.get("error") === "google_failed" ||
      (searchParams.get("oauth") === "google" && !googlePending)
      ? "Pendaftaran Google gagal. Silakan coba lagi."
      : null
  );

  useEffect(() => {
    getAvailableSchoolsAction().then((data) => {
      setSchools(data);
      if (data.length > 0) {
        setSelectedSchoolId(data[0].id);
      }
    });
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const password = formData.get("password")?.toString() ?? "";
    const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

    if (!googlePending && password.length < 8) {
      setErrorMessage("Kata sandi minimal 8 karakter.");
      return;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    if (!googlePending && (!hasUpper || !hasLower || !hasNumber || !hasSymbol)) {
      setErrorMessage(
        "Kata sandi wajib memadukan huruf besar, huruf kecil, angka, dan simbol (misal: RuangPintar@2026)."
      );
      return;
    }

    if (!googlePending && password !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    startTransition(async () => {
      try {
        if (role === "GUARDIAN") {
          formData.set("sekolah_id", selectedSchoolId);
          const res = await registerGuardianAction(formData);
          if (!res.success) {
            setErrorMessage(res.message || "Pendaftaran akun wali murid gagal.");
            return;
          }

          router.push(res.data?.redirectUrl || "/dashboard");
          router.refresh();
        } else {
          if (teacherMode === "JOIN" && !teacherSchoolChoice) {
            setErrorMessage("Pilih sekolah yang ditemukan atau buat sekolah baru terlebih dahulu.");
            return;
          }

          const choice: TeacherSchoolRegistrationChoice =
            teacherMode === "TRIAL"
              ? { nama_sekolah: "Guru Mandiri", jenjang: "UMUM" }
              : teacherSchoolChoice || { nama_sekolah: "Guru Mandiri", jenjang: "UMUM" };

          const res = googlePending
            ? await completeGoogleTeacherRegistrationAction(choice)
            : await registerTeacherAction(
                (() => {
                  if ("sekolah_id" in choice) {
                    formData.set("sekolah_id", choice.sekolah_id);
                    formData.delete("nama_sekolah");
                    formData.delete("jenjang");
                  } else {
                    formData.set("nama_sekolah", choice.nama_sekolah);
                    formData.set("jenjang", choice.jenjang);
                    formData.delete("sekolah_id");
                  }
                  return formData;
                })()
              );
          if (!res.success) {
            setErrorMessage(res.error || "Pendaftaran gagal. Periksa kembali formulir Anda.");
            return;
          }

          // Simpan nama pengguna untuk ucapan di onboarding
          const namaLengkap =
            googlePending?.nama_lengkap ?? formData.get("nama_lengkap")?.toString() ?? "";
          if (typeof window !== "undefined") {
            if (namaLengkap) {
              sessionStorage.setItem("rp_user_name", namaLengkap);
            }
            sessionStorage.removeItem("rp_first_class_setup_seen");
          }

          // Lanjut ke tahap berikutnya (Menunggu Persetujuan atau Pilih Avatar)
          const targetUrl = res.data?.redirectUrl || "/onboarding/pilih-avatar";
          router.push(targetUrl);
          router.refresh();
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Terjadi kesalahan saat memproses pendaftaran.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:gap-3 w-full">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-2.5 text-xs text-rose-800 shadow-2xs"
        >
          <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      {/* Role Switcher Tab */}
      {!googlePending && (
        <div className="flex flex-col gap-1">
          <label className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider select-none">
            Daftar Sebagai
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setRole("TEACHER")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                role === "TEACHER"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5 text-[#2563EB]" />
              <span>Guru Mandiri</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("GUARDIAN")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                role === "GUARDIAN"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5 text-amber-600" />
              <span>Wali Murid</span>
            </button>
          </div>
        </div>
      )}

      {/* Google Button */}
      {!googlePending && (
        <div className="flex flex-col gap-2 pt-0.5">
          <a
            href="/api/auth/google?mode=register"
            className="flex h-9.5 sm:h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-[13px] font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Daftar Cepat dengan Google</span>
          </a>

          <div className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            atau isi data manual
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </div>
      )}

      {/* Teacher School Mode Switch */}
      {role === "TEACHER" && !googlePending && (
        <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-blue-50/70 border border-blue-100/80">
          <span className="font-semibold text-blue-900">
            {teacherMode === "TRIAL" ? "✨ Coba Gratis 30 Hari (Otomatis)" : "🏫 Cari Sekolah"}
          </span>
          <button
            type="button"
            onClick={() => setTeacherMode(teacherMode === "TRIAL" ? "JOIN" : "TRIAL")}
            className="font-bold text-[#2563EB] hover:underline cursor-pointer"
          >
            {teacherMode === "TRIAL" ? "Gabung Sekolah Berlangganan?" : "Kembali ke Coba Mandiri"}
          </button>
        </div>
      )}

      {role === "TEACHER" && teacherMode === "JOIN" && (
        <div className="max-h-[220px] overflow-y-auto pr-1 rounded-xl border border-slate-200 bg-white/70 p-2.5 shadow-2xs">
          <SchoolDiscovery selectedChoice={teacherSchoolChoice} onSelect={setTeacherSchoolChoice} />
        </div>
      )}

      {googlePending ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 text-xs sm:text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Pendaftaran Google Terhubung</p>
          <p className="mt-0.5 text-slate-800 font-medium">{googlePending.nama_lengkap}</p>
          <p className="text-[11px] text-slate-500">{googlePending.email}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="nama_lengkap"
              className="text-xs font-semibold text-[#0F172A] select-none"
            >
              {role === "GUARDIAN" ? "Nama Lengkap Orang Tua / Wali" : "Nama Lengkap & Gelar"}
            </label>
            <Input
              id="nama_lengkap"
              name="nama_lengkap"
              type="text"
              required
              disabled={isPending}
              placeholder={
                role === "GUARDIAN" ? "cth: Hendra Setiawan" : "cth: Drs. Budi Setiawan, M.Pd"
              }
              className="h-9 sm:h-9.5 bg-white! text-slate-900! border-slate-200! placeholder:text-slate-400! shadow-2xs text-xs sm:text-[13.5px]"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-semibold text-[#0F172A] select-none">
              Email Akun
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              disabled={isPending}
              placeholder="nama@email.com"
              className="h-9 sm:h-9.5 bg-white! text-slate-900! border-slate-200! placeholder:text-slate-400! shadow-2xs text-xs sm:text-[13.5px]"
            />
          </div>
        </>
      )}

      {/* Guardian school selection */}
      {!googlePending && role === "GUARDIAN" ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="sekolah_id" className="text-xs font-semibold text-[#0F172A] select-none">
            Sekolah Tempat Anak Bersekolah
          </label>
          {schools.length > 0 ? (
            <select
              id="sekolah_id"
              name="sekolah_id"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              disabled={isPending}
              className="w-full h-9 sm:h-9.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs sm:text-[13.5px] font-medium shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} {s.npsn ? `(NPSN: ${s.npsn})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id="sekolah_id"
              name="sekolah_id"
              type="text"
              required
              disabled={isPending}
              placeholder="Masukkan ID / Nama Sekolah"
              className="h-9 sm:h-9.5 bg-white! text-slate-900! border-slate-200! shadow-2xs text-xs"
            />
          )}
        </div>
      ) : null}

      {/* Kata Sandi & Konfirmasi Grid */}
      {!googlePending && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-semibold text-[#0F172A] select-none">
              Kata Sandi
            </label>
            <PasswordInput
              id="password"
              name="password"
              required
              disabled={isPending}
              placeholder="Min. 8 karakter"
              className="h-9 sm:h-9.5 bg-white! text-slate-900! border-slate-200! placeholder:text-slate-400! shadow-2xs text-xs sm:text-[13.5px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-semibold text-[#0F172A] select-none"
            >
              Konfirmasi Sandi
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              required
              disabled={isPending}
              placeholder="Ulangi sandi"
              className="h-9 sm:h-9.5 bg-white! text-slate-900! border-slate-200! placeholder:text-slate-400! shadow-2xs text-xs sm:text-[13.5px]"
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 sm:h-10.5 w-full flex items-center justify-center gap-2 rounded-xl bg-[#1E293B] hover:bg-[#2B3B52] active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-md shadow-slate-900/10 focus:outline-none focus:ring-3 focus:ring-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin text-white" />
              <span>Memproses Pendaftaran...</span>
            </>
          ) : (
            <>
              <span>
                {googlePending
                  ? "Selesaikan Pendaftaran"
                  : role === "GUARDIAN"
                    ? "Daftar Akun & Buka Portal Klaim"
                    : teacherMode === "TRIAL"
                      ? "Mulai Coba Gratis & Lanjutkan"
                      : "Daftar & Lanjutkan ke Avatar"}
              </span>
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        <div className="text-center text-xs text-slate-500 py-0.5">
          Sudah memiliki akun?{" "}
          <Link
            href="/login"
            className="font-bold text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
          >
            Masuk di sini
          </Link>
        </div>
      </div>
    </form>
  );
}
