import { randomUUID } from "node:crypto";
import { z } from "zod";
import { querySystem, withTransaction } from "@/server/db";
import { requireTableAccess, type Actor } from "@/server/auth/authorization";
import { compileCreateTable, compileWhere, physicalColumnName, physicalTableName, postgresType, quoteIdentifier } from "@/server/sql-dsl/compiler";
import { alterOperation, columnDefinition, createTableInput, searchInput, type ColumnDefinition } from "@/server/sql-dsl/types";
import { getConfig } from "@/server/config";

const rowValues = z.record(z.uuid(), z.unknown());
export type FrozenAction =
  | { type:"create_table"; input:z.infer<typeof createTableInput>; tableId:string }
  | { type:"alter_table"; tableId:string; operation:z.infer<typeof alterOperation> }
  | { type:"drop_table"; tableId:string }
  | { type:"delete_rows"; tableId:string; rowIds:string[] }
  | { type:"share_table"; tableId:string; userId:string; access:"read"|"write" }
  | { type:"revoke_table_access"; tableId:string; userId:string };

function schemaMap(value: unknown): Map<string,ColumnDefinition> {
  const columns = z.array(columnDefinition).parse(value);
  return new Map(columns.map((column) => [column.id,column]));
}

function validateValue(column: ColumnDefinition, value: unknown): unknown {
  if (value === null && !column.required) return null;
  const schemas = {
    text:z.string().max(10_000), long_text:z.string().max(200_000), integer:z.number().int(), decimal:z.number().finite(),
    boolean:z.boolean(), date:z.iso.date(), timestamp:z.iso.datetime({ offset:true }), text_array:z.array(z.string().max(2_000)).max(100),
    json:z.json(), attachment_reference:z.uuid(),
  } as const;
  return schemas[column.type].parse(value as never);
}

function compileValues(values: Record<string,unknown>, columns: Map<string,ColumnDefinition>, start=1) {
  const entries = Object.entries(values);
  if (!entries.length) throw new Error("At least one value is required");
  return {
    names:entries.map(([id]) => { if(!columns.has(id)) throw new Error("Unknown column"); return quoteIdentifier(physicalColumnName(id)); }),
    values:entries.map(([id,value]) => validateValue(columns.get(id)!,value)),
    placeholders:entries.map((_,i)=>`$${start+i}`),
  };
}

export async function listTables(actor:Actor) {
  const rows=await querySystem(`select t.id,t.display_name,t.description,t.owner_id,t.schema_definition,
    case when t.owner_id=$1 then 'owner' else p.access::text end as access
    from public.data_tables t left join public.data_table_permissions p on p.table_id=t.id and p.user_id=$1
    where t.deleted_at is null and (t.owner_id=$1 or p.user_id=$1) order by t.display_name`,[actor.id]);
  return rows;
}

export async function createTable(actor:Actor,input:unknown,tableId:string=randomUUID()) {
  const parsed=createTableInput.parse(input); const name=physicalTableName(tableId);
  await withTransaction("schema",async(client)=>{
    await client.query(compileCreateTable(name,parsed.columns));
    await client.query(`grant select,insert,update,delete on table user_data.${quoteIdentifier(name)} to jarvis_data`);
    await client.query(`insert into public.data_tables(id,physical_name,display_name,description,owner_id,schema_definition) values($1,$2,$3,$4,$5,$6)`,[tableId,name,parsed.displayName,parsed.description,actor.id,JSON.stringify(parsed.columns)]);
    await client.query(`insert into public.workspace_nodes(owner_id,kind,table_id,title) values($1,'table',$2,$3)`,[actor.id,tableId,parsed.displayName]);
    await client.query(`insert into public.audit_log(actor_id,action,table_id,summary) values($1,'create_table',$2,$3)`,[actor.id,tableId,`Created ${parsed.displayName}`]);
  });
  return { id:tableId,displayName:parsed.displayName };
}

export async function insertRows(actor:Actor,tableId:string,rows:unknown[]) {
  const table=await requireTableAccess(actor,tableId,"write"); const columns=schemaMap(table.schema_definition);
  if(rows.length<1 || rows.length>getConfig().MAX_AFFECTED_ROWS) throw new Error("Row count outside limits");
  const result=await withTransaction("data",async(client)=>{
    const ids:string[]=[];
    for(const raw of rows){ const parsed=rowValues.parse(raw); const c=compileValues(parsed,columns,2);
      const result=await client.query<{_id:string}>(`insert into user_data.${quoteIdentifier(table.physical_name)} (_created_by,${c.names.join(",")}) values ($1,${c.placeholders.join(",")}) returning _id`,[actor.id,...c.values]); ids.push(result.rows[0]._id); }
    return { ids,affectedRows:ids.length };
  });
  await querySystem(`insert into public.audit_log(actor_id,action,table_id,affected_rows,summary) values($1,'insert_rows',$2,$3,$4)`,[actor.id,tableId,result.affectedRows,"Inserted rows"]);
  return result;
}

