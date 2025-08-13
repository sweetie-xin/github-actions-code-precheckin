'use client';

import { useState, useRef, useEffect, ComponentProps } from "react";
// import { useRouter } from "next/navigation";
import { Send, User, Rocket, Bookmark, Copy, Edit, Notebook, RefreshCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ISearchResults } from "../types/deftypes";
import Toast from "@/app/components/Toast";
import * as shiki from "shiki";
// import { checkLogin } from "@/app/lib/checkLogin";
import ConfigModal from "@/app/components/ConfigModal";  // 假设你的 modal 在这里
import { Document, Paragraph, TextRun, Packer } from 'docx';
import { saveAs } from 'file-saver';
import { ensureAccessToken, getAccessToken } from "@/app/api/auth/tokenService";

interface ChatProps {
    apiEndpoint: string;
    knowledgeLabel: string
    placeholder?: string;
    onSaveSummary: (summary: string) => void;
    onSearchResults: (hits: ISearchResults[]) => void;
    resetKeywordsCaches: boolean,
    selectedFileIds: string[];
}

// 开发调试环境
const baseUrl: string = "http://127.0.0.1:3335"

// 生产环境
// const baseUrl: string = "https://deepseekmine.com"

/**
 * 从文本中提取 <think> 标签的内容（思考过程）和正式回复内容
 */
const extractThinkAndFinal = (text: string): { thinking: string; final: string } => {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/;
    const match = text.match(thinkRegex);
    const thinking = match ? match[1].trim() : "";
    const final = text.replace(thinkRegex, "").trim();
    return { thinking, final };
};

/**
 * 去除 <think> 标签，用于保存笔记时只保留正式回复
 */
const removeThinkTags = (text: string): string => {
    return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
};

/**
 * 自定义 Markdown 渲染组件，用于展示 AI 回复时的 Markdown 内容，
 * 特别是代码块会使用 <pre> 包裹，样式类似 ChatGPT 的显示效果。
 */
const MarkdownRender: React.FC<{ content: string }> = ({ content }) => {
    const [highlighter, setHighlighter] = useState<shiki.Highlighter | null>(null);

    useEffect(() => {
        let isMounted = true;
        shiki.createHighlighter({
            langs: [
                "javascript",
                "typescript",
                "bash",
                "css",
                "html",
                "markdown",
                "python",
                "ini",
                "json",
                "yaml",
                "sql",
                "csharp",
                "cpp",
                "java",
                "go",
                "ruby",
                "php",
                "rust",
                "plaintext"
            ],
            themes: ['nord']
        }).then((hl) => {
            if (isMounted) setHighlighter(hl);
        }).catch((error) => {
            console.error("Shiki 高亮器加载失败:", error);
        });

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({
                    inline,
                    className,
                    children,
                    ...props
                }: ComponentProps<"code"> & { inline?: boolean }) {
                    const match = /language-(\w+)/.exec(className || "");
                    if (!inline && match && highlighter) {
                        const html = highlighter.codeToHtml(
                            String(children).replace(/\n$/, ''),
                            { lang: match[1], theme: 'nord' }
                        );

                        return (
                            <div className="my-2 overflow-x-auto w-full">
                                <pre
                                    className="p-4 rounded-lg bg-gray-900 text-white overflow-x-auto w-full"
                                    style={{
                                        backgroundColor: "#2e3440",
                                        whiteSpace: "pre",
                                        minHeight: "100%", // 确保短代码块不会塌陷
                                        display: "block", // 让 pre 自动填充整个宽度
                                    }}
                                    dangerouslySetInnerHTML={{ __html: html }}
                                />
                            </div>
                        );
                    }
                    return (
                        <code className="bg-gray-200 p-1 rounded text-pink-500" {...props}>
                            {children}
                        </code>
                    );
                },
            }}
        >
            {content}
        </ReactMarkdown>
    );
};


