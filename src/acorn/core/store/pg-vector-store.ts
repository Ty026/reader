import { registerType } from "pgvector/pg";
import type { Embedding } from "../embedding/embedding";
import type { NodeLike } from "../../schema/schema";
import type { IsomorphicDB } from "./isomorphic-db";
import {
  FilterCondition,
  type MetadataFilterValue,
  type VectorQuery,
  type VectorQueryResult,
  type VectorStore,
} from "./vector-db";
import { fromPG } from "./from-pg";
import { buildFilterClause, toPostgresCondition } from "./pg-utils";
import { env } from "@/acorn/utils/env";

type Params = {
  tableName: string;
  schemaName?: string;
  dimensions?: number;
};

export class PgVectorStore implements VectorStore {
  embedModel?: Embedding;
  private db?: IsomorphicDB;
  private connectionString = env("PG_CONN_STRING");
  private connected = false;
  private setupPerformed = false;
  private schemaName = "public";
  private tableName = "chunk_vec";
  private dimensions = 512;
  private collection = "data";
  constructor({ schemaName = "public", tableName, dimensions = 512 }: Params) {
    this.schemaName = schemaName;
    this.tableName = tableName;
    this.dimensions = dimensions;
  }

  async add(nodes: NodeLike[]): Promise<string[]> {
    const db = await this.getDB();
    if (!this.embedModel) throw new Error("Embedding model not set");
    await this.embedModel(nodes);

    let idx = 1;
    const placeholders = nodes
      .map(() => `($${idx++}, $${idx++}, $${idx++}, $${idx++})`)
      .join(", ");

    const sql = `
      INSERT INTO ${this.schemaName}.${this.tableName}
        (hash, collection, metadata, embeddings)
      VALUES ${placeholders}
      ON CONFLICT (hash) DO UPDATE SET
        collection = EXCLUDED.collection,
        metadata = EXCLUDED.metadata,
        embeddings = EXCLUDED.embeddings
      RETURNING id`;

    const values = nodes
      .map((n) => [
        n.id,
        this.collection,
        JSON.stringify(n.metadata),
        `[${n.embedding}]`,
      ])
      .flat();

    const result = await db.query(sql, values);
    return result.map((row) => row.id);
  }

  delete(refDocId: string, deleteOptions?: object): Promise<void> {
    throw new Error("Method not implemented.");
  }

  private async getDB() {
    if (!this.db) {
      const pg = await import("pg");
      const { Client } = pg.default ?? pg;
      const { registerTypes } = await import("pgvector/pg");
      const db = new Client({ connectionString: this.connectionString });
      await db.connect();
      this.connected = true;

      await db.query("CREATE EXTENSION IF NOT EXISTS vector");
      await registerType(db);
      this.db = fromPG(db);
    }

    if (this.db && !this.connected) {
      await this.db.connect();
      this.connected = true;
    }

    this.db.onCloseEvent(() => (this.connected = false));
    await this.performSetup();
    return this.db;
  }

  private async performSetup() {
    if (this.setupPerformed) return;
    this.setupPerformed = true;
    const db = this.db!;
    await db.query(`CREATE SCHEMA IF NOT EXISTS ${this.schemaName}`);
    await db.query(`CREATE TABLE IF NOT EXISTS ${this.schemaName}.${this.tableName}(
                     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                     hash VARCHAR UNIQUE ,
                     collection VARCHAR,
                     metadata JSONB DEFAULT '{}',
                     embeddings VECTOR(${this.dimensions})
                   )`);
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_collection ON ${this.schemaName}.${this.tableName} (collection);
       CREATE INDEX IF NOT EXISTS idx_${this.tableName}_hash ON ${this.schemaName}.${this.tableName} (hash);`,
    );
  }
  async query(query: VectorQuery): Promise<VectorQueryResult> {
    const embedding = `[${query.embedding}]`;
    const max = query.topK ?? 3;
    const params: MetadataFilterValue[] = [embedding];

    const whereClauses = this.collection ? ["collection = $2"] : [];
    if (this.collection.length) params.push(this.collection);

    const filterClauses: string[] = [];
    query.filters?.filters.forEach((filter, index) => {
      const paramIndex = params.length + 1;
      const { clause, param } = buildFilterClause(filter, paramIndex);
      filterClauses.push(clause);
      if (param) params.push(param);
    });

    if (filterClauses.length > 0) {
      const condition = toPostgresCondition(
        query.filters?.condition ?? FilterCondition.AND,
      );
      whereClauses.push(`(${filterClauses.join(` ${condition} `)})`);
    }

    const where =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const sql = `SELECT 
        v.*, 
        embeddings <=> $1 s 
      FROM ${this.schemaName}.${this.tableName} v
      ${where}
      ORDER BY s 
      LIMIT ${max}
    `;

    const db = await this.getDB();
    const results = await db.query(sql, params);
    // const minSimilarity = query.mmrThreshold ?? 0;
    // const filteredResults = results.filter((row) => 1 - row.s >= minSimilarity);

    const nodes = results.map((row) => ({
      id: row.hash,
      metadata: row.metadata,
      embedding: row.embeddings,
      content: "",
    }));

    return {
      nodes: nodes,
      similarities: results.map((row) => 1 - row.s),
      ids: nodes.map((n) => n.id),
    };
  }
}
