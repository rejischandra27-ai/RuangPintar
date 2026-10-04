import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { academicYearService } from "@/modules/academic/application/academic-year-service";
import { phaseGradeService } from "@/modules/academic/application/phase-grade-service";
import { programService } from "@/modules/academic/application/program-service";
import { rombelService } from "@/modules/academic/application/rombel-service";
import {
  DuplicateRombelError,
  GradeLevelNotFoundError,
  RombelCapacityError,
} from "@/modules/academic/domain/academic-errors";
import { ulid } from "ulidx";

describe("M06 — Rombel Service", () => {
  let sekolahId: string;
  let yearId: string;
  let gradeId: string;
  let programId: string;
  const actorId = "USR_" + ulid();
  const actorRole = "SUPER_ADMIN";

  beforeEach(async () => {
    sekolahId = ulid();
    await prisma.sekolah.create({
      data: {
        id: sekolahId,
        nama: `SMK Negeri ${sekolahId.substring(0, 6)}`,
        npsn: String(Math.floor(10000000 + Math.random() * 89999999)),
        jenjang: "SMK",
        zona_waktu: "Asia/Jakarta",
      },
    });

    const year = await academicYearService.createAcademicYear(
      sekolahId,
      {
        nama: "2026/2027",
        tanggal_mulai: "2026-07-01",
        tanggal_selesai: "2027-06-30",
        status: "AKTIF",
      },
      actorId,
      actorRole
    );
    yearId = year.id;

    const grade = await phaseGradeService.createGradeLevel(
      sekolahId,
      {
        nama: "Kelas 10",
        kode: "10",
        urutan: 10,
      },
      actorId,
      actorRole
    );
    gradeId = grade.id;

    const prog = await programService.createProgram(
      sekolahId,
      {
        kode: "RPL",
        nama: "Rekayasa Perangkat Lunak",
      },
      actorId,
      actorRole
    );
    programId = prog.id;
  });

  it("berhasil membentuk rombel dengan kapasitas dan relasi valid", async () => {
    const rombel = await rombelService.createRombel(
      sekolahId,
      {
        tahun_ajaran_id: yearId,
        tingkat_id: gradeId,
        program_id: programId,
        nama: "X RPL 1",
        kode: "RBL-X-RPL-1",
        kapasitas: 36,
        status: "AKTIF",
      },
      actorId,
      actorRole
    );

    expect(rombel.id).toBeDefined();
    expect(rombel.nama).toBe("X RPL 1");
    expect(rombel.kapasitas).toBe(36);
    expect(rombel.tingkat_id).toBe(gradeId);
    expect(rombel.program_id).toBe(programId);
    expect(rombel.tahun_ajaran_id).toBe(yearId);
  });

  it("gagal membentuk rombel jika kapasitas di luar batas 1..100", async () => {
    await expect(
      rombelService.createRombel(
        sekolahId,
        {
          tahun_ajaran_id: yearId,
          tingkat_id: gradeId,
          nama: "X RPL 1",
          kapasitas: 0,
        },
        actorId,
        actorRole
      )
    ).rejects.toThrow(RombelCapacityError);

    await expect(
      rombelService.createRombel(
        sekolahId,
        {
          tahun_ajaran_id: yearId,
          tingkat_id: gradeId,
          nama: "X RPL 1",
          kapasitas: 150,
        },
        actorId,
        actorRole
      )
    ).rejects.toThrow(RombelCapacityError);
  });

  it("gagal membentuk rombel dengan nama duplikat pada tahun ajaran yang sama", async () => {
    await rombelService.createRombel(
      sekolahId,
      {
        tahun_ajaran_id: yearId,
        tingkat_id: gradeId,
        nama: "X RPL 1",
      },
      actorId,
      actorRole
    );

    await expect(
      rombelService.createRombel(
        sekolahId,
        {
          tahun_ajaran_id: yearId,
          tingkat_id: gradeId,
          nama: "X RPL 1",
        },
        actorId,
        actorRole
      )
    ).rejects.toThrow(DuplicateRombelError);
  });

  it("gagal membentuk rombel jika tingkat_id tidak ditemukan", async () => {
    await expect(
      rombelService.createRombel(
        sekolahId,
        {
          tahun_ajaran_id: yearId,
          tingkat_id: "TINGKAT_TIDAK_ADA",
          nama: "X RPL 1",
        },
        actorId,
        actorRole
      )
    ).rejects.toThrow(GradeLevelNotFoundError);
  });

  it("mengarsipkan rombel dan assignment aktif tanpa menghapus riwayat", async () => {
    const rombel = await rombelService.createRombel(
      sekolahId,
      {
        tahun_ajaran_id: yearId,
        tingkat_id: gradeId,
        nama: "X RPL Archive Test",
      },
      actorId,
      actorRole
    );
    const teacherId = ulid();
    const subjectId = ulid();
    const assignmentId = ulid();

    await prisma.guru.create({
      data: {
        id: teacherId,
        sekolah_id: sekolahId,
        nama_lengkap: "Guru Arsip",
        jenis_kelamin: "L",
      },
    });
    await prisma.mataPelajaran.create({
      data: {
        id: subjectId,
        sekolah_id: sekolahId,
        kode: `ARSIP${subjectId.slice(0, 5)}`,
        nama: "Mapel Arsip",
      },
    });
    await prisma.penugasanMengajar.create({
      data: {
        id: assignmentId,
        sekolah_id: sekolahId,
        guru_id: teacherId,
        mata_pelajaran_id: subjectId,
        tahun_ajaran_id: yearId,
        rombel_id: rombel.id,
        status: "AKTIF",
      },
    });

    await rombelService.deleteRombel(rombel.id, sekolahId, actorId, actorRole);

    const archivedRombel = await prisma.rombel.findUnique({ where: { id: rombel.id } });
    const archivedAssignment = await prisma.penugasanMengajar.findUnique({
      where: { id: assignmentId },
    });
    expect(archivedRombel?.status).toBe("DIARSIPKAN");
    expect(archivedAssignment?.status).toBe("ARSIP");
  });
});
