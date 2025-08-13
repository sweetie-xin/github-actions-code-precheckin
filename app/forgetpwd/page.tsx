"use client";

import { useState } from "react";
import Link from "next/link";
import Toast from "@/app/components/Toast"; // Import the reusable Toast component

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [toastMessage, setToastMessage] = useState<string | null>(null); // Toast state

    const handleChangeEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    };

    const handleChangePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    };

    const handleChangeConfirmPassword = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfirmPassword(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setToastMessage("密码和确认密码不匹配");
            setTimeout(() => setToastMessage(null), 3000);
            return;
        }

        const res = await fetch("https://zglg.work/api/auth/forgetpwd", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        const errorMessage = data.message || data.error;
        setToastMessage(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)); // Show toast message

        // Auto-close toast after 3 seconds
        setTimeout(() => setToastMessage(null), 3000);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">重置密码</h2>

                <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                    <input
                        type="email"
                        name="email"
                        placeholder="请输入您的邮箱"
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        onChange={handleChangeEmail}
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="新密码"
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        onChange={handleChangePassword}
                        required
                    />
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="确认密码"
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        onChange={handleChangeConfirmPassword}
                        required
                    />
                    <button
                        type="submit"
                        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-lg transition"
                    >
                        重置密码
                    </button>
                </form>

                <p className="text-center text-gray-600 mt-4">
                    已经有账号了？{" "}
                    <Link href="/login" className="text-indigo-500 hover:underline">
                        登录
                    </Link>
                </p>
            </div>

            {/* Use Toast Component */}
            {toastMessage && (
                <Toast
                    message={toastMessage}
                    onClose={() => setToastMessage(null)} // Close toast on button click
                />
            )}
        </div>
    );
}
