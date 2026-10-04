import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PerformanceBarChart } from "@/shared/components/dashboard/cockpit/performance-bar-chart";
import { TeachingTimelineRail } from "@/shared/components/dashboard/cockpit/teaching-timeline-rail";
import { AttentionQueueCard } from "@/shared/components/dashboard/cockpit/attention-queue-card";
import { DonutGauge } from "@/shared/components/dashboard/cockpit/donut-gauge";
import { TeacherDashboard } from "@/shared/components/dashboard/role-views/teacher-dashboard";
import { AuthenticatedUser } from "@/shared/infrastructure/auth/auth-service";

const mockTeacher: AuthenticatedUser = {
  id: "01J000000000000000000TEACH1",
  username: "guru_chandra",
  nama_lengkap: "Chandra Wijaya, S.Kom.",
  email: null,
  peran_dasar: "TEACHER",
  status_akun: "AKTIF",
  harus_ganti_password: false,
  sekolah_id: "01J00000000000000000000001",
};

describe("Stage 11.1B — Business Reality Remediation Tests", () => {
  it("1. PerformanceBarChart displays honest '-' empty state when no assessments exist", () => {
    render(<PerformanceBarChart items={[]} averageScore={null} bestClass={null} />);

    expect(screen.getByText("Belum Ada Nilai Masuk")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("Belum Ada Penilaian Terbit")).toBeInTheDocument();
    // Does NOT render fake scores
    expect(screen.queryByText("85.0")).not.toBeInTheDocument();
    expect(screen.queryByText("88.0")).not.toBeInTheDocument();
  });

  it("2. TeachingTimelineRail removes fake PTS and Rapat events and displays clean empty state", () => {
    render(
      <TeachingTimelineRail
        mergedBlocks={[]}
        actualSessions={[]}
        announcements={[]}
        upcomingEvents={[]}
      />
    );

    // Verified: No fake events
    expect(screen.queryByText("Batas Penginputan Nilai PTS Gasal")).not.toBeInTheDocument();
    expect(screen.queryByText("Rapat Koordinasi Evaluasi Kurikulum")).not.toBeInTheDocument();
    expect(screen.queryByText(/24 Sep 2026/)).not.toBeInTheDocument();
    expect(screen.queryByText(/28 Sep 2026/)).not.toBeInTheDocument();

    // Verified: Factual empty state
    expect(screen.getByText("Belum Ada Agenda Terdekat")).toBeInTheDocument();
    expect(
      screen.getByText("Kalender akademik sekolah belum memiliki jadwal kegiatan mendatang.")
    ).toBeInTheDocument();
  });

  it("3. TeachingTimelineRail renders real upcoming events when available", () => {
    const realEvents = [
      {
        id: "EVT_01",
        judul: "Asesmen Sumatif Akhir Jenjang",
        tanggal_mulai: new Date("2026-10-15T08:00:00Z"),
        tipe_event: "UJIAN",
      },
    ];

    render(
      <TeachingTimelineRail
        mergedBlocks={[]}
        actualSessions={[]}
        announcements={[]}
        upcomingEvents={realEvents}
      />
    );

    expect(screen.getByText("Asesmen Sumatif Akhir Jenjang")).toBeInTheDocument();
    expect(screen.queryByText("Belum Ada Agenda Terdekat")).not.toBeInTheDocument();
  });

  it("4. AttentionQueueCard displays educational waiting state instead of fake optimal status", () => {
    render(<AttentionQueueCard items={[]} />);

    expect(screen.getByText("Menunggu Aktivitas Pembelajaran")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Belum ada catatan tindak lanjut\. Data perhatian khusus siswa.*akan terakumulasi otomatis seiring berjalannya KBM\./
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Semua Siswa Terpantau Optimal")).not.toBeInTheDocument();
  });

  it("5. DonutGauge displays custom displayValue '-' when provided", () => {
    render(<DonutGauge percentage={0} label="Siswa Hadir" displayValue="-" />);

    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("Siswa Hadir")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("6. TeacherDashboard eliminates fake 100% attendance and fake fallback scores", async () => {
    const jsx = await TeacherDashboard({
      user: mockTeacher,
      initialData: {
        hasProfile: true,
        teacher: {
          id: "01J00000000000000000000001",
          sekolah_id: "01J00000000000000000000001",
          nama_lengkap: "Chandra Wijaya",
          gelar_belakang: "S.Kom.",
          nama_dengan_gelar: "Chandra Wijaya, S.Kom.",
          jenis_kelamin: "L",
          status_kepegawaian: "TETAP",
          status_aktif: true,
          status_lifecycle: "AKTIF",
          created_at: new Date(),
          updated_at: new Date(),
        },
        activeAssignments: [],
        activeHomeroom: null,
        totalJamMinggu: 0,
        totalRombel: 0,
        totalSiswaBinaan: 0,
      },
    });

    render(jsx);

    // Attendance card shows '-' and honest text when no sessions are active
    expect(screen.getByText("Belum Ada Jadwal KBM Hari Ini")).toBeInTheDocument();

    // No hardcoded 85.0 or 88.0 scores in performance chart
    expect(screen.queryByText("85.0")).not.toBeInTheDocument();
    expect(screen.queryByText("88.0")).not.toBeInTheDocument();

    // Timeline does not render fictitious deadlines
    expect(screen.queryByText("Batas Penginputan Nilai PTS Gasal")).not.toBeInTheDocument();
    expect(screen.queryByText("Rapat Koordinasi Evaluasi Kurikulum")).not.toBeInTheDocument();
  });
});
