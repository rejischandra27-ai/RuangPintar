import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";
import { ulid } from "ulidx";

const SOURCE_URL = new URL("./data/jadwal-otomindo-2026-2027.json", import.meta.url);
const SOURCE_MARKER = "JADWAL_OTOMINDO_2026_2027_2026_08_19";
const SOURCE_VERSION_NAME = "Jadwal Pelajaran 2026/2027 - 19 Agustus 2026";
const EXPECTED_SCHEDULE_CELLS = 1008;

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

const PROGRAMS = {
  TO: "Teknik Otomotif",
  TJKT: "Teknik Jaringan Komputer dan Telekomunikasi",
  DKV: "Desain Komunikasi Visual",
  RPL: "Rekayasa Perangkat Lunak",
};

const DAY_SLOT_PREFIX = {
  SENIN: "REG",
  SELASA: "REG",
  RABU: "RABU",
  KAMIS: "REG",
  JUMAT: "JUMAT",
};

const EXPECTED_PERIODS = {
  SENIN: 10,
  SELASA: 10,
  RABU: 11,
  KAMIS: 10,
  JUMAT: 7,
};

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

function validateSource(source, schedule) {
  const errors = [];
  const warnings = [];
  const teacherCodes = new Set(source.guru.map((teacher) => teacher.kode));
  const classNames = new Set(source.rombel.map((classGroup) => classGroup.nama));

  if (source.guru.length !== 38) errors.push(`Jumlah guru ${source.guru.length}, seharusnya 38.`);
  if (source.rombel.length !== 21)
    errors.push(`Jumlah rombel ${source.rombel.length}, seharusnya 21.`);
  if (schedule.length !== EXPECTED_SCHEDULE_CELLS) {
    errors.push(`Jumlah sel jadwal ${schedule.length}, seharusnya ${EXPECTED_SCHEDULE_CELLS}.`);
  }

  for (const classGroup of source.rombel) {
    if (!teacherCodes.has(classGroup.kode_guru_wali)) {
      errors.push(
        `Kode wali kelas ${classGroup.kode_guru_wali} untuk ${classGroup.nama} tidak dikenal.`
      );
    }
  }

  const resourceKeys = new Set();
  const teacherKeys = new Map();
  const perClassDay = new Map();

  for (const entry of schedule) {
    if (!classNames.has(entry.rombel)) errors.push(`Rombel jadwal tidak dikenal: ${entry.rombel}.`);
    if (!SUBJECTS[entry.subjectCode]) errors.push(`Mapel tidak dikenal: ${entry.subjectCode}.`);

    const maxPeriod = EXPECTED_PERIODS[entry.hari];
    if (!maxPeriod || entry.slot < 1 || entry.slot > maxPeriod) {
      errors.push(`Slot tidak valid: ${entry.hari} ${entry.rombel} jam ${entry.slot}.`);
    }

    const resourceKey = `${entry.hari}|${entry.slot}|${entry.rombel}`;
    if (resourceKeys.has(resourceKey)) errors.push(`Duplikasi rombel pada ${resourceKey}.`);
    resourceKeys.add(resourceKey);

    const classDayKey = `${entry.hari}|${entry.rombel}`;
    perClassDay.set(classDayKey, (perClassDay.get(classDayKey) ?? 0) + 1);

    for (const teacherCode of entry.teacherCodes) {
      if (!teacherCodes.has(teacherCode)) errors.push(`Kode guru ${teacherCode} tidak dikenal.`);
      const teacherKey = `${entry.hari}|${entry.slot}|${teacherCode}`;
      const existing = teacherKeys.get(teacherKey);
      if (existing && existing !== entry.rombel) {
        warnings.push(
          `Konflik guru kode ${teacherCode}: ${teacherKey} pada ${existing} dan ${entry.rombel}.`
        );
      } else {
        teacherKeys.set(teacherKey, entry.rombel);
      }
    }
  }

  for (const day of Object.keys(EXPECTED_PERIODS)) {
    for (const className of classNames) {
      const actual = perClassDay.get(`${day}|${className}`) ?? 0;
      if (actual !== EXPECTED_PERIODS[day]) {
        errors.push(
          `${day} ${className} memiliki ${actual} jam, seharusnya ${EXPECTED_PERIODS[day]}.`
        );
      }
    }
  }

  for (const entry of schedule.filter((item) => item.subjectCode === "WALAS")) {
    const classGroup = source.rombel.find((item) => item.nama === entry.rombel);
    if (classGroup?.kode_guru_wali !== entry.teacherCodes[0]) {
      errors.push(`Kode WALAS tidak cocok untuk ${entry.rombel}.`);
    }
  }

  if (errors.length) throw new Error(`Validasi sumber gagal:\n- ${errors.join("\n- ")}`);
  return warnings;
}

