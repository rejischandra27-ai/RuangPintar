# UX-02 — Teacher First Experience Redesign

| Metadata | Value |
| --- | --- |
| Phase | UX-02 |
| Feature slug | `teacher-first-experience-redesign` |
| Version | 2.0 |
| Status | APPROVED — Human Architect Decision 2026-09-29; implementation pending |
| Companion plan | [UX-02-PLAN.md](../../plans/active/UX-02-PLAN.md) |
| Scope | Pengalaman pertama Guru Sekolah setelah registrasi atau login |

> v2 menggantikan keputusan UI v1 tentang dashboard onboarding hub. Keputusan final Human Architect 2026-09-29: dashboard tetap menjadi halaman utama; onboarding tampil sebagai Glass Modal Wizard overlay untuk akun baru dengan onboarding belum selesai; wizard dapat ditutup dan dilanjutkan dengan progress server-side; tidak ada checklist/panel onboarding permanen. Keputusan domain, kelas minimal, jadwal, serta role preference v1 yang tidak bertentangan tetap berlaku.

### Catatan Revisi v2

- Mengganti dashboard checklist/hub permanen dengan wizard modal sementara.
- Membatasi auto-open pada lifecycle first-use akun baru yang onboarding-nya belum selesai.
- Menetapkan close sebagai dismiss sementara dan melanjutkan kembali dari cursor/progress server-side.
- Memperjelas bahwa completion menghapus seluruh surface onboarding dari dashboard.
- Mempertahankan toggle peran sebagai preferensi non-authoritative; hak akses tetap berasal dari assignment resmi.

## 1. Problem Statement

Guru Sekolah sering belum memiliki seluruh informasi akademik saat pertama kali masuk. Onboarding perlu memandu akun baru tanpa menggantikan dashboard sebagai halaman utama, memaksa seluruh data akademik tersedia, atau menggabungkan aksi domain independen ke satu transaksi.

UX-02 v2 menampilkan Glass Modal Wizard di atas dashboard pada first-use yang memenuhi syarat. Wizard dapat ditutup tanpa kehilangan progress dan dilanjutkan kembali dari progress server-side. Setelah selesai, wizard tidak muncul kembali dan dashboard tidak menampilkan checklist atau panel onboarding permanen. Aktivitas akademik tetap mengikuti workflow serta authorization domain masing-masing.

## 2. Current Flow Audit

