"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthProvider";
import { User, CalendarCheck, Coins } from "lucide-react";
// 关键：从 tokenService 使用无感登录能力
import { ensureAccessToken, getAccessToken } from "@/app/api/auth/tokenService";

interface UsageInfo {
    status: number;
    message: string;
    username: string;
    used_count: number;
    total_count: number;
    remaining_count: number;
    orders: string[];
    start_date: string;
    end_date: string;
}

// const CHATGPT_END_URL: string = "https://deepseekmine.com";
const CHATGPT_END_URL: string = "http://localhost:5002";

export default function Dashboard() {
    const { username } = useAuth();
    const [usage, setUsage] = useState<UsageInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [err, setErr] = useState<string>("");

    useEffect(() => {
        async function fetchUsage() {
            setLoading(true);
            setErr("");

            try {
                // 1) 先确保 access 可用（无感刷新）
                await ensureAccessToken();
                const at = getAccessToken();
                if (!at) {
                    setErr("请先登录后查看使用情况。");
                    setUsage(null);
                    return;
                }

                // 2) 携带内存中的 access 发起请求
                const res = await fetch(`${CHATGPT_END_URL}/omni/api/chat/usage/`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${at}`,
                        "Content-Type": "application/json",
                    },
                });

                // 3) 处理响应
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                    setUsage(data as UsageInfo);
                } else if (res.status === 401) {
                    setErr("会话已过期，请重新登录。");
                    setUsage(null);
                } else {
                    setErr(data?.detail || data?.message || "获取使用情况失败。");
                    setUsage(null);
                }
            } catch (e) {
                setErr("网络或服务异常，请稍后重试。");
                setUsage(null);
            } finally {
                setLoading(false);
            }
        }

        fetchUsage();
    }, []);

    return (
        <div className="container mx-auto p-6">
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                    <User className="w-6 h-6 text-indigo-500" />
                    <span>个人中心</span>
                </h2>

                <div className="mt-4 space-y-4 text-gray-700">
                    <p className="flex items-center">
                        <User className="w-5 h-5 text-blue-500 mr-2" />
                        <strong>用户名：</strong>{usage?.username || username || "未设置"}
                    </p>

                    {loading ? (
                        <p className="text-gray-500">加载中...</p>
                    ) : err ? (
                        <p className="text-red-600">{err}</p>
                    ) : (
                        <>
                            <p className="flex items-center">
                                <Coins className="w-5 h-5 text-yellow-500 mr-1" />
                                <strong>剩余金币数：</strong>{usage ? usage.remaining_count : "-"}
                            </p>
                            <p className="flex items-center">
                                <Coins className="w-5 h-5 text-yellow-500 mr-1" />
                                <strong>总金币数：</strong>{usage?.total_count ?? "-"}，
                                已用：{usage?.used_count ?? "-"}
                            </p>
                            <p className="flex items-center">
                                <CalendarCheck className="w-5 h-5 text-teal-600 mr-2" />
                                <strong>套餐周期：</strong>
                                {usage?.start_date} ~ {usage?.end_date}
                            </p>
                        </>
                    )}
                </div>
            </div>


            <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-800">更多功能</h2>
                <p className="text-gray-600 mt-2">更多功能开发中，敬请期待。</p>
            </div>
        </div>
    );
}
