import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readConfigAsync, writeConfigAsync } from "../../lib/configUtils";
import { createMeiliIndex, deleteMeiliIndex } from "@/app/server-lib/meili.setup";

const NOTEBOOKS_FILE = path.join(process.cwd(), "notebooks.json");

export async function GET() {
  const data = await readConfigAsync(NOTEBOOKS_FILE) || [];
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  let notebooks = await readConfigAsync(NOTEBOOKS_FILE) || [];
  const newId = notebooks.length > 0 ? Math.max(...notebooks.map((nb:any) => nb.id)) + 1 : 1;
  const newNotebook = {
    id: newId,
    title: body.title,
    date: body.date,
    creator: body.creator,
    sources: 0,
    icon: body.icon,
    bgColor: body.bgColor
  };
  notebooks = [newNotebook, ...notebooks];
  await writeConfigAsync(notebooks, NOTEBOOKS_FILE);
  await createMeiliIndex(`kb_${newId}`);
  return NextResponse.json(newNotebook);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  let notebooks = await readConfigAsync(NOTEBOOKS_FILE) || [];
  notebooks = notebooks.map((nb:any) => nb.id === body.id ? { ...nb, ...body } : nb);
  await writeConfigAsync(notebooks, NOTEBOOKS_FILE);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  let notebooks = await readConfigAsync(NOTEBOOKS_FILE) || [];
  notebooks = notebooks.filter((nb:any) => nb.id !== id);
  await writeConfigAsync(notebooks, NOTEBOOKS_FILE);
  const indexName = `kb_${id}`;
  await deleteMeiliIndex(indexName);
  return NextResponse.json({ success: true });
}

export const runtime = "nodejs";