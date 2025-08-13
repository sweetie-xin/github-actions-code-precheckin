import React, { JSX } from "react";
import Image from "next/image";

// 生成不同文件的 Emoji 图标
export const getFileIcon = (fileName: string): JSX.Element => {
    // console.log("fileName", fileName)
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    // console.log("ext", ext)
    if (["xls", "xlsx"].includes(ext)) {
        return (
            <Image
                src="/excel.png"
                alt="Excel"
                width={20}
                height={20}
                className="w-5 h-5"
            />
        );
    }
    if (["csv"].includes(ext)) {
        return (
            <Image
                src="/csv.png"
                alt="csv"
                width={20}
                height={20}
                className="w-5 h-5"
            />
        );
    }
    if (["doc", "docx"].includes(ext)) {
        return (
            <Image
                src="/word.png"
                alt="word"
                width={20}
                height={20}
                className="w-5 h-5"
            />
        );
    }
    if (["pdf"].includes(ext)) {
        return (
            <Image
                src="/pdf.png"
                alt="pdf"
                width={20}
                height={20}
                className="w-5 h-5"
            />
        );
    }
    if (["md"].includes(ext)) {
        return (
            <Image
                src="/Markdown.png"
                alt="Markdown"
                width={20}
                height={20}
                className="w-5 h-5"
            />
        );
    }
    if (["txt"].includes(ext)) {
        return (
            <Image
                src="/txt.png"
                alt="txt"
                width={20}
                height={20}
                className="w-5 h-5"
            />
        );
    }
    if (["log"].includes(ext)) {
        return (
            <Image
                src="/log.png"
                alt="log"
                width={20}
                height={20}
                className="w-5 h-5"
            />
        );
    }
    if (["ppt", "pptx"].includes(ext)) {
        return (
            <Image
                src="/PPT.png"
                alt="ppt"
                width={20}
                height={20}
                className="w-5 h-5"
            />
        );
    }
    if (["js", "ts", "py", "json", "html", "css"].includes(ext)) {
        return (
            <Image
                src="/code.png"
                alt="code"
                width={20}
                height={20}
                className="w-5 h-5"
            />
        );
    }
    if (["png", "jpg", "jpeg", "gif", "bmp", "tiff", "tif", "webp", "ico", "raw"].includes(ext)) {
        return (
            <Image
                src="/image.svg"
                alt="image"
                width={20}
                height={20}
                className="w-5 h-5"
            />
        );
    }
    return <span>📁</span>;
};


export type FileWithProgress = {
    file: File;
    progress: number; // 0~100
    status: "pending" | "uploading" | "success" | "error";
    errorMessage?: string;
    relativePath?: string;
};

export function getFileExtension(fileName: string) {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop() : '';
}