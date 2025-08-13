"use client";

import { useState } from "react";
import Link from "next/link";
import Toast from "@/app/components/Toast"; // 可复用 Toast 组件
import { useRouter } from "next/navigation";

// const CHATGPT_END_URL = process.env.NEXT_PUBLIC_CHATGPT_END_URL || 'http://127.0.0.1:6001'
const CHATGPT_END_URL: string = "https://deepseekmine.com"

export default function Register() {
    const [form, setForm] = useState({
        username: "",
        email_address: "",
        password: "",
        telephone: "",
    });
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${CHATGPT_END_URL}/omni/api/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (res.ok) {
                setToastMessage(data.message || "注册成功，即将跳转...");
                setTimeout(() => {
                    setToastMessage(null);
                    router.push("/login");
                }, 2000);
            } else {
                // 处理错误响应，确保显示字符串而不是对象
                let errorMessage = "注册失败，请重试";
                if (typeof data.detail === 'string') {
                    errorMessage = data.detail;
                } else if (typeof data.message === 'string') {
                    errorMessage = data.message;
                } else if (data.detail && typeof data.detail === 'object') {
                    // 如果detail是对象，尝试提取message字段
                    errorMessage = data.detail.message || "注册失败，请重试";
                }
                setToastMessage(errorMessage);
                setTimeout(() => setToastMessage(null), 3000);
            }
        } catch (error) {
            setToastMessage("网络错误，请稍后重试");
            setTimeout(() => setToastMessage(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">注册账号</h2>

                <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                    <input
                        type="text"
                        name="username"
                        placeholder="用户名"
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="email"
                        name="email_address"
                        placeholder="邮箱"
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="tel"
                        name="telephone"
                        placeholder="手机号"
                        pattern="^1[3-9]\d{9}$"
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="密码"
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        onChange={handleChange}
                        required
                    />
                    <button
                        type="submit"
                        className={`w-full font-semibold py-3 rounded-lg transition text-white ${loading
                            ? "bg-indigo-300 cursor-not-allowed"
                            : "bg-indigo-500 hover:bg-indigo-600"
                            }`}
                        disabled={loading}
                    >
                        {loading ? "注册中..." : "注册"}
                    </button>
                </form>

                <p className="text-center text-gray-600 mt-4">
                    已有账号？{" "}
                    <Link href="/login" className="text-indigo-500 hover:underline">
                        去登录
                    </Link>
                </p>
            </div>

            {toastMessage && (
                <Toast
                    message={toastMessage}
                    onClose={() => setToastMessage(null)}
                />
            )}
        </div>
    );
}