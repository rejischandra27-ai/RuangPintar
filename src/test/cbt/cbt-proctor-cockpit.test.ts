import { describe, it, expect, vi, beforeEach } from "vitest";
import { CbtService } from "@/modules/cbt/application/cbt-service";
import {
  CbtAccessDeniedError,
  CbtNotFoundError,
  CbtAttemptClosedError,
} from "@/modules/cbt/domain/cbt-errors";

describe("M14 CBT — Live Proctor Cockpit & Proctoring Control Invariants", () => {
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
      resetAttempt: vi.fn(),
      forceSubmitAttempt: vi.fn(),
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
  const mockUjianId = "01J00000000000000000UJIAN1";
  const mockSessionId = "01J000000000000000SESSI001";

  // ==========================================================================
  // 1. PROCTOR UNLOCK ATTEMPT
  // ==========================================================================
  describe("Proctor Unlock Attempt", () => {
    it("allows the assigned teacher to unlock a locked student session", async () => {
      mockRepo.findSessionById.mockResolvedValue({
        id: mockSessionId,
        ujian_cbt_id: mockUjianId,
        status: "TERKUNCI_PELANGGARAN",
      });

      mockRepo.findUjianById.mockResolvedValue({
        id: mockUjianId,
        penugasan_mengajar_id: mockPenugasanId,
      });

      vi.spyOn(service as any, "verifyTeacherAssignmentScope").mockResolvedValue(undefined);

      await service.unlockAttempt(mockSessionId, mockSekolahId, mockGuruOwnerId, false);

      expect(mockRepo.unlockAttempt).toHaveBeenCalledWith(mockSessionId, mockSekolahId);
    });

    it("rejects unlocking when session does not exist", async () => {
      mockRepo.findSessionById.mockResolvedValue(null);

      await expect(
        service.unlockAttempt("non-existent", mockSekolahId, mockGuruOwnerId, false)
      ).rejects.toThrow(CbtNotFoundError);
    });
  });

  // ==========================================================================
  // 2. PROCTOR RESET ATTEMPT
  // ==========================================================================
  describe("Proctor Reset Attempt (Device Crash / Technical Recovery)", () => {
    it("allows the teacher to reset a student attempt so the student can restart", async () => {
      mockRepo.findSessionById.mockResolvedValue({
        id: mockSessionId,
        ujian_cbt_id: mockUjianId,
        status: "SEDANG_MENGERJAKAN",
      });

      mockRepo.findUjianById.mockResolvedValue({
        id: mockUjianId,
        penugasan_mengajar_id: mockPenugasanId,
      });

      vi.spyOn(service as any, "verifyTeacherAssignmentScope").mockResolvedValue(undefined);
      mockRepo.resetAttempt.mockResolvedValue(undefined);

      await service.resetAttempt(mockSessionId, mockSekolahId, mockGuruOwnerId, false);

      expect(mockRepo.resetAttempt).toHaveBeenCalledWith(mockSessionId);
    });

    it("allows SUPER_ADMIN to reset student attempt regardless of assignment ownership", async () => {
      mockRepo.findSessionById.mockResolvedValue({
        id: mockSessionId,
        ujian_cbt_id: mockUjianId,
        status: "TERKUNCI_PELANGGARAN",
      });

      mockRepo.findUjianById.mockResolvedValue({
        id: mockUjianId,
        penugasan_mengajar_id: mockPenugasanId,
      });

      vi.spyOn(service as any, "verifyTeacherAssignmentScope").mockResolvedValue(undefined);
      mockRepo.resetAttempt.mockResolvedValue(undefined);

      await service.resetAttempt(mockSessionId, mockSekolahId, null, true);

      expect(mockRepo.resetAttempt).toHaveBeenCalledWith(mockSessionId);
    });
  });

  // ==========================================================================
  // 3. PROCTOR FORCE SUBMIT ATTEMPT
  // ==========================================================================
  describe("Proctor Force Submit Attempt", () => {
    it("allows the teacher to force submit a student session when time ends or student leaves", async () => {
      mockRepo.findSessionById.mockResolvedValue({
        id: mockSessionId,
        ujian_cbt_id: mockUjianId,
        status: "SEDANG_MENGERJAKAN",
      });

      mockRepo.findUjianById.mockResolvedValue({
        id: mockUjianId,
        penugasan_mengajar_id: mockPenugasanId,
      });

      vi.spyOn(service as any, "verifyTeacherAssignmentScope").mockResolvedValue(undefined);

      const mockGradedResult = {
        id: "01J000000000000000HASIL001",
        sesi_ujian_id: mockSessionId,
        skor_mentah: 85,
        nilai_akhir: 85,
        apakah_tuntas: true,
      };

      mockRepo.submitAttempt.mockResolvedValue(mockGradedResult);

      const result = await service.forceSubmitAttempt(
        mockSessionId,
        mockSekolahId,
        mockGuruOwnerId,
        false
      );

      expect(mockRepo.submitAttempt).toHaveBeenCalledWith(mockSessionId);
      expect(result.nilai_akhir).toBe(85);
    });

    it("throws error when trying to force submit an already completed session", async () => {
      mockRepo.findSessionById.mockResolvedValue({
        id: mockSessionId,
        ujian_cbt_id: mockUjianId,
        status: "DIKUMPULKAN",
      });

      mockRepo.findUjianById.mockResolvedValue({
        id: mockUjianId,
        penugasan_mengajar_id: mockPenugasanId,
      });

      vi.spyOn(service as any, "verifyTeacherAssignmentScope").mockResolvedValue(undefined);

      await expect(
        service.forceSubmitAttempt(mockSessionId, mockSekolahId, mockGuruOwnerId, false)
      ).rejects.toThrow(CbtAttemptClosedError);
    });
  });

  // ==========================================================================
  // 4. PROCTOR MONITORING ROSTER INVARIANT
  // ==========================================================================
  describe("Proctor Monitoring Roster", () => {
    it("returns all attempts and details for the live proctor screen", async () => {
      vi.spyOn(service, "getExamDetail").mockResolvedValue({
        id: mockUjianId,
        judul: "Ujian Matematika Wajib",
        durasi_menit: 90,
        kkm_kktp: 75,
        status: "DITERBITKAN",
        penugasan_mengajar_id: mockPenugasanId,
      } as any);

      mockRepo.findExamAttempts.mockResolvedValue([
        {
          id: mockSessionId,
          status: "SEDANG_MENGERJAKAN",
          siswa: { id: "siswa_1", nama_lengkap: "Ahmad", nisn: "1234567890" },
          hasil: null,
          integrityEvents: [],
          integrityEventCount: 0,
          savedAnswersCount: 15,
        },
        {
          id: "unstarted_siswa_2",
          status: "BELUM_MULAI",
          siswa: { id: "siswa_2", nama_lengkap: "Budi", nisn: "1234567891" },
          hasil: null,
          integrityEvents: [],
          integrityEventCount: 0,
          savedAnswersCount: 0,
        },
      ]);

      const res = await service.getExamAttempts(mockUjianId, mockSekolahId, mockGuruOwnerId, false);

      expect(res.ujian.id).toBe(mockUjianId);
      expect(res.attempts).toHaveLength(2);
      expect(res.attempts[0].status).toBe("SEDANG_MENGERJAKAN");
      expect(res.attempts[1].status).toBe("BELUM_MULAI");
    });
  });
});
