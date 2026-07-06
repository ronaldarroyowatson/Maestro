import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const runtimeRoot = path.dirname(__filename);
  const commandServicePath = path.join(runtimeRoot, "otto-command-service", "dist", "index.js");

  if (!existsSync(commandServicePath)) {
    throw new Error(`Missing embedded command-service runtime: ${commandServicePath}`);
  }

  const commandService = await import(pathToFileURL(commandServicePath).href);
  const loader = commandService.loadCommandSchemas;
  if (typeof loader !== "function") {
    throw new Error("Embedded command-service does not expose loadCommandSchemas()");
  }

  const schemas = await loader();
  const names = schemas.map((schema) => schema.name).sort();
  for (const name of names) {
    console.log(name);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});