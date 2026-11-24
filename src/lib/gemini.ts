import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from '@google/genai';

export function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  return new GoogleGenAI({ apiKey });
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
}

function getFallbackModels(): string[] {
  const primary = getGeminiModel();
  const candidates = [primary, 'gemini-2.5-flash', 'gemini-2.0-flash'];
  return Array.from(new Set(candidates.filter(Boolean)));
}

function isTransientOrModelError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /503|500|429|unavailable|overloaded|high demand|not found|404/i.test(msg);
}

export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, 'model'>
): Promise<GenerateContentResponse> {
  const models = getFallbackModels();
  let lastError: unknown;

  for (const model of models) {
    try {
      return await ai.models.generateContent({
        ...params,
        model,
      });
    } catch (error) {
      lastError = error;
      if (!isTransientOrModelError(error)) {
        throw error;
      }
      console.warn(`[gemini] model ${model} failed with transient error, trying fallback...`, error);
    }
  }

  throw lastError;
}

export function geminiErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/429|quota|resource exhausted/i.test(message)) {
    return 'Gemini usage limits have been reached. Please retry later.';
  }
  if (/503|unavailable|overloaded|high demand/i.test(message)) {
    return 'The AI model is temporarily busy. Please try again in a moment.';
  }
  if (/401|403|api key|permission/i.test(message)) {
    return 'The AI service is not currently available. Please contact support.';
  }
  return 'The AI service could not complete your request. Please try again.';
}
