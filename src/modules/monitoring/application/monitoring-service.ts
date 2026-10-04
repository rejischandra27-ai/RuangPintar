/**
 * Ruang Pintar — M18 Student Monitoring Application Service
 *
 * Mengatur orkestrasi pemantauan siswa rombel, otorisasi wali kelas (Homeroom Scoping),
 * audit logging pembinaan, serta perhitungan derived indicator holistik.
 */

import { AuthenticatedUser } from "@/shared/infrastructure/auth/auth-service";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { MonitoringRepository } from "../infrastructure/monitoring-repository";
import {
  CatatanMonitoringItem,
  CreateFollowUpInput,
  CreateMonitoringNoteInput,
  HomeroomOverviewDTO,
  StudentMonitoringDetailDTO,
  TindakLanjutItem,
  UpdateFollowUpStatusInput,
  UpdateMonitoringNoteInput,
} from "../domain/monitoring-types";
import {
  HomeroomNotFoundError,
  MonitoringValidationError,
  UnauthorizedHomeroomAccessError,
} from "../domain/monitoring-errors";
import {
  createFollowUpSchema,
  createMonitoringNoteSchema,
  CreateFollowUpSchemaInput,
  CreateMonitoringNoteSchemaInput,
  updateFollowUpStatusSchema,
  updateMonitoringNoteSchema,
  UpdateFollowUpStatusSchemaInput,
  UpdateMonitoringNoteSchemaInput,
} from "../domain/monitoring-validation";

export class MonitoringService {
  private static getSekolahId(user: AuthenticatedUser): string {
    if (!user.sekolah_id) {
      throw new UnauthorizedHomeroomAccessError("Konteks sekolah pengguna tidak valid.");
    }
    return user.sekolah_id;
  }

  /**
   * Memverifikasi hak akses pengguna terhadap rombel (Homeroom Scoping):
   * - SUPER_ADMIN: Akses supervisi ke seluruh rombel
   * - TEACHER: Hanya diizinkan jika merupakan wali kelas aktif rombel tersebut
   * - Lainnya: Ditolak (Default Deny)
   */
  static async assertHomeroomAccess(user: AuthenticatedUser, rombelId?: string): Promise<string> {
    const sekolahId = this.getSekolahId(user);

    if (user.peran_dasar === "SUPER_ADMIN") {
      if (rombelId) return rombelId;
      // Ambil rombel pertama yang memiliki wali kelas aktif
      const firstActive = await prisma.penugasanWaliKelas.findFirst({
        where: { sekolah_id: sekolahId, status: "AKTIF" },
        select: { rombel_id: true },
      });
      if (firstActive) return firstActive.rombel_id;

      // Fallback ke rombel aktif pertama apapun
      const fallbackRombel = await prisma.rombel.findFirst({
        where: { sekolah_id: sekolahId, status: "AKTIF" },
        select: { id: true },
      });
      if (!fallbackRombel) {
        throw new HomeroomNotFoundError("Belum ada rombel aktif di sekolah ini.");
      }
      return fallbackRombel.id;
    }

    if (user.peran_dasar === "TEACHER") {
      const teacher = await prisma.guru.findFirst({
        where: {
          pengguna_id: user.id,
          sekolah_id: sekolahId,
        },
      });

      if (!teacher) {
        throw new UnauthorizedHomeroomAccessError(
          "Profil pendidik Anda belum tertaut pada akun ini."
        );
      }

      const activeHomeroom = await MonitoringRepository.getTeacherActiveHomeroom(
        teacher.sekolah_id,
        teacher.id
      );

      if (!activeHomeroom) {
        throw new UnauthorizedHomeroomAccessError(
          "Anda tidak memiliki penugasan aktif sebagai Wali Kelas pada semester ini."
        );
      }

      if (rombelId && activeHomeroom.rombel_id !== rombelId) {
        throw new UnauthorizedHomeroomAccessError(
          "Akses ditolak: Anda bukan wali kelas sah dari rombel yang diminta."
        );
      }

      return activeHomeroom.rombel_id;
    }

    throw new UnauthorizedHomeroomAccessError(
      "Akses ditolak: Fitur ini hanya untuk Wali Kelas dan Administrator Sekolah."
    );
  }

