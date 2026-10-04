import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { ulid } from "ulidx";

const prisma = new PrismaClient();
const SOURCE_URL = new URL("./data/jadwal-otomindo-2026-2027.json", import.meta.url);

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\b(s\.pd|s\.kom|m\.pd|se|mm|sp|mt|s\.ds|s\.sos\.i|s\.pd\.i|a\.md|drs|dr)\b/gi, "")
    .replace(/\./g, "")
    .trim()
    .replace(/\s+/g, " ");
}

async function main() {
  console.log("================================================================================");
  console.log("   REKONSILIASI & PENGHAPUSAN DATA GANDA GURU SMK OTOMINDO");
  console.log("================================================================================");

  const raw = await readFile(SOURCE_URL, "utf8");
  const source = JSON.parse(raw);
  const jsonTeachers = source.guru;
  const jsonRombels = source.rombel;

  const smk = await prisma.sekolah.findFirst({
    where: { OR: [{ nama: "SMK OTOMINDO" }, { id: "01M2XXYD227F9S3H985FH53GMF" }] },
  });
  if (!smk) throw new Error("Sekolah SMK Otomindo tidak ditemukan.");

  const tahunAjaran = await prisma.tahunAjaran.findFirst({
    where: { sekolah_id: smk.id, nama: "2026/2027", status: "AKTIF" },
  });
  if (!tahunAjaran) throw new Error("Tahun ajaran 2026/2027 tidak ditemukan.");

  const semester = await prisma.semester.findFirst({
    where: { sekolah_id: smk.id, tahun_ajaran_id: tahunAjaran.id, kode: "GANJIL" },
  });
  if (!semester) throw new Error("Semester Ganjil tidak ditemukan.");

  // Ambil semua guru di SMK Otomindo
  let allGurus = await prisma.guru.findMany({
    where: { sekolah_id: smk.id },
    include: {
      pengguna: true,
      penugasan_mengajar: true,
      penugasan_wali: true,
      jadwal_pelajaran: true,
    },
  });

  console.log(`Jumlah guru di database saat ini: ${allGurus.length}`);

  for (const jt of jsonTeachers) {
    const code = jt.kode;
    const formattedName = `${jt.gelar_depan ? jt.gelar_depan + " " : ""}${jt.nama_lengkap}${jt.gelar_belakang ? ", " + jt.gelar_belakang : ""}`;

    // Refresh matches from DB
    const currentGurus = await prisma.guru.findMany({
      where: { sekolah_id: smk.id },
      include: { pengguna: true },
    });

    const matches = currentGurus.filter((g) => {
      const m = g.catatan
        ? g.catatan.match(/KODE_GURU:(\d+)/i) || g.catatan.match(/Kode guru (\d+)/i)
        : null;
      if (m && Number(m[1]) === code) return true;
      const cleanDB = normalizeName(g.nama_lengkap);
      const cleanJSON = normalizeName(jt.nama_lengkap);
      return cleanDB === cleanJSON;
    });

    // 1. Tentukan Canonical Guru (yang memiliki akun Pengguna)
    let canonical = matches.find((g) => g.pengguna_id !== null);

    // Kasus khusus Kode 19 (Nur Azizah Ayunda): hubungkan ke akun pengguna jika belum terhubung
    if (!canonical && code === 19) {
      const user19 = await prisma.pengguna.findFirst({
        where: {
          OR: [
            { username: "guru.nurazizahayu_19" },
            { email: "guru.nurazizahayu_19@otomindo.sch.id" },
          ],
        },
      });
      if (user19 && matches[0]) {
        canonical = await prisma.guru.update({
          where: { id: matches[0].id },
          data: {
            pengguna_id: user19.id,
            status_kepegawaian: "TETAP",
            catatan: `KODE_GURU:${code}`,
          },
          include: { pengguna: true },
        });
        console.log(`  -> Menautkan Akun Pengguna Kode 19 ke Guru ID: ${canonical.id}`);
      }
    }

    if (!canonical) {
      console.warn(`  [WARNING] Tidak ditemukan record Canonical untuk kode ${code} (${jt.nama_lengkap})!`);
      continue;
    }

    // Filter duplicates: semua record cocok KECUALI canonical
    const duplicates = matches.filter((g) => g.id !== canonical.id);

    console.log(`\n[Kode ${code}] ${jt.nama_lengkap} -> Canonical: ${canonical.id} | Duplikat: ${duplicates.length}`);

    // Update nama Canonical dan Pengguna
    await prisma.guru.update({
      where: { id: canonical.id },
      data: {
        nama_lengkap: formattedName,
        gelar_depan: jt.gelar_depan || null,
        gelar_belakang: jt.gelar_belakang || null,
        status_kepegawaian: "TETAP",
        status_aktif: true,
        status_lifecycle: "AKTIF",
        catatan: `KODE_GURU:${code}`,
      },
    });

    if (canonical.pengguna_id) {
      await prisma.pengguna.update({
        where: { id: canonical.pengguna_id },
        data: {
          nama_lengkap: formattedName,
        },
      });
    }

    // 2. Jika ada duplikat, lakukan rekonsiliasi
    for (const dup of duplicates) {
      console.log(`  -> Memproses duplikat ID: ${dup.id} ("${dup.nama_lengkap}")`);

      // A. Pindahkan Jadwal Pelajaran langsung ke canonical
      const updateJadwal = await prisma.jadwalPelajaran.updateMany({
        where: { guru_id: dup.id },
        data: { guru_id: canonical.id },
      });
      if (updateJadwal.count > 0) {
        console.log(`     - ${updateJadwal.count} Jadwal Pelajaran dipindahkan ke canonical.`);
      }

      // B. Pindahkan Sesi Kelas Aktual jika ada
      const updateSesi = await prisma.sesiKelasAktual.updateMany({
        where: { guru_id: dup.id },
        data: { guru_id: canonical.id },
      });
      if (updateSesi.count > 0) {
        console.log(`     - ${updateSesi.count} Sesi Kelas Aktual dipindahkan ke canonical.`);
      }

      // C. Rekonsiliasi Penugasan Mengajar
      const dupAssignments = await prisma.penugasanMengajar.findMany({
        where: { guru_id: dup.id },
      });

      for (const da of dupAssignments) {
        // Cek apakah canonical sudah punya penugasan untuk mapel & rombel yang sama
        const existingCanonicalPM = await prisma.penugasanMengajar.findFirst({
          where: {
            guru_id: canonical.id,
            mata_pelajaran_id: da.mata_pelajaran_id,
            rombel_id: da.rombel_id,
            tahun_ajaran_id: da.tahun_ajaran_id,
          },
        });

        if (existingCanonicalPM && existingCanonicalPM.id !== da.id) {
          // Re-point semua jadwal pelajaran dari da.id ke existingCanonicalPM.id
          await prisma.jadwalPelajaran.updateMany({
            where: { penugasan_mengajar_id: da.id },
            data: { penugasan_mengajar_id: existingCanonicalPM.id, guru_id: canonical.id },
          });
          // Update jam jika diperlukan
          if (da.jumlah_jam_minggu > existingCanonicalPM.jumlah_jam_minggu) {
            await prisma.penugasanMengajar.update({
              where: { id: existingCanonicalPM.id },
              data: { jumlah_jam_minggu: da.jumlah_jam_minggu },
            });
          }
          // Hapus PM duplikat
          await prisma.penugasanMengajar.delete({
            where: { id: da.id },
          });
        } else {
          // Re-assign PM ini langsung ke canonical
          await prisma.penugasanMengajar.update({
            where: { id: da.id },
            data: { guru_id: canonical.id },
          });
        }
      }

      // D. Rekonsiliasi Penugasan Wali Kelas
      const delWalas = await prisma.penugasanWaliKelas.deleteMany({
        where: { guru_id: dup.id },
      });
      if (delWalas.count > 0) {
        console.log(`     - ${delWalas.count} Penugasan Wali Kelas duplikat dihapus.`);
      }

      // E. Hapus entri Guru duplikat
      await prisma.guru.delete({
        where: { id: dup.id },
      });
      console.log(`     - Guru duplikat [${dup.id}] berhasil dihapus.`);
    }
  }

  // 3. Rekonsiliasi Penugasan Wali Kelas Resmi untuk 21 Rombel
  console.log("\n================================================================================");
  console.log("   REKONSILIASI PENUGASAN WALI KELAS RESMI (21 ROMBEL)");
  console.log("================================================================================");

  const allRombels = await prisma.rombel.findMany({
    where: { sekolah_id: smk.id, tahun_ajaran_id: tahunAjaran.id },
  });
  const rombelMap = new Map(allRombels.map((r) => [r.nama, r]));

  const currentTeachers = await prisma.guru.findMany({
    where: { sekolah_id: smk.id },
  });
  const teacherMapByCode = new Map();
  for (const t of currentTeachers) {
    if (t.catatan) {
      const m = t.catatan.match(/KODE_GURU:(\d+)/i) || t.catatan.match(/Kode guru (\d+)/i);
      if (m) teacherMapByCode.set(Number(m[1]), t);
    }
  }

  for (const jr of jsonRombels) {
    const rombel = rombelMap.get(jr.nama);
    if (!rombel) {
      console.warn(`[WARNING] Rombel ${jr.nama} tidak ditemukan!`);
      continue;
    }

    const targetGuru = teacherMapByCode.get(jr.kode_guru_wali);
    if (!targetGuru) {
      console.warn(`[WARNING] Guru kode ${jr.kode_guru_wali} untuk rombel ${jr.nama} tidak ditemukan!`);
      continue;
    }

    const existingWalas = await prisma.penugasanWaliKelas.findMany({
      where: {
        sekolah_id: smk.id,
        tahun_ajaran_id: tahunAjaran.id,
        rombel_id: rombel.id,
      },
    });

    if (existingWalas.length === 0) {
      await prisma.penugasanWaliKelas.create({
        data: {
          id: ulid(),
          sekolah_id: smk.id,
          tahun_ajaran_id: tahunAjaran.id,
          rombel_id: rombel.id,
          guru_id: targetGuru.id,
          status: "AKTIF",
          berlaku_mulai: tahunAjaran.tanggal_mulai,
          catatan: `WALI_KELAS_RESMI | Kode ${jr.kode_guru_wali}`,
        },
      });
      console.log(`[+] [${rombel.nama}] Baru dibuat -> ${targetGuru.nama_lengkap}`);
    } else {
      const [primary, ...excess] = existingWalas;
      await prisma.penugasanWaliKelas.update({
        where: { id: primary.id },
        data: {
          guru_id: targetGuru.id,
          status: "AKTIF",
          berlaku_mulai: tahunAjaran.tanggal_mulai,
          berlaku_sampai: null,
          catatan: `WALI_KELAS_RESMI | Kode ${jr.kode_guru_wali}`,
        },
      });
      console.log(`[*] [${rombel.nama}] Diperbarui -> ${targetGuru.nama_lengkap} (AKTIF)`);

      for (const ex of excess) {
        await prisma.penugasanWaliKelas.delete({
          where: { id: ex.id },
        });
        console.log(`    - Menghapus penugasan wali lebih [${ex.id}]`);
      }
    }
  }

  // 4. Verifikasi Akhir
  console.log("\n================================================================================");
  console.log("   AUDIT AKHIR HASIL REKONSILIASI");
  console.log("================================================================================");

  const finalGurus = await prisma.guru.findMany({
    where: { sekolah_id: smk.id },
    include: {
      pengguna: true,
      penugasan_wali: { include: { rombel: true } },
      penugasan_mengajar: true,
      jadwal_pelajaran: true,
    },
    orderBy: { nama_lengkap: "asc" },
  });

  const finalWalas = await prisma.penugasanWaliKelas.findMany({
    where: { sekolah_id: smk.id, status: "AKTIF" },
  });

  const finalJadwal = await prisma.jadwalPelajaran.count({
    where: { sekolah_id: smk.id },
  });

  console.log(`Total Guru SMK Otomindo: ${finalGurus.length} (Ekspektasi: 38)`);
  console.log(`Total Wali Kelas Aktif: ${finalWalas.length} (Ekspektasi: 21)`);
  console.log(`Total Sel Jadwal Pelajaran: ${finalJadwal} (Ekspektasi: 1008)`);

  let invalidGuru = 0;
  for (const g of finalGurus) {
    if (!g.pengguna_id) {
      console.error(`[ERROR] Guru tanpa akun: ${g.nama_lengkap} (${g.id})`);
      invalidGuru++;
    }
  }
  if (invalidGuru === 0) {
    console.log("SEMUA 38 GURU MEMILIKI AKUN PENGGUNA RESMI!");
  }

  console.log("\nRekonsiliasi selesai dengan sukses.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
