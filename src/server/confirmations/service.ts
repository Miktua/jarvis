import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { querySystem, withTransaction } from "@/server/db";
import { getConfig } from "@/server/config";
import { executeFrozenAction, type FrozenAction } from "@/server/db-tools/table-service";
import { hashesEqual, payloadHash } from "@/server/security/canonical-json";
import { requireActive, type Actor } from "@/server/auth/authorization";

function signature(id:string,userId:string){return createHmac("sha256",getConfig().ACTION_SIGNING_SECRET).update(`${id}.${userId}`).digest().subarray(0,12).toString("base64url");}
export function verifyActionSignature(id:string,userId:string,sig:string){const a=Buffer.from(signature(id,userId));const b=Buffer.from(sig);return a.length===b.length&&timingSafeEqual(a,b);}

export async function proposeAction(actor:Actor,action:FrozenAction,ttlMinutes=15){requireActive(actor);const id=randomUUID();const hash=payloadHash(action);
  await querySystem(`insert into public.pending_actions(id,requested_by,action_type,frozen_payload,payload_hash,expires_at) values($1,$2,$3,$4,$5,now()+($6||' minutes')::interval)`,[id,actor.id,action.type,JSON.stringify(action),hash,ttlMinutes]);
  return {id,signature:signature(id,actor.id),action,expiresInMinutes:ttlMinutes};}

export async function rejectAction(actor:Actor,id:string,sig:string){requireActive(actor);z.uuid().parse(id);if(!verifyActionSignature(id,actor.id,sig))throw new Error("Invalid action signature");
  const rows=await querySystem<{id:string}>(`update public.pending_actions set status='rejected' where id=$1 and requested_by=$2 and status='pending' and expires_at>now() returning id`,[id,actor.id]);if(!rows[0])throw new Error("Action is unavailable");return {rejected:true};}

export async function approveAction(actor:Actor,id:string,sig:string){requireActive(actor);z.uuid().parse(id);if(!verifyActionSignature(id,actor.id,sig))throw new Error("Invalid action signature");
  const claimed=await withTransaction("schema",async c=>{const result=await c.query<{frozen_payload:FrozenAction;payload_hash:string}>(`update public.pending_actions set status='executing' where id=$1 and requested_by=$2 and status='pending' and expires_at>now() returning frozen_payload,payload_hash`,[id,actor.id]);return result.rows[0];});
  if(!claimed)throw new Error("Action already handled, expired, or unavailable");
  if(!hashesEqual(claimed.payload_hash,payloadHash(claimed.frozen_payload))){await querySystem(`update public.pending_actions set status='failed',last_error='payload hash mismatch' where id=$1`,[id]);throw new Error("Frozen payload integrity check failed");}
  try{const result=await executeFrozenAction(actor,claimed.frozen_payload);await querySystem(`update public.pending_actions set status='executed',executed_at=now() where id=$1 and status='executing'`,[id]);return result;}
  catch(error){await querySystem(`update public.pending_actions set status='failed',last_error=$2 where id=$1`,[id,error instanceof Error?error.message:"Execution failed"]);throw error;}
}
