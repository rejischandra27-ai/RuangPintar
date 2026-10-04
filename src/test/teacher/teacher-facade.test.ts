import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeacherFacade } from "@/modules/teacher/application/teacher-facade";
import { HomeroomAssignmentService } from "@/modules/teacher/application/homeroom-assignment-service";
import { TeacherProfileService } from "@/modules/teacher/application/teacher-profile-service";
import { TeachingAssignmentService } from "@/modules/teacher/application/teaching-assignment-service";
import { prisma } from "@/shared/infrastructure/database/prisma";

describe("TeacherFacade dashboard tenant-owner statistics", () => {
  const teacher = { id: "teacher-1", sekolah_id: "school-1" } as never;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TeacherProfileService, "getTeacherByUserId").mockResolvedValue(teacher);
    vi.spyOn(TeachingAssignmentService, "getTeachingAssignments").mockResolvedValue([]);
    vi.spyOn(HomeroomAssignmentService, "getHomeroomAssignments").mockResolvedValue([]);
    vi.spyOn(prisma.rombel, "count").mockResolvedValue(2);
    vi.spyOn(prisma.siswa, "count").mockResolvedValue(7);
  });

  it("counts active classes and students in the owner's active tenant", async () => {
    const data = await TeacherFacade.getTeacherDashboardData("user-1", "school-1", true);

    expect(data.totalRombel).toBe(2);
    expect(data.totalSiswaBinaan).toBe(7);
    expect(prisma.rombel.count).toHaveBeenCalledWith({
      where: { sekolah_id: "school-1", status: "AKTIF" },
    });
    expect(prisma.siswa.count).toHaveBeenCalledWith({
      where: { sekolah_id: "school-1", status_akademik: "AKTIF" },
    });
  });

  it("keeps regular-teacher statistics scoped to active teaching assignments", async () => {
    const data = await TeacherFacade.getTeacherDashboardData("user-1", "school-1", false);

    expect(data.totalRombel).toBe(0);
    expect(data.totalSiswaBinaan).toBe(0);
    expect(prisma.rombel.count).not.toHaveBeenCalled();
    expect(prisma.siswa.count).not.toHaveBeenCalled();
  });
});
