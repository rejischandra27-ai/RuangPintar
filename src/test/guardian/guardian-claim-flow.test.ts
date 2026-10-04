import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { GuardianService } from "@/modules/guardian/application/guardian-service";
import {
  StudentNotFoundError,
  StudentVerificationMismatchError,
  DuplicateGuardianClaimError,
  CrossTenantClaimError,
  UnauthorizedGuardianActionError,
} from "@/modules/guardian/domain/guardian-errors";
import { AuthenticatedUser } from "@/shared/infrastructure/auth/auth-service";
import { ulid } from "ulidx";

describe("Stage 16 — Guardian Claim & Student Linkage Flow", () => {
  let guardianService: GuardianService;

  let sekolahAId: string;
  let sekolahBId: string;
  let tahunAjaranId: string;
  let tingkatId: string;
  let rombelAId: string;

  let student1Id: string;
  let student1Nis: string;
  let student1Name: string;

  let student2Id: string;
  let student2Name: string;

  let studentBId: string;
  let studentBNis: string;

  let guardianUser: AuthenticatedUser;
  let guardianUserId: string;

  beforeEach(async () => {
    guardianService = new GuardianService();

    // 1. Setup Sekolah A
    sekolahAId = ulid();
    await prisma.sekolah.create({
      data: {
        id: sekolahAId,
        nama: `SMK Otomindo ${sekolahAId.slice(0, 6)}`,
        npsn: String(Math.floor(10000000 + Math.random() * 89999999)),
        jenjang: "SMK",
        zona_waktu: "Asia/Jakarta",
        status_aktif: true,
      },
    });

    // 2. Setup Sekolah B (Cross-Tenant)
    sekolahBId = ulid();
    await prisma.sekolah.create({
      data: {
        id: sekolahBId,
        nama: `SMK B ${sekolahBId.slice(0, 6)}`,
        npsn: String(Math.floor(10000000 + Math.random() * 89999999)),
        jenjang: "SMK",
        zona_waktu: "Asia/Jakarta",
        status_aktif: true,
      },
    });

    // 3. Tahun Ajaran & Tingkat Kelas di Sekolah A
    tahunAjaranId = ulid();
    await prisma.tahunAjaran.create({
      data: {
        id: tahunAjaranId,
        sekolah_id: sekolahAId,
        nama: "2026/2027",
        tanggal_mulai: new Date("2026-07-01"),
        tanggal_selesai: new Date("2027-06-30"),
        status: "AKTIF",
      },
    });

    tingkatId = ulid();
    await prisma.tingkatKelas.create({
      data: {
        id: tingkatId,
        sekolah_id: sekolahAId,
        nama: "Kelas 10",
        kode: "10",
        urutan: 10,
      },
    });

    // 4. Rombel di Sekolah A
    rombelAId = ulid();
    await prisma.rombel.create({
      data: {
        id: rombelAId,
        sekolah_id: sekolahAId,
        tahun_ajaran_id: tahunAjaranId,
        tingkat_id: tingkatId,
        nama: "X TO 3",
        kapasitas: 36,
        status: "AKTIF",
      },
    });

    // 5. Siswa 1 di Sekolah A (Memiliki NIS)
    student1Id = ulid();
    student1Nis = `NIS-${ulid().slice(0, 6)}`;
    student1Name = "Ahmad Fatoni";
    await prisma.siswa.create({
      data: {
        id: student1Id,
        sekolah_id: sekolahAId,
        nis: student1Nis,
        nama_lengkap: student1Name,
        jenis_kelamin: "L",
        status_akademik: "AKTIF",
      },
    });

    const keikut1Id = ulid();
    await prisma.keikutsertaanSiswa.create({
      data: {
        id: keikut1Id,
        sekolah_id: sekolahAId,
        siswa_id: student1Id,
        tahun_ajaran_id: tahunAjaranId,
        status: "AKTIF",
      },
    });

    await prisma.penempatanRombel.create({
      data: {
        id: ulid(),
        sekolah_id: sekolahAId,
        keikutsertaan_id: keikut1Id,
        rombel_id: rombelAId,
        status: "AKTIF",
      },
    });

    // 6. Siswa 2 di Sekolah A (Untuk pengujian pencarian via Nama + Rombel)
    student2Id = ulid();
    student2Name = "Nadia Fatoni";
    const student2Nis = `NIS2-${ulid().slice(0, 6)}`;
    await prisma.siswa.create({
      data: {
        id: student2Id,
        sekolah_id: sekolahAId,
        nis: student2Nis,
        nama_lengkap: student2Name,
        jenis_kelamin: "P",
        status_akademik: "AKTIF",
      },
    });

    const keikut2Id = ulid();
    await prisma.keikutsertaanSiswa.create({
      data: {
        id: keikut2Id,
        sekolah_id: sekolahAId,
        siswa_id: student2Id,
        tahun_ajaran_id: tahunAjaranId,
        status: "AKTIF",
      },
    });

    await prisma.penempatanRombel.create({
      data: {
        id: ulid(),
        sekolah_id: sekolahAId,
        keikutsertaan_id: keikut2Id,
        rombel_id: rombelAId,
        status: "AKTIF",
      },
    });

    // 7. Siswa di Sekolah B (Cross-Tenant)
    studentBId = ulid();
    studentBNis = `NISB-${ulid().slice(0, 6)}`;
    await prisma.siswa.create({
      data: {
        id: studentBId,
        sekolah_id: sekolahBId,
        nis: studentBNis,
        nama_lengkap: "Siswa Sekolah Lain",
        jenis_kelamin: "L",
        status_akademik: "AKTIF",
      },
    });

    // 8. Akun Wali Murid di Sekolah A
    guardianUserId = ulid();
    await prisma.pengguna.create({
      data: {
        id: guardianUserId,
        sekolah_id: sekolahAId,
        username: `wali-${ulid().toLowerCase()}`,
        email: `wali-${ulid().toLowerCase()}@example.com`,
        password_hash: "hash_test_123",
        nama_lengkap: "Hendra Fatoni",
        peran_dasar: "GUARDIAN",
        status_akun: "AKTIF",
      },
    });

    guardianUser = {
      id: guardianUserId,
      sekolah_id: sekolahAId,
      username: "hendra_fatoni",
      nama_lengkap: "Hendra Fatoni",
      email: "hendra@example.com",
      peran_dasar: "GUARDIAN",
      status_akun: "AKTIF",
      harus_ganti_password: false,
    };
  });

  it("1. Registrasi Akun Wali Murid Mandiri berhasil membuat Pengguna, WaliMurid, Keanggotaan, dan Log Audit", async () => {
    const rawUsername = `wali_${ulid().slice(0, 8).toLowerCase()}`;
    const result = await guardianService.registerGuardian({
      nama_lengkap: "Siti Rahmawati",
      username: rawUsername,
      email: `${rawUsername}@gmail.com`,
      password: "Password@123",
      sekolah_id: sekolahAId,
    });

    expect(result.user).toBeDefined();
    expect(result.user.peran_dasar).toBe("GUARDIAN");
    expect(result.guardian).toBeDefined();
    expect(result.guardian.nama_lengkap).toBe("Siti Rahmawati");
    expect(result.rawSessionToken).toBeDefined();

    // Verifikasi KeanggotaanSekolah
    const membership = await prisma.keanggotaanSekolah.findUnique({
      where: {
        pengguna_id_sekolah_id: {
          pengguna_id: result.user.id,
          sekolah_id: sekolahAId,
        },
      },
    });
    expect(membership).not.toBeNull();
    expect(membership?.status_keanggotaan).toBe("ACTIVE");
    expect(membership?.peran_dasar_di_tenant).toBe("GUARDIAN");

    // Verifikasi Log Audit
    const audit = await prisma.logAudit.findFirst({
      where: {
        sekolah_id: sekolahAId,
        aksi: "GUARDIAN_ACCOUNT_REGISTERED",
        id_sumber: result.guardian.id,
      },
    });
    expect(audit).not.toBeNull();
  });

  it("2. Klaim Siswa Berhasil via NIS + Nama Lengkap (Fitur 01 & 02: Dual Verification)", async () => {
    // Step 1: Pratinjau (Preview)
    const preview = await guardianService.previewStudentClaim(guardianUser, {
      nis: student1Nis,
      nama_lengkap: "Ahmad Fatoni",
    });

    expect(preview.siswa_id).toBe(student1Id);
    expect(preview.nama_lengkap).toBe(student1Name);
    expect(preview.nis).toBe(student1Nis);
    expect(preview.rombel_nama).toBe("X TO 3");
    expect(preview.sekolah_id).toBe(sekolahAId);

    // Invariant Check (Fitur 03): Zero Sensitive Data Leakage on preview
    expect((preview as any).nilai).toBeUndefined();
    expect((preview as any).presensi).toBeUndefined();

    // Step 2: Konfirmasi Klaim
    const claimRes = await guardianService.confirmStudentClaim(guardianUser, {
      siswa_id: student1Id,
      jenis_hubungan: "AYAH",
      apakah_wali_utama: true,
      catatan: "Tinggal bersama orang tua",
    });

    expect(claimRes.siswa_id).toBe(student1Id);
    expect(claimRes.jenis_hubungan).toBe("AYAH");
    expect(claimRes.status_verifikasi).toBe("TERVERIFIKASI");
    expect(claimRes.apakah_wali_utama).toBe(true);

    // Verifikasi relasi di database
    const relasi = await prisma.hubunganWaliSiswa.findUnique({
      where: {
        wali_id_siswa_id: {
          wali_id: claimRes.wali_id,
          siswa_id: student1Id,
        },
      },
    });
    expect(relasi).not.toBeNull();
    expect(relasi?.status_verifikasi).toBe("TERVERIFIKASI");

    // Verifikasi Log Audit (Fitur 07)
    const auditLink = await prisma.logAudit.findFirst({
      where: {
        sekolah_id: sekolahAId,
        aksi: "GUARDIAN_LINKED_TO_STUDENT",
        id_sumber: claimRes.hubungan_id,
      },
    });
    expect(auditLink).not.toBeNull();
  });

  it("3. Klaim Siswa Berhasil via Nama Lengkap + Rombel untuk siswa yang belum ber-NIS", async () => {
    // Pratinjau Siswa 2 (tanpa NIS)
    const preview = await guardianService.previewStudentClaim(guardianUser, {
      nama_lengkap: "Nadia Fatoni",
      rombel_nama: "X TO 3",
    });

    expect(preview.siswa_id).toBe(student2Id);
    expect(preview.nama_lengkap).toBe(student2Name);
    expect(preview.rombel_nama).toBe("X TO 3");

    // Konfirmasi Klaim
    const claimRes = await guardianService.confirmStudentClaim(guardianUser, {
      siswa_id: student2Id,
      jenis_hubungan: "AYAH",
      apakah_wali_utama: false,
    });

    expect(claimRes.status_verifikasi).toBe("TERVERIFIKASI");
  });

  it("4. Klaim Gagal jika Nama Siswa Tidak Cocok dengan NIS (StudentVerificationMismatchError)", async () => {
    await expect(
      guardianService.previewStudentClaim(guardianUser, {
        nis: student1Nis,
        nama_lengkap: "Budi Santoso Salah Nama",
      })
    ).rejects.toThrow(StudentVerificationMismatchError);

    // Verifikasi log audit penolakan
    const auditReject = await prisma.logAudit.findFirst({
      where: {
        sekolah_id: sekolahAId,
        aksi: "GUARDIAN_CLAIM_REJECTED",
      },
    });
    expect(auditReject).not.toBeNull();
  });

  it("5. Klaim Gagal jika Siswa Tidak Ditemukan (StudentNotFoundError)", async () => {
    await expect(
      guardianService.previewStudentClaim(guardianUser, {
        nis: "9999999_TIDAK_ADA",
        nama_lengkap: "Siswa Hantu",
      })
    ).rejects.toThrow(StudentNotFoundError);
  });

  it("6. Klaim Gagal karena Siswa Berada di Tenant Sekolah Lain (CrossTenantClaimError - Fitur 06)", async () => {
    // Mencoba klaim siswa di Sekolah B menggunakan akun wali Sekolah A
    await expect(
      guardianService.previewStudentClaim(guardianUser, {
        nis: studentBNis,
        nama_lengkap: "Siswa Sekolah Lain",
      })
    ).rejects.toThrow(CrossTenantClaimError);

    // Mencoba konfirmasi langsung ID siswa sekolah B
    await expect(
      guardianService.confirmStudentClaim(guardianUser, {
        siswa_id: studentBId,
        jenis_hubungan: "WALI",
      })
    ).rejects.toThrow(CrossTenantClaimError);
  });

  it("7. Proteksi Klaim Ganda oleh Akun Wali yang Sama (DuplicateGuardianClaimError - Fitur 05)", async () => {
    // Klaim pertama kali
    await guardianService.previewStudentClaim(guardianUser, {
      nis: student1Nis,
      nama_lengkap: "Ahmad Fatoni",
    });
    await guardianService.confirmStudentClaim(guardianUser, {
      siswa_id: student1Id,
      jenis_hubungan: "AYAH",
    });

    // Percobaan klaim kedua kali untuk siswa yang sama oleh wali yang sama
    await expect(
      guardianService.previewStudentClaim(guardianUser, {
        nis: student1Nis,
        nama_lengkap: "Ahmad Fatoni",
      })
    ).rejects.toThrow(DuplicateGuardianClaimError);

    await expect(
      guardianService.confirmStudentClaim(guardianUser, {
        siswa_id: student1Id,
        jenis_hubungan: "AYAH",
      })
    ).rejects.toThrow(DuplicateGuardianClaimError);
  });

  it("8. Multi-Child Support: Satu Wali Mengklaim 2 Anak Berbeda dan Dapat Mengakses Keduanya (Fitur 04)", async () => {
    // Klaim Anak 1
    await guardianService.confirmStudentClaim(guardianUser, {
      siswa_id: student1Id,
      jenis_hubungan: "AYAH",
      apakah_wali_utama: true,
    });

    // Klaim Anak 2
    await guardianService.confirmStudentClaim(guardianUser, {
      siswa_id: student2Id,
      jenis_hubungan: "AYAH",
      apakah_wali_utama: false,
    });

    // Ambil data dashboard untuk Anak 1
    const dashAnak1 = await guardianService.getDashboardData(guardianUser, student1Id);
    expect(dashAnak1.linkedChildren).toHaveLength(2);
    expect(dashAnak1.activeChild.siswa.siswa_id).toBe(student1Id);
    expect(dashAnak1.activeChild.siswa.nama_lengkap).toBe(student1Name);

    // Ambil data dashboard untuk Anak 2 (Child Context Switch)
    const dashAnak2 = await guardianService.getDashboardData(guardianUser, student2Id);
    expect(dashAnak2.linkedChildren).toHaveLength(2);
    expect(dashAnak2.activeChild.siswa.siswa_id).toBe(student2Id);
    expect(dashAnak2.activeChild.siswa.nama_lengkap).toBe(student2Name);
  });

  it("9. Menolak Akses jika Peran Pengguna Bukan GUARDIAN (Invariant Access Control)", async () => {
    const teacherUser: AuthenticatedUser = {
      ...guardianUser,
      id: ulid(),
      peran_dasar: "TEACHER",
    };

    await expect(
      guardianService.previewStudentClaim(teacherUser, {
        nis: student1Nis,
        nama_lengkap: student1Name,
      })
    ).rejects.toThrow(UnauthorizedGuardianActionError);

    await expect(
      guardianService.confirmStudentClaim(teacherUser, {
        siswa_id: student1Id,
        jenis_hubungan: "AYAH",
      })
    ).rejects.toThrow(UnauthorizedGuardianActionError);
  });
});