| Surface | Current behavior | UX finding | UX-02 decision |
| --- | --- | --- | --- |
| Registrasi Guru lokal | Registrasi membuat akun lalu mengarahkan ke pemilihan avatar dan halaman selesai sebelum dashboard. | Ada layar interstitial yang tidak menambah kesiapan mengajar. | Setelah avatar dipilih atau dilewati, langsung masuk dashboard. |
| Google Registration | Callback saat ini menyelesaikan provisioning/session dan mengarahkan akun baru ke dashboard. | Berbeda dari flow lokal; tidak ada checkpoint avatar. | Akun Google baru mengikuti checkpoint avatar sebelum dashboard; Google login untuk akun lama tidak dipaksa memilih avatar setiap login. |
| `TeacherFirstClassSetupModal` | Modal lama otomatis dibuka ketika `totalRombel === 0`; implementasi wizard onboarding baru juga pernah dipasang bersama kartu resume di dashboard. | Trigger berbasis jumlah kelas tidak sama dengan eligibility first-use; kartu resume tetap memakan ruang dashboard. | Jangan memakai `totalRombel === 0` sebagai trigger onboarding. Gunakan eligibility first-use dan status selesai server-side untuk membuka wizard UX-02; audit dan pertahankan workflow kelas legacy lain yang masih dipakai. |
| Langkah Peran | Guru Mapel selalu aktif; Wali Kelas berupa toggle lokal dan perubahan tidak dipersistenkan oleh modal. | Pilihan tampak seperti authorization toggle padahal bukan assignment wali kelas. | Ubah menjadi pilihan/preferensi onboarding yang dapat dilanjutkan dan dijelaskan. Hak Wali Kelas tetap berdasarkan assignment aktif server-side. |
| Langkah Mata Pelajaran | Guru memilih mapel dari daftar lokal atau menambah teks bebas sebelum membuat kelas. | Mapel dipaksa terlalu awal dan data mapel dapat berbeda dari master sekolah. | Hapus dari prasyarat pembuatan kelas. Pindahkan ke setup penugasan mengajar/jadwal ketika guru siap. |
| Langkah Rombel & Siswa | Form berisi nama, tingkat, mapel, dan roster siswa; action membuat Rombel, MataPelajaran, PenugasanMengajar, Siswa, Enrollment, dan Placement secara terpadu. | Satu pilihan nama kelas memicu banyak entitas berbeda; belum cocok dengan kelas awal kosong. | Pisahkan pembuatan Rombel minimal dari penugasan mapel, siswa, dan jadwal. |
| Langkah Jadwal | Wizard lama mengarahkan guru ke jadwal setelah kelas dibuat; status wizard/cursor tidak disimpan untuk resume. | Jadwal dapat belum siap karena assignment resmi belum tersedia; pengguna harus dapat menutup wizard dan melanjutkan. | Pertahankan Atur Sekarang/Atur Nanti bila langkah jadwal termasuk wizard; status domain dan cursor resume disimpan server-side per pengguna + tenant aktif. |
| Penyimpanan progres | Status domain sebagian dibaca dari server, tetapi cursor langkah wizard tidak disimpan. | Menutup wizard tidak boleh menghilangkan progres atau mengulang langkah dari awal saat dilanjutkan. | Simpan status domain yang sah dan cursor/checkpoint resume secara server-side, tenant-scoped. Jangan membuat panel checklist permanen sebagai pengganti resume. |
| Avatar | Picker menyimpan ID di `sessionStorage` dan query parameter; tidak tersimpan pada profil server. | Checklist tidak dapat menyatakan avatar selesai secara durable. | Avatar dipilih atau dilewati pada first-use. Persistensi dan status completion harus server-readable sebelum checklist mengklaim selesai lintas sesi. |
| `TeacherOnboardingCard` | Komponen menawarkan entri rombel, scan foto, dan panduan; tidak ditemukan pemanggilnya di dashboard guru saat audit. | Kapabilitas ada, tetapi tidak menjadi onboarding hub terintegrasi. | Evaluasi dan gunakan ulang entry points yang relevan sebagai checklist actions; jangan menambah card kedua yang bersaing. |

### Keputusan atas Wizard dan Hub v2

- Glass Modal Wizard tampil sebagai overlay di atas dashboard; dashboard tetap menjadi halaman utama dan tetap dirender di belakang overlay.
- Tidak ada hub, checklist, progress card, atau panel onboarding permanen di dashboard, baik sebelum wizard dibuka maupun setelah wizard ditutup.
- Auto-open hanya berlaku untuk akun baru yang berada dalam lifecycle onboarding dan onboarding-nya belum selesai. `totalRombel === 0` atau status incomplete pada akun lama saja tidak cukup untuk memicu wizard.
- Menutup wizard hanya menutup presentation saat ini. Progress domain dan resume cursor tidak dihapus; saat onboarding lifecycle yang sama dilanjutkan pada dashboard berikutnya, wizard melanjutkan dari checkpoint server terakhir.
- Wizard tidak menjadi gerbang authorization. Dashboard dan seluruh kapabilitas yang sudah diizinkan tetap dapat digunakan saat onboarding belum selesai.
- Toggle Peran dipertahankan sebagai dua preferensi independen. Perubahan keduanya tidak mengubah base role, membership, permission, atau assignment.
- Mata pelajaran tidak dibuat atau ditetapkan hanya untuk mengisi wizard. Buat Rombel tetap minimal dan dipisahkan dari roster/placement dan jadwal.
- Komponen modal lama dan action akademik hanya boleh dihapus/diubah setelah pemanggil dan workflow terkait diaudit serta regression lulus.

