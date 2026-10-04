import { generateUlid } from "@/shared/lib/ulid";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";

export const TEACHER_AVATAR_IDS = [
  "kapten-kosmik",
  "insinyur-orbit",
  "profesor-nebula",
  "pionir-surya",
  "navigator-bintang",
  "kadet-galaksi",
] as const;

export type TeacherAvatarId = (typeof TEACHER_AVATAR_IDS)[number];
export type TeacherGradeChoice =
  "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII" | "IX" | "X" | "XI" | "XII";

const TEACHER_GRADE_CHOICES = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
] as const satisfies readonly TeacherGradeChoice[];

const GRADE_CHOICES_BY_JENJANG: Record<string, readonly TeacherGradeChoice[]> = {
  SD: ["I", "II", "III", "IV", "V", "VI"],
  SMP: ["VII", "VIII", "IX"],
  SMA: ["X", "XI", "XII"],
  SMK: ["X", "XI", "XII"],
  UMUM: ["X", "XI", "XII"],
};

const GRADE_CODE_ALIASES: Record<TeacherGradeChoice, readonly string[]> = {
  I: ["I", "1"],
  II: ["II", "2"],
  III: ["III", "3"],
  IV: ["IV", "4"],
  V: ["V", "5"],
  VI: ["VI", "6"],
  VII: ["VII", "7"],
  VIII: ["VIII", "8"],
  IX: ["IX", "9"],
  X: ["X", "10"],
  XI: ["XI", "11"],
  XII: ["XII", "12"],
};

export interface TeacherOnboardingStep {
  id: "roles" | "subjects" | "class" | "students" | "schedule";
  label: string;
  status: "complete" | "pending" | "deferred";
}

export interface TeacherOnboardingSnapshot {
  steps: TeacherOnboardingStep[];
  progress: number;
  onboardingEligible: boolean;
  onboardingCompleted: boolean;
  wizardStep: number;
  preferences: { guruMapelAktif: boolean; waliKelasAktif: boolean };
  selectedSubjectIds: string[];
  subjectChoices: Array<{ id: string; nama: string }>;
  gradeChoices: TeacherGradeChoice[];
  canManageSubjects?: boolean;
  canCreateClass: boolean;
  managedRombel: Array<{ id: string; nama: string; tingkat: string }>;
  scheduleAssignments: Array<{
    id: string;
    rombelId: string;
    rombelNama: string;
    mataPelajaranNama: string;
  }>;
  hasActiveHomeroomAssignment: boolean;
  schoolName?: string;
  schoolIsSubscribed?: boolean;
  needsSchoolSetup?: boolean;
}

