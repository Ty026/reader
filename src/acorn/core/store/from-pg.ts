import type pg from "pg";
import type { IsomorphicDB } from "./isomorphic-db";

export function fromPG(client: pg.Client | pg.PoolClient): IsomorphicDB {
  const queryFn = async (sql: string, params?: any[]): Promise<any[]> => {
    return (await client.query(sql, params)).rows;
  };
  return {
    query: queryFn,
    begin: async (fn) => {
      await client.query("BEGIN");
      try {
        const result = await fn(queryFn);
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    },
    connect: () => client.connect(),
    close: async () => {
      if ("end" in client) {
        await client.end();
      } else if ("release" in client) {
        client.release();
      }
    },
    onCloseEvent: (fn) => {
      client.on("end", fn);
    },
  };
}
