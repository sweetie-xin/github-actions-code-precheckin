import { Trash2 } from "lucide-react";
import { UploadedFile } from "@/app/types/deftypes";
import { getFileIcon } from "@/app/lib/util";

interface KnowledgeSidebarProps {
  uploadedFiles: UploadedFile[];
  toggleView: (fileId: string) => void;
  handleDelete: (fileId: string) => void;
  handleDeleteMultiple: (fileIds: string[]) => void;
  setShowSources: (value: boolean) => void;
  setIsModalOpen: (value: boolean) => void;
  setIsModalOpen2: (value: boolean) => void;
  selectedFileId: string | null;
  onSwitchToSearch: () => void;
  selectedFileIds: string[];
  setSelectedFileIds: (value: React.SetStateAction<string[]>) => void;
  // 新增：删除进度相关props
  deletionProgress: number;
  isDeletionInProgress: boolean;
  deletionStatus: string;
  currentDeletingFile: string;
}

// 删除进度组件
const DeletionProgress: React.FC<{
  progress: number;
  status: string;
  fileName: string;
  isVisible: boolean;
}> = ({ progress, status, fileName, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
      <div className="space-y-2">
        {/* 状态文本 */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{status}</span>
          <span className="font-medium">{progress}%</span>
        </div>

        {/* 当前删除的文件名 */}
        {fileName && (
          <div className="text-xs text-gray-500 truncate" title={fileName}>
            {fileName}
          </div>
        )}

        {/* 进度条 */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({
  uploadedFiles,
  toggleView,
  handleDelete,
  handleDeleteMultiple,
  setIsModalOpen,
  setIsModalOpen2,
  selectedFileId,
  onSwitchToSearch,
  selectedFileIds,
  setSelectedFileIds,
  // 新增：删除进度相关props
  deletionProgress,
  isDeletionInProgress,
  deletionStatus,
  currentDeletingFile
}) => {
  // console.log("uploadedFiles", uploadedFiles)
  // 实现选择文件的处理函数
  const handleCheckboxChange = (docId: string, isChecked: boolean) => {
    // console.log('uploadedFiles', uploadedFiles);
    // 如果勾选，添加到选择的ID数组中
    if (isChecked) {
      setSelectedFileIds((prev) => [...prev, docId]);
    }
    // 如果取消勾选，从数组中移除
    else {
      setSelectedFileIds((prev) => prev.filter(id => id !== docId));
    }
  };

  // 全选
  const handleSelectAll = () => {
    if (uploadedFiles.length === selectedFileIds.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(uploadedFiles.map(file => file.doc_id));
    }
  };

  return (
    <aside className="basis-[30%] max-w-[30%] bg-white border-r border-gray-200 p-2 overflow-y-auto 
                     relative rounded-2xl transition-all shadow-lg m-5">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm text-gray-800">知识库</h2>

        {/* 搜索图标靠右，去掉宽度限制 */}
        <button
          onClick={onSwitchToSearch}
          className="p-2 bg-white hover:bg-blue-50 text-blue-600"
        >
          🔍
        </button>
      </div>

      {/* 添加 Source 按钮 */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="block w-full py-2 mb-6 rounded-full text-center border border-gray-300 bg-white 
                   hover:bg-gray-50 text-xs text-gray-600"
      >
        导入文件
      </button>

      {/* 新增：托管文件夹导入按钮 */}
      {/* <button
        onClick={() => setIsModalOpen2(true)}
        className="block w-full py-2 mb-6 rounded-full text-center border border-gray-300 bg-white 
             hover:bg-gray-50 text-xs text-gray-600"
      >
        导入文件夹
      </button> */}

      {/* 占位内容 */}
      {uploadedFiles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-gray-500 text-center">
        </div>
      ) : (
        <div id="hasFlieShow">
          {/* 操作栏：当有文件时始终显示 */}
          <div className="flex items-center justify-between px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg mb-4 ml-auto w-44">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="selectAll"
                checked={uploadedFiles.length > 0 && selectedFileIds.length === uploadedFiles.length}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="selectAll" className="ml-2 text-xs font-medium text-gray-700">
                全选
              </label>
            </div>
            <button
              onClick={() => handleDeleteMultiple(selectedFileIds)}
              disabled={selectedFileIds.length === 0}
              className={"px-4 py-2 text-xs font-medium rounded-md"}
            >
              全部删除
            </button>
          </div>

          {/* 文件列表 */}
          <div className="mt-1 rounded-lg max-h-[400px] overflow-y-scroll">
            <ul className="divide-y">
              {uploadedFiles.map((file, index) => (
                <li key={file.doc_id + "-" + index} className="flex flex-col border-b py-2 px-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleView(file.doc_id)}
                  >
                    {/* 左侧：文件图标 + 文件名 */}
                    <div className="flex items-center gap-2 min-w-0 max-w-[180px]">
                      <span className="text-xl">{getFileIcon(`${file.doc_id}`)}</span>
                      <span className="text-xs text-gray-800 truncate block max-w-[140px]">
                        {file.title}
                      </span>
                    </div>

                    {/* 右侧：复选框 + 查看按钮 + 删除按钮 */}
                    <div className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={selectedFileIds.includes(file.doc_id)}
                        onChange={(e) => handleCheckboxChange(file.doc_id, e.target.checked)}
                        onClick={(e) => e.stopPropagation()} // 防止触发父级的点击事件
                      />
                      勾选聊天
                      {/* <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleView(file.doc_id);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye size={18} />
                      </button> */}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file.doc_id);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 新增：删除进度指示器 */}
      <DeletionProgress
        progress={deletionProgress}
        status={deletionStatus}
        fileName={currentDeletingFile}
        isVisible={isDeletionInProgress}
      />
    </aside>
  );
};

export default KnowledgeSidebar;
