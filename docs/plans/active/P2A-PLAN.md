# P2A — Authentication & Registration Experience

**Status:** APPROVED — implementasi berjalan setelah revisi Architect.

## Urutan Kerja

1. Human Architect menyetujui [P2A-SPEC.md](../../specs/active/P2A-SPEC.md) dengan revisi wajib: jalur Guru Mandiri tidak meminta nama sekolah.
2. Audit auth/session yang ada; baca panduan Next.js terpasang untuk Route Handler/Server Action yang dipilih. Pilih library OIDC terpelihara yang kompatibel dengan sesi Prisma Ruang Pintar; jangan mengganti auth/session framework tanpa persetujuan terpisah.
3. Tambahkan konfigurasi Google OAuth melalui env (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, callback URL) dan dokumentasikan redirect URI. Secret tidak masuk repo, browser bundle, atau log.
4. Tambahkan penyimpanan provider identity yang unik berdasarkan provider + subject Google dan relasi ke `Pengguna`. Migration bersifat additive/nullable; jangan rewrite migration yang sudah diterapkan.
5. Implementasikan start/callback Google OIDC: state, nonce, PKCE, verifikasi claim, account lookup/link eksplisit, failure/replay handling, audit aman, serta pembuatan sesi melalui auth-service saat ini.
6. Sederhanakan jalur registrasi Guru Mandiri tanpa role switch/join sekolah pada jalur itu; pertahankan atomik provisioning owner/trial yang sudah ada. Jangan mengubah flow Guardian, school search, dedupe, approval, atau membership workflow.
7. Persist avatar sebagai ID katalog pada identitas pengguna melalui server action tervalidasi; sediakan default/skip, retry, profile read, dan fallback yang kompatibel dengan `foto_url`.
8. Tambahkan regresi service/action/OAuth dan UI untuk local login, provider linking, tenant isolation, registration rollback, dan avatar persistence.
9. Jalankan typecheck, lint, format check, seluruh test suite, dan production build. Lakukan manual OAuth callback check pada redirect URI yang dikonfigurasi serta screenshot form/login/avatar.
10. Tulis laporan implementasi P2A dan berhenti untuk review Human Architect. Jangan membuka P2 lanjutan.

## Dependensi & Data

- Google OAuth client ID/secret dan authorized redirect URI disediakan melalui konfigurasi environment oleh pemilik deployment.
- Perlu evaluasi dependency OIDC sebelum implementasi; dependency belum dipilih atau ditambahkan pada tahap spec.
- Satu migration additive direncanakan untuk provider identity dan `avatar_id` (bila field itu disetujui). Tidak ada perubahan terhadap skema membership/approval/discovery. Tenant Guru Mandiri dinamai server-side dari nama guru.

## Verifikasi Minimum

- Akun Google aktif yang ditautkan membuat sesi aplikasi dan hanya memperoleh tenant dari membership aktif.
- Email sama dengan account lokal tetapi `sub` belum tertaut tidak melakukan auto-link.
- Callback invalid state/nonce, audience/issuer salah, expiry, unverified email, replay, atau provider error ditolak tanpa session.
- Registrasi lokal Guru Mandiri tetap membuat owner/trial secara atomik; kegagalan tidak meninggalkan account, tenant, membership, atau session parsial.
- Google Login dan registrasi tidak membaca atau mengubah tenant lain; guardian/join path lama tetap tidak berubah.
- Avatar valid/default bertahan setelah refresh dan login ulang; avatar ID invalid ditolak dan foto unggahan tidak tertimpa.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, dan `npm run build` lulus.

## Rollback

- Matikan tombol/provider Google melalui konfigurasi dan pertahankan local login.
- Migration provider identity/avatar harus additive; rollback tidak boleh menghapus identity atau avatar yang sudah tersimpan tanpa keputusan dan backup eksplisit.
- Jangan menghapus atau menonaktifkan tenant/membership yang dibuat oleh registrasi P2A; sediakan pemeriksaan rekonsiliasi sebelum rollback data.