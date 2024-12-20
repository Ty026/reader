import { createHash } from "node:crypto";

export function hashId(context: string) {
  return createHash("md5").update(context).digest("hex");
}
