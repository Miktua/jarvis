import { createHash, timingSafeEqual } from "node:crypto";

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function payloadHash(value: unknown): string { return createHash("sha256").update(canonicalJson(value)).digest("hex"); }
export function hashesEqual(a: string,b: string): boolean {
  const aa=Buffer.from(a,"hex"), bb=Buffer.from(b,"hex"); return aa.length===bb.length && timingSafeEqual(aa,bb);
}
