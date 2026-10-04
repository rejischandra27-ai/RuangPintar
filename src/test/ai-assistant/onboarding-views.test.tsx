import { describe, it, expect, vi } from "vitest";
import React from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { RegisterView } from "@/modules/ai-assistant/presentation/register-view";
import { SchoolDiscovery } from "@/modules/ai-assistant/presentation/school-discovery";
import { searchSchoolsAction } from "@/app/actions/smart-onboarding-actions";
import { AiPreviewTableModal } from "@/modules/ai-assistant/presentation/ai-preview-table-modal";
import { SmartPhotoOnboardingModal } from "@/modules/ai-assistant/presentation/smart-photo-onboarding-modal";

// Mock Server Actions
vi.mock("@/app/actions/smart-onboarding-actions", () => ({
  searchSchoolsAction: vi.fn().mockResolvedValue({ success: true, data: [] }),
  registerTeacherAction: vi.fn().mockResolvedValue({
    success: true,
    data: { user: { id: "u1" }, sekolah: { id: "s1" }, redirectUrl: "/dashboard" },
  }),
  processClassPhotoAction: vi.fn().mockResolvedValue({
    success: true,
    data: {
      requestId: "req_test",
      nama_kelas: "X MIPA 1",
      mata_pelajaran: "Matematika",
      siswa: [{ nama_lengkap: "Budi Santoso", jenis_kelamin: "L", nis: "101" }],
      total_terdeteksi: 1,
      confidence_score: 0.95,
    },
  }),
  confirmClassCreationAction: vi.fn().mockResolvedValue({
    success: true,
    data: {
      rombelId: "rombel_1",
      namaRombel: "X MIPA 1",
      totalSiswa: 1,
      mataPelajaran: "Matematika",
    },
  }),
  getTeacherTrialStatusAction: vi.fn().mockResolvedValue({
    success: true,
    data: {
      is_trial: true,
      tipe_lisensi: "FREEMIUM",
      days_remaining: 30,
      max_rombel: 5,
      current_rombel_count: 1,
      can_create_rombel: true,
      is_expired: false,
    },
  }),
}));

describe("Phase 21: Presentation Views (AI Assistance & SaaS Onboarding)", () => {
  it("mencari sekolah setelah debounce dan menampilkan detail serta aksi gabung", async () => {
    vi.useFakeTimers();
    vi.mocked(searchSchoolsAction).mockResolvedValue({
      success: true,
      data: [
        {
          id: "school-1",
          nama: "SMP Nusantara",
          jenjang: "SMP",
          lokasi: "Kota Bandung",
          npsn: "12345678",
        },
      ],
    });
    const onSelect = vi.fn();
    render(<SchoolDiscovery selectedChoice={null} onSelect={onSelect} />);

    fireEvent.change(screen.getByLabelText("Nama sekolah atau NPSN"), {
      target: { value: "SMP Nusantara" },
    });
    expect(searchSchoolsAction).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(searchSchoolsAction).toHaveBeenCalledWith("SMP Nusantara");
    expect(screen.getByText("SMP Nusantara")).toBeInTheDocument();
    expect(screen.getByText("Kota Bandung")).toBeInTheDocument();
    expect(screen.getAllByText("NPSN 12345678")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Ajukan Bergabung" }));
    expect(onSelect).toHaveBeenLastCalledWith({ sekolah_id: "school-1" });
    vi.useRealTimers();
  });

  it("menampilkan pembuatan sekolah baru saat hasil pencarian kosong", async () => {
    vi.useFakeTimers();
    vi.mocked(searchSchoolsAction).mockResolvedValue({ success: true, data: [] });
    const onSelect = vi.fn();
    render(<SchoolDiscovery selectedChoice={null} onSelect={onSelect} />);

    fireEvent.change(screen.getByLabelText("Nama sekolah atau NPSN"), {
      target: { value: "Sekolah Harapan" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(screen.getByText("Sekolah belum ditemukan")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Buat Sekolah Baru" }));
    expect(onSelect).toHaveBeenLastCalledWith({
      nama_sekolah: "Sekolah Harapan",
      jenjang: "UMUM",
    });
    vi.useRealTimers();
  });

  it("1. harus merender formulir registrasi mandiri guru dengan 4 kolom input", () => {
    render(<RegisterView />);

    expect(screen.getByText("Ruang")).toBeInTheDocument();
    expect(screen.getByText("Daftar Akun Guru Mandiri")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Contoh: Budi Santoso, S.Pd")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("nama@gmail.com")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Contoh: SMA 1 Coba atau SMP Harapan")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Mulai Coba Gratis 30 Hari")).toBeInTheDocument();
  });

  it("2. harus merender modal unggah foto lembar absensi kelas", () => {
    const handleClose = vi.fn();
    const handleComplete = vi.fn();

    render(
      <SmartPhotoOnboardingModal
        isOpen={true}
        onClose={handleClose}
        onExtractionComplete={handleComplete}
      />
    );

    expect(screen.getByText("Buat Kelas Otomatis via Foto AI")).toBeInTheDocument();
    expect(screen.getByText("Ambil Foto Kamera HP atau Unggah Berkas")).toBeInTheDocument();
  });

  it("3. harus merender modal pratinjau tabel siswa hasil ekstraksi AI dan tombol konfirmasi", () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    const mockExtraction = {
      requestId: "req_123",
      nama_kelas: "X MIPA 1",
      mata_pelajaran: "Matematika",
      siswa: [
        { nama_lengkap: "Ahmad Rizky", jenis_kelamin: "L" as const, nis: "1001" },
        { nama_lengkap: "Citra Lestari", jenis_kelamin: "P" as const, nis: "1002" },
      ],
      total_terdeteksi: 2,
      confidence_score: 0.95,
    };

    render(
      <AiPreviewTableModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        extractionData={mockExtraction}
      />
    );

    expect(
      screen.getByText("Pratinjau & Konfirmasi Kelas (2 Siswa Terdeteksi)")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ahmad Rizky")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Citra Lestari")).toBeInTheDocument();
    expect(screen.getByText("Setujui & Terbitkan Kelas (2 Siswa)")).toBeInTheDocument();
  });
});
