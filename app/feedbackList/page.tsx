"use client";

import { useState, useEffect } from 'react';
import { Loader2, FileText, Image as ImageIcon, ChevronLeft, ChevronRight, Filter, AlertCircle, Trash2, Download, FileSpreadsheet, FileText as WordIcon } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { Document, Paragraph, TextRun, Table, TableRow, TableCell, Packer } from 'docx';
import { saveAs } from 'file-saver';
import { useAuth } from '../context/AuthProvider';
import { checkLogin } from '../lib/checkLogin';

// 定义反馈数据类型
interface Feedback {
    id: string;
    username: string;
    feedback_type: string;
    feedback_text: string;
    contact_info: string;
    image_urls: string[];
    create_date: string;
}

interface FeedbackResponse {
    message: string;
    status: number;
    total: number;
    page: number;
    page_size: number;
    feedbacks: Feedback[];
}

// 反馈类型选项
const FEEDBACK_TYPES = ['全部', '功能建议', '界面体验', '技术问题', '内容问题', '其他'];
const API_PREFIX = 'https://deepseekmine.com/'

export default function FeedbackListPage() {
    const { isLoggedIn, isAdmin } = useAuth();
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [selectedType, setSelectedType] = useState<string>('全部');
    const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
    const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);

    // 新增: 访问权限判断（必须已登录且为管理员）
    const hasAccess = isLoggedIn && isAdmin;

    // 删除相关状态
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // 导出相关状态
    const [exportLoading, setExportLoading] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // 获取反馈列表
    const fetchFeedbacks = async () => {
        if (!hasAccess) return; // 无权限不请求
        try {
            setLoading(true);
            setError(null);

            const typeParam = selectedType === '全部' ? '' : selectedType;
            const response = await fetch(`${API_PREFIX}/omni/api/feedback/list?page=${page}&page_size=${pageSize}&feedback_type=${typeParam}`);

            if (!response.ok) {
                throw new Error('获取反馈列表失败');
            }

            const data: FeedbackResponse = await response.json();
            setFeedbacks(data.feedbacks);
            setTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : '未知错误');
        } finally {
            setLoading(false);
        }
    };

    // 删除反馈
    const deleteFeedback = async (feedbackId: string) => {
        try {
            setDeleteLoading(true);
            setDeleteError(null);

            const response = await fetch(`${API_PREFIX}/omni/api/feedback/${feedbackId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('删除失败');
            }

            // 删除成功，刷新列表
            fetchFeedbacks();
            // 关闭确认对话框
            setDeleteConfirmOpen(false);
            setDeletingFeedbackId(null);

        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : '删除过程中出现错误');
        } finally {
            setDeleteLoading(false);
        }
    };

    // 打开删除确认对话框
    const openDeleteConfirm = (feedbackId: string) => {
        setDeletingFeedbackId(feedbackId);
        setDeleteConfirmOpen(true);
        setDeleteError(null);
    };

    // 关闭删除确认对话框
    const closeDeleteConfirm = () => {
        setDeleteConfirmOpen(false);
        setDeletingFeedbackId(null);
        setDeleteError(null);
    };

    // 导出为Excel
    const exportToExcel = async () => {
        try {
            setExportLoading(true);

            // 准备导出数据
            const exportData = feedbacks.map((feedback, index) => ({
                '序号': index + 1,
                '用户名': feedback.username,
                '反馈类型': feedback.feedback_type,
                '反馈内容': feedback.feedback_text,
                '联系方式': feedback.contact_info || '未提供',
                '创建时间': formatDateTime(feedback.create_date),
                '图片数量': feedback.image_urls ? feedback.image_urls.length : 0
            }));

            // 创建工作簿
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '反馈列表');

            // 设置列宽
            const colWidths = [
                { wch: 8 },  // 序号
                { wch: 15 }, // 用户名
                { wch: 12 }, // 反馈类型
                { wch: 50 }, // 反馈内容
                { wch: 20 }, // 联系方式
                { wch: 20 }, // 创建时间
                { wch: 10 }  // 图片数量
            ];
            ws['!cols'] = colWidths;

            // 导出文件
            const fileName = `反馈列表_${selectedType !== '全部' ? selectedType + '_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);

            setShowExportMenu(false);

            // 成功提示
            if (window.confirm(`Excel文件 "${fileName}" 已导出成功！\n\n共导出 ${feedbacks.length} 条反馈数据。`)) {
                // 用户点击确定
            }
        } catch (error) {
            console.error('Excel导出失败:', error);
            alert(`Excel导出失败: ${error instanceof Error ? error.message : '未知错误'}\n\n请检查浏览器是否允许下载文件，或重试操作。`);
        } finally {
            setExportLoading(false);
        }
    };

    // 导出为Word
    const exportToWord = async () => {
        try {
            setExportLoading(true);

            // 创建表格行
            const tableRows = [
                // 表头
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "序号", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "用户名", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "反馈类型", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "反馈内容", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "联系方式", bold: true })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "创建时间", bold: true })] })] }),
                    ],
                }),
                // 数据行
                ...feedbacks.map((feedback, index) =>
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun((index + 1).toString())] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun(feedback.username)] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun(feedback.feedback_type)] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun(feedback.feedback_text)] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun(feedback.contact_info || '未提供')] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun(formatDateTime(feedback.create_date))] })] }),
                        ],
                    })
                )
            ];

            // 创建文档
            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `反馈列表报告${selectedType !== '全部' ? ` - ${selectedType}` : ''}`,
                                    bold: true,
                                    size: 32,
                                }),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `导出时间: ${new Date().toLocaleString('zh-CN')}`,
                                    size: 20,
                                }),
                            ],
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `总计: ${feedbacks.length} 条反馈`,
                                    size: 20,
                                }),
                            ],
                        }),
                        new Paragraph({ text: "" }), // 空行
                        new Table({
                            rows: tableRows,
                            width: {
                                size: 100,
                                type: "pct",
                            },
                        }),
                    ],
                }],
            });

            // 生成并下载文件
            const buffer = await Packer.toBuffer(doc);
            const fileName = `反馈列表_${selectedType !== '全部' ? selectedType + '_' : ''}${new Date().toISOString().split('T')[0]}.docx`;
            saveAs(new Blob([buffer]), fileName);

            setShowExportMenu(false);

            // 成功提示
            if (window.confirm(`Word文档 "${fileName}" 已导出成功！\n\n共导出 ${feedbacks.length} 条反馈数据。`)) {
                // 用户点击确定
            }
        } catch (error) {
            console.error('Word导出失败:', error);
            alert(`Word导出失败: ${error instanceof Error ? error.message : '未知错误'}\n\n请检查浏览器是否允许下载文件，或重试操作。`);
        } finally {
            setExportLoading(false);
        }
    };


    // 页面加载或筛选条件变化时获取数据
    useEffect(() => {
        if (hasAccess) fetchFeedbacks();
    }, [page, selectedType, hasAccess]);

    // 点击外部关闭导出菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showExportMenu) {
                const target = event.target as HTMLElement;
                if (!target.closest('.export-menu-container')) {
                    setShowExportMenu(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showExportMenu]);

    // 格式化日期时间
    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).replace(/\//g, '-');
    };

    // 切换展开/折叠反馈内容
    const toggleExpandFeedback = (id: string) => {
        if (expandedFeedbackId === id) {
            setExpandedFeedbackId(null);
        } else {
            setExpandedFeedbackId(id);
        }
    };

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    // 未登录或权限不足时直接返回提示界面（不渲染后续内容）
    if (!hasAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="bg-white shadow-sm rounded-lg p-10 max-w-md w-full text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    {!isLoggedIn ? (
                        <>
                            <h2 className="text-lg font-semibold mb-2">需要登录</h2>
                            <p className="text-gray-600 mb-6">请先登录，并使用管理员账号访问此页面。</p>
                            <Link href="/login" className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">前往登录</Link>
                        </>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold mb-2">权限不足</h2>
                            <p className="text-gray-600 mb-6">当前账号不是管理员，无法查看反馈列表。</p>
                            <Link href="/" className="inline-block px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium">返回首页</Link>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">问题反馈列表</h1>
                    <div className="flex items-center space-x-4">
                        {/* 导出按钮 */}
                        <div className="relative export-menu-container">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
                                disabled={exportLoading || feedbacks.length === 0}
                                title={feedbacks.length === 0 ? '暂无数据可导出' : `导出 ${feedbacks.length} 条反馈数据`}
                            >
                                {exportLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        导出中...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" />
                                        导出数据
                                    </>
                                )}
                            </button>

                            {/* 导出菜单 */}
                            {showExportMenu && !exportLoading && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                                    <div className="py-1">
                                        <button
                                            onClick={exportToExcel}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                        >
                                            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                                            导出为 Excel
                                        </button>
                                        <button
                                            onClick={exportToWord}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                        >
                                            <WordIcon className="w-4 h-4 mr-2 text-blue-600" />
                                            导出为 Word
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link
                            href="/feedback"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            提交新反馈
                        </Link>
                    </div>
                </div>

                {/* 筛选区域 */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
                    <div className="flex items-center space-x-2">
                        <Filter size={18} className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">按类型筛选:</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {FEEDBACK_TYPES.map((type) => (
                            <button
                                key={type}
                                className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedType === type
                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}
                                onClick={() => {
                                    setSelectedType(type);
                                    setPage(1); // 重置为第一页
                                }}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 加载状态 */}
                {loading && (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                )}

                {/* 错误提示 */}
                {error && !loading && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
                        <p>加载失败: {error}</p>
                        <button
                            className="mt-2 text-sm font-medium underline"
                            onClick={fetchFeedbacks}
                        >
                            重试
                        </button>
                    </div>
                )}

                {/* 无数据提示 */}
                {!loading && !error && feedbacks.length === 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900">暂无反馈数据</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {selectedType !== '全部' ? `没有找到"${selectedType}"类型的反馈` : '目前还没有收到任何反馈'}
                        </p>
                        {selectedType !== '全部' && (
                            <button
                                className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-800"
                                onClick={() => setSelectedType('全部')}
                            >
                                查看所有反馈
                            </button>
                        )}
                    </div>
                )}

                {/* 反馈列表 */}
                {!loading && !error && feedbacks.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <ul className="divide-y divide-gray-200">
                            {feedbacks.map((feedback) => (
                                <li key={feedback.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start space-x-3">
                                            <div className={`px-2 py-1 rounded-md text-xs font-medium ${feedback.feedback_type === '功能建议' ? 'bg-blue-100 text-blue-800' :
                                                feedback.feedback_type === '界面体验' ? 'bg-green-100 text-green-800' :
                                                    feedback.feedback_type === '技术问题' ? 'bg-red-100 text-red-800' :
                                                        feedback.feedback_type === '内容问题' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {feedback.feedback_type}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {feedback.username}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatDateTime(feedback.create_date)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => openDeleteConfirm(feedback.id)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="删除反馈"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => toggleExpandFeedback(feedback.id)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                {expandedFeedbackId === feedback.id ? '收起' : '展开'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className={`mt-3 ${expandedFeedbackId === feedback.id ? '' : 'line-clamp-2'}`}>
                                        <p className="text-gray-700 whitespace-pre-wrap">{feedback.feedback_text}</p>
                                    </div>

                                    {/* 联系方式 */}
                                    {feedback.contact_info && expandedFeedbackId === feedback.id && (
                                        <div className="mt-2 text-sm text-gray-500">
                                            <span className="font-medium">联系方式: </span>{feedback.contact_info}
                                        </div>
                                    )}

                                    {/* 图片列表 */}
                                    {feedback.image_urls && feedback.image_urls.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {feedback.image_urls.map((url, index) => (
                                                <div
                                                    key={index}
                                                    className="relative w-16 h-16 border rounded-md overflow-hidden cursor-pointer"
                                                    onClick={() => setExpandedImageUrl(`${API_PREFIX}${url}`)}
                                                >
                                                    <img
                                                        src={`${API_PREFIX}${url}`}
                                                        alt={`反馈图片 ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 flex items-center justify-center transition-opacity">
                                                        <ImageIcon className="w-5 h-5 text-white opacity-0 hover:opacity-100" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>

                        {/* 分页控件 */}
                        {totalPages > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-between items-center">
                                    <p className="text-sm text-gray-700">
                                        显示 <span className="font-medium">{(page - 1) * pageSize + 1}</span> 到 <span className="font-medium">
                                            {Math.min(page * pageSize, total)}</span> 条，共 <span className="font-medium">{total}</span> 条
                                    </p>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                            disabled={page === 1}
                                            className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={page === totalPages}
                                            className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 图片查看器模态框 */}
                {expandedImageUrl && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
                        onClick={() => setExpandedImageUrl(null)}
                    >
                        <div className="max-w-4xl max-h-[90vh] relative">
                            <img
                                src={expandedImageUrl}
                                alt="反馈图片"
                                className="max-w-full max-h-[90vh] object-contain"
                            />
                            <button
                                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70"
                                onClick={() => setExpandedImageUrl(null)}
                            >
                                <svg width={24} height={24} />
                            </button>
                        </div>
                    </div>
                )}

                {/* 删除确认对话框 */}
                {deleteConfirmOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <div className="flex items-center text-red-600 mb-4">
                                <AlertCircle className="w-6 h-6 mr-2" />
                                <h3 className="text-lg font-medium">确认删除</h3>
                            </div>

                            <p className="text-gray-700 mb-6">
                                您确定要删除这条反馈吗？此操作无法撤销。
                            </p>

                            {deleteError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                                    {deleteError}
                                </div>
                            )}

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={closeDeleteConfirm}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                    disabled={deleteLoading}
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => deletingFeedbackId && deleteFeedback(deletingFeedbackId)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            删除中...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            确认删除
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// X 图标组件
function X(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    );
}