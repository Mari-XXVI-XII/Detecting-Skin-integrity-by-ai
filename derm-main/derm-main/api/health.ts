import type { VercelRequest, VercelResponse } from "@vercel/node";

// Normalize the endpoint: strip any trailing "/v1" segments and trailing slashes.
// Accepts NEXT_PUBLIC_ENDPOINT_URL or ENDPOINT_URL (either name works in Vercel env settings).
function getBaseEndpoint(): string {
  const raw = (process.env.NEXT_PUBLIC_ENDPOINT_URL ?? process.env.ENDPOINT_URL ?? "").trim();
  return raw.replace(/\/v1(\/+)?$/, "").replace(/\/+$/, "");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const endpoint = getBaseEndpoint();
  if (!endpoint) {
    return res.status(503).json({ status: "Offline", error: "Endpoint not configured. Set NEXT_PUBLIC_ENDPOINT_URL (or ENDPOINT_URL) in your Vercel environment variables." });
  }

  try {
    // Probe the OpenAI-compatible models endpoint to verify the HF endpoint is ready
    const response = await fetch(`${endpoint}/v1/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` },
    });

    if (response.ok) {
      res.json({ status: "Online" });
    } else {
      const errorText = await response.text();
      res.status(response.status).json({
        status: "Offline",
        error: `Health check failed: ${response.statusText}`,
        details: errorText,
      });
    }
  } catch (error: any) {
    console.error("Health check error:", error);
    res.status(503).json({ status: "Offline", error: "Connection failed", details: error.message || error });
  }
}
