import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeTeacherOnboardingAction,
  createFirstTeacherClassAction,
  createTeacherOnboardingSubjectAction,
  deferTeacherOnboardingStepAction,
  getTeacherOnboardingSnapshotAction,
  saveTeacherOnboardingStepAction,
  saveTeacherRolePreferencesAction,
  saveTeacherSubjectPreferencesAction,
  updateTeacherSchoolNameAction,
  requestJoinSchoolAction,
  searchRegisteredSchoolsAction,
} from "@/app/actions/teacher-onboarding-actions";
import { createTeacherInitialScheduleAction } from "@/app/actions/smart-onboarding-actions";
import { TeacherOnboardingWizard } from "@/shared/components/dashboard/cockpit/teacher-onboarding-wizard";
import { TeacherOnboardingSnapshot } from "@/modules/teacher/application/teacher-onboarding-service";

const mockRefresh = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: mockPush }),
}));

vi.mock("@/app/actions/teacher-onboarding-actions", () => ({
  completeTeacherOnboardingAction: vi.fn(),
  createFirstTeacherClassAction: vi.fn(),
  createTeacherOnboardingSubjectAction: vi.fn(),
  deferTeacherOnboardingStepAction: vi.fn(),
  getTeacherOnboardingSnapshotAction: vi.fn(),
  saveTeacherOnboardingStepAction: vi.fn(),
  saveTeacherRolePreferencesAction: vi.fn(),
  saveTeacherSubjectPreferencesAction: vi.fn(),
  updateTeacherSchoolNameAction: vi.fn(),
  requestJoinSchoolAction: vi.fn(),
  searchRegisteredSchoolsAction: vi.fn(),
}));

vi.mock("@/app/actions/smart-onboarding-actions", () => ({
  createTeacherInitialScheduleAction: vi.fn(),
}));

const snapshot: TeacherOnboardingSnapshot = {
  steps: [
    { id: "roles", label: "Pilih Peran", status: "pending" },
    { id: "subjects", label: "Pilih Mata Pelajaran", status: "pending" },
    { id: "class", label: "Buat Kelas Pertama", status: "pending" },
    { id: "students", label: "Tambah Siswa", status: "pending" },
    { id: "schedule", label: "Atur Jadwal", status: "pending" },
  ],
  progress: 0,
  onboardingEligible: true,
  onboardingCompleted: false,
  wizardStep: 0,
  preferences: { guruMapelAktif: false, waliKelasAktif: false },
  selectedSubjectIds: [],
  canManageSubjects: true,
  subjectChoices: [
    { id: "mapel-1", nama: "Matematika" },
    { id: "mapel-2", nama: "Bahasa Indonesia" },
  ],
  gradeChoices: ["X", "XI", "XII"],
  canCreateClass: true,
  managedRombel: [],
  scheduleAssignments: [],
  hasActiveHomeroomAssignment: false,
} as const;

