import { querySystem } from "@/server/db";
import { quoteIdentifier } from "@/server/sql-dsl/compiler";

export type Actor = { id: string; status: "pending"|"active"|"blocked"; role: "user"|"admin"; aiRules?: unknown };
export type RequiredAccess = "read"|"write"|"owner";

export class AuthorizationError extends Error { status = 403; }
export class AuthenticationError extends Error { status = 401; }

export function requireActive(actor: Actor): void {
  if (actor.status !== "active") throw new AuthorizationError("An active account is required");
}

export async function requireTableAccess(actor: Actor, tableId: string, required: RequiredAccess) {
  requireActive(actor);
  const rows = await querySystem<{ owner_id:string; access:"read"|"write"|null; physical_name:string; schema_definition:unknown; ai_rules:unknown; display_name:string }>(
    `select t.owner_id,t.physical_name::text,t.schema_definition,t.ai_rules,t.display_name,p.access
     from public.data_tables t left join public.data_table_permissions p on p.table_id=t.id and p.user_id=$2
     where t.id=$1 and t.deleted_at is null`, [tableId, actor.id]);
  const table = rows[0];
  if (!table) throw new AuthorizationError("Table not found or unavailable");
  const owner = table.owner_id === actor.id;
  const permitted = required === "read" ? owner || table.access === "read" || table.access === "write"
    : required === "write" ? owner || table.access === "write" : owner;
  if (!permitted) throw new AuthorizationError("Insufficient table permission");
  await querySystem(`grant select,insert,update,delete on table user_data.${quoteIdentifier(table.physical_name)} to jarvis_data`);
  return { ...table, owner };
}
