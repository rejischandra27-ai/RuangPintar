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
          if (!teacherSchoolChoice) {
            setErrorMessage("Pilih sekolah yang ditemukan atau buat sekolah baru terlebih dahulu.");
            return;
          }
          const res = googlePending
            ? await completeGoogleTeacherRegistrationAction(teacherSchoolChoice)
            : await registerTeacherAction(
                (() => {
                  if ("sekolah_id" in teacherSchoolChoice) {
                    formData.set("sekolah_id", teacherSchoolChoice.sekolah_id);
                    formData.delete("nama_sekolah");
                    formData.delete("jenjang");
                  } else {
                    formData.set("nama_sekolah", teacherSchoolChoice.nama_sekolah);
                    formData.set("jenjang", teacherSchoolChoice.jenjang);
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

          // Lanjut ke tahap berikutnya: Pilih Avatar
          router.push("/onboarding/pilih-avatar");
          router.refresh();
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Terjadi kesalahan saat memproses pendaftaran.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 sm:gap-4 w-full">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs sm:text-sm text-rose-800 shadow-sm"
        >
          <AlertCircle className="size-4 sm:size-5 shrink-0 text-rose-600 mt-0.5" />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      {/* Role Switcher Tab */}
      {!googlePending && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider select-none">
            Daftar Sebagai
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setRole("TEACHER")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                role === "TEACHER"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="h-4 w-4 text-[#2563EB]" />
              <span>Guru Mandiri</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("GUARDIAN")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                role === "GUARDIAN"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-4 w-4 text-amber-600" />
              <span>Wali Murid</span>
            </button>
          </div>
        </div>
      )}

      {role === "TEACHER" && (
        <>
          <SchoolDiscovery selectedChoice={teacherSchoolChoice} onSelect={setTeacherSchoolChoice} />
          {!googlePending && (
            <a
              href="/api/auth/google?mode=register"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
            >
              <span aria-hidden="true" className="text-base font-bold text-[#4285F4]">
                G
              </span>
              Daftar dengan Google
            </a>
          )}
          {!googlePending && (
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              atau isi data manual
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          )}
        </>
      )}

      {googlePending ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Pendaftaran Google</p>
          <p className="mt-1">{googlePending.nama_lengkap}</p>
          <p className="text-xs text-slate-600">{googlePending.email}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="nama_lengkap"
              className="text-xs sm:text-sm font-semibold text-[#0F172A] select-none"
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
              className="h-10 sm:h-11 bg-white! text-slate-900! border-slate-200! placeholder:text-slate-400! shadow-xs text-[13px] sm:text-[14px]"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="text-xs sm:text-sm font-semibold text-[#0F172A] select-none"
            >
              Email Akun
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              disabled={isPending}
              placeholder="nama@email.com"
              className="h-10 sm:h-11 bg-white! text-slate-900! border-slate-200! placeholder:text-slate-400! shadow-xs text-[13px] sm:text-[14px]"
            />
          </div>
        </>
      )}

      {/* Guardian school selection */}
      {!googlePending && role === "GUARDIAN" ? (
        <div className="flex flex-col gap-1">
          <label
            htmlFor="sekolah_id"
            className="text-xs sm:text-sm font-semibold text-[#0F172A] select-none"
          >
            Sekolah Tempat Anak Bersekolah
          </label>
          {schools.length > 0 ? (
            <select
              id="sekolah_id"
              name="sekolah_id"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              disabled={isPending}
              className="w-full h-10 sm:h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-[13px] sm:text-[14px] font-medium shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]"
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
              className="h-10 sm:h-11 bg-white! text-slate-900! border-slate-200! shadow-xs"
            />
          )}
        </div>
      ) : null}

      {/* Kata Sandi & Konfirmasi Grid */}
      {!googlePending && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="text-xs sm:text-sm font-semibold text-[#0F172A] select-none"
            >
              Kata Sandi
            </label>
            <PasswordInput
              id="password"
              name="password"
              required
              disabled={isPending}
              placeholder="Min. 8 karakter (huruf, angka & simbol)"
              className="h-10 sm:h-11 bg-white! text-slate-900! border-slate-200! placeholder:text-slate-400! shadow-xs text-[13px] sm:text-[14px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="confirmPassword"
              className="text-xs sm:text-sm font-semibold text-[#0F172A] select-none"
            >
              Konfirmasi Sandi
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              required
              disabled={isPending}
              placeholder="Ulangi kata sandi"
              className="h-10 sm:h-11 bg-white! text-slate-900! border-slate-200! placeholder:text-slate-400! shadow-xs text-[13px] sm:text-[14px]"
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex flex-col gap-2.5 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-11 sm:h-12 w-full flex items-center justify-center gap-2 rounded-xl bg-[#1E293B] hover:bg-[#2B3B52] active:scale-[0.99] text-white font-semibold text-sm sm:text-base shadow-md shadow-slate-900/10 focus:outline-none focus:ring-3 focus:ring-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 sm:size-5 animate-spin text-white" />
              <span>Memproses Pendaftaran...</span>
            </>
          ) : (
            <>
              <span>
                {googlePending
                  ? "Selesaikan Pendaftaran"
                  : role === "GUARDIAN"
                    ? "Daftar Akun & Buka Portal Klaim"
                    : "Daftar & Lanjutkan ke Avatar"}
              </span>
              <ArrowRight className="size-4 sm:size-5" />
            </>
          )}
        </button>

        <div className="text-center text-xs text-slate-500 py-1">
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