export class TeacherOnboardingService {
  async getSnapshot(input: {
    userId: string;
    sekolahId: string;
    isTenantOwner: boolean;
    canCreateClass: boolean;
    canManageSubjects?: boolean;
  }): Promise<TeacherOnboardingSnapshot> {
    const [user, guru, preference, activeYear, subjectChoices, school, configuredGrades] =
      await Promise.all([
        prisma.pengguna.findUnique({
          where: { id: input.userId },
          select: { avatar_id: true },
        }),
        prisma.guru.findFirst({
          where: { pengguna_id: input.userId, sekolah_id: input.sekolahId, status_aktif: true },
          select: { id: true },
        }),
        prisma.preferensiOnboardingGuru.findUnique({
          where: {
            pengguna_id_sekolah_id: {
              pengguna_id: input.userId,
              sekolah_id: input.sekolahId,
            },
          },
        }),
        prisma.tahunAjaran.findFirst({
          where: { sekolah_id: input.sekolahId, status: "AKTIF" },
          orderBy: { tanggal_mulai: "desc" },
          select: { id: true },
        }),
        prisma.mataPelajaran.findMany({
          where: {
            sekolah_id: input.sekolahId,
            status_aktif: true,
            status_lifecycle: "AKTIF",
          },
          select: { id: true, nama: true },
          orderBy: { nama: "asc" },
        }),
        prisma.sekolah.findUnique({
          where: { id: input.sekolahId },
          select: { id: true, nama: true, jenjang: true, tipe_lisensi: true },
        }),
        prisma.tingkatKelas.findMany({
          where: { sekolah_id: input.sekolahId },
          select: { kode: true },
        }),
      ]);

    let activeConfiguredGrades = configuredGrades;
    if (activeConfiguredGrades.length === 0) {
      const jenjangKey = (
        (school?.jenjang?.toUpperCase() || "SMA") in GRADE_CHOICES_BY_JENJANG
          ? school?.jenjang?.toUpperCase()
          : "SMA"
      ) as keyof typeof GRADE_CHOICES_BY_JENJANG;
      const defaultGradeTuples: Record<string, readonly [string, string, number][]> = {
        SD: [
          ["I", "Kelas I", 1],
          ["II", "Kelas II", 2],
          ["III", "Kelas III", 3],
          ["IV", "Kelas IV", 4],
          ["V", "Kelas V", 5],
          ["VI", "Kelas VI", 6],
        ],
        SMP: [
          ["VII", "Kelas VII", 7],
          ["VIII", "Kelas VIII", 8],
          ["IX", "Kelas IX", 9],
        ],
        SMA: [
          ["X", "Kelas X", 10],
          ["XI", "Kelas XI", 11],
          ["XII", "Kelas XII", 12],
        ],
        SMK: [
          ["X", "Kelas X", 10],
          ["XI", "Kelas XI", 11],
          ["XII", "Kelas XII", 12],
        ],
        UMUM: [
          ["X", "Kelas X", 10],
          ["XI", "Kelas XI", 11],
          ["XII", "Kelas XII", 12],
        ],
      };
      const tuples = defaultGradeTuples[jenjangKey] ?? defaultGradeTuples.SMA;
      const created = await Promise.all(
        tuples.map(([kode, nama, urutan]) =>
          prisma.tingkatKelas.upsert({
            where: { sekolah_id_kode: { sekolah_id: input.sekolahId, kode } },
            create: { id: generateUlid(), sekolah_id: input.sekolahId, kode, nama, urutan },
            update: {},
          })
        )
      );
      activeConfiguredGrades = created.map((g) => ({ kode: g.kode }));
    }

    const configuredGradeCodes = new Set(
      activeConfiguredGrades.map((grade) => grade.kode.toUpperCase())
    );
    const schoolJenjang = (school?.jenjang?.toUpperCase() || "UMUM") as
      keyof typeof GRADE_CHOICES_BY_JENJANG | undefined;
    let gradeChoices = (
      schoolJenjang ? (GRADE_CHOICES_BY_JENJANG[schoolJenjang] ?? []) : []
    ).filter((choice): choice is TeacherGradeChoice => {
      const aliases = GRADE_CODE_ALIASES[choice as TeacherGradeChoice] ?? [];
      return aliases.some((code) => configuredGradeCodes.has(code));
    });

    if (gradeChoices.length === 0) {
      gradeChoices = ["X", "XI", "XII"];
    }

    let activeGuru = guru;
    if (!activeGuru) {
      const userRecord = await prisma.pengguna.findUnique({
        where: { id: input.userId },
        select: { nama_lengkap: true, email: true },
      });
      if (userRecord) {
        activeGuru = await prisma.guru.create({
          data: {
            id: generateUlid(),
            sekolah_id: input.sekolahId,
            pengguna_id: input.userId,
            nama_lengkap: userRecord.nama_lengkap,
            email: userRecord.email,
            jenis_kelamin: "L",
            status_aktif: true,
          },
          select: { id: true },
        });
      }
    }

    const teacher = activeGuru
      ? await prisma.guru.findFirst({
          where: { id: activeGuru.id },
          select: {
            id: true,
            penugasan_mengajar: {
              where: {
                status: activeYear ? "AKTIF" : "NONAKTIF",
                ...(activeYear ? { tahun_ajaran_id: activeYear.id } : {}),
              },
              select: {
                id: true,
                rombel_id: true,
                rombel: { select: { nama: true } },
                mata_pelajaran: { select: { nama: true } },
              },
            },
            penugasan_wali: {
              where: { status: "AKTIF", tahun_ajaran_id: activeYear?.id },
              select: { rombel_id: true },
            },
          },
        })
      : null;

    const assignmentRombelIds = [
      ...(teacher?.penugasan_mengajar.map((item) => item.rombel_id) ?? []),
      ...(teacher?.penugasan_wali.map((item) => item.rombel_id) ?? []),
    ];

    const rombels = await prisma.rombel.findMany({
      where: {
        sekolah_id: input.sekolahId,
        status: "AKTIF",
        ...(activeYear ? { tahun_ajaran_id: activeYear.id } : {}),
        ...(input.isTenantOwner
          ? {}
          : {
              OR: [
                { dibuat_oleh_pengguna_id: input.userId },
                ...(assignmentRombelIds.length > 0 ? [{ id: { in: assignmentRombelIds } }] : []),
              ],
            }),
      },
      select: { id: true, nama: true, tingkat: { select: { kode: true, nama: true } } },
      orderBy: { nama: "asc" },
    });

    const [activePlacementCount, scheduleCount, activeHomeroomCount, activeTenantRombelCount] =
      await Promise.all([
        rombels.length > 0
          ? prisma.penempatanRombel.count({
              where: {
                sekolah_id: input.sekolahId,
                rombel_id: { in: rombels.map((item) => item.id) },
                status: "AKTIF",
              },
            })
          : Promise.resolve(0),
        teacher
          ? prisma.jadwalPelajaran.count({
              where: {
                sekolah_id: input.sekolahId,
                guru_id: teacher.id,
                ...(activeYear ? { tahun_ajaran_id: activeYear.id } : {}),
                versi_jadwal: { status: "PUBLISHED" },
              },
            })
          : Promise.resolve(0),
        teacher && activeYear
          ? prisma.penugasanWaliKelas.count({
              where: {
                sekolah_id: input.sekolahId,
                guru_id: teacher.id,
                tahun_ajaran_id: activeYear.id,
                status: "AKTIF",
              },
            })
          : Promise.resolve(0),
        input.isTenantOwner && activeYear
          ? prisma.rombel.count({
              where: {
                sekolah_id: input.sekolahId,
                tahun_ajaran_id: activeYear.id,
                status: "AKTIF",
              },
            })
          : Promise.resolve(0),
      ]);

    const isClassComplete = input.isTenantOwner ? activeTenantRombelCount > 0 : rombels.length > 0;
    let selectedSubjectIds: string[] = [];
    try {
      const parsedSubjectIds: unknown = JSON.parse(preference?.mata_pelajaran_ids_json ?? "[]");
      if (Array.isArray(parsedSubjectIds)) {
        selectedSubjectIds = parsedSubjectIds.filter(
          (subjectId): subjectId is string =>
            typeof subjectId === "string" &&
            subjectChoices.some((subject) => subject.id === subjectId)
        );
      }
    } catch {
      selectedSubjectIds = [];
    }

    let activeAssignments = teacher?.penugasan_mengajar ?? [];
    if (activeGuru && activeAssignments.length === 0 && rombels.length > 0 && activeYear) {
      let targetSubjectIds = selectedSubjectIds;
      if (targetSubjectIds.length === 0 && subjectChoices.length > 0) {
        targetSubjectIds = [subjectChoices[0].id];
      }

      if (targetSubjectIds.length > 0) {
        let semester = await prisma.semester.findFirst({
          where: { sekolah_id: input.sekolahId, tahun_ajaran_id: activeYear.id, status: "AKTIF" },
          select: { id: true },
        });
        if (!semester) {
          semester = await prisma.semester.findFirst({
            where: { sekolah_id: input.sekolahId, status: "AKTIF" },
            select: { id: true },
          });
        }
        if (!semester) {
          semester = await prisma.semester.create({
            data: {
              id: generateUlid(),
              sekolah_id: input.sekolahId,
              tahun_ajaran_id: activeYear.id,
              kode: "GANJIL",
              nama: "Semester Ganjil",
              urutan: 1,
              tanggal_mulai: new Date("2026-07-01"),
              tanggal_selesai: new Date("2026-12-31"),
              status: "AKTIF",
            },
            select: { id: true },
          });
        }

        for (const rombel of rombels) {
          for (const subId of targetSubjectIds) {
            const existing = await prisma.penugasanMengajar.findFirst({
              where: {
                sekolah_id: input.sekolahId,
                guru_id: activeGuru.id,
                rombel_id: rombel.id,
                mata_pelajaran_id: subId,
                tahun_ajaran_id: activeYear.id,
              },
            });
            if (!existing) {
              await prisma.penugasanMengajar.create({
                data: {
                  id: generateUlid(),
                  sekolah_id: input.sekolahId,
                  guru_id: activeGuru.id,
                  mata_pelajaran_id: subId,
                  tahun_ajaran_id: activeYear.id,
                  semester_id: semester?.id ?? null,
                  rombel_id: rombel.id,
                  jumlah_jam_minggu: 2,
                  status: "AKTIF",
                },
              });
            }
          }
        }

        activeAssignments = await prisma.penugasanMengajar.findMany({
          where: {
            sekolah_id: input.sekolahId,
            guru_id: activeGuru.id,
            status: "AKTIF",
            tahun_ajaran_id: activeYear.id,
          },
          select: {
            id: true,
            rombel_id: true,
            rombel: { select: { nama: true } },
            mata_pelajaran: { select: { nama: true } },
          },
        });
      }
    }

    const steps: TeacherOnboardingStep[] = [
      {
        id: "roles",
        label: "Pilih Peran",
        status: preference?.peran_dikonfirmasi_pada ? "complete" : "pending",
      },
      {
        id: "subjects",
        label: "Pilih Mata Pelajaran",
        status: preference?.mapel_dikonfirmasi_pada ? "complete" : "pending",
      },
      {
        id: "class",
        label: "Buat Kelas Pertama",
        status: isClassComplete ? "complete" : "pending",
      },
      {
        id: "students",
        label: "Tambah Siswa",
        status:
          activePlacementCount > 0
            ? "complete"
            : preference?.siswa_ditunda_pada
              ? "deferred"
              : "pending",
      },
      {
        id: "schedule",
        label: "Atur Jadwal",
        status:
          scheduleCount > 0 ? "complete" : preference?.jadwal_ditunda_pada ? "deferred" : "pending",
      },
    ];
    const resolvedCount = steps.filter((step) => step.status !== "pending").length;
    const firstPendingStep = steps.findIndex((step) => step.status === "pending");
    const nextUnresolvedStep = firstPendingStep === -1 ? steps.length - 1 : firstPendingStep;
    const savedWizardStep = Math.max(0, Math.min(4, preference?.wizard_step ?? 0));

    return {
      steps,
      progress: Math.round((resolvedCount / steps.length) * 100),
      onboardingEligible: preference?.onboarding_eligible ?? false,
      onboardingCompleted: preference?.onboarding_completed ?? true,
      wizardStep: Math.max(savedWizardStep, nextUnresolvedStep),
      preferences: {
        guruMapelAktif: preference?.guru_mapel_aktif ?? false,
        waliKelasAktif: preference?.wali_kelas_aktif ?? false,
      },
      selectedSubjectIds,
      subjectChoices,
      gradeChoices,
      canManageSubjects: input.canManageSubjects ?? false,
      canCreateClass: input.canCreateClass,
      managedRombel: rombels.map((item) => ({
        id: item.id,
        nama: item.nama,
        tingkat: item.tingkat.kode || item.tingkat.nama,
      })),
      scheduleAssignments: activeAssignments.map((item) => ({
        id: item.id,
        rombelId: item.rombel_id,
        rombelNama: item.rombel.nama,
        mataPelajaranNama: item.mata_pelajaran.nama,
      })),
      hasActiveHomeroomAssignment: activeHomeroomCount > 0,
      schoolName: school?.nama ?? "",
      schoolIsSubscribed: school?.tipe_lisensi !== "FREEMIUM",
      needsSchoolSetup: !school?.nama || school.nama === "Guru Mandiri",
    };
  }

