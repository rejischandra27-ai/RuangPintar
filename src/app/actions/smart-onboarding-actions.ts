"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { smartOnboardingService } from "@/modules/ai-assistant/application/smart-onboarding-service";
import {
  SmartOnboardingRegistrationSchema,
  ConfirmClassCreationSchema,
  TeacherSchoolRegistrationChoiceSchema,
} from "@/modules/ai-assistant/domain/ai-validation";
import {
  ClassExtractionResult,
  TeacherTrialStatusDTO,
} from "@/modules/ai-assistant/domain/ai-types";
import { getSessionCookieOptions } from "@/shared/lib/session";
import { getCurrentUser } from "@/shared/infrastructure/auth/auth-guard";
import {
  GOOGLE_PENDING_REGISTRATION_COOKIE,
  createGoogleRegistrationPassword,
  getGoogleOAuthExpiredCookieOptions,
  readGooglePendingRegistrationCookie,
} from "@/shared/infrastructure/auth/google-oauth-service";
import { scheduleService } from "@/modules/schedule/application/schedule-service";
import { timeSlotService } from "@/modules/schedule/application/time-slot-service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { HariBelajar } from "@/modules/schedule/domain/schedule-types";
import { generateUlid } from "@/shared/lib/ulid";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ConfirmClassResult {
  rombelId: string;
  namaRombel: string;
  totalSiswa: number;
  mataPelajaran: string;
}

const HARI_BELAJAR: HariBelajar[] = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

async function setRegistrationSessionCookie(rawSessionToken: string) {
  const cookieOptions = getSessionCookieOptions(rawSessionToken, true);
  const cookieStore = await cookies();
  cookieStore.set(cookieOptions.name, cookieOptions.value, {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
    expires: cookieOptions.expires,
    maxAge: cookieOptions.maxAge,
  });
}

export async function searchSchoolsAction(
  query: string
): Promise<ActionResult<Awaited<ReturnType<typeof smartOnboardingService.discoverSchools>>>> {
  try {
    return { success: true, data: await smartOnboardingService.discoverSchools(query) };
  } catch {
    return { success: false, error: "Pencarian sekolah belum dapat dilakukan. Coba lagi." };
  }
}

export async function completeGoogleTeacherRegistrationAction(
  payload: unknown
): Promise<ActionResult<{ sekolah: { id: string; nama: string }; redirectUrl: string }>> {
  try {
    const parsed = TeacherSchoolRegistrationChoiceSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, error: "Pilih sekolah atau lengkapi sekolah baru." };
    }

    const cookieStore = await cookies();
    const pendingToken = cookieStore.get(GOOGLE_PENDING_REGISTRATION_COOKIE)?.value;
    const pendingIdentity = readGooglePendingRegistrationCookie(pendingToken);
    if (!pendingIdentity) {
      return { success: false, error: "Sesi pendaftaran Google tidak valid atau kedaluwarsa." };
    }

    const result = await smartOnboardingService.registerTeacher({
      nama_lengkap: pendingIdentity.nama_lengkap,
      email: pendingIdentity.email,
      password: createGoogleRegistrationPassword(),
      provider_identity: { provider: "GOOGLE", subject: pendingIdentity.subject },
      ...parsed.data,
    });

    if (!result.rawSessionToken) throw new Error("Sesi pendaftaran gagal dibuat.");
    await setRegistrationSessionCookie(result.rawSessionToken);
    cookieStore.set(GOOGLE_PENDING_REGISTRATION_COOKIE, "", getGoogleOAuthExpiredCookieOptions());
    revalidatePath("/dashboard");

    const redirectUrl =
      result.membershipStatus === "PENDING"
        ? "/onboarding/menunggu-persetujuan"
        : "/onboarding/pilih-avatar";

    return {
      success: true,
      data: { sekolah: result.sekolah, redirectUrl },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menghubungkan sekolah.",
    };
  }
}

