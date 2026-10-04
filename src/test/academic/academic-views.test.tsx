import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AcademicYearsView } from "@/modules/academic/presentation/academic-years-view";
import { GradeLevelsView } from "@/modules/academic/presentation/grade-levels-view";
import { ProgramsView } from "@/modules/academic/presentation/programs-view";
import { RombelsView } from "@/modules/academic/presentation/rombels-view";
import { AcademicManagementTabs } from "@/modules/academic/presentation/academic-management-tabs";
import {
  AcademicProgramDTO,
  AcademicYearDTO,
  GradeLevelDTO,
  PhaseDTO,
  RombelDTO,
  SemesterDTO,
} from "@/modules/academic/domain/academic-types";

// Mock server actions
vi.mock("@/app/actions/academic-actions", () => ({
  createAcademicYearAction: vi.fn(),
  updateAcademicYearAction: vi.fn(),
  activateAcademicYearAction: vi.fn(),
  closeAcademicYearAction: vi.fn(),
  deleteAcademicYearAction: vi.fn(),
  createSemesterAction: vi.fn(),
  updateSemesterAction: vi.fn(),
  activateSemesterAction: vi.fn(),
  deleteSemesterAction: vi.fn(),
  createPhaseAction: vi.fn(),
  updatePhaseAction: vi.fn(),
  deletePhaseAction: vi.fn(),
  createGradeLevelAction: vi.fn(),
  updateGradeLevelAction: vi.fn(),
  deleteGradeLevelAction: vi.fn(),
  createProgramAction: vi.fn(),
  updateProgramAction: vi.fn(),
  deleteProgramAction: vi.fn(),
  createRombelAction: vi.fn(),
  updateRombelAction: vi.fn(),
  deleteRombelAction: vi.fn(),
}));

