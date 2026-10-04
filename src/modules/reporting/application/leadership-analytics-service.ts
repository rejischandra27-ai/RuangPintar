/**
 * Ruang Pintar — Module M19: Leadership Analytics & Reporting Service
 *
 * Mengatur orquestrasi otorisasi kepemimpinan berbasis jabatan (Position Assignment)
 * serta penyediaan analitik, agregasi, dan ekspor laporan resmi.
 */

import { AuthenticatedUser } from "@/shared/infrastructure/auth/auth-service";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { reportingRepository } from "../infrastructure/reporting-repository";
import {
  UnauthorizedLeadershipAccessError,
  ReportGenerationError,
} from "../domain/reporting-errors";
import {
  UserLeadershipContext,
  LeadershipPositionType,
  LeadershipRoleInfo,
  ReportFilterInput,
  HeadmasterOverviewDTO,
  CurriculumOverviewDTO,
  StudentAffairsOverviewDTO,
  ProgramHeadOverviewDTO,
  RiwayatEksporItemDTO,
  ExecutiveReportData,
} from "../domain/reporting-types";

export class LeadershipAnalyticsService {
  constructor(private readonly repo: any = reportingRepository) {}

  /**
   * Menyelesaikan konteks kepemimpinan pengguna berdasarkan hak dan penugasan jabatan aktif
   */
  async resolveLeadershipContext(
    user: AuthenticatedUser,
    requestedRole?: LeadershipPositionType,
    sekolahIdOverride?: string
  ): Promise<UserLeadershipContext> {
    // 1. SUPER_ADMIN: Memiliki akses supervisi penuh ke semua portal kepemimpinan
    if (user.peran_dasar === "SUPER_ADMIN") {
      let targetSekolahId = sekolahIdOverride || user.sekolah_id;
      if (!targetSekolahId) {
        const firstSchool = await prisma.sekolah.findFirst({
          orderBy: { created_at: "asc" },
          select: { id: true, nama: true },
        });
        targetSekolahId = firstSchool?.id ?? null;
      }

      if (!targetSekolahId) {
        return {
          user_id: user.id,
          nama_lengkap: user.nama_lengkap,
          peran_dasar: user.peran_dasar,
          sekolah_id: "",
          sekolah_nama: "Belum Ada Sekolah Terdaftar",
          roles: [],
          active_role: "HEADMASTER",
          can_switch_roles: false,
        };
      }

      const schoolInfo = await this.repo.getSchoolInfo(targetSekolahId);
      const schoolName = schoolInfo.school?.nama ?? "Ruang Pintar";

      const allRoles: LeadershipRoleInfo[] = [
        { code: "HEADMASTER", label: "Kepala Sekolah", is_active: true },
        { code: "VICE_PRINCIPAL_CURRICULUM", label: "Wakasek Kurikulum", is_active: true },
        { code: "VICE_PRINCIPAL_STUDENT_AFFAIRS", label: "Wakasek Kesiswaan", is_active: true },
        { code: "PROGRAM_HEAD", label: "Kepala Program Keahlian", is_active: true },
      ];

      const activeRole = requestedRole ?? "HEADMASTER";

      return {
        user_id: user.id,
        nama_lengkap: user.nama_lengkap,
        peran_dasar: user.peran_dasar,
        sekolah_id: targetSekolahId,
        sekolah_nama: schoolName,
        roles: allRoles,
        active_role: activeRole,
        can_switch_roles: true,
      };
    }

    if (!user.sekolah_id) {
      throw new UnauthorizedLeadershipAccessError("Pengguna tidak terasosiasi dengan sekolah.");
    }

    const schoolInfo = await this.repo.getSchoolInfo(user.sekolah_id);
    const schoolName = schoolInfo.school?.nama ?? "Ruang Pintar";

    // 2. Guru / Staf dengan Penugasan Jabatan Struktural Aktif
    const positions = await this.repo.getUserActivePositions(user.id, user.sekolah_id);

    const userRoles: LeadershipRoleInfo[] = [];

    for (const p of positions) {
      const kode = p.jabatan.kode_jabatan;

      if (kode === "HEADMASTER") {
        userRoles.push({
          code: "HEADMASTER",
          label: p.jabatan.nama_jabatan || "Kepala Sekolah",
          is_active: true,
        });
      } else if (kode === "VICE_PRINCIPAL_CURRICULUM") {
        userRoles.push({
          code: "VICE_PRINCIPAL_CURRICULUM",
          label: p.jabatan.nama_jabatan || "Wakasek Kurikulum",
          is_active: true,
        });
      } else if (kode === "VICE_PRINCIPAL_STUDENT_AFFAIRS" || kode.includes("KESISWAAN")) {
        userRoles.push({
          code: "VICE_PRINCIPAL_STUDENT_AFFAIRS",
          label: p.jabatan.nama_jabatan || "Wakasek Kesiswaan",
          is_active: true,
        });
      } else if (kode === "PROGRAM_HEAD" || kode.startsWith("KAPROG")) {
        userRoles.push({
          code: "PROGRAM_HEAD",
          label: p.jabatan.nama_jabatan || "Kepala Program Keahlian",
          is_active: true,
        });
      }
    }

    if (userRoles.length === 0) {
      throw new UnauthorizedLeadershipAccessError(
        "Akses ditolak. Anda tidak memiliki penugasan jabatan struktural aktif (Kepala Sekolah, Wakasek, atau Kaprog)."
      );
    }

    // Tentukan active role yang sah
    let activeRole = userRoles[0].code;
    if (requestedRole && userRoles.some((r) => r.code === requestedRole)) {
      activeRole = requestedRole;
    }

    return {
      user_id: user.id,
      nama_lengkap: user.nama_lengkap,
      peran_dasar: user.peran_dasar,
      sekolah_id: user.sekolah_id,
      sekolah_nama: schoolName,
      roles: userRoles,
      active_role: activeRole,
      can_switch_roles: userRoles.length > 1,
    };
  }

