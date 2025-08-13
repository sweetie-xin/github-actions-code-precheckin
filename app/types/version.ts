export interface VersionFile {
    id: string;
    version: string;
    fileName: string;
    fileSize: number;
    uploadDate: string;
    description: string;
    status: "active" | "deprecated" | "draft";
    downloadCount: number;
    filePath?: string;
    externalUrl?: string; // 外部下载链接
    externalId?: string;  // 外部文件ID
}export interface VersionUploadForm {
    version: string;
    description: string;
    file: File | null;
}

export interface VersionApiResponse {
    success: boolean;
    version?: VersionFile;
    error?: string;
    message?: string;
}
