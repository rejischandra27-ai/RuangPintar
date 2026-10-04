"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  CheckCircle2,
  Star,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  School,
  FileSpreadsheet,
  MessageCircle,
  HelpCircle,
  LogOut,
  LogIn,
  LayoutDashboard,
  Check,
  Zap,
  BookMarked,
  Search,
  Menu,
  X,
  ChevronRight,
  Globe,
  Compass,
  Ticket,
  Send,
  Bell,
  GraduationCap,
  Shield,
  ArrowUp,
} from "lucide-react";
import { AnimatedCounter } from "@/shared/components/motion/animated-counter";
import {
  motion,
  AnimatePresence,
  FadeIn,
  InteractiveCard,
} from "@/shared/components/motion/motion-elements";
import { ProCheckoutButton } from "@/modules/billing/presentation/pro-checkout-button";
import { logoutAction } from "@/app/actions/auth-actions";

export interface ModernLandingViewProps {
  user: {
    id: string;
    nama: string;
    username: string;
    role: string;
  } | null;
}

// Decorative Hand-Drawn Doodle Rays (Inspired by Camply video accents)
function DoodleRays({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`inline-block pointer-events-none ${className}`}
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18 4V10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M28 8L23.5 12.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 18H26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Hand-Drawn Doodle Squiggle Underline (Camply reference)
function DoodleUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none ${className}`}
      viewBox="0 0 260 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 14C60 4 170 3 256 12C185 7 90 9 18 16"
        stroke="#F97316"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Interactive School Pin on Dotted Map
interface MapSchoolPin {
  id: string;
  name: string;
  category: "SMK" | "SMA";
  city: string;
  badge: string;
  status: string;
  students: number;
  teachers: number;
  image: string;
  featured?: boolean;
  x: string;
  y: string;
}

const MAP_PINS: MapSchoolPin[] = [
  {
    id: "pin-1",
    name: "SMK Negeri 1 Jakarta",
    category: "SMK",
    city: "Jakarta Pusat, DKI Jakarta",
    badge: "Pusat Keunggulan",
    status: "KBM Digital Berjalan",
    students: 1280,
    teachers: 74,
    image: "/images/features/pin-campus.jpg",
    featured: true,
    x: "62%",
    y: "50%",
  },
  {
    id: "pin-2",
    name: "SMA PGRI 1 Bekasi",
    category: "SMA",
    city: "Bekasi, Jawa Barat",
    badge: "Sekolah Penggerak",
    status: "Leger Rapor 100% Valid",
    students: 850,
    teachers: 48,
    image: "/images/illustrations/school-hero-3d.png",
    x: "20%",
    y: "42%",
  },
  {
    id: "pin-3",
    name: "SMK Otomindo Jakarta",
    category: "SMK",
    city: "Jakarta Timur, DKI Jakarta",
    badge: "Mitra Industri",
    status: "CBT Ujian Terlindungi",
    students: 640,
    teachers: 42,
    image: "/images/illustrations/academic-structure-3d.png",
    x: "48%",
    y: "32%",
  },
  {
    id: "pin-4",
    name: "SMA Negeri 3 Yogyakarta",
    category: "SMA",
    city: "D.I. Yogyakarta",
    badge: "Rujukan Nasional",
    status: "Presensi Vision AI 98%",
    students: 1050,
    teachers: 68,
    image: "/images/illustrations/student-lifecycle-3d.png",
    x: "82%",
    y: "36%",
  },
  {
    id: "pin-5",
    name: "SMK TI Bali Global",
    category: "SMK",
    city: "Denpasar, Bali",
    badge: "Vokasi Teknologi",
    status: "LMS Modul Terpublikasi",
    students: 920,
    teachers: 56,
    image: "/images/features/pin-campus.jpg",
    x: "36%",
    y: "68%",
  },
];

// Stylized Radar Beacon (Concentric geometric dots + pulsing ripple)
function RadarBeacon({ active = false }: { active?: boolean }) {
  return (
    <div className="relative flex items-center justify-center size-8 pointer-events-none select-none">
      {/* Animated Ping Wave */}
      <span className="absolute size-7 rounded-full bg-amber-500/25 animate-ping" />
      <span className="absolute size-10 rounded-full bg-amber-500/10 animate-pulse" />
      {/* Hexagonal Satellite Dots */}
      <svg className="absolute size-7 text-amber-500" viewBox="0 0 28 28" fill="currentColor">
        <circle cx="14" cy="3" r="1.5" opacity="0.85" />
        <circle cx="23.5" cy="8.5" r="1.5" opacity="0.85" />
        <circle cx="23.5" cy="19.5" r="1.5" opacity="0.85" />
        <circle cx="14" cy="25" r="1.5" opacity="0.85" />
        <circle cx="4.5" cy="19.5" r="1.5" opacity="0.85" />
        <circle cx="4.5" cy="8.5" r="1.5" opacity="0.85" />
      </svg>
      {/* Core Center Amber Beacon */}
      <div className="relative size-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 shadow-sm shadow-amber-500" />
    </div>
  );
}

// Smooth Scroll-Triggered Reveal Component ditenagai oleh motion/react (Hardware-accelerated 60fps)
function RevealOnScroll({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{
        duration: 0.5,
        delay: Math.min(delay, 200) / 1000,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ModernLandingView({ user }: ModernLandingViewProps) {
  // Kunci landing page SELALU Light Mode (terang & bersih 24 jam)
  React.useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // 1. Sticky Header & Scroll Motion Tracking
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activePinId, setActivePinId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 24);
      setShowScrollTop(scrollY > 400);

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollY / docHeight) * 100));
        setScrollProgress(progress);
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 2. Interactive Testimonials Carousel (Matching Camply slider)
  const testimonials = [
    {
      quote:
        "Dulu tiap akhir semester saya stres begadang rekap absen dan nilai dari lembar kertas ke Excel. Di Ruang Pintar, tinggal foto lembar kertas absen, 5 detik langsung jadi data rapi. Waktu istirahat bersama keluarga jadi tidak terganggu lagi!",
      name: "Ibu Wardah Ulfah Fauzziyah, S.Pd.",
      role: "Guru Matematika",
      school: "SMA PGRI 1 Bekasi",
      initials: "WU",
      gradient: "from-pink-500 to-rose-500",
      rating: 5,
    },
    {
      quote:
        "Aplikasi ini luar biasa ringan dibuka lewat HP di ruang kelas bengkel dan lab. Tampilan hurufnya jelas, tombolnya besar dan ramah sentuhan. Guru senior pun langsung lancar pakai tanpa pusing urusan teknis.",
      name: "Pak Eri Chandra Apriyadi, S.Kom.",
      role: "Guru Kejuruan & Kaprog",
      school: "SMK Otomindo Jakarta",
      initials: "EC",
      gradient: "from-blue-600 to-indigo-600",
      rating: 5,
    },
    {
      quote:
        "Sebagai kepala sekolah, saya sangat terbantu karena jurnal mengajar guru dan absensi siswa bisa dipantau real-time dari meja kerja. Sangat efektif dan mempermudah digitalisasi sekolah secara menyeluruh.",
      name: "Drs. H. Suryadi, M.M.",
      role: "Kepala Sekolah Mitra",
      school: "Jawa Barat",
      initials: "SY",
      gradient: "from-emerald-600 to-teal-600",
      rating: 5,
    },
    {
      quote:
        "Ujian CBT online dengan proteksi anti-curang sangat menghemat kertas fotokopi ulangan harian. Nilai langsung masuk ke leger nilai Kurikulum Merdeka tanpa perlu koreksi manual satu per satu.",
      name: "Siti Rahmawati, M.Pd.",
      role: "Waka Kurikulum",
      school: "SMK Negeri 2 Bandung",
      initials: "SR",
      gradient: "from-amber-500 to-orange-500",
      rating: 5,
    },
  ];
  const [activeTestimonial, setActiveTestimonial] = React.useState(0);

  const prevTestimonial = () => {
    setActiveTestimonial((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };
  const nextTestimonial = () => {
    setActiveTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  // 3. Interactive Role & Need Finder (Matching the Camply map widget)
  const [selectedRole, setSelectedRole] = React.useState("Guru Pengampu");
  const [selectedNeed, setSelectedNeed] = React.useState("Absen Foto AI");
  const [finderSubmitted, setFinderSubmitted] = React.useState(false);

  const roleSolutions: Record<string, { title: string; desc: string; cta: string; link: string }> =
    {
      "Guru Pengampu": {
        title: "Solusi Cepat Mengajar & Presensi Kelas",
        desc: "Foto lembar absensi kertas 5 detik, catat jurnal KBM, dan kelola buku nilai Kurikulum Merdeka langsung dari HP.",
        cta: "Coba Gratis 30 Hari",
        link: "/register",
      },
      "Wali Kelas": {
        title: "Pusat Perhatian & Monitoring Rombel",
        desc: "Pantau siswa alpha, tugas tertunda, dan kirim catatan pembinaan wali siswa secara terstruktur.",
        cta: "Lihat Fitur Wali Kelas",
        link: "#fitur",
      },
      "Kepala Sekolah": {
        title: "Dashboard Pimpinan & Manajemen Sekolah",
        desc: "Rekap keterlaksanaan jam mengajar guru real-time, monitoring jurnal harian, dan evaluasi KBM terpadu.",
        cta: "Konsultasi Sekolah",
        link: "#biaya",
      },
      "Wali Murid": {
        title: "Portal Kehadiran & Capaian Belajar Anak",
        desc: "Notifikasi kehadiran KBM harian, rekap nilai terpublikasi, dan pengajuan izin sakit online tanpa ribet.",
        cta: "Pelajari Portal Wali",
        link: "/panduan",
      },
    };

  // 4. Interactive FAQ Accordion
  const faqs = [
    {
      q: "Apakah benar 100% gratis selama 30 hari tanpa kartu kredit?",
      a: "Ya, 100% gratis dengan akses penuh ke fitur mengajar. Anda tidak diminta memasukkan nomor kartu kredit maupun komitmen biaya apapun saat mendaftar.",
    },
    {
      q: "Apa yang terjadi jika masa coba 30 hari selesai? Apakah data saya hilang?",
      a: "Data Anda dijamin 100% aman dan TIDAK AKAN PERNAH DIHAPUS. Anda tetap bisa masuk ke akun dan mengunduh seluruh rekap nilai maupun absensi ke format Excel kapan saja. Anda cukup memilih untuk berlangganan mandiri (Guru Pro Rp 15rb/bln) atau mengajukan lisensi ke sekolah.",
    },
    {
      q: "Bagaimana cara implementasi Ruang Pintar untuk seluruh guru di sekolah?",
      a: "Sangat mudah. Pimpinan sekolah dapat langsung mengundang seluruh dewan guru untuk mengelola KBM, absensi foto AI, CBT ujian, dan leger rapor terpadu dalam satu sistem yang rapi tanpa perlu instalasi server rumit.",
    },
    {
      q: "Bagaimana jika di sekolah saya ada beberapa guru yang ikut mendaftar?",
      a: "Setiap guru dapat mengelola kelasnya secara mandiri. Ketika sekolah Anda memutuskan berlangganan lisensi institusi resmi, seluruh data kelas guru tersebut dapat langsung diintegrasikan ke sistem pusat sekolah tanpa harus input ulang.",
    },
  ];
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  // 5. Question form submission feedback
  const [questionContact, setQuestionContact] = React.useState("");
  const [questionSent, setQuestionSent] = React.useState(false);

  const handleSendQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionContact.trim()) return;
    setQuestionSent(true);
    setTimeout(() => {
      setQuestionSent(false);
      setQuestionContact("");
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFD] dark:bg-[#070B14] text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white font-sans antialiased relative">
      {/* Scroll Progress Bar at the Very Top (Scroll Motion Indicator) */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-sky-400 to-amber-500 z-[100] origin-left pointer-events-none transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(scrollProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      {/* ─────────────────────────────────────────────────────────────
          1. STICKY TOP NAVBAR (Seamless blend at top, sticky blur on scroll)
      ───────────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-white/90 dark:bg-[#090D16]/90 backdrop-blur-md shadow-sm border-b border-slate-200/80 dark:border-slate-800/80 py-3 sm:py-3.5"
            : "bg-transparent border-b border-transparent py-4 sm:py-6"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Official 3D Glass Logo + Century Gothic Brand Name */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group flex-shrink-0">
            <div className="relative size-10 sm:size-11 flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/brand/ruang-pintar-mark.png"
                alt="Ruang Pintar Official Logo"
                width={44}
                height={44}
                priority
                className="size-full object-contain drop-shadow-sm"
              />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl sm:text-2xl font-bold font-century text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Ruang Pintar
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold text-xl leading-none">
                  .
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase leading-tight mt-0.5 font-century">
                School Digital Platform
              </span>
            </div>
          </Link>

          {/* Center Links with Staggered Slide-in From Side (Visible on desktop >= 1200px) */}
          <nav className="hidden xl:flex items-center gap-7 text-sm font-semibold text-slate-600 dark:text-slate-300 font-century">
            <a
              href="#hero"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors animate-nav-1"
            >
              Beranda
            </a>
            <a
              href="#fitur"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors animate-nav-2"
            >
              Fitur
            </a>
            <a
              href="#ekosistem"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors animate-nav-3"
            >
              Ekosistem
            </a>
            <a
              href="#testimoni"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors animate-nav-4"
            >
              Testimoni
            </a>
            <a
              href="#biaya"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors animate-nav-5"
            >
              Biaya & Lisensi
            </a>
            <Link
              href="/panduan"
              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors animate-nav-6"
            >
              <BookMarked className="size-4" />
              <span>Panduan</span>
            </Link>
          </nav>

          {/* Auth Action Buttons with Slide-In Motion & iPad-Safe Sizing */}
          <div className="flex items-center gap-2 sm:gap-3 animate-nav-cta">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95 font-century"
                >
                  <LayoutDashboard className="size-3.5 sm:size-4" />
                  <span>Dashboard Saya</span>
                </Link>
                <form action={logoutAction} className="hidden sm:inline-block">
                  <button
                    type="submit"
                    className="size-9 sm:size-10 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-rose-50 hover:border-rose-200 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Keluar"
                  >
                    <LogOut className="size-4" />
                  </button>
                </form>
              </div>
            ) : (
              <>
                {/* Minimalist Login Icon Button with Finger Proximity / Hover Tooltip */}
                <div className="relative group/login">
                  <Link
                    href="/login"
                    aria-label="Masuk Akun"
                    title="Masuk Akun"
                    className="size-9 sm:size-10 flex items-center justify-center rounded-full border border-slate-300/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 shadow-xs transition-all active:scale-95"
                  >
                    <LogIn className="size-4 sm:size-4.5" />
                    <span className="sr-only">Masuk Akun</span>
                  </Link>

                  {/* Proximity / Hover Info Tooltip */}
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover/login:opacity-100 group-focus-within/login:opacity-100 group-active/login:opacity-100 transition-all duration-200 z-50 whitespace-nowrap scale-95 group-hover/login:scale-100">
                    <div className="relative bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-bold py-1 px-2.5 rounded-lg shadow-xl font-century flex items-center gap-1.5 border border-slate-700">
                      <LogIn className="size-3 text-blue-400" />
                      <span>Masuk Akun</span>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 size-2 bg-slate-900 dark:bg-slate-800 border-t border-l border-slate-700 rotate-45" />
                    </div>
                  </div>
                </div>

                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold shadow-md shadow-slate-900/15 transition-all hover:scale-102 active:scale-95 font-century whitespace-nowrap"
                >
                  <span className="sm:hidden">Coba Gratis</span>
                  <span className="hidden sm:inline">Coba Gratis 30 Hari</span>
                </Link>
              </>
            )}

            {/* Mobile & Tablet Hamburger Menu Toggle (Visible on screens < 1200px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Buka Menu Navigasi"
            >
              {mobileMenuOpen ? (
                <X className="size-5 sm:size-6" />
              ) : (
                <Menu className="size-5 sm:size-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#090D16]/95 backdrop-blur-xl px-6 pt-4 pb-6 space-y-3 shadow-xl animate-fade-up font-century">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
            >
              Beranda
            </a>
            <a
              href="#fitur"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
            >
              Fitur Unggulan
            </a>
            <a
              href="#ekosistem"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
            >
              Ekosistem Komunitas
            </a>
            <a
              href="#testimoni"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
            >
              Testimoni Guru
            </a>
            <a
              href="#biaya"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
            >
              Biaya & Lisensi
            </a>
            <Link
              href="/panduan"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-blue-600 dark:text-blue-400"
            >
              Panduan & Materi Promosi
            </Link>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION (Seamless Header Blend + Atmospheric Gradient Mesh + Astronaut iPad Pro Mockup)
      ───────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative pt-20 pb-10 sm:pt-32 sm:pb-20 overflow-hidden bg-[#F8FAFD] dark:bg-[#070B14]"
      >
        {/* Camply-Inspired Atmospheric Radial Gradient Mesh (z-0, above canvas base, below content) */}
        {/* Left Wash: Soft celestial sky mist behind headline */}
        <div
          className="absolute -top-24 -left-20 w-[700px] sm:w-[900px] h-[700px] sm:h-[900px] rounded-full pointer-events-none z-0 blur-3xl opacity-80 dark:opacity-40"
          style={{
            background:
              "radial-gradient(circle at center, rgba(186, 220, 255, 0.7) 0%, rgba(214, 237, 255, 0.45) 45%, transparent 70%)",
          }}
        />

        {/* Right Wash: Warm sunlit peach/champagne glow behind astronaut mockup */}
        <div
          className="absolute -top-20 -right-20 w-[650px] sm:w-[850px] h-[650px] sm:h-[850px] rounded-full pointer-events-none z-0 blur-3xl opacity-85 dark:opacity-30"
          style={{
            background:
              "radial-gradient(circle at center, rgba(254, 226, 206, 0.8) 0%, rgba(255, 237, 218, 0.5) 45%, transparent 70%)",
          }}
        />

        {/* Center-Bottom Wash: Light crystal cyan bridge */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[550px] rounded-full pointer-events-none z-0 blur-3xl opacity-50 dark:opacity-20"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(219, 234, 254, 0.55) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Comprehensive School OS & LMS Headline */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Hero Category Badge - Academic & Purposeful with FadeIn */}
              <FadeIn direction="down" delay={0.05}>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/40 px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 shadow-xs font-century">
                  <School className="size-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span>School Operating System & LMS Terpadu</span>
                </div>
              </FadeIn>

              {/* Huge Headline with Playful Doodles with FadeIn */}
              <FadeIn direction="up" delay={0.1}>
                <div className="relative">
                  <h1 className="text-4xl sm:text-5xl lg:text-[58px] xl:text-[64px] font-bold font-century tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                    Kelola Administrasi, CBT & LMS Tapi{" "}
                    <span className="relative inline-block text-blue-600 dark:text-blue-400">
                      Tanpa Ribet!
                      {/* Camply-style Doodle Underline */}
                      <DoodleUnderline className="absolute -bottom-2 sm:-bottom-3 left-0 w-full text-orange-500" />
                      {/* Camply-style Doodle Burst / Rays above text */}
                      <DoodleRays className="absolute -top-7 -right-7 sm:-top-8 sm:-right-8 text-blue-500 dark:text-blue-400" />
                    </span>
                  </h1>
                </div>
              </FadeIn>

              {/* Subtitle: simple, clean, and punchy with FadeIn */}
              <FadeIn direction="up" delay={0.15}>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed font-century">
                  Platform digital sekolah terpadu: Administrasi guru otomatis, CBT ujian
                  anti-curang, dan presensi AI dalam satu genggaman tanpa ribet.
                </p>
              </FadeIn>

              {/* Key Platform Capability Badges — Interactive Hover Physics */}
              <FadeIn direction="up" delay={0.18}>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-2.5 pt-1 font-century">
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center gap-2 rounded-xl sm:rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 px-2.5 sm:px-3.5 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs backdrop-blur-xs min-h-[40px] cursor-default"
                  >
                    <GraduationCap className="size-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="leading-tight">Administrasi & LMS Guru</span>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center gap-2 rounded-xl sm:rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 px-2.5 sm:px-3.5 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs backdrop-blur-xs min-h-[40px] cursor-default"
                  >
                    <Shield className="size-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="leading-tight">CBT Ujian Anti-Curang</span>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center gap-2 rounded-xl sm:rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 px-2.5 sm:px-3.5 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs backdrop-blur-xs min-h-[40px] cursor-default"
                  >
                    <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="leading-tight">Leger Rapor Merdeka</span>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center gap-2 rounded-xl sm:rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 px-2.5 sm:px-3.5 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs backdrop-blur-xs min-h-[40px] cursor-default"
                  >
                    <Camera className="size-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                    <span className="leading-tight">Presensi Vision AI</span>
                  </motion.div>
                </div>
              </FadeIn>

              {/* Pill Button CTA with Spring Motion Physics */}
              <FadeIn direction="up" delay={0.2}>
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex"
                  >
                    <Link
                      href="/register"
                      className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white px-8 py-4 text-base font-bold shadow-xl shadow-slate-900/15 transition-colors font-century"
                    >
                      <span>Coba Gratis 30 Hari</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex"
                  >
                    <Link
                      href="/login"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 px-7 py-4 text-base font-bold shadow-xs transition-colors font-century"
                    >
                      <span>Sudah Punya Akun? Masuk</span>
                    </Link>
                  </motion.div>
                </div>
              </FadeIn>

              {/* Guarantees with FadeIn */}
              <FadeIn direction="up" delay={0.25}>
                <div className="pt-3 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 font-century">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Tanpa Kartu Kredit</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Setup 30 Detik</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Standar Kurikulum Merdeka</span>
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Right Column: Astronaut Holding iPad Pro with ONE HAND + Looping Sway Motion + Translucent Glass Badges */}
            <div className="lg:col-span-6 flex justify-center relative items-center">
              {/* Concentric Radar / Sonar Echo Ripples (Camply Video ATM) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <div className="size-[340px] sm:size-[420px] rounded-full border border-blue-400/30 dark:border-blue-400/20 animate-pulse" />
                <div className="absolute size-[480px] sm:size-[560px] rounded-full border border-dashed border-blue-400/35 dark:border-blue-400/20" />
                <div className="absolute size-[620px] sm:size-[700px] rounded-full border border-slate-300/40 dark:border-slate-700/30" />
              </div>

              {/* Radiant sunlight & sky glow directly centered on the astronaut */}
              <div className="absolute inset-0 -m-10 bg-gradient-to-tr from-sky-300/35 via-blue-200/25 to-amber-200/40 rounded-full blur-3xl pointer-events-none z-0" />

              {/* Floating Glass Pill 1: Leger Kurikulum Merdeka (Excel / CSV) - Top Left Above Bezel */}
              <div className="absolute -top-7 left-1 sm:-top-8 sm:-left-8 z-20 rounded-full border border-slate-300/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-3 sm:px-3.5 py-1.5 shadow-md shadow-slate-900/5 flex items-center gap-2 animate-float-slow group hover:bg-white/80 transition-colors scale-80 sm:scale-100 origin-left">
                <div className="size-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold flex-shrink-0">
                  <FileSpreadsheet className="size-3.5" />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 font-century whitespace-nowrap">
                  <span>Leger Kurikulum Merdeka</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                    .CSV / Excel
                  </span>
                </div>
              </div>

              {/* Floating Glass Pill 2: Sesi Mengajar Hari Ini - Pak Eri Chandra - Upper Right Flank (Tablet/Desktop) */}
              <div className="hidden sm:flex absolute sm:top-4 sm:-right-8 z-20 rounded-full border border-slate-300/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-3.5 py-1.5 shadow-md shadow-slate-900/5 items-center gap-2 animate-float-reverse group hover:bg-white/80 transition-colors origin-right">
                <div className="size-6 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold flex-shrink-0">
                  <Zap className="size-3.5" />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 font-century whitespace-nowrap">
                  <span>Sesi Mengajar Hari Ini</span>
                  <span className="text-[10px] text-slate-400 font-normal">•</span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    Pak Eri Chandra
                  </span>
                </div>
              </div>

              {/* Main Astronaut Holding iPad Pro with ONE HAND — Borderless Freeform Transparent PNG with Looping Sway / Tilt Shake */}
              <div className="relative group w-full max-w-[340px] sm:max-w-[420px] md:max-w-[480px] lg:max-w-[540px] xl:max-w-[580px] animate-inward-motion">
                <div className="relative animate-mockup-sway">
                  <Image
                    src="/images/illustrations/astronaut-large-ipad-transparent-v2.png"
                    alt="Astronaut Ruang Pintar memegang iPad Pro 11-inch dengan tampilan dashboard guru"
                    width={785}
                    height={1078}
                    priority
                    className="w-full h-auto object-contain drop-shadow-[0_24px_50px_rgba(37,99,235,0.18)] dark:drop-shadow-[0_24px_50px_rgba(59,130,246,0.32)] transform hover:scale-[1.02] transition-transform duration-500"
                  />
                </div>
              </div>

              {/* Floating Glass Pill 3: Photo-to-Class AI & Materi Unggahan - Lower Left Flank (Tablet/Desktop) */}
              <div className="hidden sm:flex absolute sm:bottom-44 sm:-left-8 z-20 rounded-full border border-slate-300/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-3.5 py-1.5 shadow-md shadow-slate-900/5 items-center gap-2 animate-float-reverse group hover:bg-white/80 transition-colors origin-left">
                <div className="size-6 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold flex-shrink-0">
                  <Camera className="size-3.5" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 font-century whitespace-nowrap">
                    <span>Photo-to-Class AI</span>
                    <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                      (Modul KBM)
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                    36 Siswa Terekstrak (5 Detik)
                  </span>
                </div>
              </div>

              {/* Floating Glass Pill 4: Presensi Kilat & Materi Kapan Saja - Lower Right Flank / Bottom Mobile */}
              <div className="absolute -bottom-5 right-1 sm:bottom-24 sm:-right-8 z-20 rounded-full border border-slate-300/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-3 sm:px-3.5 py-1.5 shadow-md shadow-slate-900/5 flex items-center gap-2 animate-float-slow group hover:bg-white/80 transition-colors scale-80 sm:scale-100 origin-right">
                <div className="size-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold flex-shrink-0">
                  <Smartphone className="size-3.5" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 font-century whitespace-nowrap">
                    <span>Presensi Kilat 15 Detik</span>
                  </div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                    Materi Siswa Akses 24/7
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. STATS COUNTER RIBBON (Camply Full-Width Royal Blue Bar with Dividers)
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#0D5CFB] dark:bg-blue-700 text-white py-8 sm:py-10 shadow-lg relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-white/20 items-center text-center">
            {/* Stat 1 */}
            <div className="px-4">
              <div className="text-3xl sm:text-5xl font-black tracking-tight">
                <AnimatedCounter value={100} suffix="%" duration={1.2} />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-blue-100 mt-1 uppercase tracking-wider">
                Otomatisasi AI
              </p>
            </div>

            {/* Stat 2 */}
            <div className="px-4">
              <div className="text-3xl sm:text-5xl font-black tracking-tight">
                <AnimatedCounter value={5} suffix=" Detik" duration={1.0} />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-blue-100 mt-1 uppercase tracking-wider">
                Scan Absen Kertas
              </p>
            </div>

            {/* Stat 3 */}
            <div className="px-4">
              <div className="text-3xl sm:text-5xl font-black tracking-tight">
                <AnimatedCounter value={30} suffix=" Hari" duration={1.4} />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-blue-100 mt-1 uppercase tracking-wider">
                Coba Gratis Penuh
              </p>
            </div>

            {/* Stat 4 */}
            <div className="px-4">
              <div className="text-3xl sm:text-5xl font-black tracking-tight flex items-center justify-center gap-1">
                <span>4.9</span>
                <Star className="size-6 fill-amber-300 text-amber-300 inline-block" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-blue-100 mt-1 uppercase tracking-wider">
                Kepuasan Guru & Siswa
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. UNIFIED FEATURES & OPEN SEAMLESS MAP (Camply Reference)
      ───────────────────────────────────────────────────────────── */}
      <section
        id="fitur"
        className="pt-10 sm:pt-20 pb-8 sm:pb-14 relative overflow-hidden scroll-mt-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Top Row: Heading + 3-Feature Trio (Camply "That The Way To Camp!" Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-8 sm:mb-14">
            {/* Left Headline Block */}
            <RevealOnScroll className="lg:col-span-4 text-left space-y-3">
              <div className="flex items-center gap-1.5">
                {/* 3 Blue Radiant Rays Accent (\ | /) */}
                <svg
                  className="size-7 text-blue-600 dark:text-blue-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="12" y1="2" x2="12" y2="7" />
                  <line x1="4" y1="6" x2="7.5" y2="9.5" />
                  <line x1="20" y1="6" x2="16.5" y2="9.5" />
                </svg>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold font-century text-slate-900 dark:text-white tracking-tight leading-[1.12]">
                Solusi Cerdas
                <br />
                Sekolah Modern!
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-century leading-relaxed max-w-sm pt-1">
                Nikmati berbagai kemudahan ekosistem digital terpadu untuk KBM, ujian, dan
                administrasi tanpa ribet.
              </p>
            </RevealOnScroll>

            {/* Right: 3 Feature Pillars with Custom 3D Clay Icons */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {/* Feature 1: Administrasi & LMS */}
              <RevealOnScroll
                delay={100}
                className="group text-left flex flex-col items-start p-2 rounded-2xl transition-all"
              >
                <div className="relative size-16 sm:size-20 mb-4 flex-shrink-0 transition-transform duration-300 group-hover:-translate-y-1.5">
                  <Image
                    src="/images/features/feature-lms-3d.png"
                    alt="Administrasi Guru dan LMS Terpadu"
                    width={80}
                    height={80}
                    unoptimized
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-bold font-century text-slate-900 dark:text-white">
                  Administrasi & LMS
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-century leading-relaxed">
                  Jurnal KBM harian, silabus otomatis, dan modul penugasan mandiri siswa
                  tersinkronisasi tanpa kertas.
                </p>
              </RevealOnScroll>

              {/* Feature 2: CBT Anti-Curang */}
              <RevealOnScroll
                delay={200}
                className="group text-left flex flex-col items-start p-2 rounded-2xl transition-all"
              >
                <div className="relative size-16 sm:size-20 mb-4 flex-shrink-0 transition-transform duration-300 group-hover:-translate-y-1.5">
                  <Image
                    src="/images/features/feature-cbt-3d.png"
                    alt="CBT Ujian Anti-Curang Safe Exam"
                    width={80}
                    height={80}
                    unoptimized
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-bold font-century text-slate-900 dark:text-white">
                  CBT Anti-Curang
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-century leading-relaxed">
                  Ujian digital terkunci aman anti-buka tab baru dengan acak butir soal dan koreksi
                  nilai instan.
                </p>
              </RevealOnScroll>

              {/* Feature 3: Leger Rapor Merdeka */}
              <RevealOnScroll
                delay={300}
                className="group text-left flex flex-col items-start p-2 rounded-2xl transition-all"
              >
                <div className="relative size-16 sm:size-20 mb-4 flex-shrink-0 transition-transform duration-300 group-hover:-translate-y-1.5">
                  <Image
                    src="/images/features/feature-leger-3d.png"
                    alt="Buku Nilai dan Leger Kurikulum Merdeka"
                    width={80}
                    height={80}
                    unoptimized
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                </div>
                <h3 className="text-base sm:text-lg font-bold font-century text-slate-900 dark:text-white">
                  Leger Rapor Merdeka
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-century leading-relaxed">
                  Kalkulasi otomatis bobot TP formatif & sumatif sesuai juknis, siap cetak dan
                  1-klik ekspor Excel.
                </p>
              </RevealOnScroll>
            </div>
          </div>

          {/* Bottom Area: Open Seamless Dotted Map Canvas (Connecting directly to Testimoni below) */}
          <RevealOnScroll delay={150} className="relative w-full overflow-visible">
            {/* Background Dotted Map Pattern - borderless, wide, soft bleed */}
            <div className="absolute inset-0 -mx-4 sm:-mx-8 lg:-mx-16 flex items-center justify-center opacity-85 dark:opacity-60 pointer-events-none select-none">
              <Image
                src="/images/features/dotted-world-map.svg"
                alt="Peta Jangkauan Sekolah Ruang Pintar"
                width={1200}
                height={540}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>

            {/* Subtle atmospheric radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.07),transparent_70%)] pointer-events-none" />

            {/* Pin Canvas Container (Responsive Height, Open Edges) */}
            <div className="relative w-full h-[260px] sm:h-[420px] md:h-[500px]">
              {MAP_PINS.map((pin) => {
                const isSelected = activePinId === pin.id;
                const isHero = pin.featured;

                return (
                  <div
                    key={pin.id}
                    style={{ left: pin.x, top: pin.y }}
                    className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center cursor-pointer group z-20 focus:outline-hidden"
                    onClick={() => setActivePinId(pin.id)}
                    onMouseEnter={() => setActivePinId(pin.id)}
                  >
                    {/* Teardrop Pointer Card with Circular Photo */}
                    <div
                      className={`relative rounded-full p-1 bg-white dark:bg-slate-800 shadow-xl ring-2 transition-all duration-300 group-hover:scale-110 ${
                        isHero
                          ? "ring-blue-500 shadow-blue-500/25 scale-105"
                          : isSelected
                            ? "ring-amber-500 shadow-amber-500/25"
                            : "ring-white dark:ring-slate-700 shadow-slate-900/15"
                      }`}
                    >
                      <div
                        className={`relative rounded-full overflow-hidden border-2 border-white dark:border-slate-700 ${
                          isHero
                            ? "size-16 sm:size-20 md:size-24 shadow-2xl"
                            : "size-10 sm:size-12 md:size-14 shadow-lg"
                        }`}
                      >
                        <Image
                          src={pin.image}
                          alt={pin.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      {/* Downward triangle tip pointer */}
                      <div
                        className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-transparent border-t-white dark:border-t-slate-800 ${
                          isHero
                            ? "border-x-[8px] border-t-[10px]"
                            : "border-x-[6px] border-t-[8px]"
                        }`}
                      />
                    </div>

                    {/* Downward Connector to Ground Beacon */}
                    <div className="w-0.5 h-2.5 sm:h-3 bg-gradient-to-b from-slate-400 to-amber-500 dark:from-slate-600" />

                    {/* Radar Beacon below pin */}
                    <RadarBeacon active={isSelected || isHero} />

                    {/* Interactive Tooltip Card on Hover / Selection */}
                    <div
                      className={`absolute bottom-full mb-3 min-w-[200px] sm:min-w-[240px] rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white p-3.5 shadow-2xl backdrop-blur-md border border-slate-700/80 text-left transition-all duration-300 z-30 ${
                        isSelected
                          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                          : "opacity-0 translate-y-2 scale-95 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-hover:pointer-events-auto"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-century">
                          {pin.badge}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold font-century">
                          {pin.status}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white font-century">
                        {pin.name}
                      </div>
                      <div className="text-[11px] text-slate-300 font-century mt-0.5">
                        {pin.city}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-century">
                        <span>{pin.students.toLocaleString("id-ID")} Siswa</span>
                        <span>•</span>
                        <span>{pin.teachers} Guru</span>
                        <span>•</span>
                        <span className="text-blue-400 font-semibold">{pin.category}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive Role Benefits Quick Finder (Seamlessly anchored below map) */}
            <div className="mt-4 sm:mt-8 pt-3 sm:pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 text-left">
                  <h3 className="text-lg sm:text-xl font-bold font-century text-slate-900 dark:text-white tracking-tight">
                    Jangkauan Lengkap, Dari Guru Hingga Kepala Sekolah.
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-century">
                    Jelajahi bagaimana setiap pemangku kepentingan di sekolah mendapatkan otomasi
                    tanpa sekat birokrasi.
                  </p>
                </div>

                <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900/90 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-md space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Select Role */}
                    <div className="text-left">
                      <label
                        htmlFor="role-select"
                        className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1"
                      >
                        Pilih Peran Anda
                      </label>
                      <select
                        id="role-select"
                        value={selectedRole}
                        onChange={(e) => {
                          setSelectedRole(e.target.value);
                          setFinderSubmitted(true);
                        }}
                        className="w-full rounded-xl border-0 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Guru Pengampu">Guru Pengampu</option>
                        <option value="Wali Kelas">Wali Kelas</option>
                        <option value="Kepala Sekolah">Kepala Sekolah</option>
                        <option value="Wali Murid">Wali Murid</option>
                      </select>
                    </div>

                    {/* Select Need */}
                    <div className="text-left">
                      <label
                        htmlFor="need-select"
                        className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1"
                      >
                        Kebutuhan Utama
                      </label>
                      <select
                        id="need-select"
                        value={selectedNeed}
                        onChange={(e) => {
                          setSelectedNeed(e.target.value);
                          setFinderSubmitted(true);
                        }}
                        className="w-full rounded-xl border-0 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Absen Foto AI">Absensi Foto AI</option>
                        <option value="Buku Leger Nilai">Buku Leger & TP</option>
                        <option value="Pantau KBM Real-time">Pantau KBM Real-time</option>
                        <option value="Manajemen Sekolah">Manajemen Sekolah</option>
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Preview Card (Borderless) with AnimatePresence Smooth Motion */}
                  <AnimatePresence>
                    <motion.div
                      key={selectedRole}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="pt-2 flex items-center justify-between gap-4"
                    >
                      <div className="text-left">
                        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                          {roleSolutions[selectedRole]?.title}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {roleSolutions[selectedRole]?.desc}
                        </p>
                      </div>
                      <Link
                        href={roleSolutions[selectedRole]?.link || "/register"}
                        className="size-9 shrink-0 rounded-full bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md"
                        title="Jelajahi Solusi"
                      >
                        <ArrowRight className="size-4" />
                      </Link>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. TESTIMONIALS & RATING (Clean & Simple, 100% Borderless, Seamless Flow from Map)
      ───────────────────────────────────────────────────────────── */}
      <section id="testimoni" className="pt-4 sm:pt-8 pb-10 sm:pb-20 relative overflow-hidden">
        {/* Continuous Dotted World Map & Atmospheric Ambient Flow */}
        <div className="absolute inset-0 -mx-4 sm:-mx-8 lg:-mx-16 flex items-start justify-center opacity-25 dark:opacity-15 pointer-events-none select-none overflow-hidden">
          <Image
            src="/images/features/dotted-world-map.svg"
            alt=""
            width={1200}
            height={540}
            unoptimized
            className="w-full h-auto object-cover -translate-y-1/4 scale-105"
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.06),transparent_65%)] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Clean Rating Trust Pill & Header with Prev/Next Controls */}
          <RevealOnScroll className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-10">
            <div className="text-left space-y-3 max-w-2xl">
              {/* Clean Rating Summary Badge (No Card Border, Clean & Simple) */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-400/10 text-slate-800 dark:text-slate-200">
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-century">
                  4.9 / 5.0
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 font-century">
                  1.000+ Ulasan Guru & Pimpinan Terverifikasi
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-century text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                Guru & Pimpinan Sekolah yang Puas Adalah Bukti Nyata Kami.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-century leading-relaxed">
                Dengarkan langsung cerita para pendidik dan kepala sekolah yang telah merasakan
                kemudahan otomasi digital Ruang Pintar tanpa kerumitan birokrasi.
              </p>
            </div>

            {/* Slider Navigation Controls (Clean Pill Buttons, No Card Border) */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button
                onClick={prevTestimonial}
                className="size-11 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95"
                aria-label="Testimoni Sebelumnya"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                onClick={nextTestimonial}
                className="size-11 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95"
                aria-label="Testimoni Berikutnya"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </RevealOnScroll>

          {/* Testimonial Items - Clean, Simple, 100% Borderless, No Card Putih */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-left">
            {[0, 1, 2].map((offset) => {
              const itemIndex = (activeTestimonial + offset) % testimonials.length;
              const t = testimonials[itemIndex];

              return (
                <RevealOnScroll
                  key={`${itemIndex}-${offset}`}
                  delay={offset * 100}
                  className="h-full"
                >
                  <motion.div
                    whileHover={{ y: -5, scale: 1.015 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="rounded-3xl p-6 sm:p-7 flex flex-col justify-between h-full bg-white/50 dark:bg-slate-900/30 hover:bg-white/80 dark:hover:bg-slate-900/50 backdrop-blur-xs transition-colors border border-slate-200/50 dark:border-slate-800/50 shadow-[0_4px_20px_rgba(15,23,42,0.02)] hover:shadow-lg"
                  >
                    <div>
                      {/* Rating Stars at Top of Each Review */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[...Array(t.rating)].map((_, starIdx) => (
                              <Star
                                key={starIdx}
                                className="size-3.5 fill-amber-400 text-amber-400"
                              />
                            ))}
                          </div>
                          <span className="ml-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                            5.0
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                          ✓ Terverifikasi
                        </span>
                      </div>

                      {/* Quotation text */}
                      <p className="text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed font-century italic">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                    </div>

                    {/* Educator Author Profile */}
                    <div className="mt-6 pt-4 flex items-center gap-3 border-t border-slate-200/40 dark:border-slate-800/40">
                      <div
                        className={`size-10 rounded-full bg-gradient-to-tr ${t.gradient} text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0`}
                      >
                        {t.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-century truncate">
                          {t.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-century truncate">
                          {t.role} • {t.school}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. COMMUNITY & INTEGRATION ECOSYSTEM ("Community Service Is Calling..." in Video)
      ───────────────────────────────────────────────────────────── */}
      <section id="ekosistem" className="py-10 sm:py-20 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline with Doodle Rays & CTA */}
            <RevealOnScroll className="lg:col-span-6 space-y-6 text-left">
              <div className="relative">
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Komunitas Pendidik & Ekosistem Terpadu
                  <DoodleRays className="text-amber-500 dark:text-amber-400 ml-2" />
                </h2>
              </div>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Bergabunglah bersama ribuan guru dari seluruh Indonesia. Bagikan praktik baik,
                dapatkan template pesan siaran WhatsApp resmi ke orang tua, dan panduan lengkap
                digitalisasi kurikulum sekolah.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <a
                  href="https://wa.me/6281234567890?text=Halo%20Ruang%20Pintar,%20saya%20tertarik%20bergabung%20dengan%20komunitas%20pendidik%20dan%20konsultasi%20digitalisasi%20sekolah."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white px-8 py-3.5 text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  <MessageCircle className="size-4" />
                  <span>Gabung Komunitas WhatsApp</span>
                </a>
                <Link
                  href="/panduan"
                  className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
                >
                  <span>Lihat Panduan & Copywriting</span>
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </RevealOnScroll>

            {/* Right Column: Orbiting Ecosystem Badges (Matching Camply Avatar Cluster) */}
            <RevealOnScroll
              delay={150}
              className="lg:col-span-6 relative flex items-center justify-center p-8 sm:p-14"
            >
              {/* Center Teacher Avatar */}
              <div className="relative z-10 size-24 sm:size-28 rounded-full border-4 border-white dark:border-slate-800 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-blue-600/30">
                <GraduationCap className="size-12" />
                <span className="absolute -bottom-2 bg-slate-900 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md">
                  Pendidik
                </span>
              </div>

              {/* Orbit Ring 1 (Dotted) */}
              <div className="absolute size-64 sm:size-72 rounded-full border border-dashed border-slate-300 dark:border-slate-700 pointer-events-none animate-spin-slow" />

              {/* Orbiting Badge 1: WhatsApp Gateway */}
              <div className="absolute -top-2 right-12 z-20 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 p-2.5 shadow-lg flex items-center gap-2">
                <div className="size-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                  <MessageCircle className="size-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  WA Notifikasi Wali
                </span>
              </div>

              {/* Orbiting Badge 2: Rapor & Arsip Digital */}
              <div className="absolute top-1/3 -left-4 z-20 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 p-2.5 shadow-lg flex items-center gap-2">
                <div className="size-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                  <School className="size-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Rapor & Arsip Digital
                </span>
              </div>

              {/* Orbiting Badge 3: Excel Export */}
              <div className="absolute -bottom-2 right-16 z-20 rounded-2xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-2.5 shadow-lg flex items-center gap-2">
                <div className="size-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <FileSpreadsheet className="size-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Ekspor Excel Leger
                </span>
              </div>

              {/* Orbiting Badge 4: Kurikulum Merdeka */}
              <div className="absolute bottom-8 -left-2 z-20 rounded-2xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-2.5 shadow-lg flex items-center gap-2">
                <div className="size-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <BookMarked className="size-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Kurikulum Merdeka
                </span>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. QUESTION & FAQ CARD ("Got A Question For Camply?" in Video)
      ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-10 sm:py-20 bg-white dark:bg-[#090D16]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Rounded White Card Container */}
          <RevealOnScroll className="rounded-[36px] border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/70 p-8 sm:p-14 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Left Column: Got a Question + Email / WA Input */}
              <div className="lg:col-span-5 text-left space-y-4">
                <div className="relative">
                  <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Punya Pertanyaan Seputar Ruang Pintar?
                    <DoodleRays className="text-blue-500 dark:text-blue-400 ml-1" />
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Jika ada hal yang ingin ditanyakan, tim konsultan pendidikan kami siap menjawab
                  dan mendampingi Anda.
                </p>

                {/* Question Input Form with Pill Button */}
                <form onSubmit={handleSendQuestion} className="pt-3 space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <input
                      type="text"
                      value={questionContact}
                      onChange={(e) => setQuestionContact(e.target.value)}
                      placeholder="Masukkan Email / No. WhatsApp..."
                      className="grow rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white px-6 py-3 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Kirim
                    </button>
                  </div>
                  {questionSent && (
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ Terima kasih! Tim Ruang Pintar akan segera menghubungi kontak Anda.
                    </p>
                  )}
                </form>
              </div>

              {/* Right Column: Maybe your question has been answered (FAQ List with -> arrows) */}
              <div className="lg:col-span-7 space-y-4 text-left">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Mungkin pertanyaan Anda sudah terjawab di sini:
                </span>

                <div className="space-y-3">
                  {faqs.map((item, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-2xs transition-all"
                      >
                        <button
                          onClick={() => setOpenFaq(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
                        >
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {item.q}
                          </span>
                          <span
                            className={`size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 transition-transform ${
                              isOpen ? "rotate-90 bg-blue-100 text-blue-600" : ""
                            }`}
                          >
                            <ArrowRight className="size-4" />
                          </span>
                        </button>
                        {isOpen && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. PRICING & PLANS SECTION (30-Day Free Trial, Guru Pro, Lisensi Sekolah Terpadu)
      ───────────────────────────────────────────────────────────── */}
      <section
        id="biaya"
        className="py-10 sm:py-20 bg-[#F8FAFC] dark:bg-[#070A12] border-t border-slate-200/80 dark:border-slate-800"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <RevealOnScroll className="max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Pilihan Lisensi & Biaya
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Mulai Gratis 30 Hari, Lanjut Sesuai Kebutuhan
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Transparan, tanpa biaya tersembunyi. Data Anda tetap tersimpan aman seumur hidup.
            </p>
          </RevealOnScroll>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch text-left">
            {/* Plan 1: 30-Day Free Trial */}
            <RevealOnScroll
              delay={100}
              className="rounded-[32px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Coba Gratis
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                    30 Hari Penuh
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  Guru Starter (Trial)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Untuk guru mandiri yang ingin mencoba kecanggihan aplikasi di kelasnya.
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">Rp 0</span>
                  <span className="text-xs text-slate-500 font-medium">/ 30 hari pertama</span>
                </div>

                <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Maksimal 5 Rombel / Kelas Aktif</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Photo-to-Class Vision AI (5x Scan)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Presensi & Jurnal Harian Lengkap</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Buku Nilai & Ekspor ke Excel</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href="/register"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 text-white py-3.5 text-sm font-bold shadow-sm transition-all"
                >
                  <span>Daftar Coba Gratis Sekarang</span>
                </Link>
              </div>
            </RevealOnScroll>

            {/* Plan 2: Guru Pro Mandiri (Rp 15.000 / bln) */}
            <RevealOnScroll
              delay={200}
              className="rounded-[32px] border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-900 p-8 flex flex-col justify-between shadow-xl relative scale-105"
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white text-[11px] font-extrabold tracking-wide shadow-md">
                PILIHAN PALING POPULER
              </div>

              <div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Mandiri Pendidik
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold">
                    Paling Terjangkau
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  Paket Guru Pro
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Untuk guru aktif yang ingin kemudahan penuh tanpa batasan kuota.
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-blue-600 dark:text-blue-400">
                    Rp 15.000
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ bulan (ramah guru)</span>
                </div>

                <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                  <li className="flex items-start gap-2.5 font-bold text-blue-600 dark:text-blue-400">
                    <Check className="size-4 flex-shrink-0 mt-0.5" />
                    <span>Kelas & Jumlah Siswa Tanpa Batas</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Vision AI Scan Absensi Tanpa Batas</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>CBT Ujian Online dengan Anti-Curang</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Cetak Rapor Kemajuan Belajar Siswa</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <ProCheckoutButton
                  isLoggedIn={Boolean(user)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 text-sm font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <span>Mulai dengan Guru Pro</span>
                </ProCheckoutButton>
              </div>
            </RevealOnScroll>

            {/* Plan 3: Lisensi Sekolah Terpadu (Akses Multi-Guru & Tata Usaha) */}
            <RevealOnScroll
              delay={300}
              className="rounded-[32px] border border-indigo-200 dark:border-indigo-800/80 bg-white dark:bg-slate-900 p-8 flex flex-col justify-between shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-blue-600 text-white text-[10px] font-bold px-4 py-1 rounded-bl-xl uppercase tracking-wider font-century">
                Institusi Sekolah
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-century">
                    Paket Institusi
                  </span>
                  <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold font-century">
                    Multi-Guru & Siswa
                  </span>
                </div>
                <h3 className="text-2xl font-bold font-century text-slate-900 dark:text-white mt-2">
                  Lisensi Sekolah Terpadu
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-century">
                  Solusi penuh satu sekolah untuk Kepsek, Waka, TU, seluruh Guru, dan Orang Tua.
                </p>

                <div className="mt-6 flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 font-century">
                      Akses Sekolah
                    </span>
                    <span className="text-xs text-slate-500 font-medium font-century">/ tahun</span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-century">
                    Tersedia untuk jenjang SD, SMP, SMA/SMK, hingga Yayasan Terpadu
                  </span>
                </div>

                <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-century">
                  <li className="flex items-start gap-2.5 font-bold text-indigo-600 dark:text-indigo-400">
                    <Zap className="size-4 flex-shrink-0 mt-0.5" />
                    <span>Semua Guru Otomatis Jadi PRO Tanpa Bayar Mandiri</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>LMS Modul Ajar & CBT Ujian Massal Ribuan Siswa</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>Jadwal Pelajaran Otomatis Anti-Bentrok & Jurnal KBM</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>Rekap Terpadu: Ekspor Excel Leger, Rapor Kurikulum, & Arsip Digital</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="size-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>Dedicated Pendampingan & Pelatihan Guru Sampai Tuntas</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <a
                  href="https://wa.me/6281234567890?text=Halo%20Tim%20Ruang%20Pintar,%20sekolah%20kami%20tertarik%20konsultasi%20Lisensi%20Sekolah%20Terpadu%20untuk%20seluruh%20guru%20dan%20siswa."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 text-sm font-bold shadow-md shadow-indigo-600/20 transition-all font-century"
                >
                  <MessageCircle className="size-4" />
                  <span>Konsultasi Lisensi Sekolah</span>
                </a>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10. ROYAL BLUE FOOTER (Camply 00:16 Deep Blue Background with White Text)
      ───────────────────────────────────────────────────────────── */}
      <footer className="bg-[#0D55E0] dark:bg-[#0A41AC] text-white pt-16 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/15 text-left">
            {/* Brand column */}
            <div className="md:col-span-4 space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white tracking-tight">Ruang Pintar</span>
                <span className="text-amber-300 font-black text-2xl">.</span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed max-w-sm">
                School Digital Operating Platform modern yang menyederhanakan absensi foto AI, buku
                nilai Kurikulum Merdeka, dan tata kelola sekolah.
              </p>
              <div className="pt-2 text-xs text-blue-200">
                <span>Didesain dengan Academic Glass UI & Standar Nasional.</span>
              </div>
            </div>

            {/* Menu Column */}
            <div className="md:col-span-2 space-y-3">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-blue-200">
                Fitur Utama
              </h5>
              <ul className="space-y-2 text-xs text-white/80">
                <li>
                  <a href="#fitur" className="hover:text-white transition-colors">
                    Vision AI Scan
                  </a>
                </li>
                <li>
                  <a href="#fitur" className="hover:text-white transition-colors">
                    Presensi HP 15 Detik
                  </a>
                </li>
                <li>
                  <a href="#fitur" className="hover:text-white transition-colors">
                    Buku Nilai (Leger)
                  </a>
                </li>
                <li>
                  <a href="#fitur" className="hover:text-white transition-colors">
                    CBT Ujian Anti-Curang
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div className="md:col-span-2 space-y-3">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-blue-200">
                Sumber Daya
              </h5>
              <ul className="space-y-2 text-xs text-white/80">
                <li>
                  <Link href="/panduan" className="hover:text-white transition-colors">
                    Panduan Kilat Guru
                  </Link>
                </li>
                <li>
                  <Link href="/panduan" className="hover:text-white transition-colors">
                    Template WhatsApp
                  </Link>
                </li>
                <li>
                  <a href="#biaya" className="hover:text-white transition-colors">
                    Paket Sekolah
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    Tanya Jawab (FAQ)
                  </a>
                </li>
              </ul>
            </div>

            {/* Support Column */}
            <div className="md:col-span-2 space-y-3">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-blue-200">
                Bantuan & Legal
              </h5>
              <ul className="space-y-2 text-xs text-white/80">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Masuk
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-white transition-colors">
                    Daftar Coba Gratis
                  </Link>
                </li>
                <li>
                  <span className="text-white/60">Kurikulum Merdeka</span>
                </li>
                <li>
                  <span className="text-white/60">Privasi & Keamanan</span>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="md:col-span-2 space-y-3">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-blue-200">
                Kontak Resmi
              </h5>
              <p className="text-xs text-white/80">halo@ruangpintar.id</p>
              <a
                href="https://wa.me/6281234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition-colors"
              >
                <MessageCircle className="size-3.5" />
                <span>WhatsApp B2B</span>
              </a>
            </div>
          </div>

          {/* Copyright Row */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-blue-200">
            <p>&copy; {new Date().getFullYear()} Ruang Pintar. All rights reserved.</p>
            <p>Dibuat dengan dedikasi untuk kemajuan pendidikan Indonesia.</p>
          </div>
        </div>
      </footer>

      {/* Floating Scroll-to-Top Button (Scroll Motion Interaction) */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.15)] hover:shadow-2xl border border-slate-200/80 dark:border-slate-800 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer animate-fade-up group"
          aria-label="Kembali ke atas halaman"
          title="Kembali ke atas"
        >
          <ArrowUp className="size-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
        </button>
      )}
    </div>
  );
}
