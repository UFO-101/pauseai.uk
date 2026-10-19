import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { backUp, type TimestampColumns } from "./backup.ts";

// The container's HTTP interface, which only the Worker can reach:
//
//   POST /backup  {"timestamps": {"letters": "created_at"}}
//                 dumps the database and replies with the DumpReport, or a
//                 500 with why it failed
//   GET  /dump    the dump the last POST /backup made

export function backupServer(databaseUrl: string, dumpPath: string): Server {
  return createServer(async (request, response) => {
    try {
      if (request.method === "POST" && request.url === "/backup") {
        const { timestamps } = JSON.parse(await readBody(request)) as { timestamps: TimestampColumns };
        const report = await backUp(databaseUrl, dumpPath, timestamps);
        response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(report));
      } else if (request.method === "GET" && request.url === "/dump") {
        const { size } = await stat(dumpPath);
        response.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": size });
        createReadStream(dumpPath).pipe(response);
      } else {
        response.writeHead(404).end();
      }
    } catch (error) {
      response.writeHead(500, { "Content-Type": "text/plain" }).end((error as Error).message);
    }
  });
}

async function readBody(request: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body;
}
