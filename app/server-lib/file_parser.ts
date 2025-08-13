// file_parser.ts

import path from "path";
import fs from "fs";
import os from "os";
import mammoth from "mammoth";
import { PdfReader } from "pdfreader";
import * as XLSX from "xlsx";
import { parse as csvParse } from "csv-parse/sync";

export type SupportedExt = | ".txt" | ".md" | ".py" | ".js" | ".ts" | ".html" | ".css" | ".log"
                           | ".json" | ".csv" | ".docx" | ".pdf" | ".xls" | ".xlsx";
                           // 解析多种文件类型（文本、CSV、Excel、PDF、DOCX）为纯文本或结构化记录文本

// 清洗单元格内容
const clean = (c: any) => (c == null ? "" : String(c).trim());

/** CSV 转块：
 * 每行映射为 “列名: 值” 多行块，中间空行分隔 */
const csvToText = (s: string) => {
  const [hdr, ...rows] = csvParse(s, { bom: true, skip_empty_lines: true });
  return rows
    .map(r => hdr.map((h, i) => `${h.trim()}: ${clean(r[i])}`).join("\n"))
    .join("\n\n");
};

// 检测 Excel 是否为结构化表（至少80%列为有效标题且有数据行）
const detect = (rows: any[][]) => {
  if (rows.length < 2) return false;
  const hdr = rows[0].filter(c => clean(c) && !/^Unnamed:/.test(clean(c)));
  if (hdr.length < rows[0].length * 0.8 || hdr.length < 3) return false;
  return rows.slice(1, 6).some(r => r.filter(c => clean(c)).length >= hdr.length * 0.5);
};

// 结构化行格式化：添加 “记录 X” 标识，便于 chunker 识别
const fmtRow = (r: any[], hdr: string[], f: string, s: string, i: number) => {
  const kv = hdr
    .map((h, j) => clean(r[j]) && `${h}: ${clean(r[j])}`)
    .filter(Boolean);
  return kv.length ? `${f} - ${s} - 记录 ${i}\n${kv.join("\n")}` : "";
};
// 半结构化行格式化：管道分隔
const semiRow = (r: any[], f: string, s: string, i: number) => {
  const vals = r.map(clean).filter(Boolean);
  return vals.length ? `${f} - ${s} - 行 ${i}\n${vals.join(" | ")}` : "";
};

// Excel 解析：遍历所有 sheet, 根据 detect 选择结构化或半结构化处理
const excelToText = (buf: Buffer, fn: string) => {
  const wb = XLSX.read(buf, { type: "buffer" });
  const out: string[] = [];
  wb.SheetNames.forEach(sheet => {
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheet], { header: 1 });
    if (!rows.length) return;
    if (detect(rows)) {
      const hdrs = rows[0].map(clean).filter(h => h && !/^Unnamed:/.test(h));
      rows.slice(1).forEach((r, i) => {
        const t = fmtRow(r, hdrs, fn, sheet, i + 1);
        if (t) out.push(t);
      });
    } else {
      rows.forEach((r, i) => {
        const t = semiRow(r, fn, sheet, i + 1);
        if (t) out.push(t);
      });
    }
  });
  return out.join("\n\n");
};

/**
 * extractText
 * 根据文件扩展名调用不同解析逻辑
 */
export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  // 统一的文件大小限制（50MB），避免解析大文件导致内存分配失败
  const MAX_SIZE_BYTES = 50 * 1024 * 1024;
  if (buffer && buffer.length > MAX_SIZE_BYTES) {
    const sizeMb = Math.round((buffer.length / (1024 * 1024)) * 10) / 10;
    return `[文件过大] 当前大小 ${sizeMb}MB，超出允许的 50MB 上限，请压缩或拆分后再上传。`;
  }
  const ext = path.extname(filename).toLowerCase();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "u-"));
  const p = path.join(dir, filename);

  try {
    fs.writeFileSync(p, buffer);
    if (ext === ".pdf") {
      // PDF 逐项解析
      return await new Promise<string>((res, rej) => {
        let content = "";
        new PdfReader().parseFileItems(p, (err, item) => {
          if (err) rej(err);
          else if (!item) res(content.trim());
          else if (item.text) content += item.text + " ";
        });
      });
    }
    if (ext === ".docx") {
      // DOCX 使用 mammoth，添加错误处理和备用方案
      try {
        const result = await mammoth.extractRawText({ path: p });
        return result.value;
      } catch (mammothError) {
        console.error("Mammoth 解析 DOCX 失败:", mammothError);
        
        // 备用方案：尝试使用 docx 库解析
        try {
          // 尝试使用 JSZip 直接解析 DOCX 文件
          const JSZip = await import('jszip');
          const zip = new JSZip.default();
          const zipContent = await zip.loadAsync(buffer);
          
          // 查找并读取 document.xml
          const documentXml = zipContent.file('word/document.xml');
          if (documentXml) {
            const xmlContent = await documentXml.async('string');
            // 简单的 XML 文本提取（移除标签）
            const textContent = xmlContent
              .replace(/<[^>]+>/g, ' ') // 移除所有 XML 标签
              .replace(/\s+/g, ' ') // 合并多个空格
              .trim();
            
            if (textContent) {
              return textContent;
            }
          }
          
          return `[DOCX 解析失败] 文件可能损坏或格式不支持。错误: ${mammothError.message}`;
        } catch (docxError) {
          console.error("备用 DOCX 解析也失败:", docxError);
          return `[DOCX 解析失败] 无法解析此 DOCX 文件。请检查文件是否完整且未损坏。`;
        }
      }
    }
    if (ext === ".xls" || ext === ".xlsx") {
      return excelToText(buffer, filename);
    }
    if (ext === ".csv") {
      return csvToText(fs.readFileSync(p, "utf8"));
    }
    // 其他文本文件直接读取
    return fs.readFileSync(p, "utf8");
  } finally {
    // 清理临时文件与目录
    try { fs.unlinkSync(p); fs.rmdirSync(dir); } catch {}
  }
}
