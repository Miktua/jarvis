import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe,expect,it } from "vitest";

const runner=readFileSync(join(process.cwd(),"src/server/agent/run.ts"),"utf8").toLowerCase();
const authorization=readFileSync(join(process.cwd(),"src/server/auth/authorization.ts"),"utf8").toLowerCase();
const tables=readFileSync(join(process.cwd(),"src/server/db-tools/table-service.ts"),"utf8").toLowerCase();

describe("dynamic table access",()=>{it("grants data capability when a table is created",()=>expect(tables).toContain("grant select,insert,update,delete on table user_data.${quoteidentifier(name)} to jarvis_data"));it("repairs existing table privileges on authorized access",()=>expect(authorization).toContain("grant select,insert,update,delete on table user_data.${quoteidentifier(table.physical_name)} to jarvis_data"));it("uses authoritative action state instead of old assistant claims",()=>{expect(runner).toContain("and role='user'");expect(runner).toContain("recent action state (authoritative)");expect(runner).not.toContain("recent telegram history");});});
