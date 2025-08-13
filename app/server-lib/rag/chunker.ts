// chunker.ts
// 将文本切分成不超长的块，并保证结构化记录（如 Excel “记录 X”）整体不被拆分。

// 检测中文
const isChinese = (txt: string) => /[\u4e00-\u9fa5]/.test(txt);
// 中文按句子分割
const splitSentences = (txt: string) =>
  txt.split(/(?<=[。！？.!?])/).map(s => s.trim()).filter(Boolean);
// 将整体文本按“记录 X”或“行 X”标识切分为完整记录
const splitStructured = (text: string) => {
  const pattern = /^.+ - .+ - (?:记录|行) \d+$/gm;
  const matches = Array.from(text.matchAll(pattern));
  if (!matches.length) return text.split(/\n\n/).filter(Boolean);
  return matches.map((m, i) => {
    const start = m.index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    return text.slice(start, end).trim();
  });
};

/**
 * splitChunks
 * @param text 原始文本
 * @param opts { maxLenCn, maxLenEn, overlap }
 * @returns 文本块数组
 */
export function splitChunks(
  text: string,
  { maxLenCn = 550, maxLenEn = 1000, overlap = 0 } = {}
): string[] {
  const raw = text.trim().replace(/\r\n/g, "\n");
  if (!raw) return [];

  const isCn = isChinese(raw);
  const maxLen = isCn ? maxLenCn : maxLenEn;
  // 检测是否结构化记录
  const structured = /(?:记录|行)\s+\d+/.test(raw);
  // 单位：记录 or 句子/单词
  const units = structured
    ? splitStructured(raw)
    : isCn
      ? splitSentences(raw)
      : raw.split(/\s+/).filter(Boolean);

  const chunks: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    if (!buf.length) return;
    // 拼接缓冲区内容
    chunks.push(
      structured
        ? buf.join("\n\n")          // 结构化记录间用空行分隔
        : isCn
          ? buf.join("")           // 中文无空格
          : buf.join(" ")          // 英文单词间空格
    );
    buf = [];
  };

  for (const u of units) {
    if (structured) {
      // 完整记录加入缓冲区前检查长度
      const currLen = buf.join("\n\n").length;
      const unitLen = u.length + (buf.length ? 2 : 0); // 加空行长度
      if (buf.length && currLen + unitLen > maxLen) flush();
      buf.push(u);
      // 单个记录超长则强制输出
      if (buf.length === 1 && buf[0].length > maxLen) flush();
    } else {
      // 普通文本滑窗
      const next = isCn ? buf.join("") + u : [...buf, u].join(" ");
      if (next.length > maxLen) { flush(); buf.push(u); }
      else buf.push(u);
    }
  }
  flush();

  // 非结构化数据且需要重叠时添加 overlap 行为
  if (overlap > 0 && !structured) {
    const out: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) out.push(chunks[i]);
      else {
        const prevUnits = isCn ? splitSentences(chunks[i - 1]) : chunks[i - 1].split(/\s+/);
        const curUnits = isCn ? splitSentences(chunks[i]) : chunks[i].split(/\s+/);
        // 取上块尾部 overlap 单位与本块组合
        const slice = prevUnits.slice(-overlap);
        out.push(
          isCn
            ? slice.join("") + curUnits.join("")
            : [...slice, ...curUnits].join(" ")
        );
      }
    }
    return out;
  }

  return chunks;
}