async function getTeacherAssignmentForRombel(
  userId: string,
  sekolahId: string,
  rombelId: string,
  penugasanId?: string
) {
  const guru = await prisma.guru.findFirst({
    where: { pengguna_id: userId, sekolah_id: sekolahId, status_aktif: true },
    select: { id: true },
  });
  if (!guru) throw new Error("Profil guru tidak ditemukan.");

  const penugasan = await prisma.penugasanMengajar.findFirst({
    where: {
      sekolah_id: sekolahId,
      guru_id: guru.id,
      status: "AKTIF",
      ...(penugasanId ? { id: penugasanId } : { rombel_id: rombelId }),
    },
    include: { rombel: { select: { nama: true } }, mata_pelajaran: { select: { nama: true } } },
  });
  if (!penugasan) throw new Error("Anda hanya dapat mengatur jadwal untuk rombel yang Anda ampu.");
  return { guru, penugasan };
}

/**
 * 1. Action: Registrasi Akun Guru Mandiri (SaaS Free Trial)
 */
export async function registerTeacherAction(
  formData: FormData
): Promise<ActionResult<{ user: any; sekolah: any; redirectUrl: string }>> {
  try {
    const rawData = {
      nama_lengkap: formData.get("nama_lengkap")?.toString() ?? "",
      email: formData.get("email")?.toString() ?? "",
      password: formData.get("password")?.toString() ?? "",
      sekolah_id: formData.get("sekolah_id")?.toString() || undefined,
      nama_sekolah: formData.get("nama_sekolah")?.toString() || undefined,
      jenjang: formData.get("jenjang")?.toString() || undefined,
    };

    const parsed = SmartOnboardingRegistrationSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Data pendaftaran tidak valid.",
      };
    }

    const result = await smartOnboardingService.registerTeacher(parsed.data);

    if (!result.rawSessionToken) throw new Error("Sesi pendaftaran gagal dibuat.");
    await setRegistrationSessionCookie(result.rawSessionToken);

    const redirectUrl =
      result.membershipStatus === "PENDING"
        ? "/onboarding/menunggu-persetujuan"
        : "/onboarding/pilih-avatar";

    return {
      success: true,
      data: {
        user: result.user,
        sekolah: result.sekolah,
        redirectUrl,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Gagal melakukan registrasi akun.",
    };
  }
}

/**
 * 2. Action: Pindai Foto Lembar Absensi Menggunakan Gemini Vision AI
 */
export async function processClassPhotoAction(
  formData: FormData
): Promise<ActionResult<ClassExtractionResult>> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.sekolah_id) {
      return { success: false, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    const imageBase64 = formData.get("imageBase64")?.toString() ?? "";
    const mimeType = formData.get("mimeType")?.toString() ?? "image/jpeg";
    const namaKelasHint = formData.get("namaKelasHint")?.toString() ?? undefined;
    const mataPelajaranHint = formData.get("mataPelajaranHint")?.toString() ?? undefined;

    if (!imageBase64 || imageBase64.length < 50) {
      return { success: false, error: "Berkas foto lembar absensi wajib disertakan." };
    }

    const extraction = await smartOnboardingService.processClassPhotoWithAi({
      userId: user.id,
      sekolahId: user.sekolah_id,
      imageBase64,
      mimeType,
      namaKelasHint,
      mataPelajaranHint,
    });

    return {
      success: true,
      data: extraction,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Gagal mengekstrak data dari foto.",
    };
  }
}

/**
 * 3. Action: Konfirmasi & Terbitkan Kelas + Siswa (Human-in-the-Loop)
 */
export async function confirmClassCreationAction(
  payload: any
): Promise<ActionResult<ConfirmClassResult>> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.sekolah_id) {
      return { success: false, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    const parsed = ConfirmClassCreationSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Data konfirmasi kelas tidak valid.",
      };
    }

    const result = await smartOnboardingService.confirmAndCreateClass(
      user.id,
      user.sekolah_id,
      parsed.data
    );

    revalidatePath("/dashboard");
    revalidatePath("/kelas-saya");

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Gagal membuat kelas dari hasil pemindaian AI.",
    };
  }
}

