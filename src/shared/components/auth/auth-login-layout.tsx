/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export function AuthLoginLayout({
  children,
  title = "Masuk ke Ruang Pintar",
  description = "Gunakan akun sekolah Anda untuk mengakses pembelajaran, aktivitas akademik, dan informasi sekolah.",
  backLink,
  badge,
  wideForm = false,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  backLink?: { href: string; label: string };
  badge?: string;
  wideForm?: boolean;
}) {
  return (
    <div className="relative isolate min-h-[100dvh] w-full overflow-hidden bg-[#E7EEFA] text-[#0F172A]">
      {/* 
        Full background illustration: login-hero-astronaut.png used in its entirety.
        Desktop: The whole 1619x971 artwork covers the viewport. The astronaut is on the left,
        the organic fluid wave runs through the middle, and the open pastel canvas extends across the right.
        Mobile: Matches auth-layout-reference.png - clean light background at top, astronaut anchored at bottom.
      */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Desktop: Entire illustration covering the viewport */}
        <div className="hidden lg:block absolute inset-0">
          <img
            src="/images/auth/login-hero-astronaut.png"
            alt="Ruang Pintar Background"
            className="h-full w-full object-cover object-left-center 2xl:object-center select-none pointer-events-none"
          />
        </div>

        {/* Mobile / Tablet (< lg): Matching reference auth-layout-reference.png */}
        <div className="lg:hidden absolute inset-0 flex flex-col justify-between">
          <div className="w-full h-full bg-gradient-to-b from-[#E7EEFA] via-[#EEF5FC] to-[#DFECFB]" />
          <div className="absolute bottom-0 inset-x-0 h-[280px] sm:h-[340px] overflow-hidden">
            <img
              src="/images/auth/login-hero-astronaut.png"
              alt="Astronaut Ruang Pintar"
              className="h-full w-full object-cover object-[16%_bottom] select-none pointer-events-none [mask-image:linear-gradient(to_bottom,transparent_0%,#000_22%,#000_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,#000_22%,#000_100%)]"
            />
          </div>
        </div>
      </div>

      {/* Header Brand Logo (Desktop/Tablet) */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-6 sm:p-8 lg:px-12 lg:py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-3.5 rounded-xl pr-3 outline-none focus-visible:ring-3 focus-visible:ring-blue-500/30"
        >
          <div className="relative size-10 sm:size-11 shrink-0 drop-shadow-[0_4px_12px_rgba(15,23,42,0.12)] flex items-center justify-center">
            <Image
              src="/images/brand/ruang-pintar-mark.png"
              alt="Ruang Pintar Logo"
              width={44}
              height={44}
              priority
              className="size-full object-contain"
            />
          </div>
          <span className="grid gap-0.5">
            <span className="text-[17px] leading-5 font-bold tracking-[-0.025em] text-[#1E293B]">
              Ruang Pintar
            </span>
            <span className="text-[11px] leading-4 font-semibold tracking-[0.025em] text-[#475569]">
              Academic Learning Platform
            </span>
          </span>
        </Link>

        {/* Top-Right Quick Action Link */}
        <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl bg-white/80 hover:bg-white text-[#1E293B] border border-white/90 shadow-xs backdrop-blur-sm transition-all"
          >
            Coba Gratis
          </Link>
        </div>
      </header>

      {/* Main Container - Balanced right positioning shifted gently from edge */}
      <main
        className={`relative z-10 min-h-[100dvh] w-full flex flex-col justify-between pt-16 sm:pt-20 lg:grid lg:grid-rows-1 lg:pt-0 ${
          wideForm
            ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(460px,530px)] xl:grid-cols-[minmax(0,1.2fr)_minmax(480px,550px)]"
            : "lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,520px)] xl:grid-cols-[minmax(0,1.15fr)_minmax(450px,500px)]"
        }`}
      >
        {/* Left Column Spacer (Full artwork shines through) */}
        <div className="hidden lg:block pointer-events-none" aria-hidden="true" />

        {/* Right Form Container: Shifted gently inward with modest breathing room */}
        <section
          className={`relative z-10 flex w-full flex-col justify-start lg:justify-center items-center lg:items-start px-5 sm:px-8 pt-3 pb-6 lg:py-4 xl:py-6 ${
            wideForm ? "lg:px-6 xl:px-8" : "lg:pl-4 lg:pr-14 xl:pr-20 2xl:pr-28"
          }`}
        >
          {/* Subtle Frosted Glass Container (Effek Glass Tipis) */}
          <div
            className={`w-full ${
              wideForm ? "max-w-[500px] xl:max-w-[530px]" : "max-w-[420px] sm:max-w-[440px]"
            } rounded-2xl sm:rounded-3xl bg-white/55 backdrop-blur-md border border-white/70 shadow-[0_12px_36px_-8px_rgba(15,23,42,0.06),0_1px_2px_rgba(255,255,255,0.7)] p-5 sm:p-6 lg:p-6.5 transition-all`}
          >
            {/* Optional Back Link */}
            {backLink && (
              <Link
                href={backLink.href}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] mb-3 group transition-colors"
              >
                <span className="transition-transform group-hover:-translate-x-0.5">&larr;</span>
                <span>{backLink.label}</span>
              </Link>
            )}

            {/* Header Content */}
            <div className="mb-3.5 space-y-1 sm:mb-4 sm:space-y-1.5">
              {badge && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#2563EB] text-[10.5px] font-bold tracking-wide uppercase">
                  {badge}
                </div>
              )}
              <h1 className="text-[21px] leading-[1.2] font-bold tracking-[-0.03em] text-[#0F172A] sm:text-[24px] xl:text-[26px]">
                {title}
              </h1>
              {description && (
                <p className="max-w-[44ch] text-[12px] leading-relaxed text-[#475569] sm:text-[13px]">
                  {description}
                </p>
              )}
            </div>

            {/* Form Fields & Controls */}
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
