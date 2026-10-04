import { describe, it, expect, vi, beforeEach } from "vitest";
import { CbtService } from "@/modules/cbt/application/cbt-service";
import {
  CbtAccessDeniedError,
  CbtAttemptClosedError,
  CbtAttemptLockedError,
  CbtTimerExpiredError,
  CbtExamNotActiveError,
  CbtValidationError,
} from "@/modules/cbt/domain/cbt-errors";
import { prisma } from "@/shared/infrastructure/database/prisma";

describe("M14 CBT (Computer-Based Test) — CbtService Domain Invariants", () => {
  let service: CbtService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = {
      findBankSoal: vi.fn(),
      findBankSoalById: vi.fn(),
      createBankSoal: vi.fn(),
      createVersiSoal: vi.fn(),
      findUjianByPenugasan: vi.fn(),
      findUjianById: vi.fn(),
      createUjian: vi.fn(),
      updateUjianStatus: vi.fn(),
      freezeSnapshot: vi.fn(),
      getActiveSnapshot: vi.fn(),
      startOrResumeAttempt: vi.fn(),
      findSessionById: vi.fn(),
      saveJawaban: vi.fn(),
      findJawabanBySession: vi.fn(),
      recordIntegrityEvent: vi.fn(),
      findIntegrityEvents: vi.fn(),
      lockAttemptForViolation: vi.fn(),
      unlockAttempt: vi.fn(),
      submitAttempt: vi.fn(),
      findHasilBySession: vi.fn(),
      findExamAttempts: vi.fn(),
      transferResultsToGradebook: vi.fn(),
    };

    service = new CbtService(mockRepo);
  });

  const mockSekolahId = "01J00000000000000000000001";
  const mockPenugasanId = "01J000000000000000PENUGAS1";
  const mockGuruOwnerId = "01J000000000000000000GURU1";
  const mockOtherGuruId = "01J000000000000000000GURU2";
  const mockSiswaId = "01J00000000000000000SISWA1";
  const mockOtherSiswaId = "01J00000000000000000SISWA2";
  const mockRombelId = "01J000000000000000ROMBEL01";
  const mockPenempatanRombelId = "01J00000000000000PENEMPAT1";
  const mockUjianId = "01J00000000000000000UJIAN1";
  const mockSnapshotId = "01J00000000000000SNAPSHOT1";
  const mockSessionId = "01J000000000000000SESSI001";

  // --------------------------------------------------------------------------
  // 1. TEACHER SCOPE GUARD & EXAM MANAGEMENT
  // --------------------------------------------------------------------------
  describe("Teacher Scope Guard", () => {
    it("enforces Teacher Scope: rejects teacher not assigned to penugasan", async () => {
      vi.spyOn(prisma.penugasanMengajar, "findFirst").mockResolvedValue({
        id: mockPenugasanId,
        guru_id: mockGuruOwnerId,
        status: "AKTIF",
      } as any);

      await expect(
        service.getExamsByPenugasan(mockPenugasanId, mockSekolahId, mockOtherGuruId, false)
      ).rejects.toThrow(CbtAccessDeniedError);

      mockRepo.findUjianByPenugasan.mockResolvedValue([]);
      const allowedResult = await service.getExamsByPenugasan(
        mockPenugasanId,
        mockSekolahId,
        mockGuruOwnerId,
        false
      );
      expect(allowedResult).toEqual([]);
    });

    it("allows SUPER_ADMIN to bypass teacher scope", async () => {
      mockRepo.findUjianByPenugasan.mockResolvedValue([{ id: mockUjianId }]);
      const adminResult = await service.getExamsByPenugasan(
        mockPenugasanId,
        mockSekolahId,
        null,
        true
      );
      expect(adminResult).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // 2. EXAM PUBLICATION & IMMUTABLE SNAPSHOT
  // --------------------------------------------------------------------------
  describe("Exam Snapshot Immutability", () => {
    it("freezes snapshot upon exam publication and updates status to DIPUBLIKASI", async () => {
      vi.spyOn(prisma.penugasanMengajar, "findFirst").mockResolvedValue({
        id: mockPenugasanId,
        guru_id: mockGuruOwnerId,
        status: "AKTIF",
      } as any);

      mockRepo.findUjianById.mockResolvedValue({
        id: mockUjianId,
        penugasan_mengajar_id: mockPenugasanId,
        status: "DRAFT",
      });

      mockRepo.freezeSnapshot.mockResolvedValue({ id: mockSnapshotId });

      await service.publishExam(mockUjianId, mockSekolahId, mockGuruOwnerId, false);

      expect(mockRepo.freezeSnapshot).toHaveBeenCalledWith(mockUjianId, mockSekolahId);
      expect(mockRepo.updateUjianStatus).toHaveBeenCalledWith(
        mockUjianId,
        "DIPUBLIKASI",
        mockSekolahId
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. STUDENT AUTHORIZATION & ATTEMPT INITIALIZATION
  // --------------------------------------------------------------------------
  describe("Student Attempt Authorization & One Active Attempt", () => {
    it("rejects student not enrolled in the rombel", async () => {
      mockRepo.findUjianById.mockResolvedValue({
        id: mockUjianId,
        penugasan_mengajar_id: mockPenugasanId,
        status: "DIPUBLIKASI",
        durasi_menit: 60,
      });

      vi.spyOn(prisma.penugasanMengajar, "findFirst").mockResolvedValue({
        id: mockPenugasanId,
        rombel_id: mockRombelId,
      } as any);

      vi.spyOn(prisma.penempatanRombel, "findFirst").mockResolvedValue(null);

      await expect(
        service.startOrResumeAttempt(mockUjianId, mockSekolahId, mockSiswaId)
      ).rejects.toThrow(CbtAccessDeniedError);
    });

    it("rejects attempt if exam status is not DIPUBLIKASI", async () => {
      mockRepo.findUjianById.mockResolvedValue({
        id: mockUjianId,
        penugasan_mengajar_id: mockPenugasanId,
        status: "DRAFT",
      });

      await expect(
        service.startOrResumeAttempt(mockUjianId, mockSekolahId, mockSiswaId)
      ).rejects.toThrow(CbtExamNotActiveError);
    });

    it("sanitizes manifest payload: does not leak answer keys to student", async () => {
      mockRepo.findUjianById.mockResolvedValue({
        id: mockUjianId,
        penugasan_mengajar_id: mockPenugasanId,
        status: "DIPUBLIKASI",
        durasi_menit: 60,
      });

      vi.spyOn(prisma.penugasanMengajar, "findFirst").mockResolvedValue({
        id: mockPenugasanId,
        rombel_id: mockRombelId,
      } as any);

      vi.spyOn(prisma.penempatanRombel, "findFirst").mockResolvedValue({
        id: mockPenempatanRombelId,
      } as any);

      const futureDeadline = new Date(Date.now() + 60 * 60 * 1000);
      mockRepo.getActiveSnapshot.mockResolvedValue({
        id: mockSnapshotId,
        manifest_soal: [
          {
            nomor_urut: 1,
            jenis_soal: "PILIHAN_GANDA",
            pertanyaan: "Berapa 2 + 2?",
            bobot: 1,
            opsi: [
              { label: "A", teks: "3" },
              { label: "B", teks: "4" },
            ],
          },
        ],
      });

      mockRepo.startOrResumeAttempt.mockResolvedValue({
        id: mockSessionId,
        status: "SEDANG_MENGERJAKAN",
        batas_waktu_server: futureDeadline,
      });

      mockRepo.findJawabanBySession.mockResolvedValue([]);

      const result = await service.startOrResumeAttempt(mockUjianId, mockSekolahId, mockSiswaId);

      expect(result.session.id).toBe(mockSessionId);
      expect(result.manifest[0]).toHaveProperty("pertanyaan", "Berapa 2 + 2?");
      expect(result.manifest[0]).not.toHaveProperty("kunci_jawaban");
      expect(result.manifest[0]).not.toHaveProperty("pilihan_benar");
      expect(result.manifest[0].opsi?.[0]).not.toHaveProperty("is_correct");
      expect(result.timeRemainingSeconds).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. SERVER AUTHORITATIVE TIMER & AUTOSAVE
  // --------------------------------------------------------------------------
  describe("Server Authoritative Timer & Autosave", () => {
    it("rejects autosave if session has expired according to server timer", async () => {
      const pastDeadline = new Date(Date.now() - 5000); // 5s ago
      mockRepo.findSessionById.mockResolvedValue({
        id: mockSessionId,
        siswa_id: mockSiswaId,
        status: "SEDANG_MENGERJAKAN",
        batas_waktu_server: pastDeadline,
      });

      await expect(
        service.autosaveAnswer(
          {
            sesi_ujian_siswa_id: mockSessionId,
            nomor_urut: 1,
            jawaban_pilihan: "B",
          },
          mockSekolahId,
          mockSiswaId
        )
      ).rejects.toThrow(CbtTimerExpiredError);

      expect(mockRepo.submitAttempt).toHaveBeenCalledWith(mockSessionId);
    });

    it("saves answer successfully if timer is valid", async () => {
      const futureDeadline = new Date(Date.now() + 60000);
      mockRepo.findSessionById.mockResolvedValue({
        id: mockSessionId,
        siswa_id: mockSiswaId,
        status: "SEDANG_MENGERJAKAN",
        batas_waktu_server: futureDeadline,
      });

      mockRepo.saveJawaban.mockResolvedValue({ id: "JAWABAN_1" });

      const res = await service.autosaveAnswer(
        {
          sesi_ujian_siswa_id: mockSessionId,
          nomor_urut: 1,
          jawaban_pilihan: "A",
        },
        mockSekolahId,
        mockSiswaId
      );

      expect(res.savedAt).toBeDefined();
      expect(mockRepo.saveJawaban).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // 5. INTEGRITY EVENTS & STRIKE LOCK
  // --------------------------------------------------------------------------
  describe("Anti-Cheat Integrity Strikes", () => {
    it("locks the attempt automatically when strikes reach 2 exit screen events", async () => {
      mockRepo.findSessionById.mockResolvedValue({
        id: mockSessionId,
        sekolah_id: mockSekolahId,
        siswa_id: mockSiswaId,
        status: "SEDANG_MENGERJAKAN",
      });

      mockRepo.recordIntegrityEvent.mockResolvedValue({ id: "EVENT_2" });
      mockRepo.findIntegrityEvents.mockResolvedValue([
        { id: "EVENT_1", tipe_event: "KELUAR_LAYAR_PENUH" },
        { id: "EVENT_2", tipe_event: "PINDAH_TAB_ATAU_WINDOW" },
      ]);

      const result = await service.recordIntegrityEvent(
        {
          sesi_ujian_siswa_id: mockSessionId,
          tipe_event: "PINDAH_TAB_ATAU_WINDOW",
          deskripsi: "Pindah aplikasi",
        },
        mockSekolahId,
        mockSiswaId
      );

      expect(result.isLocked).toBe(true);
      expect(mockRepo.lockAttemptForViolation).toHaveBeenCalledWith(
        mockSessionId,
        expect.stringContaining("Terdeteksi 2 kali"),
        mockSekolahId
      );
    });

    it("prevents locked attempt from saving answers", async () => {
      mockRepo.findSessionById.mockResolvedValue({
        id: mockSessionId,
        siswa_id: mockSiswaId,
        status: "TERKUNCI_PELANGGARAN",
        batas_waktu_server: new Date(Date.now() + 60000),
      });

      await expect(
        service.autosaveAnswer(
          {
            sesi_ujian_siswa_id: mockSessionId,
            nomor_urut: 1,
            jawaban_pilihan: "B",
          },
          mockSekolahId,
          mockSiswaId
        )
      ).rejects.toThrow(CbtAttemptClosedError);
    });
  });

  // --------------------------------------------------------------------------
  // 6. GRADEBOOK BRIDGE TRANSFER
  // --------------------------------------------------------------------------
  describe("Gradebook Bridge Transfer", () => {
    it("delegates CBT scores to official Phase 13 Gradebook contract", async () => {
      vi.spyOn(prisma.penugasanMengajar, "findFirst").mockResolvedValue({
        id: mockPenugasanId,
        guru_id: mockGuruOwnerId,
        status: "AKTIF",
      } as any);

      mockRepo.findUjianById.mockResolvedValue({
        id: mockUjianId,
        penugasan_mengajar_id: mockPenugasanId,
      });

      mockRepo.transferResultsToGradebook.mockResolvedValue({
        assessmentId: "ASESMEN_FROM_CBT",
        transferredCount: 25,
      });

      const result = await service.transferToGradebook(
        {
          ujian_cbt_id: mockUjianId,
          nama_asesmen: "PTS Matematika CBT",
          kategori: "SUMATIF",
          jenis_asesmen: "SUMATIF_TENGAH_SEMESTER",
          bobot: 1,
        },
        mockSekolahId,
        mockGuruOwnerId,
        false
      );

      expect(result.assessmentId).toBe("ASESMEN_FROM_CBT");
      expect(result.transferredCount).toBe(25);
      expect(mockRepo.transferResultsToGradebook).toHaveBeenCalled();
    });
  });
});
