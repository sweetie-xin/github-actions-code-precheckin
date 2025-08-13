"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, Trash2, Eye, CheckCircle, Package, AlertCircle } from "lucide-react";
import Toast from "../components/Toast";
import { VersionFile, VersionUploadForm } from "../types/version";
import { useAuth } from "../context/AuthProvider";
import NoAuth from "../components/NoAuth";
import { checkLogin } from "../lib/checkLogin";
import { API_CONFIG } from "../config/api";

export default function VersionController() {
    const router = useRouter();
    const { isLoggedIn, isAdmin } = useAuth();
    const [versions, setVersions] = useState<VersionFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<"success" | "error">("success");
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 新版本上传表单数据
    const [uploadForm, setUploadForm] = useState<VersionUploadForm>({
        version: "",
        description: "",
        file: null,
    });

    useEffect(() => {
        // 检查登录状态和管理员权限
        const checkAuthAndLoadVersions = async () => {
            setIsLoading(true);

            // 检查是否登录
            const isLoggedInCheck = await checkLogin(showToast);
            if (!isLoggedInCheck) {
                setIsLoading(false);
                return;
            }

            // 检查是否为管理员
            // if (!isAdmin) {
            //     showToast("访问被拒绝：需要管理员权限", "error");
            //     setTimeout(() => {
            //         router.push("/");
            //     }, 2000);
            //     setIsLoading(false);
            //     return;
            // }

            // 加载版本列表
            await loadVersions();
            setIsLoading(false);
        };

        checkAuthAndLoadVersions();
    }, [isAdmin, router]);

    const loadVersions = async () => {
        try {
            const response = await fetch('/api/versions');
            if (!response.ok) throw new Error('Failed to load versions');

            const data = await response.json();
            setVersions(data);
        } catch (error) {
            showToast("加载版本列表失败", "error");

            // 回退到示例数据
            const mockVersions: VersionFile[] = [
                {
                    id: "1",
                    version: "2.0.0",
                    fileName: "DeepSeekMine-v2.0.0.exe",
                    fileSize: 156780000,
                    uploadDate: "2025-01-15",
                    description: "主要功能更新：增加了AI对话功能，优化了文档搜索性能",
                    status: "active",
                    downloadCount: 1250,
                },
                {
                    id: "2",
                    version: "1.9.5",
                    fileName: "DeepSeekMine-v1.9.5.exe",
                    fileSize: 145230000,
                    uploadDate: "2024-12-20",
                    description: "修复了文件上传的bug，增加了批量删除功能",
                    status: "deprecated",
                    downloadCount: 892,
                },
            ];
            setVersions(mockVersions);
        }
    };

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const formatFileSize = (bytes: number) => {
        const sizes = ["Bytes", "KB", "MB", "GB"];
        if (bytes === 0) return "0 Bytes";
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // 检查文件大小
            if (file.size > API_CONFIG.MAX_FILE_SIZE) {
                showToast(`文件大小超过限制 (${API_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`, "error");
                return;
            }

            // 检查文件类型
            const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (!API_CONFIG.SUPPORTED_FILE_TYPES.includes(fileExtension)) {
                showToast(`不支持的文件类型。支持的格式: ${API_CONFIG.SUPPORTED_FILE_TYPES.join(', ')}`, "error");
                return;
            }

            setUploadForm(prev => ({ ...prev, file }));
        }
    };

    const handleUpload = async () => {
        if (!uploadForm.file || !uploadForm.version || !uploadForm.description) {
            showToast("请填写完整的版本信息", "error");
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", uploadForm.file);
            formData.append("version", uploadForm.version);
            formData.append("description", uploadForm.description);

            // 使用外部API接口上传
            const response = await fetch(API_CONFIG.EXTERNAL_UPLOAD_API, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                },
                body: formData,
                signal: AbortSignal.timeout(API_CONFIG.UPLOAD_TIMEOUT), // 设置超时
            });



            if (!response.ok) {
                let errorMessage = 'Upload failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            } else {
                await fetch(API_CONFIG.EXTERNAL_CREATE_VERSION_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        version_number: uploadForm.version,
                        description: uploadForm.description,
                        download_url: `${API_CONFIG.EXTERNAL_DOWNLOAD_API}${uploadForm.file.name}`,
                        is_active: false,
                    })
                });
            }

            const result = await response.json();

            // 创建新版本记录用于本地显示
            const newVersion: VersionFile = {
                id: Date.now().toString(),
                version: uploadForm.version,
                fileName: uploadForm.file.name,
                fileSize: uploadForm.file.size,
                uploadDate: new Date().toISOString().split('T')[0],
                description: uploadForm.description,
                status: "draft",
                downloadCount: 0,
            };

            // 同时保存到本地API以便管理
            try {
                await fetch(API_CONFIG.LOCAL_VERSIONS_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...newVersion,
                        externalUrl: result.download_url || result.url, // 保存外部下载链接
                        externalId: result.id || result.file_id, // 保存外部文件ID
                    }),
                });
            } catch (localError) {
                console.warn('保存到本地数据库失败:', localError);
            }

            setVersions(prev => [newVersion, ...prev]);
            setUploadForm({ version: "", description: "", file: null });
            setShowUploadModal(false);
            showToast("版本上传成功！", "success");

        } catch (error: any) {
            console.error('Upload error:', error);
            showToast(error.message || "上传失败，请重试", "error");
        } finally {
            setIsUploading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: "active" | "deprecated" | "draft") => {
        try {
            const response = await fetch(`/api/versions/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Status update failed');
            }

            setVersions(prev =>
                prev.map(version =>
                    version.id === id ? { ...version, status: newStatus } : version
                )
            );
            showToast("状态更新成功", "success");
        } catch (error: any) {
            showToast(error.message || "状态更新失败", "error");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("确定要删除这个版本吗？此操作不可撤销。")) return;

        try {
            const response = await fetch(`/api/versions/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Delete failed');
            }

            setVersions(prev => prev.filter(version => version.id !== id));
            showToast("版本删除成功", "success");
        } catch (error: any) {
            showToast(error.message || "删除失败", "error");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "text-green-600 bg-green-100";
            case "deprecated": return "text-red-600 bg-red-100";
            case "draft": return "text-yellow-600 bg-yellow-100";
            default: return "text-gray-600 bg-gray-100";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "active": return <CheckCircle className="w-4 h-4" />;
            case "deprecated": return <AlertCircle className="w-4 h-4" />;
            case "draft": return <Eye className="w-4 h-4" />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 加载状态 */}
            {isLoading && (
                <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">正在验证权限...</p>
                    </div>
                </div>
            )}

            {/* 权限检查：只有管理员登录后才显示内容 */}
            {!isLoading && isLoggedIn && (
                <>
                    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                        {/* 页面标题 */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Package className="w-8 h-8 text-blue-600" />
                                    <div>
                                        <h1 className="text-3xl font-bold text-gray-900">版本管理</h1>
                                        <p className="text-gray-600 mt-1">管理和发布软件版本</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowUploadModal(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
                                >
                                    <Upload className="w-5 h-5" />
                                    <span>上传新版本</span>
                                </button>
                            </div>
                        </div>

                        {/* 版本列表 */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">版本历史</h2>
                            </div>

                            {versions.length === 0 ? (
                                <div className="text-center py-12">
                                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500">还没有任何版本</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {versions.map((version) => (
                                        <div key={version.id} className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <h3 className="text-lg font-semibold text-gray-900">
                                                            v{version.version}
                                                        </h3>
                                                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(version.status)}`}>
                                                            {getStatusIcon(version.status)}
                                                            <span className="capitalize">{version.status}</span>
                                                        </span>
                                                    </div>

                                                    <p className="text-gray-600 mb-3">{version.description}</p>

                                                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                                                        <span>{version.fileName}</span>
                                                        <span>{formatFileSize(version.fileSize)}</span>
                                                        <span>上传日期: {version.uploadDate}</span>
                                                        <span>下载次数: {version.downloadCount}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2 ml-4">
                                                    <select
                                                        value={version.status}
                                                        onChange={(e) => handleStatusChange(version.id, e.target.value as any)}
                                                        className="border border-gray-300 rounded px-3 py-1 text-sm"
                                                    >
                                                        <option value="draft">草稿</option>
                                                        <option value="active">发布</option>
                                                        <option value="deprecated">弃用</option>
                                                    </select>

                                                    <button
                                                        onClick={() => {
                                                            const downloadUrl = `${API_CONFIG.EXTERNAL_DOWNLOAD_API}${version.fileName}`;
                                                            window.open(downloadUrl, '_blank');
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                        title="下载"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>                                                    <button
                                                        onClick={() => handleDelete(version.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                        title="删除"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 上传模态框 */}
                    {showUploadModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">上传新版本</h3>
                                    <button
                                        onClick={() => setShowUploadModal(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            版本号
                                        </label>
                                        <input
                                            type="text"
                                            value={uploadForm.version}
                                            onChange={(e) => setUploadForm(prev => ({ ...prev, version: e.target.value }))}
                                            placeholder="例如: 2.1.0"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            版本描述
                                        </label>
                                        <textarea
                                            value={uploadForm.description}
                                            onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="描述此版本的更新内容..."
                                            rows={3}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            选择文件
                                        </label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            onChange={handleFileSelect}
                                            accept={API_CONFIG.SUPPORTED_FILE_TYPES.join(',')}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        {uploadForm.file && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                已选择: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        onClick={() => setShowUploadModal(false)}
                                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={isUploading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isUploading ? "上传中..." : "上传"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* 未授权访问提示 */}
            {!isLoading && (!isLoggedIn) && (
                <NoAuth />
            )}

            {/* Toast 消息 */}
            {toastMessage && (
                <Toast
                    message={toastMessage}
                    type={toastType}
                    onClose={() => setToastMessage(null)}
                />
            )}
        </div>
    );
}
