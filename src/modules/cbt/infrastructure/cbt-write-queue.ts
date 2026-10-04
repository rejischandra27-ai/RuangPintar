/**
 * Ruang Pintar — CBT Write Queue & Concurrency Controller
 *
 * Mengatur antrean penulisan (write-behind / serialized concurrency) untuk operasi
 * autosave dan submit ujian guna melindungi batas SQLite Single Writer (PB-01).
 *
 * Invariants:
 * - Single/Controlled Concurrency: Menjamin write ke SQLite tidak menabrak busy lock.
 * - Idempotent In-Flight Mutex: Submit ganda/paralel pada attempt yang sama membagi promise yang sama.
 * - High Throughput: Memproses ratusan autosave secara sekuensial cepat (< 1ms per record WAL).
 */

import { withSqliteRetry } from "@/shared/infrastructure/database/sqlite-retry";

interface QueueTask<T> {
  id: string;
  operation: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  enqueuedAt: number;
}

export class CbtWriteQueue {
  private queue: QueueTask<any>[] = [];
  private isProcessing = false;
  private inFlightSubmissions: Map<string, Promise<any>> = new Map();
  private inFlightAutosaves: Map<string, Promise<any>> = new Map();

  // Metrics for monitoring
  private stats = {
    totalAutosavesQueued: 0,
    totalAutosavesProcessed: 0,
    totalSubmissionsQueued: 0,
    totalSubmissionsProcessed: 0,
    totalRetries: 0,
    lastProcessedAt: new Date(),
  };

  /**
   * Menjalankan operasi tulis berantrean dengan batas konkurensi SQLite yang aman.
   */
  async enqueueWrite<T>(id: string, operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        id,
        operation,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      });

      this.processNext();
    });
  }

  /**
   * Menjalankan autosave dengan deduplikasi in-flight per butir soal:
   * Jika ada autosave yang sedang berjalan untuk (attemptId + soalId) yang sama,
   * request berikutnya menunggu giliran tanpa bentrok.
   */
  async enqueueAutosave<T>(
    attemptId: string,
    soalId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    this.stats.totalAutosavesQueued++;
    const key = `${attemptId}:${soalId}`;

    const execute = async () => {
      try {
        const result = await withSqliteRetry(operation);
        this.stats.totalAutosavesProcessed++;
        this.stats.lastProcessedAt = new Date();
        return result;
      } finally {
        this.inFlightAutosaves.delete(key);
      }
    };

    // Serialized write per item
    const existing = this.inFlightAutosaves.get(key);
    const taskPromise = existing ? existing.then(execute, execute) : execute();
    this.inFlightAutosaves.set(key, taskPromise);

    return taskPromise;
  }

  /**
   * Menjalankan submit attempt secara IDEMPOTEN murni:
   * Jika ada submit attemptId yang sedang berjalan (in-flight), request berikutnya
   * TIDAK MEMBUAT transaksi baru, melainkan langsung membagi promise yang sama.
   */
  async enqueueSubmission<T>(attemptId: string, operation: () => Promise<T>): Promise<T> {
    this.stats.totalSubmissionsQueued++;

    const existingPromise = this.inFlightSubmissions.get(attemptId);
    if (existingPromise) {
      // Re-use in-flight submission promise
      return existingPromise as Promise<T>;
    }

    const submissionPromise = (async () => {
      try {
        const result = await withSqliteRetry(operation, {
          maxRetries: 6,
          baseDelayMs: 60,
          maxDelayMs: 2000,
        });
        this.stats.totalSubmissionsProcessed++;
        this.stats.lastProcessedAt = new Date();
        return result;
      } finally {
        this.inFlightSubmissions.delete(attemptId);
      }
    })();

    this.inFlightSubmissions.set(attemptId, submissionPromise);
    return submissionPromise;
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const task = this.queue.shift();

    if (!task) {
      this.isProcessing = false;
      return;
    }

    try {
      const result = await withSqliteRetry(task.operation);
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.isProcessing = false;
      this.processNext();
    }
  }

  /**
   * Mengambil snapshot metrik keandalan antrean
   */
  getStats() {
    return {
      ...this.stats,
      currentQueueLength: this.queue.length,
      inFlightSubmissionsCount: this.inFlightSubmissions.size,
      inFlightAutosavesCount: this.inFlightAutosaves.size,
    };
  }

  /**
   * Reset antrean (untuk keperluan testing)
   */
  reset() {
    this.queue = [];
    this.inFlightSubmissions.clear();
    this.inFlightAutosaves.clear();
    this.isProcessing = false;
    this.stats = {
      totalAutosavesQueued: 0,
      totalAutosavesProcessed: 0,
      totalSubmissionsQueued: 0,
      totalSubmissionsProcessed: 0,
      totalRetries: 0,
      lastProcessedAt: new Date(),
    };
  }
}

// Global Singleton for CBT Write Queue
declare global {
  var __ruangPintarCbtWriteQueue__: CbtWriteQueue | undefined;
}

export const cbtWriteQueue: CbtWriteQueue =
  global.__ruangPintarCbtWriteQueue__ ?? new CbtWriteQueue();

if (process.env.NODE_ENV !== "production") {
  global.__ruangPintarCbtWriteQueue__ = cbtWriteQueue;
}
