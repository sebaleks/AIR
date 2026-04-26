import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { AIROrchestrator } from "./orchestrator";

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function respondJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}

export function buildServer(orchestrator = new AIROrchestrator()) {
  return createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const url = req.url ?? "/";

      if (method === "POST" && url === "/events") {
        const body = await readJson(req);
        const decision = orchestrator.ingestEvent(body as any);
        respondJson(res, 200, decision);
        return;
      }

      if (method === "GET" && url === "/state") {
        respondJson(res, 200, orchestrator.getState());
        return;
      }

      if (method === "POST" && url === "/demo/leaving-mode") {
        respondJson(res, 200, { decisions: orchestrator.runLeavingModeDemo() });
        return;
      }

      respondJson(res, 404, { error: "Not found" });
    } catch (error) {
      console.error("Request handling failed", error);
      respondJson(res, 500, { error: "Internal server error" });
    }
  });
}
