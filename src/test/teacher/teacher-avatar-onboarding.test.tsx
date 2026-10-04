import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveTeacherAvatarAction } from "@/app/actions/teacher-onboarding-actions";
import { AvatarPicker } from "@/app/onboarding/pilih-avatar/avatar-picker";

const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

vi.mock("@/app/actions/teacher-onboarding-actions", () => ({
  saveTeacherAvatarAction: vi.fn(),
}));

describe("Teacher avatar first-use step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveTeacherAvatarAction).mockResolvedValue({ success: true });
  });

  it("persists the selected avatar and goes straight to the dashboard", async () => {
    render(<AvatarPicker initialAvatarId="kapten-kosmik" />);
    fireEvent.click(screen.getByRole("button", { name: /Insinyur Orbit/i }));
    fireEvent.click(screen.getByRole("button", { name: /Simpan Avatar & Lanjutkan/i }));

    await waitFor(() => expect(saveTeacherAvatarAction).toHaveBeenCalledWith("insinyur-orbit"));
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    expect(screen.queryByText("Mulai Aplikasi")).not.toBeInTheDocument();
  });

  it("persists the default avatar when skipped and also enters the dashboard", async () => {
    render(<AvatarPicker initialAvatarId="kapten-kosmik" />);
    fireEvent.click(screen.getByRole("button", { name: /Lewati dengan Avatar Default/i }));

    await waitFor(() => expect(saveTeacherAvatarAction).toHaveBeenCalledWith("kapten-kosmik"));
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });
});
