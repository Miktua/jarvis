import { NextResponse } from "next/server";
import { requireApiActor } from "@/server/auth/session";
import { requireTableAccess } from "@/server/auth/authorization";
import { querySystem } from "@/server/db";
import { jsonError } from "@/server/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiActor();
    const { id } = await params;
    const table = await requireTableAccess(actor, id, "owner");
    const profiles = await querySystem<{ id: string; display_name: string }>(
      `select id, display_name
       from public.profiles
       where status = 'active' and id <> $1 and id <> $2
       order by lower(display_name), id`,
      [actor.id, table.owner_id],
    );
    return NextResponse.json(profiles);
  } catch (error) {
    return jsonError(error);
  }
}
