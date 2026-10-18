import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCommandSchemas } from "@otto/command-service";

export const requiredMaestroCommandNames = [
  "maestro.install",
  "maestro.update",
  "maestro.repair",
  "maestro.uninstall"
] as const;

const CANONICAL_COMMAND_SERVICE_REPO = "../otto-command-service";

function resolveRepoRoot(): string {
  return path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
}

function readJsonFile<T = Record<string, unknown>>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export async function validateMaestroCommandServiceContract(): Promise<{
  ok: boolean;
  missing: string[];
  repoPathIssues: string[];
}> {
  const schemas = await loadCommandSchemas();
  const names = new Set(schemas.map((schema) => schema.name));
  const missing = requiredMaestroCommandNames.filter((name) => !names.has(name));

  const repoRoot = resolveRepoRoot();
  const packageJsonPath = path.join(repoRoot, "package.json");
  const commandManifestPath = path.join(repoRoot, "otto", "maestro-commands.json");
  const payloadManifestPath = path.join(repoRoot, "otto", "maestro-payload.json");

  const packageJson = readJsonFile<{ dependencies?: Record<string, string> }>(packageJsonPath);
  const commandManifest = readJsonFile<{ sourceOfTruth?: { repo?: string } }>(commandManifestPath);
  const payloadManifest = readJsonFile<{ commands?: { sourceOfTruth?: { repo?: string } } }>(payloadManifestPath);

  const repoPathIssues: string[] = [];
  const packageEntry = packageJson.dependencies?.["@otto/command-service"];
  if (packageEntry !== "file:../otto-command-service") {
    repoPathIssues.push(`package.json dependency mismatch: ${packageEntry ?? "missing"}`);
  }

  const manifestRepo = commandManifest.sourceOfTruth?.repo;
  if (manifestRepo !== CANONICAL_COMMAND_SERVICE_REPO) {
    repoPathIssues.push(`otto/maestro-commands.json sourceOfTruth.repo mismatch: ${manifestRepo ?? "missing"}`);
  }

  const payloadRepo = payloadManifest.commands?.sourceOfTruth?.repo;
  if (payloadRepo !== CANONICAL_COMMAND_SERVICE_REPO) {
    repoPathIssues.push(`otto/maestro-payload.json commands.sourceOfTruth.repo mismatch: ${payloadRepo ?? "missing"}`);
  }

  return {
    ok: missing.length === 0 && repoPathIssues.length === 0,
    missing,
    repoPathIssues
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await validateMaestroCommandServiceContract();
  if (!result.ok) {
    if (result.missing.length > 0) {
      console.error("Missing required command-service schemas:", result.missing.join(", "));
    }
    if (result.repoPathIssues.length > 0) {
      console.error("Command-service source-of-truth path drift:", result.repoPathIssues.join("; "));
    }
    process.exit(1);
  }
  console.log("Maestro command-service contract is valid");
}
