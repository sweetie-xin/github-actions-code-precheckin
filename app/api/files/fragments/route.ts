import { NextRequest, NextResponse } from "next/server";
import { MEILI_BASE, MEILI_HEADERS } from "@/app/server-lib/meili.config";

const BATCH_SIZE = 100;

async function checkIndexExists(index: string): Promise<boolean> {
  const indexUrl = `${MEILI_BASE}/indexes/${index}`;
  const res = await fetch(indexUrl, { method: "GET", headers: MEILI_HEADERS });
  return res.ok;
}

async function fetchAllDocIds(title: string, index: string): Promise<string[]> {
  const indexUrl = `${MEILI_BASE}/indexes/${index}`;
  const searchUrl = `${indexUrl}/search`;

  let allDocIds: string[] = [];
  let offset = 0;
  const limit = 1000;  // Meilisearch 最大允许批量限制，根据实际情况调整

  while (true) {
    const searchRes = await fetch(searchUrl, {
      method: "POST",
      headers: MEILI_HEADERS,
      body: JSON.stringify({
        q: "",
        filter: [`title = '${title}'`],
        sort: ["doc_index2:asc"],
        limit,
        offset,
      }),
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      throw new Error(`[fetchAllDocIds] 搜索失败: ${errText}`);
    }

    const { hits = [] } = await searchRes.json();
    if (hits.length === 0) break;

    const ids = hits.map((doc: any) => doc.id);
    allDocIds = allDocIds.concat(ids);

    if (hits.length < limit) break; //返回结果不满 limit，表示无后续页
    offset += hits.length;
  }

  return allDocIds;
}

async function deleteBatch(index: string, docIds: string[]) {
  const indexUrl = `${MEILI_BASE}/indexes/${index}`;
  const deleteRes = await fetch(`${indexUrl}/documents/delete-batch`, {
    method: "POST",
    headers: MEILI_HEADERS,
    body: JSON.stringify(docIds),
  });

  if (!deleteRes.ok) {
    const errText = await deleteRes.text();
    throw new Error(`[deleteBatch] 删除失败: ${errText}`);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "";
  const index = searchParams.get("index") || "";

  if (!title || !index) {
    console.warn("[GET /fragments] 缺少 title 或 index 参数", { title, index });
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  const indexExists = await checkIndexExists(index);
  if (!indexExists) {
    console.warn(`[GET /fragments] 索引 ${index} 不存在，返回空结果`);
    return NextResponse.json({ total: 0, hits: [] });
  }

  const indexUrl = `${MEILI_BASE}/indexes/${index}`;
  const searchUrl = `${indexUrl}/search`;

  const searchRes = await fetch(searchUrl, {
    method: "POST",
    headers: MEILI_HEADERS,
    body: JSON.stringify({
      q: "",
      filter: [`title = '${title}'`],
      sort: ["doc_index2:asc"],
      limit: 1000,
    }),
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    console.error(`[GET /fragments] 搜索失败: ${errText}`);
    return NextResponse.json({ error: errText }, { status: 500 });
  }

  const { hits = [] } = await searchRes.json();
  console.log(`[GET /fragments] 获取 ${hits.length} 个片段 for title=${title}`);
  return NextResponse.json({ total: hits.length, hits });
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "";
    const index = searchParams.get("index") || "";

    if (!title || !index) {
      console.warn("[DELETE /fragments] 缺少 title 或 index 参数", { title, index });
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    const indexExists = await checkIndexExists(index);
    if (!indexExists) {
      console.warn(`[DELETE /fragments] 索引 ${index} 不存在，返回已删除 0`);
      return NextResponse.json({ deleted: 0 });
    }

    // 1. 获取所有匹配文档的 id
    const allDocIds = await fetchAllDocIds(title, index);
    if (allDocIds.length === 0) {
      console.log(`[DELETE /fragments] 无匹配文档需要删除 for title=${title}`);
      return NextResponse.json({ deleted: 0 });
    }

    // 2. 分批删除，批量并发执行
    const batches: string[][] = [];
    for (let i = 0; i < allDocIds.length; i += BATCH_SIZE) {
      batches.push(allDocIds.slice(i, i + BATCH_SIZE));
    }

    // 并发删除所有批次
    await Promise.all(
      batches.map(async (batch, idx) => {
        await deleteBatch(index, batch);
        console.log(`[DELETE /fragments] 删除批次 ${idx + 1}/${batches.length}, 数量: ${batch.length}`);
      })
    );

    console.log(`[DELETE /fragments] 总计删除 ${allDocIds.length} 个片段 for title=${title}`);
    return NextResponse.json({ deleted: allDocIds.length });
  } catch (err) {
    console.error("[DELETE /fragments] 异常:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

