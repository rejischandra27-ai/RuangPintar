# P2A — Authentication & Registration Experience

**Status:** APPROVED WITH REVISION — revisi registrasi Guru Mandiri diterapkan  
**Fase:** P2A  
**Batas implementasi:** Tidak ada kode sebelum spec dan plan ini disetujui.

## Tujuan

Mengurangi friksi masuk dan registrasi Guru Mandiri, serta memastikan avatar yang dipilih tetap tampil setelah sesi atau perangkat berubah, tanpa menambahkan alur pencarian atau bergabung ke sekolah yang sudah ada.

## Scope

### Google Login

- Pengguna dengan identitas Google yang sudah ditautkan dapat masuk melalui Google.
- Identitas provider dipetakan memakai Google `sub` yang diverifikasi server; email saja tidak menjadi kunci identitas dan tidak boleh memicu account auto-link.
- Pengaitan Google ke akun lokal memerlukan sesi akun yang sah dan konfirmasi ulang identitas. Akun Google yang belum ditautkan diarahkan ke registrasi/login lokal, bukan otomatis membuat akun atau membership.
- OAuth menggunakan alur server-side yang memverifikasi `state`, `nonce`, PKCE, issuer, audience, expiry, dan `email_verified`. Token provider tidak menjadi session token aplikasi atau dikirim ke client.
- Setelah autentikasi, sistem tetap membuat sesi Ruang Pintar melalui mekanisme session yang ada. Tenant aktif hanya berasal dari membership aktif yang diselesaikan server.

### Registrasi Sederhana

- Pendaftaran publik P2A terbatas pada Guru Mandiri yang mendaftarkan tenant baru melalui provisioning owner yang sudah ada. Tidak ada pilihan sekolah existing.
- Form lokal Guru Mandiri hanya meminta nama lengkap, email, password, dan konfirmasi password; username dibuat otomatis dari email dan tenant diberi nama `Ruang Mengajar Mandiri — [Nama Guru]`.
- Registrasi sukses membuat account, profil guru, owner membership, trial, dan session melalui unit provisioning atomik yang ada; pengguna masuk tanpa login ulang.
- Pengguna baru mendaftar secara lokal terlebih dahulu; setelah masuk, pengguna dapat menautkan Google secara eksplisit dari sesi akun yang sah. Google Login untuk identitas yang belum tertaut tidak membuat account atau tenant.
- Jalur registrasi Wali Murid dan pemilihan sekolah yang sudah ada tidak diubah pada P2A.

### Persistensi Avatar

- Pilihan karakter disimpan sebagai ID katalog yang tervalidasi server, bukan hanya `sessionStorage` atau query parameter.
- Rekomendasi kontrak data: `Pengguna.avatar_id` nullable, identitas-global; `foto_url` tetap untuk foto profil unggahan dan tidak ditimpa avatar karakter.
- Skip memilih avatar menyimpan avatar default. Kegagalan penyimpanan menahan langkah lanjut dan memberi retry; dashboard tidak mengklaim avatar tersimpan sebelum server mengonfirmasi.
- Avatar ID yang tidak ada di katalog ditolak. Tampilan menggunakan foto unggahan jika tersedia, lalu avatar ID, lalu fallback inisial.

## Acceptance Criteria

1. Google Login berhasil hanya untuk provider identity yang telah ditautkan ke account aktif.
2. Google login tidak membuat account, school, membership, atau tenant context hanya dari email/claim provider.
3. Linking provider menolak `sub` yang sudah terikat ke account lain dan tidak menggabungkan account hanya karena email sama.
4. Registrasi Guru Mandiri lokal mempertahankan provisioning owner/trial yang ada, validasi uniqueness, hashing password, auto-login, dan pencatatan audit.
5. Registrasi tidak mencari, memilih, menggabungkan, atau meminta approval pada sekolah existing.
6. Wali Murid, Join School, School Discovery, deduplikasi, dan approval membership tidak berubah.
7. Avatar pilihan/default dapat dibaca kembali dari session/profile setelah refresh dan login ulang; foto unggahan yang sudah ada tetap berfungsi.
8. Tidak ada credential, ID token, access token, atau secret OAuth di client, URL log, maupun audit payload.
9. Login lokal, status account, rate limit, password policy, session revocation, dan tenant isolation yang ada tetap lulus regresi.

## Batasan & Risiko untuk Review

- FRD saat ini menyatakan public registration tidak tersedia. P2A meminta pengecualian terbatas hanya untuk Guru Mandiri; perubahan baseline itu memerlukan persetujuan eksplisit.
- Dokumen onboarding approved saat ini mengarahkan pengguna mencari sekolah dan mencegah duplikasi. Karena deduplikasi dan School Discovery dikecualikan P2A, provisioning sekolah baru mempertahankan perilaku registrasi owner yang sekarang dan risiko sekolah ganda belum diselesaikan. Human Architect harus menerima risiko terbatas ini atau menunda registrasi publik; implementasi tidak boleh diam-diam menambahkan discovery/dedupe.
- ADR-001/ADR-002 masih berstatus `PROPOSED`. P2A hanya boleh memakai owner provisioning yang sudah ada; perubahan lifecycle membership memerlukan keputusan fase tersendiri.
- Keputusan Architect: nama sekolah tidak diminta pada jalur Guru Mandiri. Risiko tenant duplikat, Google account belum tertaut, re-auth linking, dan kontrak `avatar_id` tetap mengikuti batasan P2A.