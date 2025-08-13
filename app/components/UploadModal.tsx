"use client";
import { useRef, useState, useEffect } from "react";
import { UploadedFile } from "@/app/types/deftypes";
import { FileWithProgress } from "@/app/lib/util";
import UploadFileList from "./UploadFileList";
import SupportedFormats, { supportFormats } from "./SupportedFormats";
import { UploadResponse } from "@/app/types/fileupload"
import { getFileExtension } from "@/app/lib/util"

import Toast from "./Toast";



export default function UploadModal({
    knowledgeLabel,
    knowledgeName,
    onClose,
    onUploadComplete,
    uploadedFiles = [],
}: {
    knowledgeLabel: string;
    knowledgeName: string;
    onClose: () => void;
    onUploadComplete: (file: UploadedFile) => void;
    uploadedFiles: UploadedFile[];
}) {
    const formatsString = supportFormats.join(", ");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<FileWithProgress[]>([]);
    const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [useVectorEmbedding, setUseVectorEmbedding] = useState<boolean>(false);

    const isFileDuplicate = (fileName: string) => {
        return uploadedFiles.some(
            (file) => file.title === fileName && file.knowledgeLabel === knowledgeLabel
        );
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const newFiles: FileWithProgress[] = [];

        for (let i = 0; i < files.length; i++) {
            if (selectedFiles.length + newFiles.length >= 10) {
                setToastMessage("手动上传一次最多支持 10 个文件");
                break;
            }
            const file = files[i];
            const fileType = file.name.split(".").pop()?.toLowerCase();

            if (!fileType || !supportFormats.includes(fileType)) {
                setToastMessage(`文件 "${file.name}" 不受支持。仅支持${formatsString}文件`);
                continue;
            }
            if (isFileDuplicate(file.name)) {
                setToastMessage(`已有文件 "${file.name}" 存在于当前知识库，不允许重复导入！`);
                continue;
            }

            newFiles.push({ file, progress: 0, status: "pending" });
        }
        setSelectedFiles((prev) => [...prev, ...newFiles]);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const files = event.dataTransfer.files;
        if (!files || files.length === 0) return;

        const newFiles: FileWithProgress[] = [];

        for (let i = 0; i < files.length; i++) {
            if (selectedFiles.length + newFiles.length >= 10) {
                setToastMessage("一次上传最多10个文件");
                break;
            }
            const file = files[i];
            const fileType = file.name.split(".").pop()?.toLowerCase();

            if (!fileType || !supportFormats.includes(fileType)) {
                setToastMessage(`文件 "${file.name}" 不受支持。仅支持${formatsString}文件`);
                continue;
            }
            if (isFileDuplicate(file.name)) {
                setToastMessage(`已有文件 "${file.name}" 存在于当前知识库，不允许重复导入！`);
                continue;
            }

            newFiles.push({ file, progress: 0, status: "pending" });
        }

        setSelectedFiles((prev) => [...prev, ...newFiles]);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const uploadSingleFile = (fileItem: FileWithProgress, index: number): Promise<void> => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();

            formData.append("file", fileItem.file);
            formData.append("knowledgeLabel", String(knowledgeLabel));
            formData.append("knowledgeName", String(knowledgeName));

            xhr.open("POST", "/api/files/upload");

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    setSelectedFiles((prev) =>
                        prev.map((f, i) => i === index ? { ...f, progress, status: "uploading" } : f)
                    );
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setSelectedFiles((prev) =>
                        prev.map((f, i) => (i === index ? { ...f, status: "success" } : f))
                    );

                    let result: UploadResponse | null = null;
                    try {
                        result = JSON.parse(xhr.responseText);
                        console.log(`[上传响应] ${fileItem.file.name}:`, result);
                    } catch {
                        console.error("解析后端响应失败:", xhr.responseText);
                    }

                    if (result && result.code === 0) {
                        const uploadedFileNames: string[] = result.files;

                        // 显示成功统计信息
                        if (result.stats) {
                            const stats = result.stats;
                            console.log(`[上传统计] ${fileItem.file.name}: 处理时间 ${stats.totalTime}ms, 文档块 ${stats.totalDocs} 个`);
                            
                            if (stats.failedFiles > 0) {
                                console.warn(`[上传警告] ${fileItem.file.name}: ${stats.failedFiles} 个文件处理失败`);
                                if (stats.failedFilesDetails) {
                                    stats.failedFilesDetails.forEach((failed: any) => {
                                        console.error(`[失败详情] ${failed.fileName}: ${failed.error} - ${failed.detail}`);
                                    });
                                }
                            }
                        }

                        for (const fileName of uploadedFileNames) {
                            onUploadComplete({
                                doc_id: fileName,
                                title: fileName,
                                fileType: fileItem.file.type || "unknown",
                                knowledgeLabel,
                            });

                            fetch(`/api/kb/${knowledgeLabel}`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    notebookId: Number(knowledgeLabel),
                                    fileMeta: {
                                        name: fileName,
                                        type: getFileExtension(fileName)
                                    }
                                })
                            });
                        }

                        resolve();
                    } else {
                        const errorMessage = result?.detail || result?.message || "未知错误";
                        const errorCode = result?.code || "UNKNOWN_ERROR";
                        
                        console.error(`[上传错误] ${fileItem.file.name}: ${errorCode} - ${errorMessage}`);
                        
                        setSelectedFiles((prev) =>
                            prev.map((f, i) =>
                                i === index ? { 
                                    ...f, 
                                    status: "error", 
                                    errorMessage: `${errorCode}: ${errorMessage}` 
                                } : f
                            )
                        );
                        reject();
                    }
                } else {
                    let errorDetail = `HTTP ${xhr.status}`;
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        errorDetail = errorResponse.detail || errorResponse.message || errorDetail;
                    } catch {
                        // 如果无法解析错误响应，使用默认错误信息
                    }
                    
                    console.error(`[HTTP错误] ${fileItem.file.name}: ${xhr.status} - ${errorDetail}`);
                    
                    setSelectedFiles((prev) =>
                        prev.map((f, i) => (i === index ? { 
                            ...f, 
                            status: "error",
                            errorMessage: `HTTP ${xhr.status}: ${errorDetail}`
                        } : f))
                    );
                    reject();
                }
            };

            xhr.onerror = () => {
                setSelectedFiles((prev) =>
                    prev.map((f, i) => (i === index ? { ...f, status: "error" } : f))
                );
                reject();
            };

            xhr.send(formData);
        });
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            setToastMessage("请选择至少一个文件上传");
            return;
        }
        setUploadStatus("uploading");
        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                if (selectedFiles[i].status === "success" || selectedFiles[i].status === "error") continue;
                await uploadSingleFile(selectedFiles[i], i);
            }
            setUploadStatus("success");
        } catch {
            setUploadStatus("error");
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 mx-4 max-h-[80vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
                >
                    &#x2715;
                </button>

                <h2 className="text-base font-semibold text-gray-800">上传文件</h2>

                <SupportedFormats />

                <div
                    className="mt-5 border border-dashed border-gray-300 rounded-xl bg-gray-50 px-6 py-10 text-center cursor-pointer transition hover:bg-gray-100"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <p className="text-sm text-gray-500">
                        拖拽文件或 <span className="text-indigo-600 underline font-medium">选择文件</span>上传
                    </p>

                    <p className="text-xs text-gray-400 mt-1">一次上传最多10个，单个最大100M</p>

                    <UploadFileList
                        selectedFiles={selectedFiles}
                        handleRemoveFile={handleRemoveFile}
                        showRemoveButton={true}
                    />
                </div>

                <button
                    onClick={handleUpload}
                    className="mt-6 w-full sm:w-40 py-2 text-sm font-medium bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-shadow shadow-md"
                    disabled={uploadStatus === "uploading"}
                >
                    {uploadStatus === "uploading" ? "上传中..." : "开始上传"}
                </button>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept={formatsString}
                    multiple
                    onChange={handleFileChange}
                />
            </div>
            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
        </div>
    );
}