  /**
   * Ringkasan Eksekutif Kepala Sekolah
   */
  async getHeadmasterOverview(
    user: AuthenticatedUser,
    sekolahIdOverride?: string
  ): Promise<{ context: UserLeadershipContext; data: HeadmasterOverviewDTO }> {
    const context = await this.resolveLeadershipContext(user, "HEADMASTER", sekolahIdOverride);
    const data = await this.repo.getHeadmasterOverview(context.sekolah_id);
    return { context, data };
  }

  /**
   * Ringkasan Kurikulum & Pembelajaran
   */
  async getCurriculumOverview(
    user: AuthenticatedUser,
    sekolahIdOverride?: string
  ): Promise<{ context: UserLeadershipContext; data: CurriculumOverviewDTO }> {
    const context = await this.resolveLeadershipContext(
      user,
      "VICE_PRINCIPAL_CURRICULUM",
      sekolahIdOverride
    );
    const data = await this.repo.getCurriculumOverview(context.sekolah_id);
    return { context, data };
  }

  /**
   * Ringkasan Kesiswaan & Presensi
   */
  async getStudentAffairsOverview(
    user: AuthenticatedUser,
    sekolahIdOverride?: string
  ): Promise<{ context: UserLeadershipContext; data: StudentAffairsOverviewDTO }> {
    const context = await this.resolveLeadershipContext(
      user,
      "VICE_PRINCIPAL_STUDENT_AFFAIRS",
      sekolahIdOverride
    );
    const data = await this.repo.getStudentAffairsOverview(context.sekolah_id);
    return { context, data };
  }

  /**
   * Ringkasan Program Keahlian
   */
  async getProgramHeadOverview(
    user: AuthenticatedUser,
    programId?: string,
    sekolahIdOverride?: string
  ): Promise<{ context: UserLeadershipContext; data: ProgramHeadOverviewDTO }> {
    const context = await this.resolveLeadershipContext(user, "PROGRAM_HEAD", sekolahIdOverride);
    const data = await this.repo.getProgramHeadOverview(context.sekolah_id, programId);
    return { context, data };
  }

  /**
   * Riwayat Ekspor
   */
  async getExportHistory(
    user: AuthenticatedUser,
    sekolahIdOverride?: string
  ): Promise<RiwayatEksporItemDTO[]> {
    const context = await this.resolveLeadershipContext(user, undefined, sekolahIdOverride);
    return this.repo.getExportHistory(context.sekolah_id);
  }