  async saveRolePreferences(input: {
    userId: string;
    sekolahId: string;
    guruMapelAktif: boolean;
    waliKelasAktif: boolean;
  }): Promise<void> {
    await prisma.preferensiOnboardingGuru.upsert({
      where: {
        pengguna_id_sekolah_id: { pengguna_id: input.userId, sekolah_id: input.sekolahId },
      },
      create: {
        id: generateUlid(),
        pengguna_id: input.userId,
        sekolah_id: input.sekolahId,
        guru_mapel_aktif: input.guruMapelAktif,
        wali_kelas_aktif: input.waliKelasAktif,
        peran_dikonfirmasi_pada: new Date(),
      },
      update: {
        guru_mapel_aktif: input.guruMapelAktif,
        wali_kelas_aktif: input.waliKelasAktif,
        peran_dikonfirmasi_pada: new Date(),
        wizard_step: 1,
      },
    });
  }

  async saveSubjectPreferences(input: {
    userId: string;
    sekolahId: string;
    subjectIds: string[];
  }): Promise<void> {
    const subjectIds = [...new Set(input.subjectIds)];
    const subjectFilter = {
      sekolah_id: input.sekolahId,
      status_aktif: true,
      status_lifecycle: "AKTIF",
    };
    const availableSubjectCount = await prisma.mataPelajaran.count({ where: subjectFilter });
    if (availableSubjectCount > 0 && subjectIds.length === 0) {
      throw new Error("Pilih setidaknya satu mata pelajaran.");
    }

    const validSubjects = subjectIds.length
      ? await prisma.mataPelajaran.count({
          where: {
            id: { in: subjectIds },
            ...subjectFilter,
          },
        })
      : 0;

    if (validSubjects !== subjectIds.length) {
      throw new Error("Pilihan mata pelajaran tidak valid untuk sekolah aktif.");
    }

    await prisma.preferensiOnboardingGuru.upsert({
      where: {
        pengguna_id_sekolah_id: { pengguna_id: input.userId, sekolah_id: input.sekolahId },
      },
      create: {
        id: generateUlid(),
        pengguna_id: input.userId,
        sekolah_id: input.sekolahId,
        mata_pelajaran_ids_json: JSON.stringify(subjectIds),
        mapel_dikonfirmasi_pada: new Date(),
        wizard_step: 2,
      },
      update: {
        mata_pelajaran_ids_json: JSON.stringify(subjectIds),
        mapel_dikonfirmasi_pada: new Date(),
        wizard_step: 2,
      },
    });
  }

