/**
 * Ruang Pintar — M16 Communication Application Service
 *
 * Mengatur orkestrasi bisnis pengumuman sekolah, pemeriksaan audiens,
 * penegakan hak akses, audit logging, dan triggering event notifikasi ke M17.
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import { CommunicationRepository } from "../infrastructure/communication-repository";
import { NotificationService } from "@/modules/notification/application/notification-service";
import {
  AnnouncementFilter,
  AnnouncementItem,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../domain/communication-types";
import {
  AnnouncementNotFoundError,
  AnnouncementValidationError,
  UnauthorizedAnnouncementManageError,
} from "../domain/communication-errors";
import {
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
} from "../domain/communication-validation";
import { BaseRole } from "@/shared/infrastructure/authorization/types";

export class CommunicationService {
  constructor(
    private readonly repository: CommunicationRepository = new CommunicationRepository(),
    private readonly notificationService: NotificationService = new NotificationService()
  ) {}

  /**
   * Membuat pengumuman baru (DRAFT atau langsung PUBLISHED).
   */
  async createAnnouncement(
    sekolahId: string,
    authorUser: { id: string; nama: string; peran: BaseRole },
    input: CreateAnnouncementInput
  ): Promise<AnnouncementItem> {
    const parseResult = CreateAnnouncementSchema.safeParse(input);
    if (!parseResult.success) {
      throw new AnnouncementValidationError(
        parseResult.error.issues.map((e) => e.message).join(", ")
      );
    }

    const validated = parseResult.data;

    const announcement = await this.repository.create(sekolahId, authorUser.id, validated);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: authorUser.id,
      aktor_role: authorUser.peran,
      aksi: "CREATE_ANNOUNCEMENT",
      tipe_sumber: "PENGUMUMAN",
      id_sumber: announcement.id,
      payload_sesudah: {
        judul: announcement.judul,
        kategori: announcement.kategori,
        target_audiens: announcement.target_audiens,
        status: announcement.status,
      },
    });

    // Jika langsung diterbitkan (PUBLISHED), trigger notifikasi ke audiens sasaran (M16 -> M17)
    if (announcement.status === "PUBLISHED") {
      await this.notificationService.dispatchAnnouncementNotifications({
        id: announcement.id,
        sekolah_id: sekolahId,
        judul: announcement.judul,
        target_audiens: announcement.target_audiens,
        target_rombel_id: announcement.target_rombel_id,
      });
    }

    return announcement;
  }

  /**
   * Memperbarui pengumuman yang ada.
   */
  async updateAnnouncement(
    announcementId: string,
    sekolahId: string,
    authorUser: { id: string; nama: string; peran: BaseRole },
    input: UpdateAnnouncementInput
  ): Promise<AnnouncementItem> {
    const existing = await this.repository.findById(announcementId, sekolahId);
    if (!existing || (existing.sekolah_id && existing.sekolah_id !== sekolahId)) {
      throw new AnnouncementNotFoundError(announcementId);
    }

    // Hanya pembuat atau admin/staf yang boleh mengubah
    if (
      existing.penulis_id !== authorUser.id &&
      authorUser.peran !== "SUPER_ADMIN" &&
      authorUser.peran !== "SCHOOL_STAFF"
    ) {
      throw new UnauthorizedAnnouncementManageError(
        "Hanya pembuat pengumuman atau administrator yang dapat menyunting pengumuman ini."
      );
    }

    const parseResult = UpdateAnnouncementSchema.safeParse(input);
    if (!parseResult.success) {
      throw new AnnouncementValidationError(
        parseResult.error.issues.map((e) => e.message).join(", ")
      );
    }

    const validated = parseResult.data;
    const wasPublished = existing.status === "PUBLISHED";

    const updated = await this.repository.update(announcementId, validated, sekolahId);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: authorUser.id,
      aktor_role: authorUser.peran,
      aksi: "UPDATE_ANNOUNCEMENT",
      tipe_sumber: "PENGUMUMAN",
      id_sumber: announcementId,
      payload_sebelum: { status: existing.status, judul: existing.judul },
      payload_sesudah: { status: updated.status, judul: updated.judul },
    });

    // Jika transisi dari DRAFT ke PUBLISHED, trigger notifikasi
    if (!wasPublished && updated.status === "PUBLISHED") {
      await this.notificationService.dispatchAnnouncementNotifications({
        id: updated.id,
        sekolah_id: sekolahId,
        judul: updated.judul,
        target_audiens: updated.target_audiens,
        target_rombel_id: updated.target_rombel_id,
      });
    }

    return updated;
  }

  /**
   * Menerbitkan pengumuman (PUBLISH).
   */
  async publishAnnouncement(
    announcementId: string,
    sekolahId: string,
    authorUser: { id: string; nama: string; peran: BaseRole }
  ): Promise<AnnouncementItem> {
    return await this.updateAnnouncement(announcementId, sekolahId, authorUser, {
      status: "PUBLISHED",
    });
  }

  /**
   * Mengarsipkan pengumuman (ARCHIVE).
   */
  async archiveAnnouncement(
    announcementId: string,
    sekolahId: string,
    authorUser: { id: string; nama: string; peran: BaseRole }
  ): Promise<AnnouncementItem> {
    return await this.updateAnnouncement(announcementId, sekolahId, authorUser, {
      status: "ARSIP",
    });
  }

  /**
   * Menghapus pengumuman permanen.
   */
  async deleteAnnouncement(
    announcementId: string,
    sekolahId: string,
    authorUser: { id: string; nama: string; peran: BaseRole }
  ): Promise<void> {
    const existing = await this.repository.findById(announcementId, sekolahId);
    if (!existing || (existing.sekolah_id && existing.sekolah_id !== sekolahId)) {
      throw new AnnouncementNotFoundError(announcementId);
    }

    if (
      existing.penulis_id !== authorUser.id &&
      authorUser.peran !== "SUPER_ADMIN" &&
      authorUser.peran !== "SCHOOL_STAFF"
    ) {
      throw new UnauthorizedAnnouncementManageError(
        "Hanya pembuat pengumuman atau administrator yang dapat menghapus pengumuman ini."
      );
    }

    await this.repository.delete(announcementId, sekolahId);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: authorUser.id,
      aktor_role: authorUser.peran,
      aksi: "DELETE_ANNOUNCEMENT",
      tipe_sumber: "PENGUMUMAN",
      id_sumber: announcementId,
      payload_sebelum: { judul: existing.judul, status: existing.status },
    });
  }

  /**
   * Mengambil detail satu pengumuman.
   */
  async getAnnouncementById(announcementId: string, sekolahId?: string): Promise<AnnouncementItem> {
    const item = await this.repository.findById(announcementId);
    if (!item || (sekolahId && item.sekolah_id && item.sekolah_id !== sekolahId)) {
      throw new AnnouncementNotFoundError(announcementId);
    }
    return item;
  }

  /**
   * Mengambil daftar pengumuman yang sah bagi pengguna aktif (Server-Side Audience Scoped).
   */
  async getAnnouncementsForUser(
    sekolahId: string,
    user: { id: string; peran_dasar: BaseRole },
    filter?: AnnouncementFilter
  ): Promise<AnnouncementItem[]> {
    const rombelIds: string[] = [];

    if (user.peran_dasar === "STUDENT") {
      const placement = await prisma.penempatanRombel.findFirst({
        where: {
          keikutsertaan: {
            siswa: { pengguna_id: user.id },
          },
          status: "AKTIF",
        },
        select: { rombel_id: true },
      });
      if (placement) {
        rombelIds.push(placement.rombel_id);
      }
    } else if (user.peran_dasar === "TEACHER") {
      const assignments = await prisma.penugasanMengajar.findMany({
        where: {
          guru: { pengguna_id: user.id },
          status: "AKTIF",
        },
        select: { rombel_id: true },
      });
      for (const a of assignments) {
        if (!rombelIds.includes(a.rombel_id)) {
          rombelIds.push(a.rombel_id);
        }
      }
    } else if (user.peran_dasar === "GUARDIAN") {
      const childPlacements = await prisma.hubunganWaliSiswa.findMany({
        where: {
          wali: { pengguna_id: user.id },
          status_verifikasi: "TERVERIFIKASI",
        },
        include: {
          siswa: {
            include: {
              keikutsertaan: {
                where: { status: "AKTIF" },
                include: {
                  penempatan: {
                    where: { status: "AKTIF" },
                    select: { rombel_id: true },
                  },
                },
              },
            },
          },
        },
      });
      for (const rel of childPlacements) {
        for (const enr of rel.siswa.keikutsertaan) {
          for (const p of enr.penempatan) {
            if (!rombelIds.includes(p.rombel_id)) {
              rombelIds.push(p.rombel_id);
            }
          }
        }
      }
    }

    return await this.repository.getVisibleForUser(
      sekolahId,
      user.id,
      user.peran_dasar,
      rombelIds,
      filter
    );
  }

  /**
   * Mengambil daftar pengumuman untuk konsol manajemen staf / admin.
   */
  async getManageableAnnouncements(
    sekolahId: string,
    filter?: AnnouncementFilter
  ): Promise<AnnouncementItem[]> {
    return await this.repository.getManageableList(sekolahId, filter);
  }
}
