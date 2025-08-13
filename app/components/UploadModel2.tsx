// "use client";

// import { useRef, useState, useEffect } from "react";
// import { UploadedFile } from "@/app/types/deftypes";
// import { FileWithProgress } from "@/app/lib/util";
// import UploadFileList from "@/app/components/UploadFileList";

// /* ---------- 类型 ---------- */
// type SliceItem = {
//   doc_index: string;
//   content: string;
//   title: string;
//   knowledgeLabel: string;
//   fileType: string;
// };
// type SubResult = { code: number; message: string; data: SliceItem[] };
// type UploadResponse = { code: number; message: string; data: { data: SubResult[] } };

// interface Props {
//   knowledgeLabel: string;
//   knowledgeName: string;
//   onClose: () => void;
//   onUploadComplete: (file: UploadedFile) => void;
//   uploadedFiles: UploadedFile[];
//   externalFiles: FileWithProgress[];
//   setExternalFiles: React.Dispatch<React.SetStateAction<FileWithProgress[]>>;
// }

// export default function UploadModal2({
//   knowledgeLabel,
//   knowledgeName,
//   onClose,
//   onUploadComplete,
//   uploadedFiles,
//   externalFiles,
//   setExternalFiles,
// }: Props) {
//   /* ---------- 常量 & refs ---------- */
//   const supportFormats = [
//     "txt", "md", "log", "py", "js", "ts", "html", "css",
//     "docx", "xlsx", "xls", "pdf", "csv", "json"
//   ];
//   const folderInputRef = useRef<HTMLInputElement>(null);
//   const currentXHRRef = useRef<XMLHttpRequest | null>(null);
//   const cancelledRef = useRef(false);

//   /* ---------- state ---------- */
//   const [isUploading, setIsUploading] = useState(false);
//   const [isCancelled, setIsCancelled] = useState(false);
//   const [folderPath, setFolderPath] = useState<string | null>(null);
//   const [useVectorEmbedding, setUseVectorEmbedding] = useState(false);

//   const selectedFiles = externalFiles;
//   const setSelectedFiles = setExternalFiles;

//   /* ---------- 工具函数 ---------- */
//   const isFileDuplicate = (name: string) =>
//     uploadedFiles.some(
//       (f) => f.title === name && f.knowledgeLabel === knowledgeLabel,
//     );

//   const updateFile = (idx: number, patch: Partial<FileWithProgress>) =>
//     setSelectedFiles((prev) =>
//       prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
//     );

//   /* ---------- 加载配置 ---------- */
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await fetch("/api/config");
//         if (!res.ok) throw new Error("加载配置失败");
//         const cfg = await res.json();
//         setUseVectorEmbedding(cfg.use_vector_embedding);
//       } catch (e) {
//         console.error(e);
//       }
//     })();
//   }, []);

//   /* ---------- 选择文件夹 ---------- */
//   const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = Array.from(e.target.files ?? []);
//     if (!files.length) return;

//     const list: FileWithProgress[] = [];
//     for (const f of files) {
//       const ext = f.name.split(".").pop()?.toLowerCase();
//       if (!ext || !supportFormats.includes(ext) || isFileDuplicate(f.name)) continue;
//       list.push({
//         file: f,
//         progress: 0,
//         status: "pending",
//         relativePath: (f as any).webkitRelativePath || "",
//         errorMessage: undefined,
//       });
//     }
//     setSelectedFiles(list);

//     if (list.length > 0) {
//       const parts = (list[0].relativePath ?? "").split("/");
//       parts.pop();
//       setFolderPath(parts.join("/"));
//       backgroundUpload(list);
//     }
//   };

//   /* ---------- 顺序上传 ---------- */
//   const backgroundUpload = async (files: FileWithProgress[]) => {
//     setIsUploading(true);
//     for (let i = 0; i < files.length; i++) {
//       if (cancelledRef.current) break;
//       try {
//         await uploadSingleFile(files[i], i);
//       } catch (e) {
//         console.error("上传失败:", files[i].file.name, e);
//       }
//     }
//     setIsUploading(false);
//   };

//   /* ---------- 单文件上传 ---------- */
//   const uploadSingleFile = (item: FileWithProgress, idx: number) =>
//     new Promise<void>((resolve, reject) => {
//       if (cancelledRef.current) return reject(new Error("cancelled"));

//       const xhr = new XMLHttpRequest();
//       currentXHRRef.current = xhr;

