import { eventNames } from "process";
import {
  kGraphFieldSep,
  kMaxTokenForTextUnit,
  kMaxTokenForGlobalContext,
  kMaxTokenForLocalContext,
} from "../core/constants";
import { Edge, Entity } from "../core/extract-entities";
import { splitStringByMarkers } from "../core/split-string-by-markers";
import { DocumentStore } from "../core/store/document-store";
import { GraphDB } from "../core/store/graph-db";
import { truncateListByTokensize } from "../core/truncate-list-by-tokensize";

type Node = Entity & { rank: number };

export async function findMostRelatedTextUnitFromEntities(
  nodes: Node[],
  chunks: DocumentStore,
  graph: GraphDB<Entity, Edge>,
) {
  const textUnits = nodes.map((dp) =>
    splitStringByMarkers(dp.sourceId, [kGraphFieldSep]),
  );
  const edgePromises = nodes.map((n) => graph.getNodeEdges(n.name));
  const edges = await Promise.all(edgePromises);
  const allOneHopNodes = Array.from(
    new Set(
      edges
        .flat()
        .map((e) => e?.[1])
        .filter(Boolean),
    ),
  );
  const datas = await Promise.all(
    allOneHopNodes.map((item) => graph.getNode(item)),
  );
  const allOneHopTextUnitsLookup = new Map<string, any>();
  allOneHopNodes.forEach((e, i) => {
    const data = datas[i];
    if (!data?.sourceId) return;
    const value = new Set(
      splitStringByMarkers(datas[i]!.sourceId, [kGraphFieldSep]),
    );
    allOneHopTextUnitsLookup.set(e, value);
  });

  const allTextUnitsLookup = new Map<string, any>();

  for (let i = 0; i < textUnits.length; i++) {
    const units = textUnits[i];
    let relation_counts = 0;
    for (const cid of units) {
      if (allTextUnitsLookup.has(cid)) continue;
      relation_counts = 0;
      const thisEdges = edges[i];
      if (thisEdges) {
        for (const edge of thisEdges) {
          if (edge?.[1]) {
            const set = allOneHopTextUnitsLookup.get(edge[1]);
            if (set?.has(cid)) relation_counts += 1;
          }
        }
      }

      const chunkData = await chunks.getByHashs([cid]);
      if (chunkData && chunkData[0] && chunkData[0].content) {
        allTextUnitsLookup.set(cid, {
          data: chunkData[0],
          order: i,
          relation_counts: relation_counts,
        });
      }
    }
  }

  let allTextUnits = [...allTextUnitsLookup.entries()].map(([k, v]) => {
    return {
      id: k,
      data: {
        tokens: v.data.metadata.tokens,
        content: v.data.content,
        chunk_order_index: v.data.metadata.orderIndex,
        full_doc_id: v.data.metadata.docId,
      },
      order: v.order,
      relation_counts: v.relation_counts,
    };
  });
  if (allTextUnits.length === 0) return [];

  allTextUnits.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return b.relation_counts - a.relation_counts;
  });
  allTextUnits = truncateListByTokensize(
    allTextUnits,
    (d) => d.data.content,
    kMaxTokenForTextUnit,
  );
  return allTextUnits.map((d) => d.data);
}

export async function findMostRelatedEdgesFromEntities(
  nodes: Node[],
  graph: GraphDB<Entity, Edge>,
) {
  const edgePromises = nodes.map((item) => graph.getNodeEdges(item.name));
  const allRelatedEdges = await Promise.all(edgePromises);

  const allEdges: string[][] = [];
  const seen = new Set();

  for (const edges of allRelatedEdges) {
    for (const e of edges) {
      const tuple = [...e];
      tuple.sort();
      const key = tuple.join(kGraphFieldSep);
      if (seen.has(key)) continue;
      seen.add(key);
      allEdges.push(tuple);
    }
  }
  const allEdgesPack: Edge[] = [];
  for (const e of allEdges) {
    const edge = await graph.getEdge(e[0], e[1]);
    if (edge) allEdgesPack.push(edge);
  }

  const allEdgeDegrees = [] as number[];

  for (const e of allEdges) {
    const degree = await graph.edgeDegree(e[0], e[1]);
    allEdgeDegrees.push(degree);
  }

  let allEdgesData = allEdgesPack
    .map((e, i) => {
      if (!e) return null;
      return {
        ...e,
        src_tgt: allEdges[i],
        rank: allEdgeDegrees[i],
      };
    })
    .filter(Boolean) as (Edge & { src_tgt: string[]; rank: number })[];

  allEdgesData.sort((a, b) => {
    if (a.rank !== b.rank) return b.rank - a.rank;
    return b.weight - a.weight;
  });

  const results = truncateListByTokensize(
    allEdgesData,
    (d) => d!.description,
    kMaxTokenForGlobalContext,
  );
  return results;
}

type EdgeData = {
  src_id: string;
  tgt_id: string;
  rank: number;
  keywords: string;
  weight: number;
  sourceChunkId: string;
  description: string;
};

export async function findMostRelatedEntitiesFromRelationships(
  edgeDatas: EdgeData[],
  graph: GraphDB<Entity, Edge>,
) {
  const entityNames = [] as string[];
  const seen = new Set();
  edgeDatas.forEach((e) => {
    if (!seen.has(e.src_id)) {
      entityNames.push(e.src_id);
      seen.add(e.src_id);
    }
    if (!seen.has(e.tgt_id)) {
      entityNames.push(e.tgt_id);
      seen.add(e.tgt_id);
    }
  });

  const nodeDataPromises = entityNames.map((n) => graph.getNode(n));
  const nodeDatas = await Promise.all(nodeDataPromises);
  const nodeDegreesPromises = entityNames.map((n) => graph.getNodeDegree(n));
  const nodeDegrees = await Promise.all(nodeDegreesPromises);

  const nodes = nodeDatas.map((item, i) => ({
    ...item,
    name: entityNames[i],
    rank: nodeDegrees[i],
  }));
  return truncateListByTokensize(
    nodes,
    (d) => d.description ?? "",
    kMaxTokenForLocalContext,
  );
}

export async function findRelatedTextUnitFromRelationships(
  edgeDatas: EdgeData[],
  chunksDb: DocumentStore,
  graph: GraphDB<Entity, Edge>,
) {
  const textUnits = edgeDatas.map((dp) =>
    splitStringByMarkers(dp.sourceChunkId, [kGraphFieldSep]),
  );

  const orderIndexs = new Map<string, number>();
  textUnits.flat().forEach((item, i) => {
    orderIndexs.set(item, i);
  });

  const textUnitHashIds = new Set(textUnits.flat());
  const chunks = await chunksDb.getByHashs(Array.from(textUnitHashIds));

  const allTextUnits = chunks.map((item) => {
    return {
      id: item.hash as string,
      data: {
        tokens: item.metadata.tokens as number,
        content: item.content as string,
        chunk_order_index: item.metadata.orderIndex as number,
        full_doc_id: item.metadata.docId as string,
      },
      order: orderIndexs.get(item.hash) ?? 0,
    };
  });
  allTextUnits.sort((a, b) => {
    return a.order - b.order;
  });

  const results = truncateListByTokensize(
    allTextUnits,
    (d) => d.data.content,
    kMaxTokenForLocalContext,
  );
  return results.map((item) => item.data);
}
