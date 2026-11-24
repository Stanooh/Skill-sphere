import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from '@google/genai';

const PER_MODEL_TIMEOUT_MS = 25_000;

export function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: PER_MODEL_TIMEOUT_MS },
  });
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
}

function getFallbackModels(): string[] {
  const primary = getGeminiModel();
  const candidates = [primary, 'gemini-3.6-flash', 'gemini-3.5-flash'];
  return Array.from(new Set(candidates.filter(Boolean)));
}

function isTransientOrModelError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /503|504|500|429|unavailable|overloaded|high demand|deadline|not found|404|abort|timeout/i.test(msg);
}

export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, 'model'>
): Promise<{ response: GenerateContentResponse; modelUsed: string }> {
  const models = getFallbackModels();
  let lastError: unknown;

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT_MS);
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
        config: {
          ...params.config,
          abortSignal: controller.signal,
        },
      });
      return { response, modelUsed: model };
    } catch (error) {
      lastError = error;
      if (!isTransientOrModelError(error)) {
        throw error;
      }
      console.warn(
        `[gemini] model=${model} failed (${error instanceof Error ? error.message : String(error)}), trying next fallback`
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

export function parseGeminiJson(rawText: string): unknown {
  const trimmed = rawText.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(unfenced);
}

export function geminiErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/429|quota|resource exhausted/i.test(message)) {
    return 'Gemini usage limits have been reached. Please retry later.';
  }
  if (/503|unavailable|overloaded|high demand/i.test(message)) {
    return 'The AI model is temporarily busy. Please try again in a moment.';
  }
  if (/abort|timeout/i.test(message)) {
    return 'The AI service took too long to respond. Please try again.';
  }
  if (/401|403|api key|permission/i.test(message)) {
    return 'The AI service is not currently available. Please contact support.';
  }
  return 'The AI service could not complete your request. Please try again.';
}
