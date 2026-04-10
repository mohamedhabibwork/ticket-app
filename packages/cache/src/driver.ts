export interface CacheDriver {
  name: "redis" | "memory";
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  close(): Promise<void>;
}

export interface DriverOptions {
  prefix?: string;
  ttl?: number;
}
