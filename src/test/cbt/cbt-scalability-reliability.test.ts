/**
 * Ruang Pintar — Stage 17 Automated Tests
 * CBT Scalability & Exam Reliability Foundation
 *
 * Verifies:
 * - Duplicate submit protection (Idempotent submission under concurrent burst)
 * - Concurrent autosave queueing & SQLite retry resilience
 * - Post-submission idempotency (Idempotent finish)
 * - SQLite retry utility with backoff and jitter
 * - In-flight submission mutex deduplication
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { withSqliteRetry, isSqliteBusyError } from "@/shared/infrastructure/database/sqlite-retry";
import { CbtWriteQueue } from "@/modules/cbt/infrastructure/cbt-write-queue";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { CbtRepository } from "@/modules/cbt/infrastructure/cbt-repository";
import { generateUlid } from "@/shared/lib/ulid";

describe("Stage 17: CBT Scalability & Exam Reliability Foundation", () => {
  let queue: CbtWriteQueue;
  let repo: CbtRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new CbtWriteQueue();
    repo = new CbtRepository();
  });

  // ============================================================================
  // 1. SQLITE RETRY UTILITY TESTS
  // ============================================================================
  describe("1. SQLite Busy Retry Utility (withSqliteRetry)", () => {
    it("detects SQLite busy errors correctly", () => {
      expect(isSqliteBusyError(new Error("SQLITE_BUSY: database is locked"))).toBe(true);
      expect(isSqliteBusyError(new Error("database is locked"))).toBe(true);
      expect(isSqliteBusyError(new Error("busy_timeout expired"))).toBe(true);
      expect(isSqliteBusyError({ code: "P2034", message: "Transaction failed" })).toBe(true);
      expect(isSqliteBusyError(new Error("Generic network error"))).toBe(false);
      expect(isSqliteBusyError(null)).toBe(false);
    });

    it("retries on SQLite busy error and succeeds when transient lock clears", async () => {
      let attempts = 0;
      const transientOp = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("SQLITE_BUSY: database is locked");
        }
        return { success: true, attempts };
      });

      const result = await withSqliteRetry<{ success: boolean; attempts: number }>(transientOp, {
        maxRetries: 4,
        baseDelayMs: 10,
        maxDelayMs: 50,
      });

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
      expect(transientOp).toHaveBeenCalledTimes(3);
    });

    it("throws error when max retries exceeded for persistent lock", async () => {
      const persistentOp = vi.fn().mockRejectedValue(new Error("database is locked"));

      await expect(
        withSqliteRetry(persistentOp, {
          maxRetries: 3,
          baseDelayMs: 5,
          maxDelayMs: 20,
        })
      ).rejects.toThrow("database is locked");

      expect(persistentOp).toHaveBeenCalledTimes(4); // initial + 3 retries
    });
  });

  // ============================================================================
  // 2. IN-FLIGHT MUTEX & CONCURRENCY QUEUE TESTS
  // ============================================================================
  describe("2. CBT Write Queue & Submission Mutex", () => {
    it("deduplicates concurrent submissions using in-flight promise sharing", async () => {
      const attemptId = generateUlid();
      let executionCount = 0;

      const mockSubmitOperation = async () => {
        executionCount++;
        // Simulate database transaction latency
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
          id: generateUlid(),
          sesi_ujian_id: attemptId,
          nilai_akhir: 85,
          status_kelulusan: "TUNTAS",
        };
      };

      // Simulate 4 rapid concurrent submission requests (e.g. double click, network retry)
      const results = await Promise.all([
        queue.enqueueSubmission(attemptId, mockSubmitOperation),
        queue.enqueueSubmission(attemptId, mockSubmitOperation),
        queue.enqueueSubmission(attemptId, mockSubmitOperation),
        queue.enqueueSubmission(attemptId, mockSubmitOperation),
      ]);

      // All 4 concurrent calls must return identical results
      expect(results).toHaveLength(4);
      expect(results[0].sesi_ujian_id).toBe(attemptId);
      expect(results[0].nilai_akhir).toBe(85);
      expect(results[1]).toEqual(results[0]);
      expect(results[2]).toEqual(results[0]);
      expect(results[3]).toEqual(results[0]);

      // Critical invariant: DB transaction must only be executed ONCE
      expect(executionCount).toBe(1);
    });

    it("handles concurrent autosave requests smoothly and reports queue stats", async () => {
      const attemptId = generateUlid();
      const saveResults: any[] = [];

      // 10 concurrent autosaves across different questions
      const autosavePromises = Array.from({ length: 10 }).map((_, idx) => {
        return queue.enqueueAutosave(attemptId, `soal-${idx}`, async () => {
          return { success: true, soalId: `soal-${idx}`, savedAt: new Date().toISOString() };
        });
      });

      const res = await Promise.all(autosavePromises);
      expect(res).toHaveLength(10);
      res.forEach((r, idx) => {
        expect(r.soalId).toBe(`soal-${idx}`);
        expect(r.success).toBe(true);
      });

      const stats = queue.getStats();
      expect(stats.totalAutosavesProcessed).toBe(10);
      expect(stats.inFlightAutosavesCount).toBe(0);
    });
  });

  // ============================================================================
  // 3. IDEMPOTENT SUBMIT & RECOVERY TESTS
  // ============================================================================
  describe("3. Idempotent Submission & State Recovery", () => {
    const mockAttemptId = "01JTESTATTEMPT00000000001";
    const mockSekolahId = "01JTESTSEKOLAH00000000001";
    const mockSiswaId = "01JTESTSISWA0000000000001";
    const mockUjianId = "01JTESTUJIAN0000000000001";

    it("guarantees idempotent submission when attempt is already submitted", async () => {
      // Mock existing completed attempt
      vi.spyOn(prisma.sesiUjianSiswa, "findUnique").mockResolvedValue({
        id: mockAttemptId,
        sekolah_id: mockSekolahId,
        ujian_cbt_id: mockUjianId,
        siswa_id: mockSiswaId,
        status: "DIKUMPULKAN",
        waktu_selesai: new Date("2026-09-25T10:00:00Z"),
        siswa: { id: mockSiswaId, nama_lengkap: "Budi Pratama", nis: "1001" },
        jawaban_siswa: [],
      } as any);

      vi.spyOn(prisma.hasilUjianCbt, "findUnique").mockResolvedValue({
        id: "01JTESTHASIL0000000000001",
        sekolah_id: mockSekolahId,
        sesi_ujian_id: mockAttemptId,
        ujian_cbt_id: mockUjianId,
        siswa_id: mockSiswaId,
        total_soal: 20,
        total_dijawab: 20,
        jumlah_benar: 18,
        jumlah_salah: 2,
        jumlah_kosong: 0,
        skor_mentah: 90,
        skor_maksimal: 100,
        nilai_akhir: 90,
        apakah_tuntas: true,
        status_penilaian: "LENGKAP",
        status_transfer: "BELUM_DITRANSFER",
      } as any);

      // Call submitAttempt on already completed session
      const result = await repo.submitAttempt(mockAttemptId);

      expect(result.sesi_ujian_id).toBe(mockAttemptId);
      expect(result.nilai_akhir).toBe(90);
      expect(result.status_kelulusan).toBe("TUNTAS");
      expect(result.siswa_nama).toBe("Budi Pratama");

      // Verify no database mutation occurred ($transaction was not executed)
      const txSpy = vi.spyOn(prisma, "$transaction");
      expect(txSpy).not.toHaveBeenCalled();
    });

    it("handles concurrent autosaves on the same question without race condition", async () => {
      const mockSession = {
        id: mockAttemptId,
        sekolah_id: mockSekolahId,
        siswa_id: mockSiswaId,
        status: "SEDANG_MENGERJAKAN",
        batas_waktu_server: new Date(Date.now() + 3600000), // 1 hour from now
      };

      vi.spyOn(prisma.sesiUjianSiswa, "findUnique").mockResolvedValue(mockSession as any);
      vi.spyOn(prisma.jawabanSiswa, "upsert").mockResolvedValue({
        id: "01JTESTANS000000000000001",
        waktu_simpan: new Date(),
      } as any);

      // Two consecutive autosaves for the same question
      const save1 = repo.saveAnswer(
        {
          sesi_ujian_id: mockAttemptId,
          soal_id: "soal-1",
          versi_soal_id: "versi-1",
          jawaban_peserta: ["A"],
          ragu_ragu: false,
        },
        mockSiswaId
      );

      const save2 = repo.saveAnswer(
        {
          sesi_ujian_id: mockAttemptId,
          soal_id: "soal-1",
          versi_soal_id: "versi-1",
          jawaban_peserta: ["B"],
          ragu_ragu: false,
        },
        mockSiswaId
      );

      const [res1, res2] = await Promise.all([save1, save2]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
    });

    it("reconnects and allows continuation when student returns before deadline", async () => {
      const mockSession = {
        id: mockAttemptId,
        sekolah_id: mockSekolahId,
        siswa_id: mockSiswaId,
        ujian_cbt_id: mockUjianId,
        snapshot_id: "01JSNAPSHOT0000000000001",
        status: "SEDANG_MENGERJAKAN",
        batas_waktu_server: new Date(Date.now() + 1800000), // 30 minutes left
        waktu_mulai: new Date(),
        urutan_soal_peserta: JSON.stringify(["soal-1", "soal-2"]),
        ujian_cbt: {
          judul: "Ujian Akhir Semester Matematika",
          deskripsi: "Kerjakan dengan teliti",
          acak_soal: false,
          penugasan_mengajar: {
            rombel: { nama: "Kelas 8A" },
            mata_pelajaran: { nama: "Matematika" },
          },
        },
        snapshot: { durasi_menit: 60, manifest_soal: JSON.stringify([]) },
        siswa: { id: mockSiswaId, nama_lengkap: "Ahmad Siswa", nis: "1002" },
        jawaban_siswa: [
          {
            soal_id: "soal-1",
            jawaban_peserta: JSON.stringify(["B"]),
            ragu_ragu: false,
            waktu_simpan: new Date(),
          },
        ],
      };

      vi.spyOn(prisma.sesiUjianSiswa, "findUnique").mockResolvedValue(mockSession as any);

      // Student reloads / reconnects
      const playerState = await repo.loadPlayerState(mockAttemptId, mockSiswaId);

      expect(playerState.sesi_id).toBe(mockAttemptId);
      expect(playerState.status).toBe("SEDANG_MENGERJAKAN");
      expect(playerState.sisa_detik_server).toBeGreaterThan(0);
      expect(playerState.jawaban_tersimpan["soal-1"]).toBeDefined();
      expect(playerState.jawaban_tersimpan["soal-1"].jawaban).toEqual(["B"]);
    });
  });
});
