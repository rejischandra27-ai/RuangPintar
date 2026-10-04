import { PrismaClient } from "@prisma/client";
import { ulid } from "ulidx";

export async function seedSekolah(prismaClient = null) {
  const prisma = prismaClient || new PrismaClient();
  const shouldDisconnect = !prismaClient;

  try {
    console.log("=== [1/7] Menjalankan Seeder Sekolah & Struktur Akademik ===");

    // 1. Dapatkan atau pastikan Sekolah SMK OTOMINDO
    let sekolah = await prisma.sekolah.findFirst({
      where: {
        OR: [
          { nama: "SMK OTOMINDO" },
          { id: "01M2XXYD227F9S3H985FH53GMF" },
          { nama: "SMKS 1 Ruang Pintar" },
        ],
      },
    });

    if (!sekolah) {
      sekolah = await prisma.sekolah.create({
        data: {
          id: "01M2XXYD227F9S3H985FH53GMF",
          nama: "SMK OTOMINDO",
          jenjang: "SMK",
          zona_waktu: "Asia/Jakarta",
          status_aktif: true,
          tipe_lisensi: "FREEMIUM",
        },
      });
      console.log(`[+] Dibuat sekolah: ${sekolah.nama} (${sekolah.id})`);
    } else {
      sekolah = await prisma.sekolah.update({
        where: { id: sekolah.id },
        data: {
          nama: "SMK OTOMINDO",
          jenjang: "SMK",
          zona_waktu: "Asia/Jakarta",
          status_aktif: true,
        },
      });
      console.log(`[*] Diperbarui sekolah: ${sekolah.nama} (${sekolah.id}) - Jenjang: SMK`);
    }

    const sekolahId = sekolah.id;

    // 2. Tahun Ajaran 2026/2027
    let tahunAjaran = await prisma.tahunAjaran.findFirst({
      where: { sekolah_id: sekolahId, nama: "2026/2027" },
    });
    if (!tahunAjaran) {
      tahunAjaran = await prisma.tahunAjaran.create({
        data: {
          id: ulid(),
          sekolah_id: sekolahId,
          nama: "2026/2027",
          kode: "TA-2026-2027",
          tanggal_mulai: new Date("2026-07-01"),
          tanggal_selesai: new Date("2027-06-30"),
          status: "AKTIF",
        },
      });
      console.log(`[+] Dibuat Tahun Ajaran: ${tahunAjaran.nama}`);
    } else {
      await prisma.tahunAjaran.update({
        where: { id: tahunAjaran.id },
        data: { status: "AKTIF" },
      });
      console.log(`[=] Tahun Ajaran aktif: ${tahunAjaran.nama}`);
    }

    // 3. Semester Ganjil
    let semester = await prisma.semester.findFirst({
      where: { sekolah_id: sekolahId, tahun_ajaran_id: tahunAjaran.id, kode: "GANJIL" },
    });
    if (!semester) {
      semester = await prisma.semester.create({
        data: {
          id: ulid(),
          sekolah_id: sekolahId,
          tahun_ajaran_id: tahunAjaran.id,
          nama: "Semester Ganjil",
          kode: "GANJIL",
          urutan: 1,
          tanggal_mulai: new Date("2026-07-01"),
          tanggal_selesai: new Date("2026-12-31"),
          status: "AKTIF",
        },
      });
      console.log(`[+] Dibuat Semester: ${semester.nama}`);
    } else {
      await prisma.semester.update({
        where: { id: semester.id },
        data: { status: "AKTIF" },
      });
      console.log(`[=] Semester aktif: ${semester.nama}`);
    }

    // 4. Fase Kurikulum (Fase E & Fase F)
    const phases = [
      { kode: "FASE_E", nama: "Fase E", urutan: 5 },
      { kode: "FASE_F", nama: "Fase F", urutan: 6 },
    ];
    const phaseMap = new Map();
    for (const p of phases) {
      const fase = await prisma.fase.upsert({
        where: { sekolah_id_kode: { sekolah_id: sekolahId, kode: p.kode } },
        update: { nama: p.nama, urutan: p.urutan },
        create: { id: ulid(), sekolah_id: sekolahId, kode: p.kode, nama: p.nama, urutan: p.urutan },
      });
      phaseMap.set(p.kode, fase);
      console.log(`[=] Fase Kurikulum: ${fase.nama} (${fase.kode})`);
    }

    // 5. Tingkat Kelas (10, 11, 12)
    const levels = [
      { kode: "10", nama: "Kelas 10", urutan: 10, faseKode: "FASE_E" },
      { kode: "11", nama: "Kelas 11", urutan: 11, faseKode: "FASE_F" },
      { kode: "12", nama: "Kelas 12", urutan: 12, faseKode: "FASE_F" },
    ];
    const levelMap = new Map();
    for (const l of levels) {
      const fase = phaseMap.get(l.faseKode);
      const tingkat = await prisma.tingkatKelas.upsert({
        where: { sekolah_id_kode: { sekolah_id: sekolahId, kode: l.kode } },
        update: { nama: l.nama, urutan: l.urutan, fase_id: fase.id },
        create: {
          id: ulid(),
          sekolah_id: sekolahId,
          kode: l.kode,
          nama: l.nama,
          urutan: l.urutan,
          fase_id: fase.id,
        },
      });
      levelMap.set(l.kode, tingkat);
      console.log(`[=] Tingkat Kelas: ${tingkat.nama} (${tingkat.kode}) -> ${fase.nama}`);
    }

    // 6. Program Keahlian (TO, TJKT, DKV, RPL)
    const programs = [
      { kode: "TO", nama: "Teknik Otomotif", jenjang: "SMK" },
      { kode: "TJKT", nama: "Teknik Jaringan Komputer dan Telekomunikasi", jenjang: "SMK" },
      { kode: "DKV", nama: "Desain Komunikasi Visual", jenjang: "SMK" },
      { kode: "RPL", nama: "Rekayasa Perangkat Lunak", jenjang: "SMK" },
    ];
    const programMap = new Map();
    for (const prog of programs) {
      const p = await prisma.programKeahlian.upsert({
        where: { sekolah_id_kode: { sekolah_id: sekolahId, kode: prog.kode } },
        update: { nama: prog.nama, jenjang: prog.jenjang, status_aktif: true },
        create: {
          id: ulid(),
          sekolah_id: sekolahId,
          kode: prog.kode,
          nama: prog.nama,
          jenjang: prog.jenjang,
          status_aktif: true,
        },
      });
      programMap.set(prog.kode, p);
      console.log(`[=] Program Keahlian: ${p.nama} (${p.kode})`);
    }

    console.log(" [PASS] Seeder Sekolah & Struktur Akademik Selesai.");
    return {
      sekolah,
      tahunAjaran,
      semester,
      phaseMap,
      levelMap,
      programMap,
    };
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

// Run directly if invoked from CLI
if (process.argv[1]?.endsWith("seeder-sekolah.mjs")) {
  seedSekolah().catch((err) => {
    console.error("Error running seeder-sekolah:", err);
    process.exit(1);
  });
}
