import { describe, it, expect } from "vitest";
import { formatNamaDenganGelar } from "@/shared/utils/name-formatter";

describe("formatNamaDenganGelar", () => {
  it("does not duplicate gelar_belakang if already in nama_lengkap", () => {
    expect(formatNamaDenganGelar("Eri Chandra A, S.Kom", null, "S.Kom")).toBe(
      "Eri Chandra A, S.Kom"
    );
  });

  it("appends gelar_belakang if not present in nama_lengkap", () => {
    expect(formatNamaDenganGelar("Dewi Safitri", null, "M.Pd.")).toBe("Dewi Safitri M.Pd.");
  });

  it("does not duplicate gelar_depan if already at start of nama_lengkap", () => {
    expect(formatNamaDenganGelar("Dr. Eri Chandra A", "Dr.", null)).toBe("Dr. Eri Chandra A");
  });

  it("prepends gelar_depan and appends gelar_belakang correctly", () => {
    expect(formatNamaDenganGelar("Eri Chandra A", "Dr.", "M.Kom")).toBe("Dr. Eri Chandra A M.Kom");
  });

  it("removes duplicated repeated gelar like S.Kom S.Kom", () => {
    expect(formatNamaDenganGelar("Eri Chandra A, S.Kom S.Kom", null, "S.Kom")).toBe(
      "Eri Chandra A, S.Kom"
    );
  });

  it("handles null/undefined gracefully", () => {
    expect(formatNamaDenganGelar("Budi Santoso", null, null)).toBe("Budi Santoso");
    expect(formatNamaDenganGelar("", null, null)).toBe("");
  });
});
