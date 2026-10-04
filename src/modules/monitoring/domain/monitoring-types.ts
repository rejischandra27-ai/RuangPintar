/**
 * Ruang Pintar — M18 Student Monitoring Domain Types
 *
 * Mendefinisikan tipe data, derived read model indikator, dan kontrak domain
 * untuk pemantauan siswa dan dashboard wali kelas (Homeroom).
 */

export type KategoriCatatan =
  "AKADEMIK" | "KEHADIRAN" | "PERILAKU" | "KESEHATAN" | "SOSIAL" | "LAINNYA";

export type TingkatUrgensi = "RENDAH" | "SEDANG" | "TINGGI" | "KRITIS";

export type StatusCatatan = "AKTIF" | "SELESAI" | "DIARSIPKAN";

export type StatusTindakLanjut = "DIRENCANAKAN" | "PROSES" | "SELESAI" | "DIBATALKAN";

export type StatusPerhatian = "NORMAL" | "PERHATIAN" | "KRITIS" | "BERPRESTASI";

/**
 * Derived Read Model: Indikator Kehadiran Siswa
 */
export interface StudentAttendanceIndicator {
  total_sesi: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  dispensasi: number;
  terlambat: number;
  persentase_kehadiran: number;
}

/**
 * Derived Read Model: Indikator Ketuntasan Tugas Siswa
 */
export interface StudentAssignmentIndicator {
  total_tugas: number;
  dikumpulkan: number;
  tepat_waktu: number;
  terlambat: number;
  belum_mengumpulkan: number;
  persentase_tuntas: number;
}

/**
 * Derived Read Model: Indikator Asesmen & Nilai Siswa
 */
export interface StudentGradeIndicator {
  total_asesmen: number;
  dinilai: number;
  rerata_nilai: number | null;
  jumlah_tuntas_kktp: number;
  jumlah_belum_tuntas: number;
  persentase_kktp: number;
}

/**
 * Ringkasan Holistik Siswa per Rombel untuk Wali Kelas
 */
export interface StudentMonitoringSummary {
  siswa_id: string;
  nama_lengkap: string;
  nis: string | null;
  nisn: string | null;
  jenis_kelamin: string;
  foto_url: string | null;
  status_akademik: string;
  status_perhatian: StatusPerhatian;
  rekomendasi_perhatian: string[];
  presensi: StudentAttendanceIndicator;
  tugas: StudentAssignmentIndicator;
  nilai: StudentGradeIndicator;
  jumlah_catatan_aktif: number;
  catatan_terbaru?: CatatanMonitoringItem | null;
}

/**
 * Entitas Persisten: Tindak Lanjut Monitoring Siswa
 */
export interface TindakLanjutItem {
  id: string;
  catatan_id: string;
  penanggung_jawab_id: string | null;
  penanggung_jawab_nama?: string | null;
  tindakan: string;
  target_tanggal: Date | null;
  status: StatusTindakLanjut;
  hasil: string | null;
  tanggal_penyelesaian: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Entitas Persisten: Catatan Pembinaan Siswa
 */
export interface CatatanMonitoringItem {
  id: string;
  sekolah_id: string;
  rombel_id: string;
  siswa_id: string;
  siswa_nama: string;
  siswa_nis: string | null;
  penulis_id: string;
  penulis_nama: string;
  penulis_peran: string;
  judul: string;
  isi: string;
  kategori: KategoriCatatan;
  tingkat_urgensi: TingkatUrgensi;
  status: StatusCatatan;
  created_at: Date;
  updated_at: Date;
  tindak_lanjut: TindakLanjutItem[];
}

/**
 * Data Agregat Dashboard / Overview Rombel Perwalian
 */
export interface HomeroomOverviewDTO {
  rombel_id: string;
  rombel_nama: string;
  rombel_kapasitas: number;
  wali_kelas_id: string;
  wali_kelas_nama: string;
  tahun_ajaran_id: string;
  tahun_ajaran_nama: string;
  semester_id?: string | null;
  semester_nama?: string | null;
  total_siswa: number;
  rerata_kehadiran_rombel: number;
  jumlah_kritis: number;
  jumlah_perhatian: number;
  jumlah_normal: number;
  jumlah_berprestasi: number;
  daftar_perhatian_cepat: StudentMonitoringSummary[];
  siswa_list: StudentMonitoringSummary[];
  catatan_list: CatatanMonitoringItem[];
}

/**
 * Rincian Mendalam Monitoring 1 Siswa
 */
export interface StudentMonitoringDetailDTO {
  siswa: {
    id: string;
    nis: string | null;
    nisn: string | null;
    nama_lengkap: string;
    jenis_kelamin: string;
    foto_url: string | null;
    status_akademik: string;
    nama_wali: string | null;
    telepon_wali: string | null;
  };
  rombel: {
    id: string;
    nama: string;
  };
  status_perhatian: StatusPerhatian;
  rekomendasi_perhatian: string[];
  presensi: StudentAttendanceIndicator;
  presensi_breakdown: Array<{
    sesi_id: string;
    tanggal: Date;
    mata_pelajaran: string;
    guru_nama: string;
    status: string;
    catatan: string | null;
  }>;
  tugas: StudentAssignmentIndicator;
  tugas_breakdown: Array<{
    tugas_id: string;
    judul: string;
    mata_pelajaran: string;
    batas_waktu: Date | null;
    status_pengumpulan: "DIKUMPULKAN" | "TERLAMBAT" | "BELUM";
    dikumpulkan_pada: Date | null;
    nilai: number | null;
  }>;
  nilai: StudentGradeIndicator;
  nilai_breakdown: Array<{
    asesmen_id: string;
    judul: string;
    mata_pelajaran: string;
    kategori: string;
    kktp: number;
    nilai_angka: number | null;
    apakah_tuntas: boolean;
    catatan: string | null;
  }>;
  catatan_list: CatatanMonitoringItem[];
}

export interface CreateMonitoringNoteInput {
  sekolah_id: string;
  rombel_id: string;
  siswa_id: string;
  penulis_id: string;
  judul: string;
  isi: string;
  kategori?: KategoriCatatan;
  tingkat_urgensi?: TingkatUrgensi;
  tindak_lanjut_awal?: {
    tindakan: string;
    target_tanggal?: Date | null;
    penanggung_jawab_id?: string | null;
  };
}

export interface UpdateMonitoringNoteInput {
  judul?: string;
  isi?: string;
  kategori?: KategoriCatatan;
  tingkat_urgensi?: TingkatUrgensi;
  status?: StatusCatatan;
}

export interface CreateFollowUpInput {
  catatan_id: string;
  tindakan: string;
  target_tanggal?: Date | null;
  penanggung_jawab_id?: string | null;
}

export interface UpdateFollowUpStatusInput {
  id: string;
  status: StatusTindakLanjut;
  hasil?: string | null;
  tanggal_penyelesaian?: Date | null;
}
