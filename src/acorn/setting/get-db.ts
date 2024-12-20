import { DocumentStore } from "../core/store/document-store";
import { PgVectorStore } from "../core/store/pg-vector-store";
import { Neo4JStore } from "../core/store/neo4j-store";
import type { Edge, Entity } from "../core/extract-entities";

let localChunkDB = new DocumentStore({ tableName: "chunk" });
export function getChunkDB() {
  return localChunkDB;
}

let localChunksVectorDB = new PgVectorStore({ tableName: "chunk_vec" });
export function getChunkVectorDB() {
  return localChunksVectorDB;
}

let localGraphDB = new Neo4JStore<Entity, Edge>("data");
export function getGraphDB() {
  return localGraphDB;
}

let localEntityVectorDB = new PgVectorStore({ tableName: "entity_vec" });
export function getEntityVectorDB() {
  return localEntityVectorDB;
}

let localRelationshipVectorDB = new PgVectorStore({
  tableName: "relationship_vec",
});
export function getRelationshipVectorDB() {
  return localRelationshipVectorDB;
}
