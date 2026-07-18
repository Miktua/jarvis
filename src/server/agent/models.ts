export const JARVIS_MODEL="openai/gpt-5.6-luna";
export const DATA_ANALYSIS_MODEL="openai/gpt-5.6-terra";
export const AVAILABLE_FALLBACK_MODEL="openai/gpt-5-nano";
export const MODEL_FALLBACK_OPTIONS={gateway:{models:[AVAILABLE_FALLBACK_MODEL,"google/gemini-2.5-flash-lite","anthropic/claude-haiku-4.5"]}};
