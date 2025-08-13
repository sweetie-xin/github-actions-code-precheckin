// components/UploadFileList.tsx
import React from "react";
import { getFileIcon, FileWithProgress } from "@/app/lib/util";

export type UploadStatus = "pending" | "uploading" | "success" | "error";

interface UploadFileListProps {
  selectedFiles: FileWithProgress[];
  handleRemoveFile?: (index: number) => void;
  showRemoveButton?: boolean;
}

const UploadFileList: React.FC<UploadFileListProps> = ({
  selectedFiles,
  handleRemoveFile,
  showRemoveButton,
}) => {
  if (selectedFiles.length === 0) return null;

  return (
    <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white text-left">
      {selectedFiles.map((fileItem, index) => (
        <div
          key={`${fileItem.file.name}-${index}`}
          className="flex items-center justify-between px-2 py-1 text-gray-800 text-xs"
        >
          {/* 左侧编号、图标、文件名 */}
          <div className="flex items-center gap-2 overflow-hidden w-full">
            <span className="w-5 text-gray-400 text-right">{index + 1}.</span>
            <span className="text-xs">{getFileIcon(fileItem.file.name)}</span>
            <div className="flex flex-col overflow-hidden w-full">
              <span className="text-xs truncate">{fileItem.file.name}</span>

              {/* 上传中进度条 */}
              {fileItem.status === "uploading" && (
                <div className="h-1 bg-gray-200 rounded mt-1">
                  <div
                    className="h-1 bg-indigo-500 rounded transition-all"
                    style={{ width: `${fileItem.progress}%` }}
                  />
                </div>
              )}

              {/* 状态提示文字 */}
              {fileItem.status === "success" && (
                <span className="text-green-500 text-xs mt-1">上传完成</span>
              )}
              {fileItem.status === "error" && (
                <span className="text-red-500 text-xs mt-1">
                  上传失败
                  {fileItem.errorMessage
                    ? `：${
                        fileItem.errorMessage.length > 200
                          ? fileItem.errorMessage.slice(0, 200) + "..."
                          : fileItem.errorMessage
                      }`
                    : ""}
                </span>
              )}
            </div>
          </div>

          {/* 右侧操作按钮 */}
          <div className="flex-shrink-0 ml-2">
            {showRemoveButton && fileItem.status !== "success" ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile?.(index);
                }}
                className="px-2 py-0.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-100 whitespace-nowrap"
                title="移除该文件"
              >
                移除
              </button>
            ) : fileItem.status === "success" ? (
              <span className="text-green-500 text-xs">已上传</span>
            ) : fileItem.status === "error" ? (
              <span className="text-red-500 text-xs">失败</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UploadFileList;
