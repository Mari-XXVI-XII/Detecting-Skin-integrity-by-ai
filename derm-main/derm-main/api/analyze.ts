import type { VercelRequest, VercelResponse } from "@vercel/node";
import multer from "multer";
import { OpenAI } from "openai";

// Normalize the endpoint: strip any trailing "/v1" segments and trailing slashes.
// Accepts NEXT_PUBLIC_ENDPOINT_URL or ENDPOINT_URL (either name works in Vercel env settings).
function getBaseEndpoint(): string {
  const raw = (process.env.NEXT_PUBLIC_ENDPOINT_URL ?? process.env.ENDPOINT_URL ?? "").trim();
  return raw.replace(/\/v1(\/+)?$/, "").replace(/\/+$/, "");
}

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
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

// Disable Vercel's automatic body parsing so multer can handle multipart/form-data
export const config = {
  api: { bodyParser: false },
};

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function runMiddleware(req: VercelRequest, res: VercelResponse, fn: (req: any, res: any, next: (err?: any) => void) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) reject(result);
      else resolve(result);
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await runMiddleware(req, res, upload.single("image"));
  } catch (error: any) {
    return res.status(400).json({ error: "File upload error", details: error.message });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
    return res.status(400).json({ error: "Unsupported file type. Please upload a JPEG, PNG, or WebP image." });
  }

  const { age, sex, localization } = req.body;
  const base64Image = req.file.buffer.toString("base64");
  const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

  try {
    const client = getOpenAI();
    const model = process.env.NEXT_PUBLIC_MODEL_NAME || "model";

    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 32,
      messages: [
        {
          role: "system",
          content:
            "You are a board-certified dermatologist assistant. Analyze the dermoscopy image and return ONLY the diagnosis label — nothing else.\nLabels: Melanocytic Nevi (benign mole), Melanoma (malignant), Benign Keratosis, Basal Cell Carcinoma, Actinic Keratoses / Intraepithelial Carcinoma, Vascular Lesion, Dermatofibroma",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Metadata: Age: ${age || "Unknown"}, Sex: ${sex || "Unknown"}, Localization: ${localization || "Unknown"}. Please classify this skin lesion.`,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const diagnosis = response.choices[0]?.message.content?.trim();
    res.json({ diagnosis });
  } catch (error: any) {
    console.error("Analysis error:", error);
    const isProd = process.env.NODE_ENV === "production";
    res.status(500).json({
      error: error.message || "Failed to analyze image",
      ...(!isProd && {
        details: error.response?.data || error.error || error,
        name: error.name,
        stack: error.stack,
      }),
    });
  }
}
