export interface FileMeta {
  name: string;       // 文件名（不带扩展名）
  type: string;       // 类型，例如 pdf、md、txt
  size: number;       // 字节大小
  createdAt: string;  // 创建或上传时间
}