  async saveWizardStep(input: { userId: string; sekolahId: string; step: number }): Promise<void> {
    if (!Number.isInteger(input.step) || input.step < 0 || input.step > 4) {
      throw new Error("Posisi wizard tidak valid.");
    }

    const result = await prisma.preferensiOnboardingGuru.updateMany({
      where: {
        pengguna_id: input.userId,
        sekolah_id: input.sekolahId,
        onboarding_eligible: true,
        onboarding_completed: false,
      },
      data: { wizard_step: input.step },
    });
    if (result.count !== 1) {
      throw new Error("Lifecycle onboarding tidak tersedia untuk akun ini.");
    }
  }

  async completeOnboarding(input: { userId: string; sekolahId: string }): Promise<void> {
    const preference = await prisma.preferensiOnboardingGuru.findUnique({
      where: {
        pengguna_id_sekolah_id: { pengguna_id: input.userId, sekolah_id: input.sekolahId },
      },
      select: { onboarding_eligible: true, onboarding_completed: true },
    });

    if (!preference?.onboarding_eligible || preference.onboarding_completed) {
      throw new Error("Lifecycle onboarding tidak tersedia untuk akun ini.");
    }

    const snapshot = await this.getSnapshot({
      userId: input.userId,
      sekolahId: input.sekolahId,
      isTenantOwner: false,
      canCreateClass: false,
    });
    if (snapshot.steps.some((step) => step.status === "pending")) {
      throw new Error("Selesaikan atau tunda setiap langkah onboarding sebelum mengakhiri wizard.");
    }

    await prisma.preferensiOnboardingGuru.update({
      where: {
        pengguna_id_sekolah_id: { pengguna_id: input.userId, sekolah_id: input.sekolahId },
      },
      data: { onboarding_completed: true, wizard_step: 4 },
    });
  }

