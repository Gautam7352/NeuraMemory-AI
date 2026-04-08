const fs = require('fs');
const file = 'server/src/utils/embeddings.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  /export async function generateEmbedding\(text: string\): Promise<number\[\]> \{\n  const result = await generateEmbeddings\(\[text\]\);\n  if \(result\.length === 0\) \{\n    throw new AppError\(500, 'Embedding generation returned no result\.'\);\n  \}\n  return result\[0\];\n\}/g,
  `export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await generateEmbeddings([text]);
  const first = result[0];
  if (!first) {
    throw new AppError(500, 'Embedding generation returned no result.');
  }
  return first;
}`
);
fs.writeFileSync(file, code);
console.log("Patched.");
