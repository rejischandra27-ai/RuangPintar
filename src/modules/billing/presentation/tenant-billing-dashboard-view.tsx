"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  ShieldCheck,
  Zap,
  Clock,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import { TenantBillingOverviewDTO } from "../domain/billing-types";
import {
  getTenantBillingOverviewAction,
  simulatePaymentSuccessAction,
  initiateProCheckoutAction,
} from "@/app/actions/billing-actions";
import { SubscriptionCheckoutModal } from "./subscription-checkout-modal";

interface TenantBillingDashboardViewProps {
  initialData?: TenantBillingOverviewDTO | null;
  className?: string;
}

export function TenantBillingDashboardView({
  initialData,
  className = "",
}: TenantBillingDashboardViewProps) {
  const [data, setData] = useState<TenantBillingOverviewDTO | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadBillingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTenantBillingOverviewAction();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || "Gagal memuat status langganan tenant.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (!initialData) {
      void getTenantBillingOverviewAction()
        .then((res) => {
          if (!ignore) {
            if (res.success && res.data) {
              setData(res.data);
            } else {
              setError(res.error || "Gagal memuat status langganan tenant.");
            }
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!ignore) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
            setLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [initialData]);

  const handleSimulatePayment = () => {
    startTransition(async () => {
      setLoading(true);
      try {
        const orderRes = await initiateProCheckoutAction(1);
        if (orderRes.success && orderRes.data) {
          await simulatePaymentSuccessAction(orderRes.data.order_id);
          await loadBillingData();
        } else {
          setError(orderRes.error || "Gagal memulai simulasi pesanan.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal simulasi.");
      } finally {
        setLoading(false);
      }
    });
  };

  const formatIndonesianDate = (dateStr: string | null) => {
    if (!dateStr) return "Tidak ada batasan";
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return {
          label: "Berlangganan Aktif",
          bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
          icon: <CheckCircle2 className="size-3.5 text-emerald-600" />,
        };
      case "TRIAL_ACTIVE":
        return {
          label: "Uji Coba Aktif (Trial)",
          bg: "bg-blue-50 border-blue-200 text-blue-700",
          icon: <Sparkles className="size-3.5 text-blue-600" />,
        };
      case "GRACE_PERIOD":
      case "PAST_DUE":
        return {
          label: "Masa Tenggang",
          bg: "bg-amber-50 border-amber-200 text-amber-700",
          icon: <AlertTriangle className="size-3.5 text-amber-600" />,
        };
      case "READ_ONLY":
        return {
          label: "Mode Hanya Baca (Read-Only)",
          bg: "bg-rose-50 border-rose-200 text-rose-700",
          icon: <Lock className="size-3.5 text-rose-600" />,
        };
      case "SUSPENDED":
        return {
          label: "Akses Ditangguhkan",
          bg: "bg-red-100 border-red-300 text-red-800",
          icon: <AlertTriangle className="size-3.5 text-red-600" />,
        };
      default:
        return {
          label: status,
          bg: "bg-slate-50 border-slate-200 text-slate-700",
          icon: <Clock className="size-3.5 text-slate-500" />,
        };
    }
  };

  if (loading && !data) {
    return (
      <div className={`p-8 rounded-3xl bg-white border border-slate-100 shadow-sm ${className}`}>
        <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
          <RefreshCw className="size-5 animate-spin text-[#2563EB]" />
          <span className="text-sm font-medium">Memuat informasi langganan tenant...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        className={`p-6 rounded-3xl bg-rose-50/50 border border-rose-100 text-rose-700 ${className}`}
      >
        <div className="flex items-center gap-2 mb-2 font-bold text-sm">
          <AlertTriangle className="size-4 text-rose-600" />
          <span>Gagal Memuat Billing Tenant</span>
        </div>
        <p className="text-xs mb-4">{error}</p>
        <button
          type="button"
          onClick={loadBillingData}
          className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-50"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const badge = getStatusBadge(data?.statusLangganan || "TRIAL_ACTIVE");

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Header Card with Academic Glass Aesthetic */}
      <div className="relative rounded-3xl bg-white border border-slate-100/90 p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-50/60 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold">
                <Building2 className="size-3.5" />
                {data?.namaSekolah}
              </span>
              {data?.npsn && (
                <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 text-xs font-medium">
                  NPSN: {data.npsn}
                </span>
              )}
              {data?.isOwner && (
                <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-extrabold tracking-wide uppercase">
                  Owner Institusi
                </span>
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              Tata Kelola & Status Langganan Tenant
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Sesuai ADR-003, seluruh hak akses dan kuota operasional melekat pada institusi sekolah
              (tenant) sebagai entitas pelanggan resmi.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setCheckoutModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex-1 md:flex-initial"
            >
              <Zap className="size-4" />
              <span>Tingkatkan / Perpanjang Paket</span>
              <ArrowUpRight className="size-4 opacity-70" />
            </button>
            <button
              type="button"
              onClick={handleSimulatePayment}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              title="Simulasi pelunasan pembayaran instan untuk keperluan pengujian"
            >
              <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span>Simulasi Lunas</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key 5 Indicators (StatCards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Paket Saat Ini */}
        <div className="rounded-2xl bg-white border border-slate-100/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Paket Saat Ini</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#2563EB]">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {data?.paketSaatIni || "TRIAL"}
          </div>
          <p className="text-[11px] text-slate-500">
            {data?.paketSaatIni === "TRIAL"
              ? "Uji Coba Fitur SaaS Lengkap"
              : data?.paketSaatIni === "PRO"
                ? "Paket Guru & Sekolah Pro"
                : "Lisensi Institusi Enterprise"}
          </p>
        </div>

        {/* Metric 2: Status Langganan */}
        <div className="rounded-2xl bg-white border border-slate-100/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Status Langganan</span>
            <div className="p-2 rounded-xl bg-slate-50 text-slate-600">
              <Sparkles className="size-4" />
            </div>
          </div>
          <div className="pt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${badge.bg}`}
            >
              {badge.icon}
              <span>{badge.label}</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Kode: <span className="font-mono text-slate-700">{data?.statusLangganan}</span>
          </p>
        </div>

        {/* Metric 3: Tanggal Berakhir */}
        <div className="rounded-2xl bg-white border border-slate-100/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Tanggal Berakhir</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Calendar className="size-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-800 leading-tight">
            {formatIndonesianDate(data?.tanggalBerakhir ?? null)}
          </div>
          <p className="text-[11px] text-slate-500">
            {data?.tanggalBerakhir ? "Masa aktif jatuh tempo" : "Berlaku tanpa batas"}
          </p>
        </div>

        {/* Metric 4: Masa Trial Tersisa / Durasi */}
        <div className="rounded-2xl bg-white border border-slate-100/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Masa Tersisa</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {data?.hariTersisa ? `${data.hariTersisa} Hari` : "Kedaluwarsa"}
          </div>
          <p className="text-[11px] text-slate-500">
            {data?.isTrial ? "Masa uji coba gratis tersisa" : "Sisa durasi paket berbayar"}
          </p>
        </div>

        {/* Metric 5: Status Tenant */}
        <div className="rounded-2xl bg-white border border-slate-100/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Status Tenant</span>
            <div
              className={`p-2 rounded-xl ${
                data?.allowsMutation ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}
            >
              {data?.allowsMutation ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Lock className="size-4" />
              )}
            </div>
          </div>
          <div className="text-xs font-bold text-slate-800 leading-tight">{data?.statusTenant}</div>
          <p className="text-[11px] text-slate-500">
            {data?.allowsMutation
              ? "Mutasi data & KBM aktif penuh"
              : "Operasi tulis ditolak (Read-Only)"}
          </p>
        </div>
      </div>

      {/* 3. Operational Invariant Banner */}
      {!data?.allowsMutation ? (
        <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-start gap-3.5 text-rose-900 shadow-xs">
          <Lock className="size-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold">
              Mode Hanya Baca Aktif — Pembaharuan Langganan Diperlukan
            </h4>
            <p className="text-xs text-rose-700 leading-relaxed">
              Masa aktif institusi telah berakhir. Anda tetap dapat meninjau dan mengekspor seluruh
              data historis akademik, presensi, dan nilai. Untuk melanjutkan input nilai, presensi
              sesi baru, dan penerbitan CBT, silakan perpanjang paket institusi.
            </p>
          </div>
        </div>
      ) : data?.isTrial ? (
        <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3.5 text-blue-900 shadow-xs">
          <Sparkles className="size-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold">
              Uji Coba Institusi Aktif ({data.hariTersisa} Hari Tersisa)
            </h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              Seluruh modul akademik, CBT, workspace pengajaran, dan monitoring beroperasi penuh.
              Anda dapat melakukan aktivasi paket resmi kapan saja tanpa kehilangan data.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3.5 text-emerald-900 shadow-xs">
          <CheckCircle2 className="size-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold">
              Langganan Institusi Aktif & Terverifikasi
            </h4>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Tenant sekolah beroperasi penuh dengan dukungan SLA operasional dan backup data
              otomatis.
            </p>
          </div>
        </div>
      )}

      {/* Subscription Checkout Modal Integration */}
      <SubscriptionCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        onSuccess={() => {
          setCheckoutModalOpen(false);
          loadBillingData();
        }}
      />
    </div>
  );
}
