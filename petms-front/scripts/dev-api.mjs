import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const backend = fileURLToPath(new URL("../../Petms-back/", import.meta.url));
const port = Number(process.env.PETFAVE_API_PORT || 8001);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Choose a valid PETFAVE_API_PORT.");
const origin = "http://localhost:" + port;
const frontend = process.env.PETFAVE_FRONTEND_URL || "http://localhost:5173";
const frontendOrigins = [...new Set([
  new URL(frontend).origin,
  "http://localhost:5173",
  "http://localhost:5174",
])];
const env = {
  ...process.env,
  APP_ENV: "local",
  APP_URL: origin,
  FRONTEND_URL: frontend,
  CORS_ALLOWED_ORIGINS: frontendOrigins.join(","),
  SANCTUM_STATEFUL_DOMAINS: [
    ...frontendOrigins.map((url) => new URL(url).host),
    "localhost:" + port,
  ].join(","),
  SESSION_COOKIE: "petfave_session",
  SESSION_DOMAIN: "localhost",
  SESSION_SECURE_COOKIE: "false",
  SESSION_SAME_SITE: "lax",
  GOOGLE_REDIRECT_URI: origin + "/auth/google/callback",
};
const phpOptions = [];
try {
  const result = spawnSync(
    "php",
    [
      "-r",
      'echo json_encode(["loaded"=>extension_loaded("Zend OPcache"), "directory"=>ini_get("extension_dir"), "binary"=>PHP_BINARY]);',
    ],
    { encoding: "utf8", windowsHide: true },
  );
  const probe = JSON.parse(result.stdout);
  const directory = path.isAbsolute(probe.directory)
    ? probe.directory
    : path.resolve(path.dirname(probe.binary), probe.directory);
  const extension = path.join(
    directory,
    process.platform === "win32" ? "php_opcache.dll" : "opcache.so",
  );
  if (probe.loaded || existsSync(extension)) {
    if (!probe.loaded) phpOptions.push("-d", "zend_extension=" + extension);
    phpOptions.push(
      "-d",
      "opcache.enable_cli=1",
      "-d",
      "opcache.validate_timestamps=1",
      "-d",
      "opcache.revalidate_freq=0",
    );
  }
} catch {
  // Development also works without the optional PHP opcode cache.
}
console.log("PetFave API: " + origin);
console.log("PetFave frontends: " + frontendOrigins.join(", "));
const server = spawn(
  "php",
  [
    ...phpOptions,
    "-S",
    "localhost:" + port,
    path.join(
      backend,
      "vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php",
    ),
  ],
  {
    cwd: path.join(backend, "public"),
    env,
    stdio: "inherit",
    windowsHide: true,
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.kill();
    process.exit();
  });
server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
server.on("exit", (code) => process.exit(code || 0));
