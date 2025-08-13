// components/ConfigModal.tsx
"use client";

import { useEffect, useState } from "react";
import Toast from "@/app/components/Toast";

type Config = {
    config_mode: "traditional" | "direct";
    model?: string;
    host?: string;
    port?: string;
    prefix?: string;
    suffix?: string;
    api?: string;
    model_name?: string;
    base_url?: string;
    api_key?: string;
    is_login: boolean;
    login_time?: string | Date;
};

type ConfigModalProps = {
    onClose: () => void;
    onConfigSave?: (config: Config) => void; // 保存后通知父组件更新数据
};

export default function ConfigModal({ onClose, onConfigSave }: ConfigModalProps) {
    const [config, setConfig] = useState<Config>({
        config_mode: "traditional",
        model: "deepseek-r1:1.5b",
        host: "127.0.0.1",
        port: "11434",
        prefix: "http",
        suffix: "api/chat",
        api: "",
        model_name: "deepseek-r1",
        base_url: "https://api.lkeap.cloud.tencent.com/v1",
        api_key: "",
        is_login: false,
        login_time: ""
    });

    const [loading, setLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // 组件加载时获取已有配置
    useEffect(() => {
        fetch("/api/config")
            .then((res) => res.json())
            .then((data) => {
                setConfig((prev) => ({
                    ...prev,
                    ...data,
                    config_mode: data.config_mode || "traditional",
                }));
            })
            .catch((error) => {
                console.error("Error loading config:", error);
            });
    }, []);

    // 根据配置模式动态更新完整API路径（仅对传统模式有效）
    useEffect(() => {
        if (config.config_mode === "traditional") {
            setConfig((prev) => ({
                ...prev,
                api: `${prev.prefix}://${prev.host}:${prev.port}/${prev.suffix}`,
            }));
        }
    }, [config.prefix, config.host, config.port, config.suffix, config.config_mode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setConfig((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    // 切换 Tab 时修改 config_mode
    const switchTab = (mode: "traditional" | "direct") => {
        setConfig((prev) => ({
            ...prev,
            config_mode: mode,
        }));
    };

    // 保存配置
    const saveConfig = async (cfg: Config = config) => {
        setLoading(true);
        try {
            const response = await fetch("/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cfg),
            });
            const result = await response.json();
            if (result.success) {
                setToastMessage("保存成功");
                if (onConfigSave) {
                    onConfigSave(cfg);
                }
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setToastMessage("保存失败");
            }
        } catch {
            setToastMessage("保存配置时出错");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* 背景遮罩 */}
            <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
            {/* 弹窗内容 */}
            <div className="relative bg-white p-6 rounded shadow-md z-10 w-full max-w-lg">
                <h2 className="text-base font-bold mb-4">本地大模型配置界面</h2>

                {/* Tab 导航 */}
                <div className="flex border-b mb-4">
                    {/* <button
                        className={`px-4 py-2 -mb-px font-semibold border-b-2 ${config.config_mode === "traditional" ? "border-blue-500 text-blue-500" : "border-transparent text-gray-500"
                            }`}
                        onClick={() => switchTab("traditional")}
                    >
                        Ollama配置
                    </button> */}
                    {/* <button
                        className={`px-4 py-2 -mb-px font-semibold border-b-2 ${config.config_mode === "direct" ? "border-blue-500 text-blue-500" : "border-transparent text-gray-500"
                            }`}
                        onClick={() => switchTab("direct")}
                    >
                        API_key配置
                    </button> */}
                </div>

                {/* 根据选中的 Tab 渲染不同内容 */}
                {config.config_mode === "traditional" && (
                    <>
                        <label className="text-sm block mb-4">
                            <a
                                href="https://zglg.work/knowledge/ollama"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                            >
                                软件运行需要ollama，点击下载，根据教程获取deepseek模型
                            </a>
                        </label>
                        <label className="block text-sm text-sm">模型名称</label>
                        <input type="text" name="model" value={config.model} onChange={handleChange} className="w-full p-2 border rounded mb-4" />

                        {/* <label className="block text-sm">大模型服务器</label>
                        <input type="text" name="host" value={config.host} onChange={handleChange} className="w-full p-2 border rounded mb-4" /> */}

                        <label className="block mb-1 text-sm">
                            大模型服务器（通过安装包安装的 请选: <code>127.0.0.1</code>）
                            {/* <div className="text-sm mt-1 text-red-500 font-semibold">
                                <div>&nbsp;通过安装包安装的 请选: <code>127.0.0.1</code></div>
                            </div> */}
                        </label>
                        <select
                            name="host"
                            value={config.host}
                            onChange={handleChange}
                            className="w-full p-2 border rounded mb-4"
                        >
                            <option value="127.0.0.1">127.0.0.1</option>
                            <option value="host.docker.internal">host.docker.internal</option>
                        </select>


                        <label className="block text-sm">端口</label>
                        <input type="text" name="port" value={config.port} onChange={handleChange} className="w-full p-2 border rounded mb-4" />

                        <label className="block text-sm">前缀 (http/https)</label>
                        <input type="text" name="prefix" value={config.prefix} onChange={handleChange} className="w-full p-2 border rounded mb-4" />

                        <label className="block text-sm">后缀</label>
                        <input type="text" name="suffix" value={config.suffix} onChange={handleChange} className="w-full p-2 border rounded mb-4" />

                        <label className="block text-sm">Ollama完整API路径</label>
                        <input type="text" value={config.api} readOnly className="w-full p-2 border bg-gray-200 rounded mb-4" />
                    </>
                )}

                {/* {config.config_mode === "direct" && (
                    <>
                        <label className="block text-sm">模型名称</label>
                        <input type="text" name="model_name" value={config.model_name} onChange={handleChange} className="w-full p-2 border rounded mb-4" />

                        <label className="block text-sm">基础URL</label>
                        <input type="text" name="base_url" value={config.base_url} onChange={handleChange} className="w-full p-2 border rounded mb-4" />

                        <label className="block text-sm">API Key</label>
                        <input type="password" name="api_key" value={config.api_key} onChange={handleChange} className="w-full p-2 border rounded mb-4" />
                    </>
                )} */}
                {/* 保存按钮 */}
                <button onClick={() => saveConfig()} disabled={loading} className="w-full bg-blue-500 text-white py-2 rounded mt-4">
                    {loading ? "保存中..." : "保存配置"}
                </button>

                {/* Toast提示 */}
                {toastMessage && (
                    <Toast
                        message={toastMessage}
                        onClose={() => setToastMessage(null)}
                    />
                )}

                {/* 关闭按钮 */}
                <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>
                    ❎
                </button>
            </div>
        </div>
    );
}
