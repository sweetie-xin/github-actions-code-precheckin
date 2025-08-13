import fs from "fs";
import path from "path";

export class LLMModel {
    private model: string;
    private url: string;
    private apiKey?: string;
    private useStream: boolean

    // 私有构造函数，不允许直接调用 new LLMModel()
    public constructor() {
        // 设置默认值，避免未初始化时访问 undefined 变量
        this.model = "deepseek-r1:1.5b";
        this.url = "http://host.docker.internal:11434/api/chat";
        this.useStream = true
    }

    // 静态工厂方法用于创建实例并等待初始化完成
    public static async create(): Promise<LLMModel> {
        const instance = new LLMModel();
        await instance.initialize();
        return instance;
    }

    private async initialize() {
        // 调用 loadConfig 方法加载配置数据
        const config = await this.loadConfig();
        if (config.config_mode === "traditional") {
            const suffix = config.suffix ? (config.suffix.startsWith("/") ? config.suffix : "/" + config.suffix) : "/api/chat";
            this.model = config.model || "deepseek-r1:1.5b";
            this.url = `${config.prefix || "http"}://${config.host || "host.docker.internal"}:${config.port || "11434"}${suffix}`;
            this.useStream = true
        } else {
            this.model = config.model_name || "deepseek-r1";
            this.url = config.base_url || "https://api.deepseek.com/v1/chat";
            this.apiKey = config.api_key || "";
            if (config.model_name === "deepseek-r1") {
                this.useStream = false;
            }
            else {
                this.useStream = true;
            }
        }
    }

    private async loadConfig(): Promise<Record<string, string>> {
        try {
            const configPath = path.join(process.cwd(), "config.json");
            if (fs.existsSync(configPath)) {
                const configContent = await fs.promises.readFile(configPath, "utf8"); // myy0316修改: 使用 fs.promises.readFile 读取文件
                return JSON.parse(configContent);
            }
        } catch (error) {
            console.warn("⚠️ 读取 config.json 失败，使用默认值。", error);
        }
        // 默认配置（当 config.json 不存在时）
        return {
            config_mode: "traditional",
            model: "deepseek-r1:1.5b",
            host: "127.0.0.1",
            port: "11434",
            prefix: "http",
            suffix: "/api/chat",
            base_url: "https://api.deepseek.com/v1/chat",
            api_key: "",
        };
    }

    async *queryLLM(messages: { role: string; content: string }[]): AsyncGenerator<string, void, unknown> {
        const payload = {
            model: this.model,
            messages,
            stream: this.useStream,
        };

        // logger.info(`最后发送到大模型的数据：${JSON.stringify(payload)}`);

        try {
            const response = await fetch(this.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                yield `Error: ${response.status}, ${await response.text()}`;
                return;
            }

            if (!this.useStream) {
                const data = await response.json();
                const content =
                    data?.message?.content ||
                    data?.choices?.[0]?.message?.content ||
                    data?.content ||
                    "";
                yield content;
            } else {
                const reader = response.body?.getReader();
                if (!reader) {
                    yield "Error: Unable to read response stream.";
                    return;
                }

                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });

                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const data = JSON.parse(line);
                                const content = data?.message?.content || "";
                                if (content) yield content;
                            } catch {
                                // Ignore malformed JSON chunks
                            }
                        }
                    }
                }
            }
        } catch (error) {
            yield `Connection error: ${error}`;
        }
    }

}
