export function capStr(s: any, max: number): string { const v = typeof s === "string" ? s : String(s ?? ""); return v.length > max ? v.slice(0, max) : v; }
export function capNum(n: any, min: number, max: number): number { const v = Number(n ?? 0); return Math.max(min, Math.min(max, isFinite(v) ? v : 0)); }
