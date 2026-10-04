import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeacherAcademicHistoryError } from "@/modules/teacher/domain/teacher-errors";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requirePermission: vi.fn(),
  deleteTeacher: vi.fn(),
  deactivateTeacher: vi.fn(),
  updateTeacher: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/shared/infrastructure/auth/auth-guard", () => ({
  requireAuth: mocks.requireAuth,
}));
vi.mock("@/shared/infrastructure/authorization/authz-guard", () => {
  class AuthorizationError extends Error {
    constructor(message = "Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.") {
      super(message);
      this.name = "AuthorizationError";
    }
  }

  return {
    AuthorizationError,
    requirePermission: mocks.requirePermission,
  };
});
vi.mock("@/modules/teacher/application/teacher-profile-service", () => ({
  TeacherProfileService: {
    deleteTeacher: mocks.deleteTeacher,
    deactivateTeacher: mocks.deactivateTeacher,
    updateTeacher: mocks.updateTeacher,
  },
}));

import {
  deactivateTeacherAction,
  deleteTeacherAction,
  updateTeacherAction,
} from "@/app/actions/teacher-actions";

describe("Teacher actions lifecycle guard (M08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      id: "01JACTOR000000000000000001",
      sekolah_id: "01JSCHOOL0000000000000001",
      peran_dasar: "SCHOOL_STAFF",
    });
    mocks.requirePermission.mockResolvedValue(undefined);
  });

  it("returns a safe domain message when academic history blocks hard-delete", async () => {
    mocks.deleteTeacher.mockRejectedValue(new TeacherAcademicHistoryError("Budi Santoso"));

    const result = await deleteTeacherAction("01JTEACHER000000000000001");

    expect(result.success).toBe(false);
    expect(result.message).toContain("tidak dapat dihapus");
    expect(result.message).toContain("Gunakan Arsip");
    expect(result.message).not.toMatch(/prisma|foreign key|P2003/i);
  });

  it("does not expose an unexpected raw Prisma error", async () => {
    mocks.deleteTeacher.mockRejectedValue(
      new Error("Invalid prisma.guru.delete() invocation: Foreign key constraint P2003")
    );

    const result = await deleteTeacherAction("01JTEACHER000000000000001");

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Data guru belum dapat dihapus. Periksa keterkaitan data akademik atau nonaktifkan guru."
    );
    expect(result.message).not.toMatch(/prisma|foreign key|P2003/i);
  });

  it("keeps server-side authorization before delete mutation", async () => {
    mocks.requirePermission.mockRejectedValueOnce(new Error("FORBIDDEN"));

    const result = await deleteTeacherAction("01JTEACHER000000000000001");

    expect(result.success).toBe(false);
    expect(mocks.requirePermission).toHaveBeenCalledWith("academic.teachers.manage");
    expect(mocks.deleteTeacher).not.toHaveBeenCalled();
  });

  it("deactivates through the same manage permission without deleting history", async () => {
    mocks.deactivateTeacher.mockResolvedValue({
      id: "01JTEACHER000000000000001",
      nama_dengan_gelar: "Budi Santoso, S.Pd.",
      status_aktif: false,
    });

    const result = await deactivateTeacherAction("01JTEACHER000000000000001");

    expect(result.success).toBe(true);
    expect(result.message).toContain("tanpa menghapus histori akademik");
    expect(mocks.requirePermission).toHaveBeenCalledWith("academic.teachers.manage");
    expect(mocks.deactivateTeacher).toHaveBeenCalledWith(
      "01JTEACHER000000000000001",
      "01JSCHOOL0000000000000001",
      "01JACTOR000000000000000001",
      "SCHOOL_STAFF"
    );
  });

  it("updates teacher name without altering active status to false when status_lifecycle is AKTIF", async () => {
    mocks.updateTeacher.mockResolvedValue({
      id: "01JTEACHER000000000000001",
      nama_dengan_gelar: "Eri Chandra A",
      status_aktif: true,
      status_lifecycle: "AKTIF",
    });

    const formData = new FormData();
    formData.append("id", "01JTEACHER000000000000001");
    formData.append("nama_lengkap", "Eri Chandra A");
    formData.append("status_lifecycle", "AKTIF");

    const result = await updateTeacherAction(null, formData);

    expect(result.success).toBe(true);
    expect(mocks.updateTeacher).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "01JTEACHER000000000000001",
        nama_lengkap: "Eri Chandra A",
        status_aktif: true,
        status_lifecycle: "AKTIF",
      }),
      "01JACTOR000000000000000001",
      "SCHOOL_STAFF"
    );
  });

  it("does not override status_aktif when neither status_lifecycle nor status_aktif is passed in formData", async () => {
    mocks.updateTeacher.mockResolvedValue({
      id: "01JTEACHER000000000000001",
      nama_dengan_gelar: "Eri Chandra A",
      status_aktif: true,
      status_lifecycle: "AKTIF",
    });

    const formData = new FormData();
    formData.append("id", "01JTEACHER000000000000001");
    formData.append("nama_lengkap", "Eri Chandra A");

    const result = await updateTeacherAction(null, formData);

    expect(result.success).toBe(true);
    expect(mocks.updateTeacher).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "01JTEACHER000000000000001",
        nama_lengkap: "Eri Chandra A",
        status_aktif: undefined,
        status_lifecycle: undefined,
      }),
      "01JACTOR000000000000000001",
      "SCHOOL_STAFF"
    );
  });
});
