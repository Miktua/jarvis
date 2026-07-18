import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { getConfig } from "@/server/config";

type Capability = "data" | "schema";
const pools: Partial<Record<Capability, Pool>> = {};

function getPool(capability: Capability): Pool {
  if (!pools[capability]) {
    const config = getConfig();
    pools[capability] = new Pool({
      connectionString: capability === "data" ? config.DATABASE_DATA_URL : config.DATABASE_SCHEMA_URL,
      max: 5,
      application_name: `jarvis_${capability}`,
    });
  }
  return pools[capability]!;
}

export async function withTransaction<T>(capability: Capability, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool(capability).connect();
  try {
    await client.query("begin");
    await client.query("select set_config('statement_timeout', $1, true)", [String(getConfig().DB_STATEMENT_TIMEOUT_MS)]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}

export async function querySystem<T extends QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<T[]> {
  const pool = getPool("schema");
  const result = await pool.query<T>(text, [...values]);
  return result.rows;
}
