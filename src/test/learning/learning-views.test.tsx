/**
 * Ruang Pintar — M11 Learning Presentation Views Unit Tests
 */

import React from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TeacherClassesView } from "@/modules/learning/presentation/teacher-classes-view";
import { ClassWorkspaceView } from "@/modules/learning/presentation/class-workspace-view";
import { deleteRombelAction, updateRombelAction } from "@/app/actions/academic-actions";
import {
  TeacherClassCardDTO,
  TeacherClassWorkspaceDTO,
} from "@/modules/learning/domain/learning-types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/app/actions/academic-actions", () => ({
  deleteRombelAction: vi.fn(),
  updateRombelAction: vi.fn(),
}));

describe("M11 Learning Presentation Views", () => {
  const mockClasses: TeacherClassCardDTO[] = [
    {
      id: "PEN_01",
      guru_id: "G_01",
      guru_nama: "Budi Santoso, M.Kom.",
      rombel_id: "R_01",
      rombel_nama: "X RPL 1",
      tingkat_nama: "Kelas X",
      mata_pelajaran_id: "MP_01",
      mata_pelajaran_nama: "Pemrograman Web",
      mata_pelajaran_kode: "WEB",
      tahun_ajaran_nama: "2026/2027",
      semester_nama: "Ganjil",
      jumlah_jam_minggu: 4,
      status: "AKTIF",
      total_siswa: 36,
      total_bab: 3,
      total_materi: 5,
      total_tugas: 2,
      total_jurnal: 4,
      jadwal_hari_ini: "07:00 - 08:30",
    },
  ];

  const mockWorkspace: TeacherClassWorkspaceDTO = {
    penugasan: {
      id: "PEN_01",
      sekolah_id: "SCH_01",
      guru_id: "G_01",
      guru_nama: "Budi Santoso, M.Kom.",
      mata_pelajaran_id: "MP_01",
      mata_pelajaran_nama: "Pemrograman Web",
      mata_pelajaran_kode: "WEB",
      rombel_id: "R_01",
      rombel_nama: "X RPL 1",
      tingkat_nama: "Kelas X",
      tahun_ajaran_id: "TA_01",
      tahun_ajaran_nama: "2026/2027",
      semester_id: "SEM_01",
      semester_nama: "Ganjil",
      jumlah_jam_minggu: 4,
      status: "AKTIF",
    },
    total_siswa: 36,
    lingkup_materi: [
      {
        id: "BAB_01",
        sekolah_id: "SCH_01",
        penugasan_mengajar_id: "PEN_01",
        kode: "BAB 1",
        judul: "Pengantar HTML dan CSS",
        deskripsi: "Dasar markup dokumen web modern",
        urutan: 1,
        status: "AKTIF",
        created_at: new Date(),
        updated_at: new Date(),
        tujuan_pembelajaran: [
          {
            id: "TP_01",
            sekolah_id: "SCH_01",
            lingkup_materi_id: "BAB_01",
            kode: "TP 1.1",
            deskripsi: "Memahami struktur anatomi elemen HTML5 semantik",
            urutan: 1,
            status: "AKTIF",
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      },
    ],
    materi_list: [
      {
        id: "MAT_01",
        sekolah_id: "SCH_01",
        guru_id: "G_01",
        lingkup_materi_id: "BAB_01",
        lingkup_materi_judul: "Pengantar HTML dan CSS",
        mata_pelajaran_id: "MP_01",
        mata_pelajaran_nama: "Pemrograman Web",
        judul: "Modul Praktikum HTML5",
        deskripsi: "Panduan tag dasar semantik",
        tipe_konten: "DOKUMEN",
        status: "PUBLISHED",
        created_at: new Date(),
        updated_at: new Date(),
        is_published: true,
      },
    ],
    tugas_list: [
      {
        id: "TUG_01",
        sekolah_id: "SCH_01",
        guru_id: "G_01",
        lingkup_materi_id: "BAB_01",
        lingkup_materi_judul: "Pengantar HTML dan CSS",
        mata_pelajaran_id: "MP_01",
        mata_pelajaran_nama: "Pemrograman Web",
        judul: "Tugas 1: Halaman Portofolio Pribadi",
        petunjuk: "Buat file HTML semantik",
        tipe_penyerahan: "FILE",
        status: "PUBLISHED",
        created_at: new Date(),
        updated_at: new Date(),
        publikasi_aktif: {
          id: "PUB_TUG_01",
          sekolah_id: "SCH_01",
          tugas_id: "TUG_01",
          penugasan_mengajar_id: "PEN_01",
          tanggal_mulai: new Date(),
          batas_waktu: new Date(Date.now() + 86400000),
          izinkan_terlambat: true,
          status: "DITERBITKAN",
          submission_count: 32,
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
    ],
    administrasi_list: [
      {
        id: "ADM_01",
        sekolah_id: "SCH_01",
        penugasan_mengajar_id: "PEN_01",
        guru_id: "G_01",
        guru_nama: "Budi Santoso, M.Kom.",
        tanggal: new Date(),
        pertemuan_ke: 1,
        materi_disampaikan: "Pengenalan Struktur HTML5",
        kegiatan_pembelajaran: "Praktikum tag heading dan paragraph",
        catatan_refleksi: "Seluruh siswa berhasil membuat file pertama",
        status_realisasi: "TERLAKSANA",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    jadwal_list: [
      {
        hari: "SENIN",
        jam_mulai: "07:00",
        jam_selesai: "08:30",
        ruangan: "Lab RPL 1",
        slot_nama: "Jam Ke-1 – 2",
      },
    ],
  };

  describe("TeacherClassesView (/kelas-saya)", () => {
    it("renders class card and statistics correctly", () => {
      render(<TeacherClassesView classes={mockClasses} />);

      expect(screen.getByText("Pemrograman Web")).toBeInTheDocument();
      expect(screen.getByText("X RPL 1")).toBeInTheDocument();
      expect(screen.getByText("WEB")).toBeInTheDocument();
      expect(screen.getByText("4 JP")).toBeInTheDocument();
      expect(screen.getByText("36 Siswa")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /kelola kelas/i })).toHaveAttribute(
        "href",
        "/kelas-saya/PEN_01"
      );
    });

    it("shows rename and delete controls only to the tenant owner", () => {
      const { rerender } = render(<TeacherClassesView classes={mockClasses} />);

      expect(screen.queryByRole("button", { name: "Ubah Nama Kelas" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Hapus Kelas" })).not.toBeInTheDocument();

      rerender(<TeacherClassesView classes={mockClasses} isTenantOwner />);

      expect(screen.getByRole("button", { name: "Ubah Nama Kelas" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Hapus Kelas" })).toBeInTheDocument();
    });

    it("submits a partial rename for the selected rombel", async () => {
      vi.mocked(updateRombelAction).mockResolvedValue({
        success: true,
        message: "Nama kelas berhasil diperbarui.",
      });
      render(<TeacherClassesView classes={mockClasses} isTenantOwner />);

      fireEvent.click(screen.getByRole("button", { name: "Ubah Nama Kelas" }));
      fireEvent.change(screen.getByRole("textbox", { name: "Nama Kelas" }), {
        target: { value: "X RPL 2" },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Simpan Nama Kelas" }));
        await vi.waitFor(() => {
          expect(updateRombelAction).toHaveBeenCalledWith("R_01", expect.any(FormData));
        });
      });
      const submittedForm = vi.mocked(updateRombelAction).mock.calls[0][1];
      expect(submittedForm.get("nama")).toBe("X RPL 2");
      expect(submittedForm.has("semester_id")).toBe(false);
    });

    it("requires confirmation before archiving a class", async () => {
      vi.mocked(deleteRombelAction).mockResolvedValue({
        success: true,
        message: "Kelas berhasil dihapus dari workspace.",
      });
      render(<TeacherClassesView classes={mockClasses} isTenantOwner />);

      fireEvent.click(screen.getByRole("button", { name: "Hapus Kelas" }));
      expect(screen.getByRole("dialog", { name: "Hapus Kelas?" })).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Konfirmasi Hapus" }));
        await vi.waitFor(() => {
          expect(deleteRombelAction).toHaveBeenCalledWith("R_01");
        });
      });
    });

    it("filters classes when search input changes", () => {
      render(<TeacherClassesView classes={mockClasses} />);

      const searchInput = screen.getByPlaceholderText(/cari rombel/i);
      fireEvent.change(searchInput, { target: { value: "Matematika" } });

      expect(screen.getByText(/tidak ada kelas yang ditemukan/i)).toBeInTheDocument();
    });

    it("renders in admin mode with teacher filter and teacher name on card", () => {
      const mockTeachers = [
        {
          id: "G_01",
          nama_lengkap: "Budi Santoso",
          gelar_depan: null,
          gelar_belakang: "M.Kom.",
          total_kelas: 1,
        },
      ];
      render(
        <TeacherClassesView classes={mockClasses} isAdmin={true} teachersList={mockTeachers} />
      );

      expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
      expect(screen.getByText(/Semua Guru/i)).toBeInTheDocument();
      expect(screen.getByText("Budi Santoso, M.Kom.")).toBeInTheDocument();
    });

    it("calculates distinct students across multiple subjects in the same rombel (15 instead of 60)", () => {
      const multiSubjectSameRombel: TeacherClassCardDTO[] = [
        {
          ...mockClasses[0],
          id: "P1",
          mata_pelajaran_nama: "Mapel 1",
          rombel_id: "R_XII",
          total_siswa: 15,
        },
        {
          ...mockClasses[0],
          id: "P2",
          mata_pelajaran_nama: "Mapel 2",
          rombel_id: "R_XII",
          total_siswa: 15,
        },
        {
          ...mockClasses[0],
          id: "P3",
          mata_pelajaran_nama: "Mapel 3",
          rombel_id: "R_XII",
          total_siswa: 15,
        },
        {
          ...mockClasses[0],
          id: "P4",
          mata_pelajaran_nama: "Mapel 4",
          rombel_id: "R_XII",
          total_siswa: 15,
        },
      ];
      render(<TeacherClassesView classes={multiSubjectSameRombel} />);

      // Kartu Siswa Binaan harus menunjukkan 15 (bukan 60)
      const siswaBinaanLabel = screen.getByText("Siswa Binaan");
      const metricContainer = siswaBinaanLabel.closest(".group");
      expect(metricContainer).toHaveTextContent("15");
      expect(metricContainer).not.toHaveTextContent("60");
    });

    it("renders productive actions for subscribed schools and hides manual/AI buttons", () => {
      render(<TeacherClassesView classes={mockClasses} isSubscribed={true} />);

      expect(screen.getByText("Kelola BAB & Materi")).toBeInTheDocument();
      expect(screen.getByText("+ Buat Penugasan")).toBeInTheDocument();
      expect(screen.getByText("+ Buka Sesi KBM")).toBeInTheDocument();
      expect(screen.queryByText("+ Tambah Kelas Manual")).not.toBeInTheDocument();
      expect(screen.queryByText("+ Foto Absen AI")).not.toBeInTheDocument();
    });

    it("renders schedule alert banner and quick set button when class has no schedule", () => {
      const unscheduledClass: TeacherClassCardDTO[] = [
        {
          ...mockClasses[0],
          id: "P_NO_SCHED",
          jadwal_ringkas: null,
          jumlah_jam_minggu: 0,
        },
      ];
      render(<TeacherClassesView classes={unscheduledClass} />);

      expect(screen.getByText(/1 Rombel Belum Memiliki Jam Mengajar/i)).toBeInTheDocument();
      expect(screen.getByText("Jam Belum Diatur")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /\+ Atur Jam/i }).length).toBeGreaterThan(0);
    });
  });

  describe("ClassWorkspaceView (/kelas-saya/[id])", () => {
    it("renders workspace header with subject, rombel and teacher information", () => {
      render(<ClassWorkspaceView workspace={mockWorkspace} canManage={true} />);

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pemrograman Web");
      expect(screen.getByText("Budi Santoso, M.Kom.")).toBeInTheDocument();
      expect(screen.getByText(/4\s*JP/)).toBeInTheDocument();
      expect(screen.getByText("36 Siswa")).toBeInTheDocument();
    });

    it("switches to Lingkup Materi & TP tab and renders BAB tree", () => {
      render(<ClassWorkspaceView workspace={mockWorkspace} canManage={true} />);

      const babTabBtn = screen.getByRole("button", { name: /lingkup materi & tp/i });
      fireEvent.click(babTabBtn);

      expect(screen.getByText("Pengantar HTML dan CSS")).toBeInTheDocument();
      expect(
        screen.getByText(/memahami struktur anatomi elemen html5 semantik/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /tambah bab/i })).toBeInTheDocument();
    });

    it("switches to Materi tab and renders published materials", () => {
      render(<ClassWorkspaceView workspace={mockWorkspace} canManage={true} />);

      const materiTabBtn = screen.getByTestId("tab-MATERI");
      fireEvent.click(materiTabBtn);

      expect(screen.getByText("Modul Praktikum HTML5")).toBeInTheDocument();
      expect(screen.getByText("DOKUMEN")).toBeInTheDocument();
    });

    it("switches to Jurnal KBM tab and renders class journal entries", () => {
      render(<ClassWorkspaceView workspace={mockWorkspace} canManage={true} />);

      const jurnalTabBtn = screen.getByTestId("tab-JURNAL");
      fireEvent.click(jurnalTabBtn);

      expect(screen.getByText("Pertemuan 1")).toBeInTheDocument();
      expect(screen.getByText("Pengenalan Struktur HTML5")).toBeInTheDocument();
      expect(screen.getByText("TERLAKSANA")).toBeInTheDocument();
    });

    it("switches to Penilaian tab and renders ClassAssessmentTabView (M13)", () => {
      render(<ClassWorkspaceView workspace={mockWorkspace} canManage={true} />);

      const penilaianTabBtn = screen.getByTestId("tab-PENILAIAN");
      fireEvent.click(penilaianTabBtn);

      expect(screen.getByText("Total Asesmen")).toBeInTheDocument();
      expect(screen.getByText("Daftar Asesmen")).toBeInTheDocument();
    });

    it("switches to CBT tab and renders CBT workspace view", () => {
      render(<ClassWorkspaceView workspace={mockWorkspace} canManage={true} />);

      const cbtTabBtn = screen.getByTestId("tab-CBT");
      fireEvent.click(cbtTabBtn);

      expect(screen.getByText("Ujian Berbasis Komputer (CBT)")).toBeInTheDocument();
    });
  });
});
