import { NextResponse } from "next/server";
import { requireApiActor } from "@/server/auth/session";
import { requireActive } from "@/server/auth/authorization";
import { newLinkToken,tokenHash } from "@/server/telegram/process-update";
import { querySystem } from "@/server/db";
import { getConfig } from "@/server/config";
import { jsonError } from "@/server/http";
async function create(){const actor=await requireApiActor();requireActive(actor);const token=newLinkToken();await querySystem(`insert into public.bot_link_tokens(user_id,token_hash,expires_at) values($1,$2,now()+interval '10 minutes')`,[actor.id,tokenHash(token)]);return `https://t.me/${getConfig().TELEGRAM_BOT_USERNAME}?start=${token}`;}
export async function POST(){try{return NextResponse.json({url:await create(),expiresInSeconds:600});}catch(e){return jsonError(e);}}
export async function GET(){try{return NextResponse.redirect(await create());}catch(e){return jsonError(e);}}
