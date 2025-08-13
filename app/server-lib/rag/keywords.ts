import { tokenization } from "@/app/server-lib/tokenization";
import { QueryMemory } from "@/app/server-lib/rag/memory";

/**
 * 简单判断是否为“专有词”
 */
function isLikelyProperNoun(word: string): boolean {
  return /^[\u4e00-\u9fa5]{2,4}$/.test(word);
}

/**
 * 查找最近一句话的起始位置（以标点符号断句）
 */
function lastSentenceStart(text: string): number {
  const match = text.match(/.*([。？！\n\r])/g);
  if (!match || match.length === 0) return 0;
  return match[match.length - 1].length;
}

/**
 * 原地去重（保留顺序）
 */
function dedupKeepOrder<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of arr) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

/**
 * 动态计算 topK 数量：至少 3，至多 20，跟随长度增长
 */
function smartTopK(length: number): number {
  return Math.min(Math.max(3, Math.round(length * 0.6)), 20);
}

/**
 * 优先排序：将出现在最近一句话的“专有词”排到前面
 */
function reorderRecentProperFirst(
  text: string,
  keywords: string[],
  memQuery?: QueryMemory
): string[] {
  const recentBegin = lastSentenceStart(text);

  const properRecent: string[] = [];
  const properOld: string[] = [];
  const others: string[] = [];

  for (const w of keywords) {
    if (isLikelyProperNoun(w)) {
      (text.indexOf(w, recentBegin) !== -1 ? properRecent : properOld).push(w);
    } else {
      others.push(w);
    }
  }

  if (properRecent.length && memQuery) {
    memQuery.removeKeywords(properOld);
  }

  return [...properRecent, ...properOld, ...others];
}

/**
 * 获取关键词（分词 + 去重 + TopK + 优先排序）
 */
export async function getKeywords(
  text: string,
  memQuery?: QueryMemory
): Promise<string[]> {
  const segmented = await tokenization(text);
  const tokens = segmented.split(" ").filter(Boolean);

  if (tokens.length === 0) return [];

  const topK = smartTopK(tokens.length);
  const sliced = tokens.slice(0, topK);
  let keywords = dedupKeepOrder(sliced);

  if (keywords.length > 1) {
    keywords = reorderRecentProperFirst(text, keywords, memQuery);
  }

  return keywords;
}

/**
 * 获取所有分词词项（仅去重）
 */
export async function getKeywordsAll(text: string): Promise<string[]> {
  const segmented = await tokenization(text);
  return dedupKeepOrder(segmented.split(" ").filter(Boolean));
}