## 3. Proposed Flow

### First-use dan resume

```text
Akun Guru baru dibuat / first-use memenuhi eligibility
    → Dashboard Guru dirender sebagai halaman utama
    → Glass Modal Wizard otomatis terbuka bila onboarding belum selesai
    → Guru menyelesaikan langkah atau menutup sementara
    → Dashboard normal tanpa panel onboarding permanen
    → Pada kelanjutan lifecycle yang sama, wizard dibuka kembali dari checkpoint server terakhir
```

- Wizard berada di atas dashboard, bukan menggantikan dashboard atau route utama.
- Eligibility first-use dan status selesai harus dapat ditentukan secara server-authoritative dan tenant-scoped.
- Guru dengan akun lama tidak dipaksa mengulang first-use hanya karena data kelas/avatar tertentu belum ada. Migrasi/eligibility untuk akun lama memerlukan keputusan eksplisit.
- Close tidak menandai onboarding selesai, tidak menghapus status yang tersimpan, dan tidak membuat data akademik. Close hanya mengakhiri tampilan wizard saat ini.
- Wizard yang dibuka kembali memakai checkpoint server terakhir yang valid; kegagalan aksi tidak boleh memajukan checkpoint.
- Sesudah status onboarding lifecycle selesai, modal tidak muncul lagi dan tidak ada panel/checklist onboarding di dashboard production.

### Wizard checkpoints dan domain actions

1. Profil — selesai jika profil Guru pada tenant aktif tersedia dan valid.
2. Avatar — selesai jika avatar terpilih/default tersimpan dan dapat dibaca server; pertahankan checkpoint/avatar flow yang sudah disetujui tanpa menjadikannya permission.
3. Pilih Peran — simpan preferensi Guru Mata Pelajaran dan/atau Wali Kelas.
4. Buat Kelas Pertama — buat satu Rombel minimal dengan nama dan tingkat; tanpa mapel, assignment, siswa, placement, atau jadwal.
5. Tambah Siswa — gunakan workflow `Import Excel`, `Tambah Manual`, atau `Lewati` bila checkpoint ini disertakan dalam wizard.
6. Atur Jadwal — `Atur Sekarang` hanya jika assignment sah tersedia; `Atur Nanti` menyimpan defer bila checkpoint ini disertakan dalam wizard.

Komposisi layar wizard dapat mengelompokkan checkpoint menjadi langkah UI yang lebih sedikit, tetapi pemetaan antara langkah UI dan state domain harus eksplisit. `complete`, `pending`, `deferred`, resume cursor, dismissed, dan overall onboarding completion adalah state yang berbeda; jangan menyamakan defer dengan bukti data telah dibuat. Tidak satu pun state tersebut menjadi sumber authorization.

### Toggle Peran

- Tawarkan dua toggle independen: Guru Mata Pelajaran dan Wali Kelas. Keduanya boleh aktif bersamaan atau nonaktif sesuai preferensi pengguna.
- Jelaskan bahwa toggle hanya preferensi onboarding dan dapat ditinjau/diubah kemudian. Preferensi bukan perubahan `peran_dasar`, membership, assignment, atau grant permission.
- Hak operasional tetap diturunkan dari assignment resmi aktif serta permission dan resource scope server-side. Mengaktifkan toggle Wali Kelas tidak membuat `PenugasanWaliKelas`.
- Jika belum memiliki assignment aktif, UI menjelaskan bahwa akses operasional menunggu assignment resmi/berwenang.

#### Buat Kelas Pertama

