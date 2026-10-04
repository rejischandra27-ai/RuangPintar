import { describe, it, expect, beforeEach } from "vitest";
import { smartOnboardingService } from "@/modules/ai-assistant/application/smart-onboarding-service";
import { provisionDefaultSubjects } from "@/modules/teacher/application/subject-provisioning-service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";

describe("Smart Onboarding & SaaS Teacher Service (M21)", () => {
  const testEmail = `guru_${Date.now()}@example.com`;

  it("mencari sekolah aktif berdasarkan nama dan NPSN", async () => {
    const schoolId = generateUlid();
    const npsn = `${Date.now()}`.slice(-8);
    const uniqueName = `SD Negeri Pencarian ${schoolId.slice(-6)}`;
    await prisma.sekolah.create({
      data: {
        id: schoolId,
        nama: uniqueName,
        jenjang: "SD",
        npsn,
        alamat: "Kabupaten Bandung",
      },
    });

    const [byName, byNpsn] = await Promise.all([
      smartOnboardingService.discoverSchools(uniqueName),
      smartOnboardingService.discoverSchools(npsn),
    ]);

    expect(byName).toContainEqual({
      id: schoolId,
      nama: uniqueName,
      jenjang: "SD",
      lokasi: "Kabupaten Bandung",
      npsn,
    });
    expect(byNpsn.map((school) => school.id)).toContain(schoolId);
    expect(await smartOnboardingService.discoverSchools(" ")).toEqual([]);
  });

  it("1. harus berhasil mendaftarkan guru mandiri dengan 4 field instan & trial 30 hari", async () => {
    const result = await smartOnboardingService.registerTeacher({
      nama_lengkap: "Ahmad Fauzi, S.Pd",
      email: testEmail,
      password: "Password123#",
      nama_sekolah: "SMA Nusantara",
      jenjang: "SMA",
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(testEmail);
    expect(result.sekolah.nama).toBe("SMA Nusantara");
    expect(result.rawSessionToken).toBeDefined();

    // Verifikasi data di database
    const createdSchool = await prisma.sekolah.findUnique({
      where: { id: result.sekolah.id },
    });
    expect(createdSchool?.tipe_lisensi).toBe("FREEMIUM");
    expect(createdSchool?.trial_berakhir_pada).toBeDefined();

    // Verifikasi entitas guru terbuat
    const teacher = await prisma.guru.findFirst({
      where: { pengguna_id: result.user.id },
    });
    expect(teacher).toBeDefined();
    expect(teacher?.nama_lengkap).toBe("Ahmad Fauzi, S.Pd");

    const [gradeLevels, onboarding] = await Promise.all([
      prisma.tingkatKelas.findMany({
        where: { sekolah_id: result.sekolah.id },
        orderBy: { urutan: "asc" },
        select: { kode: true },
      }),
      prisma.preferensiOnboardingGuru.findUnique({
        where: {
          pengguna_id_sekolah_id: {
            pengguna_id: result.user.id,
            sekolah_id: result.sekolah.id,
          },
        },
      }),
    ]);
    expect(gradeLevels.map((grade) => grade.kode)).toEqual(["X", "XI", "XII"]);
    expect(onboarding).toMatchObject({
      onboarding_eligible: true,
      onboarding_completed: false,
      wizard_step: 0,
    });

    const subjects = await prisma.mataPelajaran.findMany({
      where: { sekolah_id: result.sekolah.id },
      orderBy: { kode: "asc" },
      select: { kode: true, nama: true },
    });
    expect(subjects.map(({ kode, nama }) => [kode, nama])).toEqual(
      [
        ["AGAMA", "Pendidikan Agama"],
        ["BING", "Bahasa Inggris"],
        ["BIN", "Bahasa Indonesia"],
        ["INF", "Informatika"],
        ["MTK", "Matematika"],
        ["PPKN", "PPKn"],
        ["SEJ", "Sejarah"],
        ["SENI", "Seni Budaya"],
        ["PJOK", "PJOK"],
      ].sort(([left], [right]) => left.localeCompare(right))
    );
  });

  it.each([
    [
      "SD",
      ["Pendidikan Agama", "PPKn", "Bahasa Indonesia", "Matematika", "IPAS", "Seni Budaya", "PJOK"],
    ],
    [
      "SMP",
      [
        "Pendidikan Agama",
        "PPKn",
        "Bahasa Indonesia",
        "Matematika",
        "IPA",
        "IPS",
        "Bahasa Inggris",
        "Informatika",
        "Seni Budaya",
        "PJOK",
      ],
    ],
    [
      "SMA",
      [
        "Pendidikan Agama",
        "PPKn",
        "Bahasa Indonesia",
        "Matematika",
        "Bahasa Inggris",
        "Informatika",
        "Sejarah",
        "Seni Budaya",
        "PJOK",
      ],
    ],
    [
      "SMK",
      [
        "Pendidikan Agama",
        "PPKn",
        "Bahasa Indonesia",
        "Matematika",
        "Bahasa Inggris",
        "Informatika",
        "Projek Kejuruan",
      ],
    ],
  ] as const)("membuat katalog starter %s", async (jenjang, expectedNames) => {
    const result = await smartOnboardingService.registerTeacher({
      nama_lengkap: `Guru ${jenjang}`,
      email: `${jenjang.toLowerCase()}_${Date.now()}@example.com`,
      password: "Password123#",
      nama_sekolah: `Sekolah ${jenjang}`,
      jenjang,
    });

    const subjects = await prisma.mataPelajaran.findMany({
      where: { sekolah_id: result.sekolah.id },
      orderBy: { kode: "asc" },
      select: { nama: true },
    });
    expect(subjects.map((subject) => subject.nama).sort()).toEqual([...expectedNames].sort());
  });

  it("provisioning aman diulang dan tidak menimpa perubahan owner", async () => {
    const schoolId = generateUlid();
    await prisma.sekolah.create({
      data: { id: schoolId, nama: "Sekolah Retry", jenjang: "SD" },
    });

    await prisma.$transaction((tx) => provisionDefaultSubjects(tx, schoolId, "SD"));
    const subject = await prisma.mataPelajaran.findFirstOrThrow({
      where: { sekolah_id: schoolId },
    });
    await prisma.mataPelajaran.update({
      where: { id: subject.id },
      data: { nama: "Nama Kustom Owner" },
    });

    await prisma.$transaction((tx) => provisionDefaultSubjects(tx, schoolId, "SD"));

    expect(await prisma.mataPelajaran.count({ where: { sekolah_id: schoolId } })).toBe(7);
    expect((await prisma.mataPelajaran.findUnique({ where: { id: subject.id } }))?.nama).toBe(
      "Nama Kustom Owner"
    );
  });

  it("membatalkan tenant bila validasi provisioning gagal dalam transaksinya", async () => {
    const schoolId = generateUlid();

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.sekolah.create({
          data: { id: schoolId, nama: "Sekolah Invalid", jenjang: "INVALID" },
        });
        await provisionDefaultSubjects(tx, schoolId, "INVALID");
      })
    ).rejects.toThrow("Jenjang provisioning tidak didukung: INVALID");

    expect(await prisma.sekolah.findUnique({ where: { id: schoolId } })).toBeNull();
  });

  it("mendaftarkan guru sebagai non-owner ke sekolah existing tanpa membuat tenant atau trial", async () => {
    const schoolId = generateUlid();
    const email = `join_${Date.now()}@example.com`;
    await prisma.sekolah.create({
      data: { id: schoolId, nama: "SMP Sekolah Bergabung", jenjang: "SMP" },
    });

    const result = await smartOnboardingService.registerTeacher({
      nama_lengkap: "Guru Bergabung",
      email,
      password: "Password123#",
      sekolah_id: schoolId,
    });

    const [membership, user, trialCount, schoolCount, subjectCount] = await Promise.all([
      prisma.keanggotaanSekolah.findUnique({
        where: { pengguna_id_sekolah_id: { pengguna_id: result.user.id, sekolah_id: schoolId } },
      }),
      prisma.pengguna.findUnique({ where: { id: result.user.id } }),
      prisma.langgananTenant.count({ where: { sekolah_id: schoolId } }),
      prisma.sekolah.count({ where: { id: schoolId } }),
      prisma.mataPelajaran.count({ where: { sekolah_id: schoolId } }),
    ]);

    expect(result.sekolah).toEqual({ id: schoolId, nama: "SMP Sekolah Bergabung" });
    expect(membership).toMatchObject({
      status_keanggotaan: "ACTIVE",
      is_owner: false,
      sumber_pendaftaran: "JOIN_REQUEST",
    });
    expect(user?.trial_berakhir_pada).toBeNull();
    expect(trialCount).toBe(0);
    expect(schoolCount).toBe(1);
    expect(subjectCount).toBe(0);
  });

  it("Google teacher yang memilih sekolah baru dibuat bersama provider, owner, session, dan trial", async () => {
    const email = `google_owner_${Date.now()}@example.com`;
    const subject = `google-owner-${Date.now()}`;
    const result = await smartOnboardingService.registerTeacher({
      nama_lengkap: "Guru Google Owner",
      email,
      password: "TemporaryPassword123#",
      nama_sekolah: "Sekolah Google Baru",
      jenjang: "SD",
      provider_identity: { provider: "GOOGLE", subject },
    });

    const [membership, user, subscriptionCount, provider, session] = await Promise.all([
      prisma.keanggotaanSekolah.findUnique({
        where: {
          pengguna_id_sekolah_id: {
            pengguna_id: result.user.id,
            sekolah_id: result.sekolah.id,
          },
        },
      }),
      prisma.pengguna.findUnique({ where: { id: result.user.id } }),
      prisma.langgananTenant.count({ where: { sekolah_id: result.sekolah.id } }),
      prisma.identitasProvider.findUnique({
        where: { provider_subject: { provider: "GOOGLE", subject } },
      }),
      prisma.sesiPengguna.findFirst({ where: { pengguna_id: result.user.id } }),
    ]);

    expect(membership?.is_owner).toBe(true);
    expect(user?.trial_berakhir_pada).toBeInstanceOf(Date);
    expect(subscriptionCount).toBe(1);
    expect(provider?.pengguna_id).toBe(result.user.id);
    expect(session?.sekolah_aktif_id).toBe(result.sekolah.id);
    expect(result.rawSessionToken).toBeTruthy();
  });

  it("2. harus menolak registrasi dengan email yang sama persis", async () => {
    await expect(
      smartOnboardingService.registerTeacher({
        nama_lengkap: "Guru Kloning",
        email: testEmail,
        password: "Password123#",
        nama_sekolah: "SMA Nusantara",
        jenjang: "SMA",
      })
    ).rejects.toThrow("Email sudah terdaftar");
  });

  it("3. harus dapat mengekstrak foto lembar absensi dan menyimpan draft permintaan AI", async () => {
    // Ambil user yang tadi dibuat
    const user = await prisma.pengguna.findFirst({
      where: { email: testEmail },
    });
    expect(user).toBeDefined();

    const extraction = await smartOnboardingService.processClassPhotoWithAi({
      userId: user!.id,
      sekolahId: user!.sekolah_id!,
      imageBase64: "data:image/jpeg;base64,sample_photo_base64",
      namaKelasHint: "X MIPA 1",
      mataPelajaranHint: "Matematika Wajib",
    });

    expect(extraction).toBeDefined();
    expect(extraction.nama_kelas).toBe("X MIPA 1");
    expect(extraction.mata_pelajaran).toBe("Matematika Wajib");
    expect(extraction.siswa.length).toBeGreaterThan(0);
    expect(extraction.requestId).toBeDefined();

    // Verifikasi catatan draft tersimpan
    const draft = await prisma.permintaanSetupKelasAi.findUnique({
      where: { id: extraction.requestId },
    });
    expect(draft).toBeDefined();
    expect(draft?.status).toBe("DRAFT");
  });

  it("4. harus menerbitkan kelas dan seluruh siswa setelah dikonfirmasi guru (Human-in-the-Loop)", async () => {
    const user = await prisma.pengguna.findFirst({
      where: { email: testEmail },
    });

    const createClassResult = await smartOnboardingService.confirmAndCreateClass(
      user!.id,
      user!.sekolah_id!,
      {
        nama_kelas: "X MIPA 1",
        mata_pelajaran: "Matematika Wajib",
        tingkat_kelas: "10",
        siswa: [
          { nama_lengkap: "Budi Santoso", jenis_kelamin: "L", nis: "1001" },
          { nama_lengkap: "Citra Lestari", jenis_kelamin: "P", nis: "1002" },
          { nama_lengkap: "Dian Wahyuni", jenis_kelamin: "P", nis: "1003" },
        ],
      }
    );

    expect(createClassResult.rombelId).toBeDefined();
    expect(createClassResult.namaRombel).toBe("X MIPA 1");
    expect(createClassResult.totalSiswa).toBe(3);

    // Verifikasi rombel di database
    const rombel = await prisma.rombel.findUnique({
      where: { id: createClassResult.rombelId },
      include: { penempatan_rombel: true },
    });
    expect(rombel).toBeDefined();
    expect(rombel?.penempatan_rombel.length).toBe(3);

    // Verifikasi penugasan mengajar terbuat
    const penugasan = await prisma.penugasanMengajar.findFirst({
      where: { rombel_id: createClassResult.rombelId },
      include: { mata_pelajaran: true },
    });
    expect(penugasan).toBeDefined();
    expect(penugasan?.mata_pelajaran.nama).toBe("Matematika Wajib");
  });

  it("4a. membatalkan rombel dan assignment jika pembuatan siswa gagal di transaksi", async () => {
    const user = await prisma.pengguna.findFirst({ where: { email: testEmail } });
    const className = "X MIPA ATOMIC ROLLBACK";

    await expect(
      smartOnboardingService.confirmAndCreateClass(user!.id, user!.sekolah_id!, {
        nama_kelas: className,
        tingkat_kelas: "10",
        mata_pelajaran: "Matematika Wajib",
        siswa: [
          { nama_lengkap: "Siswa Pertama", jenis_kelamin: "L", nis: "ROLLBACK-001" },
          { nama_lengkap: "Siswa Kedua", jenis_kelamin: "P", nis: "ROLLBACK-001" },
        ],
      })
    ).rejects.toThrow();

    expect(
      await prisma.rombel.count({ where: { sekolah_id: user!.sekolah_id!, nama: className } })
    ).toBe(0);
    expect(
      await prisma.penugasanMengajar.count({
        where: { sekolah_id: user!.sekolah_id!, rombel: { nama: className } },
      })
    ).toBe(0);
  });

  it("5. harus menghitung sisa hari uji coba dan status kuota kelas guru", async () => {
    const user = await prisma.pengguna.findFirst({
      where: { email: testEmail },
    });

    const trialStatus = await smartOnboardingService.getTeacherTrialStatus(
      user!.id,
      user!.sekolah_id!
    );

    expect(trialStatus.is_trial).toBe(true);
    expect(trialStatus.days_remaining).toBeGreaterThanOrEqual(29);
    expect(trialStatus.current_rombel_count).toBe(1);
    expect(trialStatus.max_rombel).toBe(5);
    expect(trialStatus.can_create_rombel).toBe(true);
    expect(trialStatus.is_expired).toBe(false);
  });
});
