import ollama from "ollama";
import { Memory } from "./types.js";

export async function extractMemories(text: string): Promise<Memory[]> {
 const prompt = `
You are a memory extraction system. Your job is to extract 
factual, reusable information about the user.

STRICT RULES:
1. Only extract facts explicitly stated about the USER
2. Do NOT extract vague or implied facts
3. Write memories as complete, descriptive sentences
   BAD:  "TypeScript learning"
   GOOD: "Currently learning TypeScript for the first time"
4. Category MUST be exactly one of these 5 words:
   skill, preference, project, personal, goal
5. Confidence rules:
   1.0 = explicitly and clearly stated
   0.8 = clearly stated but slightly indirect
   0.75 = reasonably implied
   Below 0.75 = do NOT include
6. Return ONLY a JSON array. No backticks, no explanation.

TEXT TO ANALYZE:
${text}

RETURN FORMAT:
[
  { "content": "complete descriptive sentence", "category": "one of the 5 categories", "confidence": 0.0 }
]
`;

  const response = await ollama.chat({
    model: "llama3.2:1b",
    messages: [{ role: "user", content: prompt }],
    options: {
      temperature: 0.1, // low temp = consistent extraction
    },
  });

  const raw = response.message.content ?? "[]";

  // Clean response in case model adds backticks anyway
  const cleaned = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const memories: Memory[] = JSON.parse(cleaned);
    console.log(`\n✅ Extracted ${memories.length} memories`);
    return memories;
  } catch (err) {
    console.error("❌ Failed to parse memories. Raw output was:\n", raw);
    return [];
  }
}