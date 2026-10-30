import { createApp } from "./app.mjs";
import { readServerConfig } from "./config.mjs";
const { port, host, trustedProxies } = readServerConfig();
const { server } = createApp({ trustedProxies });
server.listen(port, host, () =>
  console.log(`Kodik B2B: http://127.0.0.1:${server.address().port}`),
);
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  console.log(
    "Kodik: draining active checks; queued work remains in the database.",
  );
  const force = setTimeout(() => {
    console.error(
      "Shutdown deadline reached; pending checks will resume after restart.",
    );
    process.exit(1);
  }, 45000);
  force.unref();
  server.close(() => {
    clearTimeout(force);
    process.exitCode = 0;
  });
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
