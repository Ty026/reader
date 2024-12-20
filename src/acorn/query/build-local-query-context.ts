import { Embedding } from "../core/embedding/embedding";
import { Edge, Entity } from "../core/extract-entities";
import { DocumentStore } from "../core/store/document-store";
import { GraphDB } from "../core/store/graph-db";
import { VectorStore } from "../core/store/vector-db";
import { getLogger } from "../setting/logger";
import { listOfListToCSV } from "../utils/list-of-list-to-csv";
import {
  findMostRelatedEdgesFromEntities,
  findMostRelatedTextUnitFromEntities,
} from "./find-most-related";

export async function buildLocalQueryContext(
  embedding: Embedding,
  keywords: string,
  graph: GraphDB<Entity, Edge>,
  entitiesVecDb: VectorStore,
  chunks: DocumentStore,
  structed: true,
): Promise<[string, string, string] | null>;
export async function buildLocalQueryContext(
  embedding: Embedding,
  keywords: string,
  graph: GraphDB<Entity, Edge>,
  entitiesVecDb: VectorStore,
  chunks: DocumentStore,
  structed: false,
): Promise<string | null>;

export async function buildLocalQueryContext(
  embedding: Embedding,
  keywords: string,
  graph: GraphDB<Entity, Edge>,
  entitiesVecDb: VectorStore,
  chunks: DocumentStore,
  structed: boolean = false,
) {
  const logger = getLogger();
  logger.verbose("Embedding the keywords: " + keywords);
  const vector = await embedding.getTextEmbedding(keywords);
  logger.verbose("Get the keywords' vector: " + vector.length);
  const result = await entitiesVecDb.query({
    embedding: vector,
    topK: 10,
    mmrThreshold: 0.2,
  });
  if (!result.nodes?.length) {
    logger.error("No chunks");
    return null;
  }
  const entityNames = result.nodes!.map((n) => n.metadata?.name as string);

  const nodeDatas = [] as Entity[];
  const nodeDegrees = [] as number[];
  for (const entityName of entityNames) {
    const data = await graph.getNode(entityName);
    if (data) nodeDatas.push(data);
    const degree = await graph.getNodeDegree(entityName);
    nodeDegrees.push(degree);
  }

  const nodes = nodeDatas.map((item, i) => ({
    ...item,
    name: entityNames[i],
    rank: nodeDegrees[i],
  }));

  const useTextUnits = await findMostRelatedTextUnitFromEntities(
    nodes,
    chunks,
    graph,
  );

  const useRelations = await findMostRelatedEdgesFromEntities(nodes, graph);

  logger.verbose(
    `Local query uses ${nodes.length} entities, ${useRelations.length} relations, ${useTextUnits.length} text units`,
  );

  const entitySections: any[] = [
    ["id", "entity", "type", "description", "rank"],
  ];
  nodes.forEach((v, i) => {
    entitySections.push([
      i,
      v.name,
      v.type ?? "Unknown",
      v.description ?? "Unknown",
      v.rank,
    ]);
  });
  const entitiesContext = listOfListToCSV(entitySections);

  const relationSections: any[] = [
    ["id", "source", "target", "description", "keywords", "weight", "rank"],
  ];
  useRelations.forEach((v, i) => {
    relationSections.push([
      i,
      v.src_tgt[0],
      v.src_tgt[1],
      v.description,
      v.keywords,
      v.weight,
      v.rank,
    ]);
  });
  const relationsContext = listOfListToCSV(relationSections);

  const textUnitsSectionList = [["id", "content"]];
  useTextUnits.forEach((v, i) => {
    textUnitsSectionList.push([i, v.content]);
  });
  const textUnitsContext = listOfListToCSV(textUnitsSectionList);

  if (structed) {
    return [entitiesContext, relationsContext, textUnitsContext];
  }

  const resultText = `
## Entities
${entitiesContext}

## Relationships
${relationsContext}

## Sources
${textUnitsContext}

`;
  return resultText;
}
