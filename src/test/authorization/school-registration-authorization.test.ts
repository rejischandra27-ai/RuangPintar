import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  registerTeacher: vi.fn(),
  discoverSchools: vi.fn(),
  readPendingRegistration: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/modules/ai-assistant/application/smart-onboarding-service", () => ({
  smartOnboardingService: {
    registerTeacher: mocks.registerTeacher,
    discoverSchools: mocks.discoverSchools,
  },
}));
vi.mock("@/shared/infrastructure/auth/google-oauth-service", () => ({
  GOOGLE_PENDING_REGISTRATION_COOKIE: "ruang_pintar_google_pending",
  createGoogleRegistrationPassword: vi.fn(() => "temporary-password"),
  getGoogleOAuthExpiredCookieOptions: vi.fn(() => ({ maxAge: 0 })),
  readGooglePendingRegistrationCookie: mocks.readPendingRegistration,
}));

import { completeGoogleTeacherRegistrationAction } from "@/app/actions/smart-onboarding-actions";

describe("School registration authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({
      get: () => ({ value: "forged-or-expired-token" }),
    });
    mocks.readPendingRegistration.mockReturnValue(null);
  });

  it("does not create an account or membership from a forged or expired Google cookie", async () => {
    const result = await completeGoogleTeacherRegistrationAction({ sekolah_id: "school-target" });

    expect(result).toEqual({
      success: false,
      error: "Sesi pendaftaran Google tidak valid atau kedaluwarsa.",
    });
    expect(mocks.registerTeacher).not.toHaveBeenCalled();
  });

  it("does not call registration when the school-choice payload is invalid", async () => {
    mocks.readPendingRegistration.mockReturnValue({
      subject: "google-subject",
      email: "guru@example.test",
      nama_lengkap: "Guru OAuth",
    });

    const result = await completeGoogleTeacherRegistrationAction({
      sekolah_id: "school-target",
      is_owner: true,
    });

    expect(result.success).toBe(false);
    expect(mocks.registerTeacher).not.toHaveBeenCalled();
  });
});
