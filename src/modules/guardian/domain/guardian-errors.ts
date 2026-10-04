/**
 * Ruang Pintar — M15 Guardian & Family Domain Errors
 * Definisi domain error untuk pengalaman orang tua / wali.
 */

export class GuardianNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Profil wali murid tidak ditemukan untuk identitas: ${identifier}`);
    this.name = "GuardianNotFoundError";
  }
}

export class ChildNotLinkedError extends Error {
  constructor(guardianId: string, studentId: string) {
    super(
      `Siswa dengan ID "${studentId}" tidak terhubung dengan wali "${guardianId}" atau akses tidak diizinkan.`
    );
    this.name = "ChildNotLinkedError";
  }
}

export class UnverifiedRelationshipError extends Error {
  constructor(guardianId: string, studentId: string) {
    super(
      `Hubungan antara wali "${guardianId}" dan siswa "${studentId}" belum terverifikasi secara resmi oleh pihak sekolah.`
    );
    this.name = "UnverifiedRelationshipError";
  }
}

export class UnauthorizedGuardianActionError extends Error {
  constructor(action: string) {
    super(
      `Wali murid tidak diizinkan melakukan tindakan ini (${action}). Invariant: Guardian ≠ Student proxy.`
    );
    this.name = "UnauthorizedGuardianActionError";
  }
}

export class PengajuanWaliValidationError extends Error {
  constructor(message: string) {
    super(`Data pengajuan wali tidak valid: ${message}`);
    this.name = "PengajuanWaliValidationError";
  }
}

export class StudentNotFoundError extends Error {
  constructor(queryDetail: string) {
    super(`Siswa tidak ditemukan berdasarkan kriteria pencarian: ${queryDetail}`);
    this.name = "StudentNotFoundError";
  }
}

export class StudentVerificationMismatchError extends Error {
  constructor(
    message: string = "Data verifikasi siswa (nama lengkap atau nomor identitas) tidak cocok."
  ) {
    super(message);
    this.name = "StudentVerificationMismatchError";
  }
}

export class DuplicateGuardianClaimError extends Error {
  constructor(message: string = "Anda sudah memiliki hubungan yang terdaftar dengan siswa ini.") {
    super(message);
    this.name = "DuplicateGuardianClaimError";
  }
}

export class CrossTenantClaimError extends Error {
  constructor(
    message: string = "Akses ditolak. Siswa berada di institusi sekolah yang berbeda dengan akun Anda."
  ) {
    super(message);
    this.name = "CrossTenantClaimError";
  }
}

export class InvalidRelationshipError extends Error {
  constructor(
    message: string = "Jenis hubungan wali murid tidak valid. Pilih Ayah, Ibu, atau Wali."
  ) {
    super(message);
    this.name = "InvalidRelationshipError";
  }
}
