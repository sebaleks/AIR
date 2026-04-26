import test from "node:test";
import assert from "node:assert/strict";
import { buildServer } from "../src/api/server";

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = buildServer();

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Server did not bind to a TCP port");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

test("POST /events returns a policy decision", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "departure_signal",
        source: "calendar",
        payload: { minutes_to_departure: 4, preapproved: false },
        confidence: 0.9,
        privacy_risk: 0.2,
        timestamp: new Date().toISOString()
      })
    });

    assert.equal(response.status, 200);
    const body = (await response.json()) as { action: string };
    assert.ok(typeof body.action === "string");
  });
});

test("GET /state returns orchestrator state", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/state`);
    assert.equal(response.status, 200);

    const body = (await response.json()) as { events: unknown[]; memories: unknown[]; decisions: unknown[] };
    assert.ok(Array.isArray(body.events));
    assert.ok(Array.isArray(body.memories));
    assert.ok(Array.isArray(body.decisions));
  });
});

test("POST /demo/leaving-mode runs demo and returns decisions", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/demo/leaving-mode`, { method: "POST" });
    assert.equal(response.status, 200);

    const body = (await response.json()) as { decisions: unknown[] };
    assert.ok(Array.isArray(body.decisions));
    assert.ok(body.decisions.length > 0);
  });
});
