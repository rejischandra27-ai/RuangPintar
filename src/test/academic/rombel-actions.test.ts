import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requirePermission: vi.fn(),
  createRombel: vi.fn(),
}));

vi.mock("@/shared/infrastructure/auth/auth-guard", () => ({
  requireAuth: mocks.requireAuth,
}));
vi.mock("@/shared/infrastructure/authorization/authz-guard", () => ({
  AuthorizationError: class AuthorizationError extends Error {},
  requirePermission: mocks.requirePermission,
}));
vi.mock("@/modules/academic/application/rombel-service", () => ({
  rombelService: { createRombel: mocks.createRombel },
}));

import { createRombelAction } from "@/app/actions/academic-actions";

describe("createRombelAction owner atomic-assignment guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      id: "01JACTOR000000000000000001",
      sekolah_id: "01JSCHOOL0000000000000001",
      peran_dasar: "TEACHER",
      is_owner_tenant: true,
    });
    mocks.requirePermission.mockResolvedValue(undefined);
  });

  it("rejects non-atomic rombel creation for an owner before calling the service", async () => {
    const result = await createRombelAction(new FormData());

    if (result.success) {
      throw new Error("Owner tidak boleh membuat rombel tanpa penugasan mengajar.");
    }
    expect(result.error).toContain("penugasan mengajar dibuat otomatis");
    expect(result.code).toBe("USE_ATOMIC_CLASS_CREATION");
    expect(mocks.requirePermission).toHaveBeenCalledWith("academic.structure.manage", {
      sekolah_id: "01JSCHOOL0000000000000001",
    });
    expect(mocks.createRombel).not.toHaveBeenCalled();
  });
});
