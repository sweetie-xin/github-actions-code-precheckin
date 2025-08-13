//api/invite/route.ts
import { NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/app/lib/configUtils";
import path from "path";

const invite_FILE = path.join(process.cwd(), "invite.json");

export async function GET() {
  const config = readConfig(invite_FILE);
  return NextResponse.json(config || {});
}

export async function POST(req: Request) {
  try {
    const config = await req.json();
    const result = writeConfig(config, invite_FILE);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to save invite" }, { status: 500 });
  }
}
