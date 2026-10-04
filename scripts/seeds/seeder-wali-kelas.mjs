import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { ulid } from "ulidx";

const SOURCE_URL = new URL("../data/jadwal-otomindo-2026-2027.json", import.meta.url);

export async function seedWaliKelas(prismaClient = null) {
  const prisma = prismaClient || new PrismaClient();
  const shouldDisconnect = !prismaClient;

  try {
    console.log("=== [4/7] Menjalankan Seeder Wali Kelas (21 Rombel SMK OTOMINDO) ===");

    // 1. Dapatkan sekolah SMK OTOMINDO
    const sekolah = await prisma.sekolah.findFirst({
      where: {
        OR: [{ nama: "SMK OTOMINDO" }, { id: "01M2XXYD227F9S3H985FH53GMF" }],
      },
    });
    if (!sekolah) throw new Error("Sekolah SMK OTOMINDO belum ditemukan.");

    // 2. Dapatkan Tahun Ajaran 2026/2027
    const tahunAjaran = await prisma.tahunAjaran.findFirst({
      where: { sekolah_id: sekolah.id, nama: "2026/2027", status: "AKTIF" },
    });
    if (!tahunAjaran) throw new Error("Tahun ajaran 2026/2027 belum ditemukan.");

    // 3. Baca data rombel dari sumber resmi
    const raw = await readFile(SOURCE_URL, "utf8");
    const sourceData = JSON.parse(raw);
    const sourceRombelList = sourceData.rombel; // 21 rombel

    // 4. Map guru berdasarkan KODE_GURU
    const allTeachers = await prisma.guru.findMany({
      where: { sekolah_id: sekolah.id },
    });
    const teacherMapByCode = new Map();
    for (const t of allTeachers) {
      if (t.catatan) {
        const m = t.catatan.match(/KODE_GURU:(\d+)/i) || t.catatan.match(/Kode guru (\d+)/i);
        if (m) {
          const code = Number.parseInt(m[1], 10);
          teacherMapByCode.set(code, t);
        }
      }
    }

    // 5. Map rombel berdasarkan nama
    const allRombels = await prisma.rombel.findMany({
      where: { sekolah_id: sekolah.id, tahun_ajaran_id: tahunAjaran.id },
    });
    const rombelMapByName = new Map(allRombels.map((r) => [r.nama, r]));

    const assignedWalas = [];

    for (const item of sourceRombelList) {
      const rombel = rombelMapByName.get(item.nama);
      if (!rombel) {
        throw new Error(`Rombel ${item.nama} belum terdaftar di database.`);
      }

      const guru = teacherMapByCode.get(item.kode_guru_wali);
      if (!guru) {
        throw new Error(
          `Guru wali kelas dengan kode ${item.kode_guru_wali} untuk rombel ${item.nama} tidak ditemukan.`
        );
      }

      // Check existing penugasan_wali_kelas
      const existing = await prisma.penugasanWaliKelas.findFirst({
        where: {
          sekolah_id: sekolah.id,
          tahun_ajaran_id: tahunAjaran.id,
          rombel_id: rombel.id,
        },
      });

      const catatan = `WALI_KELAS_RESMI | Kode ${item.kode_guru_wali}`;
      let walasRecord;

      if (existing) {
        walasRecord = await prisma.penugasanWaliKelas.update({
          where: { id: existing.id },
          data: {
            guru_id: guru.id,
            status: "AKTIF",
            berlaku_mulai: tahunAjaran.tanggal_mulai,
            berlaku_sampai: null,
            catatan,
          },
        });
        console.log(`[*] Wali Kelas terdaftar: ${rombel.nama} -> ${guru.nama_lengkap}`);
      } else {
        walasRecord = await prisma.penugasanWaliKelas.create({
          data: {
            id: ulid(),
            sekolah_id: sekolah.id,
            tahun_ajaran_id: tahunAjaran.id,
            rombel_id: rombel.id,
            guru_id: guru.id,
            status: "AKTIF",
            berlaku_mulai: tahunAjaran.tanggal_mulai,
            berlaku_sampai: null,
            catatan,
          },
        });
        console.log(`[+] Ditetapkan Wali Kelas: ${rombel.nama} -> ${guru.nama_lengkap}`);
      }

      assignedWalas.push({ rombel: item.nama, guru: guru.nama_lengkap, record: walasRecord });
    }

    console.log(
      ` [PASS] Seeder Wali Kelas Selesai: ${assignedWalas.length} wali kelas terverifikasi.`
    );
    return assignedWalas;
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

if (process.argv[1]?.endsWith("seeder-wali-kelas.mjs")) {
  seedWaliKelas().catch((err) => {
    console.error("Error running seeder-wali-kelas:", err);
    process.exit(1);
  });
}
