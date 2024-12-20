import type { GraphDB } from "./store/graph-db";
import { kGraphFieldSep } from "./constants";
import type { Edge, Entity } from "./extract-entities";
import { handleEntityRelationSummary } from "./handle-entity-relation-summary";
import { splitStringByMarkers } from "./split-string-by-markers";

export async function mergeNodeAndUpsert(
  entityName: string,
  nodes_data: Entity[],
  graphDB: GraphDB<Entity, Edge>,
): Promise<Entity> {
  const {
    types: alreadyEntityTypes,
    sourceIds: alreadySourceIds,
    descriptions: alreadyDescription,
  } = await getExistingNodeData(graphDB, entityName);
  const entityTypesFromNodes = nodes_data.map((node) => node.type);
  const allEntityTypes = entityTypesFromNodes.concat(alreadyEntityTypes);
  const mostFrequentEntityType = getMostFrequentEntityType(allEntityTypes);
  const { sourceId, description } = mergeSourceIdsAndDescriptions(
    nodes_data,
    alreadySourceIds,
    alreadyDescription,
  );
  const finalDescription = await handleEntityRelationSummary(
    entityName,
    description,
  );
  const node = {
    type: mostFrequentEntityType,
    description: finalDescription,
    sourceId,
  };
  await graphDB.addNode(entityName, node);
  return { ...node, name: entityName };
}

export async function getExistingNodeData(
  graphDB: GraphDB<Entity, Edge>,
  entityName: string,
): Promise<{ types: string[]; sourceIds: string[]; descriptions: string[] }> {
  const existNode = await graphDB.getNode(entityName);
  if (!existNode) return { types: [], sourceIds: [], descriptions: [] };
  return {
    types: [existNode.type],
    sourceIds: splitStringByMarkers(existNode.sourceId, [kGraphFieldSep]),
    descriptions: [existNode.description],
  };
}

export function getMostFrequentEntityType(entityTypes: string[]): string {
  const typeCounts = entityTypes.reduce(
    (counts, type) => {
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>,
  );

  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  return sortedTypes[0]![0];
}

export function mergeSourceIdsAndDescriptions(
  nodes_data: Entity[],
  alreadySourceIds: string[],
  alreadyDescriptions: string[],
): { sourceId: string; description: string } {
  const descriptions = Array.from(
    new Set([...nodes_data.map((d) => d.description), ...alreadyDescriptions]),
  ).sort();
  const sourceId = Array.from(
    new Set([...nodes_data.map((d) => d.sourceId), ...alreadySourceIds]),
  ).join(kGraphFieldSep);
  return { sourceId, description: descriptions.join(kGraphFieldSep) };
}