/**
 * 4. Action: Dapatkan Status Masa Percobaan Guru (Freemium Trial Status)
 */
export async function getTeacherTrialStatusAction(): Promise<ActionResult<TeacherTrialStatusDTO>> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.sekolah_id) {
      return { success: false, error: "Tidak terautentikasi." };
    }

    const status = await smartOnboardingService.getTeacherTrialStatus(user.id, user.sekolah_id);
    return {
      success: true,
      data: status,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Gagal mengambil status trial.",
    };
  }
}

/**
 * 5. Action: Tambah Kelas Manual (Tanpa AI)
 */
export async function createManualClassAction(
  formData: FormData
): Promise<ActionResult<ConfirmClassResult>> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.sekolah_id) {
      return { success: false, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    const nama_kelas = formData.get("nama_kelas")?.toString()?.trim() || "";
    const tingkat_kelas = formData.get("tingkat_kelas")?.toString()?.trim() || "10";
    const mata_pelajaran = formData.get("mata_pelajaran")?.toString()?.trim() || "";
    const siswa_raw = formData.get("siswa_list")?.toString() || "";

    if (!nama_kelas || nama_kelas.length < 2) {
      return {
        success: false,
        error: "Nama kelas wajib diisi minimal 2 karakter (contoh: 10-A, X RPL 1).",
      };
    }
    if (!mata_pelajaran || mata_pelajaran.length < 2) {
      return {
        success: false,
        error:
          "Mata pelajaran wajib diisi minimal 2 karakter (contoh: Pemrograman Web, Matematika).",
      };
    }

    // Ekstraksi data siswa per baris (mendukung format NIS, Nama, dan Jenis Kelamin)
    const studentLines = siswa_raw
      .split("\n")
      .map((l) => l.trim())
      .filter((line) => line.length > 0 && !/^sep\s*=\s*[,;|\t]$/i.test(line));

    const siswa = studentLines.map((line) => {
      let nis: string | undefined = undefined;
      let nama = line;
      let jenis_kelamin: "L" | "P" = "L";

      const separator = ["\t", ";", "|", ","].find((sep) => line.includes(sep));
      if (separator) {
        const parts = line
          .split(separator)
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length >= 2) {
          if (/^[\w\-./]+$/.test(parts[0]) && !/\s{2,}/.test(parts[0])) {
            nis = parts[0];
            nama = parts[1];
            if (parts[2]) {
              const jkClean = parts[2].toUpperCase().charAt(0);
              if (jkClean === "P" || jkClean === "W") jenis_kelamin = "P";
            }
          } else {
            nama = parts[0];
            nis = parts[1];
          }
        }
      } else if (line.includes(" - ")) {
        const parts = line
          .split(" - ")
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length >= 2) {
          nis = parts[0];
          nama = parts[1];
        }
      }

      return {
        nama_lengkap: nama,
        nis,
        jenis_kelamin,
      };
    });

    const result = await smartOnboardingService.confirmAndCreateClass(user.id, user.sekolah_id, {
      nama_kelas,
      tingkat_kelas,
      mata_pelajaran,
      siswa,
    });

    revalidatePath("/dashboard");
    revalidatePath("/kelas-saya");

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Gagal membuat kelas secara manual.",
    };
  }
}

/**
 * Opsi jadwal awal khusus guru mandiri. Akses dibatasi pada penugasan mengajar
 * milik guru yang sedang login, bukan pengelolaan master jadwal sekolah.
 */
