import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  createSubject: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/shared/infrastructure/auth/auth-guard", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/shared/infrastructure/authorization/authz-guard", () => ({
  checkPermission: vi.fn(),
  requirePermission: mocks.requirePermission,
}));
vi.mock("@/modules/teacher/application/subject-service", () => ({
  SubjectService: { createSubject: mocks.createSubject },
}));

import { createTeacherOnboardingSubjectAction } from "@/app/actions/teacher-onboarding-actions";

describe("Teacher onboarding subject action authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({
      id: "01JACTOR000000000000000001",
      sekolah_id: "01JSCHOOL0000000000000001",
      peran_dasar: "TEACHER",
      is_owner_tenant: true,
    });
    mocks.createSubject.mockResolvedValue({ id: "01JSUBJECT0000000000000001", nama: "Prakarya" });
  });

  it("creates only in the authenticated tenant after requiring structure management", async () => {
    const result = await createTeacherOnboardingSubjectAction({ kode: "PRK", nama: "Prakarya" });

    expect(result).toEqual({
      success: true,
      data: { id: "01JSUBJECT0000000000000001", nama: "Prakarya" },
    });
    expect(mocks.requirePermission).toHaveBeenCalledWith("academic.structure.manage");
    expect(mocks.createSubject).toHaveBeenCalledWith(
      {
        sekolah_id: "01JSCHOOL0000000000000001",
        kode: "PRK",
        nama: "Prakarya",
        kelompok: "UMUM",
        status_aktif: true,
      },
      "01JACTOR000000000000000001",
      "TEACHER"
    );
  });

  it("denies a non-owner teacher before subject creation", async () => {
    mocks.requirePermission.mockResolvedValueOnce({
      id: "01JACTOR000000000000000001",
      sekolah_id: "01JSCHOOL0000000000000001",
      peran_dasar: "TEACHER",
      is_owner_tenant: false,
    });

    const result = await createTeacherOnboardingSubjectAction({ kode: "PRK", nama: "Prakarya" });

    expect(result).toEqual({
      success: false,
      error: "Aksi ini hanya tersedia untuk owner tenant.",
    });
    expect(mocks.createSubject).not.toHaveBeenCalled();
  });
});
