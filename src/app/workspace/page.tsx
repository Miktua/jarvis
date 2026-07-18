import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSessionActor } from "@/server/auth/session";
import { listTables,searchRows } from "@/server/db-tools/table-service";
import { DataGrid } from "@/components/data-grid/data-grid";
import { PermissionsPanel } from "@/components/permissions/permissions-panel";
import { TableRulesPanel } from "@/components/table-rules/table-rules-panel";
import { signOut } from "../auth/actions";

type WorkspaceTable={id:string;display_name:string;description:string;access:"owner"|"read"|"write";schema_definition:Array<{id:string;label:string}>;ai_rules:Array<{id:string;instruction:string;enabled:boolean}>};

export default async function WorkspacePage({searchParams}:{searchParams:Promise<{table?:string}>}){
  const actor=await requireSessionActor(); if(actor.status!=="active")redirect("/pending");
  const tables=await listTables(actor) as WorkspaceTable[]; const requested=(await searchParams).table;
  const selected=tables.find(t=>t.id===requested)??tables[0];
  const rows=selected?await searchRows(actor,{tableId:selected.id,limit:50,offset:0,filters:[],sort:[]}):[];
  return <main className="workspace">
    <aside><div className="workspace-brand"><span>J</span><strong>Jarvis</strong><small>Private data workspace</small></div>
      <div className="sidebar-label">YOUR TABLES</div><nav>{tables.filter(t=>t.access==="owner").map(t=><Link className={selected?.id===t.id?"active":""} key={t.id} href={`/workspace?table=${t.id}`}><span>{t.display_name}</span></Link>)}</nav>
      <div className="sidebar-label">SHARED WITH YOU</div><nav>{tables.filter(t=>t.access!=="owner").map(t=><Link className={selected?.id===t.id?"active":""} key={t.id} href={`/workspace?table=${t.id}`}><span>{t.display_name}</span></Link>)}</nav>
      <div className="sidebar-footer"><Link href="/api/telegram/link-token">Connect Telegram</Link>{actor.role==="admin"&&<Link href="/admin">Administration</Link>}<form action={signOut}><button>Sign out</button></form></div>
    </aside>
    <section className="content"><header className="content-header"><div><p className="eyebrow">{selected?.access==="owner"?"YOUR TABLE":selected?.access?`${selected.access} ACCESS`:"WORKSPACE"}</p><h1>{selected?.display_name??"Your workspace"}</h1><p className="muted">{selected?.description??"No tables are available."}</p>{selected?.access==="owner"&&<div className="table-settings"><TableRulesPanel tableId={selected.id} initialRules={selected.ai_rules}/><PermissionsPanel tableId={selected.id}/></div>}</div><div className="profile-chip"><span>{actor.displayName.slice(0,1).toUpperCase()}</span><div><strong>{actor.displayName||"User"}</strong><small>{actor.role}</small></div></div></header>{selected&&<DataGrid columns={selected.schema_definition} rows={rows as Record<string,unknown>[]}/>}</section>
  </main>;
}
