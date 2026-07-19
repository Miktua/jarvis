import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { querySystem } from "@/server/db";
import { AuthenticationError,type Actor } from "./authorization";
import { bootstrapAdminEmails } from "@/server/config";

export async function getSessionActor():Promise<(Actor&{displayName:string})|null>{const client=await getSupabaseServerClient();const {data}=await client.auth.getClaims();const id=data?.claims?.sub;if(!id)return null;
  let rows=await querySystem<Actor&{displayName:string}>(`select id,status::text,role::text,display_name as "displayName",ai_rules as "aiRules" from public.profiles where id=$1`,[id]);
  if(rows[0]?.role!=="admin"){const {data:{user}}=await client.auth.getUser();const email=user?.email?.toLowerCase();if(email&&user?.email_confirmed_at&&bootstrapAdminEmails().has(email)){await querySystem(`update public.profiles set role='admin',status='active',approved_at=coalesce(approved_at,now()),approved_by=coalesce(approved_by,id) where id=$1`,[id]);rows=await querySystem<Actor&{displayName:string}>(`select id,status::text,role::text,display_name as "displayName",ai_rules as "aiRules" from public.profiles where id=$1`,[id]);}}
  return rows[0]??null;}
export async function requireSessionActor(){const actor=await getSessionActor();if(!actor)redirect("/auth");return actor;}
export async function requireApiActor(){const actor=await getSessionActor();if(!actor)throw new AuthenticationError("Authentication required");return actor;}
export async function actorFromTelegram(telegramUserId:number){const rows=await querySystem<Actor&{displayName:string;chatId:number}>(`select p.id,p.status::text,p.role::text,p.display_name as "displayName",p.ai_rules as "aiRules",b.telegram_chat_id as "chatId" from public.bot_connections b join public.profiles p on p.id=b.user_id where b.telegram_user_id=$1`,[telegramUserId]);return rows[0]??null;}
