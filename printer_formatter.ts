const WIDTH = 40;
function wrapLine(text: string): string[] {
  const out: string[] = []; let line = "";
  for (const word of text.split(/\s+/)) {
    if (!line.length) { line = word; continue; }
    if ((line + " " + word).length <= WIDTH) line += " " + word; else { out.push(line); line = word; }
  }
  if (line) out.push(line); return out;
}
export function formatChecklist(name: string, items: { text: string; done: 0|1 }[]): string {
  const head = `CHECKLIST: ${name}`.slice(0, WIDTH);
  const lines: string[] = [head, ""];
  for (const it of items) { const prefix = `- [${it.done ? "x" : " "}] `; lines.push(...wrapLine(prefix + it.text)); }
  lines.push(""); return lines.join("\n");
}
