import type { ScanResult, ScanError } from "./types";

const ROOT = import.meta.dir.replace(/packages[/\\]scanner[/\\]src$/, "");

async function runCommand(
  cmd: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn({
    cmd,
    cwd,
  });
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  return { stdout, stderr, exitCode };
}

export async function runTypeCheck(): Promise<ScanResult> {
  const start = Date.now();
  const errors: ScanError[] = [];

  try {
    const { stdout, stderr, exitCode } = await runCommand(["bun", "run", "check-types"], ROOT);

    const output = stdout + stderr;

    if (exitCode !== 0) {
      const lines = output.split("\n");
      for (const line of lines) {
        if (line.includes("error TS") || line.includes("error:")) {
          errors.push(parseErrorLine(line, "type-check"));
        }
      }
    }

    return {
      type: "type-check",
      success: exitCode === 0 && errors.length === 0,
      errors,
      duration: Date.now() - start,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      type: "type-check",
      success: false,
      errors: [
        {
          message: error instanceof Error ? error.message : String(error),
          severity: "error",
        },
      ],
      duration: Date.now() - start,
      timestamp: Date.now(),
    };
  }
}

export async function runLint(): Promise<ScanResult> {
  const start = Date.now();
  const errors: ScanError[] = [];

  try {
    const { stdout, stderr, exitCode } = await runCommand(["bun", "run", "check"], ROOT);

    const output = stdout + stderr;

    if (exitCode !== 0) {
      const lines = output.split("\n");
      for (const line of lines) {
        if (line.includes("error") || line.includes("warning")) {
          errors.push(parseErrorLine(line, "lint"));
        }
      }
    }

    return {
      type: "lint",
      success: exitCode === 0 && errors.length === 0,
      errors,
      duration: Date.now() - start,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      type: "lint",
      success: false,
      errors: [
        {
          message: error instanceof Error ? error.message : String(error),
          severity: "error",
        },
      ],
      duration: Date.now() - start,
      timestamp: Date.now(),
    };
  }
}

export async function runBuild(): Promise<ScanResult> {
  const start = Date.now();
  const errors: ScanError[] = [];

  try {
    const { stdout, stderr, exitCode } = await runCommand(["bun", "run", "build"], ROOT);

    const output = stdout + stderr;

    if (exitCode !== 0) {
      const lines = output.split("\n");
      for (const line of lines) {
        if (line.includes("error") || line.includes("failed")) {
          errors.push(parseErrorLine(line, "build"));
        }
      }
    }

    return {
      type: "build",
      success: exitCode === 0 && errors.length === 0,
      errors,
      duration: Date.now() - start,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      type: "build",
      success: false,
      errors: [
        {
          message: error instanceof Error ? error.message : String(error),
          severity: "error",
        },
      ],
      duration: Date.now() - start,
      timestamp: Date.now(),
    };
  }
}

function parseErrorLine(line: string, _type: ScanResult["type"]): ScanError {
  const fileMatch = line.match(/([^\s:\\]+\.ts[x]?):(\d+):(\d+)/);
  const messageMatch = line.match(/(?:error|warning)\s+(?:TS\d+:\s*)?(.+)/i);

  return {
    file: fileMatch?.[1],
    line: fileMatch ? parseInt(fileMatch[2], 10) : undefined,
    column: fileMatch ? parseInt(fileMatch[3], 10) : undefined,
    message: messageMatch?.[1]?.trim() || line.trim(),
    severity: line.includes("warning") ? "warning" : "error",
  };
}

export async function runAllScans(): Promise<ScanResult[]> {
  const [typeCheck, lint, build] = await Promise.all([runTypeCheck(), runLint(), runBuild()]);
  return [typeCheck, lint, build];
}

export function aggregateResults(results: ScanResult[]): {
  totalErrors: number;
  hasErrors: boolean;
  summary: string;
} {
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const hasErrors = results.some((r) => !r.success);

  const summary = results
    .map((r) => {
      const status = r.success ? "✓" : "✗";
      const errors =
        r.errors.length > 0
          ? ` (${r.errors.length} ${r.errors.length === 1 ? "error" : "errors"})`
          : "";
      return `${status} ${r.type}: ${r.duration}ms${errors}`;
    })
    .join("\n");

  return { totalErrors, hasErrors, summary };
}
