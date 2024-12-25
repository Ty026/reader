import { NextRequest } from "next/server";
import WebSocket, { WebSocketServer } from "ws";

// export async function GET(request: Request, response: Response) {
//   const wss = new WebSocketServer({ noServer: true });
//
//   console.log((request as any).socket);
//   // wss.handleUpgrade(
//   //   request as any,
//   //   (request as any).socket,
//   //   Buffer.alloc(0),
//   //   (ws) => {
//   //     // es.emit("connec")
//   //   },
//   // );
// }

export async function GET(req: NextRequest) {
  console.log((req as any).socket);
  return new Response("hello");
}
