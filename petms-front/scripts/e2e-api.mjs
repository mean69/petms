import { spawn, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const backend = fileURLToPath(new URL("../../Petms-back/", import.meta.url));
const database = path.join(backend, "database", "petfave-e2e.sqlite");
if (!existsSync(database)) writeFileSync(database, "");
const env = {
  ...process.env,
  APP_ENV: "local",
  APP_DEBUG: "false",
  APP_URL: "http://localhost:8011",
  APP_KEY: "base64:MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  APP_CONFIG_CACHE: path.join(backend, "bootstrap/cache/e2e-config.php"),
  DB_CONNECTION: "sqlite",
  DB_DATABASE: database,
  DB_URL: "",
  DB_FOREIGN_KEYS: "true",
  CACHE_STORE: "array",
  SESSION_DRIVER: "file",
  SESSION_COOKIE: "petfave_e2e_session",
  SESSION_DOMAIN: "localhost",
  SESSION_SECURE_COOKIE: "false",
  SESSION_HTTP_ONLY: "true",
  SESSION_SAME_SITE: "lax",
  SANCTUM_STATEFUL_DOMAINS: "localhost:5173,localhost:5184,localhost:8011",
  FRONTEND_URL: "http://localhost:5173",
  CORS_ALLOWED_ORIGINS: "http://localhost:5173,http://localhost:5184",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  LOG_CHANNEL: "stderr",
};
for (const args of [
  ["artisan", "migrate", "--force", "--no-interaction"],
  ["artisan", "db:seed", "--class=DemoSeeder", "--force", "--no-interaction"],
]) {
  const result = spawnSync("php", args, {
    cwd: backend,
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
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
      "opcache.validate_timestamps=0",
    );
  }
} catch {
  // OPcache is an optional acceleration for this isolated, immutable test run.
}
const server = spawn(
  "php",
  [
    ...phpOptions,
    "-S",
    "localhost:8011",
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
server.on("exit", (code) => process.exit(code || 0));
