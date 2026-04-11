export interface ScanResult {
  type: "type-check" | "lint" | "build";
  success: boolean;
  errors: ScanError[];
  duration: number;
  timestamp: number;
}

export interface ScanError {
  file?: string;
  line?: number;
  column?: number;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface ScannerConfig {
  parallelism?: number;
  timeout?: number;
}
