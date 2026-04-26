import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AIROrchestrator } from "./orchestrator.ts";

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
        const decisions = orchestrator.ingestEvent(body as any);
        respondJson(res, 200, decisions[0] ?? null);
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

      if (method === "POST" && url === "/demo/memory-capture") {
        respondJson(res, 200, orchestrator.runMemoryCaptureDemo());
        return;
      }

      if (method === "POST" && url === "/demo/consentful-action") {
        const body = (await readJson(req)) as { userResponse?: "yes" | "no" | "timeout" };
        respondJson(res, 200, orchestrator.runConsentfulActionDemo(body.userResponse));
        return;
      }

      respondJson(res, 404, { error: "Not found" });
    } catch (error) {
      console.error("Request handling failed", error);
      respondJson(res, 500, { error: "Internal server error" });
    }
  });
}
