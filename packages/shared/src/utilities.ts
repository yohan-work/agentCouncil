import { createHash, randomUUID } from "node:crypto";

const secretKeyPattern = /^(api[_-]?key|authorization|password|secret|access[_-]?token|refresh[_-]?token)$/iu;
const bearerPattern = /Bearer\s+[A-Za-z0-9._~+/-]+=*/giu;
const openAiKeyPattern = /sk-[A-Za-z0-9_-]{16,}/gu;

export type IdPrefix = "run" | "round" | "arun" | "claim" | "rebuttal" | "revision" | "trace";

export function createId(prefix: IdPrefix): string {
  return `${prefix}_${randomUUID()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, canonicalize(entryValue)]),
    );
  }
  return value;
}

export function stableStringify(value: unknown, space?: number): string {
  return JSON.stringify(canonicalize(value), null, space);
}

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashValue(value: unknown): string {
  return sha256(stableStringify(value));
}

export function redactText(value: string, maximumLength = 100_000): string {
  const redacted = value.replace(bearerPattern, "Bearer [REDACTED]").replace(openAiKeyPattern, "[REDACTED]");
  if (redacted.length <= maximumLength) {
    return redacted;
  }
  return `${redacted.slice(0, maximumLength)}\n[TRUNCATED ${redacted.length - maximumLength} chars]`;
}

export function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactText(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        secretKeyPattern.test(key) ? "[REDACTED]" : sanitizeValue(entryValue),
      ]),
    );
  }
  return value;
}
