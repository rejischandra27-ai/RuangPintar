/**
 * Ruang Pintar — Validation Schemas: AI Assistance & SaaS Onboarding (M21)
 */

import { z } from "zod";

export const SmartOnboardingRegistrationSchema = z
  .object({
    nama_lengkap: z
      .string()
      .min(3, "Nama lengkap minimal 3 karakter")
      .max(100, "Nama lengkap maksimal 100 karakter"),
    email: z.string().email("Format email tidak valid"),
    password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter")
      .max(100, "Kata sandi maksimal 100 karakter")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/,
        "Kata sandi wajib memadukan huruf besar, huruf kecil, angka, dan simbol"
      )
      .optional(),
    sekolah_id: z.string().optional(),
    nama_sekolah: z.string().min(3, "Nama sekolah minimal 3 karakter").max(120).optional(),
    jenjang: z.enum(["SD", "SMP", "SMA", "SMK", "UMUM"]).optional(),
  })
  .superRefine((value, context) => {
    const joiningExistingSchool = Boolean(value.sekolah_id?.trim());
    const creatingSchool = Boolean(value.nama_sekolah?.trim() && value.jenjang);
    if (joiningExistingSchool === creatingSchool) {
      context.addIssue({
        code: "custom",
        message: "Pilih sekolah yang ditemukan atau lengkapi nama sekolah dan jenjang.",
        path: ["sekolah_id"],
      });
    }
  });

export const TeacherSchoolRegistrationChoiceSchema = z.union([
  z.object({ sekolah_id: z.string().min(1) }).strict(),
  z
    .object({
      nama_sekolah: z.string().trim().min(3).max(120),
      jenjang: z.enum(["SD", "SMP", "SMA", "SMK", "UMUM"]),
    })
    .strict(),
]);

export const StudentDraftSchema = z.object({
  nama_lengkap: z.string().min(2, "Nama siswa minimal 2 karakter"),
  nis: z.string().optional(),
  nisn: z.string().optional(),
  jenis_kelamin: z.enum(["L", "P"]).default("L"),
});

export const ConfirmClassCreationSchema = z.object({
  requestId: z.string().optional(),
  nama_kelas: z.string().min(2, "Nama kelas wajib diisi (misal: X MIPA 1)"),
  mata_pelajaran: z.string().min(2, "Mata pelajaran wajib diisi"),
  tingkat_kelas: z.string().default("10"),
  siswa: z.array(StudentDraftSchema).min(1, "Minimal 1 orang siswa terdaftar dalam kelas"),
});