- Form onboarding hanya meminta Nama Kelas, contohnya `X TO 1`, `X TO 2`, `X RPL`, atau `XII RPL`.
- Tidak meminta siswa, mapel, maupun jadwal.
- Persistensi hanya membuat entitas Rombel di tenant aktif. `Rombel` tetap memerlukan tahun ajaran dan tingkat. Resolver server memakai tahun ajaran aktif dan tingkat yang dapat ditentukan secara valid dari nama; jika konteks tahun/tingkat tidak tersedia atau ambigu, sistem menampilkan alasan dan tidak membuat data parsial.
- Pembuatan harus mematuhi permission server-side. UI tidak dapat memberikan hak membuat kelas kepada Guru yang tidak memilikinya.
- Setelah berhasil, checkpoint tersimpan dan Guru dapat melanjutkan wizard atau menutupnya. Kelas yang dibuat tidak memaksa langkah akademik lain.

#### Tambah Siswa

- Tawarkan import Excel dan tambah manual melalui flow pengelolaan siswa yang sudah tersedia jika checkpoint siswa termasuk dalam komposisi wizard.
- “Lewati” menandai checkpoint sebagai ditunda, bukan membuat siswa dummy atau menandai roster telah dibuat.
- Seluruh identity, enrollment, dan placement tetap mengikuti invariant `Student ≠ Enrollment ≠ Rombel Placement` dan aksi tenant-scoped.

#### Atur Jadwal

- “Atur Sekarang” membuka flow jadwal/penugasan yang sudah tersedia dan hanya dapat disimpan setelah prasyarat penugasan mapel yang sah tersedia.
- “Atur Nanti” menyimpan status defer dan memungkinkan wizard ditutup/dilanjutkan. Tidak ada jadwal atau assignment sintetis.
- Defer tidak menghalangi akses ke dashboard atau penggunaan kapabilitas lain yang sudah diotorisasi.

## 4. Data Impact

Perubahan harus additive. Tidak boleh menulis ulang atau menghapus data akademik yang sudah ada.

1. **Progres onboarding:** status defer/preferensi dan cursor/checkpoint resume harus server-readable per pasangan pengguna + tenant, bukan hanya state React/sessionStorage. Status yang dapat diturunkan dari data kanonis sebaiknya tidak diduplikasi tanpa alasan. Simpan eligibility first-use/lifecycle completion secara server-authoritative atau turunkan secara andal dari state kanonis.
2. **Role preference:** simpan sebagai preferensi/fokus onboarding terpisah dari base role dan assignment efektif. Jangan menyimpan pilihan ini dalam `peran_dasar`.
3. **Avatar:** `Pengguna.avatar_id` nullable atau kontrak setara yang dapat dibaca server diperlukan agar checkbox avatar lintas sesi akurat. Nilai harus tervalidasi terhadap katalog; foto unggahan `foto_url` tidak ditimpa. Default/skip menggunakan ID avatar default yang tervalidasi.
4. **Ownership Rombel:** model Rombel sekarang tidak memiliki pencatat creator. Jika Guru non-owner dapat membuat Rombel tanpa assignment mapel/wali, dibutuhkan relasi creator/ownership atau domain boundary setara agar kelas dapat ditemukan dan dikelola tanpa memberikan akses tenant-wide. Alternatif yang ada tidak boleh mengarang `PenugasanMengajar` tanpa mapel.
5. **Data akademik:** pembuatan Rombel tidak membuat `MataPelajaran`, `PenugasanMengajar`, `Siswa`, `KeikutsertaanSiswa`, `PenempatanRombel`, atau `JadwalPelajaran`. Setiap item dibuat oleh langkah/action domain terpisah.
6. **Migration:** apabila record progres, avatar ID, atau hubungan creator belum tersedia, gunakan migration Prisma additive/nullable. Field/record lama tidak boleh dihapus saat rollback.

### Final Architect Decisions — v2

