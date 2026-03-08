function requireEnv(name: string) {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    process.exit(1);
  }

  return value;
}

export const QDRANT_URL = requireEnv("QDRANT_URL");
export const OLLAMA_URL = requireEnv("OLLAMA_URL");