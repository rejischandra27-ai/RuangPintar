import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { ulid } from "ulidx";

const SOURCE_URL = new URL("../data/jadwal-otomindo-2026-2027.json", import.meta.url);
const SOURCE_MARKER = "JADWAL_OTOMINDO_2026_2027_2026_08_19";

const SUBJECTS = {
  AGAMA: ["Pendidikan Agama", "UMUM"],
  ANIMASI: ["Animasi", "KEJURUAN"],
  ASJ: ["Administrasi Sistem Jaringan", "KEJURUAN"],
  "B.DATA": ["Basis Data", "KEJURUAN"],
  BIND: ["Bahasa Indonesia", "UMUM"],
  BING: ["Bahasa Inggris", "UMUM"],
  BK: ["Bimbingan dan Konseling", "UMUM"],
  DDKV: ["Dasar-dasar Desain Komunikasi Visual", "KEJURUAN"],
  DDRPL: ["Dasar-dasar Rekayasa Perangkat Lunak", "KEJURUAN"],
  DDTJKT: ["Dasar-dasar Teknik Jaringan Komputer dan Telekomunikasi", "KEJURUAN"],
  DDTO: ["Dasar-dasar Teknik Otomotif", "KEJURUAN"],
  DP: ["Desain Publikasi", "KEJURUAN"],
  FOTVIE: ["Fotografi dan Videografi", "KEJURUAN"],
  GRAFIS: ["Komputer Grafis", "KEJURUAN"],
  INFO: ["Informatika", "UMUM"],
  IPAS: ["Projek Ilmu Pengetahuan Alam dan Sosial", "UMUM"],
  JEPANG: ["Bahasa Jepang", "UMUM"],
  KIK: ["KIK", "KEJURUAN"],
  KJ: ["KJ", "KEJURUAN"],
  KKA: ["Koding dan Kecerdasan Artifisial", "UMUM"],
  MTK: ["Matematika", "UMUM"],
  PBO: ["Pemrograman Berbasis Objek", "KEJURUAN"],
  PEMWEB: ["Pemrograman Web", "KEJURUAN"],
  PENJAS: ["Pendidikan Jasmani, Olahraga, dan Kesehatan", "UMUM"],
  PKKR: ["PKKR", "KEJURUAN"],
  PKN: ["Pendidikan Pancasila dan Kewarganegaraan", "UMUM"],
  PKPJ: ["PKPJ", "KEJURUAN"],
  PMKR: ["PMKR", "KEJURUAN"],
  PPB: ["Pemrograman Perangkat Bergerak", "KEJURUAN"],
  PPJ: ["Perencanaan dan Pengalamatan Jaringan", "KEJURUAN"],
  PSPT: ["PSPT", "KEJURUAN"],
  "S.DATA": ["Struktur Data", "KEJURUAN"],
  SEJARAH: ["Sejarah", "UMUM"],
  SENI: ["Seni", "UMUM"],
  TPAV: ["Teknik Pengelolaan Audio Video", "KEJURUAN"],
  "UI/UX": ["User Interface dan User Experience", "KEJURUAN"],
  WALAS: ["Pembinaan Wali Kelas", "UMUM"],
  PRK_TO: ["Praktik Teknik Otomotif", "KEJURUAN"],
  PRK_TJKT: ["Praktik Teknik Jaringan Komputer dan Telekomunikasi", "KEJURUAN"],
  PRK_DKV: ["Praktik Desain Komunikasi Visual", "KEJURUAN"],
  PRK_RPL: ["Praktik Rekayasa Perangkat Lunak", "KEJURUAN"],
};

const PRACTICAL_TEACHERS = [
  ["Rekson Pangaribuan", 2],
  ["Donatus Soeti P", 7],
  ["Syarif Ahmad Maulana", 18],
  ["Eri Chandra", 21],
  ["Muhammad Sopyan", 20],
  ["Suryani", 4],
  ["Rajayani Sianturi", 12],
  ["Nur Azizah Ayunda", 19],
  ["Ramses Sitorus", 16],
  ["Parlidungan Siadari", 8],
  ["Parlindungan Siadari", 8],
];

