import { fromPG } from "./from-pg";
import { IsomorphicDB } from "./isomorphic-db";
import type pg from "pg";

type PgStoreOptions = {
  shouldConnect?: boolean | undefined;
  client?: pg.Client | pg.PoolClient;
};

export abstract class PgStore {
  protected db: IsomorphicDB | null = null;
  private connected = false;
  private setupPerformed = false;

  constructor(
    protected readonly options: PgStoreOptions = {},
    private vectorSupport: boolean = false,
  ) {
    if (options.client) {
      this.db = fromPG(options.client);
    }
  }

  async lazydb() {
    if (!this.db) {
      const pg = await import("pg");
      const { Client } = pg.default ?? pg;

      const client = new Client({
        connectionString: "postgres://ty:ty@localhost:5432/rag",
      });
      await client.connect();
      this.connected = true;

      if (!this.vectorSupport) {
        // create vector extension if needed
        const { registerTypes } = await import("pgvector/pg");
        await client.query("CREATE EXTENSION IF NOT EXISTS vector");
        await registerTypes(client);
      }

      this.db = fromPG(client);
    }
    if (this.db && !this.connected) {
      await this.db.connect();
      this.connected = true;
    }

    this.db.onCloseEvent(() => (this.connected = false));
    if (!this.setupPerformed) {
      await this.performSetup();
      this.setupPerformed = true;
    }

    return this.db;
  }

  abstract performSetup(): Promise<void>;
}
