import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { meiliClient, indexExists, createMeiliIndex } from "@/app/server-lib/meili.setup";
import { splitChunks } from "@/app/server-lib/rag/chunker";
import { extractText } from "@/app/server-lib/file_parser";
import { tokenization } from "@/app/server-lib/tokenization";
import fs from 'fs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  console.log(`[上传开始] 时间: ${new Date().toISOString()}`);
  const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB 统一限制
  
  // 声明变量在函数顶部，确保在 catch 块中可访问
  let processedFiles: any[] = [];
  let failedFiles: any[] = [];
  let allDocs: any[] = [];
  
  try {
    // 确保临时目录存在
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`[临时目录] 创建目录: ${tempDir}`);
    }

    const formData = await request.formData();
    const files = formData.getAll("file").filter(f => f instanceof File) as File[];
    const kblabel = formData.get("knowledgeLabel")?.toString() || "";

    console.log(`[参数检查] 知识库ID: ${kblabel}, 文件数量: ${files.length}`);
    
    // 参数验证
    if (!kblabel) {
      console.error(`[参数错误] 知识库ID为空`);
      return NextResponse.json({ 
        error: "参数错误", 
        detail: "知识库ID不能为空",
        code: "MISSING_KB_ID"
      }, { status: 400 });
    }

    if (files.length === 0) {
      console.error(`[参数错误] 没有选择文件`);
      return NextResponse.json({ 
        error: "参数错误", 
        detail: "请选择要上传的文件",
        code: "NO_FILES_SELECTED"
      }, { status: 400 });
    }

    // 初始化数组（已在顶部声明）

    for (const file of files) {
      const fileStartTime = Date.now();
      const fileName = file.name;
      const fileSize = (file as any).size ?? 0;

      console.log(`[文件处理] 开始处理: ${fileName}, 大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

      try {
        // 文件大小检查：在读取 ArrayBuffer 之前预检，避免内存分配失败
        if (fileSize > MAX_SIZE_BYTES) {
          throw new Error(`文件大小超过限制: ${(fileSize / 1024 / 1024).toFixed(1)}MB > 50MB`);
        }

        // 读取二进制内容（在通过大小检查后再读取）
        const buffer = Buffer.from(await file.arrayBuffer());

        let rawText = "";
        try {
          console.log(`[文本提取] 开始提取: ${fileName}`);
          rawText = await extractText(buffer, fileName);
          console.log(`[文本提取] 完成: ${fileName}, 文本长度: ${rawText.length}`);
        } catch (err) {
          const errorMsg = `文件解析失败: ${fileName}`;
          console.error(`[文本提取错误] ${errorMsg}`, err);
          failedFiles.push({
            fileName,
            error: errorMsg,
            detail: err instanceof Error ? err.message : String(err),
            stage: "text_extraction"
          });
          continue;
        }

        if (!rawText || rawText.trim().length === 0) {
          const errorMsg = `文件内容为空: ${fileName}`;
          console.warn(`[内容检查] ${errorMsg}`);
          failedFiles.push({
            fileName,
            error: errorMsg,
            detail: "文件内容为空或无法提取文本",
            stage: "content_check"
          });
          continue;
        }

        const rawChunks = splitChunks(rawText);
        console.log(`[分块处理] ${fileName}: ${rawChunks.length} 个块`);

        const ext = path.extname(fileName).toLowerCase();
        const fileDocs = [];

        for (let idx = 0; idx < rawChunks.length; idx++) {
          const content = rawChunks[idx];
          let segment = "";

          try {
            segment = await tokenization(content);
          } catch (err) {
            console.error(`[分词错误] ${fileName} 第 ${idx + 1} 段分词失败:`, err);
            // 分词失败时使用原文本
            segment = content;
          }

          fileDocs.push({
            id: uuidv4(),
            doc_index: fileName,
            doc_index2: idx + 1,
            title: fileName,
            content,
            segmentContent: segment,
            fileType: ext.replace(".", "") || "txt",
          });
        }

        allDocs.push(...fileDocs);
        processedFiles.push({
          fileName,
          chunks: fileDocs.length,
          processingTime: Date.now() - fileStartTime
        });

        console.log(`[文件完成] ${fileName}: ${fileDocs.length} 个文档块, 耗时: ${Date.now() - fileStartTime}ms`);

      } catch (err) {
        const errorMsg = `文件处理失败: ${fileName}`;
        console.error(`[文件处理错误] ${errorMsg}`, err);
        failedFiles.push({
          fileName,
          error: errorMsg,
          detail: err instanceof Error ? err.message : String(err),
          stage: "file_processing"
        });
      }
    }

    console.log(`[处理统计] 成功处理: ${processedFiles.length} 个文件, 失败: ${failedFiles.length} 个文件, 总文档块: ${allDocs.length}`);

    if (allDocs.length === 0) {
      console.warn("[文档检查] 未生成任何文档，上传终止");
      return NextResponse.json({ 
        error: "文档内容为空，或全部失败", 
        detail: "所有文件都无法处理",
        failedFiles,
        code: "NO_DOCS_GENERATED"
      }, { status: 400 });
    }

    const indexName = `kb_${kblabel}`;
    console.log(`[索引操作] 目标索引: ${indexName}`);
    
    try {
      // 检查索引是否存在，如果不存在则创建
      if (!(await indexExists(indexName))) {
        console.log(`[索引创建] 索引 ${indexName} 不存在，正在创建...`);
        await createMeiliIndex(indexName);
        console.log(`[索引创建] 索引 ${indexName} 创建完成`);
      } else {
        console.log(`[索引检查] 索引 ${indexName} 已存在`);
      }
      
      console.log(`[文档添加] 开始添加 ${allDocs.length} 个文档到索引 ${indexName}`);
      const meiliIndex = await meiliClient.getIndex(indexName);
      await meiliIndex.addDocuments(allDocs);
      console.log(`[文档添加] 成功添加文档到索引 ${indexName}`);

    } catch (err) {
      const errorMsg = `索引操作失败: ${indexName}`;
      console.error(`[索引错误] ${errorMsg}`, err);
      return NextResponse.json({
        error: "索引操作失败",
        detail: err instanceof Error ? err.message : String(err),
        indexName,
        code: "INDEX_OPERATION_FAILED"
      }, { status: 500 });
    }

    const uniqueFileNames = [...new Set(allDocs.map(doc => doc.title))];
    const totalTime = Date.now() - startTime;
    
    console.log(`[上传完成] 总耗时: ${totalTime}ms, 成功文件: ${uniqueFileNames.length} 个`);
    
    return NextResponse.json({
      code: 0,
      message: "上传成功",
      files: uniqueFileNames,
      stats: {
        totalTime,
        processedFiles: processedFiles.length,
        failedFiles: failedFiles.length,
        totalDocs: allDocs.length,
        failedFilesDetails: failedFiles
      }
    });


  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error(`[上传失败] 总耗时: ${totalTime}ms, 错误:`, error);
    
    // 详细的错误信息
    let errorDetail = "未知错误";
    let errorCode = "UNKNOWN_ERROR";
    
    if (error instanceof Error) {
      errorDetail = error.message;
      if (error.message.includes("network") || error.message.includes("fetch")) {
        errorCode = "NETWORK_ERROR";
      } else if (error.message.includes("timeout")) {
        errorCode = "TIMEOUT_ERROR";
      } else if (error.message.includes("permission") || error.message.includes("access")) {
        errorCode = "PERMISSION_ERROR";
      }
    } else if (typeof error === "string") {
      errorDetail = error;
    }
    
    return NextResponse.json({
      error: "上传失败",
      detail: errorDetail,
      code: errorCode,
      totalTime,
      stats: {
        processedFiles: processedFiles?.length || 0,
        failedFiles: failedFiles?.length || 0,
        totalDocs: allDocs?.length || 0,
        failedFilesDetails: failedFiles || []
      }
    }, { status: 500 });
  }
}
