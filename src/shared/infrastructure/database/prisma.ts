import { PrismaClient } from "@prisma/client";

// Ensure DIRECT_URL fallback for Postgres in serverless environments (e.g. Vercel)
if (typeof process !== "undefined" && process.env) {
  if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }
}

declare global {
  var __ruangPintarPrisma__: PrismaClient | undefined;
}

/**
 * Configure SQLite pragmas for performance, concurrency, foreign key enforcement, and data durability.
 */
export async function configureSqlitePragmas(client: PrismaClient): Promise<void> {
  // Enforce foreign key constraints
  await client.$queryRawUnsafe("PRAGMA foreign_keys = ON;");

  // Production-grade concurrency: Write-Ahead Logging (returns a result row in SQLite)
  await client.$queryRawUnsafe("PRAGMA journal_mode = WAL;");

  // Durability & Throughput baseline: synchronous NORMAL
  // With WAL mode active, NORMAL is 100% crash-safe against application crashes,
  // avoids fsync-per-commit bottleneck, and enables target P99 write latency < 200ms.
  await client.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");

  // Busy timeout to handle brief concurrent write locks
  await client.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return client;
}

export const prisma: PrismaClient = globalThis.__ruangPintarPrisma__ ?? createPrismaClient();

// Cached in production too: a warm serverless instance keeps globalThis between invocations,
// and Next.js can evaluate this module once per server bundle. Without the cache each bundle
// would open its own connection pool to Supabase.
globalThis.__ruangPintarPrisma__ = prisma;

export default prisma;
