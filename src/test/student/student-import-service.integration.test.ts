import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import { studentImportService } from "@/modules/student/application/student-import-service";
import { readSheet } from "read-excel-file/node";

vi.mock("read-excel-file/node", () => ({ readSheet: vi.fn() }));

describe("Student Excel import transaction", () => {
  const schoolId = generateUlid();
  const yearId = generateUlid();
  const gradeId = generateUlid();
  const classId = generateUlid();
  const actorId = generateUlid();

  beforeAll(async () => {
    await prisma.sekolah.create({
      data: { id: schoolId, nama: `Import UX02 ${schoolId.slice(-5)}`, jenjang: "SMK" },
    });
    await prisma.tahunAjaran.create({
      data: {
        id: yearId,
        sekolah_id: schoolId,
        nama: `Import TA ${yearId.slice(-5)}`,
        tanggal_mulai: new Date("2026-07-01"),
        tanggal_selesai: new Date("2027-06-30"),
        status: "AKTIF",
      },
    });
    await prisma.tingkatKelas.create({
      data: { id: gradeId, sekolah_id: schoolId, kode: "X", nama: "Kelas X", urutan: 10 },
    });
    await prisma.rombel.create({
      data: {
        id: classId,
        sekolah_id: schoolId,
        tahun_ajaran_id: yearId,
        tingkat_id: gradeId,
        nama: "X Import Test",
        kapasitas: 2,
      },
    });
  });

  afterAll(async () => {
    await prisma.logAudit.deleteMany({ where: { aktor_id: actorId } });
    await prisma.penempatanRombel.deleteMany({ where: { sekolah_id: schoolId } });
    await prisma.keikutsertaanSiswa.deleteMany({ where: { sekolah_id: schoolId } });
    await prisma.siswa.deleteMany({ where: { sekolah_id: schoolId } });
    await prisma.rombel.deleteMany({ where: { sekolah_id: schoolId } });
    await prisma.tingkatKelas.deleteMany({ where: { sekolah_id: schoolId } });
    await prisma.tahunAjaran.deleteMany({ where: { sekolah_id: schoolId } });
    await prisma.sekolah.deleteMany({ where: { id: schoolId } });
  });

  it("creates identity, enrollment, and placement together for each valid row", async () => {
    vi.mocked(readSheet).mockResolvedValue([
      ["NIS", "Nama Lengkap", "Jenis Kelamin"],
      ["UX-I-01", "Siswa Import Satu", "L"],
      ["UX-I-02", "Siswa Import Dua", "P"],
    ] as never);

    const result = await studentImportService.importIntoRombel({
      sekolahId: schoolId,
      rombelId: classId,
      actorId,
      actorRole: "TEACHER",
      workbook: Buffer.from("fake xlsx buffer"),
    });
    const [students, enrollments, placements] = await Promise.all([
      prisma.siswa.count({ where: { sekolah_id: schoolId } }),
      prisma.keikutsertaanSiswa.count({ where: { sekolah_id: schoolId } }),
      prisma.penempatanRombel.count({
        where: { sekolah_id: schoolId, rombel_id: classId, status: "AKTIF" },
      }),
    ]);

    expect(result.importedCount).toBe(2);
    expect(students).toBe(2);
    expect(enrollments).toBe(2);
    expect(placements).toBe(2);
  });

  it("rejects a roster larger than class capacity without creating partial data", async () => {
    vi.mocked(readSheet).mockResolvedValue([
      ["NIS", "Nama", "JK"],
      ["UX-I-03", "Siswa Tambahan Satu", "L"],
    ] as never);

    await expect(
      studentImportService.importIntoRombel({
        sekolahId: schoolId,
        rombelId: classId,
        actorId,
        actorRole: "TEACHER",
        workbook: Buffer.from("fake xlsx buffer"),
      })
    ).rejects.toThrow("Kapasitas");
    expect(await prisma.siswa.count({ where: { sekolah_id: schoolId } })).toBe(2);
  });
});
