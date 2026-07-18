import { describe,expect,it } from "vitest";
import { safeAgentResponse } from "@/server/telegram/process-update";

describe("Telegram completion claims",()=>{
  it("removes unsupported completion claims",()=>expect(safeAgentResponse("Готово, я добавил расход.",false)).toBe("Данные не изменялись в рамках этого запроса."));
  it("keeps normal answers without a mutation",()=>expect(safeAgentResponse("Сегодня найдено 3 расхода.",false)).toBe("Сегодня найдено 3 расхода."));
  it("keeps confirmed write results",()=>expect(safeAgentResponse("Готово, я добавил расход.",true)).toBe("Готово, я добавил расход."));
});
