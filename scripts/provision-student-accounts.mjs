import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ulid } from "ulidx";

const prisma = new PrismaClient();

const TENANT_ID = "01M2XXYD227F9S3H985FH53GMF";
const BOOTSTRAP_PASSWORD_PLAIN = "Oto2026!";
const isDryRun = process.argv.includes("--dry-run");

function slugifyRombel(nama) {
  return nama.toLowerCase().replace(/\s+/g, "");
}

async function main() {
  console.log("================================================================================");
  console.log("STAGE 11.9 — STUDENT ACCOUNT MASS PROVISIONING");
  console.log(`Tenant Target : SMK OTOMINDO (${TENANT_ID})`);
  console.log(`Mode          : ${isDryRun ? "DRY RUN (Simulasi Tanpa Commit)" : "LIVE EXECUTION"}`);
  console.log("================================================================================");

  // 1. Fetch all active students in tenant who don't have user account
  const unlinkedStudents = await prisma.siswa.findMany({
    where: {
      sekolah_id: TENANT_ID,
      status_akademik: "AKTIF",
      pengguna_id: null,
    },
    include: {
      keikutsertaan: {
        where: { status: "AKTIF" },
        include: {
          penempatan: {
            where: { status: "AKTIF" },
            include: {
              rombel: true,
            },
          },
        },
      },
    },
    orderBy: { nama_lengkap: "asc" },
  });

  console.log(`\nDitemukan ${unlinkedStudents.length} siswa aktif tanpa akun pengguna.`);

  if (unlinkedStudents.length === 0) {
    console.log("Seluruh siswa aktif telah memiliki akun pengguna. Tidak ada tindakan diperlukan.");
    return;
  }

  // 2. Pre-compute bcrypt password hash once for initial bootstrap
  console.log("\nMenghasilkan password hash awal untuk 'Oto2026!'...");
  const passwordHash = await bcrypt.hash(BOOTSTRAP_PASSWORD_PLAIN, 10);
  console.log("Password hash berhasil dibuat.");

  // 3. Prepare account payload and check username uniqueness
  const accountsToCreate = [];
  const usernameSet = new Set();
  const duplicateErrors = [];

  for (const s of unlinkedStudents) {
    const activeEnrollment = s.keikutsertaan[0];
    if (!activeEnrollment) {
      throw new Error(
        `Integritas rusak: Siswa ${s.nama_lengkap} (${s.id}) tidak memiliki enrollment aktif!`
      );
    }

    const activePlacement = activeEnrollment.penempatan[0];
    if (!activePlacement) {
      throw new Error(
        `Integritas rusak: Siswa ${s.nama_lengkap} (${s.id}) tidak memiliki penempatan rombel aktif!`
      );
    }

    const rombel = activePlacement.rombel;
    if (!rombel) {
      throw new Error(
        `Integritas rusak: Penempatan ${activePlacement.id} tidak memiliki relasi rombel!`
      );
    }

    if (!activePlacement.nomor_absen) {
      throw new Error(
        `Integritas rusak: Siswa ${s.nama_lengkap} (${s.id}) di rombel ${rombel.nama} tidak memiliki nomor absen!`
      );
    }

    const rombelSlug = slugifyRombel(rombel.nama);
    const absen2Digit = String(activePlacement.nomor_absen).padStart(2, "0");
    const username = `${rombelSlug}-${absen2Digit}`;

    if (usernameSet.has(username)) {
      duplicateErrors.push({
        username,
        siswa: s.nama_lengkap,
        rombel: rombel.nama,
        absen: activePlacement.nomor_absen,
      });
    }
    usernameSet.add(username);

    accountsToCreate.push({
      siswaId: s.id,
      namaLengkap: s.nama_lengkap,
      rombelNama: rombel.nama,
      nomorAbsen: activePlacement.nomor_absen,
      username,
    });
  }

  if (duplicateErrors.length > 0) {
    console.error("FATAL: Terdeteksi duplikasi username!", duplicateErrors);
    process.exit(1);
  }

  console.log(`\nValidasi Pra-Eksekusi:`);
  console.log(`- Total Akun Siap Dibuat : ${accountsToCreate.length}`);
  console.log(`- Total Username Unik    : ${usernameSet.size}`);
  console.log(`- Format Sampel          :`);
  accountsToCreate.slice(0, 5).forEach((acc, idx) => {
    console.log(
      `  ${idx + 1}. ${acc.username} -> ${acc.namaLengkap} (${acc.rombelNama} #${acc.nomorAbsen})`
    );
  });
  console.log(`  ...`);
  accountsToCreate.slice(-3).forEach((acc, idx) => {
    console.log(
      `  ${accountsToCreate.length - 2 + idx}. ${acc.username} -> ${acc.namaLengkap} (${acc.rombelNama} #${acc.nomorAbsen})`
    );
  });

  if (isDryRun) {
    console.log(
      "\n[DRY RUN BERHASIL] Simulasi selesai. Tidak ada mutasi yang diterapkan ke database."
    );
    return;
  }

  // 4. Execute Atomic Transaction in batches or single large transaction
  console.log("\nMemulai transaksi Prisma atomik untuk 700 akun...");
  const startTime = Date.now();

  const chunkSize = 100;
  let processed = 0;

  for (let i = 0; i < accountsToCreate.length; i += chunkSize) {
    const chunk = accountsToCreate.slice(i, i + chunkSize);

    await prisma.$transaction(
      async (tx) => {
        for (const item of chunk) {
          const userId = ulid();
          const membershipId = ulid();

          // A. Insert pengguna
          await tx.pengguna.create({
            data: {
              id: userId,
              sekolah_id: TENANT_ID,
              username: item.username,
              email: null,
              password_hash: passwordHash,
              nama_lengkap: item.namaLengkap,
              peran_dasar: "STUDENT",
              status_akun: "AKTIF",
              harus_ganti_password: true,
            },
          });

          // B. Insert keanggotaan_sekolah
          await tx.keanggotaanSekolah.create({
            data: {
              id: membershipId,
              pengguna_id: userId,
              sekolah_id: TENANT_ID,
              peran_dasar_di_tenant: "STUDENT",
              status_keanggotaan: "ACTIVE",
              is_owner: false,
            },
          });

          // C. Link siswa to user account
          await tx.siswa.update({
            where: { id: item.siswaId },
            data: { pengguna_id: userId },
          });
        }
      },
      { timeout: 30000 }
    );

    processed += chunk.length;
    console.log(`Progress: ${processed} / ${accountsToCreate.length} akun diprovisioning...`);
  }

  const durationMs = Date.now() - startTime;
  console.log(`\nPROVISIONING BERHASIL! Selesai dalam ${durationMs}ms.`);

  // 5. Record Audit Trail
  await prisma.logAudit.create({
    data: {
      id: ulid(),
      sekolah_id: TENANT_ID,
      aktor_id: "SYSTEM_SUPER_ADMIN",
      aktor_role: "SUPER_ADMIN",
      aksi: "BULK_STUDENT_ACCOUNT_PROVISION",
      tipe_sumber: "PENGGUNA",
      id_sumber: TENANT_ID,
      payload_sesudah: JSON.stringify({
        total_accounts_created: accountsToCreate.length,
        default_role: "STUDENT",
        tenant_id: TENANT_ID,
        harus_ganti_password: true,
      }),
    },
  });
  console.log("Audit log berhasil dicatat.");
}

main()
  .catch((err) => {
    console.error("ERROR EXECUTION:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
