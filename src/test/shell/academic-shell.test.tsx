import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AcademicShell } from "@/shared/components/shell/academic-shell";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockUser = {
  id: "01J000000000000000000TEACH1",
  username: "guru_ahmad",
  nama_lengkap: "Ahmad Dahlan",
  peran_dasar: "TEACHER",
  sekolah_id: "01J00000000000000000000001",
};

describe("AcademicShell Component (Phase 05)", () => {
  it("renders shell layout with topbar, sidebar, and main content", () => {
    render(
      <AcademicShell user={mockUser}>
        <div data-testid="test-content">Konten Dashboard</div>
      </AcademicShell>
    );

    expect(screen.getByTestId("test-content")).toBeInTheDocument();
    expect(screen.getByLabelText("Navigasi Utama")).toBeInTheDocument();
    expect(screen.getByLabelText("Menu Pengguna")).toBeInTheDocument();
  });

  it("scopes teacher typography to teacher workspace users", () => {
    const { unmount } = render(
      <AcademicShell user={mockUser}>
        <div>Konten Guru</div>
      </AcademicShell>
    );

    expect(document.documentElement).toHaveClass("teacher-workspace");
    unmount();
    expect(document.documentElement).not.toHaveClass("teacher-workspace");

    render(
      <AcademicShell user={{ ...mockUser, peran_dasar: "SCHOOL_STAFF" }}>
        <div>Konten Staf</div>
      </AcademicShell>
    );

    expect(document.documentElement).not.toHaveClass("teacher-workspace");
  });

  it("toggles sidebar compact rail on collapse button click", () => {
    render(
      <AcademicShell user={mockUser}>
        <div>Konten</div>
      </AcademicShell>
    );

    const toggleButton = screen.getByLabelText(/Ciutkan Sidebar/i);
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);

    const expandButton = screen.getByLabelText(/Perluas Sidebar/i);
    expect(expandButton).toBeInTheDocument();
  });

  it("opens user menu dropdown on click and displays identity", () => {
    render(
      <AcademicShell user={mockUser}>
        <div>Konten</div>
      </AcademicShell>
    );

    const userMenuButton = screen.getByLabelText("Menu Pengguna");
    fireEvent.click(userMenuButton);

    expect(screen.getByText("Akun Aktif")).toBeInTheDocument();
    expect(screen.getByText("Ganti Kata Sandi")).toBeInTheDocument();
    expect(screen.getByText("Keluar dari Akun")).toBeInTheDocument();
  });

  it("opens logout confirmation modal when clicking logout and cancels on Batal", () => {
    render(
      <AcademicShell user={mockUser}>
        <div>Konten</div>
      </AcademicShell>
    );

    // Open User Menu
    fireEvent.click(screen.getByLabelText("Menu Pengguna"));

    // Click "Keluar dari Akun"
    fireEvent.click(screen.getByText("Keluar dari Akun"));

    // Modal opens
    expect(screen.getByText("Konfirmasi Keluar")).toBeInTheDocument();
    expect(screen.getByText("Ya, Keluar")).toBeInTheDocument();
    expect(screen.getByText("Batal")).toBeInTheDocument();

    // Click "Batal"
    fireEvent.click(screen.getByText("Batal"));

    // Modal closes
    expect(screen.queryByText("Konfirmasi Keluar")).not.toBeInTheDocument();
  });
});
