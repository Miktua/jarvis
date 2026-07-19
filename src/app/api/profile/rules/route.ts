import { NextResponse } from "next/server";
import { requireApiActor } from "@/server/auth/session";
import { updateProfileAiRules } from "@/server/db-tools/table-service";
import { jsonError } from "@/server/http";

export async function PUT(request: Request) { try { const actor = await requireApiActor(); const { rules } = await request.json(); return NextResponse.json({ rules: await updateProfileAiRules(actor, rules) }); } catch (error) { return jsonError(error); } }
