/**
 * Ruang Pintar — M11 Learning Domain Types & Contracts
 *
 * Mendefinisikan kontrak tipe data untuk Lingkup Materi (BAB), Tujuan Pembelajaran (TP),
 * Materi Pembelajaran, Tugas, Pengumpulan Tugas, dan Jurnal Administrasi Pembelajaran KBM.
 */

export type StatusLingkupMateri = "AKTIF" | "NONAKTIF" | "ARSIP";
export type StatusTujuanPembelajaran = "AKTIF" | "NONAKTIF";
export type TipeKontenMateri = "DOKUMEN" | "TEKS" | "TAUTAN" | "VIDEO";
export type StatusMateri = "DRAFT" | "PUBLISHED" | "ARSIP";
export type StatusPublikasiMateri = "DITERBITKAN" | "DITARIK" | "ARSIP";
export type TipePenyerahanTugas = "FILE" | "TEKS" | "DARING";
export type StatusDefinisiTugas = "DRAFT" | "PUBLISHED" | "ARSIP";
export type StatusPublikasiTugas = "DITERBITKAN" | "DITUTUP" | "DRAF";
export type StatusPengumpulanTugas = "DRAFT" | "DIKUMPULKAN" | "TERLAMBAT";
export type StatusRealisasiAdministrasi = "TERLAKSANA" | "TERTUNDA" | "DIGANTI";

/**
 * Lingkup Materi (BAB / Unit Pembelajaran)
 */
export interface LingkupMateriDTO {
  id: string;
  sekolah_id: string;
  penugasan_mengajar_id: string;
  kode?: string | null;
  judul: string;
  deskripsi?: string | null;
  urutan: number;
  status: StatusLingkupMateri;
  created_at: Date;
  updated_at: Date;
  tujuan_pembelajaran_count?: number;
  materi_count?: number;
  tugas_count?: number;
}

export interface CreateLingkupMateriInput {
  sekolah_id: string;
  penugasan_mengajar_id: string;
  kode?: string | null;
  judul: string;
  deskripsi?: string | null;
  urutan?: number;
}

export interface UpdateLingkupMateriInput {
  kode?: string | null;
  judul?: string;
  deskripsi?: string | null;
  urutan?: number;
  status?: StatusLingkupMateri;
}

/**
 * Tujuan Pembelajaran (TP) per Lingkup Materi / BAB
 */
