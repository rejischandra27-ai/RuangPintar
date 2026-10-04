"use server";

/**
 * Ruang Pintar — Module M18: Digital Report Card Server Actions
 *
 * Mengelola akses aman server-side untuk agregasi rapor,
 * pengisian catatan wali kelas, validasi, dan publikasi e-Rapor.
 */

import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { reportCardAggregationService } from "@/modules/reporting/application/report-card-aggregation-service";
import { reportCardValidationService } from "@/modules/reporting/application/report-card-validation-service";
import { reportCardRepository } from "@/modules/reporting/infrastructure/report-card-repository";
import {
  ExtracurricularItem,
  ReportCardStatus,
} from "@/modules/reporting/domain/report-card-types";
import { revalidatePath } from "next/cache";

export async function getStudentReportCardAction(targetSiswaId?: string) {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, error: "Akses ditolak: Sekolah tidak aktif." };
    }

    let resolvedSiswaId = targetSiswaId;

    if (user.peran_dasar === "STUDENT") {
      // Siswa hanya boleh mengakses data dirinya sendiri
      const rawData = await reportCardRepository.getStudentRawAcademicData(
        targetSiswaId || "",
        user.sekolah_id
      );

      // Verifikasi apakah siswaId sesuai dengan pengguna_id siswa
      if (!rawData || rawData.student.pengguna_id !== user.id) {
        // Cari siswa berdasarkan user.id
        const siswaRecord = await reportCardRepository.getStudentRawAcademicData(
          user.id,
          user.sekolah_id
        );
        if (siswaRecord) {
          resolvedSiswaId = siswaRecord.student.id;
        } else {
          return { success: false, error: "Data profil siswa tidak ditemukan." };
        }
      }
    } else {
      // Wali Kelas, Guru, Staff, Super Admin
      if (!resolvedSiswaId) {
        return { success: false, error: "Parameter siswa ID wajib disertakan." };
      }
    }

    const reportCard = await reportCardAggregationService.aggregateStudentReportCard(
      resolvedSiswaId!,
      user.sekolah_id
    );

    const validation = reportCardValidationService.validateReportCard(reportCard);

    return {
      success: true,
      data: {
        reportCard,
        validation,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil data rapor siswa.",
    };
  }
}

export async function getRombelReportCardsOverviewAction(rombelId: string) {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, error: "Sekolah tidak teridentifikasi." };
    }

    const isAuthorized =
      user.peran_dasar === "TEACHER" ||
      user.peran_dasar === "SUPER_ADMIN" ||
      user.peran_dasar === "SCHOOL_STAFF";

    if (!isAuthorized) {
      return { success: false, error: "Akses ditolak: Anda tidak memiliki wewenang wali kelas." };
    }

    const overview = await reportCardAggregationService.getRombelReportCardOverview(
      rombelId,
      user.sekolah_id
    );

    return { success: true, data: overview };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memuat rekapitulasi rapor rombel.",
    };
  }
}

export async function saveReportCardNotesAction(input: {
  siswaId: string;
  penempatanRombelId: string;
  semesterId: string;
  tahunAjaranId: string;
  catatanWaliKelas?: string;
  saranTindakLanjut?: string;
  ekstrakurikuler?: ExtracurricularItem[];
}) {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, error: "Sekolah tidak teridentifikasi." };
    }

    const isAuthorized =
      user.peran_dasar === "TEACHER" ||
      user.peran_dasar === "SUPER_ADMIN" ||
      user.peran_dasar === "SCHOOL_STAFF";

    if (!isAuthorized) {
      return {
        success: false,
        error: "Akses ditolak: Hanya wali kelas yang dapat mengisi catatan.",
      };
    }

    const updated = await reportCardRepository.upsertReportCard({
      sekolahId: user.sekolah_id,
      siswaId: input.siswaId,
      penempatanRombelId: input.penempatanRombelId,
      semesterId: input.semesterId,
      tahunAjaranId: input.tahunAjaranId,
      catatanWaliKelas: input.catatanWaliKelas,
      saranTindakLanjut: input.saranTindakLanjut,
      ekstrakurikuler: input.ekstrakurikuler,
    });

    revalidatePath("/wali-kelas");
    revalidatePath("/rapor-siswa");

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan catatan rapor.",
    };
  }
}

