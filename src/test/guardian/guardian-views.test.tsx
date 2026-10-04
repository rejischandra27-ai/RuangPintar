import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GuardianDashboardClient } from "@/modules/guardian/presentation/guardian-dashboard-client";
import { ChildSwitcherDropdown } from "@/modules/guardian/presentation/child-switcher-dropdown";
import { GuardianAttendanceView } from "@/modules/guardian/presentation/guardian-attendance-view";
import { GuardianGradesView } from "@/modules/guardian/presentation/guardian-grades-view";
import { GuardianReportPrintModal } from "@/modules/guardian/presentation/guardian-report-print-modal";
import { PengajuanIzinModal } from "@/modules/guardian/presentation/pengajuan-izin-modal";
import { GuardianClaimFlowView } from "@/modules/guardian/presentation/guardian-claim-flow-view";
import { GuardianDashboardData } from "@/modules/guardian/domain/guardian-types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock guardian actions
vi.mock("@/app/actions/guardian-actions", () => ({
  switchActiveChildAction: vi.fn().mockResolvedValue({ success: true }),
  submitPengajuanWaliAction: vi.fn().mockResolvedValue({ success: true, message: "OK" }),
  getActiveChildIdFromCookie: vi.fn().mockResolvedValue("STUDENT_01"),
}));

const mockDashboardData: GuardianDashboardData = {
  guardian: {
    id: "WALI_01",
    sekolah_id: "SCH_01",
    pengguna_id: "USER_GUARDIAN_01",
    nama_lengkap: "Santoso Pratama, S.T.",
    jenis_kelamin: "L",
    no_telepon: "081234567890",
    email: "santoso@example.com",
    pekerjaan: "Konsultan IT",
    penghasilan: "Rp 15jt - Rp 25jt",
    alamat: "Bandung",
  },
  linkedChildren: [
    {
      siswa_id: "STUDENT_01",
      nama_lengkap: "Rian Pratama",
      nis: "20261001",
      nisn: "0081234567",
      rombel_nama: "X RPL 1",
      tingkat_kelas: "Kelas X",
      jenis_kelamin: "L",
      foto_url: null,
      jenis_hubungan: "AYAH",
      apakah_wali_utama: true,
      status_verifikasi: "TERVERIFIKASI",
    },
    {
      siswa_id: "STUDENT_02",
      nama_lengkap: "Nadia Pratama",
      nis: "20261099",
      nisn: "0088776655",
      rombel_nama: "X DKV 1",
      tingkat_kelas: "Kelas X",
      jenis_kelamin: "P",
      foto_url: null,
      jenis_hubungan: "AYAH",
      apakah_wali_utama: true,
      status_verifikasi: "TERVERIFIKASI",
    },
  ],
  activeChild: {
    siswa: {
      siswa_id: "STUDENT_01",
      nama_lengkap: "Rian Pratama",
      nis: "20261001",
      nisn: "0081234567",
      rombel_nama: "X RPL 1",
      tingkat_kelas: "Kelas X",
      jenis_kelamin: "L",
      foto_url: null,
      jenis_hubungan: "AYAH",
      apakah_wali_utama: true,
      status_verifikasi: "TERVERIFIKASI",
    },
    sekolah_nama: "SMK OTOMINDO",
    tahun_ajaran_aktif: "2026/2027",
    semester_aktif: "Semester Ganjil",
    wali_kelas: {
      guru_id: "GURU_01",
      nama_lengkap: "Pak Andi Setiawan, S.Pd.",
      email: "andi@otomindo.sch.id",
      no_telepon: "08123456789",
      foto_url: null,
    },
  },
  attendanceRecap: {
    total_sesi: 30,
    hadir: 29,
    sakit: 1,
    izin: 0,
    alpa: 0,
    persentase_kehadiran: 97,
    kategori_kehadiran: "Sangat Baik",
  },
  upcomingAssignments: [
    {
      id: "TUGAS_01",
      judul: "Proyek Analisis Sistem Informasi",
      mata_pelajaran: "Rekayasa Perangkat Lunak",
      guru_nama: "Pak Andi",
      batas_waktu: new Date().toISOString(),
      sudah_dikumpulkan: true,
      status_pengumpulan: "DITERIMA",
      nilai_publik: 92,
      catatan_guru: "Kerja bagus",
    },
  ],
  upcomingCbt: [
    {
      id: "CBT_01",
      judul: "Ulangan Harian SDLC",
      mata_pelajaran: "Rekayasa Perangkat Lunak",
      jadwal_mulai: new Date().toISOString(),
      jadwal_selesai: new Date().toISOString(),
      durasi_menit: 60,
      status_ujian: "SELESAI",
      nilai_akhir: 88,
    },
  ],
  recentPublishedGrades: [
    {
      id: "NILAI_01",
      judul_asesmen: "Formatif TP 1.1",
      jenis_asesmen: "FORMATIF",
      mata_pelajaran: "Rekayasa Perangkat Lunak",
      guru_nama: "Pak Andi",
      nilai: 92,
      kategori_capaian: "Sangat Baik (A)",
      tanggal_publikasi: new Date().toISOString(),
      catatan: "Sangat memahami konsep agile",
    },
  ],
  recentPengajuan: [
    {
      id: "P_01",
      siswa_id: "STUDENT_01",
      nama_siswa: "Rian Pratama",
      tipe: "SAKIT",
      judul: "Surat Keterangan Sakit Demam",
      deskripsi: "Ananda mengalami demam tinggi dan beristirahat 2 hari",
      tanggal_mulai: "2026-09-01",
      tanggal_selesai: "2026-09-02",
      lampiran_url: null,
      status: "DISETUJUI",
      catatan_tanggapan: "Disetujui oleh wali kelas",
      created_at: new Date().toISOString(),
    },
  ],
};

