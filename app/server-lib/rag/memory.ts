/** 环形数组工具：保持最大长度，超出时自动移除最旧元素 */
class RingArray<T> {
  private readonly maxlen: number;
  private data: T[];

  constructor(maxlen: number) {
    this.maxlen = maxlen;
    this.data = [];
  }

  push(item: T): void {
    if (this.data.length >= this.maxlen) {
      this.data.shift();
    }
    this.data.push(item);
  }

  clear(): void {
    this.data = [];
  }

  get length(): number {
    return this.data.length;
  }

  get last(): T | undefined {
    return this.data[this.data.length - 1];
  }

  [Symbol.iterator](): Iterator<T> {
    return this.data[Symbol.iterator]();
  }

  toArray(): T[] {
    return [...this.data];
  }
}

/** 关键词 / 查询记忆器 */
export class QueryMemory {
  private readonly keywordHistory: RingArray<string[]>;
  private readonly queryHistory: RingArray<string>;
  private readonly seenKeywords: Set<string>;

  constructor(maxRounds = 20) {
    this.keywordHistory = new RingArray<string[]>(maxRounds);
    this.queryHistory = new RingArray<string>(maxRounds);
    this.seenKeywords = new Set<string>();
  }

  addKeywords(keywords: string[]): void {
    const newKws = keywords
      .map((kw) => kw.trim())
      .filter((kw) => kw && !this.seenKeywords.has(kw));

    if (newKws.length > 0) {
      this.keywordHistory.push(newKws);
      newKws.forEach((kw) => this.seenKeywords.add(kw));
    }
  }

  addQuery(query: string): void {
    const q = query.trim();
    if (q) {
      this.queryHistory.push(q);
    }
  }

  getLastKeywords(): string[] | undefined {
    return this.keywordHistory.last;
  }

  getLastQuery(): string | undefined {
    return this.queryHistory.last;
  }

  getAllKeywords(): string[] {
    const out: string[] = [];
    const seen: Set<string> = new Set();
    for (const lst of this.keywordHistory) {
      for (const kw of lst) {
        if (!seen.has(kw)) {
          seen.add(kw);
          out.push(kw);
        }
      }
    }
    return out;
  }

  getAllQueries(): string {
    return this.queryHistory.toArray().join('\n');
  }

  getAllQueriesArray(): string[] {
    return this.queryHistory.toArray();
  }

  removeKeywords(kws: string[]): void {
    const target = new Set(kws.map((k) => k.trim()).filter(Boolean));
    if (target.size === 0) return;

    const newKwHist: string[][] = [];
    const newQHist: string[] = [];

    const kwArr = this.keywordHistory.toArray();
    const qArr = this.queryHistory.toArray();

    for (let i = 0; i < kwArr.length; i++) {
      const kwList = kwArr[i];
      const hasTarget = kwList.some((kw) => target.has(kw));
      if (!hasTarget) {
        newKwHist.push(kwList);
        newQHist.push(qArr[i] ?? '');
      }
    }

    this.keywordHistory.clear();
    this.queryHistory.clear();
    newKwHist.forEach((lst) => this.keywordHistory.push(lst));
    newQHist.forEach((q) => this.queryHistory.push(q));

    this.seenKeywords.clear();
    for (const lst of this.keywordHistory) {
      lst.forEach((kw) => this.seenKeywords.add(kw));
    }
  }

  reset(): void {
    this.keywordHistory.clear();
    this.queryHistory.clear();
    this.seenKeywords.clear();
  }
}
