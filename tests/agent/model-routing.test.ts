import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe,expect,it } from "vitest";
import { AVAILABLE_FALLBACK_MODEL,DATA_ANALYSIS_MODEL,JARVIS_MODEL,MODEL_FALLBACK_OPTIONS } from "@/server/agent/models";
import { wantsDataAnalysis } from "@/server/agent/run";

const tools=readFileSync(join(process.cwd(),"src/server/agent/tools.ts"),"utf8");

describe("agent model routing",()=>{it("uses Luna for ordinary messages and Terra for data analysis",()=>{expect(JARVIS_MODEL).toBe("openai/gpt-5.6-luna");expect(DATA_ANALYSIS_MODEL).toBe("openai/gpt-5.6-terra");});it("keeps the bot available across free-tier model limits",()=>{expect(AVAILABLE_FALLBACK_MODEL).toBe("openai/gpt-5-nano");expect(MODEL_FALLBACK_OPTIONS.gateway.models).toEqual([AVAILABLE_FALLBACK_MODEL,"google/gemini-2.5-flash-lite","anthropic/claude-haiku-4.5"]);});it("detects explicit analysis intent without treating a lookup as analysis",()=>{expect(wantsDataAnalysis("Проанализируй продажи и найди аномалии")).toBe(true);expect(wantsDataAnalysis("Compare monthly totals")).toBe(true);expect(wantsDataAnalysis("Покажи последнюю покупку")).toBe(false);});it("exposes a dedicated bounded data-analysis tool",()=>{expect(tools).toContain("analyze_data:tool");expect(tools).toContain("tableIds:z.array(z.uuid()).min(1).max(5)");expect(tools).toContain("analyzeTableData(actor,tableIds,question)");});});