  /**
   * Mengambil gambaran komprehensif (overview) rombel perwalian
   */
  static async getHomeroomOverview(
    user: AuthenticatedUser,
    rombelId?: string
  ): Promise<HomeroomOverviewDTO> {
    const sekolahId = this.getSekolahId(user);
    const effectiveRombelId = await this.assertHomeroomAccess(user, rombelId);
    return MonitoringRepository.getHomeroomOverview(sekolahId, effectiveRombelId);
  }

  /**
   * Mengambil rincian detail pemantauan 1 siswa untuk modal investigasi holistik
   */
  static async getStudentMonitoringDetail(
    user: AuthenticatedUser,
    rombelId: string,
    siswaId: string
  ): Promise<StudentMonitoringDetailDTO> {
    const sekolahId = this.getSekolahId(user);
    await this.assertHomeroomAccess(user, rombelId);
    return MonitoringRepository.getStudentMonitoringDetail(sekolahId, rombelId, siswaId);
  }

  /**
   * Membuat Catatan Monitoring Pembinaan Siswa Baru
   */
  static async createMonitoringNote(
    user: AuthenticatedUser,
    rawInput: CreateMonitoringNoteSchemaInput
  ): Promise<CatatanMonitoringItem> {
    const sekolahId = this.getSekolahId(user);
    const parseResult = createMonitoringNoteSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new MonitoringValidationError(
        parseResult.error.issues[0]?.message || "Data catatan tidak valid"
      );
    }

    const validData = parseResult.data;
    await this.assertHomeroomAccess(user, validData.rombel_id);

    const input: CreateMonitoringNoteInput = {
      sekolah_id: sekolahId,
      rombel_id: validData.rombel_id,
      siswa_id: validData.siswa_id,
      penulis_id: user.id,
      judul: validData.judul,
      isi: validData.isi,
      kategori: validData.kategori,
      tingkat_urgensi: validData.tingkat_urgensi,
      tindak_lanjut_awal: validData.tindak_lanjut_tindakan
        ? {
            tindakan: validData.tindak_lanjut_tindakan,
            target_tanggal: validData.tindak_lanjut_target_tanggal
              ? new Date(validData.tindak_lanjut_target_tanggal)
              : null,
            penanggung_jawab_id: user.id,
          }
        : undefined,
    };

    const createdNote = await MonitoringRepository.createMonitoringNote(input);

