import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import { leadershipAnalyticsService } from "@/modules/reporting/application/leadership-analytics-service";
import { UnauthorizedLeadershipAccessError } from "@/modules/reporting/domain/reporting-errors";
import { AuthenticatedUser } from "@/shared/infrastructure/auth/auth-service";

describe("Phase 19: Leadership Analytics & Reporting Service (M19)", () => {
  let testSchoolId: string;
  let adminUser: AuthenticatedUser;
  let principalUser: AuthenticatedUser;
  let regularTeacherUser: AuthenticatedUser;
  let headmasterPositionId: string;

  beforeEach(async () => {
    testSchoolId = generateUlid();

    // 1. Setup Sekolah
    await prisma.sekolah.create({
      data: {
        id: testSchoolId,
        nama: "SMK Negeri 1 Uji Coba",
        jenjang: "SMK",
      },
    });

    // 2. Setup Super Admin
    const adminId = generateUlid();
    await prisma.pengguna.create({
      data: {
        id: adminId,
        username: `admin_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        password_hash: "hashed",
        nama_lengkap: "Super Admin Test",
        peran_dasar: "SUPER_ADMIN",
        sekolah_id: testSchoolId,
      },
    });
    adminUser = {
      id: adminId,
      username: "admin_test",
      email: null,
      nama_lengkap: "Super Admin Test",
      peran_dasar: "SUPER_ADMIN",
      status_akun: "AKTIF",
      harus_ganti_password: false,
      sekolah_id: testSchoolId,
    };

    // 3. Setup Kepala Sekolah (Teacher with HEADMASTER position)
    const principalId = generateUlid();
    await prisma.pengguna.create({
      data: {
        id: principalId,
        username: `kepsek_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        password_hash: "hashed",
        nama_lengkap: "Drs. Kepala Sekolah Test, M.Pd.",
        peran_dasar: "TEACHER",
        sekolah_id: testSchoolId,
      },
    });
    principalUser = {
      id: principalId,
      username: "kepsek_test",
      email: null,
      nama_lengkap: "Drs. Kepala Sekolah Test, M.Pd.",
      peran_dasar: "TEACHER",
      status_akun: "AKTIF",
      harus_ganti_password: false,
      sekolah_id: testSchoolId,
    };

    // Buat Jabatan HEADMASTER
    headmasterPositionId = generateUlid();
    await prisma.jabatan.create({
      data: {
        id: headmasterPositionId,
        sekolah_id: testSchoolId,
        kode_jabatan: "HEADMASTER",
        nama_jabatan: "Kepala Sekolah",
      },
    });

    // Buat Penugasan Jabatan
    await prisma.penugasanJabatan.create({
      data: {
        id: generateUlid(),
        sekolah_id: testSchoolId,
        jabatan_id: headmasterPositionId,
        personil_id: principalId,
        berlaku_mulai: new Date("2026-07-01"),
        status: "AKTIF",
      },
    });

    // 4. Setup Regular Teacher without position
    const teacherId = generateUlid();
    await prisma.pengguna.create({
      data: {
        id: teacherId,
        username: `guru_biasa_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        password_hash: "hashed",
        nama_lengkap: "Guru Mandiri Test, S.Pd.",
        peran_dasar: "TEACHER",
        sekolah_id: testSchoolId,
      },
    });
    regularTeacherUser = {
      id: teacherId,
      username: "guru_biasa",
      email: null,
      nama_lengkap: "Guru Mandiri Test, S.Pd.",
      peran_dasar: "TEACHER",
      status_akun: "AKTIF",
      harus_ganti_password: false,
      sekolah_id: testSchoolId,
    };
  });

  // =========================================================================
  // TEST OTORISASI & CONTEXT RESOLUTION
  // =========================================================================
  it("allows SUPER_ADMIN to access all leadership roles with switching capability", async () => {
    const context = await leadershipAnalyticsService.resolveLeadershipContext(adminUser);

    expect(context.user_id).toBe(adminUser.id);
    expect(context.can_switch_roles).toBe(true);
    expect(context.roles.length).toBe(4);
    expect(context.roles.map((r) => r.code)).toContain("HEADMASTER");
    expect(context.roles.map((r) => r.code)).toContain("VICE_PRINCIPAL_CURRICULUM");
  });

  it("resolves active position correctly for appointed HEADMASTER personnel", async () => {
    const context = await leadershipAnalyticsService.resolveLeadershipContext(principalUser);

    expect(context.user_id).toBe(principalUser.id);
    expect(context.active_role).toBe("HEADMASTER");
    expect(context.roles.some((r) => r.code === "HEADMASTER")).toBe(true);
  });

  it("rejects regular teachers without structural positions (Default Deny)", async () => {
    await expect(
      leadershipAnalyticsService.resolveLeadershipContext(regularTeacherUser)
    ).rejects.toThrow(UnauthorizedLeadershipAccessError);
  });

  // =========================================================================
  // TEST HEADMASTER OVERVIEW
  // =========================================================================
  it("retrieves comprehensive Headmaster Executive Overview with KPIs", async () => {
    const result = await leadershipAnalyticsService.getHeadmasterOverview(principalUser);

    expect(result.context.active_role).toBe("HEADMASTER");
    expect(result.data.ringkasan_sekolah).toBeDefined();
    expect(result.data.ringkasan_sekolah.rasio_guru_siswa).toBeDefined();
    expect(result.data.kpi_kehadiran.tingkat_hadir_persen).toBeGreaterThanOrEqual(0);
    expect(result.data.kpi_akademik.rerata_nilai_sekolah).toBeGreaterThanOrEqual(0);
    expect(result.data.perhatian_kepemimpinan.length).toBeGreaterThan(0);
    expect(result.data.tren_kehadiran_mingguan.length).toBe(5);
  });

  // =========================================================================
  // TEST CURRICULUM OVERVIEW
  // =========================================================================
  it("retrieves Curriculum Overview with compliance and teacher workloads", async () => {
    const result = await leadershipAnalyticsService.getCurriculumOverview(adminUser);

    expect(result.context).toBeDefined();
    expect(result.data.kpi_kurikulum).toBeDefined();
    expect(result.data.kepatuhan_administrasi.persentase_kepatuhan).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.data.capaian_per_mapel)).toBe(true);
    expect(Array.isArray(result.data.beban_mengajar_guru)).toBe(true);
  });

  // =========================================================================
  // TEST STUDENT AFFAIRS OVERVIEW
  // =========================================================================
  it("retrieves Student Affairs Overview with attendance and guidance cases", async () => {
    const result = await leadershipAnalyticsService.getStudentAffairsOverview(adminUser);

    expect(result.context).toBeDefined();
    expect(result.data.kpi_kesiswaan.total_siswa).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.data.rekap_kehadiran_per_rombel)).toBe(true);
    expect(Array.isArray(result.data.daftar_siswa_atensi)).toBe(true);
    expect(Array.isArray(result.data.distribusi_kasus_pembinaan)).toBe(true);
  });

  // =========================================================================
  // TEST PROGRAM HEAD OVERVIEW
  // =========================================================================
  it("retrieves Program Head Overview scoped to vocational department", async () => {
    const result = await leadershipAnalyticsService.getProgramHeadOverview(adminUser);

    expect(result.context).toBeDefined();
    expect(result.data.program_info.nama).toBeDefined();
    expect(result.data.kpi_program.rerata_kehadiran).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.data.rombel_list)).toBe(true);
    expect(Array.isArray(result.data.mapel_kejuruan_list)).toBe(true);
  });

  // =========================================================================
  // TEST REPORT EXPORT GENERATION
  // =========================================================================
  it("exports attendance CSV, formats content, and logs audit record", async () => {
    const exportResult = await leadershipAnalyticsService.exportAttendanceCsv(adminUser);

    expect(exportResult.filename).toContain(".csv");
    expect(exportResult.csvContent).toContain("NISN");
    expect(exportResult.csvContent).toContain("Persentase Kehadiran");

    // Pastikan tersimpan di database RiwayatEksporLaporan
    const exportHistory = await leadershipAnalyticsService.getExportHistory(adminUser);
    expect(exportHistory.length).toBeGreaterThan(0);
    expect(exportHistory[0].tipe_laporan).toBe("PRESENSI");
  });

  it("exports academic grade CSV and records export history", async () => {
    const exportResult = await leadershipAnalyticsService.exportAcademicCsv(adminUser);

    expect(exportResult.filename).toContain(".csv");
    expect(exportResult.csvContent).toContain("Mata Pelajaran");
    expect(exportResult.csvContent).toContain("KKM/KKTP");

    const exportHistory = await leadershipAnalyticsService.getExportHistory(adminUser);
    expect(exportHistory.some((h) => h.tipe_laporan === "NILAI_AKADEMIK")).toBe(true);
  });

  it("prepares print-ready Executive Report A4 with school info and principal signature", async () => {
    const reportData = await leadershipAnalyticsService.getExecutiveReportData(principalUser);

    expect(reportData.sekolah.nama).toBe("SMK Negeri 1 Uji Coba");
    expect(reportData.sekolah.kepala_sekolah_nama).toBe("Drs. Kepala Sekolah Test, M.Pd.");
    expect(reportData.periode.tahun_ajaran).toBe("2026/2027");
    expect(reportData.ringkasan).toBeDefined();
    expect(Array.isArray(reportData.distribusi_tingkat)).toBe(true);
    expect(reportData.distribusi_tingkat.length).toBeGreaterThanOrEqual(0);
    expect(reportData.perhatian_strategis.length).toBeGreaterThan(0);
  });
});
