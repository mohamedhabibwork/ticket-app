#!/usr/bin/env bun
import { errorScannerAgent } from "../src/agent";

async function main() {
  console.log("Starting error scan with subagents...\n");

  const result = await errorScannerAgent();

  console.log(result.summary.report);
  console.log("\nDetailed Results:");

  for (const scan of result.results) {
    console.log(`\n--- ${scan.type.toUpperCase()} ---`);
    console.log(`Status: ${scan.success ? "PASS" : "FAIL"}`);
    console.log(`Duration: ${scan.duration}ms`);
    console.log(`Errors found: ${scan.errors.length}`);

    if (scan.errors.length > 0) {
      console.log("\nErrors:");
      for (const error of scan.errors.slice(0, 20)) {
        const location = error.file ? `${error.file}:${error.line}:${error.column}` : "";
        console.log(`  ${location} ${error.message}`);
      }
      if (scan.errors.length > 20) {
        console.log(`  ... and ${scan.errors.length - 20} more errors`);
      }
    }
  }

  process.exit(result.success ? 0 : 1);
}

main();
