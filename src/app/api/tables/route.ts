import { NextResponse } from "next/server";import { requireApiActor } from "@/server/auth/session";import { listTables } from "@/server/db-tools/table-service";import { jsonError } from "@/server/http";
export async function GET(){try{return NextResponse.json(await listTables(await requireApiActor()));}catch(e){return jsonError(e);}}