- Dashboard tetap menjadi halaman utama. Teacher Onboarding tampil sebagai Glass Modal Wizard overlay; tidak ada checklist, hub, atau panel onboarding permanen.
- Wizard auto-opens hanya untuk akun baru dalam lifecycle first-use yang belum selesai. Kekurangan avatar/kelas atau progress incomplete pada akun lama tidak dengan sendirinya memicu modal.
- Wizard dapat ditutup sementara. Close tidak menghapus/memajukan progress; pada dashboard berikutnya selama lifecycle masih incomplete, wizard dapat dilanjutkan dari checkpoint server terakhir.
- Status wizard/lifecycle diselesaikan server-side. Setelah selesai, wizard tidak dibuka lagi dan dashboard tetap bersih.
- Toggle Guru Mata Pelajaran dan Wali Kelas dipertahankan sebagai dua preferensi independen; keduanya tidak mengubah base role, membership, permission, atau assignment. Hak akses hanya berasal dari assignment resmi dan authorization server-side.
- Avatar ID disimpan pada identitas Pengguna dan menjadi status server-readable untuk onboarding.
- Rombel minimal menyimpan pencipta; mutasi create tetap memerlukan permission server-side dan tidak membuat teaching assignment.
- Form pembuatan kelas meminta Nama Kelas dan Tingkat Kelas X/XI/XII.
- Jadwal menawarkan Atur Sekarang dan Atur Nanti; penjadwalan memerlukan teaching assignment yang sudah sah.
- Langkah Siswa dan Jadwal boleh berstatus `deferred` jika aksi defer tersedia. Defer tetap berbeda dari `complete`; jika checkpoint opsional tersebut ditunda secara eksplisit, lifecycle first-use dapat dinyatakan selesai tanpa mengarang data. Resume berikutnya untuk data akademik dilakukan melalui workflow domain yang ada, bukan panel onboarding.

### Lifecycle Completion Rule

- Lifecycle wizard berakhir ketika seluruh checkpoint wajib (`profile`, `avatar`, `roles`, `class`) complete, dan setiap checkpoint opsional (`students`, `schedule`) complete atau secara eksplisit `deferred`.
- Status `deferred` tetap terlihat pada data/status yang relevan sebagai defer, tidak pernah dilabeli sebagai data atau aksi yang telah selesai.
- Close modal tidak mengubah lifecycle completion. Jika masih ada checkpoint wajib pending, wizard memenuhi syarat untuk dibuka kembali pada dashboard berikutnya dan dimulai dari cursor server terakhir.
- Bila eligibility atau completion tidak dapat ditentukan dengan yakin dari server, default deny untuk auto-open bagi akun lama; jangan menebak eligibility dari jumlah kelas atau client state.

## 5. Security Impact

- Tenant diperoleh dari sesi server-authoritative `sekolah_aktif_id`; semua query/mutasi onboarding dibatasi tenant tersebut.
- Semua payload (termasuk role preference, rombel, file import, dan status defer) divalidasi server-side. `pengguna_id`, `sekolah_id`, owner, permission, dan assignment tidak dipercaya dari client.
- Callback Google dan sesi auth tidak mengubah cakupan tenant onboarding ini.
- Import siswa mempertahankan validasi ukuran/format, uniqueness, relasi enrollment/placement, dan audit sesuai flow yang ada.
- Mutasi mengandalkan transaction boundary agar kegagalan tidak meninggalkan Rombel/progres yang hanya sebagian tercipta.
- Avatar ID hanya boleh berisi ID katalog; foto unggahan tidak dapat di-overwrite oleh pilihan avatar.
- Tidak menurunkan proteksi status entitlement tenant atau audit trail.

## 6. Authorization Impact

- Evaluasi tetap mengikuti `Identity → Base Role → Position/Assignment/Relationship → Permission → Resource Scope → Effective Access`.
- Pilihan “Guru Mata Pelajaran/Wali Kelas” pada onboarding bukan role sistem dan tidak mengubah membership/base role.
- Akses Wali Kelas harus berasal dari `PenugasanWaliKelas` aktif yang tervalidasi pada tenant, Rombel, dan tahun ajaran.
- Pembuatan Rombel bagi Guru hanya dapat dilakukan jika permission/resource scope server mengizinkan. Untuk Guru tanpa hak tersebut, berikan state arahan ke administrator; jangan mengandalkan hide/disable client sebagai kontrol akses.
- Tambah Siswa, roster, import, serta jadwal harus menggunakan guard permission dan ownership/assignment kanonis yang sama dengan workflow domain masing-masing.
- Checklist dan progress bukan sumber authorization; menyelesaikan atau mem-bypass checklist tidak menambah hak akses.

