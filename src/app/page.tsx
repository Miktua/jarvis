import { redirect } from "next/navigation";
import { getSessionActor } from "@/server/auth/session";
export default async function Home(){const actor=await getSessionActor();redirect(!actor?"/auth":actor.status==="active"?"/workspace":"/pending");}
