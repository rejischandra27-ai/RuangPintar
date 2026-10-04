/**
 * Ruang Pintar — STAGE 10.6: Safe Database Reality Cleanup Script
 *
 * Menghapus SELURUH data dummy hasil test/seed otomatis,
 * namun MENJAGA 100% data riil SMK OTOMINDO, guru_chandra, dan superadmin.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REAL_SCHOOL_ID = "01M2XXYD227F9S3H985FH53GMF"; // SMK OTOMINDO
const REAL_USER_CHANDRA = "01M2XXYD26H385F6RAW5PB6FBK"; // guru_chandra
const REAL_USER_ADMIN = "01M2X9VHY431VPRAMTFJRPNHQZ"; // superadmin

async function main() {
  console.log("=== MEMULAI SAFE DATABASE REALITY CLEANUP ===");

  // 1. Pre-Flight Verification
  const verifySchool = await prisma.sekolah.findUnique({ where: { id: REAL_SCHOOL_ID } });
  const verifyUserChandra = await prisma.pengguna.findUnique({ where: { id: REAL_USER_CHANDRA } });
  const verifyAdmin = await prisma.pengguna.findUnique({ where: { id: REAL_USER_ADMIN } });

  if (!verifySchool || !verifyUserChandra || !verifyAdmin) {
    throw new Error("PRE-FLIGHT FAILED: Data riil SMK OTOMINDO atau akun inti tidak ditemukan!");
  }

  console.log(
    `[PASS] Data riil terverifikasi: ${verifySchool.nama}, ${verifyUserChandra.nama_lengkap}`
  );

  // Disable Foreign Keys temporarily during cascade cleanup
  await prisma.$queryRawUnsafe("PRAGMA foreign_keys = OFF;");

  console.log("\n--- Menghapus Record Dummy Turunan ---");

  // Step 1: CBT & Ujian dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM event_integritas_ujian WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM jawaban_siswa WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM hasil_ujian_cbt WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM sesi_ujian_siswa WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM snapshot_ujian WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(`DELETE FROM ujian_cbt WHERE sekolah_id != '${REAL_SCHOOL_ID}';`);
  await prisma.$executeRawUnsafe(`DELETE FROM versi_soal WHERE sekolah_id != '${REAL_SCHOOL_ID}';`);
  await prisma.$executeRawUnsafe(`DELETE FROM bank_soal WHERE sekolah_id != '${REAL_SCHOOL_ID}';`);
  console.log(`[CBT] Terhapus: Ujian, Soal, Jawaban dummy.`);

  // Step 2: Presensi & Sesi Kelas dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM presensi_sesi_kelas WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM administrasi_tujuan_pembelajaran WHERE administrasi_id NOT IN (SELECT id FROM administrasi_pembelajaran WHERE sekolah_id = '${REAL_SCHOOL_ID}');`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM administrasi_pembelajaran WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM sesi_kelas_aktual WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  console.log(`[Presensi] Terhapus: Presensi & Sesi KBM dummy.`);

  // Step 3: Tugas & Materi dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM pengumpulan_tugas WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM publikasi_tugas WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM definisi_tugas WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM publikasi_materi WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM materi_pembelajaran WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM tujuan_pembelajaran WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM lingkup_materi WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  console.log(`[KBM] Terhapus: Materi, Tugas, Lingkup Materi dummy.`);

  // Step 4: Asesmen & Nilai dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM nilai_siswa WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM publikasi_nilai_asesmen WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM definisi_asesmen WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  console.log(`[Asesmen] Terhapus: Nilai & Asesmen dummy.`);

  // Step 5: Jadwal Pelajaran dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM jadwal_pelajaran WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM versi_jadwal WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(`DELETE FROM slot_waktu WHERE sekolah_id != '${REAL_SCHOOL_ID}';`);
  await prisma.$executeRawUnsafe(
    `DELETE FROM kalender_akademik WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  console.log(`[Jadwal] Terhapus: Jadwal, Slot Waktu, Kalender dummy.`);

  // Step 6: Penugasan Guru & Wali Kelas dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM penugasan_wali_kelas WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM penugasan_mengajar WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  console.log(`[Penugasan] Terhapus: Penugasan Mengajar dummy.`);

  // Step 7: Penempatan Rombel, Keikutsertaan Siswa, dan Rombel dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM penempatan_rombel WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM keikutsertaan_siswa WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(`DELETE FROM rombel WHERE sekolah_id != '${REAL_SCHOOL_ID}';`);
  console.log(`[Rombel] Terhapus: Rombel & Penempatan dummy.`);

  // Step 8: Mata Pelajaran dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM mata_pelajaran WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  console.log(`[Mapel] Terhapus: Mata Pelajaran dummy.`);

  // Step 9: Perwalian & Siswa dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM hubungan_wali_siswa WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM pengajuan_wali WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(`DELETE FROM wali_murid WHERE sekolah_id != '${REAL_SCHOOL_ID}';`);
  await prisma.$executeRawUnsafe(`DELETE FROM siswa WHERE sekolah_id != '${REAL_SCHOOL_ID}';`);
  console.log(`[Siswa] Terhapus: Siswa & Wali Murid dummy.`);

  // Step 10: Guru dummy (Kecuali profil guru Pak Eri Chandra)
  // Pastikan profil guru Pak Eri Chandra mengikat ke SMK OTOMINDO
  await prisma.$executeRawUnsafe(
    `UPDATE guru SET sekolah_id = '${REAL_SCHOOL_ID}' WHERE pengguna_id = '${REAL_USER_CHANDRA}';`
  );
  await prisma.$executeRawUnsafe(`DELETE FROM guru WHERE id != '01M2XXYD299G35BZDH2NKFCM3P';`);
  console.log(`[Guru] Terhapus: Profil Guru dummy.`);

  // Step 11: Struktur Akademik dummy (Tingkat, Fase, Program, Semester, Tahun Ajaran)
  await prisma.$executeRawUnsafe(
    `DELETE FROM tingkat_kelas WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(`DELETE FROM fase WHERE sekolah_id != '${REAL_SCHOOL_ID}';`);
  await prisma.$executeRawUnsafe(
    `DELETE FROM program_keahlian WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(`DELETE FROM semester WHERE sekolah_id != '${REAL_SCHOOL_ID}';`);
  await prisma.$executeRawUnsafe(
    `DELETE FROM tahun_ajaran WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  console.log(`[Akademik] Terhapus: Tahun Ajaran, Semester, Fase dummy.`);

  // Step 12: Organisasi dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM penugasan_jabatan WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(`DELETE FROM jabatan WHERE sekolah_id != '${REAL_SCHOOL_ID}';`);
  await prisma.$executeRawUnsafe(
    `DELETE FROM unit_organisasi WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );

  // Step 13: Log Audit, Notifikasi, Integrasi dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM tindak_lanjut_monitoring WHERE catatan_id NOT IN (SELECT id FROM catatan_monitoring WHERE sekolah_id = '${REAL_SCHOOL_ID}');`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM catatan_monitoring WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM sasaran_pengumuman WHERE pengumuman_id NOT IN (SELECT id FROM pengumuman WHERE sekolah_id = '${REAL_SCHOOL_ID}');`
  );
  await prisma.$executeRawUnsafe(`DELETE FROM pengumuman WHERE sekolah_id != '${REAL_SCHOOL_ID}';`);
  await prisma.$executeRawUnsafe(
    `DELETE FROM notifikasi_pengguna WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM preferensi_notifikasi WHERE pengguna_id NOT IN ('${REAL_USER_CHANDRA}', '${REAL_USER_ADMIN}');`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM log_pengiriman_integrasi WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM endpoint_webhook WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM konfigurasi_integrasi WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM konfigurasi_sistem WHERE sekolah_id != '${REAL_SCHOOL_ID}' AND sekolah_id IS NOT NULL;`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM metadata_berkas WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM riwayat_ekspor_laporan WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM permintaan_setup_kelas_ai WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM log_percobaan_login WHERE identifier NOT IN ('guru_chandra', 'superadmin') AND identifier NOT LIKE '%chandra%';`
  );
  await prisma.$executeRawUnsafe(`DELETE FROM outbox_pesan;`);
  await prisma.$executeRawUnsafe(
    `DELETE FROM log_audit WHERE (sekolah_id != '${REAL_SCHOOL_ID}' AND sekolah_id IS NOT NULL) OR (aktor_id NOT IN ('${REAL_USER_CHANDRA}', '${REAL_USER_ADMIN}'));`
  );

  // Step 14: Langganan & Keanggotaan dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM transaksi_langganan WHERE sekolah_id != '${REAL_SCHOOL_ID}' AND sekolah_id IS NOT NULL;`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM langganan_tenant WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  // Hapus keanggotaan sekolah selain untuk sekolah riil
  await prisma.$executeRawUnsafe(
    `DELETE FROM keanggotaan_sekolah WHERE sekolah_id != '${REAL_SCHOOL_ID}';`
  );
  // Hapus sesi pengguna dummy
  await prisma.$executeRawUnsafe(
    `DELETE FROM sesi_pengguna WHERE pengguna_id NOT IN ('${REAL_USER_CHANDRA}', '${REAL_USER_ADMIN}');`
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM kemampuan_staff WHERE pengguna_id NOT IN ('${REAL_USER_CHANDRA}', '${REAL_USER_ADMIN}');`
  );

  // Step 15: Hapus Pengguna Dummy (Semua KECUALI guru_chandra dan superadmin)
  await prisma.$executeRawUnsafe(
    `DELETE FROM pengguna WHERE id NOT IN ('${REAL_USER_CHANDRA}', '${REAL_USER_ADMIN}');`
  );
  console.log(`[Pengguna] Terhapus pengguna dummy.`);

  // Step 16: Hapus Sekolah Dummy (Semua KECUALI SMK OTOMINDO)
  await prisma.$executeRawUnsafe(`DELETE FROM sekolah WHERE id != '${REAL_SCHOOL_ID}';`);
  console.log(`[Sekolah] Terhapus sekolah dummy.`);

  // Re-enable Foreign Keys
  await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;");

  // Run SQLite VACUUM to reclaim disk space
  console.log("\n--- Menjalankan VACUUM Basis Data ---");
  await prisma.$queryRawUnsafe("VACUUM;");

  // Post-Cleanup Verification
  console.log("\n=== VERIFIKASI PASCA-PEMBERSIHAN ===");
  const postSekolah = await prisma.sekolah.count();
  const postGuruPengguna = await prisma.pengguna.count({ where: { peran_dasar: "TEACHER" } });
  const postGuruTable = await prisma.guru.count();
  const postSiswa = await prisma.siswa.count();
  const postRombel = await prisma.rombel.count();
  const postMapel = await prisma.mataPelajaran.count();
  const postAdmin = await prisma.pengguna.count({ where: { peran_dasar: "SUPER_ADMIN" } });

  console.log(`TOTAL SEKOLAH: ${postSekolah}`);
  console.log(`GURU (PENGGUNA TEACHER): ${postGuruPengguna}`);
  console.log(`GURU (TABEL GURU): ${postGuruTable}`);
  console.log(`TOTAL SISWA: ${postSiswa}`);
  console.log(`TOTAL ROMBEL: ${postRombel}`);
  console.log(`TOTAL MAPEL: ${postMapel}`);
  console.log(`SUPER ADMIN: ${postAdmin}`);

  // Cek apakah data X TO 3 dan Pak Eri Chandra masih utuh
  const checkChandra = await prisma.pengguna.findUnique({
    where: { username: "guru_chandra" },
    include: {
      guru: {
        include: {
          penugasan_mengajar: {
            include: {
              rombel: true,
              mata_pelajaran: true,
            },
          },
        },
      },
      keanggotaan_sekolah: {
        include: { sekolah: true },
      },
    },
  });

  console.log("\nSTATUS DATA PAK ERI CHANDRA:");
  console.log(JSON.stringify(checkChandra, null, 2));

  console.log("\n=== SAFE DATABASE REALITY CLEANUP SELESAI DENGAN SUKSES ===");
}

main()
  .catch((err) => {
    console.error("ERROR CLEANUP:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
