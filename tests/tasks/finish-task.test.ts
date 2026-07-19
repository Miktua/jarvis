import { describe,expect,it,vi } from "vitest";

const {querySystem}=vi.hoisted(()=>({querySystem:vi.fn()}));

vi.mock("@/server/db",()=>({querySystem}));

import { finishTask } from "@/server/tasks/service";

describe("finishTask",()=>{
  it("keeps the enum status and terminal flag in separate SQL parameters",async()=>{
    await finishTask("task-id","completed");

    expect(querySystem).toHaveBeenCalledWith(
      expect.stringContaining("status=$2,last_error=$4,completed_at=case when $3::boolean"),
      ["task-id","completed",true,null],
    );
  });

  it("leaves an awaiting-input task without a completion timestamp",async()=>{
    await finishTask("task-id","awaiting_input");

    expect(querySystem).toHaveBeenLastCalledWith(expect.any(String),["task-id","awaiting_input",false,null]);
  });
});
