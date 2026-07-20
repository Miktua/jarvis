import type { LanguageModelUsage } from "ai";

/**
 * Emits cost-safe usage data for dashboards and log drains. Prompts, responses,
 * table names, and user identifiers deliberately never enter this event.
 */
export function recordModelUsage(event: {
  operation: string;
  model: string;
  elapsedMs: number;
  steps?: number;
  usage: LanguageModelUsage;
}) {
  const { usage } = event;
  console.info(JSON.stringify({
    event: "ai_usage",
    operation: event.operation,
    model: event.model,
    elapsedMs: event.elapsedMs,
    steps: event.steps,
    inputTokens: usage.inputTokens,
    cachedInputTokens: usage.inputTokenDetails.cacheReadTokens,
    cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens,
    outputTokens: usage.outputTokens,
    reasoningTokens: usage.outputTokenDetails.reasoningTokens,
    totalTokens: usage.totalTokens,
  }));
}
