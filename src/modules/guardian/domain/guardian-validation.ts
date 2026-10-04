/**
 * Ruang Pintar — M15 Guardian Validation Schemas
 * Skema validasi Zod untuk operasi formulir dan interaksi wali murid.
 */

import { z } from "zod";

export const SwitchChildSchema = z.object({
  siswa_id: z.string().min(1, "ID siswa wajib diisi"),
});

export type SwitchChildInput = z.infer<typeof SwitchChildSchema>;

export const PengajuanWaliSchema = z.object({
  siswa_id: z.string().min(1, "Pilihan anak wajib diisi"),
  tipe: z.enum(["IZIN_KETIDAKHADIRAN", "SAKIT", "KOREKSI_DATA", "CATATAN_KESEHATAN", "LAINNYA"]),
  judul: z.string().min(3, "Judul permohonan minimal 3 karakter").max(120, "Judul terlalu panjang"),
  deskripsi: z
    .string()
    .min(10, "Deskripsi permohonan minimal 10 karakter")
    .max(1000, "Deskripsi maksimal 1000 karakter"),
  tanggal_mulai: z.string().optional().nullable(),
  tanggal_selesai: z.string().optional().nullable(),
  lampiran_url: z.string().optional().nullable(),
});

export type PengajuanWaliFormInput = z.infer<typeof PengajuanWaliSchema>;

export const StudentClaimVerificationSchema = z
  .object({
    nama_lengkap: z
      .string()
      .min(2, "Nama lengkap siswa minimal 2 karakter")
      .max(100, "Nama terlalu panjang"),
    nis: z.string().trim().optional().nullable(),
    nisn: z.string().trim().optional().nullable(),
    rombel_id: z.string().optional().nullable(),
    rombel_nama: z.string().trim().optional().nullable(),
    tanggal_lahir: z.string().optional().nullable(),
  })
  .refine((data) => Boolean(data.nis || data.nisn || data.rombel_id || data.rombel_nama), {
    message: "Masukkan NIS/NISN atau pilih/tuliskan Rombel Kelas untuk verifikasi identitas.",
    path: ["nis"],
  });

export type StudentClaimVerificationFormData = z.infer<typeof StudentClaimVerificationSchema>;

export const ConfirmStudentClaimSchema = z.object({
  siswa_id: z.string().min(1, "ID siswa wajib diisi"),
  jenis_hubungan: z.enum(["AYAH", "IBU", "WALI", "LAINNYA"]),
  apakah_wali_utama: z.boolean().default(false),
  catatan: z.string().max(255).optional().nullable(),
});

export type ConfirmStudentClaimFormData = z.infer<typeof ConfirmStudentClaimSchema>;

export const GuardianRegistrationSchema = z.object({
  nama_lengkap: z.string().min(3, "Nama lengkap minimal 3 karakter").max(100),
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .max(30)
    .regex(/^[a-z0-9_.-]+$/i, "Username hanya boleh huruf, angka, titik, strip, atau garis bawah"),
  email: z.string().email("Format email tidak valid").optional().nullable().or(z.literal("")),
  no_telepon: z
    .string()
    .min(8, "Nomor telepon minimal 8 digit")
    .max(20)
    .optional()
    .nullable()
    .or(z.literal("")),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
  sekolah_id: z.string().min(1, "Pilihan sekolah wajib ditentukan"),
});

export type GuardianRegistrationFormData = z.infer<typeof GuardianRegistrationSchema>;
