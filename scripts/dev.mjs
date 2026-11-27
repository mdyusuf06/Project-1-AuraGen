import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function launchService(name, cwd, commandLine, colorCode) {
  const child = spawn(commandLine, {
    cwd,
    stdio: ["inherit", "pipe", "pipe"],
    shell: true
  });

  const prefix = `\x1b[${colorCode}m[${name}]\x1b[0m`;

  child.stdout.on("data", (chunk) => {
    const lines = chunk.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`${prefix} ${line}`);
      }
    }
  });

  child.stderr.on("data", (chunk) => {
    const lines = chunk.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.error(`${prefix} ${line}`);
      }
    }
  });

  child.on("exit", (code) => {
    console.log(`${prefix} Exited with code ${code ?? 0}`);
  });

  return child;
}

console.log("🚀 Starting AuraGen Monorepo (Backend + Frontend)...");

const backend = launchService("BACKEND", path.join(rootDir, "backend"), "npm run dev", "36");
const frontend = launchService("FRONTEND", path.join(rootDir, "frontend"), "npm run dev", "35");

function killTree(child) {
  if (!child || !child.pid) return;
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    } catch {
      // ignore if already exited
    }
  } else {
    child.kill("SIGINT");
  }
}

function shutdown() {
  console.log("\nShutting down AuraGen services...");
  killTree(backend);
  killTree(frontend);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
