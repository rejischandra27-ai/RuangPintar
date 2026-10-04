"use server";

/**
 * Ruang Pintar — M11 Learning Server Actions
 */

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { requirePermission } from "@/shared/infrastructure/authorization/authz-guard";
import { learningService } from "@/modules/learning/application/learning-service";
import { LocalStorageAdapter } from "@/shared/infrastructure/storage/local-storage-adapter";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";

export interface LearningActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

function getSafeErrorMessage(error: any): string {
  if (error?.name?.includes("Error")) {
    return error.message;
  }
  return "Terjadi kesalahan saat memproses data pembelajaran.";
}

async function assertTeachingAssignmentBelongsToSchool(
  penugasanId: string,
  sekolahId: string,
  user: { id: string; peran_dasar: string }
): Promise<{ guruId: string }> {
  const penugasan = await prisma.penugasanMengajar.findFirst({
    where: { id: penugasanId, sekolah_id: sekolahId },
    select: { guru_id: true },
  });
  if (!penugasan) {
    throw new Error("Penugasan mengajar tidak ditemukan atau bukan milik sekolah aktif.");
  }

  if (user.peran_dasar === "TEACHER") {
    const teacher = await prisma.guru.findFirst({
      where: { pengguna_id: user.id, sekolah_id: sekolahId },
      select: { id: true },
    });
    if (!teacher || teacher.id !== penugasan.guru_id) {
      throw new Error("Akses ditolak: Anda bukan pengampu penugasan mengajar ini.");
    }
    return { guruId: teacher.id };
  }

  return { guruId: penugasan.guru_id };
}

// ==========================================
// LINGKUP MATERI (BAB)
// ==========================================