    // Audit Trail
    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "CREATE_MONITORING_NOTE",
      tipe_sumber: "CatatanMonitoring",
      id_sumber: createdNote.id,
      payload_sesudah: {
        rombel_id: validData.rombel_id,
        siswa_id: validData.siswa_id,
        judul: validData.judul,
        urgensi: validData.tingkat_urgensi,
      },
    });

    return createdNote;
  }

  /**
   * Mengupdate Catatan Monitoring
   */
  static async updateMonitoringNote(
    user: AuthenticatedUser,
    rawInput: UpdateMonitoringNoteSchemaInput
  ): Promise<CatatanMonitoringItem> {
    const parseResult = updateMonitoringNoteSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new MonitoringValidationError(
        parseResult.error.issues[0]?.message || "Data pembaruan tidak valid"
      );
    }

    const validData = parseResult.data;
    const existing = await prisma.catatanMonitoring.findFirst({
      where: { id: validData.id, ...(user.sekolah_id ? { sekolah_id: user.sekolah_id } : {}) },
    });

    if (!existing) {
      throw new HomeroomNotFoundError("Catatan monitoring tidak ditemukan.");
    }

    await this.assertHomeroomAccess(user, existing.rombel_id);

    const input: UpdateMonitoringNoteInput = {
      judul: validData.judul,
      isi: validData.isi,
      kategori: validData.kategori,
      tingkat_urgensi: validData.tingkat_urgensi,
      status: validData.status,
    };

    const updated = await MonitoringRepository.updateMonitoringNote(
      validData.id,
      input,
      user.sekolah_id || undefined
    );

    await recordAuditEvent({
      sekolah_id: user.sekolah_id ?? null,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "UPDATE_MONITORING_NOTE",
      tipe_sumber: "CatatanMonitoring",
      id_sumber: updated.id,
      payload_sesudah: {
        rombel_id: existing.rombel_id,
        status: validData.status,
      },
    });

    return updated;
  }

  /**
   * Menambahkan Tindak Lanjut pada Catatan Monitoring
   */
  static async createFollowUp(
    user: AuthenticatedUser,
    rawInput: CreateFollowUpSchemaInput
  ): Promise<TindakLanjutItem> {
    const parseResult = createFollowUpSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new MonitoringValidationError(
        parseResult.error.issues[0]?.message || "Data tindak lanjut tidak valid"
      );
    }

    const validData = parseResult.data;
    const note = await prisma.catatanMonitoring.findUnique({
      where: { id: validData.catatan_id },
    });

    if (!note) {
      throw new HomeroomNotFoundError("Catatan monitoring tidak ditemukan.");
    }

    await this.assertHomeroomAccess(user, note.rombel_id);

    const input: CreateFollowUpInput = {
      catatan_id: validData.catatan_id,
      tindakan: validData.tindakan,
      target_tanggal: validData.target_tanggal ? new Date(validData.target_tanggal) : null,
      penanggung_jawab_id: validData.penanggung_jawab_id || user.id,
    };

    const created = await MonitoringRepository.createFollowUp(input);

    await recordAuditEvent({
      sekolah_id: user.sekolah_id ?? null,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "CREATE_FOLLOW_UP",
      tipe_sumber: "TindakLanjutMonitoring",
      id_sumber: created.id,
      payload_sesudah: {
        catatan_id: validData.catatan_id,
        tindakan: validData.tindakan,
      },
    });

    return created;
  }

  /**
   * Mengupdate Status Tindak Lanjut
   */
  static async updateFollowUpStatus(
    user: AuthenticatedUser,
    rawInput: UpdateFollowUpStatusSchemaInput
  ): Promise<TindakLanjutItem> {
    const parseResult = updateFollowUpStatusSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new MonitoringValidationError(
        parseResult.error.issues[0]?.message || "Status tindak lanjut tidak valid"
      );
    }

    const validData = parseResult.data;
    const followUp = await prisma.tindakLanjutMonitoring.findFirst({
      where: {
        id: validData.id,
        ...(user.sekolah_id ? { catatan: { sekolah_id: user.sekolah_id } } : {}),
      },
      include: {
        catatan: true,
      },
    });

    if (!followUp) {
      throw new HomeroomNotFoundError("Tindak lanjut tidak ditemukan.");
    }

    await this.assertHomeroomAccess(user, followUp.catatan.rombel_id);

    const input: UpdateFollowUpStatusInput = {
      id: validData.id,
      status: validData.status,
      hasil: validData.hasil,
      tanggal_penyelesaian: validData.tanggal_penyelesaian
        ? new Date(validData.tanggal_penyelesaian)
        : validData.status === "SELESAI"
          ? new Date()
          : null,
    };

    const updated = await MonitoringRepository.updateFollowUpStatus(
      input,
      user.sekolah_id || undefined
    );

    await recordAuditEvent({
      sekolah_id: user.sekolah_id ?? null,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      aksi: "UPDATE_FOLLOW_UP",
      tipe_sumber: "TindakLanjutMonitoring",
      id_sumber: updated.id,
      payload_sesudah: {
        status: validData.status,
      },
    });

    return updated;
  }

  /**
   * Mengambil daftar seluruh rombel aktif untuk dropdown pilihan supervisi
   */
  static async getActiveHomeroomsList(user: AuthenticatedUser) {
    const sekolahId = this.getSekolahId(user);

    if (user.peran_dasar === "SUPER_ADMIN") {
      const records = await MonitoringRepository.getAllActiveHomerooms(sekolahId);
      return records.map((r) => ({
        rombel_id: r.rombel_id,
        rombel_nama: r.rombel.nama,
        guru_nama: [r.guru.gelar_depan, r.guru.nama_lengkap, r.guru.gelar_belakang]
          .filter(Boolean)
          .join(" ")
          .trim(),
        kapasitas: r.rombel.kapasitas,
      }));
    }

    if (user.peran_dasar === "TEACHER") {
      const teacher = await prisma.guru.findFirst({
        where: { pengguna_id: user.id, sekolah_id: sekolahId },
      });

      if (!teacher) return [];

      const record = await MonitoringRepository.getTeacherActiveHomeroom(
        teacher.sekolah_id,
        teacher.id
      );

      if (!record) return [];

      return [
        {
          rombel_id: record.rombel_id,
          rombel_nama: record.rombel.nama,
          guru_nama: [record.guru.gelar_depan, record.guru.nama_lengkap, record.guru.gelar_belakang]
            .filter(Boolean)
            .join(" ")
            .trim(),
          kapasitas: record.rombel.kapasitas,
        },
      ];
    }

    return [];
  }
}
