import { MeiliSearch } from "meilisearch";
import { CURRENT, MEILI_API_KEY, MEILI_HEADERS } from "./meili.config";

type PaginationSetting = {
  maxTotalHits: number;
};

type MeiliSettings = {
  searchableAttributes?: string[];
  filterableAttributes?: string[];
  displayedAttributes?: string[];
  sortableAttributes?: string[];
  rankingRules?: string[];
  pagination?: PaginationSetting;
};

// 导出共享的 Meilisearch 客户端
export const meiliClient = new MeiliSearch({
  host: CURRENT.MEILI_BASE,
  apiKey: MEILI_API_KEY,
});

export async function waitForTaskByUid(taskUid: number, interval = 100): Promise<void> {
  const url = `${CURRENT.MEILI_BASE}/tasks/${taskUid}`;
  while (true) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${MEILI_API_KEY}`,
      },
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Failed to check task ${taskUid}: ${res.status} ${msg}`);
    }

    const task = await res.json();

    if (task.status === "succeeded") return;
    if (task.status === "failed") {
      throw new Error(`Task ${taskUid} failed: ${task.error?.message || "Unknown error"}`);
    }

    await new Promise((r) => setTimeout(r, interval));
  }
}

export async function indexExists(indexName: string): Promise<boolean> {
  try {
    await meiliClient.getIndex(indexName);
    return true; // 索引存在
  } catch (err: any) {
    // 检查多种可能的错误类型
    if (err.code === "index_not_found" || 
        err.message?.includes("not found") ||
        err.message?.includes("Index") ||
        err.status === 404) {
      return false; // 索引不存在
    }
    throw err; // 其他错误抛出
  }
}

export const createMeiliIndex = async (indexName: string): Promise<void> => {
  try {
    console.log(`[索引创建] 开始创建索引: ${indexName}`);
    
    // 设置主键为 "id"
    await meiliClient.createIndex(indexName, { primaryKey: "id" }).catch((e: any) => {
      if (e.code !== "index_already_exists") {
        console.error(`[索引创建] 创建索引失败:`, e);
        throw e;
      } else {
        console.log(`[索引创建] 索引 ${indexName} 已存在，跳过创建`);
      }
    });

    console.log(`[索引创建] 索引 ${indexName} 创建成功，开始配置...`);
    await updateMeilisearchIndex(indexName);
    console.log(`[索引创建] 索引 ${indexName} 配置完成`);
  } catch (err) {
    console.error(`[索引创建] Meili 初始化失败:`, err);
    throw err; // 重新抛出错误，让调用者处理
  }
};


export const deleteMeiliIndex = async (indexName: string): Promise<void> => {
  try {
    await meiliClient.deleteIndex(indexName);
  } catch (err) {
    if ((err as { code: string }).code !== "index_not_found") {
      console.error("Meili 删除索引失败:", err);
    }
  }
};

async function updateMeilisearchIndex(indexName: string): Promise<void> {
  const index = meiliClient.index(indexName);

  const settings: MeiliSettings = {
    searchableAttributes: ["title", "segmentContent"],
    filterableAttributes: ["title", "doc_index2"],
    displayedAttributes: [
      "id",
      "content",
      "title",
      "doc_index2"
    ],
    sortableAttributes: ["doc_index2"],
    rankingRules: ["typo", "words", "attribute", "proximity", "exactness", "sort"],
  };

  const task = await index.updateSettings(settings)
  await waitForTaskByUid(task.taskUid);

  await fetch(`${CURRENT.MEILI_BASE}/indexes/${indexName}/settings/pagination`, {
    method: "PATCH",
    headers: MEILI_HEADERS,
    body: JSON.stringify({ maxTotalHits: 100000 }),
  });

  console.log(`Meilisearch 索引 ${indexName} 配置完成`);
}

export async function printIndexSettings(indexName: string): Promise<void> {
  const parts = [
    "searchable-attributes",
    "filterable-attributes",
    "displayed-attributes",
    "ranking-rules",
    "sortable-attributes",
    "pagination",
  ] as const;

  for (const name of parts) {
    try {
      const res = await fetch(
        `${CURRENT.MEILI_BASE}/indexes/${indexName}/settings/${name}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${MEILI_API_KEY}` },
        }
      );

      if (!res.ok) {
        console.warn(`获取 ${indexName}/${name} 失败: ${res.status}`);
        continue;
      }

      const json = (await res.json()) as unknown;
      console.log(`${indexName}/${name}:`, json);
    } catch (e) {
      console.error(`获取 ${indexName}/${name} 错误:`, e);
    }
  }
}
