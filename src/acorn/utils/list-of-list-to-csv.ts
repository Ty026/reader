export function listOfListToCSV(data: any[][]) {
  const escape = (value: string | number) => {
    if (typeof value === "number") return value;
    if (value.includes(",") || value.includes("\n") || value.includes('"'))
      return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const csv = data.map((row) => row.map(escape).join(",")).join("\n");
  return csv;
}

export function csvToListOfList(csv: string): any[][] {
  const lines = csv.split("\n");
  const result: any[][] = [];

  for (const line of lines) {
    const row: any[] = [];
    let currentCell = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            currentCell += '"';
            i += 2;
          } else {
            inQuotes = false;
            i++;
          }
        } else {
          currentCell += char;
          i++;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
          i++;
        } else if (char === ",") {
          row.push(tryConvertStringToNumber(currentCell));
          currentCell = "";
          i++;
        } else {
          currentCell += char;
          i++;
        }
      }
    }
    row.push(tryConvertStringToNumber(currentCell));
    result.push(row);
  }

  return result;
}

function tryConvertStringToNumber(value: string): string | number {
  const num = Number(value);
  return isNaN(num) ? value : num;
}
