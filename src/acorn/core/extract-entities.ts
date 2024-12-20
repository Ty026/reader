import { toOpenAIMessage } from "./completion/to-openai-message";
import { ChatMemoryBuffer } from "./memory/memory";
import { entityContinueExtractPrompt } from "./prompts/entity-continue-extract-prompt";
import { entityExtractPrompt } from "./prompts/entity-extract-prompt";
import type { Chunk, Nullable } from "../schema/schema";
import { getCompletion } from "../setting/get-completion";
import { getLogger } from "../setting/logger";
import { getGraphDB } from "../setting/get-db";
import type { VectorStore } from "./store/vector-db";
import { tokenizers } from "./tokenizer/tokenizer";
import { cleanStr } from "../utils/clean-str";
import { hashId } from "../utils/hashid";
import { AutoMap } from "../utils/auto-map";
import {
  kCompletionDelim,
  kEntityTypes,
  kRecordDelim,
  kTupleDelim,
} from "./constants";
import { mergeEdgeAndUpsert } from "./merge-edge-and-upsert";
import { mergeNodeAndUpsert } from "./merge-nodes-then-upsert";
import { splitStringByMarkers } from "./split-string-by-markers";

const kMaxExtractionAttempts = 1;

export type Entity = {
  name: string;
  type: string;
  description: string;
  sourceId: string;
};

export type Edge = {
  sourceId: string;
  targetId: string;
  weight: number;
  description: string;
  keywords: string;
  sourceChunkId: string;
};

export async function extractEntities(chunks: Chunk[]) {
  getLogger().log("Extracting Entities...");

  let alreadyProcessed = 0;
  let alreadyEntities = 0;
  let alreadyRelations = 0;

  const mNodes: AutoMap<string, Entity[]>[] = [];
  const mEdges: AutoMap<string, Edge[]>[] = [];

  for (const c of chunks) {
    const { entities, relationships } = await extractFromSingleChunk(c);

    alreadyProcessed += 1;
    alreadyEntities += entities.size;
    alreadyRelations += relationships.size;
    getLogger().verbose(
      `Processed ${alreadyProcessed} chunks, ${alreadyEntities} entities(duplicated), ${alreadyRelations} relations(duplicated)\r`,
    );
    mNodes.push(entities);
    mEdges.push(relationships);
  }

  const maybeNodes = aggregateNodesEdgeses(mNodes);
  const maybeEdges = aggregateNodesEdgeses(mEdges, true);

  const all_entities = [] as Entity[];
  const all_relationships = [] as Omit<Edge, "weight" | "sourceChunkId">[];

  for (const [k, v] of maybeNodes) {
    const node = await mergeNodeAndUpsert(k, v, getGraphDB());
    all_entities.push(node);
  }

  for (const [k, v] of maybeEdges) {
    const keys = k.split(kTupleDelim);
    const edge = await mergeEdgeAndUpsert(keys[0]!, keys[1]!, v, getGraphDB());
    all_relationships.push(edge);
  }

  if (all_entities.length === 0) {
    getLogger().warn("No entities found, something is wrong");
  }
  if (all_relationships.length === 0) {
    getLogger().warn("No relationships found, something is wrong");
  }
  return { entities: all_entities, relationships: all_relationships };
}

export async function extractFromSingleChunk(chunk: Chunk) {
  const key = chunk.id;
  const content = chunk.content;

  const promptContext = {
    tuple_delimiter: kTupleDelim,
    record_delimiter: kRecordDelim,
    completion_delimiter: kCompletionDelim,
    entity_types: kEntityTypes.join(","),
  };

  const memory = new ChatMemoryBuffer();

  const prompt = entityExtractPrompt.format({ ...promptContext, content });
  const response = await getCompletion().chat({
    messages: [{ role: "user", content: prompt }],
  });
  getLogger().verbose("First extract: ");
  getLogger().verbose(response.message.content);

  let finalExtracted = response.message.content as string;
  await memory.put({ role: "user", content: prompt });
  await memory.put(response.message);

  // NOTE: when using deepseek, we don't need to supplement the extraction. It will generate some garbage information
  let attempt = 1;
  while (attempt < kMaxExtractionAttempts) {
    await memory.put({ role: "user", content: entityContinueExtractPrompt });
    const messages = await memory.getMessages();
    const attemptResponse = await getCompletion().chat({
      messages,
    });

    getLogger().verbose("Second extract: ");
    getLogger().verbose(attemptResponse.message.content);
    finalExtracted += attemptResponse.message.content as string;
    if (attempt === kMaxExtractionAttempts - 1) break;
    // TODO: continue extract
    await memory.put(response.message);
    attempt++;
  }

  const lines = splitStringByMarkers(finalExtracted, [
    kRecordDelim,
    kCompletionDelim,
  ]);

  const entities = new AutoMap<string, Entity[]>(() => []);
  const relationships = new AutoMap<string, Edge[]>(() => []);
  for (const line of lines) {
    const [node, edge] = extractEntityOrRelationship(line);
    if (node) {
      node.sourceId = chunk.id;
      entities.get(node.name).push(node);
    }
    if (edge) {
      const key = `${edge.sourceId}${kTupleDelim}${edge.targetId}`;
      relationships.get(key).push(edge);
      edge.sourceChunkId = chunk.id;
    }
  }

  return { entities, relationships };
}

export function extractEntityOrRelationship(
  line: string,
): [Nullable<Entity>, Nullable<Edge>] {
  // remove `()`
  const match = line.match(/\((.*)\)/);
  if (!match) return [null, null];
  const record = match[1]!;

  const components = splitStringByMarkers(record, [kTupleDelim]);
  const entity = recognizeEntity(components);
  if (entity) return [entity, null];
  const relationship = recognizeRelationship(components);
  if (relationship) return [null, relationship];
  return [null, null];
}

export function recognizeEntity(components: string[]): Nullable<Entity> {
  if (components.length < 4 || components[0] != '"entity"') return null;
  const name = cleanStr(components[1]!.toUpperCase());
  if (!name.trim()) return null;
  const type = cleanStr(components[2]!.toUpperCase());
  const description = cleanStr(components[3]!);
  return {
    name,
    type,
    description,
    sourceId: "",
  };
}

export function recognizeRelationship(components: string[]): Nullable<Edge> {
  if (components.length < 5 || components[0] != '"relationship"') return null;
  const sourceId = cleanStr(components[1]!.toUpperCase());
  const targetId = cleanStr(components[2]!.toUpperCase());
  const description = cleanStr(components[3]!);
  const keywords = cleanStr(components[4]!);
  const weightStr = components[components.length - 1]!;
  const isFloat = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[Ee][+-]?\d+)?/;
  const weight = isFloat.test(weightStr) ? Number(weightStr) : 1;
  return {
    sourceId,
    targetId,
    weight,
    description,
    keywords,
    sourceChunkId: "",
  };
}

export function aggregateNodesEdgeses<T>(
  nodes: AutoMap<string, T[]>[],
  isEdge = false,
) {
  const result = new Map<string, T[]>();
  for (const m of nodes) {
    for (const [k, v] of m) {
      let key = k;
      if (isEdge) {
        const [nodeA, nodeB] = k.split(kTupleDelim).sort();
        key = `${nodeA}${kTupleDelim}${nodeB}`;
      }
      if (result.has(key)) {
        const old_v = result.get(key)!;
        result.set(key, [...old_v, ...v]);
      } else {
        result.set(key, v);
      }
    }
  }
  return result;
}
