import { describe, it, expect } from "vitest";
import { accessControlEngine } from "@/shared/infrastructure/authorization/access-control";
import { ActorContext } from "@/shared/infrastructure/authorization/types";
import { getFilteredNavigation } from "@/shared/components/shell/navigation-config";
import { getMobileBottomNavItems } from "@/shared/components/shell/mobile-bottom-nav";

describe("Tenant Owner (Guru Mandiri) Authorization & Navigation (P0)", () => {
  const schoolId = "sch_mandiri_01";
  const otherSchoolId = "sch_other_02";

  const regularTeacher: ActorContext = {
    id: "usr_teacher_regular",
    username: "guru_sekolah_formal",
    peran_dasar: "TEACHER",
    status_akun: "AKTIF",
    sekolah_id: schoolId,
    is_owner: false,
  };

  const guruMandiriOwner: ActorContext = {
    id: "usr_guru_mandiri",
    username: "guru_mandiri_owner",
    peran_dasar: "TEACHER",
    status_akun: "AKTIF",
    sekolah_id: schoolId,
    is_owner: true,
  };

  describe("AccessControlEngine: Kedaulatan Hak Akses Guru Mandiri", () => {
    it("Guru biasa di sekolah formal DITOLAK saat mengelola atau melihat data siswa tanpa wewenang tata usaha", () => {
      const viewDecision = accessControlEngine.evaluate({
        actor: regularTeacher,
        permission: "academic.students.view",
        resource: { sekolah_id: schoolId },
      });
      expect(viewDecision.allowed).toBe(false);

      const manageDecision = accessControlEngine.evaluate({
        actor: regularTeacher,
        permission: "academic.students.manage",
        resource: { sekolah_id: schoolId },
      });
      expect(manageDecision.allowed).toBe(false);
    });

    it("Guru Mandiri (is_owner = true) DIIZINKAN melihat dan mengelola data siswa di tenant miliknya", () => {
      const viewDecision = accessControlEngine.evaluate({
        actor: guruMandiriOwner,
        permission: "academic.students.view",
        resource: { sekolah_id: schoolId },
      });
      expect(viewDecision.allowed).toBe(true);

      const manageDecision = accessControlEngine.evaluate({
        actor: guruMandiriOwner,
        permission: "academic.students.manage",
        resource: { sekolah_id: schoolId },
      });
      expect(manageDecision.allowed).toBe(true);
    });

    it("Guru Mandiri (is_owner = true) DIIZINKAN mengelola struktur kelas dan rombel di tenant miliknya", () => {
      const classManageDecision = accessControlEngine.evaluate({
        actor: guruMandiriOwner,
        permission: "academic.classes.manage",
        resource: { sekolah_id: schoolId },
      });
      expect(classManageDecision.allowed).toBe(true);

      const regularTeacherClassManageDecision = accessControlEngine.evaluate({
        actor: regularTeacher,
        permission: "academic.classes.manage",
        resource: { sekolah_id: schoolId },
      });
      expect(regularTeacherClassManageDecision.allowed).toBe(false);

      const structureManageDecision = accessControlEngine.evaluate({
        actor: guruMandiriOwner,
        permission: "academic.structure.manage",
        resource: { sekolah_id: schoolId },
      });
      expect(structureManageDecision.allowed).toBe(true);

      const structureViewDecision = accessControlEngine.evaluate({
        actor: guruMandiriOwner,
        permission: "academic.structure.view",
        resource: { sekolah_id: schoolId },
      });
      expect(structureViewDecision.allowed).toBe(true);
      expect(
        accessControlEngine.evaluate({
          actor: regularTeacher,
          permission: "academic.structure.manage",
          resource: { sekolah_id: schoolId },
        }).allowed
      ).toBe(false);
    });

    it("STRICT ISOLATION: Guru Mandiri DITOLAK secara mutlak saat mencoba mengakses data tenant sekolah lain", () => {
      const crossTenantView = accessControlEngine.evaluate({
        actor: guruMandiriOwner,
        permission: "academic.students.view",
        resource: { sekolah_id: otherSchoolId },
      });
      expect(crossTenantView.allowed).toBe(false);
      expect(crossTenantView.reason).toContain("Cross-school resource access prohibited");

      const crossTenantManage = accessControlEngine.evaluate({
        actor: guruMandiriOwner,
        permission: "academic.students.manage",
        resource: { sekolah_id: otherSchoolId },
      });
      expect(crossTenantManage.allowed).toBe(false);
      expect(crossTenantManage.reason).toContain("Cross-school resource access prohibited");
    });

    it("Guru Mandiri dengan akun non-aktif (SUSPENDED) DITOLAK dari semua akses", () => {
      const suspendedOwner: ActorContext = {
        ...guruMandiriOwner,
        status_akun: "SUSPENDED",
      };

      const decision = accessControlEngine.evaluate({
        actor: suspendedOwner,
        permission: "academic.students.view",
        resource: { sekolah_id: schoolId },
      });
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain("SUSPENDED");
    });
  });

  describe("Navigasi: Integrasi Menu Data Siswa untuk Guru Mandiri", () => {
    it("Guru biasa di sekolah formal TIDAK melihat menu Data Siswa di sidebar", () => {
      const nav = getFilteredNavigation("TEACHER", [], false);
      const allItemIds = nav.flatMap((g) => g.items.map((i) => i.id));
      const allHrefs = nav.flatMap((g) => g.items.map((i) => i.href));

      expect(allItemIds).not.toContain("teacher-students");
      expect(allItemIds).not.toContain("teacher-subject-catalog");
      expect(allHrefs).not.toContain("/data-siswa");
      expect(allHrefs).not.toContain("/mata-pelajaran");
    });

    it("Guru Mandiri (isOwner = true) MELIHAT menu Data Siswa di sidebar tepat pada grup akademik", () => {
      const nav = getFilteredNavigation("TEACHER", [], true);
      const allItemIds = nav.flatMap((g) => g.items.map((i) => i.id));
      const allHrefs = nav.flatMap((g) => g.items.map((i) => i.href));

      expect(allItemIds).toContain("teacher-students");
      expect(allItemIds).toContain("teacher-subject-catalog");
      expect(allHrefs).toContain("/data-siswa");
      expect(allHrefs).toContain("/mata-pelajaran");

      // Pastikan urutan Data Siswa tepat setelah Kelas Saya
      const teacherGroup = nav.find((g) => g.id === "teacher-ops");
      expect(teacherGroup).toBeDefined();
      const workspaceIndex = teacherGroup!.items.findIndex((i) => i.id === "teacher-workspace");
      const studentsIndex = teacherGroup!.items.findIndex((i) => i.id === "teacher-students");
      expect(studentsIndex).toBe(workspaceIndex + 1);
    });

    it("Navigasi Guru Mandiri bebas dari duplikasi tautan rute (Unique Hrefs Invariant)", () => {
      const nav = getFilteredNavigation("TEACHER", [], true);
      const hrefs = nav.flatMap((g) => g.items.map((i) => i.href));
      const uniqueHrefs = new Set(hrefs);
      expect(hrefs.length).toBe(uniqueHrefs.size);
    });

    it("Mobile Bottom Navigation menampilkan pintasan Siswa bagi Guru Mandiri", () => {
      const standardItems = getMobileBottomNavItems("TEACHER", [], false);
      expect(standardItems.map((i) => i.href)).not.toContain("/data-siswa");

      const ownerItems = getMobileBottomNavItems("TEACHER", [], true);
      expect(ownerItems.map((i) => i.href)).toContain("/data-siswa");
      const siswaItem = ownerItems.find((i) => i.href === "/data-siswa");
      expect(siswaItem?.label).toBe("Siswa");
    });
  });
});
