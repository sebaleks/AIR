import { buildServer } from "./api/server";

const port = Number(process.env.PORT ?? 3000);
const server = buildServer();

server.listen(port, () => {
  console.log(`AIR API listening on http://localhost:${port}`);
});
