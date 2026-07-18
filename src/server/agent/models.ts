import { createOpenAI } from "@ai-sdk/openai";

// AI_GATEWAY_API_KEY now contains the OpenAI API key. Configure the provider
// explicitly so AI SDK model strings cannot route through Vercel AI Gateway.
export const openai = createOpenAI({ apiKey: process.env.AI_GATEWAY_API_KEY });

export const JARVIS_MODEL = openai("gpt-5.6-luna");
export const DATA_ANALYSIS_MODEL = openai("gpt-5.6-terra");
export const TRANSCRIPTION_MODEL = openai.transcription("whisper-1");
