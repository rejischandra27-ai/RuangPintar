import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import { teacherOnboardingService } from "@/modules/teacher/application/teacher-onboarding-service";

describe("Teacher onboarding persistence and minimal class creation", () => {
  const schoolId = generateUlid();
  const secondSchoolId = generateUlid();
  const userId = generateUlid();
  const yearId = generateUlid();
  const gradeId = generateUlid();
  const subjectId = generateUlid();

  beforeAll(async () => {
    await prisma.sekolah.createMany({
      data: [
        { id: schoolId, nama: `UX02 School ${schoolId.slice(-5)}`, jenjang: "SMK" },
        { id: secondSchoolId, nama: `UX02 Other ${secondSchoolId.slice(-5)}`, jenjang: "SMK" },
      ],
    });
    await prisma.pengguna.create({
      data: {
        id: userId,
        sekolah_id: schoolId,
        username: `ux02_${userId.slice(-8)}`,
        email: `ux02_${userId.slice(-8)}@example.test`,
        password_hash: "not-used-in-this-test",
        nama_lengkap: "Guru UX02",
        peran_dasar: "TEACHER",
      },
    });
    await prisma.tahunAjaran.create({
      data: {
        id: yearId,
        sekolah_id: schoolId,
        nama: `TA ${yearId.slice(-5)}`,
        tanggal_mulai: new Date("2026-07-01"),
        tanggal_selesai: new Date("2027-06-30"),
        status: "AKTIF",
      },
    });
    await prisma.tingkatKelas.create({
      data: {
        id: gradeId,
        sekolah_id: schoolId,
        kode: "X",
        nama: "Kelas X",
        urutan: 10,
      },
    });
    await prisma.mataPelajaran.create({
      data: {
        id: subjectId,
        sekolah_id: schoolId,
        kode: `UX${subjectId.slice(-5)}`,
        nama: "Matematika UX02",
      },
    });
    await prisma.preferensiOnboardingGuru.create({
      data: {
        id: generateUlid(),
        pengguna_id: userId,
        sekolah_id: schoolId,
        onboarding_eligible: true,
        onboarding_completed: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.logAudit.deleteMany({ where: { aktor_id: userId } });
    await prisma.preferensiOnboardingGuru.deleteMany({ where: { pengguna_id: userId } });
    await prisma.penugasanMengajar.deleteMany({
      where: { sekolah_id: { in: [schoolId, secondSchoolId] } },
    });
    await prisma.penugasanWaliKelas.deleteMany({
      where: { sekolah_id: { in: [schoolId, secondSchoolId] } },
    });
    await prisma.guru.deleteMany({ where: { pengguna_id: userId } });
    await prisma.mataPelajaran.deleteMany({ where: { id: subjectId } });
    await prisma.rombel.deleteMany({ where: { sekolah_id: { in: [schoolId, secondSchoolId] } } });
    await prisma.tingkatKelas.deleteMany({ where: { sekolah_id: schoolId } });
    await prisma.semester.deleteMany({ where: { sekolah_id: schoolId } });
    await prisma.tahunAjaran.deleteMany({ where: { sekolah_id: schoolId } });
    await prisma.pengguna.deleteMany({ where: { id: userId } });
    await prisma.sekolah.deleteMany({ where: { id: { in: [schoolId, secondSchoolId] } } });
  });

  it("keeps onboarding eligibility and resume cursor server-side and tenant-scoped", async () => {
    const initial = await teacherOnboardingService.getSnapshot({
      userId,
      sekolahId: schoolId,
      isTenantOwner: false,
      canCreateClass: true,
    });
    expect(initial).toMatchObject({
      onboardingEligible: true,
      onboardingCompleted: false,
      wizardStep: 0,
      subjectChoices: [{ id: subjectId, nama: "Matematika UX02" }],
    });

    await teacherOnboardingService.saveWizardStep({ userId, sekolahId: schoolId, step: 2 });
    const resumed = await teacherOnboardingService.getSnapshot({
      userId,
      sekolahId: schoolId,
      isTenantOwner: false,
      canCreateClass: true,
    });
    expect(resumed.wizardStep).toBe(2);

    await expect(
      teacherOnboardingService.saveWizardStep({ userId, sekolahId: secondSchoolId, step: 4 })
    ).rejects.toThrow("tidak tersedia");
    const preferences = await prisma.preferensiOnboardingGuru.findMany({
      where: { pengguna_id: userId },
    });
    expect(preferences.find((item) => item.sekolah_id === schoolId)?.wizard_step).toBe(2);
    expect(preferences.find((item) => item.sekolah_id === secondSchoolId)).toBeUndefined();
  });

  it("persists selected subjects only when they belong to the active tenant", async () => {
    await expect(
      teacherOnboardingService.saveSubjectPreferences({
        userId,
        sekolahId: schoolId,
        subjectIds: [],
      })
    ).rejects.toThrow("Pilih setidaknya satu");
    await expect(
      teacherOnboardingService.saveSubjectPreferences({
        userId,
        sekolahId: secondSchoolId,
        subjectIds: [subjectId],
      })
    ).rejects.toThrow("tidak valid");

    await teacherOnboardingService.saveSubjectPreferences({
      userId,
      sekolahId: schoolId,
      subjectIds: [subjectId],
    });
    const snapshot = await teacherOnboardingService.getSnapshot({
      userId,
      sekolahId: schoolId,
      isTenantOwner: false,
      canCreateClass: true,
    });
    expect(snapshot.selectedSubjectIds).toEqual([subjectId]);
    expect(snapshot.steps.find((step) => step.id === "subjects")?.status).toBe("complete");
  });

  it("does not skip pending role and subject steps when a teacher already has a class", async () => {
    await prisma.rombel.create({
      data: {
        id: generateUlid(),
        sekolah_id: schoolId,
        dibuat_oleh_pengguna_id: userId,
        tahun_ajaran_id: yearId,
        tingkat_id: gradeId,
        nama: "X Existing UX02",
        kapasitas: 36,
        status: "AKTIF",
      },
    });
    await prisma.preferensiOnboardingGuru.update({
      where: { pengguna_id_sekolah_id: { pengguna_id: userId, sekolah_id: schoolId } },
      data: { wizard_step: 0 },
    });

    const snapshot = await teacherOnboardingService.getSnapshot({
      userId,
      sekolahId: schoolId,
      isTenantOwner: false,
      canCreateClass: true,
    });

    expect(snapshot.steps.find((step) => step.id === "class")?.status).toBe("complete");
    expect(snapshot.steps.find((step) => step.id === "roles")?.status).toBe("pending");
    expect(snapshot.wizardStep).toBe(0);
  });

  it("persists independent role preferences per tenant without changing the account role", async () => {
    await teacherOnboardingService.saveRolePreferences({
      userId,
      sekolahId: schoolId,
      guruMapelAktif: true,
      waliKelasAktif: false,
    });
    await teacherOnboardingService.saveRolePreferences({
      userId,
      sekolahId: secondSchoolId,
      guruMapelAktif: false,
      waliKelasAktif: true,
    });

    const preferences = await prisma.preferensiOnboardingGuru.findMany({
      where: { pengguna_id: userId },
      orderBy: { sekolah_id: "asc" },
    });
    const user = await prisma.pengguna.findUnique({ where: { id: userId } });

    expect(preferences).toHaveLength(2);
    expect(preferences.find((item) => item.sekolah_id === schoolId)).toMatchObject({
      guru_mapel_aktif: true,
      wali_kelas_aktif: false,
    });
    expect(preferences.find((item) => item.sekolah_id === secondSchoolId)).toMatchObject({
      guru_mapel_aktif: false,
      wali_kelas_aktif: true,
    });
    expect(user?.peran_dasar).toBe("TEACHER");
  });

  it("creates only a Rombel and records its creator, without assignment or roster side effects", async () => {
    const created = await teacherOnboardingService.createFirstClass({
      userId,
      sekolahId: schoolId,
      role: "TEACHER",
      name: "X TO UX02",
      grade: "X",
    });

    const [rombel, assignments, students, placements, schedules] = await Promise.all([
      prisma.rombel.findUnique({ where: { id: created.id } }),
      prisma.penugasanMengajar.count({ where: { sekolah_id: schoolId, rombel_id: created.id } }),
      prisma.siswa.count({ where: { sekolah_id: schoolId } }),
      prisma.penempatanRombel.count({ where: { sekolah_id: schoolId, rombel_id: created.id } }),
      prisma.jadwalPelajaran.count({ where: { sekolah_id: schoolId, rombel_id: created.id } }),
    ]);

    expect(rombel).toMatchObject({
      id: created.id,
      nama: "X TO UX02",
      dibuat_oleh_pengguna_id: userId,
      tingkat_id: gradeId,
    });
    expect(assignments).toBe(1);
    expect(students).toBe(0);
    expect(placements).toBe(0);
    expect(schedules).toBe(0);
  });

  it("rejects a duplicate class name in the active academic year", async () => {
    await expect(
      teacherOnboardingService.createFirstClass({
        userId,
        sekolahId: schoolId,
        role: "TEACHER",
        name: "X TO UX02",
        grade: "X",
      })
    ).rejects.toThrow("sudah ada");
  });

  it("marks completion only after mandatory steps resolve and optional steps are deferred", async () => {
    await teacherOnboardingService.saveRolePreferences({
      userId,
      sekolahId: schoolId,
      guruMapelAktif: true,
      waliKelasAktif: false,
    });
    await teacherOnboardingService.saveSubjectPreferences({
      userId,
      sekolahId: schoolId,
      subjectIds: [subjectId],
    });
    await teacherOnboardingService.createFirstClass({
      userId,
      sekolahId: schoolId,
      role: "TEACHER",
      name: "X TO Complete UX02",
      grade: "X",
    });
    await teacherOnboardingService.deferStep({ userId, sekolahId: schoolId, step: "students" });
    await teacherOnboardingService.deferStep({ userId, sekolahId: schoolId, step: "schedule" });

    await teacherOnboardingService.completeOnboarding({ userId, sekolahId: schoolId });
    const preference = await prisma.preferensiOnboardingGuru.findUnique({
      where: { pengguna_id_sekolah_id: { pengguna_id: userId, sekolah_id: schoolId } },
    });
    expect(preference?.onboarding_completed).toBe(true);
    expect(preference?.wizard_step).toBe(4);
  });
});
