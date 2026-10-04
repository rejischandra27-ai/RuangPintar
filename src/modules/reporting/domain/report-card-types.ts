/**
 * Ruang Pintar — Module M18: Digital Report Card Engine (Kurikulum Merdeka Foundation)
 * Domain Types, Enums & Interfaces
 *
 * Invariant Canonical:
 * 1. Student ≠ Enrollment ≠ Rombel Placement
 * 2. Teacher ≠ Subject ≠ Teaching Assignment
 * 3. Assessment ≠ Grade ≠ Grade Publication
 * 4. Missing Grade ≠ Zero Grade
 */

export type ReportCardStatus = "DRAFT" | "VALIDATED" | "PUBLISHED";

export interface ExtracurricularItem {
  id: string;
  nama: string;
  predikat: "Sangat Baik" | "Baik" | "Cukup" | "Kurang";
  deskripsi: string;
}

export interface SubjectAchievementItem {
  mataPelajaranId: string;
  mataPelajaranNama: string;
  kodeMapel?: string | null;
  guruNama: string;
  guruNip?: string | null;
  kktp: number;
  rerataFormatif: number | null;
  rerataSumatif: number | null;
  nilaiAkhir: number | null;
  predikat: "A" | "B" | "C" | "D" | "-";
  isTuntas: boolean;
  hasMissingGrade: boolean;
  deskripsiCapaianTertinggi: string;
  deskripsiPerluPeningkatan: string;
  totalAsesmen: number;
}

export interface AttendanceSummary {
  sakit: number;
  izin: number;
  tanpaKeterangan: number;
}

export interface StudentProfileData {
  siswaId: string;
  namaLengkap: string;
  nis: string | null;
  nisn: string | null;
  jenisKelamin: string;
  rombelId: string;
  rombelNama: string;
  tingkatNama: string;
  waliKelasNama: string;
  waliKelasNip: string | null;
  nomorAbsen: number | null;
  tahunAjaranId: string;
  tahunAjaranNama: string;
  semesterId: string;
  semesterNama: string;
}

export interface SchoolProfileData {
  sekolahId: string;
  sekolahNama: string;
  npsn: string;
  alamat: string | null;
  kabupatenKota: string | null;
  provinsi: string | null;
  logoUrl: string | null;
  kepalaSekolahNama: string;
  kepalaSekolahNip: string | null;
}

export interface ReportCardData {
  id?: string;
  status: ReportCardStatus;
  sekolah: SchoolProfileData;
  siswa: StudentProfileData;
  mataPelajaranList: SubjectAchievementItem[];
  rerataKeseluruhan: number | null;
  totalMapel: number;
  totalMapelTuntas: number;
  persentaseKetuntasan: number;
  hasIncompleteGrades: boolean;
  presensi: AttendanceSummary;
  ekstrakurikuler: ExtracurricularItem[];
  catatanWaliKelas: string;
  saranTindakLanjut: string;
  tanggalValidasi: string | null;
  divalidasiOleh: string | null;
  tanggalPublikasi: string | null;
  dipublikasikanOleh: string | null;
  tanggalCetak: string;
}

export interface RombelReportSummaryItem {
  siswaId: string;
  penempatanRombelId: string;
  namaLengkap: string;
  nis: string | null;
  nisn: string | null;
  nomorAbsen: number | null;
  statusRapor: ReportCardStatus;
  raporId: string | null;
  rerataNilai: number | null;
  mapelLengkapCount: number;
  totalMapelCount: number;
  isComplete: boolean;
  presensi: AttendanceSummary;
  catatanWaliKelas: string | null;
  saranTindakLanjut: string | null;
  ekstrakurikulerCount: number;
  updatedAt: string | null;
}

export interface RombelReportOverviewDTO {
  rombelId: string;
  rombelNama: string;
  tingkatNama: string;
  tahunAjaranNama: string;
  semesterNama: string;
  waliKelasNama: string;
  waliKelasNip: string | null;
  totalSiswa: number;
  totalDraft: number;
  totalValidated: number;
  totalPublished: number;
  totalLengkapNilai: number;
  siswaList: RombelReportSummaryItem[];
}

export interface ValidationIssue {
  kode: "MISSING_GRADE" | "DUPLICATE_SUBJECT" | "INVALID_SEMESTER" | "EMPTY_NOTES";
  pesan: string;
  mataPelajaranId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  canValidate: boolean;
  canPublish: boolean;
  issues: ValidationIssue[];
}