/**
 * 独立的组件用于展示 AI 消息
 * 将 assistant 消消息的渲染逻辑从内联 IIFE 中拆分出来
 */
const AssistantMessage: React.FC<{
    content: string;
    index: number;
    visibleThink: { [index: number]: boolean };
    setVisibleThink: React.Dispatch<React.SetStateAction<{ [index: number]: boolean }>>;
    isStreaming: boolean;
    onSaveSummary: (summary: string) => void;
}> = ({ content, index, visibleThink, setVisibleThink }) => {
    if (content.includes("<think>")) {
        const { thinking, final } = extractThinkAndFinal(content);
        return (
            <>
                {thinking && (
                    <div className="mt-1">
                        <button
                            onClick={() =>
                                setVisibleThink((prev) => ({
                                    ...prev,
                                    [index]: !prev[index],
                                }))
                            }
                            className="text-xs text-blue-500 underline"
                        >
                            {visibleThink[index] ? "隐藏思考过程" : "显示思考过程"}
                        </button>
                        {visibleThink[index] && (
                            <div className="text-xs italic text-gray-500 mt-1">
                                **【思考】**
                                <MarkdownRender content={thinking} /> {/* myy0303修改: Markdown 格式渲染思考过程 */}
                            </div>
                        )}
                    </div>
                )}
                <div className="text-sm m-2">
                    {/* <MarkdownRender content={final || "🤖 AI 没有回复"} /> myy0303修改: Markdown 格式渲染最终回复 */}
                    <MarkdownRender content={final || "🤖 AI 正在思考...."} />
                </div>
            </>
        );
    } else {
        // return <MarkdownRender content={content || "🤖 AI 没有回复"} />;  // myy0303修改: AI 回复全部使用 Markdown 格式显示
        return <MarkdownRender content={content || "🤖 AI 正在思考...."} />;
    }
};

