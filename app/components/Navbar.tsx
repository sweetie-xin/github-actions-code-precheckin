"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConfigModal from "@/app/components/ConfigModal";
import { useAuth } from "@/app/context/AuthProvider";

// const DEEPSEEKMINE_OFFICIAL_URL: string = process.env.DEEPSEEKMINE_OFFICIAL_URL || "http://127.0.0.1:3001"
// const DEEPSEEKMINE_OFFICIAL_URL: string = process.env.NEXT_PUBLIC_DEEPSEEKMINE_OFFICIAL_URL || "http://127.0.0.1:3001"
const DEEPSEEKMINE_OFFICIAL_URL: string = "https://deepseekmine.com";

// ===== TS 类型声明：通过 preload 暴露到渲染端的 API =====
// myy0811修改
declare global {
    interface Window {
        electronAPI?: {
            openExternal: (url: string) => void; // 在系统默认浏览器打开外链
            // 下面两项为可选：如果你在 preload 里还暴露了版本事件，可直接用
            onUpdateVersion?: (cb: (version: string) => void) => void;
            offUpdateVersion?: (cb: (version: string) => void) => void;
        };
    }
}

export default function Navbar() {
    const router = useRouter();
    const { isLoggedIn, logout, isAdmin } = useAuth();

    const [showConfigModal, setShowConfigModal] = useState(false);
    const [version, setVersion] = useState("2.0.0");

    useEffect(() => {
        // 监听主进程推送的版本号（如果 preload 暴露了该事件）
        // myy0811修改
        const handler = (v: string) => setVersion(v);
        if (window.electronAPI?.onUpdateVersion) {
            window.electronAPI.onUpdateVersion(handler);
            return () => {
                window.electronAPI?.offUpdateVersion?.(handler);
            };
        }
    }, []);

    // 点击“满血”：通过主进程在系统默认浏览器中打开外链
    // myy0811修改
    const handleOpenPayPage = () => {
        const url = `${DEEPSEEKMINE_OFFICIAL_URL}/pay`;
        if (window.electronAPI?.openExternal) {
            window.electronAPI.openExternal(url); // Electron 环境：调用主进程 shell.openExternal
        } else {
            window.open(url, "_blank"); // 纯 Web 环境回退：新标签页打开
        }
    };

    return (
        <header className="flex items-center justify-between py-4 px-6 bg-white shadow-sm">
            <div
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => router.push("/")}
            >
                <Image src="/logo.png" alt="Logo" width={28} height={28} />
                <span className="text-xs text-muted-foreground">v{version}</span>
            </div>

            <div className="flex items-center space-x-4">
                <button
                    className="text-sm rounded-md px-3 py-2 hover:bg-gray-100 transition"
                    onClick={() => router.push("/")}
                >
                    首页
                </button>

                <button
                    className="text-sm rounded-md px-3 py-2 hover:bg-gray-100 transition"
                    onClick={() => setShowConfigModal(true)}
                >
                    本地
                </button>

                {/* myy0811修改：点击后在系统默认浏览器打开 /pay */}
                <button
                    className="text-sm rounded-md px-3 py-2 hover:bg-gray-100 transition"
                    onClick={handleOpenPayPage}
                >
                    满血
                </button>

                {isLoggedIn ? (
                    <>
                        <button
                            className="text-sm rounded-md px-3 py-2 hover:bg-gray-100 transition"
                            onClick={() => router.push("/dashboard")}
                        >
                            我
                        </button>
                        <button
                            className="text-sm rounded-md px-3 py-2 hover:bg-gray-100 transition"
                            onClick={async () => {
                                await logout();
                                router.push("/");
                                router.refresh();
                            }}
                        >
                            退出
                        </button>
                    </>
                ) : (
                    <button
                        className="text-sm rounded-md px-3 py-2 hover:bg-gray-100 transition"
                        onClick={() => router.push("/login")}
                    >
                        登录
                    </button>
                )}

                <button
                    className="text-sm rounded-md px-3 py-2 hover:bg-gray-100 transition"
                    onClick={() => router.push("/feedback")}
                >
                    反馈
                </button>

                {showConfigModal && <ConfigModal onClose={() => setShowConfigModal(false)} />}
            </div>
        </header>
    );
}
