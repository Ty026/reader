import { getLogger } from "./setting/logger";
import yaml from "js-yaml";
import { hashId } from "./utils/hashid";
import { chunkingByTokensize } from "./core/chunking-by-tokensize";
import { tokenizers } from "./core/tokenizer/tokenizer";
import {
  getChunkDB,
  getChunkVectorDB,
  getEntityVectorDB,
  getRelationshipVectorDB,
} from "./setting/get-db";
import { getEmbedding } from "./setting/get-embedding";
import { Edge, Entity, extractEntities } from "./core/extract-entities";
import { VectorStore } from "./core/store/vector-db";

export async function addDoc(raw: string) {
  getChunkVectorDB().embedModel = getEmbedding();
  getEntityVectorDB().embedModel = getEmbedding();
  getRelationshipVectorDB().embedModel = getEmbedding();

  await tokenizers.init();
  const logger = getLogger();

  const { content, metadata } = preprocess(raw);
  const docToAdd = {
    id: hashId(content),
    content,
  };
  logger.verbose(
    `Adding doc: '${docToAdd.content.slice(0, 16).replace(/\n/g, "")}...'`,
  );
  logger.verbose("metadata: " + JSON.stringify(metadata));

  let chunksToAdd = chunkingByTokensize(docToAdd.content);
  chunksToAdd.forEach(
    (c) =>
      (c.metadata = {
        ...c.metadata,
        docId: docToAdd.id,
        ...(metadata.source as any),
      }),
  );

  const existingChunkIds = await getChunkDB().existHashs(
    chunksToAdd.map((c) => c.id),
  );
  chunksToAdd = chunksToAdd.filter((v) => !existingChunkIds.includes(v.id));
  if (chunksToAdd.length === 0) {
    logger.log("All chunks already in the database");
    return false;
  }
  logger.log(`Chunks to add: ${chunksToAdd.length}`);

  await getChunkVectorDB().add(
    chunksToAdd.map((e) => ({ ...e, embedding: [] })),
  );

  const { entities, relationships } = await extractEntities(chunksToAdd);
  if (entities.length === 0 && relationships.length === 0) {
    logger.log("All entities and relationships already in the database");
    return false;
  }

  await addEntityVectors(entities, getEntityVectorDB());
  await addRelationshipVectors(relationships, getRelationshipVectorDB());

  await getChunkDB().batchAdd(chunksToAdd);
  return true;
}

// Extract metadata from markdown
function preprocess(markdownText: string) {
  let metadata: Record<string, string> = {};
  markdownText = markdownText.trim();
  if (markdownText.startsWith("---")) {
    const yamlEnd = markdownText.indexOf("---", 3);
    if (yamlEnd !== -1) {
      const yamlStr = markdownText.slice(3, yamlEnd);
      try {
        metadata = yaml.load(yamlStr) as Record<string, string>;
      } catch (e) {}
      markdownText = markdownText.slice(yamlEnd + 3);
    }
  }
  return { content: markdownText, metadata };
}

async function addEntityVectors(entities: Entity[], store: VectorStore) {
  getLogger().verbose("Adding Entity Vectors... ${entities.length}");
  const values = entities
    .map((e) => ({
      id: hashId(e.name),
      content: e.name + e.description,
      metadata: { name: e.name },
      embedding: [],
    }))
    .flat();
  await store.add(values);
  return;
}

async function addRelationshipVectors(
  relationships: Omit<Edge, "weight" | "sourceChunkId">[],
  store: VectorStore,
) {
  getLogger().verbose("Adding Relationship Vectors... ${relationships.length}");
  const values = relationships
    .map((e) => ({
      id: hashId(e.sourceId + e.targetId),
      content: e.sourceId + e.targetId,
      metadata: {
        sourceId: e.sourceId,
        targetId: e.targetId,
        conent: e.keywords + e.sourceId + e.targetId + e.description,
      },
      embedding: [],
    }))
    .flat();
  await store.add(values);
  return;
}
