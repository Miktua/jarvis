import { NextResponse } from "next/server";import { requireApiActor } from "@/server/auth/session";import { blockUser } from "@/server/auth/admin-service";import { jsonError } from "@/server/http";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){try{return NextResponse.json(await blockUser(await requireApiActor(),(await params).id));}catch(e){return jsonError(e);}}
