import dotenv from "dotenv";
dotenv.config();

function requireEnv(name:string) {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    console.error(`❌ Environment variable ${name} is missing or empty`);
    process.exit(1);
  }

  return value;
}

export const QDRANT_URL = requireEnv("QDRANT_URL");
export const OLLAMA_URL = requireEnv("OLLAMA_URL");