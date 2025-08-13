import { NextRequest, NextResponse } from "next/server";
import { QueryMemory } from "@/app/server-lib/rag/memory";
import { MeiliHit, searchMeilisearch } from "@/app/server-lib/rag/retrieve";
import { buildRagPrompt } from "@/app/server-lib/rag/prompt";
import { getFileFragments } from "@/app/server-lib/rag/fragments";

const memory = new QueryMemory();

// 封装统一 CORS headers
function withCORS(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function OPTIONS() {
  const res = new Response(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") ?? "";
  const knowledgeLabel = searchParams.get("knowledgeLabel") ?? "";
  const reset = searchParams.get("reset") === "true";
  const useAdaptiveRag = searchParams.get("useAdaptiveRag") !== "false";
  const docId = searchParams.getAll("docId");
  const authorization = req.headers.get("authorization");

  if (!query || !knowledgeLabel) {
    return withCORS(
      NextResponse.json({ error: "缺少 query 或 knowledgeLabel 参数" }, { status: 400 })
    );
  }

  if (reset) memory.reset();

  try {
    let decision = "partially";

    if (useAdaptiveRag) {
      if (!authorization) {
        return withCORS(
          NextResponse.json({ error: "缺少 Authorization Header" }, { status: 401 })
        );
      }

      const res = await fetch(
        `https://deepseekmine.com/omni/api/rag/adaptive/decision?query=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: { Authorization: authorization },
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        }
      );
      // console.log("res: ", res)
      if (res.ok) {
        const json = await res.json();
        decision = json?.decision ?? "partially";
      }
    }
    console.log("[DEBUG] decision: ", decision)

    if (decision === "totally") {
      if (!docId?.length) {
        return withCORS(
          NextResponse.json({
            query,
            mode: "totally",
            message: "没有勾选分析的文档",
            full_text: "",
            fragments: [],
          })
        );
      }

      const fullTextParts: string[] = [];
      console.log(`docId.length: ${docId.length}`)

      for (let i = 0; i < Math.min(3, docId.length); i++) {
        const doc_id = docId[i];
        const index = `kb_${knowledgeLabel}`;
        const fragments = await getFileFragments(doc_id, index);
        const docContent = fragments.map((f) => f.content ?? "").join("\n");
        const title = fragments[0]?.title ?? "未知文档";
        const ext = fragments[0]?.fileType ?? "";
        fullTextParts.push(`----- 这是文档 ${title}.${ext} 的内容 -----\n${docContent}`);
      }

      const resultPrompt = [
        "你是一个有知识的助手，请参考给定的资料来回答用户的问题，若资料对你没帮助请忽略它们。",
        "",
        "[问题]",
        `用户提问：${query}`,
        "",
        "[参考资料]",
        fullTextParts.join("\n\n"),
        "",
        "请基于上面提供的资料内容回答问题。"
      ].join("\n");

      return withCORS(
        NextResponse.json({ query, ok: true, result_prompt: resultPrompt, hits: [] })
      );
    }

    const hits = await searchMeilisearch(query, knowledgeLabel, memory, {
      topK: 100,
      allowedIds: docId
    });
    
    console.log(`[DEBUG] hits.length: ${hits.length}`)

    if (!hits.length) {
      return withCORS(
        NextResponse.json({
          query,
          ok: true,
          messages: "未找到匹配",
          result_prompt: buildRagPrompt(query, [])[0],
          hits: []
        })
      );
    }

    const filtered = hits.filter(
      (h): h is MeiliHit & { bm25_score: number } =>
        typeof h.bm25_score === "number" && h.bm25_score >= 0.
    );

    const topK = filtered.slice(0, 5);
    const top1Score = topK[0]?.bm25_score ?? 0;

    const extra = filtered.slice(5).filter(
      (h): h is MeiliHit & { bm25_score: number } =>
        h.bm25_score >= 0.7 && (top1Score - h.bm25_score <= 0.6)
    );

    const final = [...topK, ...extra]
      .filter((h): h is MeiliHit & { bm25_score: number } => top1Score - h.bm25_score <= 0.6)
      .sort((a, b) => b.bm25_score - a.bm25_score);

    // console.log("[DEBUG] final: ", final);
    const [resultPrompt, hitsOutput] = buildRagPrompt(query, final);

    return withCORS(
      NextResponse.json({
        query,
        ok: true,
        result_prompt: resultPrompt,
        hits: hitsOutput
      })
    );

  } catch (err) {
    console.error("RAG 搜索失败:", err);
    const hits = await searchMeilisearch(query, knowledgeLabel, memory, {
      topK: 100,
      allowedIds: docId
    });
    const [resultPrompt, hitsOutput] = buildRagPrompt(query, hits || []);
    return withCORS(
      NextResponse.json({ query, ok: true, result_prompt: resultPrompt, hits: hitsOutput })
    );
  }
}
