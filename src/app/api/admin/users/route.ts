import { NextResponse } from "next/server";import { requireApiActor } from "@/server/auth/session";import { listUsers } from "@/server/auth/admin-service";import { jsonError } from "@/server/http";
export async function GET(){try{return NextResponse.json(await listUsers(await requireApiActor()));}catch(e){return jsonError(e);}}
