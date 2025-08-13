import fs from "node:fs";
import path from "node:path";
import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";

/** -------- 路径配置 -------- */
const BASE_DIR = path.resolve(__dirname);            // 与当前文件同级
const LOG_DIR = path.join(BASE_DIR, "logs");
const FILE_PATTERN = "rag-%DATE%.log";

/** -------- 确保日志目录存在 -------- */
fs.mkdirSync(LOG_DIR, { recursive: true });

/** -------- 文件轮换 transport -------- */
const rotateFileTransport = new transports.DailyRotateFile({
  filename: path.join(LOG_DIR, FILE_PATTERN),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,           // .gz 压缩
  maxSize: "10m",                // 单文件上限 10 MB
  maxFiles: "7d",                // 仅保留 7 天
  level: "debug",
});

/** -------- 控制台 transport -------- */
const consoleTransport = new transports.Console({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.colorize(),           // 彩色输出
    format.printf(({ level, message }) => `${level}: ${message}`),
  ),
});

/** -------- 格式化规则 -------- */
const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} | ${level} | ${message}${extra}`;
  }),
);

/** -------- Logger 实例 -------- */
export const logger = createLogger({
  level: "debug",
  format: logFormat,
  transports: [rotateFileTransport, consoleTransport],
});

/** -------- 可选：将 console.* 重定向到 winston -------- */
type ConsoleMethod = "log" | "info" | "warn" | "error" | "debug";
(["log", "info", "warn", "error", "debug"] as ConsoleMethod[]).forEach(
  (method) => {
    const orig = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      // 将 console 调用同步写入日志
      // log → info，其余同名
      const level: ConsoleMethod = method === "log" ? "info" : method;
      logger[level](args.map(String).join(" "));
      orig(...args); // 保留原始输出
    };
  },
);
