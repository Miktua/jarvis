import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthenticationError,AuthorizationError } from "@/server/auth/authorization";
export function jsonError(error:unknown){if(error instanceof ZodError)return NextResponse.json({error:"Invalid request",issues:error.issues},{status:400});if(error instanceof AuthenticationError||error instanceof AuthorizationError)return NextResponse.json({error:error.message},{status:error.status});console.error(error);return NextResponse.json({error:error instanceof Error?error.message:"Internal error"},{status:500});}
