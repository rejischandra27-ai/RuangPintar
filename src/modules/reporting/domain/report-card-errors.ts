/**
 * Ruang Pintar — Module M18: Digital Report Card Engine
 * Domain Errors
 */

export class ReportCardError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "ReportCardError";
  }
}

export class StudentPlacementNotFoundError extends ReportCardError {
  constructor() {
    super("Penempatan rombel aktif siswa tidak ditemukan.", "PLACEMENT_NOT_FOUND");
  }
}

export class UnauthorizedReportCardAccessError extends ReportCardError {
  constructor() {
    super("Akses ditolak: Anda tidak memiliki wewenang untuk rapor ini.", "UNAUTHORIZED_ACCESS");
  }
}

export class ReportCardValidationError extends ReportCardError {
  constructor(message: string) {
    super(message, "REPORT_CARD_VALIDATION_FAILED");
  }
}

export class ReportCardInvalidStateTransitionError extends ReportCardError {
  constructor(fromStatus: string, toStatus: string) {
    super(
      `Transisi status rapor dari ${fromStatus} ke ${toStatus} tidak sah.`,
      "INVALID_STATE_TRANSITION"
    );
  }
}
