import { addDoc } from "@/acorn/add-doc";
import { advanceQuery } from "@/acorn/query/advance-query";
import { naiveQuery } from "@/acorn/query/naive-query";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  // const file = await readFile(
  //   join(process.cwd(), "../resources/chapters/reader.md"),
  //   { encoding: "utf8" },
  // );
  // await addDoc(file);
  // const res = await advanceQuery("谁适合阅读本书?", "local");
  // const result = await advanceQuery("国缘品牌如何从江苏走向全国？", "local");
  // for await (const r of result) {
  //   console.log(r.delta);
  // }

  return Response.json({ message: "Hello" });
}