  async deferStep(input: {
    userId: string;
    sekolahId: string;
    step: "students" | "schedule";
  }): Promise<void> {
    const field = input.step === "students" ? "siswa_ditunda_pada" : "jadwal_ditunda_pada";
    await prisma.preferensiOnboardingGuru.upsert({
      where: {
        pengguna_id_sekolah_id: { pengguna_id: input.userId, sekolah_id: input.sekolahId },
      },
      create: {
        id: generateUlid(),
        pengguna_id: input.userId,
        sekolah_id: input.sekolahId,
        [field]: new Date(),
      },
      update: { [field]: new Date() },
    });

    await prisma.preferensiOnboardingGuru.updateMany({
      where: {
        pengguna_id: input.userId,
        sekolah_id: input.sekolahId,
        onboarding_eligible: true,
        onboarding_completed: false,
      },
      data: { wizard_step: 4 },
    });
  }

  async saveAvatar(userId: string, avatarId: string): Promise<void> {
    if (!TEACHER_AVATAR_IDS.includes(avatarId as TeacherAvatarId)) {
      throw new Error("Pilihan avatar tidak valid.");
    }
    await prisma.pengguna.update({ where: { id: userId }, data: { avatar_id: avatarId } });
  }

  async createFirstClass(input: {
    userId: string;
    sekolahId: string;
    role: string;
    name: string;
    grade: TeacherGradeChoice;
  }): Promise<{ id: string; name: string }> {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Nama kelas harus 2–80 karakter.");

    let year = await prisma.tahunAjaran.findFirst({
      where: { sekolah_id: input.sekolahId, status: "AKTIF" },
      orderBy: { tanggal_mulai: "desc" },
      select: { id: true, nama: true },
    });
    if (!year) {
      const createdYear = await prisma.tahunAjaran.create({
        data: {
          id: generateUlid(),
          sekolah_id: input.sekolahId,
          nama: "2026/2027",
          kode: "TA-2026-2027",
          tanggal_mulai: new Date("2026-07-01"),
          tanggal_selesai: new Date("2027-06-30"),
          status: "AKTIF",
        },
        select: { id: true, nama: true },
      });
      year = createdYear;
    }

    const school = await prisma.sekolah.findUnique({
      where: { id: input.sekolahId },
      select: { jenjang: true },
    });
    const schoolJenjang = (school?.jenjang?.toUpperCase() || "UMUM") as
      keyof typeof GRADE_CHOICES_BY_JENJANG | undefined;
    const supportedGrades = schoolJenjang
      ? (GRADE_CHOICES_BY_JENJANG[schoolJenjang] ?? ["X", "XI", "XII"])
      : ["X", "XI", "XII"];
    if (!TEACHER_GRADE_CHOICES.includes(input.grade) || !supportedGrades.includes(input.grade)) {
      throw new Error(`Tingkat ${input.grade} tidak sesuai dengan jenjang tenant.`);
    }
    let grade = await prisma.tingkatKelas.findFirst({
      where: {
        sekolah_id: input.sekolahId,
        kode: { in: [...GRADE_CODE_ALIASES[input.grade]] },
      },
      orderBy: { urutan: "asc" },
      select: { id: true, fase_id: true },
    });
    if (!grade) {
      const createdGrade = await prisma.tingkatKelas.create({
        data: {
          id: generateUlid(),
          sekolah_id: input.sekolahId,
          kode: input.grade,
          nama: `Kelas ${input.grade}`,
          urutan: input.grade === "X" ? 10 : input.grade === "XI" ? 11 : 12,
        },
        select: { id: true, fase_id: true },
      });
      grade = createdGrade;
    }

    const duplicate = await prisma.rombel.findFirst({
      where: { sekolah_id: input.sekolahId, tahun_ajaran_id: year.id, nama: name },
      select: { id: true },
    });
    if (duplicate) throw new Error(`Kelas ${name} sudah ada pada tahun ajaran ${year.nama}.`);

    const id = generateUlid();
    await prisma.$transaction(async (tx) => {
      const rombel = await tx.rombel.create({
        data: {
          id,
          sekolah_id: input.sekolahId,
          dibuat_oleh_pengguna_id: input.userId,
          tahun_ajaran_id: year.id,
          tingkat_id: grade.id,
          fase_id: grade.fase_id,
          nama: name,
          kapasitas: 36,
          status: "AKTIF",
        },
      });

      let guru = await tx.guru.findFirst({
        where: { pengguna_id: input.userId, sekolah_id: input.sekolahId, status_aktif: true },
        select: { id: true },
      });
      if (!guru) {
        const userObj = await tx.pengguna.findUnique({
          where: { id: input.userId },
          select: { nama_lengkap: true, email: true },
        });
        if (userObj) {
          guru = await tx.guru.create({
            data: {
              id: generateUlid(),
              sekolah_id: input.sekolahId,
              pengguna_id: input.userId,
              nama_lengkap: userObj.nama_lengkap,
              email: userObj.email,
              jenis_kelamin: "L",
              status_aktif: true,
            },
            select: { id: true },
          });
        }
      }

      let semester = await tx.semester.findFirst({
        where: { sekolah_id: input.sekolahId, tahun_ajaran_id: year.id, status: "AKTIF" },
        select: { id: true },
      });
      if (!semester) {
        semester = await tx.semester.findFirst({
          where: { sekolah_id: input.sekolahId, status: "AKTIF" },
          select: { id: true },
        });
      }
      if (!semester) {
        semester = await tx.semester.create({
          data: {
            id: generateUlid(),
            sekolah_id: input.sekolahId,
            tahun_ajaran_id: year.id,
            kode: "GANJIL",
            nama: "Semester Ganjil",
            urutan: 1,
            tanggal_mulai: new Date("2026-07-01"),
            tanggal_selesai: new Date("2026-12-31"),
            status: "AKTIF",
          },
          select: { id: true },
        });
      }

      const preference = await tx.preferensiOnboardingGuru.findUnique({
        where: {
          pengguna_id_sekolah_id: { pengguna_id: input.userId, sekolah_id: input.sekolahId },
        },
        select: { mata_pelajaran_ids_json: true, wali_kelas_aktif: true },
      });

      let targetSubjectIds: string[] = [];
      try {
        const parsed = JSON.parse(preference?.mata_pelajaran_ids_json ?? "[]");
        if (Array.isArray(parsed)) {
          targetSubjectIds = parsed.filter((subId): subId is string => typeof subId === "string");
        }
      } catch {
        targetSubjectIds = [];
      }

      if (targetSubjectIds.length === 0) {
        const defaultSubs = await tx.mataPelajaran.findMany({
          where: { sekolah_id: input.sekolahId, status_aktif: true, status_lifecycle: "AKTIF" },
          select: { id: true },
          take: 3,
        });
        targetSubjectIds = defaultSubs.map((s) => s.id);
      }

      if (guru && targetSubjectIds.length > 0) {
        for (const subId of targetSubjectIds) {
          await tx.penugasanMengajar.create({
            data: {
              id: generateUlid(),
              sekolah_id: input.sekolahId,
              guru_id: guru.id,
              mata_pelajaran_id: subId,
              tahun_ajaran_id: year.id,
              semester_id: semester?.id ?? null,
              rombel_id: rombel.id,
              jumlah_jam_minggu: 2,
              status: "AKTIF",
            },
          });
        }
      }

      if (guru && preference?.wali_kelas_aktif) {
        await tx.penugasanWaliKelas.create({
          data: {
            id: generateUlid(),
            sekolah_id: input.sekolahId,
            guru_id: guru.id,
            rombel_id: rombel.id,
            tahun_ajaran_id: year.id,
            status: "AKTIF",
          },
        });
      }

      await recordAuditEvent(
        {
          sekolah_id: input.sekolahId,
          aktor_id: input.userId,
          aktor_role: input.role,
          aksi: "CREATE",
          tipe_sumber: "ROMBEL",
          id_sumber: rombel.id,
          payload_sesudah: {
            nama: rombel.nama,
            tahun_ajaran_id: rombel.tahun_ajaran_id,
            tingkat_id: rombel.tingkat_id,
          },
        },
        tx
      );
      await tx.preferensiOnboardingGuru.updateMany({
        where: { pengguna_id: input.userId, sekolah_id: input.sekolahId },
        data: { wizard_step: 3 },
      });
    });

    return { id, name };
  }
}

export const teacherOnboardingService = new TeacherOnboardingService();
