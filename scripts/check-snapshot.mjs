import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const pref = await prisma.preferensiOnboardingGuru.findFirst({
    where: { pengguna_id: "01M3DF8K4Y5519PYBW4NS6P3QH" },
  });
  console.log("Preference record in DB:", pref);

  const user = await prisma.pengguna.findUnique({
    where: { id: "01M3DF8K4Y5519PYBW4NS6P3QH" },
  });
  console.log("User record in DB:", {
    id: user?.id,
    sekolah_id: user?.sekolah_id,
    peran_dasar: user?.peran_dasar,
  });

  const keanggotaan = await prisma.keanggotaanSekolah.findFirst({
    where: { pengguna_id: "01M3DF8K4Y5519PYBW4NS6P3QH" },
  });
  console.log("Keanggotaan in DB:", keanggotaan);

  await prisma.$disconnect();
}

main().catch(console.error);
