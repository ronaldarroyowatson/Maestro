import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function parseArgs(argv) {
  const parsed = {
    payloadPath: undefined,
    maestroPayloadPath: undefined,
    channel: "stable",
    command: "bootstrap"
  };

  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--payload" && i + 1 < argv.length) {
      parsed.payloadPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (current === "--maestro-payload" && i + 1 < argv.length) {
      parsed.maestroPayloadPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (current === "--channel" && i + 1 < argv.length) {
      parsed.channel = argv[i + 1];
      i += 1;
      continue;
    }
    positional.push(current);
  }

  if (positional.length > 0) {
    parsed.command = positional[0];
  }

  return parsed;
}

async function loadRunCli(runtimeRoot) {
  const mainPath = path.join(runtimeRoot, "otto-update", "dist", "main.js");
  if (!existsSync(mainPath)) {
    throw new Error(`Missing embedded Otto runtime: ${mainPath}`);
  }
  const mainModule = await import(pathToFileURL(mainPath).href);
  if (typeof mainModule.runCli !== "function") {
    throw new Error("Embedded Otto runtime does not expose runCli()");
  }
  return mainModule.runCli;
}

function resolvePayloadFile(embeddedPayloadPath, payloadField) {
  if (!payloadField) {
    return null;
  }
  return path.resolve(path.dirname(embeddedPayloadPath), payloadField);
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const runtimeRoot = path.resolve(path.dirname(__filename));
  const ottoRoot = path.resolve(runtimeRoot, "..");
  const args = parseArgs(process.argv.slice(2));

  const embeddedPayloadPath = path.resolve(ottoRoot, args.payloadPath ?? "payload.json");
  if (!existsSync(embeddedPayloadPath)) {
    throw new Error(`Missing embedded Otto payload: ${embeddedPayloadPath}`);
  }

  const embeddedPayload = JSON.parse(readFileSync(embeddedPayloadPath, "utf8"));
  const maestroPayloadPath = path.resolve(
    ottoRoot,
    args.maestroPayloadPath ?? resolvePayloadFile(embeddedPayloadPath, embeddedPayload.maestroPayload) ?? "maestro-payload.json"
  );

  if (!existsSync(maestroPayloadPath)) {
    throw new Error(`Missing Maestro payload for embedded Otto bootstrap: ${maestroPayloadPath}`);
  }

  const runCli = await loadRunCli(runtimeRoot);
  if (args.command === "bootstrap") {
    await runCli("config.show", {});
    await runCli("service.status", {});
    await runCli("maestro.install", {
      payloadPath: maestroPayloadPath,
      channel: args.channel
    });
    await runCli("service.start", {});
    return;
  }

  await runCli(args.command, {
    payloadPath: maestroPayloadPath,
    channel: args.channel
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});