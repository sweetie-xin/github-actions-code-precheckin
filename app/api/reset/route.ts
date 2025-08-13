/* --------------------------------------------------------------------------
   6. /api/reset  (POST) – 清空 QueryMemory
---------------------------------------------------------------------------*/
// app/api/reset/route.ts
import { NextResponse } from "next/server";
import { QueryMemory } from "@/app/server-lib/rag/memory";

export async function POST() {
  const memory = new QueryMemory();
  memory.reset()
  return NextResponse.json({ ok: true });
}

export const runtime = "nodejs";
