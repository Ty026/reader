export function splitStringByMarkers(content: string, markers?: string[]) {
  if (!markers || markers.length === 0) return [content];
  const pattern = new RegExp(
    markers
      .map((marker) => marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|"),
    "g",
  );
  return content
    .split(pattern)
    .map((r) => r.trim())
    .filter((r) => r !== "");
}
