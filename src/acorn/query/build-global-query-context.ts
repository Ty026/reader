import { Embedding } from "../core/embedding/embedding";
import { Edge, Entity } from "../core/extract-entities";
import { DocumentStore } from "../core/store/document-store";
import { GraphDB } from "../core/store/graph-db";
import { VectorStore } from "../core/store/vector-db";
import { truncateListByTokensize } from "../core/truncate-list-by-tokensize";
import { getLogger } from "../setting/logger";
import { kMaxTokenForGlobalContext } from "../core/constants";
import {
  findMostRelatedEntitiesFromRelationships,
  findRelatedTextUnitFromRelationships,
} from "./find-most-related";
import { listOfListToCSV } from "../utils/list-of-list-to-csv";

type TableColumns = [
  string | number,
  string | number,
  string | number,
  string | number,
  string | number,
  string | number,
  string | number,
];

type EntityTableColumns = [
  string | number,
  string | number,
  string | number,
  string | number,
  string | number,
];

export async function buildGlobalQueryContext(
  embedding: Embedding,
  keywords: string,
  graph: GraphDB<Entity, Edge>,
  _: VectorStore,
  relationshipsVecDb: VectorStore,
  chunks: DocumentStore,
  structed: false,
): Promise<string>;

export async function buildGlobalQueryContext(
  embedding: Embedding,
  keywords: string,
  graph: GraphDB<Entity, Edge>,
  _: VectorStore,
  relationshipsVecDb: VectorStore,
  chunks: DocumentStore,
  structed: true,
): Promise<[string, string, string]>;

export async function buildGlobalQueryContext(
  embedding: Embedding,
  keywords: string,
  graph: GraphDB<Entity, Edge>,
  _: VectorStore,
  relationshipsVecDb: VectorStore,
  chunks: DocumentStore,
  structed: true | false = false,
) {
  const embed = await embedding.getTextEmbedding(keywords);
  const results = await relationshipsVecDb.query({
    embedding: embed,
    topK: 10,
  });
  const edgeDatas = [] as any[];

  for (const c of results!.nodes!) {
    const metadata = c.metadata as any;
    const edge = await graph.getEdge(metadata.sourceId, metadata.targetId);
    edgeDatas.push(edge);
  }

  const degrees = [] as number[];
  for (const c of results!.nodes!) {
    const metadata = c.metadata as any;
    const degree = await graph.edgeDegree(metadata.sourceId, metadata.targetId);
    degrees.push(degree);
  }

  const smallestLength = Math.min(
    results.nodes!.length,
    edgeDatas.length,
    degrees.length,
  );
  const edges = Array.from({ length: smallestLength }, (_, i) => [
    results.nodes![i],
    edgeDatas[i],
    degrees[i],
  ])
    .filter((item) => !!item[1])
    .map((item) => ({
      src_id: item[0].metadata.sourceId,
      tgt_id: item[0].metadata.targetId,
      rank: item[2],
      ...item[1],
    }));

  edges.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    return b.weight - a.weight;
  });

  const truncatedEdges = truncateListByTokensize(
    edges,
    (e) => e.description,
    kMaxTokenForGlobalContext,
  );

  const useEntities = await findMostRelatedEntitiesFromRelationships(
    truncatedEdges,
    graph,
  );

  const useTextUnits = await findRelatedTextUnitFromRelationships(
    truncatedEdges,
    chunks,
    graph,
  );

  getLogger().verbose(
    `Global query uses ${useEntities.length} entites, ${truncatedEdges.length} relations, ${useTextUnits.length} text units`,
  );

  const table: TableColumns[] = [];
  table.push([
    "id",
    "source",
    "target",
    "description",
    "keywords",
    "weight",
    "rank",
  ]);

  truncatedEdges.forEach((v, i) => {
    table.push([
      i,
      v.src_id,
      v.tgt_id,
      v.description,
      v.keywords,
      v.weight,
      v.rank,
    ]);
  });
  const relationsContext = listOfListToCSV(table);

  const entitiesTable: EntityTableColumns[] = [];
  entitiesTable.push(["id", "entity", "type", "description", "rank"]);
  useEntities.forEach((v, i) => {
    entitiesTable.push([
      i,
      v.name,
      v.type ?? "Unknown",
      v.description ?? "Unknown",
      v.rank,
    ]);
  });
  const entitiesContext = listOfListToCSV(entitiesTable);

  const textUnitsTable: [number | string, string][] = [];
  textUnitsTable.push(["id", "content"]);
  useTextUnits.forEach((v, i) => {
    textUnitsTable.push([i, v.content]);
  });
  const textUnitsContext = listOfListToCSV(textUnitsTable);

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
