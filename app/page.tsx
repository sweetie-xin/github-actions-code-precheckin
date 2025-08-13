'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Grid2X2, List, ChevronDown, MoreVertical, X, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from "./context/AuthProvider";
import { DeleteProgressModal } from "@/app/components/DeleteProgressModal";
import { KBCard } from './types/kbcard';


export default function HomePage() {
  const { isLoggedIn, username } = useAuth();

  // 原有状态...
  const [notebooks, setNotebooks] = useState<KBCard[]>([]);

  const [sortOption, setSortOption] = useState("recent");
  const [view, setView] = useState("grid");
  const [editingNotebookId, setEditingNotebookId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // 删除进度相关状态
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    notebookTitle: '',
    notebookId: null as number | null,
    progress: 0,
    currentStep: '',
    isComplete: false,
    error: null as string | null
  });

  useEffect(() => {
    fetch("/api/kb")
      .then(res => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          console.error("返回的数据不是数组：", data);
          return;
        }
        setNotebooks(data);
      })
      .catch((err) => {
        console.error("notebooks 接口请求失败:", err);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("notebooks", JSON.stringify(notebooks));
  }, [notebooks]);

  // 排序逻辑
  const sortedNotebooks = [...notebooks].sort((a, b) => {
    if (sortOption === "recent") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (sortOption === "oldest") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else {
      return a.title.localeCompare(b.title);
    }
  });

  // 创建新笔记本函数...
  const handleCreateNew = async () => {
    const notebookIcons = Array(20).fill("📘");
    const randomIcon = notebookIcons[Math.floor(Math.random() * notebookIcons.length)];

    let creator = "游客";
    if (Boolean(isLoggedIn) && typeof username === "string" && username.trim().length > 0) {
      creator = username;
    }

    // 提取已有卡片的 title 中的编号（例如“知识库1”、“知识库2”）
    const existingNumbers = notebooks
      .map((nb) => {
        const match = nb.title.match(/^知识库(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null);

    // 找到最小未用编号
    let newNumber = 1;
    while (existingNumbers.includes(newNumber)) {
      newNumber++;
    }

    const newNotebook = {
      title: `知识库${newNumber}`,
      date: new Date().toLocaleString("zh-CN", { hour12: false }),
      creator,
      sources: 0,
      icon: randomIcon,
      bgColor: "bg-gray-100"
    };

    const res = await fetch("/api/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newNotebook)
    });
    const created = await res.json();
    setNotebooks([created, ...notebooks]);
  };


  // 重命名相关函数...
  const handleRename = (id: number) => {
    const notebook = notebooks.find((nb) => nb.id === id);
    if (notebook) {
      setEditingNotebookId(id);
      setEditingTitle(notebook.title);
    }
  };

  const handleTitleSave = async (id: number) => {
    setNotebooks(
      notebooks.map((nb) =>
        nb.id === id
          ? { ...nb, title: editingTitle }
          : nb
      )
    );
    setEditingNotebookId(null);
    await fetch("/api/kb", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: editingTitle })
    });
  };

  // 延迟函数用于模拟进度
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 修改后的删除函数，包含进度条
  const handleDelete = async (id: number) => {
    const notebook = notebooks.find(nb => nb.id === id);
    if (!notebook) return;

    if (!confirm("确定要删除该笔记本吗？")) return;

    // 打开进度模态框
    setDeleteModal({
      isOpen: true,
      notebookTitle: notebook.title,
      notebookId: id,
      progress: 0,
      currentStep: '准备删除...',
      isComplete: false,
      error: null
    });

    try {
      // 步骤1: 清理本地数据 (0-25%)
      setDeleteModal(prev => ({
        ...prev,
        progress: 10,
        currentStep: '正在清理本地缓存数据...'
      }));

      await delay(500);
      localStorage.removeItem(`chat_${id}`);

      setDeleteModal(prev => ({
        ...prev,
        progress: 25,
        currentStep: '本地数据清理完成'
      }));

      await delay(300);

      // 步骤2: 调用后端API删除文件 (25-80%)
      setDeleteModal(prev => ({
        ...prev,
        progress: 30,
        currentStep: '正在删除知识卡片元信息...'
      }));

      const response = await fetch("/api/kb", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!response.ok) {
        throw new Error("删除知识卡片元信息失败");
      }
      for (let i = 40; i <= 80; i += 10) {
        setDeleteModal(prev => ({
          ...prev,
          progress: i,
          currentStep: '正在删除文件数据...'
        }));
        await delay(200);
      }

      // 步骤3: 更新界面状态 (80-100%)
      setDeleteModal(prev => ({
        ...prev,
        progress: 85,
        currentStep: '正在更新界面...'
      }));

      await delay(300);

      // 从状态中移除笔记本
      setNotebooks(notebooks.filter((nb) => nb.id !== id));

      setDeleteModal(prev => ({
        ...prev,
        progress: 100,
        currentStep: '删除成功完成！',
        isComplete: true
      }));

      // 3秒后自动关闭模态框
      setTimeout(() => {
        setDeleteModal(prev => ({ ...prev, isOpen: false }));
      }, 3000);

    } catch (error) {
      setDeleteModal(prev => ({
        ...prev,
        error: `删除失败: ${error}`,
        currentStep: '删除过程中出现错误'
      }));
    }
  };

  // 关闭删除模态框
  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      notebookTitle: '',
      notebookId: null,
      progress: 0,
      currentStep: '',
      isComplete: false,
      error: null
    });
  };

  // 计算总源文件数
  const totalSources = notebooks.reduce((acc, nb) => acc + nb.sources, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 删除进度模态框 */}
      <DeleteProgressModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        title={deleteModal.notebookTitle}
        progress={deleteModal.progress}
        currentStep={deleteModal.currentStep}
        isComplete={deleteModal.isComplete}
        error={deleteModal.error}
      />

      <div className="pt-10 pb-10 px-6">
        {/* 头部标题 */}
        <h1 className="text-2xl font-bold text-center mb-4">
          欢迎使用 DeepSeekMine
        </h1>

        {/* 显示所有知识库总源文件数量 */}
        <div className="text-center text-base font-semibold mb-4">
          共上传 {totalSources} 个文件
        </div>

        {/* 创建新笔记、排序、视图切换 */}
        <div className="flex items-center justify-between mb-8">
          {/* 创建新笔记按钮 */}
          <button
            onClick={handleCreateNew}
            className="flex items-center space-x-2 bg-black text-white py-3 px-6 rounded-full text-sm font-semibold hover:bg-gray-800 transition"
          >
            <Plus size={20} />
            <span>新建</span>
          </button>

          {/* 排序和视图切换 */}
          <div className="flex items-center space-x-4">
            {/* 视图切换按钮 */}
            <div className="flex space-x-2">
              <button
                onClick={() => setView("grid")}
                className={`p-3 rounded ${view === "grid" ? "bg-gray-200" : "hover:bg-gray-100"}`}
              >
                <Grid2X2 size={20} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-3 rounded ${view === "list" ? "bg-gray-200" : "hover:bg-gray-100"}`}
              >
                <List size={20} />
              </button>
            </div>

            {/* 排序下拉菜单 */}
            <div className="relative">
              <select
                className="border py-2 px-4 rounded cursor-pointer appearance-none bg-white pr-8 text-sm font-medium"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="recent">最近使用</option>
                <option value="oldest">最早使用</option>
                <option value="name">名称排序</option>
              </select>
              <ChevronDown
                size={18}
                className="absolute right-3 top-3 text-gray-600 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* 根据视图模式显示网格或列表 */}
        {view === "grid" ? (
          // 网格视图
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedNotebooks.map((nb) => (
              <div
                key={nb.id}
                className={`p-6 rounded-lg shadow-md ${nb.bgColor} hover:shadow-lg transition h-44 flex flex-col justify-between relative`}
              >
                {/* 点击卡片跳转知识页面 */}
                <Link href={`/kb/${nb.id}`} className="absolute inset-0" />
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{nb.icon}</span>
                    {editingNotebookId === nb.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleTitleSave(nb.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleTitleSave(nb.id);
                        }}
                        className="font-semibold text-sm border border-gray-300 rounded px-2 py-1"
                        autoFocus
                      />
                    ) : (
                      <h3 className="font-semibold text-sm">{nb.title}</h3>
                    )}
                  </div>
                  {/* 点击三个点弹出菜单 */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === nb.id ? null : nb.id);
                    }}
                    className="z-10 cursor-pointer relative"
                  >
                    <MoreVertical size={22} className="text-gray-600" />
                    {activeMenuId === nb.id && (
                      <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-300 rounded shadow-lg z-50">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRename(nb.id);
                            setActiveMenuId(null);
                          }}
                          className="text-sm px-4 py-0.5 hover:bg-gray-100 cursor-pointer"
                        >
                          重命名
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(nb.id);
                            setActiveMenuId(null);
                          }}
                          className="text-sm px-4 py-0.5 hover:bg-gray-100 cursor-pointer text-red-600 hover:bg-red-50"
                        >
                          删除
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 mt-2 z-10">
                  共有 {nb.sources} {nb.sources === 1 ? "个文件" : "个文件"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          // 列表视图 (类似的修改)
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr className="text-left text-sm font-semibold">
                  <th className="py-4 px-6">知识库名称</th>
                  <th className="py-4 px-6">文件数</th>
                  <th className="py-4 px-6">创建时间</th>
                  <th className="py-4 px-6">创建人</th>
                  <th className="py-4 px-6"></th>
                </tr>
              </thead>
              <tbody>
                {sortedNotebooks.map((nb) => (
                  <tr key={nb.id} className="border-t hover:bg-gray-50">
                    <td className="py-4 px-6 flex items-center space-x-3">
                      <span className="text-2xl">{nb.icon}</span>
                      {editingNotebookId === nb.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleTitleSave(nb.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleTitleSave(nb.id);
                          }}
                          className="hover:underline text-sm font-medium border border-gray-300 rounded px-2 py-1"
                          autoFocus
                        />
                      ) : (
                        <Link
                          href={`/kb/${nb.id}`}
                          className="hover:underline text-sm font-medium"
                        >
                          {nb.title}
                        </Link>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {nb.sources} {nb.sources === 1 ? "个文件" : "个文件"}
                    </td>
                    <td className="py-4 px-6 text-sm">{nb.date}</td>
                    <td className="py-4 px-6 text-sm">我</td>
                    <td className="py-4 px-6 text-right relative">
                      <div
                        onClick={() =>
                          setActiveMenuId(activeMenuId === nb.id ? null : nb.id)
                        }
                        className="cursor-pointer"
                      >
                        <MoreVertical size={22} className="text-gray-600" />
                      </div>
                      {activeMenuId === nb.id && (
                        <div className="absolute right-0 bottom-full mb-2 w-32 bg-white border border-gray-300 rounded shadow-lg z-50">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRename(nb.id);
                              setActiveMenuId(null);
                            }}
                            className="px-4 py-0.5 hover:bg-gray-100 cursor-pointer text-left"
                          >
                            重命名
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(nb.id);
                              setActiveMenuId(null);
                            }}
                            className="px-4 py-0.5 hover:bg-gray-100 cursor-pointer text-left text-red-600 hover:bg-red-50"
                          >
                            删除
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
