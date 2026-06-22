import {
  getGeminiApiKey,
  getGeminiModelFlash,
  getGeminiModelPro,
} from "@/lib/env";
import type {
  GeminiGenerateContentInput,
  GeminiGenerateContentResult,
  GeminiModelTier,
  GeminiResult,
} from "@/lib/gemini/types";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const MISSING_API_KEY_ERROR =
  "Gemini API key not configured. Add GEMINI_API_KEY to .env.local.";

export const GEMINI_MODELS = {
  flash: "gemini-2.5-flash",
  pro: "gemini-2.5-pro",
} as const;

function resolveModelId(tier: GeminiModelTier) {
  if (tier === "flash") {
    return getGeminiModelFlash();
  }

  return getGeminiModelPro();
}

export function getConfiguredGeminiModels() {
  return {
    flash: getGeminiModelFlash(),
    pro: getGeminiModelPro(),
  };
}

export async function generateGeminiContent(
  input: GeminiGenerateContentInput,
): Promise<GeminiResult<GeminiGenerateContentResult>> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: MISSING_API_KEY_ERROR };
  }

  const model = resolveModelId(input.model);
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`;

  const body: Record<string, unknown> = {
    contents: [
      {
        parts: [{ text: input.prompt }],
      },
    ],
  };

  if (input.systemInstruction?.trim()) {
    body.systemInstruction = {
      parts: [{ text: input.systemInstruction.trim() }],
    };
  }

  if (input.useGoogleSearch) {
    body.tools = [{ google_search: {} }];
  }

  if (input.jsonResponse && !input.useGoogleSearch) {
    body.generationConfig = {
      responseMimeType: "application/json",
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
      error?: {
        message?: string;
      };
    };

    if (!response.ok) {
      return {
        success: false,
        error: payload.error?.message || `Gemini request failed (${response.status})`,
      };
    }

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      return {
        success: false,
        error: "Gemini returned an empty response.",
      };
    }

    return {
      success: true,
      data: {
        model,
        text,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gemini request failed",
    };
  }
}
