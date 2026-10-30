import { spawn } from "node:child_process";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "localhost",
    "--port",
    "5184",
    "--strictPort",
  ],
  {
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, VITE_API_URL: "http://localhost:8011" },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.kill();
    process.exit();
  });
server.on("exit", (code) => process.exit(code || 0));
