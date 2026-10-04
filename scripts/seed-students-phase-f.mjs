import { PrismaClient } from "@prisma/client";
import { ulid } from "ulidx";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Flag dry run
const isDryRun = process.argv.includes("--dry-run");

// Inferensi jenis kelamin Indonesia untuk nama siswa
function inferGender(name) {
  const n = name.toLowerCase();
  const femaleMarkers = [
    "putri",
    "dewi",
    "ayu",
    "lestari",
    "nirmala",
    "siti",
    "indah",
    "safitri",
    "anisa",
    "annisa",
    "alya",
    "aulia",
    "zahra",
    "amelia",
    "nadia",
    "fitri",
    "maharani",
    "cinta",
    "salwa",
    "anggita",
    "fani",
    "friska",
    "gendis",
    "intan",
    "niken",
    "syifa",
    "vanesya",
    "chika",
    "syahla",
    "denis",
    "echa",
    "nayla",
    "aurel",
    "mutiara",
    "clara",
    "jesika",
    "jessica",
    "tiara",
    "bella",
    "berlian",
    "carmelita",
    "dhea",
    "eva",
    "fadilla",
    "fadillah",
    "hana",
    "helena",
    "karen",
    "keysha",
    "khansa",
    "maritza",
    "meylani",
    "nadila",
    "najwa",
    "novia",
    "nurul",
    "oktavia",
    "oktaviani",
    "rachma",
    "rahma",
    "rani",
    "regina",
    "renata",
    "riska",
    "sabrina",
    "salma",
    "salsabila",
    "shafa",
    "shafira",
    "sheila",
    "silvia",
    "sri",
    "tasya",
    "valencia",
    "widya",
    "wulan",
    "yasmin",
    "yuliana",
  ];
  const words = n.split(/\s+/);
  for (const w of words) {
    if (femaleMarkers.includes(w)) {
      return "P";
    }
  }
  return "L";
}