export async function getTeacherInitialScheduleOptionsAction(
  rombelId: string,
  penugasanId?: string
): Promise<
  ActionResult<{
    rombelNama: string;
    mataPelajaran: string;
    isScheduleLocked?: boolean;
    slots: Array<{ id: string; nama: string; jam_mulai: string; jam_selesai: string }>;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user?.sekolah_id || user.peran_dasar !== "TEACHER") {
      return { success: false, error: "Akses setup jadwal hanya tersedia untuk guru." };
    }

    const { penugasan } = await getTeacherAssignmentForRombel(
      user.id,
      user.sekolah_id,
      rombelId,
      penugasanId
    );
    let slots = await timeSlotService.listTimeSlots(user.sekolah_id);
    if (!slots.length) {
      slots = await timeSlotService.seedDefaultTimeSlotsIfEmpty(
        user.id,
        user.peran_dasar,
        user.sekolah_id
      );
    }

    const tahunAjaran = await prisma.tahunAjaran.findFirst({
      where: { sekolah_id: user.sekolah_id, status: "AKTIF" },
      orderBy: { tanggal_mulai: "desc" },
    });

    const publishedVersion = tahunAjaran
      ? await prisma.versiJadwal.findFirst({
          where: {
            sekolah_id: user.sekolah_id,
            tahun_ajaran_id: tahunAjaran.id,
            status: "PUBLISHED",
          },
          select: { id: true },
        })
      : null;

    return {
      success: true,
      data: {
        rombelNama: penugasan.rombel.nama,
        mataPelajaran: penugasan.mata_pelajaran.nama,
        isScheduleLocked: !!publishedVersion,
        slots: slots
          .filter((slot) => slot.status_aktif && !slot.is_istirahat && !slot.is_upacara)
          .map((slot) => ({
            id: slot.id,
            nama: slot.nama,
            jam_mulai: slot.jam_mulai,
            jam_selesai: slot.jam_selesai,
          })),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyiapkan pilihan jadwal." };
  }
}

