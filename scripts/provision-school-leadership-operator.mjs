import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ulid } from "ulidx";

const prisma = new PrismaClient();

async function main() {
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 10000;");
  console.log("=== MEMULAI PROVISIONING AKUN & JABATAN STRUKTURAL ===");

  const school = await prisma.sekolah.findFirst({
    where: { nama: { contains: "Otomindo" } },
  });

  if (!school) {
    throw new Error("Sekolah SMK Otomindo tidak ditemukan!");
  }
  console.log(`[+] Sekolah Target: ${school.nama} (${school.id})`);

  const passwordHash = await bcrypt.hash("Password123#", 10);

  // =========================================================================
  // 1. PROVISIONING AKUN DODI HERMAWAN (STAFF TU / OPERATOR SEKOLAH)
  // =========================================================================
  console.log("\n--- 1. PROVISIONING DODI HERMAWAN ---");
  let dodiUser = await prisma.pengguna.findFirst({
    where: {
      OR: [
        { username: "operator.dodi" },
        { email: "dodi.hermawan@otomindo.sch.id" },
        { nama_lengkap: "Dodi Hermawan" },
      ],
    },
  });

  if (!dodiUser) {
    const dodiId = ulid();
    dodiUser = await prisma.pengguna.create({
      data: {
        id: dodiId,
        sekolah_id: school.id,
        username: "operator.dodi",
        email: "dodi.hermawan@otomindo.sch.id",
        nama_lengkap: "Dodi Hermawan",
        password_hash: passwordHash,
        peran_dasar: "SCHOOL_STAFF",
        status_akun: "AKTIF",
        harus_ganti_password: false,
        tipe_lisensi: "SEKOLAH",
      },
    });
    console.log(`[+] Akun Pengguna Dodi Hermawan berhasil dibuat:`);
    console.log(`    - ID: ${dodiUser.id}`);
    console.log(`    - Username: ${dodiUser.username}`);
    console.log(`    - Peran: ${dodiUser.peran_dasar}`);
  } else {
    dodiUser = await prisma.pengguna.update({
      where: { id: dodiUser.id },
      data: {
        username: "operator.dodi",
        email: "dodi.hermawan@otomindo.sch.id",
        password_hash: passwordHash,
        peran_dasar: "SCHOOL_STAFF",
        status_akun: "AKTIF",
        tipe_lisensi: "SEKOLAH",
      },
    });
    console.log(`[i] Akun Pengguna Dodi Hermawan diperbarui: ${dodiUser.username}`);
  }

  // 1b. Keanggotaan Sekolah Dodi
  await prisma.keanggotaanSekolah.upsert({
    where: {
      pengguna_id_sekolah_id: {
        pengguna_id: dodiUser.id,
        sekolah_id: school.id,
      },
    },
    update: {
      peran_dasar_di_tenant: "SCHOOL_STAFF",
      status_keanggotaan: "ACTIVE",
      is_owner: false,
    },
    create: {
      id: ulid(),
      pengguna_id: dodiUser.id,
      sekolah_id: school.id,
      peran_dasar_di_tenant: "SCHOOL_STAFF",
      status_keanggotaan: "ACTIVE",
      is_owner: false,
      sumber_pendaftaran: "OWNER_CREATE",
      berlaku_mulai: new Date("2026-07-01"),
    },
  });
  console.log(`[+] Keanggotaan Sekolah Dodi: ACTIVE`);

  // 1c. Kemampuan Staff Dodi (Full Operator Bundle)
  const staffCapabilities = [
    "SYSTEM_ADMIN",
    "ACADEMIC_OPERATOR",
    "STUDENT_DATA_OPERATOR",
    "REPORT_OPERATOR",
  ];

  for (const cap of staffCapabilities) {
    await prisma.kemampuanStaff.upsert({
      where: {
        pengguna_id_kode_kemampuan: {
          pengguna_id: dodiUser.id,
          kode_kemampuan: cap,
        },
      },
      update: {},
      create: {
        id: ulid(),
        pengguna_id: dodiUser.id,
        kode_kemampuan: cap,
      },
    });
  }
  console.log(`[+] Kemampuan Staff Dodi: ${staffCapabilities.join(", ")}`);

  // 1d. Jabatan & Penugasan Jabatan Operator
  let opJabatan = await prisma.jabatan.findFirst({
    where: {
      sekolah_id: school.id,
      kode_jabatan: "OPERATOR_SEKOLAH",
    },
  });
  if (!opJabatan) {
    opJabatan = await prisma.jabatan.create({
      data: {
        id: ulid(),
        sekolah_id: school.id,
        kode_jabatan: "OPERATOR_SEKOLAH",
        nama_jabatan: "Staff Tata Usaha & Operator Sekolah",
        tingkat_akses: "SCHOOL_WIDE",
      },
    });
  }

  const existingDodiPenugasan = await prisma.penugasanJabatan.findFirst({
    where: {
      sekolah_id: school.id,
      jabatan_id: opJabatan.id,
      personil_id: dodiUser.id,
    },
  });

  if (!existingDodiPenugasan) {
    await prisma.penugasanJabatan.create({
      data: {
        id: ulid(),
        sekolah_id: school.id,
        jabatan_id: opJabatan.id,
        personil_id: dodiUser.id,
        berlaku_mulai: new Date("2026-07-01"),
        status: "AKTIF",
        catatan: "Staff Tata Usaha & Operator Sekolah Resmi SMK OTOMINDO",
      },
    });
  }
  console.log(`[+] Penugasan Jabatan Dodi Hermawan: Staff Tata Usaha & Operator Sekolah`);

  // =========================================================================
  // 2. PENUGASAN JABATAN WAYAN BUDI ISMAWATI, M.Pd (WAKASEK KURIKULUM)
  // =========================================================================
  console.log("\n--- 2. PROVISIONING WAYAN BUDI ISMAWATI, M.Pd ---");
  const wayanUser = await prisma.pengguna.findFirst({
    where: {
      OR: [
        { username: "guru.wayanbudiism_3" },
        { nama_lengkap: { contains: "Wayan Budi Ismawati" } },
      ],
    },
  });

  if (!wayanUser) {
    throw new Error("Akun Wayan Budi Ismawati tidak ditemukan!");
  }

  // Update tipe_lisensi ke SEKOLAH & password hash
  await prisma.pengguna.update({
    where: { id: wayanUser.id },
    data: {
      tipe_lisensi: "SEKOLAH",
      password_hash: passwordHash,
      status_akun: "AKTIF",
    },
  });

  // Pastikan Keanggotaan Sekolah Aktif
  await prisma.keanggotaanSekolah.upsert({
    where: {
      pengguna_id_sekolah_id: {
        pengguna_id: wayanUser.id,
        sekolah_id: school.id,
      },
    },
    update: {
      status_keanggotaan: "ACTIVE",
    },
    create: {
      id: ulid(),
      pengguna_id: wayanUser.id,
      sekolah_id: school.id,
      peran_dasar_di_tenant: "TEACHER",
      status_keanggotaan: "ACTIVE",
      is_owner: false,
      sumber_pendaftaran: "MIGRASI_LEGACY",
      berlaku_mulai: new Date("2026-07-01"),
    },
  });

  // Jabatan VICE_PRINCIPAL_CURRICULUM
  let wakasekCurriculumJabatan = await prisma.jabatan.findFirst({
    where: {
      sekolah_id: school.id,
      kode_jabatan: "VICE_PRINCIPAL_CURRICULUM",
    },
  });

  if (!wakasekCurriculumJabatan) {
    wakasekCurriculumJabatan = await prisma.jabatan.create({
      data: {
        id: ulid(),
        sekolah_id: school.id,
        kode_jabatan: "VICE_PRINCIPAL_CURRICULUM",
        nama_jabatan: "Wakil Kepala Sekolah Bidang Kurikulum",
        tingkat_akses: "SCHOOL_WIDE",
      },
    });
    console.log(`[+] Master Jabatan dibuat: VICE_PRINCIPAL_CURRICULUM`);
  }

  // Penugasan Jabatan untuk Wayan Budi Ismawati
  const existingWayanPenugasan = await prisma.penugasanJabatan.findFirst({
    where: {
      sekolah_id: school.id,
      jabatan_id: wakasekCurriculumJabatan.id,
      personil_id: wayanUser.id,
    },
  });

  if (!existingWayanPenugasan) {
    await prisma.penugasanJabatan.create({
      data: {
        id: ulid(),
        sekolah_id: school.id,
        jabatan_id: wakasekCurriculumJabatan.id,
        personil_id: wayanUser.id,
        berlaku_mulai: new Date("2026-07-01"),
        status: "AKTIF",
        catatan: "Wakil Kepala Sekolah Bidang Kurikulum SMK OTOMINDO",
      },
    });
    console.log(
      `[+] Penugasan Jabatan Wayan Budi Ismawati berhasil dibuat: VICE_PRINCIPAL_CURRICULUM`
    );
  } else {
    await prisma.penugasanJabatan.update({
      where: { id: existingWayanPenugasan.id },
      data: { status: "AKTIF" },
    });
    console.log(`[i] Penugasan Jabatan Wayan Budi Ismawati sudah ada dan berstatus AKTIF`);
  }

  // =========================================================================
  // 3. VERIFIKASI & UPDATE NATALIA BUTARBUTAR, S.Kom (KEPALA SEKOLAH)
  // =========================================================================
  console.log("\n--- 3. VERIFIKASI NATALIA BUTARBUTAR, S.Kom ---");
  const nataliaUser = await prisma.pengguna.findFirst({
    where: {
      OR: [
        { username: "guru.nataliabutar_1" },
        { nama_lengkap: { contains: "Natalia Butarbutar" } },
      ],
    },
  });

  if (nataliaUser) {
    await prisma.pengguna.update({
      where: { id: nataliaUser.id },
      data: {
        tipe_lisensi: "SEKOLAH",
        password_hash: passwordHash,
        status_akun: "AKTIF",
      },
    });

    await prisma.keanggotaanSekolah.upsert({
      where: {
        pengguna_id_sekolah_id: {
          pengguna_id: nataliaUser.id,
          sekolah_id: school.id,
        },
      },
      update: {
        status_keanggotaan: "ACTIVE",
      },
      create: {
        id: ulid(),
        pengguna_id: nataliaUser.id,
        sekolah_id: school.id,
        peran_dasar_di_tenant: "TEACHER",
        status_keanggotaan: "ACTIVE",
        is_owner: false,
        sumber_pendaftaran: "MIGRASI_LEGACY",
        berlaku_mulai: new Date("2026-07-01"),
      },
    });
    console.log(`[+] Akun & Keanggotaan Sekolah Natalia Butarbutar terverifikasi AKTIF`);
  }

  console.log("\n=== RINGKASAN AKUN LENGKAP ===");
  console.log("1. Kepala Sekolah:");
  console.log("   - Nama: Natalia Butarbutar, S.Kom");
  console.log("   - Username: guru.nataliabutar_1");
  console.log("   - Jabatan: HEADMASTER (Kepala Sekolah)");
  console.log("   - Password: Password123#");

  console.log("\n2. Wakasek Kurikulum:");
  console.log("   - Nama: Wayan Budi Ismawati, M.Pd");
  console.log("   - Username: guru.wayanbudiism_3");
  console.log("   - Jabatan: VICE_PRINCIPAL_CURRICULUM (Wakil Kepala Sekolah Bidang Kurikulum)");
  console.log("   - Password: Password123#");

  console.log("\n3. Staff Tata Usaha / Operator Sekolah:");
  console.log("   - Nama: Dodi Hermawan");
  console.log("   - Username: operator.dodi");
  console.log("   - Email: dodi.hermawan@otomindo.sch.id");
  console.log("   - Peran: SCHOOL_STAFF");
  console.log("   - Jabatan: Staff Tata Usaha & Operator Sekolah");
  console.log("   - Password: Password123#");
}

main()
  .catch((err) => {
    console.error("ERROR PROVISIONING:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