export async function updateReportCardStatusAction(input: {
  raporId?: string;
  siswaId: string;
  targetStatus: ReportCardStatus;
}) {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, error: "Sekolah tidak teridentifikasi." };
    }

    // Ambil agregasi rapor terbaru siswa
    const reportData = await reportCardAggregationService.aggregateStudentReportCard(
      input.siswaId,
      user.sekolah_id
    );

    let resolvedRaporId = input.raporId || reportData.id;

    // Jika record rapor belum pernah ada di database, buat dulu sebagai DRAFT
    if (!resolvedRaporId) {
      const created = await reportCardRepository.upsertReportCard({
        sekolahId: user.sekolah_id,
        siswaId: input.siswaId,
        penempatanRombelId: reportData.siswa.rombelId,
        semesterId: reportData.siswa.semesterId,
        tahunAjaranId: reportData.siswa.tahunAjaranId,
        catatanWaliKelas: reportData.catatanWaliKelas,
        saranTindakLanjut: reportData.saranTindakLanjut,
        ekstrakurikuler: reportData.ekstrakurikuler,
      });
      resolvedRaporId = created.id;
    }

    const result = await reportCardValidationService.transitionStatus({
      raporId: resolvedRaporId,
      sekolahId: user.sekolah_id,
      targetStatus: input.targetStatus,
      actorRole: user.peran_dasar,
      actorName: user.nama_lengkap,
      currentReportData: reportData,
    });

    revalidatePath("/wali-kelas");
    revalidatePath("/rapor-siswa");

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengubah status rapor.",
    };
  }
}

export async function bulkTransitionRombelReportCardsAction(input: {
  rombelId: string;
  targetStatus: "VALIDATED" | "PUBLISHED";
}) {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) {
      return { success: false, error: "Sekolah tidak teridentifikasi." };
    }

    const overview = await reportCardAggregationService.getRombelReportCardOverview(
      input.rombelId,
      user.sekolah_id
    );

    let successCount = 0;
    const failures: Array<{ nama: string; reason: string }> = [];

    for (const siswaItem of overview.siswaList) {
      try {
        const reportData = await reportCardAggregationService.aggregateStudentReportCard(
          siswaItem.siswaId,
          user.sekolah_id
        );

        let raporId = siswaItem.raporId;
        if (!raporId) {
          const created = await reportCardRepository.upsertReportCard({
            sekolahId: user.sekolah_id,
            siswaId: siswaItem.siswaId,
            penempatanRombelId: siswaItem.penempatanRombelId,
            semesterId: reportData.siswa.semesterId,
            tahunAjaranId: reportData.siswa.tahunAjaranId,
            catatanWaliKelas: reportData.catatanWaliKelas,
            saranTindakLanjut: reportData.saranTindakLanjut,
            ekstrakurikuler: reportData.ekstrakurikuler,
          });
          raporId = created.id;
        }

        await reportCardValidationService.transitionStatus({
          raporId,
          sekolahId: user.sekolah_id,
          targetStatus: input.targetStatus,
          actorRole: user.peran_dasar,
          actorName: user.nama_lengkap,
          currentReportData: reportData,
        });

        successCount++;
      } catch (err) {
        failures.push({
          nama: siswaItem.namaLengkap,
          reason: err instanceof Error ? err.message : "Validasi gagal",
        });
      }
    }

    revalidatePath("/wali-kelas");
    revalidatePath("/rapor-siswa");

    return {
      success: true,
      data: {
        totalProcessed: overview.siswaList.length,
        successCount,
        failureCount: failures.length,
        failures,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memproses validasi/publikasi massal.",
    };
  }
}
