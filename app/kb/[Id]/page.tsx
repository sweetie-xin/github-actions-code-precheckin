'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import UploadModal from '../../components/UploadModal';
import { ISearchResults, UploadedFile } from '@/app/types/deftypes';
import Chat from '@/app/components/Chat';
import NotesPanel from '@/app/components/NotesPanel';
import KnowledgeSidebar from '@/app/components/KnowledgeSidebar';
import SearchResults from '@/app/components/SeachResults';
import Toast from '@/app/components/Toast';
import { PanelRightOpen } from "lucide-react";
// import UploadModal2 from '@/app/components/UploadModel2';
import { FileWithProgress } from "@/app/lib/util";

export default function NotebookPage() {
  const { Id } = useParams(); // Id就是knowledgebase
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen2, setIsModalOpen2] = useState(false);
  const [uploadTasks2, setUploadTasks2] = useState<FileWithProgress[]>([]);

  const [showSources, setShowSources] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [summaries, setSummaries] = useState<string[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [sidebarMode, setSidebarMode] = useState<"knowledge" | "search">("knowledge");
  const [searchResults, setSearchResults] = useState<ISearchResults[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null); // 提示框
  const [showNotes, setShowNotes] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  // 添加删除进度相关状态
  const [deletionProgress, setDeletionProgress] = useState(0); // 删除进度 0-100
  const [isDeletionInProgress, setIsDeletionInProgress] = useState(false); // 是否正在删除
  const [deletionStatus, setDeletionStatus] = useState(''); // 删除状态文本
  const [currentDeletingFile, setCurrentDeletingFile] = useState(''); // 当前正在删除的文件

  const handleSearchResults = (hits: ISearchResults[]) => {
    setSearchResults(hits);
    if (hits.length > 0) {
      setSidebarMode("search");
    }
    else {
      setSidebarMode("knowledge");
    }
  };

  // 处理上传完成事件
  const handleUploadComplete = (file: UploadedFile) => {
    console.log("handleUploadComplete", file);
    setUploadedFiles((prevFiles) => [...prevFiles, file]);
  };

  // 切换文件显示/隐藏
  const toggleView = (fileId: string) => {
    setSelectedFileId((prevId) => (prevId === fileId ? null : fileId));
  };

  const getNotebookTitleById = (id: number): string => {
    const storedData = localStorage.getItem("notebooks");
    const notebooks = storedData ? JSON.parse(storedData) : [];
    const notebook = notebooks.find((nb: any) => nb.id === id);
    return notebook?.title;
  };

  // 必须从JSON文件中加载用户知识库文档
  useEffect(() => {
    if (!Id) return;

    const fetchNotebookFiles = async () => {
      try {
        const response = await fetch(`/api/kb/${Id}?notebookId=${Id}`);
        const data = await response.json();

        if (response.ok && Array.isArray(data.files)) {
          const normalized = data.files.map((f: any) => ({
            doc_id: f.name,
            title: f.name.replace(/\.[^/.]+$/, ""),
            fileName: f.name, // 新增：保留完整文件名
            fileType: f.type || "unknown",
            knowledgeLabel: Id.toString()
          }));
          setUploadedFiles(normalized);
        } else {
          console.error("获取 notebook 文件失败:", data.error);
          setToastMessage("获取知识库文件失败！");
        }
      } catch (error) {
        console.error("请求 notebook 文件错误:", error);
        setToastMessage("请求文件失败！");
      }
    };

    fetchNotebookFiles();
  }, [Id]);


  // // 加载已存储的 summaries
  // useEffect(() => {
  //   if (!Id) return;
  //   const fetchSummaries = async () => {
  //     try {
  //       const response = await fetch(`/api/summaries?id=${Id}`);

  //       if (!response.ok) {
  //         throw new Error(`请求失败: ${response.status}`);
  //       }

  //       // ✅ 检查 body 是否为空
  //       const text = await response.text();
  //       const data = text ? JSON.parse(text) : [];

  //       setSummaries(Array.isArray(data) ? data : []);
  //     } catch (error) {
  //       console.error("加载 summaries 失败:", error);
  //       setSummaries([]);
  //       setToastMessage("加载笔记失败！");
  //     }
  //   };

  //   fetchSummaries();
  // }, [Id]);

  // useEffect(() => {
  //   if (!Id) return;
  //   const updateNotebookSources = () => {
  //     const storedData = localStorage.getItem("notebooks");
  //     if (!storedData) return;
  //     const notebooksArr = JSON.parse(storedData);
  //     const currentId = Number(Id);
  //     const updatedNotebooks = notebooksArr.map((nb: { id: number }) => {
  //       if (nb.id === currentId) {
  //         return { ...nb, sources: uploadedFiles.length };
  //       }
  //       return nb;
  //     });
  //     localStorage.setItem("notebooks", JSON.stringify(updatedNotebooks));
  //   };

  //   updateNotebookSources();
  // }, [Id, uploadedFiles]);


  // 保存总结到 API

  const handleSaveSummary = async (summary: string) => {
    if (!Id) return;
    setSummaries((prev) => [...prev, summary]);

    try {
      await fetch("/api/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledgeId: Id, summary }),
      });
      setToastMessage("笔记已保存！");
    } catch (error) {
      console.error("保存 summary 失败:", error);
      setToastMessage("保存笔记失败！");
    }
  };

  // 删除笔记逻辑
  const handleDeleteSummary = async (index: number) => {
    const confirmDelete = window.confirm("确定要删除这条笔记吗？");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/summaries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Id, index }), // 发送要删除的笔记索引
      });

      if (!response.ok) {
        throw new Error("删除失败");
      }

      // 前端同步删除
      setSummaries((prev) => prev.filter((_, i) => i !== index));
      setToastMessage("笔记已删除！");
    } catch (error) {
      console.error("删除笔记失败:", error);
      setToastMessage("删除笔记失败！");
      // alert("删除失败，请重试");
    }
  };

  const deleteSingleFile = async (fileId: string): Promise<boolean> => {
    const fileToDelete = uploadedFiles.find(file => file.doc_id === fileId);
    if (!fileToDelete) return false;

    const fileName = fileToDelete.doc_id;
    const indexName = `kb_${Id}`;

    try {
      // 1. 从 JSON 中删除
      const jsonRes = await fetch(`/api/kb/${Id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          notebookId: Number(Id),
          fileName: fileName
        })
      });

      if (!jsonRes.ok) {
        console.error(`从 JSON 删除文件 ${fileName} 失败`);
        return false;
      }

      // 2. 从 Meilisearch 中删除
      const meiliRes = await fetch(`/api/files/fragments?title=${fileName}&index=${indexName}`, {
        method: "DELETE"
      });

      if (!meiliRes.ok) {
        console.warn(`从 Meilisearch 删除 doc_id=${fileName} 失败`);
        // 可选：return false
      }

      return true;
    } catch (err) {
      console.error(`删除文件 ${fileName} 出错:`, err);
      return false;
    }
  };


  const handleDelete = async (fileId: string) => {
    const confirmDelete = window.confirm("确定要删除该文件吗？");
    if (!confirmDelete) return;

    const fileToDelete = uploadedFiles.find(file => file.doc_id === fileId);
    if (!fileToDelete) return;

    const fileName = fileToDelete.fileName || fileToDelete.doc_id; // 修复：使用完整文件名

    try {
      setIsDeletionInProgress(true);
      setDeletionProgress(0);
      setDeletionStatus("正在删除文件...");
      setCurrentDeletingFile(fileName);
      setDeletionProgress(30);

      const success = await deleteSingleFile(fileId);

      setDeletionProgress(70);

      if (!success) {
        throw new Error("删除失败");
      }

      setDeletionProgress(100);
      setDeletionStatus("删除完成");

      // 重新加载文件列表
      const res = await fetch(`/api/kb/${Id}?notebookId=${Id}`);
      const json = await res.json();
      const normalized = Array.isArray(json.files)
        ? json.files.map((f: any) => ({
          doc_id: f.name,
          title: f.name.replace(/\.[^/.]+$/, ''),
          fileName: f.name, // 修复：保留完整文件名
          fileType: f.type || "unknown",
          knowledgeLabel: Id?.toString()
        }))
        : [];
      setUploadedFiles(normalized);
      setToastMessage("文件已删除！");
    } catch (error) {
      console.error("删除失败:", error);
      setToastMessage("删除文件失败！请刷新页面后重试！");
    } finally {
      setTimeout(() => {
        setIsDeletionInProgress(false);
        setDeletionProgress(0);
        setDeletionStatus('');
        setCurrentDeletingFile('');
      }, 1000);
    }
  };


  // 修改后的批量删除函数
  const handleDeleteMultiple = async (fileIds: string[]) => {
    const confirm = window.confirm(`确定要删除 ${fileIds.length} 个文件吗？`);
    if (!confirm) return;

    try {
      setIsDeletionInProgress(true);
      setDeletionProgress(0);
      setDeletionStatus(`正在删除 ${fileIds.length} 个文件...`);

      let completedCount = 0;
      const failedFiles: string[] = [];

      for (let i = 0; i < fileIds.length; i++) {
        const fileId = fileIds[i];
        const file = uploadedFiles.find(f => f.doc_id === fileId);
        // 修复：使用完整文件名而不是重构文件名
        const fileName = file ? (file.fileName || file.doc_id) : '未知文件';

        setCurrentDeletingFile(fileName);
        setDeletionStatus(`正在删除第 ${i + 1} 个文件，共 ${fileIds.length} 个`);

        const success = await deleteSingleFile(fileId);
        if (!success) failedFiles.push(fileName);

        completedCount++;
        setDeletionProgress(Math.round((completedCount / fileIds.length) * 100));

        await new Promise(resolve => setTimeout(resolve, 200)); // 可视化延迟
      }

      setDeletionStatus('删除完成');
      setCurrentDeletingFile('');

      // 状态提示
      if (failedFiles.length > 0) {
        setToastMessage(`部分文件删除失败（${failedFiles.length}/${fileIds.length}）`);
      } else {
        setToastMessage("全部文件删除成功！");
      }

      // 更新文件列表
      const res = await fetch(`/api/kb/${Id}?notebookId=${Id}`);
      const json = await res.json();
      const normalized = Array.isArray(json.files)
        ? json.files.map((f: any) => ({
          doc_id: f.name,
          title: f.name.replace(/\.[^/.]+$/, ''),
          fileName: f.name, // 修复：保留完整文件名
          fileType: f.type || "unknown",
          knowledgeLabel: Id?.toString()
        }))
        : [];
      setUploadedFiles(normalized);
      setSelectedFileIds([]);

      // 延迟关闭
      setTimeout(() => {
        setIsDeletionInProgress(false);
        setDeletionProgress(0);
        setDeletionStatus('');
        setCurrentDeletingFile('');
      }, 1500);

    } catch (err) {
      console.error("批量删除出错:", err);
      setToastMessage("批量删除失败，请稍后再试！");
      setIsDeletionInProgress(false);
      setDeletionProgress(0);
      setDeletionStatus('');
      setCurrentDeletingFile('');
    }
  };


  return (
    <div className="min-h-[calc(100vh-80px)] bg-indigo-50 flex flex-col">
      {/* 三栏布局区域 */}
      <div className="flex flex-1 overflow-hidden">

        {/* 左侧只是展示区域 */}
        {showSources && (
          sidebarMode === "knowledge" ? (
            <KnowledgeSidebar
              uploadedFiles={uploadedFiles}
              toggleView={toggleView}
              handleDelete={handleDelete}
              handleDeleteMultiple={handleDeleteMultiple}
              setShowSources={setShowSources}
              setIsModalOpen={setIsModalOpen}
              setIsModalOpen2={setIsModalOpen2}
              selectedFileId={selectedFileId}
              onSwitchToSearch={() => setSidebarMode("search")}
              selectedFileIds={selectedFileIds}
              setSelectedFileIds={setSelectedFileIds}
              // 新增：传递删除进度相关状态
              deletionProgress={deletionProgress}
              isDeletionInProgress={isDeletionInProgress}
              deletionStatus={deletionStatus}
              currentDeletingFile={currentDeletingFile}
            />
          ) : (
            <SearchResults searchResults={searchResults} onBack={() => setSidebarMode("knowledge")} />
          )
        )}

        {/* 中间 - Chat */}
        <div
          className={`${showNotes ? "basis-[44%] max-w-[36%]" : "flex-1 max-w-full"
            } bg-white flex flex-col p-3 rounded-xl mr-4 mt-4 mb-4 shadow transition-all duration-300 text-sm placeholder:text-sm`}
        >
          <Chat
            apiEndpoint="/api/chat"
            knowledgeLabel={String(Id)}
            placeholder="提问个人文件..."
            onSaveSummary={handleSaveSummary}
            onSearchResults={handleSearchResults}
            resetKeywordsCaches={true}
            selectedFileIds={selectedFileIds}
          />
        </div>

        {/* 右侧 - Studio */}
        {showNotes && (
          <NotesPanel summaries={summaries} onDelete={handleDeleteSummary} onHide={() => setShowNotes(false)} />
        )}
        {!showNotes && (
          <div className="fixed right-2 top-1/2 -translate-y-1/2 z-50">
            <button
              onClick={() => setShowNotes(true)}
              className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 shadow-md rounded-s-full text-sm text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
              title="显示笔记"
            >
              <PanelRightOpen size={18} />
            </button>
          </div>
        )}
      </div>

      {/* 上传文件模态框 */}
      {isModalOpen && (
        <UploadModal
          knowledgeLabel={String(Id)}
          knowledgeName={getNotebookTitleById(parseInt(Id as string, 10))}
          onClose={() => {
            setIsModalOpen(false)
            // window.location.reload();
          }}
          onUploadComplete={handleUploadComplete}
          uploadedFiles={uploadedFiles}
        />
      )}

      {/* 上传文件模态框 */}
      {/* {isModalOpen2 && (
        <UploadModal2
          knowledgeLabel={String(Id)}
          knowledgeName={getNotebookTitleById(parseInt(Id as string, 10))}
          onClose={() => setIsModalOpen2(false)}
          onUploadComplete={handleUploadComplete}
          uploadedFiles={uploadedFiles}
          externalFiles={uploadTasks2}
          setExternalFiles={setUploadTasks2}
        />
      )} */}

      {/* 使用 Toast 组件 */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
