// app/api/kb/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/app/lib/configUtils";
import path from "path";

const notebooks_FILE = path.join(process.cwd(), "notebooks.json");

export async function POST(req: NextRequest) {
  try {
    // 1. 从 URL 提取 ID（适配 App Router）
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    const notebookId = Number(id);

    // 2. 提取 JSON 数据体
    const body = await req.json();
    const { fileMeta } = body;

    console.log("收到 POST 请求:", { notebookId, body });

    if (!notebookId || !fileMeta) {
      console.warn("参数不完整:", { notebookId, fileMeta });
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    // 3. 加载配置
    const notebooks = await readConfig(notebooks_FILE);
    console.log("当前 notebooks.json 中的知识库数量:", notebooks.length);

    // 4. 查找目标 notebook
    const target = notebooks.find((n: any) => n.id === notebookId);
    if (!target) {
      console.warn("未找到目标知识库:", notebookId);
      return NextResponse.json({ error: "知识库不存在" }, { status: 404 });
    }

    // 5. 初始化 files 字段
    if (!Array.isArray(target.files)) {
      console.log("目标知识库未初始化 files 字段，初始化为空数组");
      target.files = [];
    }

    // 6. 检查是否已存在相同文件
    const exists = target.files.some(
      (f: any) => f.name === fileMeta.name && f.type === fileMeta.type
    );

    if (exists) {
      console.log("文件已存在，跳过添加:", fileMeta.name);
    } else {
      console.log("添加新文件:", fileMeta.name);
      target.files.push(fileMeta);
      target.sources = target.files.length;
      await writeConfig(notebooks, notebooks_FILE);
      console.log("成功写入 notebooks.json");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("文件元信息写入失败:", err);
    return NextResponse.json({ error: "写入失败" }, { status: 500 });
  }
}




// 删除某卡片下的指定文件
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { notebookId, fileName } = body;

    console.log("[DELETE] 请求体:", body);

    if (!notebookId || !fileName) {
      console.warn("[DELETE] 参数不完整:", { notebookId, fileName });
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const notebooks = await readConfig(notebooks_FILE);
    console.log(`[DELETE] 当前 notebooks 数量: ${notebooks.length}`);

    const target = notebooks.find((n: any) => n.id === notebookId);
    if (!target) {
      console.warn(`[DELETE] 未找到 notebookId 为 ${notebookId} 的知识库`);
      return NextResponse.json({ error: "知识库不存在" }, { status: 404 });
    }

    if (!Array.isArray(target.files)) {
      console.warn(`[DELETE] 知识库 ${notebookId} 中 files 字段无效`);
      return NextResponse.json({ error: "该知识库下无文件" }, { status: 400 });
    }

    console.log(`[DELETE] 初始文件数量: ${target.files.length}`);
    console.log(`[DELETE] 原始文件列表:`, target.files.map((f: any) => `${f.name}`));

    const newFiles = target.files.filter(
      (f: any) => f.name !== fileName
    );

    const deletedCount = target.files.length - newFiles.length;
    console.log(`[DELETE] 删除了 ${deletedCount} 个文件`);

    if (deletedCount === 0) {
      console.warn(`[DELETE] 未找到匹配文件: ${fileName}`);
    }

    target.files = newFiles;
    target.sources = newFiles.length;

    await writeConfig(notebooks, notebooks_FILE);
    console.log("[DELETE] notebooks.json 写入成功");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("删除文件失败:", err);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}


// 查询某卡片下所有文件
export async function GET(req: NextRequest) {
  const notebookId = Number(req.nextUrl.searchParams.get("notebookId"));
  if (!notebookId) {
    return NextResponse.json({ error: "缺少 notebookId 参数" }, { status: 400 });
  }

  try {
    const notebooks = await readConfig(notebooks_FILE);
    const target = notebooks.find((n: any) => n.id === notebookId);
    if (!target) {
      return NextResponse.json({ error: "知识库不存在" }, { status: 404 });
    }

    return NextResponse.json({ files: target.files || [] });
  } catch (err) {
    console.error("读取文件失败:", err);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}