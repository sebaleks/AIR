import { buildServer } from "./api/server.ts";

const port = Number(process.env.PORT ?? 3000);
const server = buildServer();

server.listen(port, () => {
  console.log(`AIR API listening on http://localhost:${port}`);
});
