import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { ulid } from "ulidx";

const SOURCE_URL = new URL("../data/jadwal-otomindo-2026-2027.json", import.meta.url);
const SOURCE_MARKER = "JADWAL_OTOMINDO_2026_2027_2026_08_19";
const SOURCE_VERSION_NAME = "Jadwal Pelajaran 2026/2027 - 19 Agustus 2026";
const EXPECTED_SCHEDULE_CELLS = 1008;

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

const DAY_SLOT_PREFIX = {
  SENIN: "REG",
  SELASA: "REG",
  RABU: "RABU",
  KAMIS: "REG",
  JUMAT: "JUMAT",
};

function teachingSlots(prefix, specialDay, times) {
  const baseOrder = prefix === "REG" ? 0 : prefix === "RABU" ? 200 : 300;
  return times.map(([start, end], index) => ({
    kode: `${prefix}_${index + 1}`,
    nama: `Jam ke-${index + 1}${specialDay ? ` (${specialDay[0]}${specialDay.slice(1).toLowerCase()})` : ""}`,
    urutan: baseOrder + index + 1,
    jam_mulai: start,
    jam_selesai: end,
    is_istirahat: false,
    is_upacara: false,
    hari_khusus: specialDay,
  }));
}

function breakSlot(kode, nama, urutan, start, end, specialDay) {
  return {
    kode,
    nama,
    urutan,
    jam_mulai: start,
    jam_selesai: end,
    is_istirahat: true,
    is_upacara: false,
    hari_khusus: specialDay,
  };
}

