/**
 * Ruang Pintar — Self-Service Tenant Onboarding & Rombel Join Codes Domain Types
 */

export interface RombelJoinCodeDTO {
  rombelId: string;
  rombelNama: string;
  sekolahId: string;
  code: string;
  isActive: boolean;
  expiresAt: string | null;
  shareLink: string;
  totalSiswa: number;
  kapasitas: number;
  updatedAt: string;
}

export interface RombelJoinPreviewDTO {
  code: string;
  rombelId: string;
  rombelNama: string;
  sekolahId: string;
  namaSekolah: string;
  tingkat: string;
  tahunAjaran: string;
  programKeahlian: string | null;
  waliKelas: string | null;
  totalSiswa: number;
  kapasitas: number;
  sisaKuota: number;
  isActive: boolean;
}

export interface JoinRombelResultDTO {
  success: boolean;
  penempatanId: string;
  siswaId: string;
  siswaNama: string;
  rombelId: string;
  rombelNama: string;
  namaSekolah: string;
  nomorAbsen: number;
  message: string;
}

export interface RombelJoinConfigPayload {
  code: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// =========================================================================
// DOMAIN ERROR CLASSES
// =========================================================================

export class JoinCodeNotFoundError extends Error {
  constructor(code: string) {
    super(`Kode gabung rombel '${code}' tidak ditemukan atau tidak terdaftar.`);
    this.name = "JoinCodeNotFoundError";
  }
}

export class JoinCodeInactiveError extends Error {
  constructor(code: string) {
    super(`Kode gabung rombel '${code}' saat ini sedang dinonaktifkan oleh guru / wali kelas.`);
    this.name = "JoinCodeInactiveError";
  }
}

export class JoinCodeExpiredError extends Error {
  constructor(code: string) {
    super(`Kode gabung rombel '${code}' telah kedaluwarsa.`);
    this.name = "JoinCodeExpiredError";
  }
}

export class CrossTenantJoinError extends Error {
  constructor(
    message = "Siswa tidak terdaftar pada institusi sekolah yang sama dengan rombel ini."
  ) {
    super(message);
    this.name = "CrossTenantJoinError";
  }
}

export class DuplicateJoinError extends Error {
  constructor(message = "Siswa sudah terdaftar dan aktif di rombel ini.") {
    super(message);
    this.name = "DuplicateJoinError";
  }
}

export class RombelCapacityFullError extends Error {
  constructor(kapasitas: number) {
    super(`Rombel telah mencapai batas kapasitas maksimal (${kapasitas} siswa).`);
    this.name = "RombelCapacityFullError";
  }
}

export class StudentProfileNotFoundError extends Error {
  constructor() {
    super("Profil siswa tidak ditemukan untuk akun pengguna ini.");
    this.name = "StudentProfileNotFoundError";
  }
}
