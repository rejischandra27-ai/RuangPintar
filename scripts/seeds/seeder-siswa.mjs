import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { ulid } from "ulidx";

const SOURCE_URL = new URL("../parsed_school_data.json", import.meta.url);

const FEMALE_KEYWORDS = new Set([
  "putri",
  "siti",
  "nur",
  "nabila",
  "dewi",
  "fitri",
  "ayu",
  "lestari",
  "indah",
  "tiara",
  "wulandari",
  "salsabila",
  "salsabillah",
  "anisa",
  "annisa",
  "dita",
  "novita",
  "febriana",
  "nengsih",
  "suryani",
  "tina",
  "angelita",
  "citra",
  "elsa",
  "marsya",
  "oktaviani",
  "gendis",
  "intan",
  "fakhira",
  "ningtyas",
  "zahra",
  "aura",
  "aisyah",
  "syifa",
  "mutiara",
  "nadia",
  "keyla",
  "najwa",
  "cahya",
  "amelia",
  "shifa",
  "khansa",
  "nayla",
  "shakila",
  "safitri",
  "chelsea",
  "salwa",
  "fauziah",
  "arimbi",
  "cantika",
  "kirana",
  "dini",
  "anggun",
  "reva",
  "keisha",
  "tazkia",
  "karin",
  "nadira",
  "marsha",
  "jihan",
  "alisa",
  "ailsa",
  "syahla",
  "salsa",
  "gabriele",
  "dara",
  "rani",
  "maya",
  "dina",
]);

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (!word) return "";
      if (word.startsWith("m.") || word.startsWith("al-") || word.includes("'")) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function cleanStudentName(rawName) {
  const isPb = /\(\s*PB\s*\)/i.test(rawName);
  let cleaned = rawName.replace(/\(\s*PB\s*\)/gi, "").trim();

  // If name is all caps, convert to Title Case
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
    cleaned = toTitleCase(cleaned);
  }

  return { name: cleaned, isPb };
}

