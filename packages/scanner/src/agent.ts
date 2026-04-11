import { runAllScans, aggregateResults } from "./scanner";
import type { ScanResult } from "./types";

export interface SubagentResponse {
  success: boolean;
  results: ScanResult[];
  summary: {
    totalErrors: number;
    hasErrors: boolean;
    report: string;
  };
}

export async function errorScannerAgent(): Promise<SubagentResponse> {
  const results = await runAllScans();
  const { totalErrors, hasErrors, summary } = aggregateResults(results);

  const report = `
=== Error Scanner Subagent Report ===
Generated: ${new Date().toISOString()}

${summary}

${hasErrors ? `${totalErrors} total errors found across all checks.` : "All checks passed with zero errors!"}
`;

  return {
    success: !hasErrors,
    results,
    summary: {
      totalErrors,
      hasErrors,
      report: report.trim(),
    },
  };
}

export async function typeCheckAgent(): Promise<ScanResult> {
  const { runTypeCheck } = await import("./scanner");
  return runTypeCheck();
}

export async function lintAgent(): Promise<ScanResult> {
  const { runLint } = await import("./scanner");
  return runLint();
}

export async function buildAgent(): Promise<ScanResult> {
  const { runBuild } = await import("./scanner");
  return runBuild();
}
