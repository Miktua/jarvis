import { describe,expect,it } from "vitest";
import { progressLocale } from "@/server/telegram/progress";

describe("Telegram progress language",()=>{it("uses Russian for Cyrillic user messages",()=>expect(progressLocale("Проанализируй продажи","en")).toBe("ru"));it("uses English for Latin user messages",()=>expect(progressLocale("Analyze sales","ru")).toBe("en"));it("falls back to the Telegram language when text has no letters",()=>expect(progressLocale("123","ru-RU")).toBe("ru"));});
