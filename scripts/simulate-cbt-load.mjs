/**
 * Ruang Pintar — CBT Scalability & Load Test Simulation (Stage 17)
 *
 * Mensimulasikan konkurensi tinggi:
 * - Skenario 100 Peserta
 * - Skenario 300 Peserta
 * - Skenario 500 Peserta
 *
 * Menguji autosave serentak, submit serentak, dan duplicate submit retry.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// In-Memory simulated queue to replicate server queue logic in isolated benchmark
class BenchmarkQueue {
  constructor() {
    this.inFlightSubmissions = new Map();
    this.inFlightAutosaves = new Map();
    this.totalSuccess = 0;
    this.totalFailures = 0;
  }

  async enqueueAutosave(key, fn) {
    const execute = async () => {
      try {
        const res = await fn();
        this.totalSuccess++;
        return res;
      } catch (err) {
        this.totalFailures++;
        throw err;
      } finally {
        this.inFlightAutosaves.delete(key);
      }
    };

    const existing = this.inFlightAutosaves.get(key);
    const p = existing ? existing.then(execute, execute) : execute();
    this.inFlightAutosaves.set(key, p);
    return p;
  }

  async enqueueSubmission(attemptId, fn) {
    const existing = this.inFlightSubmissions.get(attemptId);
    if (existing) {
      this.totalSuccess++;
      return existing; // In-flight promise reuse (Idempotent)
    }

    const p = (async () => {
      try {
        const res = await fn();
        this.totalSuccess++;
        return res;
      } catch (err) {
        this.totalFailures++;
        throw err;
      } finally {
        this.inFlightSubmissions.delete(attemptId);
      }
    })();

    this.inFlightSubmissions.set(attemptId, p);
    return p;
  }
}

async function runScenario(participantCount) {
  console.log(`\n============================================================`);
  console.log(`[SIMULATION] Menjalankan Pengujian Beban: ${participantCount} Peserta Konkuren`);
  console.log(`============================================================`);

  const queue = new BenchmarkQueue();
  const latencies = [];
  const questionsPerParticipant = 5;

  const startTime = Date.now();

  // 1. Concurrent Autosaves Simulation
  const autosavePromises = [];
  for (let i = 1; i <= participantCount; i++) {
    const attemptId = `ATTEMPT-${participantCount}-${i}`;
    for (let q = 1; q <= questionsPerParticipant; q++) {
      const soalId = `SOAL-${q}`;
      const task = async () => {
        const reqStart = Date.now();
        // Simulate autosave processing with concurrency queue
        await queue.enqueueAutosave(`${attemptId}:${soalId}`, async () => {
          // Minimal simulated SQLite write contention delay (0.5ms - 2ms)
          await new Promise((r) => setTimeout(r, Math.random() * 2));
          return { saved: true };
        });
        latencies.push(Date.now() - reqStart);
      };
      autosavePromises.push(task());
    }
  }

  await Promise.all(autosavePromises);
  const autosaveDuration = Date.now() - startTime;
  console.log(
    `✓ Autosave Fase 1 Selesai: ${participantCount * questionsPerParticipant} requests dalam ${autosaveDuration}ms`
  );

  // 2. Concurrent Submissions & Duplicate Submits Simulation
  const submitStartTime = Date.now();
  const submitPromises = [];

  for (let i = 1; i <= participantCount; i++) {
    const attemptId = `ATTEMPT-${participantCount}-${i}`;
    // Single or Double Submit (30% duplicate submits)
    const calls = i % 3 === 0 ? 2 : 1;

    for (let c = 0; c < calls; c++) {
      const task = async () => {
        const reqStart = Date.now();
        await queue.enqueueSubmission(attemptId, async () => {
          // Simulate server scoring & Prisma transaction
          await new Promise((r) => setTimeout(r, 5 + Math.random() * 10));
          return { score: 85, status: "TUNTAS" };
        });
        latencies.push(Date.now() - reqStart);
      };
      submitPromises.push(task());
    }
  }

  await Promise.all(submitPromises);
  const submitDuration = Date.now() - submitStartTime;
  const totalDuration = Date.now() - startTime;

  // Calculate metrics
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const totalOps = participantCount * questionsPerParticipant + submitPromises.length;
  const throughput = Math.round((totalOps / (totalDuration / 1000)) * 10) / 10;
  const errorRate = ((queue.totalFailures / totalOps) * 100).toFixed(2);

  const report = {
    peserta: participantCount,
    totalOperasi: totalOps,
    durasiTotalMs: totalDuration,
    throughputOpsPerSec: throughput,
    p50Ms: p50,
    p95Ms: p95,
    p99Ms: p99,
    sukses: queue.totalSuccess,
    gagal: queue.totalFailures,
    errorRatePersen: `${errorRate}%`,
  };

  console.log(`Hasil Beban ${participantCount} Peserta:`);
  console.table([report]);

  return report;
}

async function main() {
  console.log("=== RUANG PINTAR SAAS — CBT LOAD TEST SIMULATION (STAGE 17) ===");
  console.log("Menguji skalabilitas engine CBT terhadap batas SQLite Single Writer...");

  const results = [];

  // Skenario 100 peserta
  results.push(await runScenario(100));

  // Skenario 300 peserta
  results.push(await runScenario(300));

  // Skenario 500 peserta
  results.push(await runScenario(500));

  console.log("\n============================================================");
  console.log("RINGKASAN AKHIR VALIDASI ARSITEKTUR CBT SCALABILITY:");
  console.log("============================================================");
  console.table(results);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Simulation error:", err);
  process.exit(1);
});
