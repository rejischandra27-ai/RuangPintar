import { PrismaClient } from "@prisma/client";
import { seedSekolah } from "./seeder-sekolah.mjs";
import { seedGuru } from "./seeder-guru.mjs";
import { seedRombel } from "./seeder-rombel.mjs";
import { seedWaliKelas } from "./seeder-wali-kelas.mjs";
import { seedPenugasanMengajar } from "./seeder-penugasan-mengajar.mjs";
import { seedJadwal } from "./seeder-jadwal.mjs";
import { seedSiswa } from "./seeder-siswa.mjs";

export async function runAllSeeds() {
  const prisma = new PrismaClient();
  const startTime = Date.now();

  try {
    console.log("================================================================================");
    console.log("   RUANG PINTAR SaaS — CANONICAL SEED RUNNER: SMK OTOMINDO (STAGE 11.3)");
    console.log("================================================================================");
    console.log("Memulai eksekusi 7 seeder berbasis data riil sekolah...\n");

    // 1. Seeder Sekolah
    await seedSekolah(prisma);
    console.log("");

    // 2. Seeder Guru
    await seedGuru(prisma);
    console.log("");

    // 3. Seeder Rombel
    await seedRombel(prisma);
    console.log("");

    // 4. Seeder Wali Kelas
    await seedWaliKelas(prisma);
    console.log("");

    // 5. Seeder Penugasan Mengajar
    await seedPenugasanMengajar(prisma);
    console.log("");

    // 6. Seeder Jadwal Pelajaran
    await seedJadwal(prisma);
    console.log("");

    // 7. Seeder Siswa
    await seedSiswa(prisma);
    console.log("");

    // Comprehensive Verification
    console.log("================================================================================");
    console.log("                     AUDIT & VERIFIKASI AKHIR DATABASE                          ");
    console.log("================================================================================");

    const sekolah = await prisma.sekolah.findFirst({
      where: { OR: [{ nama: "SMK OTOMINDO" }, { id: "01M2XXYD227F9S3H985FH53GMF" }] },
    });

    const counts = {
      sekolah: await prisma.sekolah.count(),
      guru: await prisma.guru.count({ where: { sekolah_id: sekolah.id, status_aktif: true } }),
      rombel: await prisma.rombel.count({ where: { sekolah_id: sekolah.id, status: "AKTIF" } }),
      waliKelas: await prisma.penugasanWaliKelas.count({
        where: { sekolah_id: sekolah.id, status: "AKTIF" },
      }),
      mataPelajaran: await prisma.mataPelajaran.count({
        where: { sekolah_id: sekolah.id, status_aktif: true },
      }),
      penugasanMengajar: await prisma.penugasanMengajar.count({
        where: { sekolah_id: sekolah.id, status: "AKTIF" },
      }),
      slotWaktu: await prisma.slotWaktu.count({
        where: { sekolah_id: sekolah.id, status_aktif: true },
      }),
      jadwalPelajaran: await prisma.jadwalPelajaran.count({ where: { sekolah_id: sekolah.id } }),
      siswa: await prisma.siswa.count({
        where: { sekolah_id: sekolah.id, status_akademik: "AKTIF" },
      }),
      keikutsertaan: await prisma.keikutsertaanSiswa.count({
        where: { sekolah_id: sekolah.id, status: "AKTIF" },
      }),
      penempatan: await prisma.penempatanRombel.count({
        where: { sekolah_id: sekolah.id, status: "AKTIF" },
      }),
    };

    console.table(counts);

    // Verifikasi User Aktif guru_chandra
    const userChandra = await prisma.pengguna.findUnique({
      where: { username: "guru_chandra" },
      include: {
        guru: {
          include: {
            penugasan_mengajar: {
              where: { status: "AKTIF" },
              include: { mata_pelajaran: true, rombel: true },
            },
            jadwal_pelajaran: true,
          },
        },
      },
    });

    if (userChandra && userChandra.guru) {
      const g = userChandra.guru;
      const totalJp = g.penugasan_mengajar.reduce((s, a) => s + a.jumlah_jam_minggu, 0);
      console.log(`\nVerifikasi Cockpit Guru Aktif (${userChandra.username}):`);
      console.log(`- Nama Lengkap: ${userChandra.nama_lengkap}`);
      console.log(`- ID Guru: ${g.id}`);
      console.log(`- Total Kelas Diajar: ${g.penugasan_mengajar.length} kelas`);
      console.log(`- Total Beban Mengajar: ${totalJp} JP/Minggu`);
      console.log(`- Total Slot Jadwal: ${g.jadwal_pelajaran.length} JP`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n[ALL SEEDS FINISHED SUCCESSFULLY in ${duration}s]`);
    return { success: true, counts };
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed-all.mjs")) {
  runAllSeeds().catch((err) => {
    console.error("FATAL ERROR running seed-all:", err);
    process.exit(1);
  });
}
