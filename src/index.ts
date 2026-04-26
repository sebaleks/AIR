import { buildServer } from "./api/server";

const port = Number(process.env.PORT ?? 3000);
const server = buildServer();

server.listen(port, () => {
  console.log(`SenseRoute API listening on http://localhost:${port}`);
});
