import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseStudentWorkbook } from "@/modules/student/application/student-import-service";
import { readSheet } from "read-excel-file/node";

vi.mock("read-excel-file/node", () => ({ readSheet: vi.fn() }));

describe("Student Excel import parser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses the approved NIS, name, and gender columns", async () => {
    vi.mocked(readSheet).mockResolvedValue([
      ["NIS", "Nama Lengkap", "Jenis Kelamin"],
      ["S-1001", "Alya Putri", "P"],
      ["S-1002", "Bima Pratama", "Laki-laki"],
    ] as never);

    await expect(parseStudentWorkbook(Buffer.from("workbook"))).resolves.toEqual([
      { nis: "S-1001", nama_lengkap: "Alya Putri", jenis_kelamin: "P" },
      { nis: "S-1002", nama_lengkap: "Bima Pratama", jenis_kelamin: "L" },
    ]);
  });

  it("rejects duplicate NIS and missing required columns", async () => {
    vi.mocked(readSheet).mockResolvedValueOnce([
      ["NIS", "Nama", "JK"],
      ["S-1", "Siswa Satu", "L"],
      ["S-1", "Siswa Dua", "P"],
    ] as never);
    await expect(parseStudentWorkbook(Buffer.from("duplicate"))).rejects.toThrow(
      "duplikat di dalam file"
    );

    vi.mocked(readSheet).mockResolvedValueOnce([
      ["NIS", "Nama"],
      ["S-1", "Siswa Satu"],
    ] as never);
    await expect(parseStudentWorkbook(Buffer.from("missing column"))).rejects.toThrow(
      "Kolom wajib"
    );
  });
});
