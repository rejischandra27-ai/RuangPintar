import { Prisma } from "@prisma/client";
import { generateUlid } from "@/shared/lib/ulid";

interface SubjectTemplateEntry {
  kode: string;
  nama: string;
  kelompok: "UMUM" | "KEJURUAN";
}

export const DEFAULT_SUBJECT_TEMPLATES: Record<
  "SD" | "SMP" | "SMA" | "SMK",
  SubjectTemplateEntry[]
> = {
  SD: [
    { kode: "AGAMA", nama: "Pendidikan Agama", kelompok: "UMUM" },
    { kode: "PPKN", nama: "PPKn", kelompok: "UMUM" },
    { kode: "BIN", nama: "Bahasa Indonesia", kelompok: "UMUM" },
    { kode: "MTK", nama: "Matematika", kelompok: "UMUM" },
    { kode: "IPAS", nama: "IPAS", kelompok: "UMUM" },
    { kode: "SENI", nama: "Seni Budaya", kelompok: "UMUM" },
    { kode: "PJOK", nama: "PJOK", kelompok: "UMUM" },
  ],
  SMP: [
    { kode: "AGAMA", nama: "Pendidikan Agama", kelompok: "UMUM" },
    { kode: "PPKN", nama: "PPKn", kelompok: "UMUM" },
    { kode: "BIN", nama: "Bahasa Indonesia", kelompok: "UMUM" },
    { kode: "MTK", nama: "Matematika", kelompok: "UMUM" },
    { kode: "IPA", nama: "IPA", kelompok: "UMUM" },
    { kode: "IPS", nama: "IPS", kelompok: "UMUM" },
    { kode: "BING", nama: "Bahasa Inggris", kelompok: "UMUM" },
    { kode: "INF", nama: "Informatika", kelompok: "UMUM" },
    { kode: "SENI", nama: "Seni Budaya", kelompok: "UMUM" },
    { kode: "PJOK", nama: "PJOK", kelompok: "UMUM" },
  ],
  SMA: [
    { kode: "AGAMA", nama: "Pendidikan Agama", kelompok: "UMUM" },
    { kode: "PPKN", nama: "PPKn", kelompok: "UMUM" },
    { kode: "BIN", nama: "Bahasa Indonesia", kelompok: "UMUM" },
    { kode: "MTK", nama: "Matematika", kelompok: "UMUM" },
    { kode: "BING", nama: "Bahasa Inggris", kelompok: "UMUM" },
    { kode: "INF", nama: "Informatika", kelompok: "UMUM" },
    { kode: "SEJ", nama: "Sejarah", kelompok: "UMUM" },
    { kode: "SENI", nama: "Seni Budaya", kelompok: "UMUM" },
    { kode: "PJOK", nama: "PJOK", kelompok: "UMUM" },
  ],
  SMK: [
    { kode: "AGAMA", nama: "Pendidikan Agama", kelompok: "UMUM" },
    { kode: "PPKN", nama: "PPKn", kelompok: "UMUM" },
    { kode: "BIN", nama: "Bahasa Indonesia", kelompok: "UMUM" },
    { kode: "MTK", nama: "Matematika", kelompok: "UMUM" },
    { kode: "BING", nama: "Bahasa Inggris", kelompok: "UMUM" },
    { kode: "INF", nama: "Informatika", kelompok: "UMUM" },
    { kode: "PKJ", nama: "Projek Kejuruan", kelompok: "KEJURUAN" },
  ],
};

export async function provisionDefaultSubjects(
  tx: Prisma.TransactionClient,
  sekolahId: string,
  jenjang: string
): Promise<void> {
  if (!tx.mataPelajaran?.upsert) return;

  const key = jenjang.toUpperCase();
  if (!(key in DEFAULT_SUBJECT_TEMPLATES)) {
    throw new Error(`Jenjang provisioning tidak didukung: ${jenjang}`);
  }

  const template = DEFAULT_SUBJECT_TEMPLATES[key as keyof typeof DEFAULT_SUBJECT_TEMPLATES];

  for (const subject of template) {
    await tx.mataPelajaran.upsert({
      where: { sekolah_id_kode: { sekolah_id: sekolahId, kode: subject.kode } },
      update: {},
      create: {
        id: generateUlid(),
        sekolah_id: sekolahId,
        ...subject,
        status_aktif: true,
        status_lifecycle: "AKTIF",
      },
    });
  }
}
