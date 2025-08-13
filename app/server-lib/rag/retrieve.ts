import { MEILI_BASE, MEILI_HEADERS } from "@/app/server-lib/meili.config";
import { getKeywords } from "@/app/server-lib/rag/keywords";
import { QueryMemory } from "@/app/server-lib/rag/memory";

export interface MeiliHit {
  id: string;
  doc_index2: string;
  title?: string;
  content?: string;
  fileType?: string;
  knowledgeLabel?: string;
  _rankingScore?: number;
  _formatted?: { segmentContent?: string };
  bm25_score?: number;
  [key: string]: unknown;
}

const chinesePunct = "，。！？：；、（）【】《》“”‘’——…";
const asciiPunct = `!"#$%&'()*+,-./:;<=>?@[\\]^_\`{|}~`;
const allPunct = new Set([...chinesePunct, ...asciiPunct]);

const isPunctuation = (w: string) => [...w].every((ch) => allPunct.has(ch));
export const filterKeywords = (words: string[]) =>
  words.filter((w) => w.trim() && !isPunctuation(w));

function processHits(hits: MeiliHit[]) {
  hits.forEach((hit) => {
    if (hit._formatted?.segmentContent) {
      hit.content = hit._formatted.segmentContent;
    } else if (!hit.content && (hit as any).segmentContent) {
      hit.content = (hit as any).segmentContent;
    }
    if (hit._rankingScore) {
      hit.bm25_score = hit._rankingScore;
    }
  });
}

async function postSearch(body: Record<string, unknown>, indexName: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);

  try {
    const res = await fetch(
      `${MEILI_BASE}/indexes/${indexName}/search`,
      {
        method: "POST",
        headers: MEILI_HEADERS,
        body: JSON.stringify(body),
        signal: ctrl.signal,
      }
    );
    if (!res.ok) throw new Error(await res.text());
    const { hits = [] } = (await res.json()) as { hits?: MeiliHit[] };
    return hits;
  } finally {
    clearTimeout(timer);
  }
}

async function phraseBackoff(
  kws: string[],
  topK: number,
  baseFilter: string[],
  indexName: string
): Promise<MeiliHit[]> {
  for (let n = kws.length; n > 0; n--) {
    const q = kws.slice(0, n).map((w) => `"${w}"`).join(" ");
    const hits = await postSearch({
      q,
      limit: topK,
      filter: baseFilter,
      matchingStrategy: "all",
      attributesToRetrieve: [
        "content",
        "title",
        "_rankingScore"
      ],
      showRankingScore: true,
      attributesToHighlight: ["content"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>"
    }, indexName);
    if (hits.length) return hits;
  }
  return [];
}

export async function searchMeilisearch(
  query: string,
  knowledgeLabel: string,
  mem: QueryMemory,
  { topK = 100, allowedIds = [] }: { topK?: number; allowedIds?: string[] } = {}
) {
  mem.addQuery(query);

  const keywords = await getKeywords(mem.getAllQueries(), mem);
  
  console.log("[DEBUG] Extracted keywords:", keywords);

  mem.addKeywords(keywords);

  if (!keywords.length) 
    return [];

  const indexName = `kb_${knowledgeLabel}`;
  const baseFilter: string[] = [];

  if (allowedIds.length) {
    baseFilter.push(
      `(${allowedIds.map((id) => `title = "${id}"`).join(" OR ")})`
    );
  }
  
  // console.log("[DEBUG] baseFilter:", baseFilter);

  let hits = await phraseBackoff(keywords, topK, baseFilter, indexName);
  processHits(hits);

  if (!hits.length) {
    hits = await postSearch({
      q: keywords.join(" "),
      limit: topK,
      filter: baseFilter,
      matchingStrategy: "last",
      attributesToRetrieve: [
        "content",
        "title",
        "_rankingScore"
      ],
      attributesToHighlight: ["content"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      showRankingScore: true
    }, indexName);
    processHits(hits);
  }

  if (!hits.length) {
    hits = await postSearch({
      q: mem.getAllQueriesArray().join(" "),
      limit: topK,
      filter: baseFilter,
      matchingStrategy: "last",
      attributesToRetrieve: [
        "content",
        "title",
        "_rankingScore"
      ],
      attributesToHighlight: ["content"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      showRankingScore: true
    }, indexName);
    processHits(hits);
  }
  // console.log("-------\n[DEBUG] hits:", hits);
  return hits;
}
