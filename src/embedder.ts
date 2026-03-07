import ollama from "ollama";

export async function embedText(text: string): Promise<number[]> {
  const response = await ollama.embeddings({
    model: "nomic-embed-text",
    prompt: text,
  });

  return response.embedding; // 768 dimensions (nomic-embed-text)
}