export interface TujuanPembelajaranDTO {
  id: string;
  sekolah_id: string;
  lingkup_materi_id: string;
  kode?: string | null;
  deskripsi: string;
  urutan: number;
  status: StatusTujuanPembelajaran;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTujuanPembelajaranInput {
  sekolah_id: string;
  lingkup_materi_id: string;
  kode?: string | null;
  deskripsi: string;
  urutan?: number;
}

export interface UpdateTujuanPembelajaranInput {
  kode?: string | null;
  deskripsi?: string;
  urutan?: number;
  status?: StatusTujuanPembelajaran;
}

/**
 * Materi Pembelajaran
 */
export interface MateriPembelajaranDTO {
  id: string;
  sekolah_id: string;
  guru_id: string;
  lingkup_materi_id?: string | null;
  lingkup_materi_judul?: string | null;
  mata_pelajaran_id?: string | null;
  mata_pelajaran_nama?: string | null;
  judul: string;
  deskripsi?: string | null;
  tipe_konten: TipeKontenMateri;
  konten_teks?: string | null;
  tautan_url?: string | null;
  berkas_id?: string | null;
  status: StatusMateri;
  created_at: Date;
  updated_at: Date;
  is_published?: boolean;
}

export interface CreateMateriInput {
  sekolah_id: string;
  guru_id: string;
  penugasan_mengajar_id: string; // Untuk auto-publikasi ke kelas aktif
  lingkup_materi_id?: string | null;
  mata_pelajaran_id?: string | null;
  judul: string;
  deskripsi?: string | null;
  tipe_konten?: TipeKontenMateri;
  konten_teks?: string | null;
  tautan_url?: string | null;
  berkas_id?: string | null;
  publish_langsung?: boolean;
}

export interface UpdateMateriInput {
  lingkup_materi_id?: string | null;
  judul?: string;
  deskripsi?: string | null;
  tipe_konten?: TipeKontenMateri;
  konten_teks?: string | null;
  tautan_url?: string | null;
  berkas_id?: string | null;
  status?: StatusMateri;
}

/**
 * Definisi & Publikasi Tugas
 */
export interface DefinisiTugasDTO {
  id: string;
  sekolah_id: string;
  guru_id: string;
  lingkup_materi_id?: string | null;
  lingkup_materi_judul?: string | null;
  mata_pelajaran_id?: string | null;
  mata_pelajaran_nama?: string | null;
  judul: string;
  petunjuk: string;
  tipe_penyerahan: TipePenyerahanTugas;
  berkas_id?: string | null;
  status: StatusDefinisiTugas;
  created_at: Date;
  updated_at: Date;
  publikasi?: PublikasiTugasDTO[];
}

export interface PublikasiTugasDTO {
  id: string;
  sekolah_id: string;
  tugas_id: string;
  penugasan_mengajar_id: string;
  tanggal_mulai: Date;
  batas_waktu?: Date | null;
  izinkan_terlambat: boolean;
  status: StatusPublikasiTugas;
  catatan?: string | null;
  submission_count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTugasInput {
  sekolah_id: string;
  guru_id: string;
  penugasan_mengajar_id: string;
  lingkup_materi_id?: string | null;
  mata_pelajaran_id?: string | null;
  judul: string;
  petunjuk: string;
  tipe_penyerahan?: TipePenyerahanTugas;
  berkas_id?: string | null;
  tanggal_mulai?: Date | string;
  batas_waktu?: Date | string | null;
  izinkan_terlambat?: boolean;
}

/**
 * Administrasi Pembelajaran / Jurnal KBM Guru
 */
export interface AdministrasiPembelajaranDTO {
  id: string;
  sekolah_id: string;
  penugasan_mengajar_id: string;
  sesi_kelas_aktual_id?: string | null;
  guru_id: string;
  guru_nama?: string;
  tanggal: Date;
  pertemuan_ke: number;
  materi_disampaikan: string;
  kegiatan_pembelajaran?: string | null;
  catatan_refleksi?: string | null;
  status_realisasi: StatusRealisasiAdministrasi;
  created_at: Date;
  updated_at: Date;
  tp_ids?: string[];
  tp_terkait?: TujuanPembelajaranDTO[];
}

export interface CreateAdministrasiInput {
  sekolah_id: string;
  penugasan_mengajar_id: string;
  sesi_kelas_aktual_id?: string | null;
  guru_id: string;
  tanggal: Date | string;
  pertemuan_ke: number;
  materi_disampaikan: string;
  kegiatan_pembelajaran?: string | null;
  catatan_refleksi?: string | null;
  status_realisasi?: StatusRealisasiAdministrasi;
  tp_ids?: string[];
}

export interface UpdateAdministrasiInput {
  tanggal?: Date | string;
  pertemuan_ke?: number;
  materi_disampaikan?: string;
  kegiatan_pembelajaran?: string | null;
  catatan_refleksi?: string | null;
  status_realisasi?: StatusRealisasiAdministrasi;
  tp_ids?: string[];
}

/**
 * Teacher Class Workspace DTO (Full View context)
 */
export interface TeacherClassWorkspaceDTO {
  penugasan: {
    id: string;
    sekolah_id: string;
    guru_id: string;
    guru_nama: string;
    mata_pelajaran_id: string;
    mata_pelajaran_nama: string;
    mata_pelajaran_kode: string;
    rombel_id: string;
    rombel_nama: string;
    tingkat_nama?: string | null;
    tahun_ajaran_id: string;
    tahun_ajaran_nama: string;
    semester_id?: string | null;
    semester_nama?: string | null;
    jumlah_jam_minggu: number;
    status: string;
  };
  total_siswa: number;
  lingkup_materi: Array<LingkupMateriDTO & { tujuan_pembelajaran: TujuanPembelajaranDTO[] }>;
  materi_list: MateriPembelajaranDTO[];
  tugas_list: Array<DefinisiTugasDTO & { publikasi_aktif?: PublikasiTugasDTO | null }>;
  administrasi_list: AdministrasiPembelajaranDTO[];
  jadwal_list: Array<{
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
    ruangan?: string | null;
    slot_nama: string;
  }>;
}

/**
 * Summary DTO untuk daftar Kelas Saya (/kelas-saya)
 */
export interface TeacherClassCardDTO {
  id: string; // penugasan_mengajar_id
  guru_id: string;
  guru_nama: string;
  rombel_id: string;
  rombel_nama: string;
  tingkat_nama?: string | null;
  mata_pelajaran_id: string;
  mata_pelajaran_nama: string;
  mata_pelajaran_kode: string;
  tahun_ajaran_nama: string;
  semester_nama?: string | null;
  jumlah_jam_minggu: number;
  status: string;
  total_siswa: number;
  total_bab: number;
  total_materi: number;
  total_tugas: number;
  total_jurnal: number;
  jadwal_hari_ini?: string | null;
  hari_mengajar?: string | null;
  jam_mengajar?: string | null;
  jadwal_ringkas?: string | null;
  wali_kelas_nama?: string | null;
}
