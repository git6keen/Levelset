// lmstudioAdapter.ts (drop-in replacement)

import { generateToolRegistry } from "./tools";

const DEFAULT_BASE = "http://127.0.0.1:1234";
const DEFAULT_MODEL = "lmstudio";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export type ChatParams = {
  message: string;
  system?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string[];
  onChunk?: (t: string) => void; // required for chatStream
};

// Ensure no trailing slash so `${base}/v1/...` is correct
function normalizeBase(u: string | undefined): string {
  return String(u || DEFAULT_BASE).replace(/\/+$/, "");
}

/** Role-aware prompt builder with toolcall protocol & examples. */
export function buildSystemPrompt(agent: string, context?: string): string {
  const role = (agent || "Assistant").trim();
  const ctx  = (context && context.trim()) ? `\n\n### Context\n${context.trim()}` : "";

  // Import tool registry from centralized tools module
  const registry = generateToolRegistry();

  const whenToAct = [
    `Use a tool when the user asks to create/update data (e.g., "make a task", "add to checklist", "save today's journal").`,
    `Do NOT call a tool for questions, summaries, or planning text—just reply normally.`,
    `If any required arg is missing, ask a brief follow-up instead of guessing.`,
  ].join(" ");

  const outputRules = [
    `When you decide to act, emit exactly ONE line of JSON (no prose) with this shape:`,
    `{"type":"toolcall","name":"<tool-name>","args":{...}}`,
    `No trailing commentary before or after that line.`,
  ].join("\n");

  const fewShot = [
    `# Examples (GOOD)`,
    `User: "Add a checklist item 'Take vitamins' to Morning Routine (id 5)"`,
    `Assistant: {"type":"toolcall","name":"checklists.addItem","args":{"checklist_id":5,"text":"Take vitamins"}}`,
    ``,
    `User: "Create a low priority task: Mop kitchen"`,
    `Assistant: {"type":"toolcall","name":"tasks.create","args":{"title":"Mop kitchen","priority":5}}`,
    ``,
    `User: "Log: felt tired, mood 3/10, energy 2/10, stress 7/10, tags: sick, cold"`,
    `Assistant: {"type":"toolcall","name":"journal.save","args":{"text":"felt tired","mood":3,"energy":2,"stress":7,"tags":"sick,cold"}}`,
    ``,
    `# Examples (NO TOOL)`,
    `User: "Summarize my tasks and suggest a plan"`,
    `Assistant: (plain text summary + plan; no toolcall)`,
  ].join("\n");

  const roleTone = role === "Kraken"
    ? `You are Kraken: bold, tactical, but still concise and compliant with the rules below.`
    : `You are ${role}: a concise, helpful copilot for a personal productivity app. Prefer short, actionable answers.`;

  return [
    roleTone,
    ``,
    `### Tool Registry`,
    registry,
    ``,
    `### When to act`,
    whenToAct,
    ``,
    `### Output rules`,
    outputRules,
    ``,
    fewShot,
    ctx
  ].join("\n");
}

async function postChat(body: any, baseUrl: string) {
  const base = normalizeBase(baseUrl);
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // If your LM Studio needs an API key, uncomment the next line and set env/API key accordingly:
      // "Authorization": `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
      "Accept": "text/event-stream, application/json;q=0.9, */*;q=0.8",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export async function chatOnce({
  message,
  system = "",
  model = DEFAULT_MODEL,
  baseUrl = DEFAULT_BASE,
  temperature,
  top_p,
  max_tokens,
  stop,
}: ChatParams): Promise<string> {
  const body: any = {
    model,
    stream: false,
    messages: [
      ...(system ? [{ role: "system", content: system } as Msg] : []),
      { role: "user", content: message } as Msg,
    ],
  };
  if (temperature != null) body.temperature = temperature;
  if (top_p != null) body.top_p = top_p;
  if (max_tokens != null) body.max_tokens = max_tokens;
  if (Array.isArray(stop) && stop.length) body.stop = stop;

  const res = await postChat(body, baseUrl);
  const data: any = await res.json();

  // OpenAI-like: choices[0].message.content
  let text =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    "";

  return String(text ?? "");
}

export async function chatStream({
  message,
  system = "",
  model = DEFAULT_MODEL,
  baseUrl = DEFAULT_BASE,
  temperature,
  top_p,
  max_tokens,
  stop,
  onChunk,
}: ChatParams): Promise<void> {
  if (!onChunk) throw new Error("onChunk handler required for chatStream()");

  const body: any = {
    model,
    stream: true,
    messages: [
      ...(system ? [{ role: "system", content: system } as Msg] : []),
      { role: "user", content: message } as Msg,
    ],
  };
  if (temperature != null) body.temperature = temperature;
  if (top_p != null) body.top_p = top_p;
  if (max_tokens != null) body.max_tokens = max_tokens;
  if (Array.isArray(stop) && stop.length) body.stop = stop;

  const res = await postChat(body, baseUrl);
  if (!res.body) throw new Error("no stream body");

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let done = false, buf = "";

  while (!done) {
    const { value, done: d } = await reader.read(); done = d;
    if (!value) continue;

    buf += dec.decode(value, { stream: !done });
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() || "";

    for (const raw of lines) {
      const s = raw.replace(/^data:\s?/, "").trim();
      if (!s) continue;
      if (s === "[DONE]") { done = true; break; }

      // Try to parse OpenAI-like SSE; fall back to raw push if JSON parsing fails
      try {
        const j = JSON.parse(s);
        // Prefer delta.content; fall back to text; finally message.content
        const delta =
          j?.choices?.[0]?.delta?.content ??
          j?.choices?.[0]?.text ??
          j?.choices?.[0]?.message?.content ??
          "";

        if (delta) onChunk(String(delta));
      } catch {
        // Some servers send non-JSON lines in SSE; just pass through
        onChunk(s);
      }
    }
  }
}

// alias for server SSE bridge
export const stream = chatStream;