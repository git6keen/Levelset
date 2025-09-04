// === FILE: journalVector.ts
// Simple stub; swap with a real FAISS/DB adapter later.
export async function save(entry: {
  ts: number; text: string; mood: number; energy: number; stress: number; tags: string;
}): Promise<string> {
  // TODO: embed & upsert into vector store
  // Return a stable id for traceability.
  console.log("[journalVector.save] stub", entry);
  return "vec_" + Math.random().toString(36).slice(2);
}