describe("Teacher onboarding modal wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTeacherOnboardingSnapshotAction).mockResolvedValue({
      success: true,
      data: snapshot,
    });
    vi.mocked(completeTeacherOnboardingAction).mockResolvedValue({ success: true });
    vi.mocked(saveTeacherRolePreferencesAction).mockResolvedValue({ success: true });
    vi.mocked(saveTeacherSubjectPreferencesAction).mockResolvedValue({ success: true });
    vi.mocked(saveTeacherOnboardingStepAction).mockResolvedValue({ success: true });
    vi.mocked(createFirstTeacherClassAction).mockResolvedValue({
      success: true,
      data: { id: "rombel-1", name: "X TO 1" },
    });
    vi.mocked(createTeacherOnboardingSubjectAction).mockResolvedValue({
      success: true,
      data: { id: "mapel-new", nama: "Prakarya" },
    });
    vi.mocked(deferTeacherOnboardingStepAction).mockResolvedValue({ success: true });
    vi.mocked(createTeacherInitialScheduleAction).mockResolvedValue({ success: true });
    vi.mocked(updateTeacherSchoolNameAction).mockResolvedValue({
      success: true,
      data: { sekolahId: "sekolah-1", nama: "SMA Bintang Kejora" },
    });
    vi.mocked(requestJoinSchoolAction).mockResolvedValue({
      success: true,
      data: { redirectUrl: "/onboarding/menunggu-persetujuan" },
    });
    vi.mocked(searchRegisteredSchoolsAction).mockResolvedValue({
      success: true,
      data: [
        {
          id: "sch-sub",
          nama: "SMA Negeri 2 Bogor",
          jenjang: "SMA",
          lokasi: "Kota Bogor",
          npsn: "20202020",
          isSubscribed: true,
        },
      ],
    });
  });

  it("opens for an eligible incomplete account without a permanent dashboard panel", () => {
    render(<TeacherOnboardingWizard initialSnapshot={snapshot} />);

    expect(screen.getByRole("dialog", { name: /peran mengajar/i })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progres onboarding guru" })).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
    expect(screen.getByRole("switch", { name: "Guru Mata Pelajaran" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
    expect(screen.getByRole("switch", { name: "Wali Kelas" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("does not render for ineligible or completed accounts", () => {
    const { rerender } = render(
      <TeacherOnboardingWizard initialSnapshot={{ ...snapshot, onboardingEligible: false }} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(
      <TeacherOnboardingWizard initialSnapshot={{ ...snapshot, onboardingCompleted: true }} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes temporarily without completing onboarding", async () => {
    render(<TeacherOnboardingWizard initialSnapshot={snapshot} />);
    fireEvent.click(screen.getByRole("button", { name: "Tutup onboarding sementara" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(completeTeacherOnboardingAction).not.toHaveBeenCalled();
  });

  it("resumes at the server-provided wizard cursor", () => {
    render(<TeacherOnboardingWizard initialSnapshot={{ ...snapshot, wizardStep: 3 }} />);
    expect(screen.getByRole("dialog", { name: /tambah siswa pertama/i })).toBeInTheDocument();
  });

  it("persists both independent role preferences", async () => {
    render(<TeacherOnboardingWizard initialSnapshot={snapshot} />);

    fireEvent.click(screen.getByRole("switch", { name: "Wali Kelas" }));
    fireEvent.click(screen.getByRole("button", { name: /simpan dan lanjutkan/i }));

    await waitFor(() => {
      expect(saveTeacherRolePreferencesAction).toHaveBeenCalledWith({
        guruMapelAktif: false,
        waliKelasAktif: true,
      });
    });
    expect(saveTeacherOnboardingStepAction).not.toHaveBeenCalledWith(3);
  });

  it("persists subject multi-select IDs without creating teaching assignments", async () => {
    render(<TeacherOnboardingWizard initialSnapshot={{ ...snapshot, wizardStep: 1 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Matematika" }));
    fireEvent.click(screen.getByRole("button", { name: "Bahasa Indonesia" }));
    fireEvent.click(screen.getByRole("button", { name: /simpan dan lanjutkan/i }));

    await waitFor(() => {
      expect(saveTeacherSubjectPreferencesAction).toHaveBeenCalledWith({
        subjectIds: ["mapel-1", "mapel-2"],
      });
    });
    expect(createTeacherInitialScheduleAction).not.toHaveBeenCalled();
  });

  it("requires one active subject when choices are available", async () => {
    render(<TeacherOnboardingWizard initialSnapshot={{ ...snapshot, wizardStep: 1 }} />);
    fireEvent.click(screen.getByRole("button", { name: /simpan dan lanjutkan/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Pilih setidaknya satu mata pelajaran."
    );
    expect(saveTeacherSubjectPreferencesAction).not.toHaveBeenCalled();
  });

  it("lets the tenant owner create a subject from the empty state and refreshes choices", async () => {
    vi.mocked(getTeacherOnboardingSnapshotAction).mockResolvedValueOnce({
      success: true,
      data: {
        ...snapshot,
        wizardStep: 1,
        subjectChoices: [{ id: "mapel-new", nama: "Prakarya" }],
      },
    });

    render(
      <TeacherOnboardingWizard
        initialSnapshot={{ ...snapshot, wizardStep: 1, subjectChoices: [] }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Tambah Mata Pelajaran" }));
    fireEvent.change(screen.getByLabelText("Kode"), { target: { value: "PRK" } });
    fireEvent.change(screen.getByLabelText("Nama mata pelajaran"), {
      target: { value: "Prakarya" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Mata Pelajaran" }));

    await waitFor(() => {
      expect(createTeacherOnboardingSubjectAction).toHaveBeenCalledWith({
        kode: "PRK",
        nama: "Prakarya",
      });
      expect(getTeacherOnboardingSnapshotAction).toHaveBeenCalled();
    });
    expect(await screen.findByRole("button", { name: "Prakarya" })).toBeInTheDocument();
  });

  it("lets the tenant owner add a new subject even when choices are already available", async () => {
    vi.mocked(getTeacherOnboardingSnapshotAction).mockResolvedValueOnce({
      success: true,
      data: {
        ...snapshot,
        wizardStep: 1,
        subjectChoices: [...snapshot.subjectChoices, { id: "mapel-3", nama: "Bahasa Inggris" }],
      },
    });

    render(<TeacherOnboardingWizard initialSnapshot={{ ...snapshot, wizardStep: 1 }} />);
    expect(screen.getByRole("button", { name: "Matematika" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tambah Mata Pelajaran" }));
    fireEvent.change(screen.getByLabelText("Nama mata pelajaran"), {
      target: { value: "Bahasa Inggris" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Mata Pelajaran" }));

    await waitFor(() => {
      expect(createTeacherOnboardingSubjectAction).toHaveBeenCalledWith({
        kode: "",
        nama: "Bahasa Inggris",
      });
      expect(getTeacherOnboardingSnapshotAction).toHaveBeenCalled();
    });
    expect(await screen.findByRole("button", { name: "Bahasa Inggris" })).toBeInTheDocument();
  });

  it("does not offer catalog mutation to a teacher without owner permissions", () => {
    render(
      <TeacherOnboardingWizard
        initialSnapshot={{
          ...snapshot,
          wizardStep: 1,
          subjectChoices: [],
          canManageSubjects: false,
        }}
      />
    );

    expect(screen.queryByRole("button", { name: "Tambah Mata Pelajaran" })).toBeNull();
  });

  it("creates the first class from name and grade and advances to add students", async () => {
    render(<TeacherOnboardingWizard initialSnapshot={{ ...snapshot, wizardStep: 2 }} />);

    fireEvent.change(screen.getByPlaceholderText("Contoh: X TO 1"), {
      target: { value: "X TO 1" },
    });
    fireEvent.change(screen.getByLabelText("Tingkat Kelas"), { target: { value: "XII" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan Kelas" }));

    await waitFor(() => {
      expect(createFirstTeacherClassAction).toHaveBeenCalledWith({ name: "X TO 1", grade: "XII" });
    });
    expect(
      await screen.findByRole("dialog", { name: /tambah siswa pertama/i })
    ).toBeInTheDocument();
  });

  it("skips students, defers schedule, and marks onboarding complete server-side", async () => {
    render(<TeacherOnboardingWizard initialSnapshot={{ ...snapshot, wizardStep: 3 }} />);
    fireEvent.click(screen.getByRole("button", { name: /lewati/i }));

    await waitFor(() => {
      expect(deferTeacherOnboardingStepAction).toHaveBeenCalledWith("students");
    });
    fireEvent.click(await screen.findByRole("button", { name: "Nanti saja" }));

    await waitFor(() => {
      expect(deferTeacherOnboardingStepAction).toHaveBeenCalledWith("schedule");
      expect(completeTeacherOnboardingAction).toHaveBeenCalled();
    });
    expect(createTeacherInitialScheduleAction).not.toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("creates a schedule only from an official teaching assignment", async () => {
    render(
      <TeacherOnboardingWizard
        initialSnapshot={{
          ...snapshot,
          wizardStep: 4,
          scheduleAssignments: [
            {
              id: "assignment-1",
              rombelId: "rombel-1",
              rombelNama: "X TO 1",
              mataPelajaranNama: "Matematika",
            },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Atur sekarang" }));
    fireEvent.click(screen.getByRole("button", { name: "Tambah jam mengajar" }));
    fireEvent.change(screen.getAllByLabelText("Hari")[1], { target: { value: "SELASA" } });
    fireEvent.change(screen.getAllByLabelText("Jam mulai")[1], { target: { value: "10:00" } });
    fireEvent.change(screen.getAllByLabelText("Jam selesai")[1], {
      target: { value: "11:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan jadwal" }));

    await waitFor(() => {
      expect(createTeacherInitialScheduleAction).toHaveBeenCalledWith({
        rombelId: "rombel-1",
        penugasanId: "assignment-1",
        sessions: [
          {
            hari: "SENIN",
            jam_mulai: "08:00",
            jam_selesai: "09:30",
            label: "Jam Ke-1",
          },
          {
            hari: "SELASA",
            jam_mulai: "10:00",
            jam_selesai: "11:30",
            label: "Jam Ke-2",
          },
        ],
      });
      expect(completeTeacherOnboardingAction).toHaveBeenCalled();
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("renders school identification step first when needsSchoolSetup is true", () => {
    render(
      <TeacherOnboardingWizard
        initialSnapshot={{ ...snapshot, needsSchoolSetup: true, schoolName: "Guru Mandiri" }}
      />
    );

    expect(screen.getByRole("dialog", { name: /persiapan mengajar/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nama sekolah \/ tempat mengajar:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/\(nama ini akan tampil pada kop absensi dan jurnal kelas\)/i)
    ).toBeInTheDocument();
  });

  it("shows [Ruang Mandiri] badge and 'Simpan dan Lanjutkan' button for custom unregistered school", async () => {
    render(
      <TeacherOnboardingWizard
        initialSnapshot={{ ...snapshot, needsSchoolSetup: true, schoolName: "" }}
      />
    );

    const input = screen.getByLabelText(/nama sekolah \/ tempat mengajar:/i);
    fireEvent.change(input, { target: { value: "SMA Bintang Kejora" } });

    expect(await screen.findByText(/ruang mandiri/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simpan dan lanjutkan/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /simpan dan lanjutkan/i }));

    await waitFor(() => {
      expect(updateTeacherSchoolNameAction).toHaveBeenCalledWith("SMA Bintang Kejora");
    });

    // Successfully transitions into role step ("Peran Mengajar")
    expect(await screen.findByRole("switch", { name: "Guru Mata Pelajaran" })).toBeInTheDocument();
  });

  it("shows [Terdaftar] badge and 'Bergabung' button when selecting registered school", async () => {
    render(
      <TeacherOnboardingWizard
        initialSnapshot={{ ...snapshot, needsSchoolSetup: true, schoolName: "" }}
      />
    );

    const input = screen.getByLabelText(/nama sekolah \/ tempat mengajar:/i);
    fireEvent.change(input, { target: { value: "SMA Negeri 2 Bogor" } });

    // Click school from autocomplete results
    const option = await screen.findByRole("button", { name: /sma negeri 2 bogor/i });
    fireEvent.click(option);

    const registeredBadges = await screen.findAllByText(/terdaftar/i);
    expect(registeredBadges.length).toBeGreaterThan(0);
    const joinButton = screen.getByRole("button", { name: /bergabung/i });
    expect(joinButton).toBeInTheDocument();

    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(requestJoinSchoolAction).toHaveBeenCalledWith("sch-sub");
    });
    expect(mockPush).toHaveBeenCalledWith("/onboarding/menunggu-persetujuan");
  });

  it("does not show 'Hubungi administrator sekolah' and enables class creation when gradeChoices is empty", async () => {
    render(
      <TeacherOnboardingWizard initialSnapshot={{ ...snapshot, wizardStep: 2, gradeChoices: [] }} />
    );

    expect(screen.queryByText(/hubungi administrator sekolah/i)).toBeNull();

    const submitBtn = screen.getByRole("button", { name: /simpan kelas/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Contoh: X TO 1"), {
      target: { value: "X TJKT 1" },
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createFirstTeacherClassAction).toHaveBeenCalledWith({
        name: "X TJKT 1",
        grade: "X",
      });
    });
  });
});
