import { createServerClient } from "@supabase/ssr";
import { NextResponse,type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/server/config";

export async function updateSession(request:NextRequest){let response=NextResponse.next({request});
  const config=getSupabasePublicConfig();
  const client=createServerClient(config.NEXT_PUBLIC_SUPABASE_URL,config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>request.cookies.getAll(),setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
  await client.auth.getClaims(); return response;
}
