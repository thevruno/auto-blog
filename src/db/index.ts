import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { normalizeDatabaseUrl } from "@/lib/db-url";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: InstanceType<typeof Pool>;
  __arenaNextJsDb?: ReturnType<typeof drizzle>;
};

function createPool() {
  if (globalForDb.__arenaNextJsPostgresqlPool) {
    return globalForDb.__arenaNextJsPostgresqlPool;
  }

  const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
  return pool;
}

function createDb() {
  if (globalForDb.__arenaNextJsDb) {
    return globalForDb.__arenaNextJsDb;
  }

  const db = drizzle(createPool());
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsDb = db;
  }
  return db;
}

// Lazy initialization: the error only fires when db is actually queried,
// not when this module is imported at build time.
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

// For backward compatibility: `import { db } from "@/db"`
// Accessing any property triggers lazy init.
export const db = new Proxy({} as object, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
  apply(_, __, args) {
    return (getDb() as unknown as Function)(...args);
  },
}) as ReturnType<typeof drizzle>;
