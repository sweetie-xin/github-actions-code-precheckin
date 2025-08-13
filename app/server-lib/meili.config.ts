import type { AppEnv } from "./env";

// 尝试加载环境变量配置
let envConfig: any = {};
try {
  // 在开发环境中，尝试加载 env.config.js
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    const path = require('path');
    const envConfigPath = path.join(process.cwd(), 'env.config.js');
    const fs = require('fs');
    if (fs.existsSync(envConfigPath)) {
      // 读取文件内容并解析为对象
      const configContent = fs.readFileSync(envConfigPath, 'utf8');
      
      // 提取 module.exports 部分
      const exportMatch = configContent.match(/module\.exports\s*=\s*({[\s\S]*?});?\s*$/);
      if (exportMatch) {
        // 使用 eval 来解析对象（在受控环境中）
        const exportStr = exportMatch[1];
        envConfig = eval(`(${exportStr})`);
        
        // 将配置应用到 process.env
        Object.keys(envConfig).forEach(key => {
          if (!process.env[key]) {
            process.env[key] = envConfig[key];
          }
        });
      }
    }
  }
} catch (error) {
  console.warn('[环境配置] 无法加载 env.config.js:', error);
}

export interface MeiliRuntimeConfig {
  MEILI_BASE: string;
  START_MEILISEARCH: boolean;
}

// 使用环境变量或默认值
export const MEILI_API_KEY = process.env.MEILI_API_KEY ?? "qaz0913cde350odxs";
export const INDEX_NAME = process.env.MEILI_INDEX_NAME ?? "chunks";

const MAP: Record<AppEnv, MeiliRuntimeConfig> = {
  dev: {
    MEILI_BASE: process.env.MEILI_DEV_BASE ?? "http://127.0.0.1:7775",
    START_MEILISEARCH: true,
  },
  docker: {
    MEILI_BASE: process.env.MEILI_DOCKER_BASE ?? "http://meilisearch:7775",
    START_MEILISEARCH: false,
  },
};

export const CURRENT = MAP[(process.env.APP_ENV as AppEnv) ?? "dev"];
export const MEILI_BASE = CURRENT.MEILI_BASE;

export const MEILI_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${MEILI_API_KEY}`,
};

// 导出配置信息用于调试
export const CONFIG_INFO = {
  MEILI_API_KEY,
  MEILI_BASE,
  APP_ENV: process.env.APP_ENV ?? "dev",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  CURRENT
};