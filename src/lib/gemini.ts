import { GoogleGenAI } from '@google/genai';

export function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  return new GoogleGenAI({ apiKey });
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
}

export function geminiErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/429|quota|resource exhausted/i.test(message)) {
    return 'Gemini usage limits have been reached. Please retry later.';
  }
  if (/401|403|api key|permission/i.test(message)) {
    return 'The AI service is not currently available. Please contact support.';
  }
  return 'The AI service could not complete your request. Please try again.';
}