function programCodeForClass(className) {
  if (className.includes(" TO ") || className.includes("TKRO")) return "TO";
  if (className.includes("TJKT") || className.includes("TKJ")) return "TJKT";
  if (className.includes("DKV")) return "DKV";
  if (className.includes("RPL")) return "RPL";
  throw new Error(`Program rombel tidak dikenali: ${className}`);
}

function practicalSubjectCode(className) {
  return `PRK_${programCodeForClass(className)}`;
}

function practicalTeacherCode(description) {
  const match = PRACTICAL_TEACHERS.find(([name]) => description.includes(name));
  if (!match) throw new Error(`Guru blok praktik tidak dikenali: ${description}`);
  return match[1];
}

function expandSchedule(source) {
  const result = [];
  for (const [day, dayData] of Object.entries(source.hari)) {
    for (const entry of dayData.entries) {
      result.push({
        hari: day,
        rombel: entry.rombel,
        slot: entry.slot,
        subjectCode: entry.mapel,
        teacherCodes: entry.kode_guru.split("/").map(Number),
        sourceDescription: null,
      });
    }

    for (const block of dayData.praktik) {
      const teacherCode = practicalTeacherCode(block.deskripsi);
      for (let slot = block.slot_mulai; slot <= block.slot_selesai; slot += 1) {
        result.push({
          hari: day,
          rombel: block.rombel,
          slot,
          subjectCode: practicalSubjectCode(block.rombel),
          teacherCodes: [teacherCode],
          sourceDescription: block.deskripsi,
        });
      }
    }
  }
  return result;
}

function assignmentGroups(schedule) {
  const groups = new Map();
  for (const entry of schedule) {
    for (const teacherCode of entry.teacherCodes) {
      const key = `${teacherCode}|${entry.subjectCode}|${entry.rombel}`;
      const existing = groups.get(key) ?? {
        key,
        teacherCode,
        subjectCode: entry.subjectCode,
        rombel: entry.rombel,
        hours: 0,
        coTeaching: false,
      };
      existing.hours += 1;
      existing.coTeaching ||= entry.teacherCodes.length > 1;
      groups.set(key, existing);
    }
  }
  return [...groups.values()];
}

