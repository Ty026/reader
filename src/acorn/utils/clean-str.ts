export function cleanStr<T extends any>(input: T): T {
  if (typeof input !== "string") {
    return input;
  }

  const unescaped = input.trim().replace(/&[#0-9a-zA-Z]+;/g, (entity) => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = entity;
    return textarea.value;
  });

  return unescaped.replace(/[\x00-\x1F\x7F-\x9F]/g, "") as T;
}
