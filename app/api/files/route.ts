/* --------------------------------------------------------------------------
   1. /api/files  (GET 列表, DELETE 批量删除)
---------------------------------------------------------------------------*/
// app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  MEILI_BASE,
  MEILI_HEADERS,
} from "@/app/server-lib/meili.config";

async function queryFiles(label: string) {
  // 使用动态索引名，与文件上传时保持一致
  const indexName = `kb_${label}`;

  // 首先检查索引是否存在
  const indexCheckUrl = `${MEILI_BASE}/indexes/${indexName}`;
  const indexCheckRes = await fetch(indexCheckUrl, {
    method: "GET",
    headers: MEILI_HEADERS,
  });

  // 如果索引不存在，返回空数组
  if (!indexCheckRes.ok) {
    console.log(`索引 ${indexName} 不存在，返回空数组`);
    return [];
  }

  const url = `${MEILI_BASE}/indexes/${indexName}/search`;
  const payload = {
    q: "",
    filter: [""], // 获取每个文件的第一块，包含文件信息
    limit: 1000,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: MEILI_HEADERS,
    body: JSON.stringify(payload),
  });
  console.log(
    "res--->", res
  )
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).hits as any[];
}

async function deleteByDocId(docId: string, label: string) {
  // 使用动态索引名
  const indexName = `kb_${label}`;
  console.log(` 开始删除文档: docId=${docId}, label=${label}, indexName=${indexName}`);

  // 首先检查索引是否存在
  const indexCheckUrl = `${MEILI_BASE}/indexes/${indexName}`;
  const indexCheckRes = await fetch(indexCheckUrl, {
    method: "GET",
    headers: MEILI_HEADERS,
  });

  // 如果索引不存在，返回0
  if (!indexCheckRes.ok) {
    console.log(`索引 ${indexName} 不存在，无法删除文件`);
    return 0;
  }

  // 搜索要删除的文档
  const searchUrl = `${MEILI_BASE}/indexes/${indexName}/search`;
  const searchPayload = {
    q: "",
    filter: [`doc_index = '${docId}'`],
    limit: 100000
  };
  console.log(` 搜索文档:`, searchPayload);

  const idsRes = await fetch(searchUrl, {
    method: "POST",
    headers: MEILI_HEADERS,
    body: JSON.stringify(searchPayload),
  });

  console.log("idsRes--->", idsRes);

  if (!idsRes.ok) {
    console.log(` 搜索失败: ${idsRes.status}`);
    const errorText = await idsRes.text();
    console.log(` 搜索错误: ${errorText}`);
    return 0;
  }

  const searchData = await idsRes.json();
  console.log(` 找到 ${searchData.hits.length} 个匹配的文档`);

  const ids = searchData.hits.map((h: any) => h.id);
  console.log(` 要删除的文档ID:`, ids);

  if (!ids.length) {
    console.log(` 没有找到匹配的文档`);
    return 0;
  }

  // 执行批量删除
  const delUrl = `${MEILI_BASE}/indexes/${indexName}/documents/delete-batch`;
  console.log(` 执行批量删除: ${delUrl}`);

  const delRes = await fetch(delUrl, {
    method: "POST",
    headers: MEILI_HEADERS,
    body: JSON.stringify(ids),
  });

  if (!delRes.ok) {
    console.log(` 删除失败: ${delRes.status}`);
    const errorText = await delRes.text();
    console.log(` 删除错误: ${errorText}`);
    throw new Error(await delRes.text());
  }

  console.log(` 成功删除 ${ids.length} 个文档`);
  return ids.length;
}

export async function GET(req: NextRequest) {
  
  const label = req.nextUrl.searchParams.get("knowledgeLabel") ?? "";
  if (!label) return NextResponse.json({ error: "缺少 knowledgeLabel" }, { status: 400 });
  try {
    // 如果label已经有kb_前缀，就去掉前缀
    const queryLabel = label.startsWith("kb_") ? label.substring(3) : label;
    const hits = await queryFiles(queryLabel);
    console.log("hits--->", hits);

    // 转换数据格式，将doc_index映射为doc_id，符合前端期望的UploadedFile接口
    const hits1 = hits.map((hit) => ({
      doc_id: hit.doc_index, // 将doc_index映射为doc_id
      title: hit.title,
      content: [hit.content || hit.segmentContent || ""], // 确保content是数组格式
      fileType: hit.title.split(".").pop()?.toLowerCase() || "txt",
      knowledgeLabel: hit.knowledgeLabel || label,
    }));
    console.log("hits1--->", hits1);

    return NextResponse.json(hits1); // 直接返回数组，保持与前端期望的格式一致
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  
  const docId = req.nextUrl.searchParams.get("doc_id") ?? "";
  const label = req.nextUrl.searchParams.get("knowledgeLabel") ?? "";
  if (!docId)
    return NextResponse.json({ error: "缺少 doc_id" }, { status: 400 });
  if (!label)
    return NextResponse.json({ error: "缺少 knowledgeLabel" }, { status: 400 });
  try {
    const queryLabel = label.startsWith("kb_") ? label.substring(3) : label;
    const removed = await deleteByDocId(docId, queryLabel);
    return NextResponse.json({ removed });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const runtime = "nodejs";

