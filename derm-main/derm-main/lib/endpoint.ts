import { OpenAI } from "openai";

// Normalize the endpoint: strip any trailing "/v1" segments and trailing slashes.
// Accepts NEXT_PUBLIC_ENDPOINT_URL or ENDPOINT_URL (either name works).
export function getBaseEndpoint(): string {
  const raw = (process.env.NEXT_PUBLIC_ENDPOINT_URL ?? process.env.ENDPOINT_URL ?? "").trim();
  return raw.replace(/\/v1(\/+)?$/, "").replace(/\/+$/, "");
}

let openai: OpenAI | null = null;

// NOTE: The OpenAI client is cached as a module-level singleton for connection reuse.
// If environment variables (e.g. HF_TOKEN) are rotated at runtime, restart the server
// to pick up the new values — the cached client will not reflect in-process env changes.
export function getOpenAI(): OpenAI {
  if (!openai) {
    const base = getBaseEndpoint();
    const baseURL = base ? `${base}/v1` : undefined;
    const apiKey = process.env.HF_TOKEN;

    if (!baseURL || !apiKey) {
      throw new Error("Missing HF configuration (ENDPOINT_URL or HF_TOKEN)");
    }

    openai = new OpenAI({ baseURL, apiKey });
  }
  return openai;
}
