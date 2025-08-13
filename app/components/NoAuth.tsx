import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthProvider";

const NoAuth = () => {
    const { isLoggedIn, isAdmin } = useAuth();
    const router = useRouter();
    return (
        <div className="max-w-md mx-auto mt-20 text-center">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">访问受限</h2>
                <p className="text-gray-600 mb-4">
                    {!isLoggedIn ? "请先登录以访问版本管理功能" : "需要管理员权限才能访问此页面"}
                </p>
                <button
                    onClick={() => router.push(isLoggedIn ? "/" : "/login")}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                    {isLoggedIn ? "返回首页" : "去登录"}
                </button>
            </div>
        </div>
    )
}

export default NoAuth;