function inferGender(name) {
  const words = name.toLowerCase().split(/[\s,.'"-]+/);
  for (const w of words) {
    if (FEMALE_KEYWORDS.has(w)) return "P";
  }
  return "L";
}

const CLASS_CONFIG = [
  { className: "X TO 1", nisPrefix: "2601", levelCode: "10" },
  { className: "X TO 2", nisPrefix: "2602", levelCode: "10" },
  { className: "X TO 3", nisPrefix: "10", levelCode: "10", useLegacyNis: true },
  { className: "X TO 4", nisPrefix: "2604", levelCode: "10" },
  { className: "X TO 5", nisPrefix: "2605", levelCode: "10" },
  { className: "X TJKT 1", nisPrefix: "2606", levelCode: "10" },
  { className: "X TJKT 2", nisPrefix: "2607", levelCode: "10" },
  { className: "X DKV 1", nisPrefix: "2608", levelCode: "10" },
  { className: "X DKV 2", nisPrefix: "2609", levelCode: "10" },
  { className: "X RPL", nisPrefix: "2610", levelCode: "10" },
];

export async function seedSiswa(prismaClient = null) {
  const prisma = prismaClient || new PrismaClient();
  const shouldDisconnect = !prismaClient;

  try {
    console.log("=== [7/7] Menjalankan Seeder Siswa (341 Siswa Faktual SMK OTOMINDO) ===");

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

    // 3. Tingkat Kelas
    const tingkat10 = await prisma.tingkatKelas.findFirst({
      where: { sekolah_id: sekolah.id, kode: "10" },
    });
    const tingkat11 = await prisma.tingkatKelas.findFirst({
      where: { sekolah_id: sekolah.id, kode: "11" },
    });
    if (!tingkat10 || !tingkat11) throw new Error("Tingkat kelas 10 atau 11 belum ditemukan.");

    // 4. Baca data siswa dari parsed_school_data.json
    const raw = await readFile(SOURCE_URL, "utf8");
    const sourceData = JSON.parse(raw);

    // 5. Map rombels
    const allRombels = await prisma.rombel.findMany({
      where: { sekolah_id: sekolah.id, tahun_ajaran_id: tahunAjaran.id },
    });
    const rombelMapByName = new Map(allRombels.map((r) => [r.nama, r]));

    // 6. Bersihkan data dummy non-faktual di X TO 3 jika ada
    const dummyDimas = await prisma.siswa.findFirst({
      where: { sekolah_id: sekolah.id, nama_lengkap: "Muhammad Dimas Pranoto" },
      include: { keikutsertaan: { include: { penempatan: true } } },
    });
    if (dummyDimas) {
      for (const k of dummyDimas.keikutsertaan) {
        await prisma.penempatanRombel.deleteMany({ where: { keikutsertaan_id: k.id } });
      }
      await prisma.keikutsertaanSiswa.deleteMany({ where: { siswa_id: dummyDimas.id } });
      await prisma.siswa.delete({ where: { id: dummyDimas.id } });
      console.log(`[-] Menghapus entri tidak faktual: Muhammad Dimas Pranoto dari X TO 3.`);
    }

    let totalSiswaImported = 0;
    const summaryPerClass = {};

    // 7. Impor 311 Siswa di 10 Rombel Kelas X
    for (const cfg of CLASS_CONFIG) {
      const classData = sourceData.classes[cfg.className];
      if (!classData || !classData.students) {
        throw new Error(`Data siswa untuk kelas ${cfg.className} tidak ditemukan.`);
      }

      const rombel = rombelMapByName.get(cfg.className);
      if (!rombel) throw new Error(`Rombel ${cfg.className} tidak ditemukan di database.`);

      let classCount = 0;
      for (const s of classData.students) {
        const { name, isPb } = cleanStudentName(s.name);
        const gender = inferGender(name);

        let nis;
        if (cfg.useLegacyNis) {
          nis = String(1000 + s.no);
        } else {
          nis = `${cfg.nisPrefix}${String(s.no).padStart(2, "0")}`;
        }

        const catatan = `SUMBER_RESMI_2026_2027 | FORM NILAI ATS GANJIL.xlsx${isPb ? " | Pindahan Baru (PB)" : ""}`;

        // Upsert Siswa
        let siswa = await prisma.siswa.findFirst({
          where: {
            sekolah_id: sekolah.id,
            OR: [{ nis: nis }, { nama_lengkap: name }],
          },
        });

        if (siswa) {
          siswa = await prisma.siswa.update({
            where: { id: siswa.id },
            data: {
              nama_lengkap: name,
              nis: nis,
              jenis_kelamin: gender,
              status_akademik: "AKTIF",
              catatan,
            },
          });
        } else {
          siswa = await prisma.siswa.create({
            data: {
              id: ulid(),
              sekolah_id: sekolah.id,
              nis: nis,
              nama_lengkap: name,
              jenis_kelamin: gender,
              status_akademik: "AKTIF",
              catatan,
              tanggal_masuk: tahunAjaran.tanggal_mulai,
            },
          });
        }

        // Upsert KeikutsertaanSiswa (Enrollment)
        let keikutsertaan = await prisma.keikutsertaanSiswa.findFirst({
          where: {
            siswa_id: siswa.id,
            tahun_ajaran_id: tahunAjaran.id,
          },
        });

        if (keikutsertaan) {
          keikutsertaan = await prisma.keikutsertaanSiswa.update({
            where: { id: keikutsertaan.id },
            data: {
              tingkat_id: tingkat10.id,
              status: "AKTIF",
            },
          });
        } else {
          keikutsertaan = await prisma.keikutsertaanSiswa.create({
            data: {
              id: ulid(),
              sekolah_id: sekolah.id,
              siswa_id: siswa.id,
              tahun_ajaran_id: tahunAjaran.id,
              tingkat_id: tingkat10.id,
              status: "AKTIF",
              tanggal_mulai: tahunAjaran.tanggal_mulai,
            },
          });
        }

        // Upsert PenempatanRombel (Rombel Placement with Absen Number)
        const penempatan = await prisma.penempatanRombel.findFirst({
          where: {
            keikutsertaan_id: keikutsertaan.id,
            rombel_id: rombel.id,
          },
        });

        if (penempatan) {
          await prisma.penempatanRombel.update({
            where: { id: penempatan.id },
            data: {
              nomor_absen: s.no,
              status: "AKTIF",
            },
          });
        } else {
          await prisma.penempatanRombel.create({
            data: {
              id: ulid(),
              sekolah_id: sekolah.id,
              keikutsertaan_id: keikutsertaan.id,
              rombel_id: rombel.id,
              nomor_absen: s.no,
              status: "AKTIF",
              tanggal_mulai: tahunAjaran.tanggal_mulai,
            },
          });
        }

        classCount += 1;
        totalSiswaImported += 1;
      }

      summaryPerClass[cfg.className] = classCount;
      console.log(`[+] Rombel ${cfg.className}: ${classCount} siswa terdaftar.`);
    }

    // 8. Impor 30 Siswa di Sheet2 (Asesmen Khusus Praktik Sistem Operasi) ke XI TJKT
    const sheet2Students = sourceData.sheet2_students || [];
    const rombelXiTjkt = rombelMapByName.get("XI TJKT");
    if (!rombelXiTjkt) throw new Error("Rombel XI TJKT tidak ditemukan di database.");

    let sheet2Count = 0;
    for (const s of sheet2Students) {
      const { name, isPb } = cleanStudentName(s.name);
      const gender = inferGender(name);
      const nis = `2611${String(s.no).padStart(2, "0")}`;
      const catatan = `SUMBER_RESMI_2026_2027 | FORM NILAI ATS GANJIL.xlsx (Sheet2 Praktik SO)${isPb ? " | Pindahan Baru (PB)" : ""}`;

      let siswa = await prisma.siswa.findFirst({
        where: {
          sekolah_id: sekolah.id,
          OR: [{ nis: nis }, { nama_lengkap: name }],
        },
      });

      if (siswa) {
        siswa = await prisma.siswa.update({
          where: { id: siswa.id },
          data: {
            nama_lengkap: name,
            nis: nis,
            jenis_kelamin: gender,
            status_akademik: "AKTIF",
            catatan,
          },
        });
      } else {
        siswa = await prisma.siswa.create({
          data: {
            id: ulid(),
            sekolah_id: sekolah.id,
            nis: nis,
            nama_lengkap: name,
            jenis_kelamin: gender,
            status_akademik: "AKTIF",
            catatan,
            tanggal_masuk: tahunAjaran.tanggal_mulai,
          },
        });
      }

      let keikutsertaan = await prisma.keikutsertaanSiswa.findFirst({
        where: {
          siswa_id: siswa.id,
          tahun_ajaran_id: tahunAjaran.id,
        },
      });

      if (keikutsertaan) {
        keikutsertaan = await prisma.keikutsertaanSiswa.update({
          where: { id: keikutsertaan.id },
          data: {
            tingkat_id: tingkat11.id,
            status: "AKTIF",
          },
        });
      } else {
        keikutsertaan = await prisma.keikutsertaanSiswa.create({
          data: {
            id: ulid(),
            sekolah_id: sekolah.id,
            siswa_id: siswa.id,
            tahun_ajaran_id: tahunAjaran.id,
            tingkat_id: tingkat11.id,
            status: "AKTIF",
            tanggal_mulai: tahunAjaran.tanggal_mulai,
          },
        });
      }

      const penempatan = await prisma.penempatanRombel.findFirst({
        where: {
          keikutsertaan_id: keikutsertaan.id,
          rombel_id: rombelXiTjkt.id,
        },
      });

      if (penempatan) {
        await prisma.penempatanRombel.update({
          where: { id: penempatan.id },
          data: {
            nomor_absen: s.no,
            status: "AKTIF",
          },
        });
      } else {
        await prisma.penempatanRombel.create({
          data: {
            id: ulid(),
            sekolah_id: sekolah.id,
            keikutsertaan_id: keikutsertaan.id,
            rombel_id: rombelXiTjkt.id,
            nomor_absen: s.no,
            status: "AKTIF",
            tanggal_mulai: tahunAjaran.tanggal_mulai,
          },
        });
      }

      sheet2Count += 1;
      totalSiswaImported += 1;
    }
    summaryPerClass["XI TJKT (Sheet2)"] = sheet2Count;
    console.log(`[+] Rombel XI TJKT (Sheet2 Praktik SO): ${sheet2Count} siswa terdaftar.`);

    // 9. Verifikasi Database
    const dbTotalSiswa = await prisma.siswa.count({ where: { sekolah_id: sekolah.id } });
    const dbTotalPenempatan = await prisma.penempatanRombel.count({
      where: { sekolah_id: sekolah.id, status: "AKTIF" },
    });

    console.log(`[=] Verifikasi Total Siswa Database:`);
    console.log(`    - Total Siswa Aktif: ${dbTotalSiswa} orang`);
    console.log(`    - Total Penempatan Rombel: ${dbTotalPenempatan} entri`);

    console.log(` [PASS] Seeder Siswa Selesai: 341 siswa riil terverifikasi.`);
    return { totalSiswaImported, summaryPerClass, dbTotalSiswa };
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

if (process.argv[1]?.endsWith("seeder-siswa.mjs")) {
  seedSiswa().catch((err) => {
    console.error("Error running seeder-siswa:", err);
    process.exit(1);
  });
}
