/**
 * Ruang Pintar — M09 Academic Calendar Repository Layer
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import {
  CalendarEventDTO,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "../domain/calendar-types";

export class CalendarRepository {
  async findById(id: string, sekolah_id: string): Promise<CalendarEventDTO | null> {
    const record = await prisma.kalenderAkademik.findFirst({
      where: { id, sekolah_id },
      include: {
        tahun_ajaran: true,
        semester: true,
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      sekolah_id: record.sekolah_id,
      tahun_ajaran_id: record.tahun_ajaran_id,
      tahun_ajaran_nama: record.tahun_ajaran.nama,
      semester_id: record.semester_id,
      semester_nama: record.semester?.nama ?? null,
      judul: record.judul,
      deskripsi: record.deskripsi,
      tipe_event: record.tipe_event as any,
      tanggal_mulai: record.tanggal_mulai,
      tanggal_selesai: record.tanggal_selesai,
      libur_kbm: record.libur_kbm,
      warna: record.warna,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }

  async listBySchool(
    sekolah_id: string,
    filters?: {
      tahun_ajaran_id?: string;
      semester_id?: string;
      tipe_event?: string;
      dari_tanggal?: Date;
      sampai_tanggal?: Date;
    }
  ): Promise<CalendarEventDTO[]> {
    const where: any = { sekolah_id };

    if (filters?.tahun_ajaran_id && filters.tahun_ajaran_id !== "ALL") {
      where.tahun_ajaran_id = filters.tahun_ajaran_id;
    }
    if (filters?.semester_id && filters.semester_id !== "ALL") {
      where.semester_id = filters.semester_id;
    }
    if (filters?.tipe_event && filters.tipe_event !== "ALL") {
      where.tipe_event = filters.tipe_event;
    }
    if (filters?.dari_tanggal && filters?.sampai_tanggal) {
      where.OR = [
        {
          tanggal_mulai: { lte: filters.sampai_tanggal },
          tanggal_selesai: { gte: filters.dari_tanggal },
        },
      ];
    }

    const records = await prisma.kalenderAkademik.findMany({
      where,
      include: {
        tahun_ajaran: true,
        semester: true,
      },
      orderBy: {
        tanggal_mulai: "asc",
      },
    });

    return records.map((record) => ({
      id: record.id,
      sekolah_id: record.sekolah_id,
      tahun_ajaran_id: record.tahun_ajaran_id,
      tahun_ajaran_nama: record.tahun_ajaran.nama,
      semester_id: record.semester_id,
      semester_nama: record.semester?.nama ?? null,
      judul: record.judul,
      deskripsi: record.deskripsi,
      tipe_event: record.tipe_event as any,
      tanggal_mulai: record.tanggal_mulai,
      tanggal_selesai: record.tanggal_selesai,
      libur_kbm: record.libur_kbm,
      warna: record.warna,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }));
  }

  async create(data: CreateCalendarEventInput): Promise<CalendarEventDTO> {
    const id = generateUlid();
    const record = await prisma.kalenderAkademik.create({
      data: {
        id,
        sekolah_id: data.sekolah_id,
        tahun_ajaran_id: data.tahun_ajaran_id,
        semester_id: data.semester_id || null,
        judul: data.judul,
        deskripsi: data.deskripsi || null,
        tipe_event: data.tipe_event,
        tanggal_mulai: new Date(data.tanggal_mulai),
        tanggal_selesai: new Date(data.tanggal_selesai),
        libur_kbm: data.libur_kbm ?? false,
        warna: data.warna || null,
      },
      include: {
        tahun_ajaran: true,
        semester: true,
      },
    });

    return {
      id: record.id,
      sekolah_id: record.sekolah_id,
      tahun_ajaran_id: record.tahun_ajaran_id,
      tahun_ajaran_nama: record.tahun_ajaran.nama,
      semester_id: record.semester_id,
      semester_nama: record.semester?.nama ?? null,
      judul: record.judul,
      deskripsi: record.deskripsi,
      tipe_event: record.tipe_event as any,
      tanggal_mulai: record.tanggal_mulai,
      tanggal_selesai: record.tanggal_selesai,
      libur_kbm: record.libur_kbm,
      warna: record.warna,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }

  async update(data: UpdateCalendarEventInput): Promise<CalendarEventDTO> {
    const existing = await prisma.kalenderAkademik.findFirst({
      where: { id: data.id, ...(data.sekolah_id ? { sekolah_id: data.sekolah_id } : {}) },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(
        `Kalender akademik dengan ID '${data.id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }

    const updatePayload: any = {};
    if (data.tahun_ajaran_id !== undefined) updatePayload.tahun_ajaran_id = data.tahun_ajaran_id;
    if (data.semester_id !== undefined) updatePayload.semester_id = data.semester_id || null;
    if (data.judul !== undefined) updatePayload.judul = data.judul;
    if (data.deskripsi !== undefined) updatePayload.deskripsi = data.deskripsi || null;
    if (data.tipe_event !== undefined) updatePayload.tipe_event = data.tipe_event;
    if (data.tanggal_mulai !== undefined)
      updatePayload.tanggal_mulai = new Date(data.tanggal_mulai);
    if (data.tanggal_selesai !== undefined)
      updatePayload.tanggal_selesai = new Date(data.tanggal_selesai);
    if (data.libur_kbm !== undefined) updatePayload.libur_kbm = data.libur_kbm;
    if (data.warna !== undefined) updatePayload.warna = data.warna || null;

    const record = await prisma.kalenderAkademik.update({
      where: { id: data.id },
      data: updatePayload,
      include: {
        tahun_ajaran: true,
        semester: true,
      },
    });

    return {
      id: record.id,
      sekolah_id: record.sekolah_id,
      tahun_ajaran_id: record.tahun_ajaran_id,
      tahun_ajaran_nama: record.tahun_ajaran.nama,
      semester_id: record.semester_id,
      semester_nama: record.semester?.nama ?? null,
      judul: record.judul,
      deskripsi: record.deskripsi,
      tipe_event: record.tipe_event as any,
      tanggal_mulai: record.tanggal_mulai,
      tanggal_selesai: record.tanggal_selesai,
      libur_kbm: record.libur_kbm,
      warna: record.warna,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }

  async delete(id: string, sekolah_id: string): Promise<boolean> {
    const deleted = await prisma.kalenderAkademik.deleteMany({
      where: { id, sekolah_id },
    });
    if (deleted.count === 0) {
      throw new Error(
        `Kalender akademik dengan ID '${id}' tidak ditemukan atau bukan milik sekolah aktif.`
      );
    }
    return true;
  }
}

export const calendarRepository = new CalendarRepository();
