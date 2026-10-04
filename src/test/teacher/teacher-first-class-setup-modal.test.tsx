/**
 * Ruang Pintar — TeacherFirstClassSetupModal Component Tests
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeacherFirstClassSetupModal } from "@/shared/components/dashboard/cockpit/teacher-first-class-setup-modal";
import * as smartActions from "@/app/actions/smart-onboarding-actions";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock smart onboarding actions
vi.mock("@/app/actions/smart-onboarding-actions", () => ({
  createManualClassAction: vi.fn(),
  getTeacherInitialScheduleOptionsAction: vi.fn(),
  createTeacherInitialScheduleAction: vi.fn(),
}));

describe("TeacherFirstClassSetupModal (Single Unified 4-Step Glass Wizard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("renders Step 1 with teacher name and tactile switch toggles", async () => {
    render(<TeacherFirstClassSetupModal shouldOpen={true} teacherName="Pak Chandra" />);

    expect(await screen.findByText(/Selamat Datang,/i)).toBeInTheDocument();
    expect(screen.getByText("Pak Chandra")).toBeInTheDocument();
    expect(screen.getByText("Guru Mata Pelajaran")).toBeInTheDocument();
    expect(screen.getByText("Wali Kelas")).toBeInTheDocument();

    // Check Wali Kelas switch exists and is interactive
    const waliSwitch = screen.getByRole("switch");
    expect(waliSwitch).toBeInTheDocument();
    expect(waliSwitch).toHaveAttribute("aria-checked", "true");

    // Click toggle to turn OFF
    fireEvent.click(waliSwitch);
    expect(waliSwitch).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("OFF")).toBeInTheDocument();

    // Click toggle again to turn ON
    fireEvent.click(waliSwitch);
    expect(waliSwitch).toHaveAttribute("aria-checked", "true");
  });

  it("navigates through Step 1 to Step 2 (Mata Pelajaran)", async () => {
    render(<TeacherFirstClassSetupModal shouldOpen={true} teacherName="Pak Chandra" />);

    const nextBtn = await screen.findByRole("button", { name: /lanjutkan/i });
    fireEvent.click(nextBtn);

    expect(await screen.findByText(/Mata pelajaran apa yang Anda ampu\?/i)).toBeInTheDocument();
    expect(screen.getByText("Informatika")).toBeInTheDocument();
    expect(screen.getByText("Matematika")).toBeInTheDocument();

    // Toggle a subject
    const mathBtn = screen.getByRole("button", { name: "Matematika" });
    fireEvent.click(mathBtn);

    // Click Kembali to go back to Step 1
    const backBtn = screen.getByRole("button", { name: /kembali/i });
    fireEvent.click(backBtn);
    expect(await screen.findByText("Guru Mata Pelajaran")).toBeInTheDocument();
  });

  it("completes Step 3 class creation directly and seamlessly progresses to Step 4", async () => {
    vi.mocked(smartActions.createManualClassAction).mockResolvedValue({
      success: true,
      data: {
        rombelId: "ROMBEL_01",
        namaRombel: "X RPL 1",
        totalSiswa: 3,
        mataPelajaran: "Pemrograman Web",
      },
    });

    vi.mocked(smartActions.getTeacherInitialScheduleOptionsAction).mockResolvedValue({
      success: true,
      data: {
        rombelNama: "X RPL 1",
        mataPelajaran: "Pemrograman Web",
        slots: [{ id: "SLOT_01", nama: "Jam Ke-1", jam_mulai: "07:00", jam_selesai: "08:30" }],
      },
    });

    render(<TeacherFirstClassSetupModal shouldOpen={true} teacherName="Pak Chandra" />);

    // Step 1 -> Step 2
    fireEvent.click(await screen.findByRole("button", { name: /lanjutkan/i }));
    // Step 2 -> Step 3
    fireEvent.click(await screen.findByRole("button", { name: /lanjutkan/i }));

    expect(await screen.findByText("Siapkan rombel pertama Anda")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Contoh: X RPL 1/i)).toBeInTheDocument();

    // Submit Step 3 Form directly
    const saveClassBtn = screen.getByRole("button", { name: /simpan & atur jadwal/i });
    fireEvent.click(saveClassBtn);

    // Directly transitions to Step 4 without closing or hopping modals!
    await waitFor(() => {
      expect(screen.getByText("Tentukan jadwal mengajar pertama")).toBeInTheDocument();
      expect(screen.getByText("Rombel X RPL 1 Siap!")).toBeInTheDocument();
    });
  });

  it("allows manual schedule start and end time inputs without the rocket UI token", async () => {
    vi.mocked(smartActions.getTeacherInitialScheduleOptionsAction).mockResolvedValue({
      success: true,
      data: {
        rombelNama: "X RPL 1",
        mataPelajaran: "Pemrograman Web",
        slots: [{ id: "SLOT_01", nama: "Jam Ke-1", jam_mulai: "07:00", jam_selesai: "08:30" }],
      },
    });
    vi.mocked(smartActions.createTeacherInitialScheduleAction).mockResolvedValue({
      success: true,
    });

    render(<TeacherFirstClassSetupModal shouldOpen={true} teacherName="Pak Chandra" />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent("manual-class-created", {
          detail: { rombelId: "ROMBEL_01" },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Tentukan jadwal mengajar pertama")).toBeInTheDocument();
    });

    const jamMulai = screen.getByLabelText(/jam mulai/i);
    const jamSelesai = screen.getByLabelText(/jam selesai/i);
    expect(jamMulai).toHaveAttribute("type", "time");
    expect(jamSelesai).toHaveAttribute("type", "time");
    expect(screen.queryByText(/🚀/i)).not.toBeInTheDocument();

    fireEvent.change(jamMulai, { target: { value: "08:00" } });
    fireEvent.change(jamSelesai, { target: { value: "09:30" } });

    fireEvent.click(screen.getByRole("button", { name: /simpan jadwal & siap mengajar/i }));

    await waitFor(() => {
      expect(smartActions.createTeacherInitialScheduleAction).toHaveBeenCalledWith({
        rombelId: "ROMBEL_01",
        slotWaktuId: "SLOT_01",
        hari: "SENIN",
        jam_mulai: "08:00",
        jam_selesai: "09:30",
      });
    });
  });
});
