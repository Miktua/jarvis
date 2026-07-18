import { randomUUID } from "node:crypto";
import { querySystem,withTransaction } from "@/server/db";
import type { Actor } from "./authorization";
import { createTable } from "@/server/db-tools/table-service";

function requireAdmin(actor:Actor){if(actor.status!=="active"||actor.role!=="admin")throw new Error("Administrator access required");}
export async function listUsers(actor:Actor){requireAdmin(actor);return querySystem(`select id,display_name,status::text,role::text,created_at from public.profiles order by case when status='pending' then 0 else 1 end,created_at`);}
export async function approveUser(actor:Actor,userId:string){requireAdmin(actor);const rows=await withTransaction("schema",async c=>(await c.query<{id:string}>(`update public.profiles set status='active',approved_at=now(),approved_by=$2 where id=$1 and status='pending' returning id`,[userId,actor.id])).rows);
  if(rows[0])await createTable({id:userId,status:"active",role:"user"},{displayName:"Notebook",description:"Your private notes",columns:[{id:randomUUID(),label:"Title",type:"text",required:false},{id:randomUUID(),label:"Content",type:"long_text",required:false}]});return {approved:true};}
export async function blockUser(actor:Actor,userId:string){requireAdmin(actor);await querySystem(`update public.profiles set status='blocked' where id=$1 and id<>$2`,[userId,actor.id]);return {blocked:true};}
