type Fragment = {
  content?: string;
  title?: string;
  fileType?: string;
};

export async function getFileFragments(title: string, index: string): Promise<Fragment[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:3335";
    const url = new URL("/api/files/fragments", baseUrl);
    url.searchParams.set("title", title);
    url.searchParams.set("index", index);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[getFileFragments] 获取失败: ${errText}`);
      return [];
    }

    const { hits } = (await res.json()) as { hits: Fragment[] };
    return hits ?? [];
  } catch (err) {
    console.error("[getFileFragments] 异常:", err);
    return [];
  }
}
