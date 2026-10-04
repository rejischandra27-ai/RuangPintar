import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SOURCE_URL = new URL('./data/jadwal-otomindo-2026-2027.json', import.meta.url);

async function main() {
  const raw = await readFile(SOURCE_URL, 'utf8');
  const source = JSON.parse(raw);
  const jsonTeachers = source.guru;

  const smk = await prisma.sekolah.findFirst({ where: { nama: { contains: 'Otomindo' } } });
  const dbGurus = await prisma.guru.findMany({
    where: { sekolah_id: smk.id },
    include: {
      pengguna: true,
      penugasan_wali: { include: { rombel: true } },
      penugasan_mengajar: { include: { mata_pelajaran: true, rombel: true } },
      jadwal_pelajaran: true,
    }
  });

  console.log(`SMK Otomindo ID: ${smk.id}`);
  console.log(`Guru di JSON resmi: ${jsonTeachers.length}`);
  console.log(`Guru di DB saat ini: ${dbGurus.length}`);

  for (const jt of jsonTeachers) {
    const code = jt.kode;
    // Find matching records in DB
    const matches = dbGurus.filter(g => {
      // Check catatan code
      const m = g.catatan ? (g.catatan.match(/KODE_GURU:(\d+)/i) || g.catatan.match(/Kode guru (\d+)/i)) : null;
      if (m && Number(m[1]) === code) return true;
      // Or check name similarity
      const cleanDB = g.nama_lengkap.toLowerCase().replace(/[^a-z]/g, '');
      const cleanJSON = jt.nama_lengkap.toLowerCase().replace(/[^a-z]/g, '');
      return cleanDB.includes(cleanJSON) || cleanJSON.includes(cleanDB);
    });

    console.log(`\n========================================`);
    console.log(`KODE ${code}: "${jt.nama_lengkap}" (Gelar: ${jt.gelar_depan || '-'}/${jt.gelar_belakang || '-'}) -> DB matches: ${matches.length}`);
    for (const m of matches) {
      const waliRombels = m.penugasan_wali.map(w => w.rombel.nama).join(', ');
      console.log(`  [${m.id}]`);
      console.log(`    Nama di DB: "${m.nama_lengkap}"`);
      console.log(`    Status Kepegawaian: ${m.status_kepegawaian}`);
      console.log(`    Status Aktif: ${m.status_aktif}`);
      console.log(`    User: ${m.pengguna ? `${m.pengguna.username} (${m.pengguna.email})` : 'TIDAK ADA'}`);
      console.log(`    Penugasan Mengajar: ${m.penugasan_mengajar.length} slot/mapel`);
      console.log(`    Jadwal Pelajaran: ${m.jadwal_pelajaran.length} sesi`);
      console.log(`    Penugasan Wali: ${m.penugasan_wali.length} (${waliRombels || '-'})`);
      console.log(`    Catatan: ${m.catatan}`);
    }
  }

  // Check any orphan teachers in DB not matching any JSON teacher
  const matchedDbIds = new Set();
  for (const jt of jsonTeachers) {
    const code = jt.kode;
    dbGurus.forEach(g => {
      const m = g.catatan ? (g.catatan.match(/KODE_GURU:(\d+)/i) || g.catatan.match(/Kode guru (\d+)/i)) : null;
      if (m && Number(m[1]) === code) matchedDbIds.add(g.id);
      const cleanDB = g.nama_lengkap.toLowerCase().replace(/[^a-z]/g, '');
      const cleanJSON = jt.nama_lengkap.toLowerCase().replace(/[^a-z]/g, '');
      if (cleanDB.includes(cleanJSON) || cleanJSON.includes(cleanDB)) matchedDbIds.add(g.id);
    });
  }

  const orphans = dbGurus.filter(g => !matchedDbIds.has(g.id));
  console.log(`\n========================================`);
  console.log(`Guru DB yang tidak cocok sama sekali: ${orphans.length}`);
  for (const o of orphans) {
    console.log(`  Orphan: [${o.id}] "${o.nama_lengkap}" | User: ${o.pengguna?.username || 'NONE'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
