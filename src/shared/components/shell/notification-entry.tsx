"use client";

import * as React from "react";
import {
  Bell,
  CheckCheck,
  X,
  Megaphone,
  BookOpen,
  Award,
  UserCheck,
  Calendar,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getNotificationSummaryAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notification-actions";
import {
  InAppNotificationItem,
  NotificationType,
} from "@/modules/notification/domain/notification-types";

export function NotificationEntry() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<InAppNotificationItem[]>([]);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let isMounted = true;
    getNotificationSummaryAction(10).then((res) => {
      if (isMounted && res.success && res.data) {
        const data = res.data as { unread_count: number; items: InAppNotificationItem[] };
        setUnreadCount(data.unread_count);
        setNotifications(data.items);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadAction();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, apakah_dibaca: true, dibaca_pada: new Date() }))
      );
    } catch {
      // Graceful fallback
    }
  };

  const handleNotificationClick = async (notif: InAppNotificationItem) => {
    if (!notif.apakah_dibaca) {
      markNotificationReadAction(notif.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, apakah_dibaca: true } : n))
      );
    }

    if (notif.tautan_url) {
      setIsOpen(false);
      router.push(notif.tautan_url);
    }
  };

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case "PENGUMUMAN_BARU":
        return <Megaphone className="h-4 w-4 text-blue-600" />;
      case "TUGAS_BARU":
        return <BookOpen className="h-4 w-4 text-amber-600" />;
      case "NILAI_DITERBITKAN":
        return <Award className="h-4 w-4 text-purple-600" />;
      case "PENGAJUAN_IZIN":
        return <UserCheck className="h-4 w-4 text-emerald-600" />;
      case "JADWAL_BERUBAH":
        return <Calendar className="h-4 w-4 text-indigo-600" />;
      case "JOIN_REQUEST_RECEIVED":
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      case "JOIN_REQUEST_APPROVED":
        return <CheckCheck className="h-4 w-4 text-emerald-600" />;
      case "JOIN_REQUEST_REJECTED":
        return <X className="h-4 w-4 text-rose-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-500" />;
    }
  };

  const formatRelativeTime = (dateStr: Date | string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return "Kemarin";
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  return (
    <div className="relative shrink-0" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Pemberitahuan Sistem"
        className="relative flex items-center justify-center text-slate-500 hover:text-[#2563EB] hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 p-2.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 cursor-pointer shrink-0"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-in zoom-in-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 top-[5.25rem] sm:top-full mt-0 sm:mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 origin-top-right rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-3.5 shadow-2xl border border-slate-200/80 dark:border-slate-800 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-2">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Pemberitahuan</h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  unreadCount > 0
                    ? "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                {unreadCount} belum dibaca
              </span>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                >
                  Tandai semua
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-0.5">
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
                <p className="text-xs">Memuat pemberitahuan...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 text-emerald-500 mb-3 shadow-xs">
                  <CheckCheck className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                  Semua Sudah Terbaca
                </p>
                <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                  Tidak ada tugas baru atau pengumuman yang belum dilihat.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group flex items-start gap-3 p-2.5 rounded-xl transition-all cursor-pointer ${
                    notif.apakah_dibaca
                      ? "hover:bg-slate-50 dark:hover:bg-slate-800/60 opacity-85"
                      : "bg-blue-50/40 dark:bg-blue-950/30 hover:bg-blue-50/80 dark:hover:bg-blue-900/40 border-l-2 border-blue-600 dark:border-blue-400"
                  }`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    {renderIcon(notif.tipe)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-xs truncate ${
                          notif.apakah_dibaca
                            ? "font-medium text-slate-700 dark:text-slate-300"
                            : "font-bold text-slate-900 dark:text-white"
                        }`}
                      >
                        {notif.judul}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.pesan}
                    </p>
                  </div>
                  {!notif.apakah_dibaca && (
                    <span className="mt-2 h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 ring-2 ring-blue-100 dark:ring-blue-950" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Popover Footer */}
          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <Link
              href="/pengumuman"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <span>Buka Pusat Pengumuman</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
