import "dotenv/config";
import { extractMemories } from "./extractor";
import { embedText } from "./embedder";
import { setupCollection, saveMemories, searchMemories } from "./store";

// ---- FAKE CONVERSATION — change this to test different inputs ----
const fakeConversation = `
User: I'm a frontend developer with 3 years of React experience.
User: I'm currently building a SaaS dashboard for small businesses.
User: I prefer concise answers with code examples, no long theory.
User: I'm based in Bhubaneswar, India and work in IST timezone.
User: I'm also learning TypeScript properly for the first time.
User: My goal is to get a job at an AI startup within 6 months.
`;

async function runPOC() {
  console.log("🚀 Starting Memory POC...\n");

  // STEP 1 — Setup Qdrant
  await setupCollection();

  // STEP 2 — Extract memories from text
  console.log("\n📝 Extracting memories from conversation...");
const memories = await extractMemories(fakeConversation);

// Add this filter
const filtered = memories.filter(m => m.confidence >= 0.75);
console.log(`Kept ${filtered.length} of ${memories.length} memories after confidence filter`);

// Use filtered from here on
const memoriesWithVectors = await Promise.all(
  filtered.map(async (memory) => ({
    ...memory,
    vector: await embedText(memory.content),
  }))
);
  console.log(`✅ Embedded ${memoriesWithVectors.length} memories`);

  // STEP 4 — Save to Qdrant
  console.log("\n💾 Saving to Qdrant...");
  await saveMemories(memoriesWithVectors);

  // STEP 5 — Test retrieval with different questions
  console.log("\n🔍 Testing retrieval...\n");

  const testQueries = [
    "What does this user prefer in terms of communication?",
    "What is this user currently building?",
    "What are this user's technical skills?",
    "What are this user's goals?",
    "Who is the user?"
  ];

  for (const query of testQueries) {
    console.log(`Query: "${query}"`);
    const queryVector = await embedText(query);
    const results = await searchMemories(queryVector, 2);
    results.forEach((r) => {
      console.log(`  → [${r.category}] ${r.content} (score: ${r.score?.toFixed(2)})`);
    });
    console.log("");
  }

  console.log("✅ POC Complete!");
}

runPOC().catch(console.error);