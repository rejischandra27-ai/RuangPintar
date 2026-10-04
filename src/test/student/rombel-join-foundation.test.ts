import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { rombelJoinService } from "@/modules/student/application/rombel-join-service";
import {
  JoinCodeNotFoundError,
  JoinCodeInactiveError,
  JoinCodeExpiredError,
  CrossTenantJoinError,
  DuplicateJoinError,
  RombelCapacityFullError,
  StudentProfileNotFoundError,
} from "@/modules/student/domain/rombel-join-types";
import { ulid } from "ulidx";

describe("Stage 15 — Self-Service Tenant Onboarding & Rombel Join Codes", () => {
  let sekolahAId: string;
  let sekolahBId: string;
  let yearId: string;
  let gradeId: string;
  let rombelId: string;
  let userStudentId: string;
  let studentId: string;

  beforeEach(async () => {
    // 1. Create Sekolah A
    sekolahAId = ulid();
    await prisma.sekolah.create({
      data: {
        id: sekolahAId,
        nama: `SMK Otomindo ${sekolahAId.slice(0, 6)}`,
        npsn: String(Math.floor(10000000 + Math.random() * 89999999)),
        jenjang: "SMK",
        zona_waktu: "Asia/Jakarta",
      },
    });

    // 2. Create Sekolah B (for cross-tenant validation)
    sekolahBId = ulid();
    await prisma.sekolah.create({
      data: {
        id: sekolahBId,
        nama: `SMK Nusantara ${sekolahBId.slice(0, 6)}`,
        npsn: String(Math.floor(10000000 + Math.random() * 89999999)),
        jenjang: "SMK",
        zona_waktu: "Asia/Jakarta",
      },
    });

    // 3. Create Tahun Ajaran
    yearId = ulid();
    await prisma.tahunAjaran.create({
      data: {
        id: yearId,
        sekolah_id: sekolahAId,
        nama: "2026/2027",
        tanggal_mulai: new Date("2026-07-01"),
        tanggal_selesai: new Date("2027-06-30"),
        status: "AKTIF",
      },
    });

    // 4. Create Tingkat Kelas
    gradeId = ulid();
    await prisma.tingkatKelas.create({
      data: {
        id: gradeId,
        sekolah_id: sekolahAId,
        nama: "Kelas 10",
        kode: "10",
        urutan: 10,
      },
    });

    // 5. Create Rombel with capacity 2
    rombelId = ulid();
    await prisma.rombel.create({
      data: {
        id: rombelId,
        sekolah_id: sekolahAId,
        tahun_ajaran_id: yearId,
        tingkat_id: gradeId,
        nama: "X TJKT 1",
        kapasitas: 2,
        status: "AKTIF",
      },
    });

    // 6. Create Student User & Siswa Profile in Sekolah A
    userStudentId = ulid();
    studentId = ulid();

    await prisma.pengguna.create({
      data: {
        id: userStudentId,
        sekolah_id: sekolahAId,
        username: `std-${ulid().toLowerCase()}`,
        password_hash: "hash_test",
        nama_lengkap: "Budi Pratama",
        peran_dasar: "STUDENT",
        status_akun: "ACTIVE",
      },
    });

    await prisma.siswa.create({
      data: {
        id: studentId,
        sekolah_id: sekolahAId,
        pengguna_id: userStudentId,
        nis: `NIS-${ulid()}`,
        nama_lengkap: "Budi Pratama",
        jenis_kelamin: "L",
        status_akademik: "AKTIF",
      },
    });
  });

  it("1. Berhasil menginisialisasi atau mengambil kode gabung rombel", async () => {
    const codeDto = await rombelJoinService.getOrCreateJoinCode(rombelId, sekolahAId);

    expect(codeDto.rombelId).toBe(rombelId);
    expect(codeDto.code).toBeDefined();
    expect(codeDto.code).toContain("XTJKT1-");
    expect(codeDto.isActive).toBe(true);
    expect(codeDto.shareLink).toBe(`/join/${codeDto.code}`);
    expect(codeDto.totalSiswa).toBe(0);
    expect(codeDto.kapasitas).toBe(2);

    // Verify lookup is saved in KonfigurasiSistem
    const lookup = await prisma.konfigurasiSistem.findFirst({
      where: { sekolah_id: sekolahAId, kunci: `join_code.lookup.${codeDto.code}` },
    });
    expect(lookup).not.toBeNull();
  });

  it("2. Berhasil meregenerasi kode gabung rombel dan membatalkan kode lama", async () => {
    const initial = await rombelJoinService.getOrCreateJoinCode(rombelId, sekolahAId);
    const oldCode = initial.code;

    const regenerated = await rombelJoinService.regenerateJoinCode(
      rombelId,
      sekolahAId,
      "ACTOR_TEACHER",
      "TEACHER"
    );

    expect(regenerated.code).not.toBe(oldCode);
    expect(regenerated.isActive).toBe(true);

    // Old code lookup should be deleted
    const oldLookup = await prisma.konfigurasiSistem.findFirst({
      where: { sekolah_id: sekolahAId, kunci: `join_code.lookup.${oldCode}` },
    });
    expect(oldLookup).toBeNull();

    // New code preview should succeed
    const preview = await rombelJoinService.previewJoinCode(regenerated.code, sekolahAId);
    expect(preview.rombelId).toBe(rombelId);
  });

  it("3. Berhasil menonaktifkan dan mengaktifkan kembali kode gabung", async () => {
    const initial = await rombelJoinService.getOrCreateJoinCode(rombelId, sekolahAId);

    // Deactivate
    const toggledOff = await rombelJoinService.toggleJoinCodeActive(
      rombelId,
      sekolahAId,
      false,
      "ACTOR_TEACHER",
      "TEACHER"
    );
    expect(toggledOff.isActive).toBe(false);

    // Preview should throw JoinCodeInactiveError
    await expect(rombelJoinService.previewJoinCode(initial.code, sekolahAId)).rejects.toThrow(
      JoinCodeInactiveError
    );

    // Reactivate
    const toggledOn = await rombelJoinService.toggleJoinCodeActive(
      rombelId,
      sekolahAId,
      true,
      "ACTOR_TEACHER",
      "TEACHER"
    );
    expect(toggledOn.isActive).toBe(true);

    const preview = await rombelJoinService.previewJoinCode(initial.code, sekolahAId);
    expect(preview.isActive).toBe(true);
  });

  it("4. Menolak kode yang tidak terdaftar", async () => {
    await expect(rombelJoinService.previewJoinCode("INVALID-CODE-999", sekolahAId)).rejects.toThrow(
      JoinCodeNotFoundError
    );
  });

  it("5. Menolak kode jika sekolah siswa berbeda (Cross-Tenant Boundary Protection)", async () => {
    const initial = await rombelJoinService.getOrCreateJoinCode(rombelId, sekolahAId);

    // Query preview with sekolahBId
    await expect(rombelJoinService.previewJoinCode(initial.code, sekolahBId)).rejects.toThrow(
      CrossTenantJoinError
    );
  });

  it("6. Menolak kode yang telah kedaluwarsa", async () => {
    const initial = await rombelJoinService.getOrCreateJoinCode(rombelId, sekolahAId);

    // Set expiration in past
    const pastDate = new Date(Date.now() - 100000).toISOString();
    await prisma.konfigurasiSistem.update({
      where: {
        sekolah_id_kunci: {
          sekolah_id: sekolahAId,
          kunci: `join_code.config.${rombelId}`,
        },
      },
      data: {
        nilai: JSON.stringify({
          code: initial.code,
          is_active: true,
          expires_at: pastDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      },
    });

    await expect(rombelJoinService.previewJoinCode(initial.code, sekolahAId)).rejects.toThrow(
      JoinCodeExpiredError
    );
  });

  it("7. Siswa berhasil bergabung mandiri dengan kode gabung (Atomic all-or-nothing)", async () => {
    const initial = await rombelJoinService.getOrCreateJoinCode(rombelId, sekolahAId);

    const joinResult = await rombelJoinService.joinRombelWithCode(initial.code, userStudentId);

    expect(joinResult.success).toBe(true);
    expect(joinResult.siswaId).toBe(studentId);
    expect(joinResult.rombelId).toBe(rombelId);
    expect(joinResult.nomorAbsen).toBe(1);

    // Verify Enrollment (KeikutsertaanSiswa) was created
    const enrollment = await prisma.keikutsertaanSiswa.findFirst({
      where: { siswa_id: studentId, tahun_ajaran_id: yearId },
    });
    expect(enrollment).not.toBeNull();
    expect(enrollment?.status).toBe("AKTIF");

    // Verify Placement (PenempatanRombel) was created
    const placement = await prisma.penempatanRombel.findFirst({
      where: { id: joinResult.penempatanId },
    });
    expect(placement).not.toBeNull();
    expect(placement?.status).toBe("AKTIF");
    expect(placement?.nomor_absen).toBe(1);

    // Verify Audit Event logged
    const auditEvent = await prisma.logAudit.findFirst({
      where: {
        sekolah_id: sekolahAId,
        aksi: "STUDENT_JOINED_ROMBEL_VIA_CODE",
        id_sumber: joinResult.penempatanId,
      },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("8. Menolak jika siswa sudah terdaftar dan aktif di rombel yang sama (Duplicate Join)", async () => {
    const initial = await rombelJoinService.getOrCreateJoinCode(rombelId, sekolahAId);

    // Join first time
    await rombelJoinService.joinRombelWithCode(initial.code, userStudentId);

    // Attempt second join
    await expect(rombelJoinService.joinRombelWithCode(initial.code, userStudentId)).rejects.toThrow(
      DuplicateJoinError
    );
  });

  it("9. Menolak jika kapasitas rombel telah terpenuhi", async () => {
    const initial = await rombelJoinService.getOrCreateJoinCode(rombelId, sekolahAId);

    // Student 1 joins
    await rombelJoinService.joinRombelWithCode(initial.code, userStudentId);

    // Student 2 joins (capacity is 2)
    const user2Id = ulid();
    const student2Id = ulid();
    await prisma.pengguna.create({
      data: {
        id: user2Id,
        sekolah_id: sekolahAId,
        username: `std2-${ulid().toLowerCase()}`,
        password_hash: "hash_test",
        nama_lengkap: "Siswa Kedua",
        peran_dasar: "STUDENT",
        status_akun: "ACTIVE",
      },
    });
    await prisma.siswa.create({
      data: {
        id: student2Id,
        sekolah_id: sekolahAId,
        pengguna_id: user2Id,
        nis: `NIS-${ulid()}`,
        nama_lengkap: "Siswa Kedua",
        jenis_kelamin: "P",
        status_akademik: "AKTIF",
      },
    });
    await rombelJoinService.joinRombelWithCode(initial.code, user2Id);

    // Student 3 attempts to join -> Should throw RombelCapacityFullError
    const user3Id = ulid();
    const student3Id = ulid();
    await prisma.pengguna.create({
      data: {
        id: user3Id,
        sekolah_id: sekolahAId,
        username: `std3-${ulid().toLowerCase()}`,
        password_hash: "hash_test",
        nama_lengkap: "Siswa Ketiga",
        peran_dasar: "STUDENT",
        status_akun: "ACTIVE",
      },
    });
    await prisma.siswa.create({
      data: {
        id: student3Id,
        sekolah_id: sekolahAId,
        pengguna_id: user3Id,
        nis: `NIS-${ulid()}`,
        nama_lengkap: "Siswa Ketiga",
        jenis_kelamin: "L",
        status_akademik: "AKTIF",
      },
    });

    await expect(rombelJoinService.joinRombelWithCode(initial.code, user3Id)).rejects.toThrow(
      RombelCapacityFullError
    );
  });

  it("10. Memindahkan status penempatan lama menjadi PINDAH jika siswa bergabung ke rombel baru pada tahun ajaran yang sama", async () => {
    // Join Rombel 1 first
    const r1Code = (await rombelJoinService.getOrCreateJoinCode(rombelId, sekolahAId)).code;
    const res1 = await rombelJoinService.joinRombelWithCode(r1Code, userStudentId);

    // Create Rombel 2 in same academic year
    const rombel2Id = ulid();
    await prisma.rombel.create({
      data: {
        id: rombel2Id,
        sekolah_id: sekolahAId,
        tahun_ajaran_id: yearId,
        tingkat_id: gradeId,
        nama: "X TJKT 2",
        kapasitas: 36,
        status: "AKTIF",
      },
    });

    const r2Code = (await rombelJoinService.getOrCreateJoinCode(rombel2Id, sekolahAId)).code;

    // Join Rombel 2
    const res2 = await rombelJoinService.joinRombelWithCode(r2Code, userStudentId);
    expect(res2.success).toBe(true);

    // Check old placement in Rombel 1: should be marked PINDAH
    const oldPlacement = await prisma.penempatanRombel.findUnique({
      where: { id: res1.penempatanId },
    });
    expect(oldPlacement?.status).toBe("PINDAH");
    expect(oldPlacement?.tanggal_selesai).not.toBeNull();

    // Check new placement in Rombel 2: should be AKTIF
    const newPlacement = await prisma.penempatanRombel.findUnique({
      where: { id: res2.penempatanId },
    });
    expect(newPlacement?.status).toBe("AKTIF");
    expect(newPlacement?.rombel_id).toBe(rombel2Id);
  });

  it("11. Menolak jika akun pengguna tidak memiliki profil siswa", async () => {
    const initial = await rombelJoinService.getOrCreateJoinCode(rombelId, sekolahAId);

    const nonStudentUserId = ulid();
    await prisma.pengguna.create({
      data: {
        id: nonStudentUserId,
        sekolah_id: sekolahAId,
        username: `tch-${ulid().toLowerCase()}`,
        password_hash: "hash_test",
        nama_lengkap: "Guru Anonim",
        peran_dasar: "TEACHER",
        status_akun: "ACTIVE",
      },
    });

    await expect(
      rombelJoinService.joinRombelWithCode(initial.code, nonStudentUserId)
    ).rejects.toThrow(StudentProfileNotFoundError);
  });
});
