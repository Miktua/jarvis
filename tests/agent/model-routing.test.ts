import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe,expect,it } from "vitest";
import { DATA_ANALYSIS_MODEL,FAST_MODEL,JARVIS_MODEL } from "@/server/agent/models";
import { wantsDataAnalysis } from "@/server/agent/run";

const tools=readFileSync(join(process.cwd(),"src/server/agent/tools.ts"),"utf8");

describe("agent model routing",()=>{it("uses Luna for consequential decisions, Terra for analysis, and Nano for bounded extraction",()=>{expect(JARVIS_MODEL.modelId).toBe("gpt-5.6-luna");expect(DATA_ANALYSIS_MODEL.modelId).toBe("gpt-5.6-terra");expect(FAST_MODEL.modelId).toBe("gpt-5.4-nano");expect(JARVIS_MODEL.provider).toBe("openai.responses");expect(DATA_ANALYSIS_MODEL.provider).toBe("openai.responses");expect(FAST_MODEL.provider).toBe("openai.responses");});it("does not configure fallback providers",()=>{expect(JSON.stringify({JARVIS_MODEL,DATA_ANALYSIS_MODEL,FAST_MODEL})).not.toContain("gateway");expect(JSON.stringify({JARVIS_MODEL,DATA_ANALYSIS_MODEL,FAST_MODEL})).not.toContain("google");expect(JSON.stringify({JARVIS_MODEL,DATA_ANALYSIS_MODEL,FAST_MODEL})).not.toContain("anthropic");});it("detects explicit analysis intent without treating a lookup as analysis",()=>{expect(wantsDataAnalysis("Проанализируй продажи и найди аномалии")).toBe(true);expect(wantsDataAnalysis("Compare monthly totals")).toBe(true);expect(wantsDataAnalysis("Покажи последнюю покупку")).toBe(false);});it("exposes a dedicated bounded data-analysis tool",()=>{expect(tools).toContain("analyze_data:tool");expect(tools).toContain("tableIds:z.array(z.uuid()).min(1).max(5)");expect(tools).toContain("analyzeTableData(actor,tableIds,question)");});});
