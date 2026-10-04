/**
 * Ruang Pintar — Student Experience Domain Types (Phase 15 / M15)
 *
 * Mendukung dashboard siswa berbasis self-scope, pembelajaran (materi & tugas),
 * presensi pribadi, asesmen published, serta kompilasi e-Rapor resmi.
 */

export interface StudentProfileContext {
  siswaId: string;
  namaLengkap: string;
  nis: string | null;
  nisn: string | null;
  fotoUrl: string | null;
  statusAkademik: string;
  tahunAjaranId: string;
  tahunAjaranNama: string;
  semesterId: string | null;
  semesterNama: string;
  rombelId: string;
  rombelNama: string;
  tingkatNama: string;
  waliKelasNama: string | null;
  nomorAbsen: number | null;
}

export interface StudentTodayScheduleItem {
  id: string;
  mataPelajaranNama: string;
  mataPelajaranKode: string;
  guruNama: string;
  jamMulai: string;
  jamSelesai: string;
  urutan: number;
  ruangan: string | null;
  status: "SELESAI" | "AKTIF" | "MENDATANG";
  penugasanMengajarId: string;
}

export interface StudentAssignmentItem {
  id: string; // publikasi_tugas_id
  tugasId: string;
  judul: string;
  petunjuk: string;
  tipePenyerahan: "FILE" | "TEKS" | "DARING";
  batasWaktu: Date | null;
  batasWaktuFormatted: string | null;
  izinkanTerlambat: boolean;
  statusPublikasi: string;
  mataPelajaranNama: string;
  guruNama: string;
  penugasanMengajarId: string;
  lampiranBerkas: {
    id: string;
    namaFileAsli: string;
    ukuranByte: number;
  } | null;
  pengumpulan: {
    id: string;
    tanggalKumpul: Date;
    tanggalKumpulFormatted: string;
    status: "DIKUMPULKAN" | "TERLAMBAT" | "DRAFT";
    teksJawaban: string | null;
    berkas: {
      id: string;
      namaFileAsli: string;
      ukuranByte: number;
    } | null;
    catatanSiswa: string | null;
    catatanGuru: string | null;
  } | null;
  isPastDeadline: boolean;
  statusPengerjaan: "BELUM_DIKUMPULKAN" | "SUDAH_DIKUMPULKAN" | "TERLAMBAT";
}

export interface StudentMaterialItem {
  id: string; // publikasi_materi_id
  materiId: string;
  judul: string;
  deskripsi: string | null;
  tipeKonten: "DOKUMEN" | "TEKS" | "TAUTAN" | "VIDEO";
  kontenTeks: string | null;
  tautanUrl: string | null;
  berkas: {
    id: string;
    namaFileAsli: string;
    ukuranByte: number;
    mimeType: string;
  } | null;
  tanggalPublikasi: Date;
  tanggalPublikasiFormatted: string;
  mataPelajaranNama: string;
  guruNama: string;
  babJudul: string | null;
  penugasanMengajarId: string;
}

export interface StudentAttendanceSummary {
  totalSesi: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpha: number;
  dispensasi: number;
  terlambat: number;
  persentaseKehadiran: number;
  riwayatPresensi: Array<{
    id: string;
    tanggal: Date;
    tanggalFormatted: string;
    mataPelajaranNama: string;
    guruNama: string;
    status: string; // HADIR | IZIN | SAKIT | ALPHA | DISPENSASI | TERLAMBAT
    catatan: string | null;
    ruangan: string | null;
  }>;
}

export interface StudentPublishedGradeItem {
  asesmenId: string;
  judulAsesmen: string;
  kategori: string; // FORMATIF | SUMATIF | SUMATIF_AKHIR | TUGAS | PRAKTIK
  teknik: string;
  mataPelajaranNama: string;
  guruNama: string;
  tpKode: string | null;
  tpDeskripsi: string | null;
  babJudul: string | null;
  kkmKktp: number;
  nilaiAngka: number | null; // Nullable! Missing Grade != Zero Grade
  nilaiHuruf: string | null;
  capaianKompetensi: string | null;
  isTuntas: boolean;
  tanggalPelaksanaan: Date;
  tanggalPelaksanaanFormatted: string;
}

export interface StudentSubjectReportCard {
  mataPelajaranId: string;
  mataPelajaranNama: string;
  guruNama: string;
  kkmKktp: number;
  rerataFormatif: number | null;
  rerataSumatif: number | null;
  nilaiAkhir: number | null;
  predikat: string; // "A" | "B" | "C" | "D" | "-"
  isTuntas: boolean;
  deskripsiCapaianTertinggi: string;
  deskripsiPerluPeningkatan: string;
  totalAsesmen: number;
}

export interface StudentReportCardCompilation {
  siswa: StudentProfileContext;
  sekolahNama: string;
  sekolahAlamat: string | null;
  sekolahNpsn: string | null;
  sekolahLogo: string | null;
  kepalaSekolahNama: string;
  kepalaSekolahNip: string | null;
  tahunAjaran: string;
  semester: string;
  mataPelajaranList: StudentSubjectReportCard[];
  rerataKeseluruhan: number | null;
  presensi: {
    sakit: number;
    izin: number;
    tanpaKeterangan: number;
  };
  catatanWaliKelas: string;
  tanggalCetak: string;
}

export interface StudentCbtExamItem {
  ujianId: string;
  judul: string;
  deskripsi: string | null;
  mataPelajaranNama: string;
  guruNama: string;
  durasiMenit: number;
  waktuMulai: Date | null;
  waktuSelesai: Date | null;
  gunakanToken: boolean;
  kkmKktp: number;
  statusUjian: string; // DITERBITKAN | BERLANGSUNG | SELESAI
  attempt: {
    id: string;
    attemptKe: number;
    status: string; // SEDANG_MENGERJAKAN | DIKUMPULKAN | WAKTU_HABIS | TERKUNCI_PELANGGARAN
    waktuMulai: Date;
    nilaiAkhir: number | null;
    apakahTuntas: boolean | null;
  } | null;
  isAvailable: boolean;
  actionLabel: string;
}

export interface StudentDashboardData {
  profile: StudentProfileContext | null;
  statCards: {
    rombelNama: string;
    waliKelasNama: string;
    persentaseKehadiran: number;
    totalHadir: number;
    totalAlpha: number;
    tugasPerluDikerjakan: number;
    totalTugasAktif: number;
    nilaiRataRata: number | null;
    cbtAktifCount: number;
  };
  jadwalHariIni: StudentTodayScheduleItem[];
  tugasMendatang: StudentAssignmentItem[];
  cbtMendatang: StudentCbtExamItem[];
  nilaiTerbaru: StudentPublishedGradeItem[];
}
