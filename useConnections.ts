// useConnections.ts — tiny polling probe for TopNav dots (Proto3)
import { useEffect, useMemo, useState } from "react";

type ConnState = "ok" | "warn" | "err" | "unknown";
export type ConnInfo = { name: string; state: ConnState; detail?: string };

const OK = "#10b981", WARN = "#f59e0b", ERR = "#ef4444", GRAY = "#9ca3af";
export const stateColor = (s: ConnState) => s === "ok" ? OK : s === "warn" ? WARN : s === "err" ? ERR : GRAY;

function readBase(): string {
  try {
    const s = JSON.parse(localStorage.getItem("app.settings.v1") || "{}");
    return String(s?.aiEndpoint || "http://127.0.0.1:8001").replace(/\/+$/, "");
  } catch { return "http://127.0.0.1:8001"; }
}

async function probeAPI(base: string): Promise<ConnInfo> {
  try {
    const r = await fetch(`${base}/api/admin/health`, { cache: "no-store" });
    if (!r.ok) return { name: "API", state: "err", detail: `HTTP ${r.status}` };
    const j = await r.json();
    const wal = j?.db?.wal ? "WAL" : String(j?.db?.journal_mode || "").toUpperCase();
    const tasks = j?.counts?.tasks ?? "?";
    return { name: "API", state: "ok", detail: `${wal}, tasks:${tasks}` };
  } catch (e:any) {
    return { name: "API", state: "err", detail: String(e?.message || e) };
  }
}

function probeVite(): ConnInfo {
  try {
    // If UI is rendered under Vite dev with HMR
    const dev = (import.meta as any)?.env?.DEV;
    if (dev && (import.meta as any)?.hot) return { name: "Vite", state: "ok", detail: "HMR active" };
    return { name: "Vite", state: "ok", detail: "reachable" };
  } catch (e:any) {
    return { name: "Vite", state: "warn", detail: String(e?.message || e) };
  }
}

function probePrinter(): ConnInfo {
  return { name: "Thermal", state: "err", detail: "disconnected" };
}

export function useConnections(pollMs = 60000) {
  const base = useMemo(readBase, []);
  const [conns, setConns] = useState<ConnInfo[]>([
    { name: "API", state: "unknown" },
    { name: "Vite", state: "unknown" },
    { name: "Thermal", state: "unknown" },
  ]);

  async function refresh() {
    const a = await probeAPI(base);
    const v = probeVite();
    const t = probePrinter();
    setConns([a, v, t]);
  }

  useEffect(() => {
    let alive = true;
    refresh().catch(()=>{});
    const id = setInterval(() => { if (alive) refresh().catch(()=>{}); }, pollMs);
    return () => { alive = false; clearInterval(id); };
  }, [base, pollMs]);

  return { conns, refresh };
}
