/**
 * Ruang Pintar — M07 Student Academic Lifecycle: Domain Types & DTOs
 */

export type StatusAkademikSiswa = "AKTIF" | "NONAKTIF" | "LULUS" | "PINDAH" | "KELUAR" | "DROPOUT";

export type StatusKeikutsertaan =
  "AKTIF" | "LULUS" | "NAIK_KELAS" | "TINGGAL_KELAS" | "PINDAH" | "NONAKTIF";

export type StatusPenempatan = "AKTIF" | "PINDAH" | "SELESAI" | "DIBATALKAN";

export type JenisKelamin = "L" | "P";

export interface StudentIdentityDTO {
  id: string;
  sekolah_id: string;
  pengguna_id: string | null;
  nis: string | null;
  nisn: string | null;
  nama_lengkap: string;
  jenis_kelamin: JenisKelamin;
  tempat_lahir: string | null;
  tanggal_lahir: Date | null;
  agama: string | null;
  nik: string | null;
  alamat: string | null;
  nama_wali: string | null;
  telepon_wali: string | null;
  email_wali: string | null;
  status_akademik: StatusAkademikSiswa;
  foto_url?: string | null;
  tanggal_masuk: Date;
  tanggal_keluar: Date | null;
  catatan: string | null;
  created_at: Date;
  updated_at: Date;

  // Active Context Fields (Derived dynamically from active enrollment/placement)
  active_enrollment_id?: string | null;
  active_tahun_ajaran_id?: string | null;
  active_tahun_ajaran_nama?: string | null;
  active_tingkat_id?: string | null;
  active_tingkat_nama?: string | null;
  active_rombel_id?: string | null;
  active_rombel_nama?: string | null;
  active_nomor_absen?: number | null;
}

export interface StudentEnrollmentDTO {
  id: string;
  sekolah_id: string;
  siswa_id: string;
  siswa_nama?: string;
  siswa_nis?: string | null;
  siswa_nisn?: string | null;
  siswa_jenis_kelamin?: JenisKelamin;
  tahun_ajaran_id: string;
  tahun_ajaran_nama?: string;
  tingkat_id: string | null;
  tingkat_nama?: string | null;
  status: StatusKeikutsertaan;
  tanggal_mulai: Date;
  tanggal_selesai: Date | null;
  catatan: string | null;
  created_at: Date;
  updated_at: Date;

  // Derived placement in this enrollment
  active_placement_id?: string | null;
  active_rombel_id?: string | null;
  active_rombel_nama?: string | null;
  active_nomor_absen?: number | null;
}

export interface RombelPlacementDTO {
  id: string;
  sekolah_id: string;
  keikutsertaan_id: string;
  siswa_id?: string;
  siswa_nama?: string;
  siswa_nis?: string | null;
  siswa_jenis_kelamin?: JenisKelamin;
  tahun_ajaran_id?: string;
  tahun_ajaran_nama?: string;
  rombel_id: string;
  rombel_nama?: string;
  rombel_kapasitas?: number;
  tingkat_nama?: string;
  program_nama?: string | null;
  tanggal_mulai: Date;
  tanggal_selesai: Date | null;
  status: StatusPenempatan;
  nomor_absen: number | null;
  catatan: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface StudentAcademicHistoryDTO {
  siswa: StudentIdentityDTO;
  enrollments: Array<
    StudentEnrollmentDTO & {
      placements: RombelPlacementDTO[];
    }
  >;
}

// Input Types
export interface CreateStudentIdentityInput {
  nis?: string | null;
  nisn?: string | null;
  nama_lengkap: string;
  jenis_kelamin: JenisKelamin;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | Date | null;
  agama?: string | null;
  nik?: string | null;
  alamat?: string | null;
  nama_wali?: string | null;
  telepon_wali?: string | null;
  email_wali?: string | null;
  status_akademik?: StatusAkademikSiswa;
  foto_url?: string | null;
  tanggal_masuk?: string | Date;
  catatan?: string | null;
  // Optional initial enrollment & placement on create
  initial_tahun_ajaran_id?: string;
  initial_tingkat_id?: string;
  initial_rombel_id?: string;
}

export interface UpdateStudentIdentityInput {
  nis?: string | null;
  nisn?: string | null;
  nama_lengkap?: string;
  jenis_kelamin?: JenisKelamin;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | Date | null;
  agama?: string | null;
  nik?: string | null;
  alamat?: string | null;
  nama_wali?: string | null;
  telepon_wali?: string | null;
  email_wali?: string | null;
  status_akademik?: StatusAkademikSiswa;
  foto_url?: string | null;
  tanggal_keluar?: string | Date | null;
  catatan?: string | null;
}

export interface CreateStudentEnrollmentInput {
  siswa_id: string;
  tahun_ajaran_id: string;
  tingkat_id?: string | null;
  status?: StatusKeikutsertaan;
  tanggal_mulai?: string | Date;
  catatan?: string | null;
  initial_rombel_id?: string | null;
}

export interface UpdateStudentEnrollmentStatusInput {
  status: StatusKeikutsertaan;
  tanggal_selesai?: string | Date | null;
  catatan?: string | null;
}

export interface CreateRombelPlacementInput {
  keikutsertaan_id: string;
  rombel_id: string;
  nomor_absen?: number | null;
  tanggal_mulai?: string | Date;
  catatan?: string | null;
}

export interface MoveRombelPlacementInput {
  keikutsertaan_id: string;
  target_rombel_id: string;
  nomor_absen?: number | null;
  alasan_pindah?: string;
}

export interface BulkPlacementInput {
  keikutsertaan_ids: string[];
  target_rombel_id: string;
}

export interface PromoteStudentInput {
  siswa_id: string;
  source_enrollment_id: string;
  target_tahun_ajaran_id: string;
  target_tingkat_id: string;
  target_rombel_id?: string | null;
  status_enrollment_lama?: StatusKeikutsertaan; // NAIK_KELAS | TINGGAL_KELAS
  catatan?: string | null;
}

export interface GraduateStudentInput {
  siswa_id: string;
  source_enrollment_id: string;
  tanggal_lulus?: string | Date;
  catatan?: string | null;
}

export interface TransferOutStudentInput {
  siswa_id: string;
  source_enrollment_id: string;
  tanggal_keluar?: string | Date;
  alasan_keluar?: string;
  sekolah_tujuan?: string;
}
