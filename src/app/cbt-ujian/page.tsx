import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/shared/infrastructure/auth/auth-guard";
import { staffCapabilityService } from "@/shared/infrastructure/authorization/staff-capability-service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AcademicShell } from "@/shared/components/shell/academic-shell";
import {
  CbtHubOverviewView,
  TeacherCbtClassItem,
  StudentCbtExamItem,
} from "@/modules/cbt/presentation/cbt-hub-overview-view";

export const metadata: Metadata = {
  title: "CBT Ujian Online — Ruang Pintar",
  description: "Pusat evaluasi ujian terkomputerisasi, bank soal, dan monitoring CBT",
};

export default async function CbtUjianPage() {
  const user = await requireAuth();

  if (!user.sekolah_id) {
    redirect("/dashboard");
  }

  const role = user.peran_dasar as "TEACHER" | "SUPER_ADMIN" | "STUDENT";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const staffCapabilities =
    user.peran_dasar === "SCHOOL_STAFF" || user.peran_dasar === "TEACHER"
      ? await staffCapabilityService.getUserCapabilities(user.id)
      : [];

  let teacherClasses: TeacherCbtClassItem[] = [];
  const studentExams: StudentCbtExamItem[] = [];

  // 1. Context Guru & Super Admin
  if (role === "TEACHER" || role === "SUPER_ADMIN") {
    let guruId: string | null = null;
    if (role === "TEACHER") {
      const guru = await prisma.guru.findFirst({
        where: {
          sekolah_id: user.sekolah_id,
          pengguna_id: user.id,
        },
      });
      if (guru) {
        guruId = guru.id;
      }
    }

    const whereClause: any = {
      sekolah_id: user.sekolah_id,
      status: "AKTIF",
    };

    if (!isSuperAdmin && guruId) {
      whereClause.guru_id = guruId;
    }

    const penugasanList = await prisma.penugasanMengajar.findMany({
      where: whereClause,
      select: {
        id: true,
        rombel_id: true,
        mata_pelajaran_id: true,
        guru: {
          select: { nama_lengkap: true },
        },
        rombel: {
          select: { id: true, nama: true },
        },
        mata_pelajaran: {
          select: { id: true, nama: true },
        },
        ujian_cbt: {
          select: {
            id: true,
            judul: true,
            deskripsi: true,
            durasi_menit: true,
            status: true,
            gunakan_token: true,
            token_masuk: true,
            sesi_ujian_siswa: {
              select: {
                status: true,
                hasil: {
                  select: {
                    skor_mentah: true,
                  },
                },
              },
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: [{ rombel: { nama: "asc" } }, { mata_pelajaran: { nama: "asc" } }],
    });

    teacherClasses = penugasanList.map((p) => {
      const totalUjian = p.ujian_cbt.length;
      const totalPublished = p.ujian_cbt.filter(
        (u) => u.status === "PUBLISHED" || u.status === "DIPUBLIKASI" || u.status === "DITERBITKAN"
      ).length;
      const totalDraft = p.ujian_cbt.filter((u) => u.status === "DRAFT").length;
      const totalSelesai = p.ujian_cbt.filter((u) => u.status === "SELESAI").length;

      const exams = p.ujian_cbt.map((u) => {
        const totalPeserta = u.sesi_ujian_siswa.length;
        const totalSelesaiPeserta = u.sesi_ujian_siswa.filter(
          (s) => s.status === "DIKUMPULKAN" || s.status === "WAKTU_HABIS"
        ).length;

        const scores = u.sesi_ujian_siswa
          .map((s) => s.hasil?.skor_mentah)
          .filter((v): v is number => v !== null && v !== undefined);

        const rataRata =
          scores.length > 0
            ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
            : null;

        return {
          id: u.id,
          judul: u.judul,
          deskripsi: u.deskripsi,
          durasi_menit: u.durasi_menit,
          status: u.status,
          total_peserta: totalPeserta,
          total_selesai: totalSelesaiPeserta,
          rata_rata: rataRata,
          gunakan_token: u.gunakan_token,
          token_masuk: u.token_masuk,
        };
      });

      return {
        penugasan_id: p.id,
        rombel_id: p.rombel_id,
        rombel_nama: p.rombel.nama,
        mata_pelajaran_id: p.mata_pelajaran_id,
        mata_pelajaran_nama: p.mata_pelajaran.nama,
        guru_nama: p.guru.nama_lengkap,
        total_ujian: totalUjian,
        total_published: totalPublished,
        total_draft: totalDraft,
        total_selesai: totalSelesai,
        exams,
      };
    });
  }

  // 2. Context Siswa (Student)
  if (role === "STUDENT") {
    const siswa = await prisma.siswa.findFirst({
      where: {
        sekolah_id: user.sekolah_id,
        pengguna_id: user.id,
      },
      include: {
        keikutsertaan: {
          include: {
            penempatan: {
              where: { status: "AKTIF" },
              include: {
                rombel: {
                  include: {
                    penugasan_mengajar: {
                      where: { status: "AKTIF" },
                      include: {
                        mata_pelajaran: true,
                        guru: true,
                        ujian_cbt: {
                          where: {
                            status: { in: ["PUBLISHED", "DIPUBLIKASI", "DITERBITKAN", "SELESAI"] },
                          },
                          orderBy: { created_at: "desc" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (siswa) {
      const activePlacements = siswa.keikutsertaan.flatMap((k) => k.penempatan);
      const allExamsWithContext: Array<{
        u: any;
        mapelNama: string;
        guruNama: string;
        rombelNama: string;
      }> = [];

      for (const placement of activePlacements) {
        for (const penugasan of placement.rombel.penugasan_mengajar) {
          for (const u of penugasan.ujian_cbt) {
            allExamsWithContext.push({
              u,
              mapelNama: penugasan.mata_pelajaran.nama,
              guruNama: penugasan.guru.nama_lengkap,
              rombelNama: placement.rombel.nama,
            });
          }
        }
      }

      const examIds = allExamsWithContext.map((item) => item.u.id);
      const attempts =
        examIds.length > 0
          ? await prisma.sesiUjianSiswa.findMany({
              where: {
                ujian_cbt_id: { in: examIds },
                siswa_id: siswa.id,
              },
              select: {
                id: true,
                ujian_cbt_id: true,
                status: true,
                hasil: {
                  select: {
                    skor_mentah: true,
                  },
                },
              },
            })
          : [];

      const attemptMap = new Map(attempts.map((a) => [a.ujian_cbt_id, a]));

      for (const item of allExamsWithContext) {
        const u = item.u;
        const attempt = attemptMap.get(u.id);

        let attemptStatus: "BELUM_DIKERJAKAN" | "SEDANG_DIKERJAKAN" | "SELESAI" | "TERKUNCI" =
          "BELUM_DIKERJAKAN";
        if (attempt) {
          if (attempt.status === "DIKUMPULKAN" || attempt.status === "WAKTU_HABIS") {
            attemptStatus = "SELESAI";
          } else if (attempt.status === "TERKUNCI_PELANGGARAN") {
            attemptStatus = "TERKUNCI";
          } else {
            attemptStatus = "SEDANG_DIKERJAKAN";
          }
        }

        studentExams.push({
          id: u.id,
          judul: u.judul,
          deskripsi: u.deskripsi,
          durasi_menit: u.durasi_menit,
          tanggal_mulai: u.waktu_mulai ? u.waktu_mulai.toISOString() : u.created_at.toISOString(),
          tanggal_selesai: u.waktu_selesai ? u.waktu_selesai.toISOString() : "",
          status_ujian: u.status,
          mata_pelajaran_nama: item.mapelNama,
          guru_nama: item.guruNama,
          rombel_nama: item.rombelNama,
          gunakan_token: u.gunakan_token,
          attempt_status: attemptStatus,
          attempt_id: attempt?.id,
          nilai_akhir: attempt?.hasil?.skor_mentah ?? null,
        });
      }
    }
  }

  const sekolah = await prisma.sekolah.findUnique({
    where: { id: user.sekolah_id },
    select: { tipe_lisensi: true },
  });
  const isSubscribed = sekolah?.tipe_lisensi === "SEKOLAH";

  return (
    <AcademicShell
      user={user}
      userCapabilities={staffCapabilities}
      isSubscribed={isSubscribed}
      breadcrumbItems={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "CBT Ujian Online", href: "/cbt-ujian", isCurrent: true },
      ]}
    >
      <CbtHubOverviewView
        role={role}
        sekolahId={user.sekolah_id}
        teacherClasses={teacherClasses}
        studentExams={studentExams}
        isSuperAdmin={isSuperAdmin}
      />
    </AcademicShell>
  );
}
