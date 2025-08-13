type RagHit = {
  title?: string;
  content?: string;
  doc_index2?: string;
  fileType?: string;
};

type OutputHit = {
  title: string;
  content: string;
  doc_id: string;
  fileType?: string;
};

export function buildRagPrompt(query: string, finalResults: RagHit[]): [string, OutputHit[]] {
  let prompt = "你是一个有知识的助手，请参考给定的资料来回答用户的问题，若给定资料对你没有帮助请忽略它们。\n\n";
  prompt += "[问题]\n";
  prompt += `用户提问：${query}\n\n`;
  prompt += "[参考资料]\n";

  const extracted: OutputHit[] = [];

  finalResults.forEach((item, idx) => {
    const title = (item.title ?? "").trim();
    const content = (item.content ?? "").trim();
    const doc_id = item.doc_index2 ?? ""; // 你已取消 doc_index，改用 doc_index2

    prompt += `${idx + 1}. 文档标题：${title}\n${content}\n\n`;

    extracted.push({
      title,
      content,
      doc_id,
      fileType: item.fileType
    });
  });

  prompt += "\n请基于上面提供的资料内容回答问题。";

  return [prompt, extracted];
}
