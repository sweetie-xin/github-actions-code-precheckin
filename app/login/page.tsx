"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Toast from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthProvider"; // ✅ 确保 `setIsLoggedIn` 和 `setIsAdmin` 立即更新
import { setAccessToken, setRefreshToken } from "@/app/api/auth/tokenService";

// const CHATGPT_END_URL = process.env.NEXT_PUBLIC_CHATGPT_END_URL || "http://127.0.0.1:6001"

// const CHATGPT_END_URL: string = "https://deepseekmine.com"
const CHATGPT_END_URL: string = "http://localhost:5002"

export default function Login() {
    // myy0611修改: email 改为 account，统一入口字段
    const [form, setForm] = useState({ account: "", password: "" }); // myy0611修改
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const router = useRouter();
    const { setIsLoggedIn, setIsAdmin, setUserId, setUsername, setPlan } = useAuth(); // myy0524修改


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // myy0611修改: handleSubmit 构造四字段 payload，未用的设为空
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setToastMessage(null);

        try {
            const input = form.account.trim();

            // myy0611修改: 初始化四字段全部为空
            const loginPayload = {
                username: "",
                telephone: "",
                email_adress: "",
                password: form.password,
            };

            // 判断用户输入类型
            if (/^\d{6,}$/.test(input)) {
                loginPayload.telephone = input;
            } else if (input.includes("@")) {
                loginPayload.email_adress = input;
            } else {
                loginPayload.username = input;
            }

            const res = await fetch(`${CHATGPT_END_URL}/omni/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginPayload),
            });

            const data = await res.json();
            console.log(data)
            const errorMessage = data.message || data.detail || "登录失败";
            setToastMessage(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));

            // 登录成功后
            if (res.ok) {
                setIsLoggedIn(true);
                setUsername(data.username || "");
                setIsAdmin(data.isSuperAdmin || false);

                // 写 access 到内存
                if (data.access_token) {
                    setAccessToken(data.access_token);
                }

                // 写 refresh 到 localStorage（关键）
                if (data.refresh_token) {
                    setRefreshToken(data.refresh_token);
                }

                // // 你的 login.json 记录逻辑可保留
                // await fetch("/api/login", {
                //     method: "POST",
                //     headers: { "Content-Type": "application/json" },
                //     body: JSON.stringify({
                //         isFirstLogin: false,
                //         username: data.username || form.account,
                //         login_time: new Date().toISOString(),
                //     }),
                // });

                setTimeout(() => {
                    //router.back();
                    router.push("/")
                }, 1000);
            }

            setTimeout(() => setToastMessage(null), 3000);
        } catch (error) {
            console.error("[Login] 登录异常:", error);
            setToastMessage("服务器错误，请稍后再试");
        }
    };

    const { username, plan, isLoggedIn } = useAuth();

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h2 className="text-base font-bold text-center text-gray-800 mb-6">登录账号</h2>

                {/* myy0524修改: 登录后显示用户信息 */}
                {isLoggedIn && username && (
                    <div className="mb-4 p-3 rounded bg-blue-50 text-blue-900 text-center">
                        欢迎，{username}！
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col space-y-4 text-base placeholder:text-base">
                    {/* myy0611修改: account 统一输入 */}
                    <input
                        type="text"
                        name="account"
                        placeholder="用户名 / 手机号 / 邮箱"
                        className="text-sm placeholder:text-sm p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="密码"
                        className="text-sm placeholder:text-sm p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        onChange={handleChange}
                        required
                    />
                    <button
                        type="submit"
                        className="text-sm w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-lg transition"
                    >
                        登录
                    </button>
                </form>

                {/* <p className="text-center text-gray-600 mt-4 flex justify-center items-center">
                    <span>没有账号？{" "}
                        <Link href="/forgetpwd" className="text-indigo-500 hover:underline">
                            忘记密码
                        </Link>
                    </span>
                </p> */}
                <br />
                <p className="text-center text-gray-600 text-sm" >
                    <Link href="/register" className="text-indigo-500 hover:underline">
                        没有账号？点击去注册
                    </Link>
                </p>
            </div>

            {/* ✅ 使用 Toast 组件 */}
            {toastMessage && (
                <Toast
                    message={toastMessage}
                    onClose={() => setToastMessage(null)}
                />
            )}
        </div>
    );
}