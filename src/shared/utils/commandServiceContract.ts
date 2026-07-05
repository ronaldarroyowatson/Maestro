import { loadCommandSchemas } from "@otto/command-service";

export const requiredMaestroCommandNames = [
  "maestro.install",
  "maestro.update",
  "maestro.repair",
  "maestro.uninstall"
] as const;

export async function validateMaestroCommandServiceContract(): Promise<{
  ok: boolean;
  missing: string[];
}> {
  const schemas = await loadCommandSchemas();
  const names = new Set(schemas.map((schema) => schema.name));
  const missing = requiredMaestroCommandNames.filter((name) => !names.has(name));
  return {
    ok: missing.length === 0,
    missing
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await validateMaestroCommandServiceContract();
  if (!result.ok) {
    console.error("Missing required command-service schemas:", result.missing.join(", "));
    process.exit(1);
  }
  console.log("Maestro command-service contract is valid");
}
