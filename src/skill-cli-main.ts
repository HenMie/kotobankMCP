import { createDefaultKotobankService } from "./runtime-service.js";
import { runCli } from "./skill-cli.js";

async function main(): Promise<void> {
  const exitCode = await runCli({
    argv: process.argv.slice(2),
    service: createDefaultKotobankService(),
    stdout: process.stdout,
    stderr: process.stderr,
  });

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

void main();
