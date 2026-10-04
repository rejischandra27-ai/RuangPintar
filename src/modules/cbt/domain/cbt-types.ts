/**
 * Ruang Pintar — CBT (Computer Based Test) Types & Contracts (M14)
 *
 * Invariants & Domain Rules:
 * Question ≠ Question Version ≠ Exam Blueprint ≠ Exam ≠ Exam Snapshot ≠ Attempt ≠ Answer ≠ Result ≠ Assessment ≠ Grade
 * Question Bank ≠ Exam
 * Missing Grade ≠ Zero Grade
 * Server Authoritative Timer: Server-side deadline calculation
 * Answer Key Security: Answer keys strictly separated from player manifest
 */

export type TipeSoal =
  | "PILIHAN_GANDA"
  | "PILIHAN_GANDA_KOMPLEKS"
  | "BENAR_SALAH"
  | "MENJODOHKAN"
  | "ISIAN_SINGKAT"
  | "ESAI"
  | "URAIAN_ESAI";

export type JenisSoalCbt = TipeSoal;

export interface PasanganMenjodohkan {
  id: string;
  premis: string;
  pasangan: string;
}

export type TingkatKesulitan = "MUDAH" | "SEDANG" | "SULIT" | "HOTS";
export type TingkatKesulitanCbt = TingkatKesulitan;

export type StatusUjianCbt =
  "DRAFT" | "DITERBITKAN" | "DIPUBLIKASI" | "BERLANGSUNG" | "SELESAI" | "DIARSIPKAN" | "ARSIP";

export type StatusAttempt =
  | "SEDANG_MENGERJAKAN"
  | "DIKUMPULKAN"
  | "SELESAI"
  | "WAKTU_HABIS"
  | "TERLAMBAT"
  | "TERKUNCI_PELANGGARAN";

export type JenisEventIntegritas =
  | "TAB_SWITCH"
  | "FULLSCREEN_EXIT"
  | "WINDOW_BLUR"
  | "RECONNECT"
  | "DEVICE_CHANGE"
  | "PINDAH_TAB_ATAU_WINDOW"
  | "KELUAR_LAYAR_PENUH";

export interface OpsiJawabanSoal {
  id?: string;
  label: string;
  teks: string;
  urutan: number;
  isCorrect?: boolean;
}

export type OpsiJawaban = OpsiJawabanSoal;

export interface BankSoalDTO {
  id: string;
  sekolah_id: string;
  guru_id: string;
  pembuat_guru_id?: string;
  mata_pelajaran_id: string;
  lingkup_materi_id: string | null;
  tujuan_pembelajaran_id: string | null;
  kode: string;
  judul: string;
  tipe_soal: TipeSoal;
  jenis_soal?: TipeSoal;
  tingkat_kesulitan: TingkatKesulitan;
  versi_aktif: any;
  versi?: any[];
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
  // Metadata & Relations
  mata_pelajaran_nama?: string;
  guru_nama?: string;
  tp_kode?: string | null;
  tp_deskripsi?: string | null;
  lingkup_materi_judul?: string | null;
  // Current active version details
  pertanyaan?: string;
  gambar_url?: string | null;
  opsi_jawaban?: OpsiJawabanSoal[];
  opsi?: any[];
  kunci_jawaban?: any;
  pembahasan?: string | null;
  bobot_default?: number;
}

