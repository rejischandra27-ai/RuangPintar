/**
 * Ruang Pintar — Domain Types: AI Assistance & SaaS Smart Onboarding (M21)
 */

export interface StudentDraftFromAi {
  nama_lengkap: string;
  nis?: string;
  nisn?: string;
  jenis_kelamin: "L" | "P";
}

export interface ClassExtractionResult {
  requestId: string;
  nama_kelas: string;
  mata_pelajaran?: string;
  siswa: StudentDraftFromAi[];
  total_terdeteksi: number;
  confidence_score: number;
  catatan?: string;
  is_fallback?: boolean;
}

export interface SmartOnboardingRegistrationDTO {
  nama_lengkap: string;
  email: string;
  password?: string;
  sekolah_id?: string;
  nama_sekolah?: string;
  jenjang?: "SD" | "SMP" | "SMA" | "SMK" | "UMUM" | string;
  provider_identity?: {
    provider: "GOOGLE";
    subject: string;
  };
}

export type TeacherSchoolRegistrationChoice =
  { sekolah_id: string } | { nama_sekolah: string; jenjang: "SD" | "SMP" | "SMA" | "SMK" | "UMUM" };

export interface ConfirmClassCreationDTO {
  requestId?: string;
  nama_kelas: string;
  mata_pelajaran: string;
  tingkat_kelas: string; // "10" | "11" | "12"
  siswa: StudentDraftFromAi[];
}

export interface TeacherTrialStatusDTO {
  is_trial: boolean;
  tipe_lisensi: "FREEMIUM" | "SEKOLAH";
  days_remaining: number;
  trial_berakhir_pada: string | null;
  max_rombel: number;
  current_rombel_count: number;
  can_create_rombel: boolean;
  is_expired: boolean;
}
