import { NextResponse } from "next/server";
import { LLMModel } from "@/app/lib/llmModel";
import logger from "@/app/lib/logger";

export async function POST(req: Request) {
  try {
    const { prompt, history } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const llm = await LLMModel.create();
    const encoder = new TextEncoder();

    const validHistory = Array.isArray(history) ? history : [];

    const messages: { role: string; content: string }[] = [
      {
        role: "system",
        content: `你是一个严谨、专业的助手，你的任务是基于提供的参考资料和所有历史消息中的所有参考资料来回答用户的问题。
        
        请注意：
        - 如果参考资料能帮助你回答问题，请结合资料作答；如果资料无关，请忽略它，直接基于你的知识回答。
        - 不能编造，不添加主观臆断。
        - 请使用中文进行回复，除非用户明确告知使用其他语言回复。`
      },
      ...validHistory,
      {
        role: "user",
        content: prompt
      }
    ];

    // console.log("最终发送到LLM的提示词：",JSON.stringify(messages));

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of llm.queryLLM(messages)) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`Error: ${err}`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain" },
    });

  } catch (error) {
    return NextResponse.json({ error: `LLM API Error: ${error}` }, { status: 500 });
  }
}
