# Implementation Plan: Guardian Claim & Student Linkage Flow (Stage 16)

| Field | Detail |
| --- | --- |
| **Plan Slug** | `guardian-claim-student-linkage` |
| **Stage** | Stage 16 — SaaS Multi-Tenant Foundation |
| **Lifecycle Gate** | `PLAN` |
| **Status** | `active` |

---

## 1. Workstreams & Sequencing

### Workstream 1: Domain & Application Service Layer
- Tambahkan domain types dan error types untuk alur klaim wali murid:
  - `StudentClaimVerificationInput`, `StudentClaimPreviewDTO`, `StudentClaimResultDTO`.
  - `StudentNotFoundError`, `StudentVerificationMismatchError`, `DuplicateGuardianClaimError`, `CrossTenantClaimError`, `InvalidRelationshipError`.
- Tambahkan metode di `GuardianRepository`:
  - `findStudentForVerification(sekolahId, query)`
  - `checkExistingRelationship(waliId, siswaId)`
  - `createHubunganWali(data)`
  - `ensureGuardianProfile(userId, sekolahId, namaLengkap, email, noTelepon)`
- Tambahkan metode di `GuardianService`:
  - `verifyAndPreviewStudent(actor, input)`
  - `confirmStudentClaim(actor, input)`
  - `registerGuardianAccount(input)`

### Workstream 2: Server Actions & Security Layer
- Di `src/app/actions/guardian-actions.ts`:
  - `previewStudentClaimAction(formData | payload)`
  - `confirmStudentClaimAction(formData | payload)`
  - `registerGuardianAction(formData)` (pendaftaran akun wali mandiri)
- Integrasikan `recordAuditEvent` untuk:
  - `GUARDIAN_CLAIM_INITIATED`
  - `GUARDIAN_CLAIM_CONFIRMED`
  - `GUARDIAN_CLAIM_REJECTED`
  - `GUARDIAN_ACCOUNT_REGISTERED`

### Workstream 3: Presentation & Academic Glass UI
- Buat komponen klaim siswa:
  - `src/modules/guardian/presentation/guardian-claim-card.tsx` atau `src/modules/guardian/presentation/guardian-claim-wizard.tsx`
  - Halaman portal klaim siswa di `src/app/guardian/klaim-anak/page.tsx` atau tab modal di dashboard.
- Perbarui `src/shared/components/dashboard/role-views/guardian-dashboard.tsx`:
  - Jika belum memiliki anak: Tampilkan kartu sambutan interaktif untuk memulai klaim mandiri (menggantikan pesan pasif hubungi TU).
  - Jika sudah memiliki anak: Tampilkan kartu informasi anak terpilih dan tombol aksi cepat "Klaim Putra/Putri Lain" (*Multi-child*).
- Integrasikan opsi registrasi Wali Murid di halaman `/register`:
  - Berikan tab/pilihan peran di halaman registrasi antara "Guru Mandiri" dan "Wali Murid".

### Workstream 4: Automated Testing & Verification
- Unit & integration tests di `src/test/guardian/guardian-claim-flow.test.ts`:
  1. Registrasi akun wali murid mandiri berhasil membuat entitas `Pengguna`, `WaliMurid`, dan `KeanggotaanSekolah`.
  2. Verifikasi identitas siswa berhasil dengan kombinasi NIS + Nama Lengkap.
  3. Verifikasi identitas siswa berhasil dengan kombinasi Nama Lengkap + Rombel.
  4. Penolakan verifikasi jika nama tidak cocok (`StudentVerificationMismatchError`).
  5. Penolakan verifikasi jika siswa tidak ditemukan (`StudentNotFoundError`).
  6. Penolakan verifikasi jika siswa berada di tenant sekolah berbeda (`CrossTenantClaimError`).
  7. Penolakan jika terjadi klaim ganda oleh akun wali yang sama (`DuplicateGuardianClaimError`).
  8. Multi-child claim: satu wali mengklaim 2 siswa berbeda, kedua relasi terbentuk terverifikasi.
  9. Konfirmasi preview tidak memuat nilai dan presensi siswa (zero sensitive leakage).
  10. Verifikasi pencatatan log audit di setiap tahapan.

### Workstream 5: Quality Gate & Final Deliverable Report
- Jalankan verifikasi canonical:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- Tulis laporan komprehensif di `docs/features/GUARDIAN-CLAIM-STUDENT-LINKAGE-REPORT.md`.

---

## 2. Rollback Strategy
Jika terjadi masalah kritis:
- Seluruh perubahan berada di modul terisolasi `src/modules/guardian/` dan `src/app/actions/guardian-actions.ts`.
- Skema database Prisma tidak mengalami mutasi destruktif (menggunakan tabel `WaliMurid` dan `HubunganWaliSiswa` yang sudah ada).
- Revert commit kode dapat dilakukan tanpa migrasi database rollback yang merusak.
