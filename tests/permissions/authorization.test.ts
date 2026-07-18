import { describe,expect,it } from "vitest";
import { requireActive } from "@/server/auth/authorization";
describe("account status gate",()=>{it.each(["pending","blocked"] as const)("denies %s actors",status=>{expect(()=>requireActive({id:"user",status,role:"user"})).toThrow("active account")});it("allows active actors",()=>expect(()=>requireActive({id:"user",status:"active",role:"user"})).not.toThrow());});
