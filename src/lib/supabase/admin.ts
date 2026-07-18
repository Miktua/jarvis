import { createClient } from "@supabase/supabase-js";
import { getConfig } from "@/server/config";
let client:ReturnType<typeof createClient>|undefined;
export function getSupabaseAdmin(){const config=getConfig();client??=createClient(config.NEXT_PUBLIC_SUPABASE_URL,config.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});return client;}
