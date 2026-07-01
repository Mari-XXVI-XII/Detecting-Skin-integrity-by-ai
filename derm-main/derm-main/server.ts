import express from "express";
import cors from "cors";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { getBaseEndpoint, getOpenAI } from "./lib/endpoint";

dotenv.config();

const app = express();
const PORT = 3000;

// Multer for handling file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(cors());
app.use(express.json());

// API health endpoint (Proxy to HF)
app.get("/api/health", async (req, res) => {
  try {
    const endpoint = getBaseEndpoint();
    if (!endpoint) {
      return res.status(503).json({ status: "Offline", error: "Endpoint not configured" });
    }

    // Probe the OpenAI-compatible models endpoint to verify the HF endpoint is ready
    const response = await fetch(`${endpoint}/v1/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.HF_TOKEN}`
      }
    });

    if (response.ok) {
      res.json({ status: "Online" });
    } else {
      const errorText = await response.text();
      res.status(response.status).json({ status: "Offline", error: `Health check failed: ${response.statusText}`, details: errorText });
    }
  } catch (error: any) {
    console.error("Health check error:", error);
    res.status(503).json({ status: "Offline", error: "Connection failed", details: error.message || error });
  }
});

// Analyze endpoint
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

app.post("/api/analyze", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
      return res.status(400).json({ error: "Unsupported file type. Please upload a JPEG, PNG, or WebP image." });
    }

    const { age, sex, localization } = req.body;
    
    // Convert buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const client = getOpenAI();
    const model = process.env.NEXT_PUBLIC_MODEL_NAME || "model";

    const response = await client.chat.completions.create({
      model: model,
      temperature: 0,
      max_tokens: 32,
      messages: [
        {
          role: "system",
          content: "You are a board-certified dermatologist assistant. Analyze the dermoscopy image and return ONLY the diagnosis label — nothing else.\nLabels: Melanocytic Nevi (benign mole), Melanoma (malignant), Benign Keratosis, Basal Cell Carcinoma, Actinic Keratoses / Intraepithelial Carcinoma, Vascular Lesion, Dermatofibroma"
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Metadata: Age: ${age || 'Unknown'}, Sex: ${sex || 'Unknown'}, Localization: ${localization || 'Unknown'}. Please classify this skin lesion.` },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
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
});

// Vite middleware / Static files
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