describe("M15 Guardian & Family — Presentation Views (Academic Glass UI v1.2)", () => {
  it("merender GuardianDashboardClient dengan data anak aktif dan stat cards", () => {
    render(<GuardianDashboardClient data={mockDashboardData} />);

    expect(
      screen.getByText(/Selamat Datang, Bapak\/Ibu Santoso Pratama, S\.T\./i)
    ).toBeInTheDocument();
    expect(screen.getByText("Wali Murid")).toBeInTheDocument();
    expect(screen.getByText("Putra/Putri Terdaftar")).toBeInTheDocument();
    expect(screen.getByText("2 Anak")).toBeInTheDocument();
    expect(screen.getAllByText("97%").length).toBeGreaterThan(0);
    expect(screen.getByText(/Pak Andi Setiawan, S\.Pd\./i)).toBeInTheDocument();
    expect(screen.getByText("Formatif TP 1.1")).toBeInTheDocument();
    expect(screen.getByText("Surat Keterangan Sakit Demam")).toBeInTheDocument();
  });

  it("merender ChildSwitcherDropdown dan menampilkan daftar anak terdaftar saat diklik", () => {
    render(
      <ChildSwitcherDropdown
        linkedChildren={mockDashboardData.linkedChildren}
        activeChildId="STUDENT_01"
      />
    );

    const button = screen.getByTestId("child-switcher-button");
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    expect(screen.getByTestId("child-switcher-menu")).toBeInTheDocument();
    expect(screen.getByText(/Pilih Putra\/Putri \(2 Terdaftar\)/i)).toBeInTheDocument();
    expect(screen.getByText("Nadia Pratama")).toBeInTheDocument();
  });

  it("merender GuardianAttendanceView dengan tabel riwayat dan filter", () => {
    const history = [
      {
        id: "PRES_01",
        sesi_kelas_id: "SESI_01",
        tanggal: new Date().toISOString(),
        mata_pelajaran: "Pemrograman Web",
        guru_pengampu: "Pak Budi",
        jam: "07:30 - 09:00",
        status: "HADIR" as const,
        catatan: "Tepat waktu",
      },
    ];

    render(
      <GuardianAttendanceView
        activeChild={mockDashboardData.activeChild}
        linkedChildren={mockDashboardData.linkedChildren}
        recap={mockDashboardData.attendanceRecap}
        history={history}
      />
    );

    expect(screen.getByText("Presensi & Kehadiran Anak")).toBeInTheDocument();
    expect(screen.getByText("Total Sesi KBM")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("Pemrograman Web")).toBeInTheDocument();
    expect(screen.getByText("HADIR")).toBeInTheDocument();
  });

  it("merender GuardianGradesView dan dapat berpindah ke tab e-Rapor resmi", () => {
    const reportCard = {
      siswa_id: "STUDENT_01",
      nama_siswa: "Rian Pratama",
      nis: "20261001",
      nisn: "0081234567",
      rombel_nama: "X RPL 1",
      fase: "Fase E",
      semester_nama: "Semester Ganjil",
      tahun_ajaran: "2026/2027",
      wali_kelas_nama: "Pak Andi Setiawan, S.Pd.",
      wali_kelas_nip: "198001012005011001",
      kepala_sekolah_nama: "Drs. H. Mulyadi, M.Pd.",
      kepala_sekolah_nip: "197204151998031002",
      mata_pelajaran: [
        {
          mata_pelajaran_id: "MAPEL_01",
          mata_pelajaran_nama: "Rekayasa Perangkat Lunak",
          guru_nama: "Pak Andi Setiawan, S.Pd.",
          kktp: 75,
          nilai_akhir: 90,
          predikat: "A",
          capaian_tertinggi: "Memahami konsep pengembangan perangkat lunak dengan optimal",
          capaian_terendah: null,
        },
      ],
      rekap_presensi: mockDashboardData.attendanceRecap,
      catatan_wali_kelas: "Pertahankan prestasi belajar ananda!",
      status_kenaikan: "Memenuhi seluruh kriteria ketuntasan fase",
    };

    render(
      <GuardianGradesView
        activeChild={mockDashboardData.activeChild}
        linkedChildren={mockDashboardData.linkedChildren}
        publishedGrades={mockDashboardData.recentPublishedGrades}
        reportCard={reportCard}
      />
    );

    expect(screen.getByText("Perkembangan Nilai & Rapor")).toBeInTheDocument();
    expect(screen.getByText(/Formatif TP 1\.1/i)).toBeInTheDocument();

    // Klik tab e-Rapor
    const tabReport = screen.getByTestId("tab-report");
    fireEvent.click(tabReport);

    expect(screen.getByText("Transkrip Capaian Akademik")).toBeInTheDocument();
    expect(screen.getByText(/Pertahankan prestasi belajar ananda!/i)).toBeInTheDocument();
    expect(
      screen.getByText("Memahami konsep pengembangan perangkat lunak dengan optimal")
    ).toBeInTheDocument();
  });

  it("merender GuardianReportPrintModal untuk cetak lembar rapor resmi A4", () => {
    const reportCard = {
      siswa_id: "STUDENT_01",
      nama_siswa: "Rian Pratama",
      nis: "20261001",
      nisn: "0081234567",
      rombel_nama: "X RPL 1",
      fase: "Fase E",
      semester_nama: "Semester Ganjil",
      tahun_ajaran: "2026/2027",
      wali_kelas_nama: "Pak Andi Setiawan, S.Pd.",
      wali_kelas_nip: "198001012005011001",
      kepala_sekolah_nama: "Drs. H. Mulyadi, M.Pd.",
      kepala_sekolah_nip: "197204151998031002",
      mata_pelajaran: [],
      rekap_presensi: mockDashboardData.attendanceRecap,
      catatan_wali_kelas: "Prestasi sangat baik",
      status_kenaikan: null,
    };

    render(<GuardianReportPrintModal isOpen={true} onClose={vi.fn()} reportCard={reportCard} />);

    expect(screen.getByTestId("guardian-report-print-modal")).toBeInTheDocument();
    expect(screen.getByText("SMK NEGERI OTOMINDO JAKARTA")).toBeInTheDocument();
    expect(screen.getByText("LAPORAN HASIL CAPAIAN KOMPETENSI PESERTA DIDIK")).toBeInTheDocument();
    expect(screen.getByTestId("print-button")).toBeInTheDocument();
  });

  it("merender PengajuanIzinModal formulir surat izin / sakit", () => {
    render(
      <PengajuanIzinModal
        isOpen={true}
        onClose={vi.fn()}
        linkedChildren={mockDashboardData.linkedChildren}
        activeChildId="STUDENT_01"
      />
    );

    expect(screen.getByTestId("pengajuan-izin-modal")).toBeInTheDocument();
    expect(screen.getByText("Pengajuan Izin & Keterangan")).toBeInTheDocument();
    expect(screen.getByText("Putra / Putri Terkait")).toBeInTheDocument();
    expect(screen.getByText("Jenis Permohonan")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Contoh: Izin Sakit Demam 2 Hari/i)).toBeInTheDocument();
  });

  it("merender GuardianDashboardClient dengan tombol klaim anak lain dan kartu anak multi-anak (Fitur 08)", () => {
    render(<GuardianDashboardClient data={mockDashboardData} />);

    expect(screen.getByTestId("header-button-klaim-anak")).toBeInTheDocument();
    expect(screen.getByText(/Daftar Putra\/Putri Terhubung/i)).toBeInTheDocument();
    expect(screen.getByText("Nadia Pratama")).toBeInTheDocument();
    expect(screen.getByText("Beralih ke Anak Ini")).toBeInTheDocument();
  });

  it("merender GuardianClaimFlowView formulir klaim mandiri siswa dan dapat beralih mode", () => {
    render(
      <GuardianClaimFlowView
        schoolName="SMK OTOMINDO"
        rombelOptions={[{ id: "ROMBEL_1", nama: "X TO 3", tingkat: "Kelas 10" }]}
      />
    );

    expect(screen.getByText("Klaim & Hubungkan Data Putra/Putri")).toBeInTheDocument();
    expect(screen.getByText("SMK OTOMINDO")).toBeInTheDocument();
    expect(screen.getByText("Nomor Induk (NIS / NISN)")).toBeInTheDocument();
    expect(screen.getByText("Nama Siswa & Rombel Kelas")).toBeInTheDocument();

    // Beralih ke mode Rombel
    const rombelBtn = screen.getByText("Nama Siswa & Rombel Kelas");
    fireEvent.click(rombelBtn);

    expect(screen.getByText("Rombel / Kelas Siswa")).toBeInTheDocument();
  });
});
