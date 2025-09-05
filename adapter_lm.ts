// adapter_lm.ts - LMStudio integration adapter

import { generateToolRegistry } from "./tools.js";

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
    : `You are ${role}: a concise, helpful copilot for a personal productivity app.`;

  return [
    roleTone,
    ``,
    `# Available Tools`,
    registry,
    ``,
    `# When to Use Tools`,
    whenToAct,
    ``,
    `# Output Format`,
    outputRules,
    ``,
    fewShot,
    ctx,
  ].join("\n");
}

/** Single completion */
export async function chatOnce(params: ChatParams): Promise<string> {
  const { message, system, model = DEFAULT_MODEL, baseUrl, temperature = 0.7, top_p, max_tokens = 1000, stop } = params;
  const base = normalizeBase(baseUrl);

  const messages: Msg[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: message });

  const payload = {
    model,
    messages,
    temperature,
    max_tokens,
    stream: false,
    ...(top_p !== undefined && { top_p }),
    ...(stop && { stop }),
  };

  const resp = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "Network error");
    throw new Error(`LM API error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  const reply = data?.choices?.[0]?.message?.content || "";
  return String(reply).trim();
}

/** Streaming completion */
export async function chatStream(params: ChatParams): Promise<void> {
  const { message, system, model = DEFAULT_MODEL, baseUrl, temperature = 0.7, top_p, max_tokens = 2000, stop, onChunk } = params;
  
  if (!onChunk) {
    throw new Error("onChunk callback is required for streaming");
  }

  const base = normalizeBase(baseUrl);

  const messages: Msg[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: message });

  const payload = {
    model,
    messages,
    temperature,
    max_tokens,
    stream: true,
    ...(top_p !== undefined && { top_p }),
    ...(stop && { stop }),
  };

  const resp = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "Network error");
    throw new Error(`LM API error (${resp.status}): ${err}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) {
    throw new Error("No response body reader available");
  }

  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        
        const dataStr = trimmed.slice(6); // Remove "data: "
        if (dataStr === "[DONE]") continue;
        
        try {
          const parsed = JSON.parse(dataStr);
          const content = parsed?.choices?.[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }
        } catch (parseErr) {
          // Skip malformed JSON chunks
          continue;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}