export async function searchRows(actor:Actor,input:unknown) {
  const parsed=searchInput.parse(input); const table=await requireTableAccess(actor,parsed.tableId,"read"); const columns=schemaMap(table.schema_definition);
  const where=compileWhere(parsed.filters,columns); const sortSql=parsed.sort.length ? ` order by ${parsed.sort.map(s=>{if(!columns.has(s.columnId))throw new Error("Unknown or unauthorized sort column");return `${quoteIdentifier(physicalColumnName(s.columnId))} ${s.direction}`;}).join(",")}` : " order by _created_at desc";
  const limit=Math.min(parsed.limit,getConfig().MAX_QUERY_ROWS); const values=[...where.values,limit,parsed.offset];
  return withTransaction("data",async(client)=>(await client.query(`select * from user_data.${quoteIdentifier(table.physical_name)}${where.sql}${sortSql} limit $${values.length-1} offset $${values.length}`,values)).rows);
}

export async function getRow(actor:Actor,tableId:string,rowId:string) {
  const table=await requireTableAccess(actor,tableId,"read"); z.uuid().parse(rowId);
  return withTransaction("data",async(client)=>(await client.query(`select * from user_data.${quoteIdentifier(table.physical_name)} where _id=$1 limit 1`,[rowId])).rows[0] ?? null);
}

export async function updateRows(actor:Actor,tableId:string,rowIds:string[],values:unknown) {
  const table=await requireTableAccess(actor,tableId,"write"); const columns=schemaMap(table.schema_definition); const parsed=rowValues.parse(values);
  if(rowIds.length<1 || rowIds.length>getConfig().MAX_AFFECTED_ROWS) throw new Error("Row count outside limits"); z.array(z.uuid()).parse(rowIds);
  const c=compileValues(parsed,columns,2); const set=c.names.map((name,i)=>`${name}=$${i+2}`).join(",");
  return withTransaction("data",async(client)=>{ const result=await client.query(`update user_data.${quoteIdentifier(table.physical_name)} set ${set},_updated_at=now() where _id=any($1::uuid[])`,[rowIds,...c.values]); return {affectedRows:result.rowCount??0}; });
}

export async function executeFrozenAction(actor:Actor,action:FrozenAction) {
  if(action.type==="create_table") return createTable(actor,action.input,action.tableId);
  if(action.type==="delete_rows") { const table=await requireTableAccess(actor,action.tableId,"write"); z.array(z.uuid()).min(1).max(getConfig().MAX_AFFECTED_ROWS).parse(action.rowIds); return withTransaction("data",async c=>({affectedRows:(await c.query(`delete from user_data.${quoteIdentifier(table.physical_name)} where _id=any($1::uuid[])`,[action.rowIds])).rowCount??0})); }
  if(action.type==="share_table") { await requireTableAccess(actor,action.tableId,"owner"); return withTransaction("schema",async c=>{await c.query(`insert into public.data_table_permissions(table_id,user_id,access,granted_by) values($1,$2,$3,$4) on conflict(table_id,user_id) do update set access=excluded.access,granted_by=excluded.granted_by`,[action.tableId,action.userId,action.access,actor.id]); return {shared:true};}); }
  if(action.type==="revoke_table_access") { await requireTableAccess(actor,action.tableId,"owner"); return withTransaction("schema",async c=>{await c.query(`delete from public.data_table_permissions where table_id=$1 and user_id=$2`,[action.tableId,action.userId]); return {revoked:true};}); }
  const table=await requireTableAccess(actor,action.tableId,"owner");
  if(action.type==="drop_table") return withTransaction("schema",async c=>{await c.query(`drop table user_data.${quoteIdentifier(table.physical_name)}`); await c.query(`update public.data_tables set deleted_at=now() where id=$1`,[action.tableId]); return {dropped:true};});
  const operation=alterOperation.parse(action.operation); const columns=[...schemaMap(table.schema_definition).values()];
  return withTransaction("schema",async c=>{ let sql="";
    if(operation.kind==="add"){sql=`alter table user_data.${quoteIdentifier(table.physical_name)} add column ${quoteIdentifier(physicalColumnName(operation.column.id))} ${postgresType(operation.column.type)}${operation.column.required?" not null":""}`; columns.push(operation.column);}
    else {const index=columns.findIndex(x=>x.id===operation.columnId); if(index<0) throw new Error("Unknown column");
      if(operation.kind==="rename") columns[index]={...columns[index],label:operation.label};
      if(operation.kind==="remove"){sql=`alter table user_data.${quoteIdentifier(table.physical_name)} drop column ${quoteIdentifier(physicalColumnName(operation.columnId))}`; columns.splice(index,1);}
      if(operation.kind==="change_type"){sql=`alter table user_data.${quoteIdentifier(table.physical_name)} alter column ${quoteIdentifier(physicalColumnName(operation.columnId))} type ${postgresType(operation.type)} using ${quoteIdentifier(physicalColumnName(operation.columnId))}::${postgresType(operation.type)}`; columns[index]={...columns[index],type:operation.type};}
    }
    if(sql) await c.query(sql); await c.query(`update public.data_tables set schema_definition=$2,updated_at=now() where id=$1`,[action.tableId,JSON.stringify(columns)]); return {altered:true}; });
}
