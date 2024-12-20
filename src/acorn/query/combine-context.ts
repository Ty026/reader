import { getLogger } from "../setting/logger";
import { csvToListOfList, listOfListToCSV } from "../utils/list-of-list-to-csv";

export function combineContext(
  localCtx: string[] | null,
  globalCtx: string[] | null,
) {
  if (!localCtx && !globalCtx) return null;

  let hlEntities = "";
  let hlRelationships = "";
  let hlTexts = "";
  let llEntities = "";
  let llRelationships = "";
  let llTexts = "";

  if (!localCtx) {
    getLogger().warn("High level context is empty");
  } else {
    hlEntities = localCtx[0];
    hlRelationships = localCtx[1];
    hlTexts = localCtx[2];
  }
  if (!globalCtx) {
    getLogger().warn("Low level context is empty");
  } else {
    llEntities = globalCtx[0];
    llRelationships = globalCtx[1];
    llTexts = globalCtx[2];
  }

  const combiedEntities = combineContexts(hlEntities, llEntities);
  const combiedRelationships = combineContexts(
    hlRelationships,
    llRelationships,
  );
  const combiedTexts = combineContexts(hlTexts, llTexts);

  const resultText = `
## Entities
${combiedEntities}

## Relationships
${combiedRelationships}

## Sources
${combiedTexts}

`;
  return resultText;
}

function combineContexts(hlEntities: string, llEntities: string) {
  const list1 = csvToListOfList(hlEntities);
  const list2 = csvToListOfList(llEntities);

  const header = list1?.[0] ?? list2?.[0];
  if (!header) return "";

  const combinedSet = new Set();
  const combined = [] as any[];
  list1?.forEach((row, i) => {
    if (i === 0) return;

    if (row[1] && !combinedSet.has(row[1])) {
      combined.push(row.splice(1));
      combinedSet.add(row[1]);
    }
  });
  combined.forEach((item, i) => item.unshift(i + 1));
  combined.unshift(header);
  return listOfListToCSV(combined);
}
