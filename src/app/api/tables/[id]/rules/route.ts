import { NextResponse } from "next/server";
import { requireApiActor } from "@/server/auth/session";
import { updateTableAiRules } from "@/server/db-tools/table-service";
import { jsonError } from "@/server/http";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiActor();
    const { rules } = await request.json();
    return NextResponse.json({ rules: await updateTableAiRules(actor, (await params).id, rules) });
  } catch (error) { return jsonError(error); }
}
