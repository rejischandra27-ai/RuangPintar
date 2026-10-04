import { readSheet } from "read-excel-file/node";
import { generateUlid } from "@/shared/lib/ulid";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 500;

interface ImportedStudentRow {
  nis: string;
  nama_lengkap: string;
  jenis_kelamin: "L" | "P";
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("id-ID")
    .replace(/[\s_-]+/g, "");
}

export async function parseStudentWorkbook(buffer: Buffer): Promise<ImportedStudentRow[]> {
  if (buffer.byteLength > MAX_IMPORT_BYTES) throw new Error("File Excel maksimal 5 MB.");
  const sheetRows = await readSheet(buffer);
  if (sheetRows.length < 2) throw new Error("Sheet Excel belum berisi baris siswa.");
  if (sheetRows.length - 1 > MAX_IMPORT_ROWS) {
    throw new Error(`Maksimal ${MAX_IMPORT_ROWS} siswa per import.`);
  }

  const headerMap = new Map<string, number>();
  sheetRows[0].forEach((cell, column) =>
    headerMap.set(normalizeHeader(String(cell ?? "")), column)
  );
  const findHeader = (...names: string[]) =>
    names
      .map(normalizeHeader)
      .map((name) => headerMap.get(name))
      .find((column) => column !== undefined);
  const nisColumn = findHeader("nis");
  const nameColumn = findHeader("nama lengkap", "nama_lengkap", "nama");
  const genderColumn = findHeader("jenis kelamin", "jenis_kelamin", "jk", "gender");
  if (nisColumn === undefined || nameColumn === undefined || genderColumn === undefined) {
    throw new Error("Kolom wajib: NIS, Nama Lengkap, dan Jenis Kelamin (L/P).");
  }

  const parsed: ImportedStudentRow[] = [];
  for (let rowNumber = 1; rowNumber < sheetRows.length; rowNumber++) {
    const row = sheetRows[rowNumber];
    const nis = String(row[nisColumn] ?? "").trim();
    const nama_lengkap = String(row[nameColumn] ?? "").trim();
    const rawGender = String(row[genderColumn] ?? "")
      .trim()
      .toLocaleUpperCase("id-ID");
    const jenis_kelamin =
      rawGender === "L" || rawGender.startsWith("LAKI")
        ? "L"
        : rawGender === "P" || rawGender.startsWith("PEREMPUAN")
          ? "P"
          : null;
    if (!nis && !nama_lengkap && !rawGender) continue;
    if (!nis || nis.length > 30 || !/^[a-zA-Z0-9\-_./]+$/.test(nis)) {
      throw new Error(`NIS tidak valid pada baris data ${rowNumber}.`);
    }
    if (nama_lengkap.length < 2 || nama_lengkap.length > 150) {
      throw new Error(`Nama siswa tidak valid pada baris data ${rowNumber}.`);
    }
    if (!jenis_kelamin)
      throw new Error(`Jenis kelamin L/P tidak valid pada baris data ${rowNumber}.`);
    parsed.push({ nis, nama_lengkap, jenis_kelamin });
  }

  if (parsed.length === 0) throw new Error("Tidak ada baris siswa valid untuk diimport.");
  const nisSet = new Set<string>();
  for (const row of parsed) {
    const normalizedNis = row.nis.toLocaleLowerCase("id-ID");
    if (nisSet.has(normalizedNis)) throw new Error(`NIS ${row.nis} duplikat di dalam file.`);
    nisSet.add(normalizedNis);
  }
  return parsed;
}

export class StudentImportService {
  async importIntoRombel(input: {
    sekolahId: string;
    rombelId: string;
    actorId: string;
    actorRole: string;
    workbook: Buffer;
  }): Promise<{ importedCount: number }> {
    const rows = await parseStudentWorkbook(input.workbook);
    const rombel = await prisma.rombel.findFirst({
      where: { id: input.rombelId, sekolah_id: input.sekolahId, status: "AKTIF" },
      select: { id: true, nama: true, kapasitas: true, tingkat_id: true, tahun_ajaran_id: true },
    });
    if (!rombel) throw new Error("Kelas aktif tidak ditemukan pada tenant ini.");

    await prisma.$transaction(async (tx) => {
      const currentRombel = await tx.rombel.findFirst({
        where: { id: input.rombelId, sekolah_id: input.sekolahId, status: "AKTIF" },
        select: { id: true, nama: true, kapasitas: true, tingkat_id: true, tahun_ajaran_id: true },
      });
      if (!currentRombel) throw new Error("Kelas aktif tidak ditemukan pada tenant ini.");

      const existingStudents = await tx.siswa.findMany({
        where: { sekolah_id: input.sekolahId, nis: { in: rows.map((row) => row.nis) } },
        select: { nis: true },
      });
      if (existingStudents.length > 0) {
        throw new Error(`NIS ${existingStudents[0].nis} sudah terdaftar pada tenant ini.`);
      }

      const currentPlacementCount = await tx.penempatanRombel.count({
        where: { sekolah_id: input.sekolahId, rombel_id: currentRombel.id, status: "AKTIF" },
      });
      if (currentPlacementCount + rows.length > currentRombel.kapasitas) {
        throw new Error(
          `Kapasitas ${currentRombel.nama} tersisa ${Math.max(0, currentRombel.kapasitas - currentPlacementCount)} siswa; file berisi ${rows.length}.`
        );
      }

      const importedIds: string[] = [];
      for (const row of rows) {
        const studentId = generateUlid();
        const enrollmentId = generateUlid();
        await tx.siswa.create({
          data: {
            id: studentId,
            sekolah_id: input.sekolahId,
            nis: row.nis,
            nama_lengkap: row.nama_lengkap,
            jenis_kelamin: row.jenis_kelamin,
            status_akademik: "AKTIF",
          },
        });
        await tx.keikutsertaanSiswa.create({
          data: {
            id: enrollmentId,
            sekolah_id: input.sekolahId,
            siswa_id: studentId,
            tahun_ajaran_id: rombel.tahun_ajaran_id,
            tingkat_id: rombel.tingkat_id,
            status: "AKTIF",
          },
        });
        await tx.penempatanRombel.create({
          data: {
            id: generateUlid(),
            sekolah_id: input.sekolahId,
            keikutsertaan_id: enrollmentId,
            rombel_id: rombel.id,
            status: "AKTIF",
          },
        });
        importedIds.push(studentId);
      }

      await recordAuditEvent(
        {
          sekolah_id: input.sekolahId,
          aktor_id: input.actorId,
          aktor_role: input.actorRole,
          aksi: "IMPORT",
          tipe_sumber: "SISWA",
          id_sumber: rombel.id,
          payload_sesudah: { rombel_id: rombel.id, imported_count: importedIds.length },
        },
        tx
      );
    });

    return { importedCount: rows.length };
  }
}

export const studentImportService = new StudentImportService();