const SLOT_DEFINITIONS = [
  ...teachingSlots("REG", null, [
    ["06:30", "07:15"],
    ["07:15", "08:00"],
    ["08:00", "08:45"],
    ["08:45", "09:30"],
    ["09:50", "10:35"],
    ["10:35", "11:20"],
    ["11:20", "12:05"],
    ["12:05", "12:50"],
    ["13:20", "14:05"],
    ["14:05", "14:50"],
  ]),
  breakSlot("REG_ISTIRAHAT_1", "Istirahat 1 (Senin/Selasa/Kamis)", 5, "09:30", "09:50", null),
  breakSlot("REG_ISTIRAHAT_2", "Istirahat 2 (Senin/Selasa/Kamis)", 10, "12:50", "13:20", null),
  ...teachingSlots("RABU", "RABU", [
    ["06:30", "07:10"],
    ["07:10", "07:50"],
    ["07:50", "08:30"],
    ["08:30", "09:10"],
    ["09:30", "10:10"],
    ["10:10", "10:50"],
    ["10:50", "11:30"],
    ["11:30", "12:10"],
    ["12:40", "13:20"],
    ["13:20", "14:00"],
    ["14:00", "14:40"],
  ]),
  breakSlot("RABU_ISTIRAHAT_1", "Istirahat 1 (Rabu)", 205, "09:10", "09:30", "RABU"),
  breakSlot("RABU_ISTIRAHAT_2", "Istirahat 2 (Rabu)", 210, "12:10", "12:40", "RABU"),
  ...teachingSlots("JUMAT", "JUMAT", [
    ["06:30", "07:10"],
    ["07:10", "07:50"],
    ["07:50", "08:30"],
    ["08:30", "09:10"],
    ["09:25", "10:05"],
    ["10:05", "10:45"],
    ["10:45", "11:25"],
  ]),
  breakSlot("JUMAT_ISTIRAHAT_1", "Istirahat (Jumat)", 305, "09:10", "09:25", "JUMAT"),
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

export async function seedJadwal(prismaClient = null) {
  const prisma = prismaClient || new PrismaClient();
  const shouldDisconnect = !prismaClient;

  try {
    console.log("=== [6/7] Menjalankan Seeder Jadwal Pelajaran (1008 Sel SMK OTOMINDO) ===");

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

    // 3. Upsert Slot Waktu (33 slot master)
    console.log("Menyelaraskan slot waktu harian (Reguler, Rabu, Jumat)...");
    const slotMap = new Map();
    for (const slot of SLOT_DEFINITIONS) {
      const record = await prisma.slotWaktu.upsert({
        where: { sekolah_id_kode: { sekolah_id: sekolah.id, kode: slot.kode } },
        update: { ...slot, status_aktif: true },
        create: { id: ulid(), sekolah_id: sekolah.id, ...slot, status_aktif: true },
      });
      slotMap.set(slot.kode, record);
    }
    console.log(`[+] Terdaftar ${slotMap.size} slot waktu KBM aktif.`);

    // 4. Versi Jadwal
    let version = await prisma.versiJadwal.findFirst({
      where: {
        sekolah_id: sekolah.id,
        tahun_ajaran_id: tahunAjaran.id,
        nama: SOURCE_VERSION_NAME,
      },
      include: { _count: { select: { jadwal: true } } },
    });

    if (!version) {
      version = await prisma.versiJadwal.create({
        data: {
          id: ulid(),
          sekolah_id: sekolah.id,
          tahun_ajaran_id: tahunAjaran.id,
          semester_id: semester.id,
          nomor_versi: 1,
          nama: SOURCE_VERSION_NAME,
          status: "PUBLISHED",
          tanggal_publikasi: new Date("2026-08-19T00:00:00+07:00"),
          catatan: SOURCE_MARKER,
        },
        include: { _count: { select: { jadwal: true } } },
      });
      console.log(`[+] Dibuat versi jadwal: ${version.nama}`);
    } else {
      version = await prisma.versiJadwal.update({
        where: { id: version.id },
        data: { status: "PUBLISHED" },
        include: { _count: { select: { jadwal: true } } },
      });
      console.log(
        `[*] Versi jadwal aktif: ${version.nama} (${version._count.jadwal} sel jadwal terdaftar)`
      );
    }

    // 5. Cek apakah sel jadwal sudah terisi
    if (version._count.jadwal === EXPECTED_SCHEDULE_CELLS) {
      console.log(`[=] ${EXPECTED_SCHEDULE_CELLS} sel jadwal sudah lengkap dan terverifikasi.`);
    } else {
      console.log(`Mengisi sel jadwal (${version._count.jadwal} -> ${EXPECTED_SCHEDULE_CELLS})...`);

      // Load teachers, subjects, classes, assignments
      const allTeachers = await prisma.guru.findMany({ where: { sekolah_id: sekolah.id } });
      const teacherMapByCode = new Map();
      for (const t of allTeachers) {
        if (t.catatan) {
          const m = t.catatan.match(/KODE_GURU:(\d+)/i) || t.catatan.match(/Kode guru (\d+)/i);
          if (m) teacherMapByCode.set(Number.parseInt(m[1], 10), t);
        }
      }

      const allSubjects = await prisma.mataPelajaran.findMany({
        where: { sekolah_id: sekolah.id },
      });
      const subjectMap = new Map(allSubjects.map((s) => [s.kode, s]));

      const allRombels = await prisma.rombel.findMany({
        where: { sekolah_id: sekolah.id, tahun_ajaran_id: tahunAjaran.id },
      });
      const rombelMapByName = new Map(allRombels.map((r) => [r.nama, r]));

      const allAssignments = await prisma.penugasanMengajar.findMany({
        where: { sekolah_id: sekolah.id, tahun_ajaran_id: tahunAjaran.id, status: "AKTIF" },
      });
      const assignmentMap = new Map();
      for (const a of allAssignments) {
        const t = allTeachers.find((x) => x.id === a.guru_id);
        const codeMatch =
          t?.catatan?.match(/KODE_GURU:(\d+)/i) || t?.catatan?.match(/Kode guru (\d+)/i);
        const tCode = codeMatch ? Number.parseInt(codeMatch[1], 10) : null;
        const subj = allSubjects.find((x) => x.id === a.mata_pelajaran_id);
        const r = allRombels.find((x) => x.id === a.rombel_id);
        if (tCode && subj && r) {
          assignmentMap.set(`${tCode}|${subj.kode}|${r.nama}`, a);
        }
      }

      // Read schedule
      const raw = await readFile(SOURCE_URL, "utf8");
      const sourceData = JSON.parse(raw);
      const schedule = expandSchedule(sourceData);

      // Clean old schedule in this version if incomplete
      await prisma.jadwalPelajaran.deleteMany({ where: { versi_jadwal_id: version.id } });

      const scheduleRows = schedule.map((entry) => {
        const teacherCode = entry.teacherCodes[0];
        const groupKey = `${teacherCode}|${entry.subjectCode}|${entry.rombel}`;
        const assignment = assignmentMap.get(groupKey);
        const teacher = teacherMapByCode.get(teacherCode);
        const subject = subjectMap.get(entry.subjectCode);
        const rombel = rombelMapByName.get(entry.rombel);
        const slot = slotMap.get(`${DAY_SLOT_PREFIX[entry.hari]}_${entry.slot}`);

        if (!assignment || !teacher || !subject || !rombel || !slot) {
          throw new Error(
            `Data referensi tidak lengkap untuk jadwal: ${entry.hari} ${entry.rombel} ${entry.subjectCode} guru ${teacherCode}`
          );
        }

        return {
          id: ulid(),
          sekolah_id: sekolah.id,
          versi_jadwal_id: version.id,
          tahun_ajaran_id: tahunAjaran.id,
          semester_id: semester.id,
          rombel_id: rombel.id,
          penugasan_mengajar_id: assignment.id,
          guru_id: teacher.id,
          mata_pelajaran_id: subject.id,
          slot_waktu_id: slot.id,
          hari: entry.hari,
          catatan: SOURCE_MARKER,
        };
      });

      await prisma.jadwalPelajaran.createMany({ data: scheduleRows });
      console.log(`[+] Dimasukkan ${scheduleRows.length} sel jadwal.`);
    }

    // 6. Verifikasi Jadwal Guru #21 (Eri Chandra A, S.Kom)
    const eriGuru = await prisma.guru.findFirst({
      where: {
        sekolah_id: sekolah.id,
        nama_lengkap: { contains: "Eri Chandra" },
      },
    });

    if (eriGuru) {
      const eriSchedules = await prisma.jadwalPelajaran.findMany({
        where: {
          guru_id: eriGuru.id,
          versi_jadwal_id: version.id,
        },
        include: {
          mata_pelajaran: true,
          rombel: true,
          slot_waktu: true,
        },
        orderBy: [{ hari: "asc" }, { slot_waktu: { urutan: "asc" } }],
      });

      const daySummary = {};
      for (const s of eriSchedules) {
        daySummary[s.hari] = (daySummary[s.hari] || 0) + 1;
      }

      console.log(`[=] Verifikasi Jadwal Guru #21 (Eri Chandra A, S.Kom):`);
      console.log(`    - Total Slot Terjadwal: ${eriSchedules.length} JP`);
      for (const [day, count] of Object.entries(daySummary)) {
        console.log(`    - ${day}: ${count} JP`);
      }
    }

    console.log(` [PASS] Seeder Jadwal Pelajaran Selesai.`);
    return { versionId: version.id, cellCount: EXPECTED_SCHEDULE_CELLS };
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

if (process.argv[1]?.endsWith("seeder-jadwal.mjs")) {
  seedJadwal().catch((err) => {
    console.error("Error running seeder-jadwal:", err);
    process.exit(1);
  });
}