/** Membuat jadwal awal guru mandiri pada sekolah yang belum memiliki jadwal terpublikasi. */
export async function createTeacherInitialScheduleAction(input: {
  rombelId: string;
  penugasanId?: string;
  slotWaktuId?: string;
  hari?: HariBelajar;
  jam_mulai?: string;
  jam_selesai?: string;
  sessions?: Array<{
    hari: HariBelajar;
    jam_mulai: string;
    jam_selesai: string;
    label?: string;
  }>;
}): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.sekolah_id || user.peran_dasar !== "TEACHER") {
      return { success: false, error: "Akses setup jadwal hanya tersedia untuk guru." };
    }

    const sessions =
      input.sessions && input.sessions.length > 0
        ? input.sessions
        : input.hari && input.jam_mulai && input.jam_selesai
          ? [{ hari: input.hari, jam_mulai: input.jam_mulai, jam_selesai: input.jam_selesai }]
          : [];

    if (sessions.length === 0) {
      return { success: false, error: "Hari dan jam mengajar wajib dipilih." };
    }

    const { penugasan } = await getTeacherAssignmentForRombel(
      user.id,
      user.sekolah_id,
      input.rombelId,
      input.penugasanId
    );

    for (const session of sessions) {
      if (!HARI_BELAJAR.includes(session.hari)) {
        return { success: false, error: "Hari mengajar wajib dipilih." };
      }

      const jamMulai = session.jam_mulai.trim();
      const jamSelesai = session.jam_selesai.trim();
      if (
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(jamMulai) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(jamSelesai)
      ) {
        return { success: false, error: "Rentang jam mengajar tidak valid." };
      }
      if (jamMulai >= jamSelesai) {
        return { success: false, error: "Jam selesai harus lebih dari jam mulai." };
      }
    }

    let [tahunAjaran, semester] = await Promise.all([
      prisma.tahunAjaran.findFirst({
        where: { sekolah_id: user.sekolah_id, status: "AKTIF" },
        orderBy: { tanggal_mulai: "desc" },
      }),
      prisma.semester.findFirst({
        where: { sekolah_id: user.sekolah_id, status: "AKTIF" },
        orderBy: { tanggal_mulai: "desc" },
      }),
    ]);
    if (!tahunAjaran) {
      tahunAjaran = await prisma.tahunAjaran.create({
        data: {
          id: generateUlid(),
          sekolah_id: user.sekolah_id,
          nama: "2026/2027",
          kode: "TA-2026-2027",
          tanggal_mulai: new Date("2026-07-01"),
          tanggal_selesai: new Date("2027-06-30"),
          status: "AKTIF",
        },
      });
    }
    if (!semester) {
      semester = await prisma.semester.create({
        data: {
          id: generateUlid(),
          sekolah_id: user.sekolah_id,
          tahun_ajaran_id: tahunAjaran.id,
          kode: "GANJIL",
          nama: "Semester Ganjil",
          urutan: 1,
          tanggal_mulai: new Date("2026-07-01"),
          tanggal_selesai: new Date("2026-12-31"),
          status: "AKTIF",
        },
      });
    }

    const publishedVersion = await prisma.versiJadwal.findFirst({
      where: { sekolah_id: user.sekolah_id, tahun_ajaran_id: tahunAjaran.id, status: "PUBLISHED" },
      select: { id: true },
    });
    if (publishedVersion) {
      return {
        success: false,
        error:
          "Jadwal resmi sekolah sudah tersedia. Hubungi operator kurikulum untuk perubahan jadwal.",
      };
    }

    const versionName = "Jadwal Awal Guru Mandiri";
    const existingVersion = await prisma.versiJadwal.findFirst({
      where: {
        sekolah_id: user.sekolah_id,
        tahun_ajaran_id: tahunAjaran.id,
        nama: versionName,
        status: "DRAFT",
      },
    });
    let versionId = existingVersion?.id;
    if (!versionId) {
      const version = await scheduleService.createVersion(user.id, user.peran_dasar, {
        sekolah_id: user.sekolah_id,
        tahun_ajaran_id: tahunAjaran.id,
        semester_id: semester.id,
        nama: versionName,
        catatan: "Jadwal awal dari onboarding guru mandiri.",
      });
      versionId = version.id;
    }

    const existingEntries = await scheduleService.listEntriesByVersion(versionId, user.sekolah_id);
    if (existingEntries.some((entry) => entry.penugasan_mengajar_id !== penugasan.id)) {
      return { success: false, error: "Versi jadwal awal sudah berisi alokasi guru lain." };
    }

    for (const [index, session] of sessions.entries()) {
      const jamMulai = session.jam_mulai.trim();
      const jamSelesai = session.jam_selesai.trim();

      const slotExisting = await prisma.slotWaktu.findFirst({
        where: {
          sekolah_id: user.sekolah_id,
          jam_mulai: jamMulai,
          jam_selesai: jamSelesai,
          status_aktif: true,
          is_istirahat: false,
          is_upacara: false,
        },
        select: { id: true },
      });

      const slotId =
        slotExisting?.id ??
        (
          await timeSlotService.createTimeSlot(user.id, user.peran_dasar, {
            sekolah_id: user.sekolah_id,
            nama: session.label || `Jam Ke-${index + 1}`,
            kode: `MANUAL_${Date.now().toString().slice(-8)}_${index + 1}`,
            urutan: index + 1,
            jam_mulai: jamMulai,
            jam_selesai: jamSelesai,
            status_aktif: true,
          })
        ).id;

      await scheduleService.createScheduleEntry(user.id, user.peran_dasar, {
        sekolah_id: user.sekolah_id,
        versi_jadwal_id: versionId,
        rombel_id: input.rombelId,
        penugasan_mengajar_id: penugasan.id,
        slot_waktu_id: slotId,
        hari: session.hari,
      });
    }

    await scheduleService.publishVersion(
      user.id,
      user.peran_dasar,
      user.nama_lengkap,
      versionId,
      user.sekolah_id
    );

    revalidatePath("/dashboard");
    revalidatePath("/kelas-saya");
    revalidatePath("/jadwal-saya");
    revalidatePath("/sesi-pembelajaran");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyimpan jadwal awal." };
  }
}