async function main() {
  console.log("==================================================================");
  console.log(`=== STAGE 11.7: SEED STUDENTS PHASE F (KELAS XI & XII) ===`);
  console.log(
    `Mode: ${isDryRun ? "DRY-RUN (Simulasi tanpa mutasi)" : "LIVE EXECUTION (Simpan ke Database)"}`
  );
  console.log("==================================================================\n");

  const rosterPath =
    "C:\\Users\\vitam\\.gemini\\antigravity-cli\\brain\\13858c6f-1476-409b-8a3a-132d76ec1747\\scratch\\excel_detailed_roster.json";
  if (!fs.existsSync(rosterPath)) {
    throw new Error(`File roster ${rosterPath} tidak ditemukan!`);
  }
  const rosterData = JSON.parse(fs.readFileSync(rosterPath, "utf-8"));

  // 1. Dapatkan Context Sekolah & Tahun Ajaran Definitif
  const sekolah = await prisma.sekolah.findFirst();
  if (!sekolah) throw new Error("Sekolah aktif tidak ditemukan!");
  const sekolahId = sekolah.id;

  const tahunAjaran = await prisma.tahunAjaran.findFirst({
    where: { sekolah_id: sekolahId, status: "AKTIF" },
  });
  if (!tahunAjaran) throw new Error("Tahun Ajaran aktif tidak ditemukan!");
  const tahunAjaranId = tahunAjaran.id;

  console.log(`Tenant Sekolah : ${sekolah.nama} (${sekolahId})`);
  console.log(`Tahun Ajaran   : ${tahunAjaran.nama} (${tahunAjaranId})\n`);

  // Dapatkan Tingkat Kelas
  const tingkatList = await prisma.tingkatKelas.findMany({
    where: { sekolah_id: sekolahId },
  });
  const tingkatMap = new Map(tingkatList.map((t) => [t.kode, t.id]));
  const tingkatXId = tingkatMap.get("10") || tingkatMap.get("X");
  const tingkatXIId = tingkatMap.get("11") || tingkatMap.get("XI");
  const tingkatXIIId = tingkatMap.get("12") || tingkatMap.get("XII");

  // Dapatkan seluruh Rombel aktif
  const rombelList = await prisma.rombel.findMany({
    where: { sekolah_id: sekolahId, status: "AKTIF" },
  });
  const rombelMap = new Map(rombelList.map((r) => [r.nama, r]));

  console.log(`Rombel Aktif Terdaftar: ${rombelList.length} rombel\n`);

  let addedStudentsCount = 0;
  let addedEnrollmentsCount = 0;
  let addedPlacementsCount = 0;

  // =========================================================================
  // LANGKAH 1: REKONSILIASI 30 SISWA SHEET2
  // Pindahkan 30 siswa dari rombel XI TJKT ke rombel khusus "XI TJKT 2"
  // =========================================================================
  console.log("--- LANGKAH 1: Rekonsiliasi Rombel 30 Siswa Sheet2 ---");
  const rombelXiTjktUtama = rombelMap.get("XI TJKT");
  if (!rombelXiTjktUtama) {
    throw new Error("Rombel XI TJKT utama tidak ditemukan di database!");
  }

  // Cek / Buat rombel "XI TJKT 2" untuk memisahkan 30 siswa praktik Sheet2
  let rombelSheet2 = rombelMap.get("XI TJKT 2");
  if (!rombelSheet2) {
    console.log("Membuat entitas rombel baru: 'XI TJKT 2' untuk alokasi 30 siswa Sheet2...");
    if (!isDryRun) {
      rombelSheet2 = await prisma.rombel.create({
        data: {
          id: ulid(),
          sekolah_id: sekolahId,
          tahun_ajaran_id: tahunAjaranId,
          tingkat_id: tingkatXIId,
          program_id: rombelXiTjktUtama.program_id,
          nama: "XI TJKT 2",
          kode: "RBL-XI-TJKT-2",
          kapasitas: 36,
          status: "AKTIF",
          catatan: "Rombel alokasi siswa Sheet2 (Praktik Sistem Operasi)",
        },
      });
      rombelMap.set("XI TJKT 2", rombelSheet2);
    } else {
      rombelSheet2 = { id: "dry-run-xi-tjkt-2", nama: "XI TJKT 2" };
    }
  }

  // Ambil penempatan aktif di rombel XI TJKT saat ini (30 siswa Sheet2)
  const currentXiTjktPlacements = await prisma.penempatanRombel.findMany({
    where: {
      rombel_id: rombelXiTjktUtama.id,
      status: "AKTIF",
    },
  });
  console.log(`Ditemukan ${currentXiTjktPlacements.length} penempatan siswa Sheet2 di 'XI TJKT'.`);

  if (!isDryRun && currentXiTjktPlacements.length > 0) {
    await prisma.penempatanRombel.updateMany({
      where: {
        rombel_id: rombelXiTjktUtama.id,
        status: "AKTIF",
      },
      data: {
        rombel_id: rombelSheet2.id,
      },
    });
    console.log(
      `Berhasil mereposisi ${currentXiTjktPlacements.length} siswa Sheet2 ke rombel '${rombelSheet2.nama}'.\n`
    );
  } else {
    console.log(
      `[DRY-RUN] Simulasi reposisi ${currentXiTjktPlacements.length} siswa ke '${rombelSheet2.nama}'.\n`
    );
  }

  // =========================================================================
  // LANGKAH 2: REKONSILIASI 1 SISWA GAP KELAS X (X TJKT 1)
  // Siswa: Flantzaa Saqyah Rayfy Tameno (absen #9)
  // =========================================================================
  console.log("--- LANGKAH 2: Rekonsiliasi 1 Siswa Gap X TJKT 1 ---");
  const rombelXTjkt1 = rombelMap.get("X TJKT 1");
  if (!rombelXTjkt1) throw new Error("Rombel X TJKT 1 tidak ditemukan!");

  const flantzaaName = "Flantzaa Saqyah Rayfy Tameno";
  const existingFlantzaa = await prisma.siswa.findFirst({
    where: { sekolah_id: sekolahId, nama_lengkap: flantzaaName },
  });

  if (!existingFlantzaa) {
    console.log(`Menambahkan siswa gap: ${flantzaaName} (Absen #9) ke X TJKT 1...`);
    if (!isDryRun) {
      const siswaId = ulid();
      const enrollmentId = ulid();
      const placementId = ulid();

      await prisma.siswa.create({
        data: {
          id: siswaId,
          sekolah_id: sekolahId,
          nis: null,
          nisn: null,
          nama_lengkap: flantzaaName,
          jenis_kelamin: "P",
          status_akademik: "AKTIF",
          tanggal_masuk: new Date("2026-07-13"),
          catatan: "Rekonsiliasi data master siswa Sheet X",
        },
      });

      await prisma.keikutsertaanSiswa.create({
        data: {
          id: enrollmentId,
          sekolah_id: sekolahId,
          siswa_id: siswaId,
          tahun_ajaran_id: tahunAjaranId,
          tingkat_id: tingkatXId,
          status: "AKTIF",
          tanggal_mulai: new Date("2026-07-13"),
        },
      });

      await prisma.penempatanRombel.create({
        data: {
          id: placementId,
          sekolah_id: sekolahId,
          keikutsertaan_id: enrollmentId,
          rombel_id: rombelXTjkt1.id,
          nomor_absen: 9,
          status: "AKTIF",
          tanggal_mulai: new Date("2026-07-13"),
        },
      });
    }
    addedStudentsCount++;
    addedEnrollmentsCount++;
    addedPlacementsCount++;
    console.log(`Siswa gap ${flantzaaName} berhasil ditambahkan ke X TJKT 1.\n`);
  } else {
    console.log(`Siswa ${flantzaaName} sudah ada di database.\n`);
  }

  // =========================================================================
  // LANGKAH 3: IMPOR 205 SISWA REGULER KELAS XI (6 ROMBEL)
  // =========================================================================
  console.log("--- LANGKAH 3: Impor 205 Siswa Reguler Kelas XI ---");
  const xiRombelMapping = {
    "XI TO 1": "XI TO 1",
    "XI TO 2": "XI TO 2",
    "XI TO 3": "XI TO 3",
    "XI TJKT 1": "XI TJKT",
    "XI DKV 1": "XI DKV",
    "XI RPL": "XI RPL",
  };

  for (const block of rosterData.XI) {
    const targetRombelName = xiRombelMapping[block.class_name] || block.class_name;
    const targetRombel = rombelMap.get(targetRombelName);
    if (!targetRombel) {
      throw new Error(`Rombel target ${targetRombelName} tidak ditemukan di database!`);
    }

    console.log(`Memproses ${block.students.length} siswa untuk rombel '${targetRombel.nama}'...`);

    // Ambil penempatan siswa eksisting di rombel ini
    const existingPlacementsInRombel = await prisma.penempatanRombel.findMany({
      where: { rombel_id: targetRombel.id, status: "AKTIF" },
      include: {
        keikutsertaan: {
          include: { siswa: true },
        },
      },
    });
    const placedStudentNames = new Set(
      existingPlacementsInRombel.map((p) => p.keikutsertaan.siswa.nama_lengkap.trim().toLowerCase())
    );

    for (const s of block.students) {
      const studentName = s.name.trim();

      // Cek apakah siswa ini sudah ditempatkan di rombel target ini
      if (!placedStudentNames.has(studentName.toLowerCase())) {
        if (!isDryRun) {
          const sId = ulid();
          const eId = ulid();
          const pId = ulid();

          await prisma.siswa.create({
            data: {
              id: sId,
              sekolah_id: sekolahId,
              nis: null,
              nisn: null,
              nama_lengkap: studentName,
              jenis_kelamin: inferGender(studentName),
              status_akademik: "AKTIF",
              tanggal_masuk: new Date("2026-07-13"),
              catatan: s.is_pb ? "PB (Pindahan/Beasiswa)" : null,
            },
          });

          await prisma.keikutsertaanSiswa.create({
            data: {
              id: eId,
              sekolah_id: sekolahId,
              siswa_id: sId,
              tahun_ajaran_id: tahunAjaranId,
              tingkat_id: tingkatXIId,
              status: "AKTIF",
              tanggal_mulai: new Date("2026-07-13"),
            },
          });

          await prisma.penempatanRombel.create({
            data: {
              id: pId,
              sekolah_id: sekolahId,
              keikutsertaan_id: eId,
              rombel_id: targetRombel.id,
              nomor_absen: s.no,
              status: "AKTIF",
              tanggal_mulai: new Date("2026-07-13"),
            },
          });
        }
        addedStudentsCount++;
        addedEnrollmentsCount++;
        addedPlacementsCount++;
      }
    }
  }
  console.log(`Selesai memproses Kelas XI. Total siswa baru ditambahkan: ${addedStudentsCount}\n`);

  // =========================================================================
  // LANGKAH 4: IMPOR 153 SISWA REGULER KELAS XII (5 ROMBEL)
  // =========================================================================
  console.log("--- LANGKAH 4: Impor 153 Siswa Reguler Kelas XII ---");
  const xiiRombelMapping = {
    "XII TO 1": "XII TKRO 1",
    "XII TO 2": "XII TKRO 2",
    "XII TJKT 1": "XII TKJ 1",
    "XII DKV": "XII DKV 1",
    "XII RPL": "XII RPL",
  };

  let xiiAdded = 0;
  for (const block of rosterData.XII) {
    const targetRombelName = xiiRombelMapping[block.class_name] || block.class_name;
    const targetRombel = rombelMap.get(targetRombelName);
    if (!targetRombel) {
      throw new Error(`Rombel target ${targetRombelName} tidak ditemukan di database!`);
    }

    console.log(`Memproses ${block.students.length} siswa untuk rombel '${targetRombel.nama}'...`);

    // Ambil penempatan siswa eksisting di rombel ini
    const existingPlacementsInRombel = await prisma.penempatanRombel.findMany({
      where: { rombel_id: targetRombel.id, status: "AKTIF" },
      include: {
        keikutsertaan: {
          include: { siswa: true },
        },
      },
    });
    const placedStudentNames = new Set(
      existingPlacementsInRombel.map((p) => p.keikutsertaan.siswa.nama_lengkap.trim().toLowerCase())
    );

    for (const s of block.students) {
      const studentName = s.name.trim();

      // Cek apakah siswa ini sudah ditempatkan di rombel target ini
      if (!placedStudentNames.has(studentName.toLowerCase())) {
        if (!isDryRun) {
          const sId = ulid();
          const eId = ulid();
          const pId = ulid();

          await prisma.siswa.create({
            data: {
              id: sId,
              sekolah_id: sekolahId,
              nis: null,
              nisn: null,
              nama_lengkap: studentName,
              jenis_kelamin: inferGender(studentName),
              status_akademik: "AKTIF",
              tanggal_masuk: new Date("2026-07-13"),
              catatan: s.is_pb ? "PB (Pindahan/Beasiswa)" : null,
            },
          });

          await prisma.keikutsertaanSiswa.create({
            data: {
              id: eId,
              sekolah_id: sekolahId,
              siswa_id: sId,
              tahun_ajaran_id: tahunAjaranId,
              tingkat_id: tingkatXIIId,
              status: "AKTIF",
              tanggal_mulai: new Date("2026-07-13"),
            },
          });

          await prisma.penempatanRombel.create({
            data: {
              id: pId,
              sekolah_id: sekolahId,
              keikutsertaan_id: eId,
              rombel_id: targetRombel.id,
              nomor_absen: s.no,
              status: "AKTIF",
              tanggal_mulai: new Date("2026-07-13"),
            },
          });
        }
        addedStudentsCount++;
        addedEnrollmentsCount++;
        addedPlacementsCount++;
        xiiAdded++;
      }
    }
  }
  console.log(`Selesai memproses Kelas XII. Ditambahkan ${xiiAdded} siswa baru.\n`);

  console.log("==================================================================");
  console.log("=== RINGKASAN EKSEKUSI IMPOR SISWA PHASE F ===");
  console.log(`Siswa Baru Ditambahkan       : ${addedStudentsCount}`);
  console.log(`Enrollment Baru Ditambahkan  : ${addedEnrollmentsCount}`);
  console.log(`Penempatan Baru Ditambahkan  : ${addedPlacementsCount}`);
  console.log("==================================================================");
}

main()
  .catch((e) => {
    console.error("ERROR EXECUTING IMPORT:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
