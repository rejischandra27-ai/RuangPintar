import { describe, it, expect, vi, beforeEach } from "vitest";
import { LeadershipAnalyticsService } from "@/modules/reporting/application/leadership-analytics-service";
import { UnauthorizedLeadershipAccessError } from "@/modules/reporting/domain/reporting-errors";
import { AuthenticatedUser } from "@/shared/infrastructure/auth/auth-service";

describe("Navigation & Leadership Context Repair (Stage 19)", () => {
  let mockRepo: any;
  let service: LeadershipAnalyticsService;

  beforeEach(() => {
    mockRepo = {
      resolveUserLeadershipPosition: vi.fn(),
      getAcademicContext: vi.fn(),
      getHeadmasterOverview: vi.fn(),
      getCurriculumOverview: vi.fn(),
      getStudentAffairsOverview: vi.fn(),
      getProgramHeadOverview: vi.fn(),
      recordExportLog: vi.fn(),
      getExportHistory: vi.fn(),
      getExecutivePrintData: vi.fn(),
      getSchoolInfo: vi.fn().mockResolvedValue({
        school: { id: "sch_override_123", nama: "SMA Bintang Harapan" },
      }),
      getUserActivePositions: vi.fn().mockResolvedValue([]),
    };
    service = new LeadershipAnalyticsService(mockRepo);
  });

  it("resolves leadership context for SUPER_ADMIN when user.sekolah_id is null by falling back to override or first school", async () => {
    const superAdminActor: AuthenticatedUser = {
      id: "usr_superadmin",
      username: "superadmin",
      email: "admin@ruangpintar.id",
      nama_lengkap: "Super Admin Platform",
      peran_dasar: "SUPER_ADMIN",
      sekolah_id: null,
      status_akun: "ACTIVE",
      harus_ganti_password: false,
    };

    const context = await service.resolveLeadershipContext(
      superAdminActor,
      undefined,
      "sch_override_123"
    );

    expect(context.user_id).toBe("usr_superadmin");
    expect(context.active_role).toBe("HEADMASTER");
    expect(context.sekolah_id).toBe("sch_override_123");
    expect(context.sekolah_nama).toBe("SMA Bintang Harapan");
    expect(context.can_switch_roles).toBe(true);
  });

  it("denies access to non-leadership roles without leadership position", async () => {
    const studentActor: AuthenticatedUser = {
      id: "usr_student",
      username: "siswa1",
      email: "siswa1@sch.id",
      nama_lengkap: "Siswa Satu",
      peran_dasar: "STUDENT",
      sekolah_id: "sch_1",
      status_akun: "ACTIVE",
      harus_ganti_password: false,
    };

    await expect(service.resolveLeadershipContext(studentActor)).rejects.toThrow(
      UnauthorizedLeadershipAccessError
    );
  });
});
