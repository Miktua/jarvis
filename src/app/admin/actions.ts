"use server";
import { revalidatePath } from "next/cache";
import { requireSessionActor } from "@/server/auth/session";
import { approveUser,blockUser } from "@/server/auth/admin-service";
export async function approve(formData:FormData){const actor=await requireSessionActor();await approveUser(actor,String(formData.get("userId")));revalidatePath("/admin");}
export async function block(formData:FormData){const actor=await requireSessionActor();await blockUser(actor,String(formData.get("userId")));revalidatePath("/admin");}
