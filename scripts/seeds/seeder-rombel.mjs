import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { ulid } from "ulidx";

const SOURCE_URL = new URL("../data/jadwal-otomindo-2026-2027.json", import.meta.url);

function programCodeForClass(className) {
  if (className.includes(" TO ") || className.includes("TKRO")) return "TO";
  if (className.includes("TJKT") || className.includes("TKJ")) return "TJKT";
  if (className.includes("DKV")) return "DKV";
  if (className.includes("RPL")) return "RPL";
  throw new Error(`Program rombel tidak dikenali: ${className}`);
}

function gradeCodeForClass(className) {
  if (className.startsWith("XII ")) return "12";
  if (className.startsWith("XI ")) return "11";
  if (className.startsWith("X ")) return "10";
  throw new Error(`Tingkat rombel tidak dikenali: ${className}`);
}

export async function seedRombel(prismaClient = null) {
  const prisma = prismaClient || new PrismaClient();
  const shouldDisconnect = !prismaClient;

  try {
    console.log("=== [3/7] Menjalankan Seeder Rombel (21 Rombel SMK OTOMINDO) ===");

    // 1. Dapatkan sekolah SMK OTOMINDO
    const sekolah = await prisma.sekolah.findFirst({
      where: {
        OR: [{ nama: "SMK OTOMINDO" }, { id: "01M2XXYD227F9S3H985FH53GMF" }],
      },
    });
    if (!sekolah)
      throw new Error(
        "Sekolah SMK OTOMINDO belum ditemukan. Jalankan seeder-sekolah terlebih dahulu."
      );

    // 2. Dapatkan Tahun Ajaran 2026/2027 & Semester Ganjil
    const tahunAjaran = await prisma.tahunAjaran.findFirst({
      where: { sekolah_id: sekolah.id, nama: "2026/2027", status: "AKTIF" },
    });
    if (!tahunAjaran) throw new Error("Tahun ajaran 2026/2027 belum ditemukan.");

    const semester = await prisma.semester.findFirst({
      where: { sekolah_id: sekolah.id, tahun_ajaran_id: tahunAjaran.id, kode: "GANJIL" },
    });
    if (!semester) throw new Error("Semester Ganjil belum ditemukan.");

    // 3. Load maps for levels, phases, programs
    const levels = await prisma.tingkatKelas.findMany({ where: { sekolah_id: sekolah.id } });
    const levelMap = new Map(levels.map((l) => [l.kode, l]));

    const phases = await prisma.fase.findMany({ where: { sekolah_id: sekolah.id } });
    const phaseMap = new Map(phases.map((p) => [p.kode, p]));

    const programs = await prisma.programKeahlian.findMany({ where: { sekolah_id: sekolah.id } });
    const programMap = new Map(programs.map((p) => [p.kode, p]));

    // 4. Baca data rombel dari sumber resmi
    const raw = await readFile(SOURCE_URL, "utf8");
    const sourceData = JSON.parse(raw);
    const sourceRombelList = sourceData.rombel; // 21 rombel

    console.log(`Memuat ${sourceRombelList.length} rombel dari jadwal resmi...`);

    const classMap = new Map();
    const sourceNote = "SMK_OTOMINDO_2026_2027_CANONICAL";

    for (const item of sourceRombelList) {
      const levelCode = gradeCodeForClass(item.nama);
      const phaseCode = levelCode === "10" ? "FASE_E" : "FASE_F";
      const programCode = programCodeForClass(item.nama);

      const tingkat = levelMap.get(levelCode);
      const fase = phaseMap.get(phaseCode);
      const program = programMap.get(programCode);

      if (!tingkat || !fase || !program) {
        throw new Error(
          `Struktur tidak lengkap untuk ${item.nama}: Tingkat=${tingkat?.id}, Fase=${fase?.id}, Program=${program?.id}`
        );
      }

      // Check existing by sekolah_id, tahun_ajaran_id, and nama
      const existing = await prisma.rombel.findFirst({
        where: {
          sekolah_id: sekolah.id,
          tahun_ajaran_id: tahunAjaran.id,
          nama: item.nama,
        },
      });

      const kodeRombel = `RBL-${item.nama.replaceAll(" ", "-")}`;

      let rombelRecord;
      if (existing) {
        rombelRecord = await prisma.rombel.update({
          where: { id: existing.id },
          data: {
            semester_id: semester.id,
            tingkat_id: tingkat.id,
            fase_id: fase.id,
            program_id: program.id,
            kode: kodeRombel,
            status: "AKTIF",
            catatan: sourceNote,
          },
        });
        console.log(`[*] Rombel terdaftar: ${rombelRecord.nama} (ID: ${rombelRecord.id})`);
      } else {
        rombelRecord = await prisma.rombel.create({
          data: {
            id: ulid(),
            sekolah_id: sekolah.id,
            tahun_ajaran_id: tahunAjaran.id,
            semester_id: semester.id,
            tingkat_id: tingkat.id,
            fase_id: fase.id,
            program_id: program.id,
            nama: item.nama,
            kode: kodeRombel,
            kapasitas: 40,
            status: "AKTIF",
            catatan: sourceNote,
          },
        });
        console.log(`[+] Dibuat rombel: ${rombelRecord.nama} (ID: ${rombelRecord.id})`);
      }

      classMap.set(item.nama, rombelRecord);
    }

    console.log(` [PASS] Seeder Rombel Selesai: ${classMap.size} rombel aktif terverifikasi.`);
    return { classMap, sourceRombelList };
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

if (process.argv[1]?.endsWith("seeder-rombel.mjs")) {
  seedRombel().catch((err) => {
    console.error("Error running seeder-rombel:", err);
    process.exit(1);
  });
}
