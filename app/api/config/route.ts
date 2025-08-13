import { NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/app/lib/configUtils";
import path from "path";
import { readFile } from "fs/promises";

const CONFIG_FILE = path.join(process.cwd(), "config.json");

export async function GET() {
  const config = readConfig(CONFIG_FILE);
  return NextResponse.json(config || {});
}

export async function POST(req: Request) {
  try {
    const config = await req.json();
    const result = writeConfig(config, CONFIG_FILE);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
