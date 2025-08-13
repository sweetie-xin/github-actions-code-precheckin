"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// === 关键：引入 tokenService（本地 refresh，内存 access）===
import {
    setAccessToken,
    setRefreshToken,
    getRefreshToken,
    clearAccessToken,
    clearRefreshToken,
} from "@/app/api/auth/tokenService";

// const API = process.env.NEXT_PUBLIC_API_BASE ?? "https://deepseekmine.com";
const base_url = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5002";
interface AuthContextType {
    isLoggedIn: boolean;
    isAdmin: boolean;
    userId: number | null;
    username: string;
    plan: string;
    setIsLoggedIn: (value: boolean) => void;
    setIsAdmin: (value: boolean) => void;
    setUserId: (value: number | null) => void;
    setUsername: (value: string) => void;
    setPlan: (value: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);
    const [username, setUsername] = useState("");
    const [plan, setPlan] = useState("");
    const router = useRouter();

    // 启动时若存在 refresh_token，则尝试静默刷新
    useEffect(() => {
        (async () => {
            const rt = getRefreshToken();
            if (!rt) return;

            try {
                const res = await fetch(`${base_url}/omni/api/auth/refresh`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ "refresh_token": rt }),
                });

                if (!res.ok) {
                    // 刷新失败，清理残留
                    clearAccessToken();
                    clearRefreshToken();
                    setIsLoggedIn(false);
                    return;
                }

                const data = await res.json();
                if (data.access_token) setAccessToken(data.access_token);
                if (data.refresh_token) setRefreshToken(data.refresh_token); // 轮换

                // 认为无感登录成功
                setIsLoggedIn(true);

                // 可选：若有 /omni/api/me，则在此拉用户信息填充（避免把个人信息硬塞进 JWT）
                // const me = await fetch(`${API}/omni/api/me`, {
                //   headers: { Authorization: `Bearer ${data.access_token}` },
                // });
                // if (me.ok) {
                //   const info = await me.json();
                //   setUserId(info.id ?? null);
                //   setUsername(info.username ?? "");
                //   setPlan(info.plan ?? "");
                //   setIsAdmin(Boolean(info.isSuperAdmin) || info.user_type === 2);
                // }

                // 兼容你原先用的本地“登录状态”标记（可保留或删除）
                localStorage.setItem("isLogin", "true");
                localStorage.setItem("loginTimestamp", Date.now().toString());
            } catch {
                // 静默失败即可
            }
        })();
    }, []);

    const logout = () => {
        // 如果你的后端有 /logout 端点，可在此调用
        // fetch(`${API}/omni/api/logout`, { method: "POST" }).catch(() => {});
        clearAccessToken();
        clearRefreshToken();
        setIsLoggedIn(false);
        setIsAdmin(false);
        setUsername("");
        setPlan("");
        setUserId(null);

        // 清除你之前的本地标记
        localStorage.removeItem("isLogin");
        localStorage.removeItem("loginTimestamp");
        localStorage.removeItem("access_token"); // 若历史代码写过可清掉

        router.push("/login");
    };

    return (
        <AuthContext.Provider
            value={{
                isLoggedIn,
                isAdmin,
                userId,
                username,
                plan,
                setIsLoggedIn,
                setIsAdmin,
                setUserId,
                setUsername,
                setPlan,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}
