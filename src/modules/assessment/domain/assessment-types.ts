/**
 * Ruang Pintar — M13 Assessment & Gradebook Domain Types
 *
 * Invariant Kanonikal:
 * - Assessment Definition ≠ Grade ≠ Grade Publication
 * - Missing Grade ≠ Zero Grade (nilai_angka bernilai null jika belum dinilai, BUKAN 0)
 * - TP adalah data domain dinamis, dilarang nama kolom statis (nilai_tp1, nilai_tp2)
 */

export type AssessmentCategory = "FORMATIF" | "SUMATIF" | "SUMATIF_AKHIR" | "TUGAS" | "PRAKTIK";

export type AssessmentTechnique =
  "TES_TERTULIS" | "TES_LISAN" | "PENUGASAN" | "KINERJA" | "PORTOFOLIO";

export type AssessmentStatus = "DRAFT" | "PUBLISHED" | "FINALIZED" | "ARSIP";

export type GradeStatus = "DRAFT" | "PUBLISHED" | "FINALIZED";

export type PublicationAudience = "SISWA" | "WALI" | "SEMUA";

export interface DefinisiAsesmenDTO {
  id: string;
  sekolah_id: string;
  penugasan_mengajar_id: string;
  tp_id?: string | null;
  tp_kode?: string | null;
  tp_deskripsi?: string | null;
  lingkup_materi_id?: string | null;
  lingkup_materi_judul?: string | null;
  judul: string;
  deskripsi?: string | null;
  kategori: AssessmentCategory;
  teknik_penilaian: AssessmentTechnique;
  bobot: number;
  skala_maksimal: number;
  kkm_kktp: number;
  tanggal_pelaksanaan: string; // ISO String
  status: AssessmentStatus;
  is_published: boolean;
  total_siswa_dinilai: number;
  total_siswa_rombel: number;
  rata_rata_nilai?: number | null;
  created_at: string;
  updated_at: string;
}

export interface NilaiSiswaDTO {
  id: string;
  sekolah_id: string;
  asesmen_id: string;
  siswa_id: string;
  penempatan_rombel_id?: string | null;
  siswa_nis: string | null;
  siswa_nama: string;
  nomor_absen?: number | null;
  nilai_angka: number | null; // NULLABLE! Missing Grade ≠ Zero Grade
  nilai_huruf?: string | null;
  capaian_kompetensi?: string | null;
  catatan?: string | null;
  status: GradeStatus;
  diinput_oleh?: string | null;
  diubah_terakhir_oleh?: string | null;
  alasan_koreksi?: string | null;
  is_tercapai_kktp?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface PublikasiNilaiAsesmenDTO {
  id: string;
  sekolah_id: string;
  asesmen_id: string;
  target_audience: PublicationAudience;
  tanggal_publikasi: string;
  dipublikasikan_oleh: string;
  status: "PUBLISHED" | "DITARIK";
  catatan?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Representasi satu kolom asesmen pada Matriks Buku Nilai (Gradebook)
 */
export interface GradebookColumnDTO {
  id: string; // asesmen_id
  judul: string;
  kategori: AssessmentCategory;
  tp_id?: string | null;
  tp_kode?: string | null;
  tp_deskripsi?: string | null;
  lingkup_materi_id?: string | null;
  lingkup_materi_judul?: string | null;
  bobot: number;
  kkm_kktp: number;
  status: AssessmentStatus;
  is_published: boolean;
  tanggal_pelaksanaan: string;
}

/**
 * Representasi satu baris siswa pada Matriks Buku Nilai (Gradebook)
 */
export interface GradebookStudentRowDTO {
  siswa_id: string;
  penempatan_rombel_id?: string | null;
  nis: string | null;
  nisn?: string | null;
  nama_lengkap: string;
  nomor_absen?: number | null;
  // Map asesmen_id ke nilai angka (atau null jika belum dinilai)
  grades: Record<
    string,
    {
      nilai_id?: string;
      nilai_angka: number | null;
      status: GradeStatus;
      capaian_kompetensi?: string | null;
    }
  >;
  rata_rata_formatif: number | null;
  rata_rata_sumatif: number | null;
  nilai_akhir: number | null;
  ketercapaian_kktp_persen: number | null;
}

/**
 * Matriks Buku Nilai Lengkap untuk Penugasan Mengajar (Kelas + Mapel)
 */
export interface ClassGradebookDTO {
  penugasan_id: string;
  sekolah_id: string;
  rombel_id: string;
  rombel_nama: string;
  mata_pelajaran_id: string;
  mata_pelajaran_nama: string;
  kkm_default: number;
  columns: GradebookColumnDTO[];
  rows: GradebookStudentRowDTO[];
  statistics: {
    total_siswa: number;
    total_asesmen: number;
    total_formatif: number;
    total_sumatif: number;
    rata_rata_kelas: number | null;
    persentase_tuntas_kktp: number | null;
  };
}

export interface CreateAssessmentInput {
  penugasan_mengajar_id: string;
  tp_id?: string | null;
  lingkup_materi_id?: string | null;
  judul: string;
  deskripsi?: string | null;
  kategori: AssessmentCategory;
  teknik_penilaian: AssessmentTechnique;
  bobot?: number;
  skala_maksimal?: number;
  kkm_kktp?: number;
  tanggal_pelaksanaan?: string;
}

export interface UpdateAssessmentInput {
  judul?: string;
  deskripsi?: string | null;
  kategori?: AssessmentCategory;
  teknik_penilaian?: AssessmentTechnique;
  bobot?: number;
  skala_maksimal?: number;
  kkm_kktp?: number;
  tanggal_pelaksanaan?: string;
  status?: AssessmentStatus;
}

export interface GradeItemInput {
  siswa_id: string;
  penempatan_rombel_id?: string | null;
  nilai_angka: number | null; // NULLABLE! Missing Grade ≠ Zero Grade
  capaian_kompetensi?: string | null;
  catatan?: string | null;
  status?: GradeStatus;
  alasan_koreksi?: string | null;
}

export interface BulkSaveGradesInput {
  asesmen_id: string;
  grades: GradeItemInput[];
  alasan_koreksi?: string | null;
}

export interface PublishAssessmentInput {
  asesmen_id: string;
  target_audience?: PublicationAudience;
  catatan?: string | null;
}
