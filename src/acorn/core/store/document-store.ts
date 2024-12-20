import type { Chunk } from "../../schema/schema";
import { PgStore } from "./pg-store";
import type pg from "pg";

export type DocumentStoreParams = {
  schemaName?: string;
  collection?: string;
  tableName: string;
  client?: pg.Client | pg.PoolClient;
};

const kDefaultCollection = "data";

export class DocumentStore extends PgStore {
  schemaName: string;
  tableName: string;
  collection: string;

  constructor({
    schemaName = "public",
    collection = kDefaultCollection,
    tableName,
    client,
  }: DocumentStoreParams) {
    super({ shouldConnect: false, client: client }, false);
    this.schemaName = schemaName;
    this.tableName = tableName;
    this.collection = collection;
  }

  async existHashs(
    hash: string[],
    collection = kDefaultCollection,
  ): Promise<string[]> {
    const db = await this.lazydb();
    const sql = `SELECT hash FROM ${this.schemaName}.${this.tableName} WHERE hash = ANY($1) AND collection= $2`;
    const result = await db.query(sql, [hash, collection]);
    return result.map((row) => row.hash);
  }

  async getByHashs(hash: string[], collection = kDefaultCollection) {
    const db = await this.lazydb();
    const sql = `SELECT * FROM ${this.schemaName}.${this.tableName} WHERE hash = ANY($1) AND collection= $2`;
    const result = await db.query(sql, [hash, collection]);
    return result;
  }

  async batchAdd(nodes: Chunk[], collection = kDefaultCollection) {
    const db = await this.lazydb();
    return db.begin(async (query) => {
      let paramIndex = 1;
      const paramsTemplate = nodes
        .map(
          () =>
            `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
        )
        .join(", ");
      const sql = `
        INSERT INTO ${this.schemaName}.${this.tableName}
          (collection, hash, content, metadata)
        VALUES ${paramsTemplate}
        ON CONFLICT (hash) DO UPDATE SET
          collection = EXCLUDED.collection,
          content = EXCLUDED.content,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id;`;
      const values = nodes
        .map((node) => [
          collection,
          node.id,
          node.content,
          JSON.stringify(node.metadata || {}),
        ])
        .flat();
      return await query(sql, values);
    });
  }

  async add(
    hash: string,
    content: string,
    metadata: Record<string, any>,
    collection = kDefaultCollection,
  ) {
    const db = await this.lazydb();
    const sql = `
            INSERT INTO ${this.schemaName}.${this.tableName}
              (collection, hash, content, metadata)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (hash) DO UPDATE SET
              collection = EXCLUDED.collection,
              content = EXCLUDED.content,
              metadata = EXCLUDED.metadata,
              updated_at = CURRENT_TIMESTAMP
            RETURNING id`;
    await db.query(sql, [collection, hash, content, metadata]);
  }

  async performSetup(): Promise<void> {
    const db = this.db!;
    await db.query(`CREATE SCHEMA IF NOT EXISTS ${this.schemaName};`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS ${this.schemaName}.${this.tableName}(
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        collection VARCHAR,
        hash VARCHAR UNIQUE NOT NULL,
        content TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );`);
    const idxs = `
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_collection ON ${this.schemaName}.${this.tableName} (collection);
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_hash ON ${this.schemaName}.${this.tableName} (hash); `;
    await db.query(idxs);
  }
}