  /**
   * Ekspor Rekapitulasi Presensi CSV
   */
  async exportAttendanceCsv(
    user: AuthenticatedUser,
    filters?: ReportFilterInput
  ): Promise<{ filename: string; csvContent: string; totalRows: number }> {
    const context = await this.resolveLeadershipContext(user);
    const rows = await this.repo.getAttendanceReportRows(context.sekolah_id, filters);

    // Format CSV
    const headers = [
      "No",
      "NISN",
      "Nama Siswa",
      "Rombel",
      "Tingkat",
      "Hadir",
      "Sakit",
      "Izin",
      "Alpha",
      "Persentase Kehadiran",
    ];

    const csvLines = [headers.join(",")];
    for (const r of rows) {
      const line = [
        r.no,
        `"${r.nisn}"`,
        `"${r.nama_siswa.replace(/"/g, '""')}"`,
        `"${r.rombel}"`,
        `"${r.tingkat}"`,
        r.hadir,
        r.sakit,
        r.izin,
        r.alpha,
        `"${r.persentase_kehadiran}"`,
      ];
      csvLines.push(line.join(","));
    }

    const csvContent = csvLines.join("\n");
    const filename = `Rekap_Presensi_Sekolah_${Date.now()}.csv`;

    // Simpan ke riwayat ekspor
    await this.repo.saveExportLog({
      sekolah_id: context.sekolah_id,
      tipe_laporan: "PRESENSI",
      judul: "Rekapitulasi Kehadiran Siswa Sekolah",
      format: "CSV",
      parameter_filter_json: filters ? JSON.stringify(filters) : undefined,
      total_baris: rows.length,
      dibuat_oleh_id: user.id,
    });

    // Audit Log
    await recordAuditEvent({
      sekolah_id: context.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      tipe_sumber: "REPORT_EXPORT",
      id_sumber: "attendance-report",
      aksi: "EXPORT_ATTENDANCE_CSV",
      payload_sesudah: { total_rows: rows.length, filename },
    });

    return { filename, csvContent, totalRows: rows.length };
  }

  /**
   * Ekspor Rekapitulasi Nilai & Asesmen CSV
   */
  async exportAcademicCsv(
    user: AuthenticatedUser,
    filters?: ReportFilterInput
  ): Promise<{ filename: string; csvContent: string; totalRows: number }> {
    const context = await this.resolveLeadershipContext(user);
    const rows = await this.repo.getAcademicReportRows(context.sekolah_id, filters);

    const headers = [
      "No",
      "Mata Pelajaran",
      "Guru Pengampu",
      "Rombel",
      "Jumlah Siswa",
      "Rerata Nilai",
      "KKM/KKTP",
      "Tuntas",
      "Belum Tuntas",
      "Persentase Ketuntasan",
    ];

    const csvLines = [headers.join(",")];
    for (const r of rows) {
      const line = [
        r.no,
        `"${r.mata_pelajaran.replace(/"/g, '""')}"`,
        `"${r.guru_pengampu.replace(/"/g, '""')}"`,
        `"${r.rombel}"`,
        r.jumlah_siswa,
        r.rerata_nilai,
        r.kkm_kktp,
        r.tuntas_count,
        r.belum_tuntas_count,
        `"${r.persentase_tuntas}"`,
      ];
      csvLines.push(line.join(","));
    }

    const csvContent = csvLines.join("\n");
    const filename = `Rekap_Nilai_Akademik_${Date.now()}.csv`;

    // Simpan ke riwayat ekspor
    await this.repo.saveExportLog({
      sekolah_id: context.sekolah_id,
      tipe_laporan: "NILAI_AKADEMIK",
      judul: "Rekapitulasi Capaian Nilai & KKTP Sekolah",
      format: "CSV",
      parameter_filter_json: filters ? JSON.stringify(filters) : undefined,
      total_baris: rows.length,
      dibuat_oleh_id: user.id,
    });

    // Audit Log
    await recordAuditEvent({
      sekolah_id: context.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      tipe_sumber: "REPORT_EXPORT",
      id_sumber: "academic-report",
      aksi: "EXPORT_ACADEMIC_CSV",
      payload_sesudah: { total_rows: rows.length, filename },
    });

    return { filename, csvContent, totalRows: rows.length };
  }

  /**
   * Data Laporan Eksekutif Print A4
   */
  async getExecutiveReportData(user: AuthenticatedUser): Promise<ExecutiveReportData> {
    const context = await this.resolveLeadershipContext(user);
    const reportData = await this.repo.getExecutiveReportData(context.sekolah_id);

    // Simpan log ekspor
    await this.repo.saveExportLog({
      sekolah_id: context.sekolah_id,
      tipe_laporan: "EKSEKUTIF",
      judul: "Lembar Ringkasan Eksekutif Pimpinan",
      format: "PRINT_A4",
      total_baris: reportData.distribusi_tingkat.length,
      dibuat_oleh_id: user.id,
    });

    // Audit Log
    await recordAuditEvent({
      sekolah_id: context.sekolah_id,
      aktor_id: user.id,
      aktor_role: user.peran_dasar,
      tipe_sumber: "REPORT_EXPORT",
      id_sumber: "executive-briefing",
      aksi: "GENERATE_EXECUTIVE_REPORT_A4",
      payload_sesudah: { sekolah: reportData.sekolah.nama },
    });

    return reportData;
  }
}

export const leadershipAnalyticsService = new LeadershipAnalyticsService();
