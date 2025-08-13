import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const historyDir = path.join(os.homedir(), "dsm-history");

// ✅ 确保 dsm-history 目录存在
if (!fs.existsSync(historyDir)) {
  fs.mkdirSync(historyDir, { recursive: true });
}

// ✅ 读取 summaries.json
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const knowledgeId = searchParams.get("id");

  if (!knowledgeId) {
    return NextResponse.json({ error: "Missing knowledgeId" }, { status: 400 });
  }

  const filePath = path.join(historyDir, `${knowledgeId}.json`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json([]); // 如果文件不存在，返回空数组
  }

  const summaries = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return NextResponse.json(summaries);
}

// ✅ 存储新的总结
export async function POST(req: Request) {
  try {
    const { knowledgeId, summary } = await req.json();
    if (!knowledgeId || !summary) {
      return NextResponse.json({ error: "Missing knowledgeId or summary" }, { status: 400 });
    }

    const filePath = path.join(historyDir, `${knowledgeId}.json`);

    // 读取已有的总结
    let summaries: string[] = [];
    if (fs.existsSync(filePath)) {
      summaries = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    // ✅ 追加新总结并写入文件
    summaries.push(summary);
    fs.writeFileSync(filePath, JSON.stringify(summaries, null, 2), "utf8");

    return NextResponse.json({ message: "保存成功", summaries });
  } catch (error) {
    return NextResponse.json({ error: `Failed to save summary: ${error}` }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, index } = await req.json();
    if (!id || index === undefined) {
      return NextResponse.json({ error: "缺少 id 或 index" }, { status: 400 });
    }

    const filePath = path.join(historyDir, `${id}.json`);

    // ✅ 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    // ✅ 读取 JSON 文件
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as string[];

    // ✅ 检查索引是否有效
    if (index < 0 || index >= data.length) {
      return NextResponse.json({ error: "索引无效" }, { status: 400 });
    }

    // ✅ 删除对应索引的笔记
    data.splice(index, 1);

    // ✅ 写回 JSON 文件
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("❌ 删除笔记失败:", error);
    return NextResponse.json({ error: "删除笔记失败", details: String(error) }, { status: 500 });
  }
}
