export function serialize<T>(value: T): string {
  return JSON.stringify(value);
}

export function deserialize<T>(data: string): T {
  return JSON.parse(data) as T;
}

export function withPrefix(key: string, prefix: string): string {
  return `${prefix}:${key}`;
}
