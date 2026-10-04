"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginAction, AuthActionResult } from "@/app/actions/auth-actions";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { PasswordInput } from "@/shared/components/ui/password-input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { TextLink } from "@/shared/components/ui/text-link";
import { Button } from "@/shared/components/ui/button";
import { InputError } from "@/shared/components/ui/input-error";

export function LoginForm({ status }: { status?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result: AuthActionResult = await loginAction(null, formData);
      if (!result.success) {
        setErrorMessage(result.error ?? "Login gagal. Silakan coba lagi.");
        // Reset password input on failure for security
        const passwordInput = form.querySelector<HTMLInputElement>('input[name="password"]');
        if (passwordInput) {
          passwordInput.value = "";
          passwordInput.focus();
        }
      } else if (result.redirectUrl) {
        router.push(result.redirectUrl);
        router.refresh();
      }
    });
  };

  return (
    <form
      method="POST"
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 sm:gap-5 w-full"
      noValidate={false}
    >
      {/* Optional Success Status Banner */}
      {status && (
        <div
          role="status"
          className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-3 text-xs sm:text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {status}
        </div>
      )}

      {/* Username or Email Field */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username" className="text-xs sm:text-sm font-semibold text-[#0F172A]">
          Username atau Email
        </Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          disabled={isPending}
          isError={Boolean(errorMessage)}
          placeholder="Masukkan username atau email"
          inputSize="lg"
          className="h-11 sm:h-12 text-[14px] sm:text-[15px] bg-white! text-slate-900! border-slate-200! placeholder:text-slate-400! shadow-xs"
        />
        <InputError message={errorMessage} />
      </div>

      {/* Password Field */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-xs sm:text-sm font-semibold text-[#0F172A]">
          Kata sandi
        </Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          isError={Boolean(errorMessage)}
          placeholder="Masukkan kata sandi"
          inputSize="lg"
          className="h-11 sm:h-12 text-[14px] sm:text-[15px] bg-white! text-slate-900! border-slate-200! placeholder:text-slate-400! shadow-xs"
        />
      </div>

      {/* Remember Me & Forgot Password Row */}
      <div className="flex items-center justify-between min-h-[36px] sm:min-h-11">
        <Checkbox
          id="remember"
          name="remember"
          label="Ingat saya"
          disabled={isPending}
          className="text-xs sm:text-sm"
        />

        <TextLink href="/forgot-password" className="text-xs sm:text-sm">
          Lupa kata sandi?
        </TextLink>
      </div>

      {/* Primary Action Button */}
      <div className="flex flex-col gap-2 sm:gap-2.5 pt-0.5">
        <Button
          type="submit"
          size="lg"
          variant="primary"
          isLoading={isPending}
          disabled={isPending}
          className="h-12 w-full rounded-xl bg-[#1E293B] hover:bg-[#26364B] active:scale-[0.99] text-white font-semibold shadow-[0_8px_22px_rgba(15,23,42,0.16)] text-[15px] sm:text-base transition-all cursor-pointer"
        >
          Masuk
        </Button>

        <a
          href="/api/auth/google?mode=login"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[15px] font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
        >
          <span aria-hidden="true" className="text-base font-bold text-[#4285F4]">
            G
          </span>
          Masuk dengan Google
        </a>

        {/* Supporting Footer Text */}
        <p className="text-center text-[11px] sm:text-xs text-[#64748B]">
          Akun sekolah resmi dikelola oleh administrator sekolah.
        </p>

        <div className="text-center pt-3 border-t border-slate-200/80">
          <p className="text-[12px] sm:text-[13px] text-slate-600">
            Guru baru?{" "}
            <Link href="/register" className="text-[#2563EB] font-semibold hover:underline">
              Coba Gratis 30 Hari (Daftar Mandiri)
            </Link>
          </p>
        </div>
      </div>
    </form>
  );
}