export async function createLingkupMateriAction(
  _prevState: any,
  formData: FormData
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    const penugasanId = formData.get("penugasan_mengajar_id") as string;
    await assertTeachingAssignmentBelongsToSchool(penugasanId, user.sekolah_id, user);

    const created = await learningService.createLingkupMateri(user.id, user.peran_dasar, {
      sekolah_id: user.sekolah_id,
      penugasan_mengajar_id: penugasanId,
      kode: (formData.get("kode") as string) || null,
      judul: formData.get("judul") as string,
      deskripsi: (formData.get("deskripsi") as string) || null,
      urutan: Number(formData.get("urutan")) || 1,
    });

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/kelas-saya");
    return {
      success: true,
      message: `BAB '${created.judul}' berhasil ditambahkan.`,
      data: created,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function updateLingkupMateriAction(
  _prevState: any,
  formData: FormData
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    const id = formData.get("id") as string;
    const penugasanId = formData.get("penugasan_mengajar_id") as string;

    const updated = await learningService.updateLingkupMateri(
      user.id,
      user.peran_dasar,
      id,
      user.sekolah_id,
      {
        kode: (formData.get("kode") as string) || null,
        judul: (formData.get("judul") as string) || undefined,
        deskripsi: (formData.get("deskripsi") as string) || null,
        urutan: formData.get("urutan") ? Number(formData.get("urutan")) : undefined,
        status: (formData.get("status") as any) || undefined,
      }
    );

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/kelas-saya");
    return {
      success: true,
      message: `BAB '${updated.judul}' berhasil diperbarui.`,
      data: updated,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function deleteLingkupMateriAction(
  id: string,
  penugasanId: string
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    await learningService.deleteLingkupMateri(user.id, user.peran_dasar, id, user.sekolah_id);

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/kelas-saya");
    return {
      success: true,
      message: "BAB berhasil dihapus.",
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

// ==========================================
// TUJUAN PEMBELAJARAN (TP)
// ==========================================

export async function createTujuanPembelajaranAction(
  _prevState: any,
  formData: FormData
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    const penugasanId = formData.get("penugasan_mengajar_id") as string;
    await assertTeachingAssignmentBelongsToSchool(penugasanId, user.sekolah_id, user);

    const lingkupMateriId = formData.get("lingkup_materi_id") as string;
    const lm = await prisma.lingkupMateri.findFirst({
      where: {
        id: lingkupMateriId,
        sekolah_id: user.sekolah_id,
        penugasan_mengajar_id: penugasanId,
      },
    });
    if (!lm) {
      return { success: false, message: "Lingkup materi tidak valid pada kelas ini." };
    }

    const created = await learningService.createTujuanPembelajaran(user.id, user.peran_dasar, {
      sekolah_id: user.sekolah_id,
      lingkup_materi_id: lingkupMateriId,
      kode: (formData.get("kode") as string) || null,
      deskripsi: formData.get("deskripsi") as string,
      urutan: Number(formData.get("urutan")) || 1,
    });

    revalidatePath(`/kelas-saya/${penugasanId}`);
    return {
      success: true,
      message: `Tujuan Pembelajaran berhasil ditambahkan.`,
      data: created,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function updateTujuanPembelajaranAction(
  _prevState: any,
  formData: FormData
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    const id = formData.get("id") as string;
    const penugasanId = formData.get("penugasan_mengajar_id") as string;

    const updated = await learningService.updateTujuanPembelajaran(
      user.id,
      user.peran_dasar,
      id,
      user.sekolah_id,
      {
        kode: (formData.get("kode") as string) || null,
        deskripsi: (formData.get("deskripsi") as string) || undefined,
        urutan: formData.get("urutan") ? Number(formData.get("urutan")) : undefined,
      }
    );

    revalidatePath(`/kelas-saya/${penugasanId}`);
    return {
      success: true,
      message: "Tujuan Pembelajaran berhasil diperbarui.",
      data: updated,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function deleteTujuanPembelajaranAction(
  id: string,
  penugasanId: string
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    await learningService.deleteTujuanPembelajaran(user.id, user.peran_dasar, id, user.sekolah_id);

    revalidatePath(`/kelas-saya/${penugasanId}`);
    return {
      success: true,
      message: "Tujuan Pembelajaran berhasil dihapus.",
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

// ==========================================
// MATERI PEMBELAJARAN
// ==========================================

export async function createMateriAction(
  _prevState: any,
  formData: FormData
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    const penugasanId = formData.get("penugasan_mengajar_id") as string;
    const { guruId } = await assertTeachingAssignmentBelongsToSchool(
      penugasanId,
      user.sekolah_id,
      user
    );

    let berkasId: string | null = (formData.get("berkas_id") as string) || null;
    const file = formData.get("file") as File | null;
    if (
      file &&
      typeof file === "object" &&
      file.size > 0 &&
      typeof file.arrayBuffer === "function"
    ) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const storage = new LocalStorageAdapter();
      const metadata = await storage.saveFile({
        sekolah_id: user.sekolah_id,
        nama_file_asli: file.name,
        mime_type: file.type || "application/octet-stream",
        content: buffer,
      });
      berkasId = metadata.id;
    }

    const created = await learningService.createMateri(user.id, user.peran_dasar, {
      sekolah_id: user.sekolah_id,
      guru_id: guruId,
      penugasan_mengajar_id: penugasanId,
      lingkup_materi_id: (formData.get("lingkup_materi_id") as string) || null,
      mata_pelajaran_id: (formData.get("mata_pelajaran_id") as string) || null,
      judul: formData.get("judul") as string,
      deskripsi: (formData.get("deskripsi") as string) || null,
      tipe_konten: (formData.get("tipe_konten") as any) || "DOKUMEN",
      konten_teks: (formData.get("konten_teks") as string) || null,
      tautan_url: (formData.get("tautan_url") as string) || null,
      berkas_id: berkasId,
      publish_langsung: formData.get("publish_langsung") !== "false",
    });

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/kelas-saya");
    return {
      success: true,
      message: `Materi '${created.judul}' berhasil diterbitkan.`,
      data: created,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function updateMateriAction(
  _prevState: any,
  formData: FormData
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    const id = formData.get("id") as string;
    const penugasanId = formData.get("penugasan_mengajar_id") as string;

    let berkasId: string | null = (formData.get("existing_berkas_id") as string) || null;
    const file = formData.get("file") as File | null;
    if (
      file &&
      typeof file === "object" &&
      file.size > 0 &&
      typeof file.arrayBuffer === "function"
    ) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const storage = new LocalStorageAdapter();
      const metadata = await storage.saveFile({
        sekolah_id: user.sekolah_id,
        nama_file_asli: file.name,
        mime_type: file.type || "application/octet-stream",
        content: buffer,
      });
      berkasId = metadata.id;
    }

    const updated = await learningService.updateMateri(
      user.id,
      user.peran_dasar,
      id,
      user.sekolah_id,
      {
        lingkup_materi_id: (formData.get("lingkup_materi_id") as string) || null,
        judul: formData.get("judul") as string,
        deskripsi: (formData.get("deskripsi") as string) || null,
        tipe_konten: (formData.get("tipe_konten") as any) || "DOKUMEN",
        konten_teks: (formData.get("konten_teks") as string) || null,
        tautan_url: (formData.get("tautan_url") as string) || null,
        berkas_id: berkasId,
      }
    );

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/kelas-saya");
    return {
      success: true,
      message: `Materi '${updated.judul}' berhasil diperbarui.`,
      data: updated,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function deleteMateriAction(
  id: string,
  penugasanId: string
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    await learningService.deleteMateri(user.id, user.peran_dasar, id, user.sekolah_id);

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/kelas-saya");
    return {
      success: true,
      message: "Materi berhasil dihapus.",
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

// ==========================================
// TUGAS PEMBELAJARAN
// ==========================================

export async function createTugasAction(
  _prevState: any,
  formData: FormData
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.assignment.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    const penugasanId = formData.get("penugasan_mengajar_id") as string;
    const { guruId } = await assertTeachingAssignmentBelongsToSchool(
      penugasanId,
      user.sekolah_id,
      user
    );

    const created = await learningService.createTugas(user.id, user.peran_dasar, {
      sekolah_id: user.sekolah_id,
      guru_id: guruId,
      penugasan_mengajar_id: penugasanId,
      lingkup_materi_id: (formData.get("lingkup_materi_id") as string) || null,
      mata_pelajaran_id: (formData.get("mata_pelajaran_id") as string) || null,
      judul: formData.get("judul") as string,
      petunjuk: formData.get("petunjuk") as string,
      tipe_penyerahan: (formData.get("tipe_penyerahan") as any) || "FILE",
      berkas_id: (formData.get("berkas_id") as string) || null,
      tanggal_mulai: (formData.get("tanggal_mulai") as string) || new Date(),
      batas_waktu: (formData.get("batas_waktu") as string) || null,
      izinkan_terlambat: formData.get("izinkan_terlambat") === "true",
    });

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/kelas-saya");
    return {
      success: true,
      message: `Tugas '${created.judul}' berhasil diterbitkan ke kelas.`,
      data: created,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function deleteTugasAction(
  id: string,
  penugasanId: string
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.assignment.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    await learningService.deleteTugas(user.id, user.peran_dasar, id, user.sekolah_id);

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/kelas-saya");
    return {
      success: true,
      message: "Tugas berhasil dihapus.",
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

// ==========================================
// ADMINISTRASI PEMBELAJARAN (JURNAL KBM)
// ==========================================

export async function createAdministrasiAction(
  _prevState: any,
  formData: FormData
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    const penugasanId = formData.get("penugasan_mengajar_id") as string;
    const { guruId } = await assertTeachingAssignmentBelongsToSchool(
      penugasanId,
      user.sekolah_id,
      user
    );
    const tpIdsRaw = formData.getAll("tp_ids") as string[];

    const created = await learningService.createAdministrasi(user.id, user.peran_dasar, {
      sekolah_id: user.sekolah_id,
      penugasan_mengajar_id: penugasanId,
      sesi_kelas_aktual_id: (formData.get("sesi_kelas_aktual_id") as string) || null,
      guru_id: guruId,
      tanggal: (formData.get("tanggal") as string) || new Date(),
      pertemuan_ke: Number(formData.get("pertemuan_ke")) || 1,
      materi_disampaikan: formData.get("materi_disampaikan") as string,
      kegiatan_pembelajaran: (formData.get("kegiatan_pembelajaran") as string) || null,
      catatan_refleksi: (formData.get("catatan_refleksi") as string) || null,
      status_realisasi: (formData.get("status_realisasi") as any) || "TERLAKSANA",
      tp_ids: tpIdsRaw.filter(Boolean),
    });

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/kelas-saya");
    return {
      success: true,
      message: `Jurnal KBM Pertemuan ke-${created.pertemuan_ke} berhasil disimpan.`,
      data: created,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function updateAdministrasiAction(
  _prevState: any,
  formData: FormData
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    const id = formData.get("id") as string;
    const penugasanId = formData.get("penugasan_mengajar_id") as string;
    const tpIdsRaw = formData.getAll("tp_ids") as string[];

    const updated = await learningService.updateAdministrasi(
      user.id,
      user.peran_dasar,
      id,
      user.sekolah_id,
      {
        tanggal: (formData.get("tanggal") as string) || new Date(),
        pertemuan_ke: Number(formData.get("pertemuan_ke")) || 1,
        materi_disampaikan: formData.get("materi_disampaikan") as string,
        kegiatan_pembelajaran: (formData.get("kegiatan_pembelajaran") as string) || null,
        catatan_refleksi: (formData.get("catatan_refleksi") as string) || null,
        status_realisasi: (formData.get("status_realisasi") as any) || "TERLAKSANA",
        tp_ids: tpIdsRaw.filter(Boolean),
      }
    );

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/kelas-saya");
    return {
      success: true,
      message: `Jurnal KBM Pertemuan ke-${updated.pertemuan_ke} berhasil diperbarui.`,
      data: updated,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function deleteAdministrasiAction(
  id: string,
  penugasanId: string
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    await learningService.deleteAdministrasi(user.id, user.peran_dasar, id, user.sekolah_id);

    revalidatePath(`/kelas-saya/${penugasanId}`);
    revalidatePath("/kelas-saya");
    return {
      success: true,
      message: "Catatan jurnal KBM berhasil dihapus.",
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

// ==========================================
// PUSAT KURIKULUM & MULTI-ROMBEL BROADCAST
// ==========================================

export async function createBabMultiRombelAction(
  _prevState: any,
  formData: FormData
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    const penugasanIdsRaw = formData.get("penugasan_ids") as string;
    let penugasanIds: string[] = [];
    try {
      penugasanIds = JSON.parse(penugasanIdsRaw || "[]");
    } catch {
      penugasanIds = [];
    }

    if (!penugasanIds.length) {
      return { success: false, message: "Pilih minimal satu rombel target penerapan." };
    }

    const kode = (formData.get("kode") as string) || null;
    const judul = (formData.get("judul") as string)?.trim();
    const deskripsi = (formData.get("deskripsi") as string) || null;
    const urutan = Number(formData.get("urutan")) || 1;

    if (!judul) {
      return { success: false, message: "Judul BAB / Lingkup Materi wajib diisi." };
    }

    let createdCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const penugasanId of penugasanIds) {
        await assertTeachingAssignmentBelongsToSchool(penugasanId, user.sekolah_id!, user);

        const existing = await tx.lingkupMateri.findFirst({
          where: {
            penugasan_mengajar_id: penugasanId,
            sekolah_id: user.sekolah_id!,
            judul: { equals: judul },
          },
        });

        if (!existing) {
          await tx.lingkupMateri.create({
            data: {
              id: generateUlid(),
              sekolah_id: user.sekolah_id!,
              penugasan_mengajar_id: penugasanId,
              kode,
              judul,
              deskripsi,
              urutan,
              status: "AKTIF",
            },
          });
          createdCount++;
        } else {
          // Update data jika sudah ada agar data tetap sinkron
          await tx.lingkupMateri.update({
            where: { id: existing.id },
            data: {
              kode: kode || existing.kode,
              deskripsi: deskripsi || existing.deskripsi,
              urutan: urutan || existing.urutan,
            },
          });
        }
      }
    });

    revalidatePath("/kelas-saya");
    for (const pid of penugasanIds) {
      revalidatePath(`/kelas-saya/${pid}`);
    }

    return {
      success: true,
      message: `BAB '${judul}' berhasil diterapkan ke ${penugasanIds.length} rombel target (${createdCount} baru).`,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function createMateriMultiRombelAction(
  _prevState: any,
  formData: FormData
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    const penugasanIdsRaw = formData.get("penugasan_ids") as string;
    let penugasanIds: string[] = [];
    try {
      penugasanIds = JSON.parse(penugasanIdsRaw || "[]");
    } catch {
      penugasanIds = [];
    }

    if (!penugasanIds.length) {
      return { success: false, message: "Pilih minimal satu rombel target penerima." };
    }

    const mataPelajaranId = (formData.get("mata_pelajaran_id") as string) || null;
    const babJudul = (formData.get("bab_judul") as string) || null;
    const judul = (formData.get("judul") as string)?.trim();
    const deskripsi = (formData.get("deskripsi") as string) || null;
    const tipeKonten = (formData.get("tipe_konten") as any) || "DOKUMEN";
    const kontenTeks = (formData.get("konten_teks") as string) || null;
    const tautanUrl = (formData.get("tautan_url") as string) || null;

    if (!judul) {
      return { success: false, message: "Judul materi pembelajaran wajib diisi." };
    }

    const { guruId } = await assertTeachingAssignmentBelongsToSchool(
      penugasanIds[0],
      user.sekolah_id,
      user
    );

    let berkasId: string | null = null;
    const file = formData.get("file") as File | null;
    if (
      file &&
      typeof file === "object" &&
      file.size > 0 &&
      typeof file.arrayBuffer === "function"
    ) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const storage = new LocalStorageAdapter();
      const metadata = await storage.saveFile({
        sekolah_id: user.sekolah_id,
        nama_file_asli: file.name,
        mime_type: file.type || "application/octet-stream",
        content: buffer,
      });
      berkasId = metadata.id;
    }

    const materiId = generateUlid();

    await prisma.$transaction(async (tx) => {
      // 1. Simpan 1 master definisi materi pembelajaran
      await tx.materiPembelajaran.create({
        data: {
          id: materiId,
          sekolah_id: user.sekolah_id!,
          guru_id: guruId,
          mata_pelajaran_id: mataPelajaranId,
          judul,
          deskripsi,
          tipe_konten: tipeKonten,
          konten_teks: kontenTeks,
          tautan_url: tautanUrl,
          berkas_id: berkasId,
          status: "PUBLISHED",
        },
      });

      // 2. Terbitkan ke setiap penugasan mengajar rombel yang dipilih
      let primaryLmId: string | null = null;
      for (const penugasanId of penugasanIds) {
        await tx.publikasiMateri.create({
          data: {
            id: generateUlid(),
            sekolah_id: user.sekolah_id!,
            materi_id: materiId,
            penugasan_mengajar_id: penugasanId,
            status: "DITERBITKAN",
          },
        });

        // Sambungkan ke LingkupMateri (BAB) di rombel jika dipilih
        if (babJudul) {
          let lm = await tx.lingkupMateri.findFirst({
            where: {
              penugasan_mengajar_id: penugasanId,
              sekolah_id: user.sekolah_id!,
              judul: babJudul,
            },
          });

          // JIKA BELUM ADA DI ROMBEL TARGET INI, BUAT / SINKRONKAN OTOMATIS!
          if (!lm) {
            const templateLm = await tx.lingkupMateri.findFirst({
              where: {
                sekolah_id: user.sekolah_id!,
                judul: babJudul,
              },
              include: {
                tujuan_pembelajaran: true,
              },
            });

            const newLmId = generateUlid();
            lm = await tx.lingkupMateri.create({
              data: {
                id: newLmId,
                sekolah_id: user.sekolah_id!,
                penugasan_mengajar_id: penugasanId,
                kode: templateLm?.kode || null,
                judul: babJudul,
                deskripsi: templateLm?.deskripsi || null,
                urutan: templateLm?.urutan || 1,
                status: "AKTIF",
              },
            });

            // Salin TP jika ada di template BAB
            if (templateLm?.tujuan_pembelajaran && templateLm.tujuan_pembelajaran.length > 0) {
              for (const tp of templateLm.tujuan_pembelajaran) {
                await tx.tujuanPembelajaran.create({
                  data: {
                    id: generateUlid(),
                    sekolah_id: user.sekolah_id!,
                    lingkup_materi_id: newLmId,
                    kode: tp.kode,
                    deskripsi: tp.deskripsi,
                    urutan: tp.urutan,
                    status: tp.status,
                  },
                });
              }
            }
          }

          if (lm && !primaryLmId) {
            primaryLmId = lm.id;
          }
        }
      }

      if (primaryLmId) {
        await tx.materiPembelajaran.update({
          where: { id: materiId },
          data: { lingkup_materi_id: primaryLmId },
        });
      }
    });

    revalidatePath("/kelas-saya");
    for (const pid of penugasanIds) {
      revalidatePath(`/kelas-saya/${pid}`);
    }

    return {
      success: true,
      message: `Materi '${judul}' berhasil diterbitkan ke ${penugasanIds.length} rombel secara bersamaan.`,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}

export async function getCurriculumSummaryAction(mataPelajaranId?: string): Promise<{
  success: boolean;
  babs: Array<{ id: string; kode?: string | null; judul: string; deskripsi?: string | null }>;
  materiCount: number;
}> {
  try {
    const user = await requireAuth();
    if (!user.sekolah_id) return { success: false, babs: [], materiCount: 0 };

    const guru = await prisma.guru.findFirst({
      where: { pengguna_id: user.id, sekolah_id: user.sekolah_id },
    });
    if (!guru) return { success: false, babs: [], materiCount: 0 };

    const allBabs = await prisma.lingkupMateri.findMany({
      where: {
        sekolah_id: user.sekolah_id,
        penugasan_mengajar: {
          guru_id: guru.id,
          ...(mataPelajaranId ? { mata_pelajaran_id: mataPelajaranId } : {}),
        },
      },
      select: {
        id: true,
        kode: true,
        judul: true,
        deskripsi: true,
      },
      orderBy: { urutan: "asc" },
    });

    const uniqueBabsMap = new Map<string, (typeof allBabs)[0]>();
    for (const b of allBabs) {
      const key = `${b.kode || ""}-${b.judul}`;
      if (!uniqueBabsMap.has(key)) {
        uniqueBabsMap.set(key, b);
      }
    }

    const materiCount = await prisma.materiPembelajaran.count({
      where: {
        sekolah_id: user.sekolah_id,
        guru_id: guru.id,
        ...(mataPelajaranId ? { mata_pelajaran_id: mataPelajaranId } : {}),
      },
    });

    return {
      success: true,
      babs: Array.from(uniqueBabsMap.values()),
      materiCount,
    };
  } catch {
    return { success: false, babs: [], materiCount: 0 };
  }
}

/**
 * Sinkronisasi Kurikulum (Semua BAB & TP) ke Seluruh Rombel Paralel Pengampu
 */
export async function syncCurriculumToAllRombelsAction(
  mataPelajaranId: string,
  targetPenugasanIds: string[]
): Promise<LearningActionResult> {
  try {
    const user = await requireAuth();
    await requirePermission("learning.material.manage");
    if (!user.sekolah_id) return { success: false, message: "Konteks sekolah tidak valid." };

    if (!targetPenugasanIds || targetPenugasanIds.length === 0) {
      return { success: false, message: "Pilih minimal satu rombel target." };
    }

    const guru = await prisma.guru.findFirst({
      where: { pengguna_id: user.id, sekolah_id: user.sekolah_id },
    });
    if (!guru) return { success: false, message: "Data guru tidak ditemukan." };

    // Ambil seluruh master BAB unik dari guru untuk mapel ini
    const masterBabs = await prisma.lingkupMateri.findMany({
      where: {
        sekolah_id: user.sekolah_id,
        penugasan_mengajar: {
          guru_id: guru.id,
          mata_pelajaran_id: mataPelajaranId,
        },
      },
      include: {
        tujuan_pembelajaran: true,
      },
      orderBy: { urutan: "asc" },
    });

    const uniqueMasterBabsMap = new Map<string, (typeof masterBabs)[0]>();
    for (const b of masterBabs) {
      if (!uniqueMasterBabsMap.has(b.judul)) {
        uniqueMasterBabsMap.set(b.judul, b);
      }
    }

    if (uniqueMasterBabsMap.size === 0) {
      return { success: false, message: "Belum ada BAB yang dibuat untuk disinkronkan." };
    }

    let syncedBabCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const penugasanId of targetPenugasanIds) {
        for (const masterBab of uniqueMasterBabsMap.values()) {
          const lm = await tx.lingkupMateri.findFirst({
            where: {
              penugasan_mengajar_id: penugasanId,
              sekolah_id: user.sekolah_id!,
              judul: masterBab.judul,
            },
          });

          if (!lm) {
            const newLmId = generateUlid();
            await tx.lingkupMateri.create({
              data: {
                id: newLmId,
                sekolah_id: user.sekolah_id!,
                penugasan_mengajar_id: penugasanId,
                kode: masterBab.kode,
                judul: masterBab.judul,
                deskripsi: masterBab.deskripsi,
                urutan: masterBab.urutan,
                status: "AKTIF",
              },
            });
            syncedBabCount++;

            for (const tp of masterBab.tujuan_pembelajaran) {
              await tx.tujuanPembelajaran.create({
                data: {
                  id: generateUlid(),
                  sekolah_id: user.sekolah_id!,
                  lingkup_materi_id: newLmId,
                  kode: tp.kode,
                  deskripsi: tp.deskripsi,
                  urutan: tp.urutan,
                  status: tp.status,
                },
              });
            }
          }
        }
      }
    });

    revalidatePath("/kelas-saya");
    for (const pid of targetPenugasanIds) {
      revalidatePath(`/kelas-saya/${pid}`);
    }

    return {
      success: true,
      message: `Berhasil menyinkronkan seluruh kurikulum ke ${targetPenugasanIds.length} rombel target (${syncedBabCount} BAB baru diterapkan).`,
    };
  } catch (err) {
    return { success: false, message: getSafeErrorMessage(err) };
  }
}
