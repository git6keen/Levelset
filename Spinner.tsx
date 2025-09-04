import React from "react";

export default function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
      <span className="spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