async function loadSource() {
  const raw = await readFile(SOURCE_URL, "utf8");
  const source = JSON.parse(raw);
  const schedule = expandSchedule(source);
  const warnings = validateSource(source, schedule);
  return {
    source,
    schedule,
    warnings,
    hash: createHash("sha256").update(raw).digest("hex"),
  };
}

function parseOptions(argv) {
  const schoolIdArg = argv.find((argument) => argument.startsWith("--school-id="));
  return {
    apply: argv.includes("--apply"),
    schoolId: schoolIdArg?.split("=")[1] || null,
  };
}

async function resolveTargetSchool(prisma, source, schoolId) {
  if (schoolId) {
    const school = await prisma.sekolah.findUnique({ where: { id: schoolId } });
    if (!school) throw new Error(`Sekolah target ${schoolId} tidak ditemukan.`);
    return school;
  }

  const candidates = await prisma.sekolah.findMany({
    where: {
      nama: { in: ["SMKS 1 Ruang Pintar", source.metadata.sekolah] },
      tahun_ajaran: { some: { nama: source.metadata.tahun_ajaran, status: "AKTIF" } },
    },
  });
  if (candidates.length !== 1) {
    throw new Error(
      `Target sekolah ambigu (${candidates.length} kandidat). Gunakan --school-id=<ULID> untuk memilih secara eksplisit.`
    );
  }
  return candidates[0];
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

async function applyImport(prisma, source, schedule, sourceHash, sourceWarnings, school) {
  const publicationDate = new Date("2026-08-19T00:00:00+07:00");
  const sourceNote = `${SOURCE_MARKER} | ${source.metadata.nama_sumber}`;

  return prisma.$transaction(
    async (tx) => {
      const academicYear = await tx.tahunAjaran.findFirst({
        where: { sekolah_id: school.id, nama: source.metadata.tahun_ajaran, status: "AKTIF" },
      });
      if (!academicYear)
        throw new Error("Tahun ajaran aktif 2026/2027 tidak ditemukan pada sekolah target.");

      const semester = await tx.semester.findFirst({
        where: { sekolah_id: school.id, tahun_ajaran_id: academicYear.id, kode: "GANJIL" },
      });
      if (!semester)
        throw new Error("Semester Ganjil 2026/2027 tidak ditemukan pada sekolah target.");

      await tx.sekolah.update({
        where: { id: school.id },
        data: { nama: source.metadata.sekolah, jenjang: "SMK", zona_waktu: "Asia/Jakarta" },
      });

      const phaseMap = new Map();
      for (const [code, name, order] of [
        ["FASE_E", "Fase E", 5],
        ["FASE_F", "Fase F", 6],
      ]) {
        const phase = await tx.fase.upsert({
          where: { sekolah_id_kode: { sekolah_id: school.id, kode: code } },
          update: { nama: name, urutan: order },
          create: { id: ulid(), sekolah_id: school.id, kode: code, nama: name, urutan: order },
        });
        phaseMap.set(code, phase);
      }

      const levelMap = new Map();
      for (const [code, name, order, phaseCode] of [
        ["10", "Kelas 10", 10, "FASE_E"],
        ["11", "Kelas 11", 11, "FASE_F"],
        ["12", "Kelas 12", 12, "FASE_F"],
      ]) {
        const level = await tx.tingkatKelas.upsert({
          where: { sekolah_id_kode: { sekolah_id: school.id, kode: code } },
          update: { nama: name, urutan: order, fase_id: phaseMap.get(phaseCode).id },
          create: {
            id: ulid(),
            sekolah_id: school.id,
            kode: code,
            nama: name,
            urutan: order,
            fase_id: phaseMap.get(phaseCode).id,
          },
        });
        levelMap.set(code, level);
      }

      const programMap = new Map();
      await tx.programKeahlian.updateMany({
        where: { sekolah_id: school.id, kode: { notIn: Object.keys(PROGRAMS) } },
        data: { status_aktif: false },
      });
      for (const [code, name] of Object.entries(PROGRAMS)) {
        const program = await tx.programKeahlian.upsert({
          where: { sekolah_id_kode: { sekolah_id: school.id, kode: code } },
          update: { nama: name, jenjang: "SMK", status_aktif: true },
          create: {
            id: ulid(),
            sekolah_id: school.id,
            kode: code,
            nama: name,
            jenjang: "SMK",
            status_aktif: true,
          },
        });
        programMap.set(code, program);
      }

      const sourceClassNames = source.rombel.map((item) => item.nama);
      await tx.rombel.updateMany({
        where: {
          sekolah_id: school.id,
          tahun_ajaran_id: academicYear.id,
          nama: { notIn: sourceClassNames },
          status: "AKTIF",
        },
        data: { status: "NONAKTIF", catatan: `Dinonaktifkan saat impor ${sourceNote}` },
      });

      const classMap = new Map();
      for (const classGroup of source.rombel) {
        const levelCode = gradeCodeForClass(classGroup.nama);
        const phaseCode = levelCode === "10" ? "FASE_E" : "FASE_F";
        const programCode = programCodeForClass(classGroup.nama);
        const classRecord = await tx.rombel.upsert({
          where: {
            sekolah_id_tahun_ajaran_id_nama: {
              sekolah_id: school.id,
              tahun_ajaran_id: academicYear.id,
              nama: classGroup.nama,
            },
          },
          update: {
            semester_id: semester.id,
            tingkat_id: levelMap.get(levelCode).id,
            fase_id: phaseMap.get(phaseCode).id,
            program_id: programMap.get(programCode).id,
            kode: `RBL-${classGroup.nama.replaceAll(" ", "-")}`,
            status: "AKTIF",
            catatan: sourceNote,
          },
          create: {
            id: ulid(),
            sekolah_id: school.id,
            tahun_ajaran_id: academicYear.id,
            semester_id: semester.id,
            tingkat_id: levelMap.get(levelCode).id,
            fase_id: phaseMap.get(phaseCode).id,
            program_id: programMap.get(programCode).id,
            nama: classGroup.nama,
            kode: `RBL-${classGroup.nama.replaceAll(" ", "-")}`,
            status: "AKTIF",
            catatan: sourceNote,
          },
        });
        classMap.set(classGroup.nama, classRecord);
      }

      const teacherMap = new Map();
      const existingTeachers = await tx.guru.findMany({ where: { sekolah_id: school.id } });
      const linkedProfile = existingTeachers.find((teacher) => teacher.pengguna_id);
      const realTeacherIds = new Set();

      for (const teacher of source.guru) {
        let record = existingTeachers.find((item) => {
          const m = item.catatan
            ? item.catatan.match(/KODE_GURU:(\d+)/i) || item.catatan.match(/Kode guru (\d+)/i)
            : null;
          if (m && Number(m[1]) === teacher.kode) return true;
          const cleanDB = item.nama_lengkap
            .toLowerCase()
            .replace(/,/g, "")
            .replace(/\b(s\.pd|s\.kom|m\.pd|se|mm|sp|mt|s\.ds|s\.sos\.i|s\.pd\.i|a\.md|drs|dr)\b/gi, "")
            .replace(/\./g, "")
            .trim()
            .replace(/\s+/g, " ");
          const cleanSource = teacher.nama_lengkap
            .toLowerCase()
            .replace(/,/g, "")
            .replace(/\b(s\.pd|s\.kom|m\.pd|se|mm|sp|mt|s\.ds|s\.sos\.i|s\.pd\.i|a\.md|drs|dr)\b/gi, "")
            .replace(/\./g, "")
            .trim()
            .replace(/\s+/g, " ");
          return cleanDB === cleanSource;
        });
        const repurposeLinkedProfile = teacher.kode === 21 && !record && linkedProfile;
        if (repurposeLinkedProfile) record = linkedProfile;

        const formattedName = [teacher.gelar_depan, teacher.nama_lengkap].filter(Boolean).join(" ") + (teacher.gelar_belakang ? ", " + teacher.gelar_belakang : "");
        const data = {
          nama_lengkap: record?.nama_lengkap || formattedName,
          gelar_depan: teacher.gelar_depan,
          gelar_belakang: teacher.gelar_belakang,
          jenis_kelamin: teacher.jenis_kelamin,
          status_aktif: true,
          catatan: `KODE_GURU:${teacher.kode}`,
        };

        if (record) {
          record = await tx.guru.update({
            where: { id: record.id },
            data: repurposeLinkedProfile
              ? {
                  ...data,
                  nip: null,
                  nuptk: null,
                  tempat_lahir: null,
                  tanggal_lahir: null,
                  email: null,
                  telepon: null,
                  alamat: null,
                  status_kepegawaian: "TETAP",
                }
              : data,
          });
        } else {
          record = await tx.guru.create({
            data: {
              id: ulid(),
              sekolah_id: school.id,
              ...data,
              status_kepegawaian: "LAINNYA",
            },
          });
        }

        if (record.pengguna_id) {
          await tx.pengguna.update({
            where: { id: record.pengguna_id },
            data: {
              nama_lengkap: [teacher.gelar_depan, teacher.nama_lengkap, teacher.gelar_belakang]
                .filter(Boolean)
                .join(" "),
            },
          });
        }

        realTeacherIds.add(record.id);
        teacherMap.set(teacher.kode, record);
      }

      await tx.guru.updateMany({
        where: { sekolah_id: school.id, id: { notIn: [...realTeacherIds] } },
        data: { status_aktif: false },
      });

      const subjectMap = new Map();
      await tx.mataPelajaran.updateMany({
        where: { sekolah_id: school.id, kode: { notIn: Object.keys(SUBJECTS) } },
        data: { status_aktif: false },
      });
      for (const [code, [name, group]] of Object.entries(SUBJECTS)) {
        const subject = await tx.mataPelajaran.upsert({
          where: { sekolah_id_kode: { sekolah_id: school.id, kode: code } },
          update: { nama: name, kelompok: group, status_aktif: true, deskripsi: sourceNote },
          create: {
            id: ulid(),
            sekolah_id: school.id,
            kode: code,
            nama: name,
            kelompok: group,
            status_aktif: true,
            deskripsi: sourceNote,
          },
        });
        subjectMap.set(code, subject);
      }

      await tx.penugasanMengajar.updateMany({
        where: { sekolah_id: school.id, tahun_ajaran_id: academicYear.id, status: "AKTIF" },
        data: { status: "SELESAI", berlaku_sampai: publicationDate },
      });

      const groups = assignmentGroups(schedule);
      const existingSourceAssignments = await tx.penugasanMengajar.findMany({
        where: {
          sekolah_id: school.id,
          tahun_ajaran_id: academicYear.id,
          catatan: { startsWith: SOURCE_MARKER },
        },
      });
      const sourceAssignmentMap = new Map(
        existingSourceAssignments.map((assignment) => [
          `${assignment.guru_id}|${assignment.mata_pelajaran_id}|${assignment.rombel_id}`,
          assignment,
        ])
      );
      const assignmentMap = new Map();

      for (const group of groups) {
        const teacher = teacherMap.get(group.teacherCode);
        const subject = subjectMap.get(group.subjectCode);
        const classRecord = classMap.get(group.rombel);
        const databaseKey = `${teacher.id}|${subject.id}|${classRecord.id}`;
        const existing = sourceAssignmentMap.get(databaseKey);
        const assignmentData = {
          sekolah_id: school.id,
          guru_id: teacher.id,
          mata_pelajaran_id: subject.id,
          tahun_ajaran_id: academicYear.id,
          semester_id: semester.id,
          rombel_id: classRecord.id,
          jumlah_jam_minggu: group.hours,
          berlaku_mulai: academicYear.tanggal_mulai,
          berlaku_sampai: null,
          status: "AKTIF",
          catatan: `${SOURCE_MARKER} | ${group.key}${group.coTeaching ? " | Co-teaching agama" : ""}`,
        };
        const assignment = existing
          ? await tx.penugasanMengajar.update({ where: { id: existing.id }, data: assignmentData })
          : await tx.penugasanMengajar.create({ data: { id: ulid(), ...assignmentData } });
        assignmentMap.set(group.key, assignment);
      }

      await tx.penugasanWaliKelas.updateMany({
        where: { sekolah_id: school.id, tahun_ajaran_id: academicYear.id, status: "AKTIF" },
        data: { status: "SELESAI", berlaku_sampai: publicationDate },
      });
      const existingHomerooms = await tx.penugasanWaliKelas.findMany({
        where: {
          sekolah_id: school.id,
          tahun_ajaran_id: academicYear.id,
          catatan: { startsWith: SOURCE_MARKER },
        },
      });
      const existingHomeroomMap = new Map(existingHomerooms.map((item) => [item.rombel_id, item]));
      for (const classGroup of source.rombel) {
        const classRecord = classMap.get(classGroup.nama);
        const teacher = teacherMap.get(classGroup.kode_guru_wali);
        const data = {
          sekolah_id: school.id,
          guru_id: teacher.id,
          rombel_id: classRecord.id,
          tahun_ajaran_id: academicYear.id,
          berlaku_mulai: academicYear.tanggal_mulai,
          berlaku_sampai: null,
          status: "AKTIF",
          catatan: `${SOURCE_MARKER} | Kode wali ${classGroup.kode_guru_wali}`,
        };
        const existing = existingHomeroomMap.get(classRecord.id);
        if (existing) await tx.penugasanWaliKelas.update({ where: { id: existing.id }, data });
        else await tx.penugasanWaliKelas.create({ data: { id: ulid(), ...data } });
      }

      await tx.slotWaktu.updateMany({
        where: { sekolah_id: school.id },
        data: { status_aktif: false },
      });
      const slotMap = new Map();
      for (const slot of SLOT_DEFINITIONS) {
        const record = await tx.slotWaktu.upsert({
          where: { sekolah_id_kode: { sekolah_id: school.id, kode: slot.kode } },
          update: { ...slot, status_aktif: true },
          create: { id: ulid(), sekolah_id: school.id, ...slot, status_aktif: true },
        });
        slotMap.set(slot.kode, record);
      }

      const versionHashNote = `${sourceNote} | SHA256:${sourceHash} | Konflik guru dari sumber:${sourceWarnings.length}`;
      let version = await tx.versiJadwal.findFirst({
        where: {
          sekolah_id: school.id,
          tahun_ajaran_id: academicYear.id,
          nama: SOURCE_VERSION_NAME,
        },
        include: { _count: { select: { jadwal: true } } },
      });

      if (version) {
        if (
          version.catatan !== versionHashNote ||
          version._count.jadwal !== EXPECTED_SCHEDULE_CELLS
        ) {
          throw new Error(
            "Versi jadwal sumber sudah ada tetapi hash/jumlah entrinya berbeda. Buat versi baru; jangan menimpa histori."
          );
        }
      } else {
        const latestVersion = await tx.versiJadwal.findFirst({
          where: { sekolah_id: school.id, tahun_ajaran_id: academicYear.id },
          orderBy: { nomor_versi: "desc" },
        });
        version = await tx.versiJadwal.create({
          data: {
            id: ulid(),
            sekolah_id: school.id,
            tahun_ajaran_id: academicYear.id,
            semester_id: semester.id,
            nomor_versi: (latestVersion?.nomor_versi ?? 0) + 1,
            nama: SOURCE_VERSION_NAME,
            status: "DRAFT",
            tanggal_publikasi: null,
            dipublikasikan_oleh: null,
            catatan: versionHashNote,
          },
          include: { _count: { select: { jadwal: true } } },
        });

        const scheduleRows = schedule.map((entry) => {
          const teacherCode = entry.teacherCodes[0];
          const groupKey = `${teacherCode}|${entry.subjectCode}|${entry.rombel}`;
          const assignment = assignmentMap.get(groupKey);
          const teacher = teacherMap.get(teacherCode);
          const subject = subjectMap.get(entry.subjectCode);
          const classRecord = classMap.get(entry.rombel);
          const slot = slotMap.get(`${DAY_SLOT_PREFIX[entry.hari]}_${entry.slot}`);
          const coTeacherCodes = entry.teacherCodes.slice(1);
          const notes = [sourceNote];
          if (entry.sourceDescription) notes.push(entry.sourceDescription);
          if (coTeacherCodes.length) {
            notes.push(
              `Co-teacher: ${coTeacherCodes
                .map((code) => {
                  const item = teacherMap.get(code);
                  return `${item.nama_lengkap} (kode ${code})`;
                })
                .join(", ")}`
            );
          }
          return {
            id: ulid(),
            sekolah_id: school.id,
            versi_jadwal_id: version.id,
            tahun_ajaran_id: academicYear.id,
            semester_id: semester.id,
            rombel_id: classRecord.id,
            penugasan_mengajar_id: assignment.id,
            guru_id: teacher.id,
            mata_pelajaran_id: subject.id,
            slot_waktu_id: slot.id,
            hari: entry.hari,
            ruangan: null,
            catatan: notes.join(" | "),
          };
        });
        await tx.jadwalPelajaran.createMany({ data: scheduleRows });
      }

      await tx.versiJadwal.updateMany({
        where: {
          sekolah_id: school.id,
          tahun_ajaran_id: academicYear.id,
          status: "PUBLISHED",
          id: { not: version.id },
        },
        data: { status: "ARCHIVED" },
      });
      version = await tx.versiJadwal.update({
        where: { id: version.id },
        data: {
          status: "PUBLISHED",
          tanggal_publikasi: publicationDate,
          dipublikasikan_oleh: "Operator Kurikulum - sumber PDF resmi",
        },
      });

      const deletedFakeSessions = await tx.sesiKelasAktual.deleteMany({
        where: {
          sekolah_id: school.id,
          OR: [
            { topik_pembelajaran: { startsWith: "Pengantar Materi Pokok" } },
            { catatan: "KBM terlaksana dengan baik, semua siswa hadir aktif." },
            { catatan: "Sesi sedang berlangsung di lab." },
          ],
        },
      });

      return {
        schoolId: school.id,
        academicYearId: academicYear.id,
        versionId: version.id,
        teachers: teacherMap.size,
        subjects: subjectMap.size,
        classes: classMap.size,
        assignments: groups.length,
        homerooms: source.rombel.length,
        slots: SLOT_DEFINITIONS.length,
        scheduleCells: schedule.length,
        deletedFakeSessions: deletedFakeSessions.count,
        sourceConflicts: sourceWarnings.length,
      };
    },
    { maxWait: 10_000, timeout: 120_000 }
  );
}

async function auditImport(prisma, result) {
  const [
    teachers,
    subjects,
    classes,
    assignments,
    homerooms,
    slots,
    scheduleCells,
    publishedVersions,
    fakeSessions,
  ] = await Promise.all([
    prisma.guru.count({ where: { sekolah_id: result.schoolId, status_aktif: true } }),
    prisma.mataPelajaran.count({ where: { sekolah_id: result.schoolId, status_aktif: true } }),
    prisma.rombel.count({
      where: {
        sekolah_id: result.schoolId,
        tahun_ajaran_id: result.academicYearId,
        status: "AKTIF",
      },
    }),
    prisma.penugasanMengajar.count({
      where: {
        sekolah_id: result.schoolId,
        tahun_ajaran_id: result.academicYearId,
        status: "AKTIF",
      },
    }),
    prisma.penugasanWaliKelas.count({
      where: {
        sekolah_id: result.schoolId,
        tahun_ajaran_id: result.academicYearId,
        status: "AKTIF",
      },
    }),
    prisma.slotWaktu.count({ where: { sekolah_id: result.schoolId, status_aktif: true } }),
    prisma.jadwalPelajaran.count({ where: { versi_jadwal_id: result.versionId } }),
    prisma.versiJadwal.count({
      where: {
        sekolah_id: result.schoolId,
        tahun_ajaran_id: result.academicYearId,
        status: "PUBLISHED",
      },
    }),
    prisma.sesiKelasAktual.count({
      where: {
        sekolah_id: result.schoolId,
        OR: [
          { topik_pembelajaran: { startsWith: "Pengantar Materi Pokok" } },
          { catatan: "KBM terlaksana dengan baik, semua siswa hadir aktif." },
          { catatan: "Sesi sedang berlangsung di lab." },
        ],
      },
    }),
  ]);

  const actual = {
    teachers,
    subjects,
    classes,
    assignments,
    homerooms,
    slots,
    scheduleCells,
    publishedVersions,
    fakeSessions,
  };
  const expected = {
    teachers: result.teachers,
    subjects: result.subjects,
    classes: result.classes,
    assignments: result.assignments,
    homerooms: result.homerooms,
    slots: result.slots,
    scheduleCells: result.scheduleCells,
    publishedVersions: 1,
    fakeSessions: 0,
  };
  const mismatches = Object.keys(expected).filter((key) => actual[key] !== expected[key]);
  if (mismatches.length) {
    throw new Error(
      `Audit pasca-impor gagal: ${mismatches.map((key) => `${key}=${actual[key]} (target ${expected[key]})`).join(", ")}`
    );
  }
  return actual;
}

export async function runOtomindoScheduleImport(options = {}) {
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 10000;");
    const { source, schedule, warnings, hash } = await loadSource();
    const school = await resolveTargetSchool(prisma, source, options.schoolId ?? null);
    const groups = assignmentGroups(schedule);

    console.log(`Sumber valid: ${source.metadata.nama_sumber}`);
    console.log(
      `Target: ${school.nama} | ${source.guru.length} guru | ${source.rombel.length} rombel | ${groups.length} penugasan | ${schedule.length} sel jadwal`
    );
    if (warnings.length) {
      console.warn(
        `${warnings.length} konflik guru berasal dari PDF dan akan dicatat sebagai limitation versi jadwal.`
      );
    }

    if (!options.apply) {
      console.log("DRY RUN PASS - database belum diubah. Jalankan kembali dengan --apply.");
      return { dryRun: true, schoolId: school.id };
    }

    const result = await applyImport(prisma, source, schedule, hash, warnings, school);
    const audit = await auditImport(prisma, result);
    console.log("IMPORT PASS", { ...result, ...audit });
    return { dryRun: false, ...result, audit };
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  const options = parseOptions(process.argv.slice(2));
  runOtomindoScheduleImport(options).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