export default function Chat({
    apiEndpoint,
    knowledgeLabel,
    placeholder = "输入你的问题...",
    onSaveSummary,
    onSearchResults,
    resetKeywordsCaches,
    selectedFileIds
}: ChatProps) {
    const hasResetKeyword = useRef(false);
    const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>(() => {
        // 尝试从 localStorage 读取聊天记录
        if (typeof window !== 'undefined') {
            const savedMessages = localStorage.getItem(`chat_${knowledgeLabel}`);
            return savedMessages ? JSON.parse(savedMessages) : [];
        }
        return [];
    });
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false); // 追踪是否正在流式回复
    const [visibleThink, setVisibleThink] = useState<{ [index: number]: boolean }>({}); // myy0303修改: 控制思考过程显示
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [, setSearchStatus] = useState<string>("");
    const [model, setModel] = useState<string>("加载中...");
    const [mode, setMode] = useState<string>("");
    const [toastMessage, setToastMessage] = useState<string | null>(null);  // 提示框
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
    const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null); // Replace the global isModelDropdownOpen state with an activeDropdownIndex
    const [selectedModelIndex, setSelectedModelIndex] = useState<number>(0);
    const modelBtnRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    // myy0303-6修改: 添加每个会话复制状态（针对各个 assistant 消息）
    const [copyStatusMap, setCopyStatusMap] = useState<{ [key: number]: boolean }>({});
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [useAdaptiveRag, setUseAdaptiveRag] = useState<boolean>(false); // 默认开启自适应RAG

    // 在组件中添加状态
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [editedContent, setEditedContent] = useState<string>('');
    const [isExporting, setIsExporting] = useState(false);

    const requireLogin = async () => {
        try {
            await ensureAccessToken();           // 无感刷新：有 refresh 就会换新 access
            const at = getAccessToken();

            console.log("at:", at)
            if (!at) throw new Error("no_access");
            return true;
        } catch {
            setToastMessage("请先登录后再使用云端模型");
            setTimeout(() => setToastMessage(null), 2000);
            return false;
        }
    };



    const loadConfig = async () => {
        try {
            const response = await fetch("/api/config"); // 后端 API
            if (!response.ok) throw new Error("无法加载配置文件");

            const config = await response.json();
            const modelName = config.config_mode === "traditional" ? config.model : config.model_name;
            const modeType = config.config_mode === "traditional" ? "本地" : "云端";
            setModel(modelName || "请先配置大模型");
            setMode(modeType);
        } catch (error) {
            console.error("⚠️  读取配置文件失败：", error);
            setModel("默认模型");
            setMode("未知");
        }
    };

    // 加载当前模型：本地 or 云端
    useEffect(() => {
        loadConfig();
    }, []);

    const handleCopySingleConversation = async (content: string, index: number) => {
        const conversationText = removeThinkTags(content);
        if (!conversationText) return;
        try {
            await navigator.clipboard.writeText(conversationText);
            setCopyStatusMap((prev) => ({ ...prev, [index]: true }));
            setTimeout(() => {
                setCopyStatusMap((prev) => ({ ...prev, [index]: false }));
            }, 2000);
        } catch (error) {
            console.error("复制聊天记录失败:", error);
        }
    };

    const remoteModels = [
        {
            id: 'deepseek-chat',
            model_name: 'deepseek-chat',
            description: 'deepseek满血版',
        },
        {
            id: 'qwen-plus',
            model_name: 'qwen-plus',
            description: 'Qwen满血版',
        },
        {
            id: 'gpt-4.1-mini',
            model_name: 'gpt-4.1-mini',
            description: 'gpt-4.1-mini对话模型',
        },
        {
            id: 'glm-4-plus',
            model_name: 'glm-4-plus',
            description: 'glm-4-plus模型',
        },
        {
            id: 'doubao-seed-1-6-250615',
            model_name: 'doubao-seed-1-6-250615',
            description: 'doubao-seed-1-6-250615模型',
        },
        {
            id: 'local-model',
            model_name: '本地模型',
            description: '使用本地部署的AI模型',
        }
    ];

    useEffect(() => {
        // 每次消息更新后滚动到底部
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(`chat_${knowledgeLabel}`, JSON.stringify(messages));
        }
    }, [messages, knowledgeLabel]);

    const handleSendMessage = async (text?: string, isEdited = false) => {
        const messageContent = text || inputText;
        if (!messageContent.trim()) return;

        const loginOk = await requireLogin();

        console.log("loginOk:", loginOk)
        if (!loginOk) return;

        setIsLoading(true);
        setIsStreaming(true);

        const controller = new AbortController();
        setAbortController(controller);

        // 如果不是编辑模式，则添加新的用户消息
        if (!isEdited) {
            setMessages((prev) => [...prev, { role: "user", content: messageContent }]);
        }

        // 清空输入框
        setInputText('');
        try {
            setSearchStatus("🔍 正在知识库中查询...");
            const shouldReset = resetKeywordsCaches && !hasResetKeyword.current;

            // 发起知识库搜索请求
            const params = new URLSearchParams({
                query: messageContent,
                knowledgeLabel,
                reset: String(shouldReset),
                useAdaptiveRag: useAdaptiveRag ? 'true' : 'false',
            });

            if (selectedFileIds.length > 0) {
                selectedFileIds.forEach(fileId => {
                    params.append('docId', fileId);
                });
            }
            // console.log("params-->", params.toString());
            // const token = localStorage.getItem("access_token");
            // const headers = {
            //     "Authorization": `Bearer ${token}`
            // };

            const at = getAccessToken(); // 内存里的 access
            const headers: Record<string, string> = at ? { Authorization: `Bearer ${at}` } : {};

            let searchResponse: Response;
            if (selectedFileIds.length === 0) {
                searchResponse = await fetch(`/api/search?query=${encodeURIComponent(messageContent)}&knowledgeLabel=${knowledgeLabel}&reset=${shouldReset}&useAdaptiveRag=${useAdaptiveRag}`,
                    {
                        method: "GET",
                        headers
                    });
                // searchResponse = await fetch(`${baseUrl}/api/search?query=${encodeURIComponent(messageContent)}&knowledgeLabel=${knowledgeLabel}&reset=${shouldReset}&useAdaptiveRag=${useAdaptiveRag}`,
                //     {
                //         method: "GET",
                //         headers
                //     });
            } else {
                searchResponse = await fetch(`/api/search?${params.toString()}`, {
                    method: "GET",
                    headers
                });
                // searchResponse = await fetch(`${baseUrl}/api/search?${params.toString()}`, {
                //     method: "GET",
                //     headers
                // });
            }

            hasResetKeyword.current = true;
            // console.log("searchResponse:", searchResponse)
            const searchData = await searchResponse.json();

            if (!searchResponse.ok) throw new Error("知识库搜索失败");

            const knowledgeHits = searchData.hits || [];

            onSearchResults(knowledgeHits.map((doc: ISearchResults) => ({
                id: doc.doc_id,
                title: doc.title,
                fileType: doc.fileType,
                _formatted: { content: `<mark> ${doc.content}</mark > ` },
            })));

            setSearchStatus("🤖 下一步：注入到 AI 处理...");

            // myy0707：构造与本地一致的 prompt
            const injectedPrompt = `以下是从知识库中检索到的相关信息：${searchData.result_prompt}
                                    请基于这些信息回答用户的问题：${messageContent}`;

            // 检查是否使用远程模型
            if (mode === "云端") // === 云端模型请求（无感登录）===
            {
                // 1) 确保有可用 access_token（如快过期会用 refresh_token 静默续期）
                await ensureAccessToken();
                const at = getAccessToken();
                if (!at) {
                    setToastMessage("请先登录后再使用云端模型");
                    setIsLoading(false);
                    setIsStreaming(false);
                    return;
                }

                const signal = controller.signal;

                // 2) 发起云端模型流式请求，使用内存中的 access_token
                const response = await fetch("/api/omni", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${at}`
                    },
                    body: JSON.stringify({
                        prompt: injectedPrompt,
                        options: {
                            conversationId: `conv-${knowledgeLabel}`,
                            parentMessageId: messages.length > 0 ? `msg-${messages.length - 1}` : "",
                            clearContext: !hasResetKeyword.current
                        },
                        systemMessage: "",
                        stream: true,
                        model: model
                    }),
                    signal
                });

                if (!response.ok) {
                    setToastMessage("您的使用额度不足或会话已失效");
                    throw new Error("远程模型请求失败");
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error("无法读取流数据");

                const decoder = new TextDecoder();
                let fullContent = "";

                // 3) 先插入一个空的 assistant 气泡，边读边填充
                setMessages(prev => {
                    const updated = [...prev];
                    updated.push({ role: "assistant", content: "" });
                    return updated;
                });

                if (signal.aborted) {
                    setIsStreaming(false);
                    setIsLoading(false);
                    return;
                }

                // 4) 读取服务端增量输出（行分隔 JSON，每行含 delta）
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (line.trim() === "") continue;

                        try {
                            const json = JSON.parse(line);
                            if (json.delta !== undefined) {
                                const delta: string = json.delta;

                                // 逐字符累计，维持你原来的打字机节奏
                                for (const ch of delta) {
                                    fullContent += ch;
                                    setMessages(prev => {
                                        const updated = [...prev];
                                        const last = updated[updated.length - 1];
                                        if (last?.role === "assistant") {
                                            last.content = fullContent;
                                        }
                                        return updated;
                                    });
                                    await new Promise(r => setTimeout(r, 10));
                                }
                            }
                        } catch (e) {
                            console.error("解析响应数据失败:", e, "原始行:", line);
                        }
                    }
                }
            } else {
                // 使用原来的API
                const signal = controller.signal;
                const response = await fetch(apiEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        // prompt: searchData.result_prompt,
                        prompt: injectedPrompt,
                        history: messages,
                    }),
                    signal: signal
                });
                if (signal.aborted) {
                    setIsStreaming(false);
                    setIsLoading(false);
                    return
                }

                if (!response.ok) throw new Error("请求失败");

                const reader = response.body?.getReader();
                if (!reader) throw new Error("无法读取流数据");

                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });

                    setMessages((prev) => {
                        const updatedMessages = [...prev];
                        const lastMessage = updatedMessages[updatedMessages.length - 1];
                        if (lastMessage?.role === "assistant") {
                            lastMessage.content = buffer;
                        } else {
                            updatedMessages.push({ role: "assistant", content: buffer });
                        }
                        return updatedMessages;
                    });
                }
            }

        } catch (error: unknown) {
            if ((error as Error).name === "AbortError") {
                // setMessages((prev) => [...prev, { role: "assistant", content: "⛔ 回复已中止。" }]);
            } else {
                console.error("请求失败:", error);
                setMessages((prev) => [...prev, { role: "assistant", content: "未配置好本地或满血大模型，请先配置！" }]);
            }
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
            setAbortController(null);
            setSearchStatus("");
        }
    };

    const clearChatHistory = async () => {
        try {
            // const url = `${baseUrl}/api/reset`
            const url = `/api/reset`
            const response = await fetch(url, {
                method: "POST",
            });
            if (!response.ok) {
                throw new Error("清空历史失败")
            }
            setMessages([]);
            // 清除 localStorage 中的聊天记录
            localStorage.removeItem(`chat_${knowledgeLabel}`);
            hasResetKeyword.current = false;
        } catch (error) {
            console.error(`清空历史失败: ${error}`)
            setToastMessage("清空历史失败，请重试")
            setTimeout(() => setToastMessage(null), 2000)
        }
    };

    const exportChatToWord = async () => {
        if (messages.length === 0) {
            setToastMessage("暂无聊天内容可导出");
            setTimeout(() => setToastMessage(null), 2000);
            return;
        }
        try {
            setIsExporting(true);
            
            // 动态导入 docx 模块
            const { Document, Paragraph, TextRun, Packer } = await import('docx');
            
            const dateStr = new Date().toISOString().split('T')[0];
            const children: Paragraph[] = [];
            children.push(new Paragraph({ children: [new TextRun({ text: `知识库: ${knowledgeLabel}`, bold: true })] }));
            children.push(new Paragraph({ children: [new TextRun({ text: `导出时间: ${new Date().toLocaleString('zh-CN')}`, size: 20 })] }));
            children.push(new Paragraph({ children: [new TextRun({ text: `总消息数: ${messages.length}`, size: 20 })] }));
            children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

            messages.forEach((m, idx) => {
                const roleLabel = m.role === 'user' ? '用户' : 'AI';
                const content = m.role === 'assistant' ? removeThinkTags(m.content) : m.content;
                children.push(new Paragraph({ children: [new TextRun({ text: `#${idx + 1} 【${roleLabel}】`, bold: true })] }));
                // 按行拆分，避免一段过长
                content.split(/\n+/).forEach(line => {
                    if (line.trim().length === 0) {
                        children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
                    } else {
                        children.push(new Paragraph({ children: [new TextRun({ text: line })] }));
                    }
                });
                children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
            });

            const doc = new Document({ sections: [{ children }] });
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `聊天记录_${knowledgeLabel}_${dateStr}.docx`);
            setToastMessage('聊天记录已导出');
            setTimeout(() => setToastMessage(null), 2000);
        } catch (e) {
            console.error('导出失败', e);
            setToastMessage('导出失败，请重试');
            setTimeout(() => setToastMessage(null), 2500);
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                modelBtnRef.current &&
                !modelBtnRef.current.contains(event.target as Node)
            ) {
                setActiveDropdownIndex(null);
                setIsModelDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col w-full h-full">
            {/* 顶部：模型状态 + 清空历史 + 导出 */}
            <div className="flex items-center justify-between mb-1 text-sm text-gray-600">
                <p>
                    当前模型: <span className="font-bold text-gray-800">{model}</span>（{mode}）
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportChatToWord}
                        disabled={isExporting || messages.length === 0}
                        className="px-2 py-0.5 text-xs text-indigo-600 border border-indigo-400 rounded hover:bg-indigo-500 hover:text-white disabled:opacity-50"
                    >
                        {isExporting ? '导出中...' : '导出对话'}
                    </button>
                    <button
                        onClick={clearChatHistory}
                        className="px-2 py-0.5 text-xs text-red-500 border border-red-500 rounded hover:bg-red-500 hover:text-white"
                    >
                        清空历史
                    </button>
                </div>
            </div>

            {/* 启用自适应 RAG */}
            <div className="flex items-center text-sm text-gray-600 mb-3">
                <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    checked={useAdaptiveRag}
                    onChange={(e) => setUseAdaptiveRag(e.target.checked)}
                    id="adaptive-rag"
                />
                <label htmlFor="adaptive-rag" className="flex items-center">
                    <span className="mr-2">启用自适应RAG</span>
                    <span className="text-xs text-gray-400">* 仅对满血模型有效，勾选后可用于完整文档总结</span>
                </label>
            </div>

            {/* 聊天内容区 */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-1 space-y-4 bg-white max-h-[68vh]">
                {/* {messages.length === 0 && (
                    <div className="flex flex-col items-center text-gray-500">
                        <p className="text-base font-semibold">开始你的知识对话</p>
                    </div>
                )} */}

                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-start mb-4`}
                    >
                        {/* AI 头像 */}
                        {msg.role === "assistant" && (
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 mr-2">
                                <Rocket size={18} className="text-blue-500" />
                            </div>
                        )}

                        {/* 消息气泡 */}
                        <div
                            className={`p-3 rounded-lg max-w-[80%] break-words shadow-sm text-sm ${msg.role === "user"
                                ? "bg-blue-100 text-black text-right rounded-br-none"
                                : "bg-gray-100 text-black text-left rounded-bl-none"
                                }`}
                        >
                            {/* 用户消息: 根据是否在编辑状态显示不同内容 */}
                            {msg.role === "user" ? (
                                editingMessageIndex === index ? (
                                    // 编辑状态: 显示文本输入框
                                    <div className="w-full">
                                        <textarea
                                            autoFocus
                                            value={editedContent}
                                            onChange={(e) => setEditedContent(e.target.value)}
                                            className="w-full bg-white border border-blue-200 rounded p-2 mb-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                                            rows={Math.max(2, editedContent.split('\n').length)}
                                        />
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => {
                                                    setEditingMessageIndex(null);
                                                }}
                                                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                                            >
                                                取消
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // 保存编辑后的消息
                                                    const newMessages = [...messages];
                                                    newMessages[index] = {
                                                        ...newMessages[index],
                                                        content: editedContent
                                                    };
                                                    setMessages(newMessages);
                                                    setEditingMessageIndex(null);
                                                }}
                                                className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                                            >
                                                保存
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // 保存并发送修改后的消息
                                                    const newMessages = [...messages];
                                                    newMessages[index] = {
                                                        ...newMessages[index],
                                                        content: editedContent
                                                    };

                                                    // 删除该消息之后的所有消息
                                                    const updatedMessages = newMessages.slice(0, index + 1);
                                                    setMessages(updatedMessages);
                                                    setEditingMessageIndex(null);

                                                    // 发送修改后的消息
                                                    handleSendMessage(editedContent, true);
                                                }}
                                                className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded"
                                            >
                                                发送
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // 非编辑状态: 显示普通文本
                                    <div>{msg.content}</div>
                                )
                            ) : (
                                // AI消息显示不变
                                <AssistantMessage
                                    content={msg.content}
                                    index={index}
                                    visibleThink={visibleThink}
                                    setVisibleThink={setVisibleThink}
                                    isStreaming={isStreaming}
                                    onSaveSummary={onSaveSummary}
                                />
                            )}

                            {/* 用户消息的操作按钮 - 仅在非编辑模式下显示 */}
                            {msg.role === "user" && editingMessageIndex !== index && (
                                <div className="flex justify-end mt-3 space-x-2">
                                    {/* 复制按钮 */}
                                    <div className="relative group">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(msg.content);
                                                setToastMessage("已复制");
                                                setTimeout(() => setToastMessage(null), 2000);
                                            }}
                                            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center rounded-full transition-shadow duration-150 shadow-sm hover:shadow-md focus:outline-none"
                                        >
                                            <Copy size={16} className="text-gray-600 dark:text-gray-300" />
                                        </button>
                                        <span className="absolute bottom-full left-1/2 mb-1 w-max -translate-x-1/2 rounded-md bg-black text-white text-xs py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                                            复制
                                        </span>
                                    </div>

                                    {/* 修改按钮 */}
                                    <div className="relative group">
                                        <button
                                            onClick={() => {
                                                setEditingMessageIndex(index);
                                                setEditedContent(msg.content);
                                            }}
                                            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center rounded-full transition-shadow duration-150 shadow-sm hover:shadow-md focus:outline-none"
                                        >
                                            <Edit size={16} className="text-gray-600 dark:text-gray-300" />
                                        </button>
                                        <span className="absolute bottom-full left-1/2 mb-1 w-max -translate-x-1/2 rounded-md bg-black text-white text-xs py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                                            修改
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* AI消息的操作按钮 */}
                            {msg.role === "assistant" && !(index === messages.length - 1 && isStreaming) && (
                                <div className="flex justify-start mt-1 gap-1">
                                    {/* 保存笔记 */}
                                    <button
                                        onClick={() => {
                                            if (msg.content) {
                                                const cleanedContent = removeThinkTags(msg.content);
                                                onSaveSummary(cleanedContent);
                                            }
                                        }}
                                        title="保存笔记"
                                        className="p-1 rounded-full text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                                    >
                                        <Notebook size={14} />
                                    </button>

                                    {/* 复制聊天 */}
                                    <button
                                        onClick={() => handleCopySingleConversation(msg.content, index)}
                                        title={copyStatusMap[index] ? "已复制" : "复制聊天"}
                                        className="p-1 rounded-full text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                                    >
                                        {copyStatusMap[index] ? (
                                            <span className="text-green-600 text-sm">✓</span>
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                    </button>

                                    {/* 切换模型 */}
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                setActiveDropdownIndex(activeDropdownIndex === index ? null : index);
                                            }}
                                            title="切换模型"
                                            className="p-1 rounded-full text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                                        >
                                            <RefreshCcw size={14} />
                                        </button>

                                        {activeDropdownIndex === index && (
                                            <div
                                                ref={dropdownRef}
                                                className="absolute z-10 left-0 top-full mt-1 w-64 bg-white rounded-md shadow-lg py-1 text-sm"
                                            >
                                                <div className="p-2 border-b border-gray-200 font-medium text-gray-700">
                                                    选择远程大模型
                                                </div>

                                                {remoteModels.map((model, modelIndex) => (
                                                    <div
                                                        key={model.id}
                                                        onClick={async () => {
                                                            setSelectedModelIndex(modelIndex);
                                                            setModel(model.model_name);
                                                            setMode(model.id === "local-model" ? "本地" : "云端");
                                                            setActiveDropdownIndex(null);
                                                            setToastMessage(`已切换到${model.model_name} `);
                                                            if (model.id === "local-model") {
                                                                loadConfig();
                                                            }
                                                            setTimeout(() => setToastMessage(null), 2000);
                                                        }}
                                                        className={`px-2 py-2 cursor-pointer hover:bg-gray-100 ${modelIndex === selectedModelIndex
                                                            ? "bg-blue-50 text-blue-600"
                                                            : ""
                                                            }`}
                                                    >
                                                        <div className="font-medium">{model.model_name}</div>
                                                        {model.description && (
                                                            <div className="text-xs text-gray-500">
                                                                {model.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {msg.role === "assistant" && index === messages.length - 1 && (
                                <p className="text-xs text-gray-500 ml-2 mt-1">
                                    *相比本地大模型，满血大模型检索回答效果更好，并且支持长文档查询和总结
                                </p>
                            )}
                        </div>

                        {/* 用户头像 */}
                        {msg.role === "user" && (
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-300 ml-2">
                                <User size={16} className="text-white" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {isStreaming && (
                <div className="mt-2 flex justify-center">
                    <button
                        onClick={() => {
                            abortController?.abort();
                            setIsStreaming(false);
                        }}
                        className="px-4 py-1 text-xs bg-red-100 hover:bg-red-300 text-red-700 rounded shadow-sm"
                    >
                        ⛔ 停止回复
                    </button>
                </div>
            )}
            {/* 输入区域 */}
            <div className="mt-auto w-full">
                <div
                    className="border border-gray-300 bg-white rounded-full flex items-center pl-4 pr-2 py-2 shadow-sm">
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !isLoading) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        className="flex-1 bg-transparent outline-none text-sm text-gray-700 px-2"
                    />
                    {/* Model selection dropdown button */}
                    <div className="relative mr-2">
                        <button
                            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                            className="px-3 py-1 text-lg font-semibold text-blue-500 hover:text-blue-700 rounded-md flex items-center"
                            ref={modelBtnRef}
                            title="选择AI模型"
                        >
                            @
                        </button>

                        {isModelDropdownOpen && (
                            <div
                                ref={dropdownRef}
                                className="absolute z-10 left-0 bottom-full mb-1 w-64 bg-white rounded-md shadow-lg py-1 text-sm border border-gray-200"
                            >
                                <div className="p-2 border-b border-gray-200 font-medium text-gray-700">
                                    选择大模型
                                </div>

                                {remoteModels.map((model, modelIndex) => (
                                    <div
                                        key={model.id}
                                        onClick={async () => {
                                            setSelectedModelIndex(modelIndex);
                                            setModel(model.model_name);
                                            setMode(model.id === 'local-model' ? "本地" : "云端");
                                            setActiveDropdownIndex(null); // Close dropdown after selection
                                            setToastMessage(`已切换到${model.model_name} `);
                                            if (model.id === 'local-model') {
                                                loadConfig();
                                            }
                                            // Refresh model config
                                            setTimeout(() => setToastMessage(null), 2000);
                                        }}
                                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${modelIndex === selectedModelIndex ? "bg-blue-50 text-blue-600" : ""}`}
                                    >
                                        <div className="font-medium">{model.model_name}</div>
                                        {model.description && (
                                            <div className="text-xs text-gray-500">{model.description}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => handleSendMessage(inputText, false)}
                        disabled={isLoading}
                        className="flex items-center justify-center w-10 h-10 bg-[#9B8FFF] hover:bg-indigo-500 text-white rounded-full"
                    >
                        {isLoading ? "⏳" : <Send size={16} />}
                    </button>
                </div>
            </div>

            {/* ✅ 使用 Toast 组件 */}
            {toastMessage && (
                <Toast
                    message={toastMessage}
                    onClose={() => setToastMessage(null)}
                />
            )}

            {showConfigModal && (
                <ConfigModal
                    onClose={() => setShowConfigModal(false)}
                    onConfigSave={() => {
                        loadConfig(); // 保存后立即刷新
                        setShowConfigModal(false);
                        setToastMessage("已切换到最新本地配置");
                        setTimeout(() => setToastMessage(null), 2000);
                    }}
                />
            )}
        </div>
    );
}
