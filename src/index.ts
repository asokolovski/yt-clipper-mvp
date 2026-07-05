import { app } from "./app.js";

const parsedPort = Number(process.env.PORT);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

app.listen(port, () => {
  console.log(`API server is running at http://localhost:${port}`);
});
