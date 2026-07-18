import { describe,expect,it } from "vitest";
import { progressLocale } from "@/server/telegram/progress";

describe("Telegram progress language",()=>{it("always uses Russian system messages",()=>expect(progressLocale("Проанализируй продажи","en")).toBe("ru"));it("uses Russian for Latin user messages too",()=>expect(progressLocale("Analyze sales","en")).toBe("ru"));it("uses Russian when text has no letters",()=>expect(progressLocale("123","en-US")).toBe("ru"));});
