export type GeminiModelTier = "flash" | "pro";

export type GeminiGenerateContentInput = {
  model: GeminiModelTier;
  prompt: string;
  systemInstruction?: string;
  jsonResponse?: boolean;
  useGoogleSearch?: boolean;
};

export type GeminiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type GeminiGenerateContentResult = {
  model: string;
  text: string;
};