export interface VersiSoalDTO {
  id: string;
  sekolah_id: string;
  bank_soal_id: string;
  nomor_versi: number;
  pertanyaan: string;
  gambar_url?: string | null;
  opsi_jawaban: OpsiJawabanSoal[] | null;
  kunci_jawaban: string[] | null;
  pembahasan: string | null;
  bobot_default: number;
  bobot?: number;
  dibuat_oleh: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BlueprintItemConfig {
  bank_soal_id: string;
  versi_soal_id?: string;
  bobot: number;
  bobot_kustom?: number;
  nomor_urut?: number;
  urutan?: number;
}

export interface UjianCbtDTO {
  id: string;
  sekolah_id: string;
  penugasan_mengajar_id: string;
  asesmen_id: string | null;
  judul: string;
  deskripsi: string | null;
  durasi_menit: number;
  waktu_mulai: Date | string | null;
  waktu_selesai: Date | string | null;
  kkm_kktp: number;
  kktp?: number;
  acak_soal: boolean;
  acak_opsi: boolean;
  gunakan_token?: boolean;
  token_masuk?: string | null;
  tampilkan_nilai: boolean;
  tampilkan_pembahasan: boolean;
  maksimal_attempt: number;
  status: StatusUjianCbt;
  blueprint: BlueprintItemConfig[] | null;
  blueprint_soal?: any[];
  guru_pembuat_id?: string;
  snapshot_aktif_id: string | null;
  total_soal?: number;
  total_peserta?: number;
  jumlah_sudah_selesai?: number;
  rombel_nama?: string;
  mata_pelajaran_nama?: string;
  asesmen_judul?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Clean manifest sent to participant CBT player.
 * GUARANTEE: Does NOT contain answer keys, correct option indicators, or scoring secrets.
 */
export interface ManifestItemSoal {
  nomor_urut: number;
  soal_id: string;
  versi_soal_id: string;
  tipe_soal: TipeSoal;
  jenis_soal?: TipeSoal;
  pertanyaan: string;
  gambar_url?: string | null;
  opsi_jawaban?: OpsiJawabanSoal[] | null;
  opsi?: any[];
  bobot: number;
}

export interface SesiUjianSiswaDTO {
  id: string;
  sekolah_id: string;
  ujian_cbt_id: string;
  snapshot_id: string;
  siswa_id: string;
  penempatan_rombel_id: string | null;
  nomor_attempt: number;
  waktu_mulai: Date | string;
  batas_waktu_server: Date | string;
  waktu_selesai: Date | string | null;
  status: StatusAttempt | string;
  alasan_selesai?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Secret scoring keys stored ONLY on server boundary in SnapshotUjian.
 */
export interface KunciPenilaianItem {
  soal_id: string;
  versi_soal_id: string;
  tipe_soal: TipeSoal;
  kunci_jawaban: string[]; // Valid answers
  bobot: number;
}

export interface SnapshotUjianDTO {
  id: string;
  sekolah_id: string;
  ujian_cbt_id: string;
  nomor_snapshot: number;
  total_soal: number;
  total_bobot: number;
  durasi_menit: number;
  dibekukan_oleh: string;
  created_at: Date | string;
}

export interface CbtPlayerStateDTO {
  sesi_id: string;
  ujian_id: string;
  snapshot_id: string;
  judul_ujian: string;
  deskripsi_ujian: string | null;
  mata_pelajaran_nama: string;
  rombel_nama: string;
  siswa_id: string;
  siswa_nama: string;
  siswa_nis: string | null;
  durasi_menit: number;
  waktu_mulai: string; // ISO String
  batas_waktu_server: string; // ISO String: Authoritative deadline
  sisa_detik_server: number;
  status: StatusAttempt;
  daftar_soal: ManifestItemSoal[];
  jawaban_tersimpan: Record<
    string,
    {
      jawaban: string[] | string | null;
      ragu_ragu: boolean;
      terakhir_disimpan: string;
    }
  >;
}

export interface SaveAnswerInput {
  sesi_ujian_id: string;
  soal_id: string;
  versi_soal_id: string;
  jawaban_peserta: string[] | string | null;
  ragu_ragu?: boolean;
}

export interface SubmitAttemptInput {
  sesi_ujian_id: string;
  alasan?: string;
}

export interface RecordIntegrityEventInput {
  sesi_ujian_siswa_id?: string;
  sesi_ujian_id?: string;
  nomor_urut_soal?: number | null;
  tipe_event?: any;
  jenis_event?: any;
  deskripsi: string;
  metadata?: any;
  payload?: any;
}

export type {
  CreateBankSoalInput,
  CreateVersiSoalInput,
  CreateUjianCbtInput,
  AutosaveJawabanInput,
  TransferToGradebookInput,
} from "./cbt-validation";

export interface HasilUjianCbtDTO {
  id: string;
  sesi_ujian_id: string;
  ujian_cbt_id: string;
  siswa_id: string;
  siswa_nama: string;
  siswa_nis: string | null;
  total_soal: number;
  total_dijawab: number;
  jumlah_benar: number;
  jumlah_salah: number;
  jumlah_kosong: number;
  skor_mentah: number;
  skor_maksimal: number;
  nilai_akhir: number;
  apakah_tuntas: boolean;
  status_penilaian: string;
  status_transfer: "BELUM_DITRANSFER" | "SUDAH_DITRANSFER";
  ditransfer_ke_nilai_siswa_id: string | null;
  waktu_selesai: Date | string | null;
  jumlah_event_integritas: number;
  total_benar?: number;
  total_salah?: number;
  total_kosong?: number;
  total_skor_diperoleh?: number;
  total_skor_maksimal?: number;
  status_kelulusan?: "TUNTAS" | "BELUM_TUNTAS";
}

export interface EventIntegritasDTO {
  id: string;
  sesi_ujian_id: string;
  jenis_event: JenisEventIntegritas;
  deskripsi: string;
  payload: string | null;
  waktu_kejadian: Date | string;
}
