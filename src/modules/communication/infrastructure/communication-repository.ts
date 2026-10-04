/**
 * Ruang Pintar — M16 Communication Repository
 * Data access layer teroptimasi untuk pengelolaan Pengumuman dan filter audiens server-side.
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import {
  AnnouncementCategory,
  AnnouncementFilter,
  AnnouncementItem,
  AnnouncementStatus,
  AudienceTarget,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../domain/communication-types";
import { BaseRole } from "@/shared/infrastructure/authorization/types";

export class CommunicationRepository {
  /**
   * Membuat pengumuman baru.
   */
  async create(
    sekolahId: string,
    penulisId: string,
    input: CreateAnnouncementInput
  ): Promise<AnnouncementItem> {
    const id = generateUlid();
    const status = input.status ?? "DRAFT";
    const dipublikasikanPada = status === "PUBLISHED" ? new Date() : null;

    const row = await prisma.pengumuman.create({
      data: {
        id,
        sekolah_id: sekolahId,
        penulis_id: penulisId,
        judul: input.judul,
        konten: input.konten,
        kategori: input.kategori,
        status,
        apakah_disematkan: input.apakah_disematkan ?? false,
        lampiran_url: input.lampiran_url ?? null,
        target_audiens: input.target_audiens,
        target_rombel_id: input.target_rombel_id ?? null,
        dipublikasikan_pada: dipublikasikanPada,
      },
      include: {
        penulis: {
          select: {
            id: true,
            nama_lengkap: true,
            peran_dasar: true,
          },
        },
        target_rombel: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });

    return this.mapToDomain(row);
  }

  /**
   * Memperbarui pengumuman.
   */
  async update(
    id: string,
    input: UpdateAnnouncementInput,
    sekolahId?: string
  ): Promise<AnnouncementItem> {
    const existing = await prisma.pengumuman.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });

    if (!existing) {
      throw new Error(`Pengumuman dengan ID ${id} tidak ditemukan atau bukan milik sekolah aktif.`);
    }

    let dipublikasikanPada = existing.dipublikasikan_pada;
    if (input.status === "PUBLISHED" && !existing.dipublikasikan_pada) {
      dipublikasikanPada = new Date();
    }

    const row = await prisma.pengumuman.update({
      where: { id },
      data: {
        ...(input.judul !== undefined && { judul: input.judul }),
        ...(input.konten !== undefined && { konten: input.konten }),
        ...(input.kategori !== undefined && { kategori: input.kategori }),
        ...(input.target_audiens !== undefined && { target_audiens: input.target_audiens }),
        ...(input.target_rombel_id !== undefined && { target_rombel_id: input.target_rombel_id }),
        ...(input.apakah_disematkan !== undefined && {
          apakah_disematkan: input.apakah_disematkan,
        }),
        ...(input.lampiran_url !== undefined && { lampiran_url: input.lampiran_url }),
        ...(input.status !== undefined && { status: input.status }),
        dipublikasikan_pada: dipublikasikanPada,
      },
      include: {
        penulis: {
          select: {
            id: true,
            nama_lengkap: true,
            peran_dasar: true,
          },
        },
        target_rombel: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });

    return this.mapToDomain(row);
  }

  /**
   * Menemukan pengumuman berdasarkan ID.
   */
  async findById(id: string, sekolahId?: string): Promise<AnnouncementItem | null> {
    const row = await prisma.pengumuman.findFirst({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
      include: {
        penulis: {
          select: {
            id: true,
            nama_lengkap: true,
            peran_dasar: true,
          },
        },
        target_rombel: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });

    return row ? this.mapToDomain(row) : null;
  }

  /**
   * Menghapus pengumuman.
   */
  async delete(id: string, sekolahId?: string): Promise<void> {
    const deleted = await prisma.pengumuman.deleteMany({
      where: { id, ...(sekolahId ? { sekolah_id: sekolahId } : {}) },
    });
    if (deleted.count === 0) {
      throw new Error(`Pengumuman dengan ID ${id} tidak ditemukan atau bukan milik sekolah aktif.`);
    }
  }

  /**
   * Mengambil seluruh pengumuman untuk manajemen (staf / super admin).
   */
  async getManageableList(
    sekolahId: string,
    filter?: AnnouncementFilter
  ): Promise<AnnouncementItem[]> {
    const where: any = {
      sekolah_id: sekolahId,
    };

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.kategori && filter.kategori !== "SEMUA") {
      where.kategori = filter.kategori;
    }

    if (filter?.pencarian && filter.pencarian.trim().length > 0) {
      where.OR = [
        { judul: { contains: filter.pencarian.trim() } },
        { konten: { contains: filter.pencarian.trim() } },
      ];
    }

    const rows = await prisma.pengumuman.findMany({
      where,
      orderBy: [{ apakah_disematkan: "desc" }, { created_at: "desc" }],
      include: {
        penulis: {
          select: {
            id: true,
            nama_lengkap: true,
            peran_dasar: true,
          },
        },
        target_rombel: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });

    return rows.map((r) => this.mapToDomain(r));
  }

  /**
   * Mengambil pengumuman terpublikasi yang sah untuk dilihat oleh pengguna
   * berdasarkan peran dasar dan keterkaitan rombelnya (Audience Server-Side Filter).
   */
  async getVisibleForUser(
    sekolahId: string,
    userId: string,
    role: BaseRole,
    rombelIds: string[] = [],
    filter?: AnnouncementFilter
  ): Promise<AnnouncementItem[]> {
    // 1. Super Admin melihat seluruh pengumuman published
    // 2. Guru: SEMUA, GURU, atau ROMBEL yang diampunya
    // 3. Siswa: SEMUA, SISWA, atau ROMBEL penempatannya
    // 4. Wali: SEMUA, WALI, atau ROMBEL anak binaannya
    const audienceConditions: any[] = [{ target_audiens: "SEMUA" }];

    if (role === "SUPER_ADMIN" || role === "SCHOOL_STAFF") {
      audienceConditions.push(
        { target_audiens: "GURU" },
        { target_audiens: "SISWA" },
        { target_audiens: "WALI" },
        { target_audiens: "ROMBEL" }
      );
    } else if (role === "TEACHER") {
      audienceConditions.push({ target_audiens: "GURU" });
      if (rombelIds.length > 0) {
        audienceConditions.push({
          target_audiens: "ROMBEL",
          target_rombel_id: { in: rombelIds },
        });
      }
    } else if (role === "STUDENT") {
      audienceConditions.push({ target_audiens: "SISWA" });
      if (rombelIds.length > 0) {
        audienceConditions.push({
          target_audiens: "ROMBEL",
          target_rombel_id: { in: rombelIds },
        });
      }
    } else if (role === "GUARDIAN") {
      audienceConditions.push({ target_audiens: "WALI" });
      if (rombelIds.length > 0) {
        audienceConditions.push({
          target_audiens: "ROMBEL",
          target_rombel_id: { in: rombelIds },
        });
      }
    }

    const where: any = {
      sekolah_id: sekolahId,
      status: "PUBLISHED",
      OR: audienceConditions,
    };

    if (filter?.kategori && filter.kategori !== "SEMUA") {
      where.kategori = filter.kategori;
    }

    if (filter?.pencarian && filter.pencarian.trim().length > 0) {
      where.AND = [
        {
          OR: [
            { judul: { contains: filter.pencarian.trim() } },
            { konten: { contains: filter.pencarian.trim() } },
          ],
        },
      ];
    }

    const rows = await prisma.pengumuman.findMany({
      where,
      orderBy: [
        { apakah_disematkan: "desc" },
        { dipublikasikan_pada: "desc" },
        { created_at: "desc" },
      ],
      include: {
        penulis: {
          select: {
            id: true,
            nama_lengkap: true,
            peran_dasar: true,
          },
        },
        target_rombel: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
    });

    return rows.map((r) => this.mapToDomain(r));
  }

  /**
   * Helper pemetaan row Prisma ke Domain Item.
   */
  private mapToDomain(row: any): AnnouncementItem {
    return {
      id: row.id,
      sekolah_id: row.sekolah_id,
      penulis_id: row.penulis_id,
      penulis: {
        id: row.penulis.id,
        nama_lengkap: row.penulis.nama_lengkap,
        peran_dasar: row.penulis.peran_dasar,
      },
      judul: row.judul,
      konten: row.konten,
      kategori: row.kategori as AnnouncementCategory,
      status: row.status as AnnouncementStatus,
      apakah_disematkan: row.apakah_disematkan,
      lampiran_url: row.lampiran_url,
      target_audiens: row.target_audiens as AudienceTarget,
      target_rombel_id: row.target_rombel_id,
      target_rombel: row.target_rombel
        ? {
            id: row.target_rombel.id,
            nama: row.target_rombel.nama,
          }
        : null,
      dipublikasikan_pada: row.dipublikasikan_pada,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
