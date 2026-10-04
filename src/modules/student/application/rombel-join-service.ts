/**
 * Ruang Pintar — Self-Service Tenant Onboarding & Rombel Join Codes Application Service (Stage 15)
 *
 * Mengelola siklus hidup kode gabung rombel, validasi link undangan, dan alur pendaftaran siswa mandiri.
 */

import { prisma } from "@/shared/infrastructure/database/prisma";
import { generateUlid } from "@/shared/lib/ulid";
import { recordAuditEvent } from "@/shared/infrastructure/audit/audit-logger";
import {
  RombelJoinCodeDTO,
  RombelJoinPreviewDTO,
  JoinRombelResultDTO,
  RombelJoinConfigPayload,
  JoinCodeNotFoundError,
  JoinCodeInactiveError,
  JoinCodeExpiredError,
  CrossTenantJoinError,
  DuplicateJoinError,
  RombelCapacityFullError,
  StudentProfileNotFoundError,
} from "../domain/rombel-join-types";

export class RombelJoinService {
  /**
   * Helper untuk membentuk format kode gabung kanonik: <NAMA_ROMBEL_CLEAN>-<SUFFIX>
   * Contoh: XTO1-2027, TJKT1-ABCD, DKV2-9KLM
   */
  generateCode(rombelNama: string): string {
    const cleanPrefix =
      rombelNama
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6) || "RBL";
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Tanpa karakter membingungkan (O, 0, I, 1)
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${cleanPrefix}-${suffix}`;
  }

  /**
   * Mengambil kode gabung aktif untuk rombel tertentu atau membuatnya jika belum ada.
   */
  async getOrCreateJoinCode(rombelId: string, sekolahId: string): Promise<RombelJoinCodeDTO> {
    const rombel = await prisma.rombel.findFirst({
      where: { id: rombelId, sekolah_id: sekolahId },
    });

    if (!rombel) {
      throw new Error(`Rombel dengan ID '${rombelId}' tidak ditemukan di sekolah ini.`);
    }

    const configKey = `join_code.config.${rombelId}`;
    const existingConfig = await prisma.konfigurasiSistem.findFirst({
      where: { sekolah_id: sekolahId, kunci: configKey },
    });

    let code = rombel.kode;
    let isActive = true;
    let expiresAt: string | null = null;
    let updatedAt = new Date().toISOString();

    if (existingConfig) {
      try {
        const parsed = JSON.parse(existingConfig.nilai) as RombelJoinConfigPayload;
        code = parsed.code || code;
        isActive = parsed.is_active ?? true;
        expiresAt = parsed.expires_at ?? null;
        updatedAt = parsed.updated_at || existingConfig.updated_at.toISOString();
      } catch {
        // Fallback jika json rusak
      }
    }

    // Jika belum memiliki kode atau belum terkonfigurasi, buat baru
    if (!code || !existingConfig) {
      code = this.generateCode(rombel.nama);
      const now = new Date();
      const payload: RombelJoinConfigPayload = {
        code,
        is_active: true,
        expires_at: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      await prisma.$transaction(async (tx) => {
        // 1. Simpan di Rombel.kode
        await tx.rombel.update({
          where: { id: rombelId },
          data: { kode: code },
        });

        // 2. Simpan konfigurasi rombel
        await tx.konfigurasiSistem.upsert({
          where: {
            sekolah_id_kunci: {
              sekolah_id: sekolahId,
              kunci: configKey,
            },
          },
          create: {
            id: generateUlid(),
            sekolah_id: sekolahId,
            kunci: configKey,
            nilai: JSON.stringify(payload),
            kategori: "AKADEMIK",
            deskripsi: `Konfigurasi kode gabung mandiri untuk rombel ${rombel.nama}`,
          },
          update: {
            nilai: JSON.stringify(payload),
            updated_at: now,
          },
        });

        // 3. Simpan reverse lookup global untuk pencarian cepat
        await tx.konfigurasiSistem.upsert({
          where: {
            sekolah_id_kunci: {
              sekolah_id: sekolahId,
              kunci: `join_code.lookup.${code}`,
            },
          },
          create: {
            id: generateUlid(),
            sekolah_id: sekolahId,
            kunci: `join_code.lookup.${code}`,
            nilai: JSON.stringify({ rombel_id: rombelId, sekolah_id: sekolahId }),
            kategori: "AKADEMIK",
          },
          update: {
            nilai: JSON.stringify({ rombel_id: rombelId, sekolah_id: sekolahId }),
            updated_at: now,
          },
        });
      });
    }

    const totalSiswa = await prisma.penempatanRombel.count({
      where: { rombel_id: rombelId, status: "AKTIF" },
    });

    return {
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      sekolahId: rombel.sekolah_id,
      code,
      isActive,
      expiresAt,
      shareLink: `/join/${code}`,
      totalSiswa,
      kapasitas: rombel.kapasitas,
      updatedAt,
    };
  }

  /**
   * Melakukan regenerasi kode gabung rombel. Kode lama langsung tidak berlaku.
   */
  async regenerateJoinCode(
    rombelId: string,
    sekolahId: string,
    actorId: string,
    actorRole: string
  ): Promise<RombelJoinCodeDTO> {
    const rombel = await prisma.rombel.findFirst({
      where: { id: rombelId, sekolah_id: sekolahId },
    });

    if (!rombel) {
      throw new Error(`Rombel dengan ID '${rombelId}' tidak ditemukan di sekolah ini.`);
    }

    const oldCode = rombel.kode;
    const newCode = this.generateCode(rombel.nama);
    const now = new Date();
    const configKey = `join_code.config.${rombelId}`;

    const payload: RombelJoinConfigPayload = {
      code: newCode,
      is_active: true,
      expires_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    await prisma.$transaction(async (tx) => {
      // 1. Perbarui rombel.kode
      await tx.rombel.update({
        where: { id: rombelId },
        data: { kode: newCode },
      });

      // 2. Perbarui konfigurasi kode rombel
      await tx.konfigurasiSistem.upsert({
        where: {
          sekolah_id_kunci: {
            sekolah_id: sekolahId,
            kunci: configKey,
          },
        },
        create: {
          id: generateUlid(),
          sekolah_id: sekolahId,
          kunci: configKey,
          nilai: JSON.stringify(payload),
          kategori: "AKADEMIK",
          deskripsi: `Konfigurasi kode gabung mandiri untuk rombel ${rombel.nama}`,
        },
        update: {
          nilai: JSON.stringify(payload),
          updated_at: now,
        },
      });

      // 3. Hapus lookup kode lama jika ada
      if (oldCode) {
        await tx.konfigurasiSistem.deleteMany({
          where: { sekolah_id: sekolahId, kunci: `join_code.lookup.${oldCode}` },
        });
      }

      // 4. Buat lookup kode baru
      await tx.konfigurasiSistem.upsert({
        where: {
          sekolah_id_kunci: {
            sekolah_id: sekolahId,
            kunci: `join_code.lookup.${newCode}`,
          },
        },
        create: {
          id: generateUlid(),
          sekolah_id: sekolahId,
          kunci: `join_code.lookup.${newCode}`,
          nilai: JSON.stringify({ rombel_id: rombelId, sekolah_id: sekolahId }),
          kategori: "AKADEMIK",
        },
        update: {
          nilai: JSON.stringify({ rombel_id: rombelId, sekolah_id: sekolahId }),
          updated_at: now,
        },
      });

      // 5. Audit Log
      await recordAuditEvent(
        {
          sekolah_id: sekolahId,
          aktor_id: actorId,
          aktor_role: actorRole,
          aksi: "REGENERATE_ROMBEL_JOIN_CODE",
          tipe_sumber: "Rombel",
          id_sumber: rombelId,
          payload_sebelum: { old_code: oldCode },
          payload_sesudah: { new_code: newCode, rombel_nama: rombel.nama },
        },
        tx
      );
    });

    const totalSiswa = await prisma.penempatanRombel.count({
      where: { rombel_id: rombelId, status: "AKTIF" },
    });

    return {
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      sekolahId: rombel.sekolah_id,
      code: newCode,
      isActive: true,
      expiresAt: null,
      shareLink: `/join/${newCode}`,
      totalSiswa,
      kapasitas: rombel.kapasitas,
      updatedAt: now.toISOString(),
    };
  }

  /**
   * Mengaktifkan atau menonaktifkan kode gabung rombel.
   */
  async toggleJoinCodeActive(
    rombelId: string,
    sekolahId: string,
    isActive: boolean,
    actorId: string,
    actorRole: string
  ): Promise<RombelJoinCodeDTO> {
    const rombel = await prisma.rombel.findFirst({
      where: { id: rombelId, sekolah_id: sekolahId },
    });

    if (!rombel) {
      throw new Error(`Rombel dengan ID '${rombelId}' tidak ditemukan di sekolah ini.`);
    }

    const configKey = `join_code.config.${rombelId}`;
    const existingConfig = await prisma.konfigurasiSistem.findFirst({
      where: { sekolah_id: sekolahId, kunci: configKey },
    });

    const now = new Date();
    let code = rombel.kode || this.generateCode(rombel.nama);
    let expiresAt: string | null = null;

    if (existingConfig) {
      try {
        const parsed = JSON.parse(existingConfig.nilai) as RombelJoinConfigPayload;
        code = parsed.code || code;
        expiresAt = parsed.expires_at ?? null;
      } catch {
        // Fallback
      }
    }

    const payload: RombelJoinConfigPayload = {
      code,
      is_active: isActive,
      expires_at: expiresAt,
      created_at: existingConfig ? existingConfig.created_at.toISOString() : now.toISOString(),
      updated_at: now.toISOString(),
    };

    await prisma.$transaction(async (tx) => {
      await tx.konfigurasiSistem.upsert({
        where: {
          sekolah_id_kunci: {
            sekolah_id: sekolahId,
            kunci: configKey,
          },
        },
        create: {
          id: generateUlid(),
          sekolah_id: sekolahId,
          kunci: configKey,
          nilai: JSON.stringify(payload),
          kategori: "AKADEMIK",
        },
        update: {
          nilai: JSON.stringify(payload),
          updated_at: now,
        },
      });

      await recordAuditEvent(
        {
          sekolah_id: sekolahId,
          aktor_id: actorId,
          aktor_role: actorRole,
          aksi: "TOGGLE_ROMBEL_JOIN_CODE",
          tipe_sumber: "Rombel",
          id_sumber: rombelId,
          payload_sesudah: { code, is_active: isActive, rombel_nama: rombel.nama },
        },
        tx
      );
    });

    const totalSiswa = await prisma.penempatanRombel.count({
      where: { rombel_id: rombelId, status: "AKTIF" },
    });

    return {
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      sekolahId: rombel.sekolah_id,
      code,
      isActive,
      expiresAt,
      shareLink: `/join/${code}`,
      totalSiswa,
      kapasitas: rombel.kapasitas,
      updatedAt: now.toISOString(),
    };
  }

  /**
   * Melakukan validasi kode dan mengembalikan pratinjau informasi rombel sebelum konfirmasi bergabung.
   */
  async previewJoinCode(
    rawCode: string,
    currentSekolahId?: string | null
  ): Promise<RombelJoinPreviewDTO> {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      throw new JoinCodeNotFoundError(rawCode);
    }

    // 1. Cari rombel berdasarkan Rombel.kode
    let rombel = await prisma.rombel.findFirst({
      where: { kode: code },
      include: {
        sekolah: true,
        tingkat: true,
        tahun_ajaran: true,
        program: true,
        penugasan_wali: {
          where: { status: "AKTIF" },
          include: { guru: true },
        },
      },
    });

    // 2. Jika tidak ditemukan langsung, cari melalui lookup table KonfigurasiSistem
    if (!rombel) {
      const lookup = await prisma.konfigurasiSistem.findFirst({
        where: { kunci: `join_code.lookup.${code}` },
      });
      if (lookup) {
        try {
          const parsed = JSON.parse(lookup.nilai) as { rombel_id: string; sekolah_id: string };
          rombel = await prisma.rombel.findFirst({
            where: { id: parsed.rombel_id },
            include: {
              sekolah: true,
              tingkat: true,
              tahun_ajaran: true,
              program: true,
              penugasan_wali: {
                where: { status: "AKTIF" },
                include: { guru: true },
              },
            },
          });
        } catch {
          // Fallback
        }
      }
    }

    if (!rombel) {
      throw new JoinCodeNotFoundError(code);
    }

    // 3. Validasi status keaktifan & kedaluwarsa dari KonfigurasiSistem
    const configKey = `join_code.config.${rombel.id}`;
    const config = await prisma.konfigurasiSistem.findFirst({
      where: { sekolah_id: rombel.sekolah_id, kunci: configKey },
    });

    let isActive = true;
    let expiresAt: string | null = null;
    if (config) {
      try {
        const parsed = JSON.parse(config.nilai) as RombelJoinConfigPayload;
        isActive = parsed.is_active ?? true;
        expiresAt = parsed.expires_at ?? null;
      } catch {
        // Fallback
      }
    }

    if (!isActive) {
      throw new JoinCodeInactiveError(code);
    }

    if (expiresAt && new Date(expiresAt) <= new Date()) {
      throw new JoinCodeExpiredError(code);
    }

    // 4. Validasi batas isolasi tenant
    if (currentSekolahId && rombel.sekolah_id !== currentSekolahId) {
      throw new CrossTenantJoinError(
        `Kode ini milik ${rombel.sekolah.nama}. Anda saat ini terhubung ke institusi sekolah yang berbeda.`
      );
    }

    const totalSiswa = await prisma.penempatanRombel.count({
      where: { rombel_id: rombel.id, status: "AKTIF" },
    });

    const sisaKuota = Math.max(0, rombel.kapasitas - totalSiswa);
    const activeHomeroom = rombel.penugasan_wali?.[0]?.guru?.nama_lengkap ?? null;

    return {
      code,
      rombelId: rombel.id,
      rombelNama: rombel.nama,
      sekolahId: rombel.sekolah_id,
      namaSekolah: rombel.sekolah.nama,
      tingkat: rombel.tingkat?.nama || "Tingkat Kelas",
      tahunAjaran: rombel.tahun_ajaran.nama,
      programKeahlian: rombel.program?.nama ?? null,
      waliKelas: activeHomeroom,
      totalSiswa,
      kapasitas: rombel.kapasitas,
      sisaKuota,
      isActive,
    };
  }

  /**
   * Eksekusi siswa bergabung ke rombel menggunakan kode secara mandiri.
   * Atomic All-or-Nothing Transaction (Enforces Invariant: Student ≠ Enrollment ≠ Rombel Placement).
   */
  async joinRombelWithCode(rawCode: string, userId: string): Promise<JoinRombelResultDTO> {
    const code = rawCode.trim().toUpperCase();

    // 1. Ambil data Pengguna & Siswa
    const user = await prisma.pengguna.findUnique({
      where: { id: userId },
      include: {
        siswa: true,
      },
    });

    if (!user) {
      throw new Error("Pengguna tidak ditemukan.");
    }

    // 2. Dapatkan entity siswa
    let student = user.siswa;
    if (!student) {
      // Jika akun siswa dibuat via auth tanpa relasi siswa terpasang, coba cari dari email/username
      student = await prisma.siswa.findFirst({
        where: { pengguna_id: user.id },
      });
    }

    if (!student) {
      throw new StudentProfileNotFoundError();
    }

    // 3. Validasi kode dan pratinjau rombel
    const preview = await this.previewJoinCode(code, student.sekolah_id);

    // 4. Verifikasi kapasitas rombel
    if (preview.sisaKuota <= 0) {
      throw new RombelCapacityFullError(preview.kapasitas);
    }

    // 5. Verifikasi Duplicate Join (apakah siswa sudah ada di rombel ini dan aktif)
    const existingPlacementInSameRombel = await prisma.penempatanRombel.findFirst({
      where: {
        rombel_id: preview.rombelId,
        keikutsertaan: {
          siswa_id: student.id,
        },
        status: "AKTIF",
      },
    });

    if (existingPlacementInSameRombel) {
      throw new DuplicateJoinError(`Anda sudah terdaftar aktif di rombel ${preview.rombelNama}.`);
    }

    const now = new Date();

    // 6. Transaksi Atomik Penempatan Rombel
    const result = await prisma.$transaction(async (tx) => {
      const rombel = await tx.rombel.findUniqueOrThrow({
        where: { id: preview.rombelId },
        include: { tahun_ajaran: true, sekolah: true },
      });

      // A. Pastikan Enrollment (KeikutsertaanSiswa) ada untuk tahun ajaran rombel ini
      let enrollment = await tx.keikutsertaanSiswa.findFirst({
        where: {
          siswa_id: student.id,
          tahun_ajaran_id: rombel.tahun_ajaran_id,
        },
      });

      if (!enrollment) {
        enrollment = await tx.keikutsertaanSiswa.create({
          data: {
            id: generateUlid(),
            sekolah_id: rombel.sekolah_id,
            siswa_id: student.id,
            tahun_ajaran_id: rombel.tahun_ajaran_id,
            tingkat_id: rombel.tingkat_id,
            status: "AKTIF",
            tanggal_mulai: now,
            catatan: `Enrollment otomatis melalui join rombel ${rombel.nama}`,
          },
        });
      }

      // B. Jika siswa memiliki penempatan aktif di rombel lain pada tahun ajaran yang sama, tutup penempatan lama (status PINDAH)
      await tx.penempatanRombel.updateMany({
        where: {
          keikutsertaan_id: enrollment.id,
          status: "AKTIF",
        },
        data: {
          status: "PINDAH",
          tanggal_selesai: now,
          catatan: `Pindah ke rombel ${rombel.nama} via kode gabung ${code}`,
        },
      });

      // C. Tentukan nomor absen berikutnya
      const lastPlacementWithAbsen = await tx.penempatanRombel.findFirst({
        where: { rombel_id: rombel.id, status: "AKTIF" },
        orderBy: { nomor_absen: "desc" },
        select: { nomor_absen: true },
      });
      const nextAbsen = (lastPlacementWithAbsen?.nomor_absen ?? 0) + 1;

      // D. Buat PenempatanRombel baru
      const placementId = generateUlid();
      const newPlacement = await tx.penempatanRombel.create({
        data: {
          id: placementId,
          sekolah_id: rombel.sekolah_id,
          keikutsertaan_id: enrollment.id,
          rombel_id: rombel.id,
          tanggal_mulai: now,
          status: "AKTIF",
          nomor_absen: nextAbsen,
          catatan: `Bergabung mandiri via kode gabung ${code}`,
        },
      });

      // E. Pastikan KeanggotaanSekolah siswa aktif pada tenant ini
      const membership = await tx.keanggotaanSekolah.findFirst({
        where: {
          sekolah_id: rombel.sekolah_id,
          pengguna_id: user.id,
        },
      });

      if (!membership) {
        await tx.keanggotaanSekolah.create({
          data: {
            id: generateUlid(),
            sekolah_id: rombel.sekolah_id,
            pengguna_id: user.id,
            peran_dasar_di_tenant: "STUDENT",
            status_keanggotaan: "ACTIVE",
            is_owner: false,
          },
        });
      }

      // F. Sinkronkan sekolah_id pada Siswa & Pengguna jika sebelumnya null
      if (!student.sekolah_id || !user.sekolah_id) {
        await tx.siswa.update({
          where: { id: student.id },
          data: { sekolah_id: rombel.sekolah_id },
        });
        await tx.pengguna.update({
          where: { id: user.id },
          data: { sekolah_id: rombel.sekolah_id },
        });
      }

      // G. Catat Audit Log Transaksional
      await recordAuditEvent(
        {
          sekolah_id: rombel.sekolah_id,
          aktor_id: user.id,
          aktor_role: user.peran_dasar,
          aksi: "STUDENT_JOINED_ROMBEL_VIA_CODE",
          tipe_sumber: "PenempatanRombel",
          id_sumber: placementId,
          payload_sesudah: {
            code,
            rombel_id: rombel.id,
            rombel_nama: rombel.nama,
            siswa_id: student.id,
            siswa_nama: student.nama_lengkap,
            nomor_absen: nextAbsen,
          },
        },
        tx
      );

      return {
        placementId,
        nomorAbsen: nextAbsen,
        rombelNama: rombel.nama,
        namaSekolah: rombel.sekolah.nama,
      };
    });

    return {
      success: true,
      penempatanId: result.placementId,
      siswaId: student.id,
      siswaNama: student.nama_lengkap,
      rombelId: preview.rombelId,
      rombelNama: result.rombelNama,
      namaSekolah: result.namaSekolah,
      nomorAbsen: result.nomorAbsen,
      message: `Selamat, Anda berhasil bergabung ke rombel ${result.rombelNama} dengan nomor absen ${result.nomorAbsen}!`,
    };
  }
}

export const rombelJoinService = new RombelJoinService();
