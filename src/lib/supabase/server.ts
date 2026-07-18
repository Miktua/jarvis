import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/server/config";

export async function getSupabaseServerClient() {
  const cookieStore=await cookies(); const config=getSupabasePublicConfig();
  return createServerClient(config.NEXT_PUBLIC_SUPABASE_URL,config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
    cookies:{getAll:()=>cookieStore.getAll(),setAll(items){try{items.forEach(({name,value,options})=>cookieStore.set(name,value,options));}catch{/* Server Components cannot write cookies. */}}},
  });
}
