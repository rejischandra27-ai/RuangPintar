/**
 * Ruang Pintar — M07 Student Academic Lifecycle: Rombel Placement Service
 */

import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  BulkPlacementInput,
  CreateRombelPlacementInput,
  MoveRombelPlacementInput,
  RombelPlacementDTO,
} from "../domain/student-types";
import {
  EnrollmentNotFoundError,
  PlacementNotFoundError,
  RombelCapacityExceededError,
} from "../domain/student-errors";
import {
  PlacementFilter,
  StudentRepository,
  studentRepository,
} from "../infrastructure/student-repository";

export class RombelPlacementService {
  constructor(private readonly repo: StudentRepository = studentRepository) {}

  async getPlacements(
    sekolahId: string,
    filter: PlacementFilter = {}
  ): Promise<{ data: RombelPlacementDTO[]; total: number }> {
    return this.repo.findPlacements(sekolahId, filter);
  }

  async getPlacementById(id: string, sekolahId: string): Promise<RombelPlacementDTO> {
    const placement = await this.repo.findPlacementById(id, sekolahId);
    if (!placement) {
      throw new PlacementNotFoundError(id);
    }
    return placement;
  }

  async createPlacement(
    sekolahId: string,
    input: CreateRombelPlacementInput,
    aktorId: string,
    aktorRole: string
  ): Promise<RombelPlacementDTO> {
    // 1. Verify enrollment exists
    const enrollment = await this.repo.findEnrollmentById(input.keikutsertaan_id, sekolahId);
    if (!enrollment) {
      throw new EnrollmentNotFoundError(input.keikutsertaan_id);
    }

    // 2. Verify target rombel exists and check capacity
    const rombel = await prisma.rombel.findFirst({
      where: { id: input.rombel_id, sekolah_id: sekolahId },
    });
    if (!rombel) {
      throw new Error(`Rombel dengan ID ${input.rombel_id} tidak ditemukan.`);
    }

    const currentOccupancy = await this.repo.countPlacementsInRombel(input.rombel_id, "AKTIF");
    if (currentOccupancy >= rombel.kapasitas) {
      throw new RombelCapacityExceededError(rombel.nama, rombel.kapasitas, currentOccupancy, 1);
    }

    // 3. Close existing active placement in this enrollment if any (Historical preservation)
    const activePlacement = await this.repo.findActivePlacementByEnrollment(input.keikutsertaan_id);
    if (activePlacement) {
      await this.repo.updatePlacement(activePlacement.id, sekolahId, {
        status: "PINDAH",
        tanggal_selesai: new Date(),
        catatan: "Dipindahkan ke rombel baru",
      });
    }

    // 4. Create new placement
    const created = await this.repo.createPlacement(sekolahId, input);

    // 5. Record Audit Event
    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "PENEMPATAN_ROMBEL",
      id_sumber: created.id,
      aksi: "CREATE",
      payload_sesudah: created as unknown as Record<string, unknown>,
    });

    return created;
  }

  async movePlacement(
    sekolahId: string,
    input: MoveRombelPlacementInput,
    aktorId: string,
    aktorRole: string
  ): Promise<RombelPlacementDTO> {
    // 1. Verify enrollment
    const enrollment = await this.repo.findEnrollmentById(input.keikutsertaan_id, sekolahId);
    if (!enrollment) {
      throw new EnrollmentNotFoundError(input.keikutsertaan_id);
    }

    // 2. Verify target rombel & capacity
    const targetRombel = await prisma.rombel.findFirst({
      where: { id: input.target_rombel_id, sekolah_id: sekolahId },
    });
    if (!targetRombel) {
      throw new Error(`Rombel target dengan ID ${input.target_rombel_id} tidak ditemukan.`);
    }

    const currentOccupancy = await this.repo.countPlacementsInRombel(
      input.target_rombel_id,
      "AKTIF"
    );
    if (currentOccupancy >= targetRombel.kapasitas) {
      throw new RombelCapacityExceededError(
        targetRombel.nama,
        targetRombel.kapasitas,
        currentOccupancy,
        1
      );
    }

    // 3. End existing placement
    const activePlacement = await this.repo.findActivePlacementByEnrollment(input.keikutsertaan_id);
    if (activePlacement) {
      await this.repo.updatePlacement(activePlacement.id, sekolahId, {
        status: "PINDAH",
        tanggal_selesai: new Date(),
        catatan: input.alasan_pindah?.trim() || "Pindah rombel",
      });
    }

    // 4. Create new placement
    const newPlacement = await this.repo.createPlacement(sekolahId, {
      keikutsertaan_id: input.keikutsertaan_id,
      rombel_id: input.target_rombel_id,
      nomor_absen: input.nomor_absen,
      catatan: input.alasan_pindah?.trim() || null,
    });

    // 5. Record Audit
    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "PENEMPATAN_ROMBEL",
      id_sumber: newPlacement.id,
      aksi: "MOVE_ROMBEL",
      payload_sebelum: activePlacement as unknown as Record<string, unknown>,
      payload_sesudah: newPlacement as unknown as Record<string, unknown>,
    });

    return newPlacement;
  }

  async bulkPlacement(
    sekolahId: string,
    input: BulkPlacementInput,
    aktorId: string,
    aktorRole: string
  ): Promise<{ placedCount: number }> {
    const targetRombel = await prisma.rombel.findFirst({
      where: { id: input.target_rombel_id, sekolah_id: sekolahId },
    });
    if (!targetRombel) {
      throw new Error(`Rombel dengan ID ${input.target_rombel_id} tidak ditemukan.`);
    }

    const currentOccupancy = await this.repo.countPlacementsInRombel(
      input.target_rombel_id,
      "AKTIF"
    );
    const requiredSeats = input.keikutsertaan_ids.length;

    if (currentOccupancy + requiredSeats > targetRombel.kapasitas) {
      throw new RombelCapacityExceededError(
        targetRombel.nama,
        targetRombel.kapasitas,
        currentOccupancy,
        requiredSeats
      );
    }

    let placedCount = 0;

    for (const keikutsertaanId of input.keikutsertaan_ids) {
      // Close old placement if active
      const oldPlacement = await this.repo.findActivePlacementByEnrollment(keikutsertaanId);
      if (oldPlacement) {
        await this.repo.updatePlacement(oldPlacement.id, sekolahId, {
          status: "PINDAH",
          tanggal_selesai: new Date(),
          catatan: "Penempatan massal ke " + targetRombel.nama,
        });
      }

      await this.repo.createPlacement(sekolahId, {
        keikutsertaan_id: keikutsertaanId,
        rombel_id: input.target_rombel_id,
        nomor_absen: currentOccupancy + placedCount + 1,
      });

      placedCount++;
    }

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "PENEMPATAN_ROMBEL",
      id_sumber: input.target_rombel_id,
      aksi: "BULK_PLACEMENT",
      payload_sesudah: {
        target_rombel_id: input.target_rombel_id,
        target_rombel_nama: targetRombel.nama,
        placed_count: placedCount,
        student_enrollment_ids: input.keikutsertaan_ids,
      },
    });

    return { placedCount };
  }

  async deletePlacement(
    id: string,
    sekolahId: string,
    aktorId: string,
    aktorRole: string
  ): Promise<void> {
    const current = await this.getPlacementById(id, sekolahId);

    await this.repo.deletePlacement(id, sekolahId);

    await recordAuditEvent({
      sekolah_id: sekolahId,
      aktor_id: aktorId,
      aktor_role: aktorRole,
      tipe_sumber: "PENEMPATAN_ROMBEL",
      id_sumber: id,
      aksi: "DELETE",
      payload_sebelum: current as unknown as Record<string, unknown>,
    });
  }
}

export const rombelPlacementService = new RombelPlacementService();