const mockYears: AcademicYearDTO[] = [
  {
    id: "YEAR_1",
    sekolah_id: "SCH_1",
    nama: "2026/2027",
    kode: "TA-2026-2027",
    tanggal_mulai: new Date("2026-07-01"),
    tanggal_selesai: new Date("2027-06-30"),
    status: "AKTIF",
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockSemesters: SemesterDTO[] = [
  {
    id: "SEM_1",
    sekolah_id: "SCH_1",
    tahun_ajaran_id: "YEAR_1",
    tahun_ajaran_nama: "2026/2027",
    nama: "Semester Ganjil",
    kode: "GANJIL",
    urutan: 1,
    tanggal_mulai: new Date("2026-07-01"),
    tanggal_selesai: new Date("2026-12-31"),
    status: "AKTIF",
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockPhases: PhaseDTO[] = [
  {
    id: "PHASE_E",
    sekolah_id: "SCH_1",
    nama: "Fase E",
    kode: "FASE_E",
    deskripsi: "Kelas 10",
    urutan: 5,
    tingkat_count: 1,
    rombel_count: 2,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockGradeLevels: GradeLevelDTO[] = [
  {
    id: "GRADE_10",
    sekolah_id: "SCH_1",
    fase_id: "PHASE_E",
    fase_nama: "Fase E",
    kode: "10",
    nama: "Kelas 10",
    urutan: 10,
    rombel_count: 2,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockPrograms: AcademicProgramDTO[] = [
  {
    id: "PROG_RPL",
    sekolah_id: "SCH_1",
    kode: "RPL",
    nama: "Rekayasa Perangkat Lunak",
    jenjang: "SMK",
    status_aktif: true,
    deskripsi: "Komputer dan Informatika",
    rombel_count: 2,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockRombels: RombelDTO[] = [
  {
    id: "ROMBEL_1",
    sekolah_id: "SCH_1",
    tahun_ajaran_id: "YEAR_1",
    tahun_ajaran_nama: "2026/2027",
    semester_id: "SEM_1",
    semester_nama: "Semester Ganjil",
    tingkat_id: "GRADE_10",
    tingkat_nama: "Kelas 10",
    tingkat_kode: "10",
    fase_id: "PHASE_E",
    fase_nama: "Fase E",
    program_id: "PROG_RPL",
    program_nama: "Rekayasa Perangkat Lunak",
    program_kode: "RPL",
    nama: "X RPL 1",
    kode: "RBL-X-RPL-1",
    kapasitas: 36,
    status: "AKTIF",
    catatan: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

describe("Academic Views — UI Components", () => {
  it("renders AcademicYearsView with active year and semester details", () => {
    render(
      <AcademicYearsView
        initialYears={mockYears}
        initialSemesters={mockSemesters}
        canManage={true}
      />
    );

    expect(screen.getByText("Konteks Operasional Aktif")).toBeInTheDocument();
    expect(screen.getByText("Daftar Tahun Ajaran & Semester")).toBeInTheDocument();
    expect(screen.getByText("Semester Ganjil")).toBeInTheDocument();
  });

  it("renders GradeLevelsView and allows switching subtabs between Tingkat and Fase", () => {
    render(
      <GradeLevelsView
        initialGradeLevels={mockGradeLevels}
        initialPhases={mockPhases}
        canManage={true}
      />
    );

    expect(screen.getByText("Tingkat Kelas & Fase Pendidikan")).toBeInTheDocument();
    expect(screen.getByText("Tingkat Kelas (1)")).toBeInTheDocument();
    expect(screen.getByText("Fase Kurikulum (1)")).toBeInTheDocument();

    // Switch to Fase Kurikulum
    fireEvent.click(screen.getByText("Fase Kurikulum (1)"));
    expect(screen.getAllByText("Fase E")[0]).toBeInTheDocument();
  });

  it("renders ProgramsView with program listings and badges", () => {
    render(<ProgramsView initialPrograms={mockPrograms} canManage={true} />);

    expect(screen.getByText("Program Keahlian & Jurusan")).toBeInTheDocument();
    expect(screen.getAllByText("Rekayasa Perangkat Lunak")[0]).toBeInTheDocument();
    expect(screen.getAllByText("RPL")[0]).toBeInTheDocument();
  });

  it("renders RombelsView with rombel card/table and capacity info", () => {
    render(
      <RombelsView
        initialRombels={mockRombels}
        academicYears={mockYears}
        semesters={mockSemesters}
        gradeLevels={mockGradeLevels}
        phases={mockPhases}
        programs={mockPrograms}
        canManage={true}
      />
    );

    expect(screen.getByText("Rombongan Belajar (Rombel / Kelas)")).toBeInTheDocument();
    expect(screen.getAllByText("X RPL 1")[0]).toBeInTheDocument();
    expect(screen.getByText("36 Siswa")).toBeInTheDocument();
  });

  it("hides non-atomic rombel creation for owners while retaining class management", () => {
    render(
      <RombelsView
        initialRombels={mockRombels}
        academicYears={mockYears}
        semesters={mockSemesters}
        gradeLevels={mockGradeLevels}
        phases={mockPhases}
        programs={mockPrograms}
        canManage={true}
        isTenantOwner={true}
      />
    );

    expect(screen.queryByRole("button", { name: "Bentuk Rombel" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Hapus" }).length).toBeGreaterThan(0);
  });

  it("renders AcademicManagementTabs and allows switching main tabs", () => {
    render(
      <AcademicManagementTabs
        initialData={{
          academicYears: mockYears,
          semesters: mockSemesters,
          phases: mockPhases,
          gradeLevels: mockGradeLevels,
          programs: mockPrograms,
          rombels: mockRombels,
          activeYear: mockYears[0],
          activeSemester: mockSemesters[0],
        }}
        canManage={true}
      />
    );

    expect(screen.getByText("Tahun Ajaran & Semester")).toBeInTheDocument();
    expect(screen.getByText("Tingkat & Fase")).toBeInTheDocument();
    expect(screen.getByText("Program / Jurusan")).toBeInTheDocument();
    expect(screen.getByText("Rombongan Belajar")).toBeInTheDocument();

    // Click Rombongan Belajar tab
    fireEvent.click(screen.getByText("Rombongan Belajar"));
    expect(screen.getByText("Rombongan Belajar (Rombel / Kelas)")).toBeInTheDocument();
  });
});
