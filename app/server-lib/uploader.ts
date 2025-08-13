// server-lib/uploader.ts
import { extractText } from "@/app/server-lib/file_parser";
import { splitChunks } from "@/app/server-lib/rag/chunker";
import { v4 as uuid } from "uuid";
import { MEILI_BASE, MEILI_HEADERS } from "@/app/server-lib/meili.config";
import { readFile } from "fs/promises";

export async function processUploadedFile(
  filepath: string,
  filename: string,
  knowledgeLabel: string,
  knowledgeName: string,
) {
  // 1. 读取文件为 Buffer
  const buffer = await readFile(filepath);
  
  // 2. 调用 extractText 处理 Buffer
  const rawText = await extractText(buffer, filename);

  // 3. 切块
  const chunks = splitChunks(rawText);

  // 4. 组装写入 Meilisearch 的文档
  const docs = chunks.map((content: string, idx: number) => ({
    id: uuid(),
    doc_index: filename,
    doc_index2: idx + 1,
    title: filename,
    content,
    segmentContent: content,
    fileType: filename.split(".").pop(),
    knowledgeLabel,
    knowledgeName,
  }));

  // 5. 使用动态索引名
  const indexName = `kb_${knowledgeLabel}`;
  await fetch(`${MEILI_BASE}/indexes/${indexName}/documents`, {
    method: "POST",
    headers: MEILI_HEADERS,
    body: JSON.stringify(docs),
  });

  return { filename, inserted: docs.length };
}