export async function seedPenugasanMengajar(prismaClient = null) {
  const prisma = prismaClient || new PrismaClient();
  const shouldDisconnect = !prismaClient;

  try {
    console.log("=== [5/7] Menjalankan Seeder Penugasan Mengajar (SMK OTOMINDO) ===");

    // 1. Dapatkan sekolah SMK OTOMINDO
    const sekolah = await prisma.sekolah.findFirst({
      where: {
        OR: [{ nama: "SMK OTOMINDO" }, { id: "01M2XXYD227F9S3H985FH53GMF" }],
      },
    });
    if (!sekolah) throw new Error("Sekolah SMK OTOMINDO belum ditemukan.");

    // 2. Dapatkan Tahun Ajaran 2026/2027 & Semester Ganjil
    const tahunAjaran = await prisma.tahunAjaran.findFirst({
      where: { sekolah_id: sekolah.id, nama: "2026/2027", status: "AKTIF" },
    });
    if (!tahunAjaran) throw new Error("Tahun ajaran 2026/2027 belum ditemukan.");

    const semester = await prisma.semester.findFirst({
      where: { sekolah_id: sekolah.id, tahun_ajaran_id: tahunAjaran.id, kode: "GANJIL" },
    });
    if (!semester) throw new Error("Semester Ganjil belum ditemukan.");

    // 3. Upsert Mata Pelajaran (41 mapel terdefinisi)
    console.log(`Memastikan ${Object.keys(SUBJECTS).length} mata pelajaran terdaftar...`);
    const subjectMap = new Map();
    for (const [code, [name, group]] of Object.entries(SUBJECTS)) {
      const subject = await prisma.mataPelajaran.upsert({
        where: { sekolah_id_kode: { sekolah_id: sekolah.id, kode: code } },
        update: { nama: name, kelompok: group, status_aktif: true, deskripsi: SOURCE_MARKER },
        create: {
          id: ulid(),
          sekolah_id: sekolah.id,
          kode: code,
          nama: name,
          kelompok: group,
          status_aktif: true,
          deskripsi: SOURCE_MARKER,
        },
      });
      subjectMap.set(code, subject);
    }
    console.log(`[+] Terdaftar ${subjectMap.size} mata pelajaran.`);

    // 4. Baca jadwal dan bangun penugasan mengajar
    const raw = await readFile(SOURCE_URL, "utf8");
    const sourceData = JSON.parse(raw);
    const schedule = expandSchedule(sourceData);
    const groups = assignmentGroups(schedule);

    console.log(`Memproses ${groups.length} penugasan mengajar riil...`);

    // Map guru berdasarkan KODE_GURU
    const allTeachers = await prisma.guru.findMany({ where: { sekolah_id: sekolah.id } });
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

    // Map rombel berdasarkan nama
    const allRombels = await prisma.rombel.findMany({
      where: { sekolah_id: sekolah.id, tahun_ajaran_id: tahunAjaran.id },
    });
    const rombelMapByName = new Map(allRombels.map((r) => [r.nama, r]));

    // Query existing assignments
    const existingAssignments = await prisma.penugasanMengajar.findMany({
      where: { sekolah_id: sekolah.id, tahun_ajaran_id: tahunAjaran.id },
    });
    const existingMap = new Map(
      existingAssignments.map((a) => [`${a.guru_id}|${a.mata_pelajaran_id}|${a.rombel_id}`, a])
    );

    let createdCount = 0;
    let updatedCount = 0;
    const assignmentResults = new Map();

    for (const group of groups) {
      const teacher = teacherMapByCode.get(group.teacherCode);
      const subject = subjectMap.get(group.subjectCode);
      const rombel = rombelMapByName.get(group.rombel);

      if (!teacher) throw new Error(`Guru kode ${group.teacherCode} tidak ditemukan.`);
      if (!subject) throw new Error(`Mapel ${group.subjectCode} tidak ditemukan.`);
      if (!rombel) throw new Error(`Rombel ${group.rombel} tidak ditemukan.`);

      const key = `${teacher.id}|${subject.id}|${rombel.id}`;
      const existing = existingMap.get(key);

      const assignmentData = {
        sekolah_id: sekolah.id,
        guru_id: teacher.id,
        mata_pelajaran_id: subject.id,
        tahun_ajaran_id: tahunAjaran.id,
        semester_id: semester.id,
        rombel_id: rombel.id,
        jumlah_jam_minggu: group.hours,
        berlaku_mulai: tahunAjaran.tanggal_mulai,
        berlaku_sampai: null,
        status: "AKTIF",
        catatan: `${SOURCE_MARKER} | ${group.key}${group.coTeaching ? " | Co-teaching agama" : ""}`,
      };

      let record;
      if (existing) {
        record = await prisma.penugasanMengajar.update({
          where: { id: existing.id },
          data: assignmentData,
        });
        updatedCount += 1;
      } else {
        record = await prisma.penugasanMengajar.create({
          data: { id: ulid(), ...assignmentData },
        });
        createdCount += 1;
      }
      assignmentResults.set(group.key, record);
    }

    // Verify Eri Chandra
    const eriGuru = teacherMapByCode.get(21);
    if (eriGuru) {
      const eriAssignments = await prisma.penugasanMengajar.findMany({
        where: { guru_id: eriGuru.id, status: "AKTIF" },
        include: { mata_pelajaran: true, rombel: true },
      });
      const totalJp = eriAssignments.reduce((sum, a) => sum + a.jumlah_jam_minggu, 0);
      console.log(`[=] Verifikasi Beban Guru #21 (Eri Chandra A, S.Kom):`);
      console.log(`    - Jumlah Kelas: ${eriAssignments.length}`);
      console.log(`    - Total Beban KBM: ${totalJp} JP/Minggu`);
    }

    console.log(
      ` [PASS] Seeder Penugasan Mengajar Selesai: ${assignmentResults.size} penugasan (${createdCount} dibuat, ${updatedCount} diperbarui).`
    );
    return { subjectMap, assignmentResults };
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

if (process.argv[1]?.endsWith("seeder-penugasan-mengajar.mjs")) {
  seedPenugasanMengajar().catch((err) => {
    console.error("Error running seeder-penugasan-mengajar:", err);
    process.exit(1);
  });
}
