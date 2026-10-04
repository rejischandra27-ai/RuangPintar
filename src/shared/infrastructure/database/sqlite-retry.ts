/**
 * Ruang Pintar — SQLite Concurrency & Busy Lock Retry Utility
 *
 * Designed to handle SQLite single-writer contention gracefully during
 * mass CBT autosaves and peak transaction submissions.
 */

export interface SqliteRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  isRetryableError?: (err: any) => boolean;
}

const DEFAULT_OPTIONS: Required<SqliteRetryOptions> = {
  maxRetries: 5,
  baseDelayMs: 40,
  maxDelayMs: 1200,
  isRetryableError: isSqliteBusyError,
};

/**
 * Mendeteksi apakah error disebabkan oleh lock contention SQLite atau Prisma transaction conflict.
 */
export function isSqliteBusyError(err: any): boolean {
  if (!err) return false;

  const msg = String(err.message || "").toLowerCase();
  const code = String(err.code || "").toUpperCase();

  // SQLite busy or locked
  if (
    msg.includes("sqlite_busy") ||
    msg.includes("database is locked") ||
    msg.includes("busy_timeout") ||
    msg.includes("timed out waiting for a connection") ||
    msg.includes("write conflict") ||
    msg.includes("transaction already closed")
  ) {
    return true;
  }

  // Prisma transaction conflict / deadlock
  if (code === "P2034" || code === "P2028") {
    return true;
  }

  return false;
}

/**
 * Menjalankan operasi database dengan retry otomatis ber-exponential backoff dan random jitter.
 */
export async function withSqliteRetry<T>(
  operation: () => Promise<T>,
  options?: SqliteRetryOptions
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (err: any) {
      attempt++;

      if (attempt > config.maxRetries || !config.isRetryableError(err)) {
        throw err;
      }

      // Exponential backoff dengan random jitter untuk menghindari thundering herd
      const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * config.baseDelayMs);
      const delay = Math.min(config.maxDelayMs, exponentialDelay + jitter);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
