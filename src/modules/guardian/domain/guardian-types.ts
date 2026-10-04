/**
 * Ruang Pintar — M15 Guardian & Family Domain Types
 * Definisi tipe data dan kontrak domain pengalaman wali murid.
 */

export type RelationshipType = "AYAH" | "IBU" | "WALI" | "LAINNYA";
export type VerificationStatus = "TERVERIFIKASI" | "MENUNGGU" | "DITOLAK";

export interface GuardianProfile {
  id: string;
  sekolah_id: string;
  pengguna_id: string | null;
  nama_lengkap: string;
  jenis_kelamin: string | null;
  no_telepon: string | null;
  email: string | null;
  pekerjaan: string | null;
  penghasilan: string | null;
  alamat: string | null;
}

export interface LinkedChildSummary {
  siswa_id: string;
  nama_lengkap: string;
  nis: string | null;
  nisn: string | null;
  rombel_nama: string;
  tingkat_kelas: string;
  jenis_kelamin: string;
  foto_url: string | null;
  jenis_hubungan: RelationshipType;
  apakah_wali_utama: boolean;
  status_verifikasi: VerificationStatus;
}

export interface ChildTeacherContact {
  guru_id: string;
  nama_lengkap: string;
  email: string | null;
  no_telepon: string | null;
  foto_url: string | null;
}

export interface ChildActiveContext {
  siswa: LinkedChildSummary;
  sekolah_nama: string;
  tahun_ajaran_aktif: string;
  semester_aktif: string;
  wali_kelas: ChildTeacherContact | null;
}

export interface ChildAttendanceRecap {
  total_sesi: number;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  persentase_kehadiran: number; // 0 - 100
  kategori_kehadiran: "Sangat Baik" | "Baik" | "Cukup" | "Perlu Perhatian";
}

export interface ChildAttendanceHistoryItem {
  id: string;
  sesi_kelas_id: string;
  tanggal: string; // ISO date string
  mata_pelajaran: string;
  guru_pengampu: string;
  jam: string; // misal "07:30 - 09:00"
  status: "HADIR" | "SAKIT" | "IZIN" | "ALPA";
  catatan: string | null;
}

export interface ChildAssignmentSummaryItem {
  id: string;
  judul: string;
  mata_pelajaran: string;
  guru_nama: string;
  batas_waktu: string;
  sudah_dikumpulkan: boolean;
  status_pengumpulan: "TEPAT_WAKTU" | "TERLAMBAT" | "BELUM" | "DITERIMA";
  nilai_publik: number | null; // null jika belum dinilai atau draft (FR-SXP-004)
  catatan_guru: string | null;
}

export interface ChildCbtSummaryItem {
  id: string;
  judul: string;
  mata_pelajaran: string;
  jadwal_mulai: string;
  jadwal_selesai: string;
  durasi_menit: number;
  status_ujian: "BELUM_MULAI" | "SEDANG_BERJALAN" | "SELESAI";
  nilai_akhir: number | null; // null jika belum dinilai / belum dipublikasikan
}

export interface ChildPublishedGradeItem {
  id: string;
  judul_asesmen: string;
  jenis_asesmen: string; // FORMATIF | SUMATIF | PAS | PTS | dll
  mata_pelajaran: string;
  guru_nama: string;
  nilai: number | null; // null jika missing grade (Missing Grade != Zero Grade)
  kategori_capaian: string; // misal "Tuntas", "Optimal", dll
  tanggal_publikasi: string;
  catatan: string | null;
}

export interface ChildReportSubjectItem {
  mata_pelajaran_id: string;
  mata_pelajaran_nama: string;
  guru_nama: string;
  kktp: number;
  nilai_akhir: number | null;
  predikat: string;
  capaian_tertinggi: string | null;
  capaian_terendah: string | null;
}

export interface ChildReportCardSummary {
  siswa_id: string;
  nama_siswa: string;
  nis: string | null;
  nisn: string | null;
  rombel_nama: string;
  fase: string;
  semester_nama: string;
  tahun_ajaran: string;
  wali_kelas_nama: string;
  wali_kelas_nip: string | null;
  kepala_sekolah_nama: string;
  kepala_sekolah_nip: string | null;
  mata_pelajaran: ChildReportSubjectItem[];
  rekap_presensi: ChildAttendanceRecap;
  catatan_wali_kelas: string | null;
  status_kenaikan: string | null;
}

export type TipePengajuanWali =
  "IZIN_KETIDAKHADIRAN" | "SAKIT" | "KOREKSI_DATA" | "CATATAN_KESEHATAN" | "LAINNYA";

export interface PengajuanWaliItem {
  id: string;
  siswa_id: string;
  nama_siswa: string;
  tipe: TipePengajuanWali;
  judul: string;
  deskripsi: string;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  lampiran_url: string | null;
  status: "MENUNGGU" | "DISETUJUI" | "DITOLAK";
  catatan_tanggapan: string | null;
  created_at: string;
}

export interface GuardianDashboardData {
  guardian: GuardianProfile;
  linkedChildren: LinkedChildSummary[];
  activeChild: ChildActiveContext;
  attendanceRecap: ChildAttendanceRecap;
  upcomingAssignments: ChildAssignmentSummaryItem[];
  upcomingCbt: ChildCbtSummaryItem[];
  recentPublishedGrades: ChildPublishedGradeItem[];
  recentPengajuan: PengajuanWaliItem[];
}

export interface StudentClaimVerificationInput {
  nis?: string | null;
  nisn?: string | null;
  nama_lengkap: string;
  rombel_id?: string | null;
  rombel_nama?: string | null;
  tanggal_lahir?: string | null;
}

export interface StudentClaimPreviewDTO {
  siswa_id: string;
  nama_lengkap: string;
  nis: string | null;
  nisn: string | null;
  rombel_nama: string;
  tingkat_kelas: string;
  sekolah_id: string;
  sekolah_nama: string;
  foto_url: string | null;
  jenis_kelamin: string;
}

export interface ConfirmStudentClaimInput {
  siswa_id: string;
  jenis_hubungan: RelationshipType;
  apakah_wali_utama?: boolean;
  catatan?: string | null;
}

export interface StudentClaimResultDTO {
  hubungan_id: string;
  wali_id: string;
  siswa_id: string;
  nama_siswa: string;
  jenis_hubungan: RelationshipType;
  status_verifikasi: VerificationStatus;
  apakah_wali_utama: boolean;
  pesan: string;
}

export interface GuardianRegistrationInput {
  nama_lengkap: string;
  username: string;
  email?: string | null;
  no_telepon?: string | null;
  password: string;
  sekolah_id: string;
}
