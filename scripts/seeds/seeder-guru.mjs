import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { ulid } from "ulidx";
import bcrypt from "bcryptjs";

const SOURCE_URL = new URL("../data/jadwal-otomindo-2026-2027.json", import.meta.url);
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("GuruOtomindo2026!", 10);

export async function seedGuru(prismaClient = null) {
  const prisma = prismaClient || new PrismaClient();
  const shouldDisconnect = !prismaClient;

  try {
    console.log("=== [2/7] Menjalankan Seeder Guru (38 Guru SMK OTOMINDO) ===");

    const sekolah = await prisma.sekolah.findFirst({
      where: { nama: "SMK OTOMINDO" },
    });
    if (!sekolah)
      throw new Error("Sekolah SMK OTOMINDO tidak ditemukan. Jalankan seeder-sekolah dulu.");
    const sekolahId = sekolah.id;

    const raw = await readFile(SOURCE_URL, "utf8");
    const source = JSON.parse(raw);
    const teacherDataList = source.guru;

    console.log(`Memuat ${teacherDataList.length} guru dari direktori data resmi...`);

    const teacherMapByCode = new Map();

    for (const g of teacherDataList) {
      const code = g.kode;
      const formattedName = `${g.gelar_depan ? g.gelar_depan + " " : ""}${g.nama_lengkap}${g.gelar_belakang ? ", " + g.gelar_belakang : ""}`;

      let user = null;
      let guru = null;

      // Khusus Guru Kode 21 (Eri Chandra A, S.Kom): Wajib bind ke akun eksisting guru_chandra
      if (code === 21) {
        user = await prisma.pengguna.findFirst({
          where: {
            OR: [{ username: "guru_chandra" }, { id: "01M2XXYD26H385F6RAW5PB6FBK" }],
          },
        });

        if (!user) {
          throw new Error(
            "Akun guru_chandra (01M2XXYD26H385F6RAW5PB6FBK) tidak ditemukan di database!"
          );
        }

        guru = await prisma.guru.findFirst({
          where: { pengguna_id: user.id },
        });

        if (!guru) {
          guru = await prisma.guru.create({
            data: {
              id: "01M2XXYD299G35BZDH2NKFCM3P",
              sekolah_id: sekolahId,
              pengguna_id: user.id,
              nama_lengkap: formattedName,
              gelar_depan: g.gelar_depan,
              gelar_belakang: g.gelar_belakang,
              jenis_kelamin: g.jenis_kelamin || "L",
              status_kepegawaian: "TETAP",
              status_aktif: true,
              status_lifecycle: "AKTIF",
              catatan: "KODE_GURU:21",
            },
          });
        } else {
          guru = await prisma.guru.update({
            where: { id: guru.id },
            data: {
              sekolah_id: sekolahId,
              nama_lengkap: formattedName,
              catatan: "KODE_GURU:21",
              status_aktif: true,
              status_lifecycle: "AKTIF",
            },
          });
        }

        // Pastikan Keanggotaan Sekolah
        await prisma.keanggotaanSekolah.upsert({
          where: {
            pengguna_id_sekolah_id: {
              pengguna_id: user.id,
              sekolah_id: sekolahId,
            },
          },
          update: {
            peran_dasar_di_tenant: "TEACHER",
            status_keanggotaan: "ACTIVE",
            is_owner: true,
          },
          create: {
            id: ulid(),
            pengguna_id: user.id,
            sekolah_id: sekolahId,
            peran_dasar_di_tenant: "TEACHER",
            status_keanggotaan: "ACTIVE",
            is_owner: true,
          },
        });

        teacherMapByCode.set(code, { user, guru, code });
        console.log(`[=] Guru #21: ${formattedName} (Bound to guru_chandra)`);
        continue;
      }

      // Untuk 37 guru lainnya
      const safeNameSlug = g.nama_lengkap
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 12);
      const username = `guru.${safeNameSlug}_${code}`;

      user = await prisma.pengguna.findFirst({
        where: {
          OR: [{ username: username }, { email: `${username}@otomindo.sch.id` }],
        },
      });

      if (!user) {
        user = await prisma.pengguna.create({
          data: {
            id: ulid(),
            sekolah_id: sekolahId,
            username: username,
            email: `${username}@otomindo.sch.id`,
            password_hash: DEFAULT_PASSWORD_HASH,
            nama_lengkap: formattedName,
            peran_dasar: "TEACHER",
            status_akun: "AKTIF",
            tipe_lisensi: "FREEMIUM",
          },
        });
      } else {
        await prisma.pengguna.update({
          where: { id: user.id },
          data: {
            nama_lengkap: formattedName,
            sekolah_id: sekolahId,
            status_akun: "AKTIF",
          },
        });
      }

      guru = await prisma.guru.findFirst({
        where: { pengguna_id: user.id },
      });

      if (!guru) {
        guru = await prisma.guru.create({
          data: {
            id: ulid(),
            sekolah_id: sekolahId,
            pengguna_id: user.id,
            nama_lengkap: formattedName,
            gelar_depan: g.gelar_depan,
            gelar_belakang: g.gelar_belakang,
            jenis_kelamin: g.jenis_kelamin || "L",
            status_kepegawaian: "TETAP",
            status_aktif: true,
            status_lifecycle: "AKTIF",
            catatan: `KODE_GURU:${code}`,
          },
        });
      } else {
        await prisma.guru.update({
          where: { id: guru.id },
          data: {
            nama_lengkap: formattedName,
            catatan: `KODE_GURU:${code}`,
            status_aktif: true,
            status_lifecycle: "AKTIF",
          },
        });
      }

      // Keanggotaan Sekolah
      await prisma.keanggotaanSekolah.upsert({
        where: {
          pengguna_id_sekolah_id: {
            pengguna_id: user.id,
            sekolah_id: sekolahId,
          },
        },
        update: {
          peran_dasar_di_tenant: "TEACHER",
          status_keanggotaan: "ACTIVE",
        },
        create: {
          id: ulid(),
          pengguna_id: user.id,
          sekolah_id: sekolahId,
          peran_dasar_di_tenant: "TEACHER",
          status_keanggotaan: "ACTIVE",
          is_owner: false,
        },
      });

      // Penugasan Jabatan Kepala Sekolah untuk Guru Kode 1
      if (code === 1) {
        const jabatan = await prisma.jabatan.upsert({
          where: {
            sekolah_id_kode_jabatan: {
              sekolah_id: sekolahId,
              kode_jabatan: "HEADMASTER",
            },
          },
          update: {
            nama_jabatan: "Kepala Sekolah",
            tingkat_akses: "SCHOOL_WIDE",
          },
          create: {
            id: ulid(),
            sekolah_id: sekolahId,
            kode_jabatan: "HEADMASTER",
            nama_jabatan: "Kepala Sekolah",
            tingkat_akses: "SCHOOL_WIDE",
          },
        });

        const existingPenugasan = await prisma.penugasanJabatan.findFirst({
          where: {
            sekolah_id: sekolahId,
            jabatan_id: jabatan.id,
            personil_id: user.id,
          },
        });

        if (!existingPenugasan) {
          await prisma.penugasanJabatan.create({
            data: {
              id: ulid(),
              sekolah_id: sekolahId,
              jabatan_id: jabatan.id,
              personil_id: user.id,
              berlaku_mulai: new Date("2026-07-01"),
              status: "AKTIF",
              catatan: "Kepala Sekolah Resmi SMK OTOMINDO",
            },
          });
          console.log(`[+] Penugasan Jabatan: ${formattedName} sebagai KEPALA_SEKOLAH`);
        }
      }

      teacherMapByCode.set(code, { user, guru, code });
    }

    console.log(` [PASS] Seeder Guru Selesai: ${teacherMapByCode.size} guru terverifikasi.`);
    return teacherMapByCode;
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

// Run directly if invoked from CLI
if (process.argv[1]?.endsWith("seeder-guru.mjs")) {
  seedGuru().catch((err) => {
    console.error("Error running seeder-guru:", err);
    process.exit(1);
  });
}