//       const form = new FormData();
//       form.append("file", item.file);
//       form.append("knowledgeLabel", knowledgeLabel);
//       form.append("knowledgeName", String(knowledgeName));
//       form.append("useVectorEmbedding", String(useVectorEmbedding));

//       xhr.open("POST", "/api/fileupload");

//       xhr.upload.onprogress = (ev) => {
//         if (ev.lengthComputable)
//           updateFile(idx, {
//             progress: Math.round((ev.loaded / ev.total) * 100),
//             status: "uploading",
//           });
//       };

//       xhr.onload = () => {
//         if (xhr.status >= 200 && xhr.status < 300) {
//           updateFile(idx, { status: "success", progress: 100 });
//           try {
//             const res: UploadResponse = JSON.parse(xhr.responseText);
//             res?.data?.data.forEach((s) => {
//               if (s.code === 0) {
//                 const [first] = s.data;
//                 onUploadComplete({
//                   doc_id: first.doc_index,
//                   title: first.title,
//                   content: s.data.map((d) => d.content),
//                   fileType: first.fileType,
//                   knowledgeLabel: first.knowledgeLabel,
//                 });
//               } else {
//                 updateFile(idx, { status: "error", errorMessage: s.message });
//               }
//             });
//             resolve();
//           } catch (e) {
//             updateFile(idx, { status: "error", errorMessage: "解析失败" });
//             reject(e);
//           }
//         } else {
//           updateFile(idx, { status: "error" });
//           reject(new Error("upload fail"));
//         }
//       };

//       xhr.onerror = xhr.onabort = () => {
//         updateFile(idx, { status: "error", errorMessage: "中断或错误" });
//         reject(new Error("error/abort"));
//       };

//       xhr.send(form);
//     });

//   /* ---------- 取消 & 重启 ---------- */
//   const cancelUpload = () => {
//     setIsCancelled(true);
//     cancelledRef.current = true;
//     currentXHRRef.current?.abort();
//   };

//   const restartUpload = () => {
//     setIsCancelled(false);
//     cancelledRef.current = false;

//     const pending: FileWithProgress[] = selectedFiles
//       .filter((f) => f.status !== "success")
//       .map((f) => ({
//         ...f,
//         status: "pending",
//         progress: 0,
//         errorMessage: undefined,
//       }));
//     setSelectedFiles(pending);

//     if (pending.length) backgroundUpload(pending);
//   };

//   /* ---------- UI ---------- */
//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
//       <div className="relative bg-white rounded-2xl shadow-lg max-w-4xl w-full mx-6 p-10 max-h-[80vh] overflow-y-auto">
//         <button
//           onClick={onClose}
//           className="absolute top-5 right-5 text-2xl text-gray-500 hover:text-gray-700"
//         >
//           ✕
//         </button>

//         <h2 className="text-2xl font-bold">托管文件夹上传</h2>
//         <p className="mt-3 text-base text-gray-600">
//           请选择文件夹；支持格式：{supportFormats.join(", ")}
//         </p>

//         <div
//           className="mt-6 border-2 border-dashed border-gray-300 rounded-2xl px-6 pt-8 pb-6 text-center flex flex-col items-center justify-center"
//           style={{ height: 300 }}
//         >
//           {selectedFiles.length === 0 ? (
//             <p className="text-lg text-gray-500">点击下方按钮选择文件夹</p>
//           ) : (
//             <div className="w-full overflow-y-auto">
//               {folderPath && (
//                 <p className="mb-2 text-sm text-gray-500">📁 /{folderPath}</p>
//               )}
//               <UploadFileList
//                 selectedFiles={selectedFiles}
//                 showRemoveButton={false}
//               />
//             </div>
//           )}
//         </div>

//         <div className="flex justify-center mt-6 space-x-4">
//           <button
//             onClick={() => folderInputRef.current?.click()}
//             className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
//           >
//             选择文件夹
//           </button>
//           {isUploading && !isCancelled && (
//             <button
//               onClick={cancelUpload}
//               className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
//             >
//               终止上传
//             </button>
//           )}
//           {!isUploading && isCancelled && (
//             <button
//               onClick={restartUpload}
//               className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
//             >
//               重新开始
//             </button>
//           )}
//         </div>

//         {/* 隐藏 folder input */}
//         <input
//           ref={folderInputRef}
//           type="file"
//           multiple
//           onChange={handleFolderChange}
//           className="hidden"
//           // @ts-ignore
//           webkitdirectory="true"
//         />
//       </div>
//     </div>
//   );
// }
