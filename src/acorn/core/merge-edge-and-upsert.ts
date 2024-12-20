import { kGraphFieldSep } from "./constants";
import { handleEntityRelationSummary } from "./handle-entity-relation-summary";
import { splitStringByMarkers } from "./split-string-by-markers";
import type { GraphDB } from "./store/graph-db";
import type { Edge, Entity } from "./extract-entities";

export async function mergeEdgeAndUpsert(
  sourceId: string,
  targetId: string,
  edges: Edge[],
  graphDB: GraphDB<Entity, Edge>,
): Promise<Omit<Edge, "weight" | "sourceChunkId">> {
  const { weights, descriptions, sourceChunkIds, keywords } =
    await getExistingEdgeData(graphDB, sourceId, targetId);

  const allWeights = weights.concat(edges.map((e) => e.weight));
  const totalWeight = allWeights.reduce((sum, weight) => sum + weight, 0);

  const mergedDescription = mergeAttributes(
    descriptions,
    edges.map((e) => e.description),
    kGraphFieldSep,
  );
  const mergedKeywords = mergeAttributes(
    keywords,
    edges.map((e) => e.keywords),
    kGraphFieldSep,
  );
  const mergedSourceChunkIds = mergeAttributes(
    sourceChunkIds,
    edges.map((e) => e.sourceChunkId),
    kGraphFieldSep,
  );

  await ensureNodesExist(
    graphDB,
    sourceId,
    targetId,
    mergedSourceChunkIds,
    mergedDescription,
  );

  const finalDescription = await handleEntityRelationSummary(
    sourceId,
    mergedDescription,
  );

  const edge = {
    weight: totalWeight,
    description: finalDescription,
    keywords: mergedKeywords,
    sourceChunkId: mergedSourceChunkIds,
  };
  await graphDB.addEdge(sourceId, targetId, edge);

  return {
    sourceId,
    targetId,
    description: finalDescription,
    keywords: mergedKeywords,
  };
}

type EdgeDataList = {
  weights: number[];
  descriptions: string[];
  sourceChunkIds: string[];
  keywords: string[];
};
export async function getExistingEdgeData(
  graphDB: GraphDB<Entity, Edge>,
  sourceId: string,
  targetId: string,
): Promise<EdgeDataList> {
  if (await graphDB.hasEdge(sourceId, targetId)) {
    const exists = await graphDB.getEdge(sourceId, targetId);
    const sourceChunkIds = splitStringByMarkers(exists!.sourceChunkId, [
      kGraphFieldSep,
    ]);
    const keywords = splitStringByMarkers(exists!.keywords, [kGraphFieldSep]);
    return {
      weights: [exists!.weight],
      descriptions: [exists!.description],
      sourceChunkIds,
      keywords,
    };
  }
  return { weights: [], descriptions: [], sourceChunkIds: [], keywords: [] };
}

export function mergeAttributes<T>(
  edges: T[],
  existingValues: T[],
  separator: string,
): string {
  const uniqueValues = Array.from(new Set([...edges, ...existingValues]));
  uniqueValues.sort();
  return uniqueValues.join(separator);
}

export async function ensureNodesExist(
  graphDB: GraphDB<any, any>,
  sourceId: string,
  targetId: string,
  sourceChunkId: string,
  description: string,
) {
  for (const id of [sourceId, targetId]) {
    if (!(await graphDB.hasNode(id))) {
      await graphDB.addNode(id, {
        sourceId: sourceChunkId,
        description,
        type: '"UNKNOWN"',
      });
    }
  }
}