## 7. Acceptance Criteria

1. Akun Guru baru lokal maupun Google yang memenuhi eligibility masuk ke dashboard utama; ketika lifecycle onboarding belum selesai, Glass Modal Wizard terbuka otomatis sebagai overlay.
2. Akun lama yang login kembali tidak otomatis melihat wizard hanya karena tidak memiliki avatar, kelas, atau checkpoint tertentu; akun legacy hanya diikutkan melalui keputusan eligibility/migrasi yang eksplisit.
3. Dashboard tidak merender checklist, resume card, atau panel onboarding permanen, baik saat modal tertutup maupun setelah lifecycle selesai.
4. Menutup modal mengembalikan pengguna ke dashboard normal, tidak menghapus progress, dan tidak menandai wizard selesai.
5. Pada dashboard berikutnya, lifecycle yang masih belum selesai dapat melanjutkan wizard pada cursor/checkpoint terakhir yang server-valid untuk pengguna + tenant aktif.
6. Status wizard/lifecycle dan data progress bertahan setelah refresh, logout/login, dan perangkat lain; client tidak menjadi sumber eligibility, completion, tenant, atau authorization.
7. Setelah checkpoint wajib selesai dan checkpoint opsional selesai atau di-defer, modal tidak muncul lagi. Status defer tetap berbeda dari complete dan tidak membuat data akademik.
8. Toggle Guru Mata Pelajaran dan Wali Kelas independen, dapat disimpan server-side, dan tidak mengubah `peran_dasar`, membership, permission, atau assignment.
9. Pilihan Wali Kelas saja tidak memberi akses ke Leger, Presensi Rombel, Catatan Siswa, atau Rapor tanpa assignment wali aktif dan scope resource yang sesuai.
10. Form Buat Kelas Pertama meminta Nama dan Tingkat Kelas X/XI/XII. Keberhasilan menciptakan tepat satu Rombel tenant-scoped tanpa mapel, assignment mengajar, siswa, enrollment, placement, atau jadwal.
11. Jika tahun ajaran/tingkat tidak dapat ditentukan, permission tidak ada, atau nama duplikat, operasi ditolak secara atomik dengan pesan yang dapat ditindaklanjuti; tidak ada data parsial.
12. Tambah Siswa mendukung workflow import/manual dan defer sesuai permission; defer tidak menciptakan siswa/placement.
13. Atur Jadwal mendukung simpan atau defer; defer tidak membuat assignment/jadwal sintetis. Aksi akademik selanjutnya memakai workflow domain yang sudah tersedia.
14. Guru yang sudah memiliki data sebelum deploy tidak kehilangan assignment, rombel, siswa, jadwal, atau progress yang telah dikerjakan; tidak dipaksa mengulang onboarding.
15. Dashboard dan kapabilitas yang sudah diizinkan tetap dapat digunakan saat onboarding belum selesai atau wizard ditutup.
16. Tenant isolation, local/Google auth, Guardian flow, import siswa, attendance, gradebook, homeroom authorization, dan workflow kelas lama yang masih digunakan tetap lulus regresi.

## 8. Out of Scope

- School Discovery, Join School, Membership Approval, dan school deduplication.
- Perubahan role system/base role, auto-appointment Wali Kelas, atau pemberian permission dari client.
- Pembuatan mapel/teaching assignment hanya untuk memenuhi prasyarat visual.
- Perubahan workflow Guardian, domain enrollment/placement, attendance business rules, atau jadwal sekolah global.
- AI scan siswa sebagai requirement onboarding baru; entry point yang ada dapat tetap di luar checklist MVP.
- Perubahan besar Teacher Command Center, Live Session banner, dan struktur seluruh workspace.
