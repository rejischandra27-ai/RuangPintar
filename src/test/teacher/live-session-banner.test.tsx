import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveSessionBanner } from "@/shared/components/dashboard/cockpit/live-session-banner";
import { MergedScheduleBlock } from "@/modules/schedule/domain/schedule-merger";
import { ClassSessionDTO } from "@/modules/schedule/domain/schedule-types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("@/app/actions/class-session-actions", () => ({
  ensureAndGetTodaySessionAction: vi.fn().mockResolvedValue({
    success: true,
    data: { sessionId: "ses_123" },
    message: "Sesi dibuka",
  }),
}));

vi.mock("@/app/actions/rombel-join-actions", () => ({
  getRombelJoinCodeAction: vi.fn().mockResolvedValue({
    success: true,
    data: { code: "RP-XII-RPL" },
  }),
}));

describe("LiveSessionBanner — Teacher Command Center (STAGE UX-02 P0)", () => {
  const createMockBlock = (
    key: string,
    jamMulai: string,
    jamSelesai: string,
    rombelNama = "XII RPL",
    mapelNama = "Pemrograman Web"
  ): MergedScheduleBlock => ({
    key,
    hari: "SENIN",
    mata_pelajaran_id: "mapel_01",
    mata_pelajaran_nama: mapelNama,
    mata_pelajaran_kode: "PWEB",
    rombel_id: "rom_01",
    rombel_nama: rombelNama,
    guru_id: "guru_01",
    guru_nama: "Pak Guru",
    ruangan: "Lab Komputer 2",
    tahun_ajaran_id: "ta_01",
    penugasan_mengajar_id: "pen_01",
    jam_mulai: jamMulai,
    jam_selesai: jamSelesai,
    total_jp: 3,
    slot_range_label: "Jam 1–3",
    entries: [],
    primary_entry: {} as any,
  });

  it("1. renders active session banner with 4-pillar status when session is currently active", () => {
    // Current time is between 00:00 and 23:59
    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, "0");
    const block = createMockBlock("b1", `${currentH}:00`, "23:59");

    render(
      <LiveSessionBanner
        mergedBlocks={[block]}
        actualSessions={[]}
        activeTopic="Bab 3: Pembuatan REST API Express.js"
      />
    );

    expect(screen.getByText("SESI SEDANG BERLANGSUNG DETIK INI")).toBeInTheDocument();
    expect(screen.getByText("XII RPL")).toBeInTheDocument();
    expect(screen.getByText("Pemrograman Web")).toBeInTheDocument();
    expect(screen.getByText("Bab 3: Pembuatan REST API Express.js")).toBeInTheDocument();
    expect(screen.getByText("MULAI MENGAJAR SEKARANG")).toBeInTheDocument();
    expect(screen.getByText("Presensi Kilat")).toBeInTheDocument();
    expect(screen.getByText("Buka Modul Ajar")).toBeInTheDocument();
    expect(screen.getByText(/Salin Kode Siswa/i)).toBeInTheDocument();

    // 4 Pilar status
    expect(screen.getByText("Presensi")).toBeInTheDocument();
    expect(screen.getByText("Materi")).toBeInTheDocument();
    expect(screen.getByText("Tugas")).toBeInTheDocument();
    expect(screen.getByText("Jurnal")).toBeInTheDocument();
  });

  it("2. renders upcoming session banner when block is in the future", () => {
    // A block set to late midnight (future)
    const block = createMockBlock("b2", "23:58", "23:59", "XI RPL", "Basis Data SQL");

    render(
      <LiveSessionBanner
        mergedBlocks={[block]}
        actualSessions={[]}
        activeTopic="Normalisasi Database 3NF"
      />
    );

    // If current time is earlier than 23:58, it will be upcoming
    if (new Date().getHours() < 23 || new Date().getMinutes() < 58) {
      expect(screen.getByText("SESI MENGAJAR BERIKUTNYA HARI INI")).toBeInTheDocument();
      expect(screen.getByText("XI RPL")).toBeInTheDocument();
      expect(screen.getByText("Basis Data SQL")).toBeInTheDocument();
    }
  });

  it("3. renders clean completed state when all sessions are in the past", () => {
    // Block set to 00:00 - 00:01 (past for any time after 00:01)
    const now = new Date();
    if (now.getHours() > 0 || now.getMinutes() > 2) {
      const block = createMockBlock("b3", "00:00", "00:01");

      render(<LiveSessionBanner mergedBlocks={[block]} actualSessions={[]} />);

      expect(screen.getByText("KBM HARI INI TUNTAS")).toBeInTheDocument();
      expect(screen.getByText(/Seluruh Sesi Mengajar Hari Ini Telah Selesai/i)).toBeInTheDocument();
      expect(screen.getByText("Buku Nilai & Rapor")).toBeInTheDocument();
    }
  });

  it("4. renders nothing when mergedBlocks is empty", () => {
    const { container } = render(<LiveSessionBanner mergedBlocks={[]} actualSessions={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
