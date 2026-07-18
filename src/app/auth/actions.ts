"use server";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function signIn(formData:FormData){const email=String(formData.get("email")??"");const password=String(formData.get("password")??"");const client=await getSupabaseServerClient();const {error}=await client.auth.signInWithPassword({email,password});if(error)redirect(`/auth?error=${encodeURIComponent(error.message)}`);redirect("/workspace");}
export async function signUp(formData:FormData){const email=String(formData.get("email")??"");const password=String(formData.get("password")??"");const displayName=String(formData.get("displayName")??"");const client=await getSupabaseServerClient();const {error}=await client.auth.signUp({email,password,options:{data:{display_name:displayName}}});if(error)redirect(`/auth?error=${encodeURIComponent(error.message)}`);redirect("/pending");}
export async function signOut(){const client=await getSupabaseServerClient();await client.auth.signOut();redirect("/auth");}
