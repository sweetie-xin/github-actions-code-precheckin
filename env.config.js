// DeepSeekMine 环境变量配置
// 这个文件用于设置应用的环境变量

module.exports = {
  // 应用环境
  NODE_ENV: 'development',
  APP_ENV: 'dev',

  // Meilisearch 配置
  MEILI_API_KEY: 'qaz0913cde350odxs',
  MEILI_DEV_BASE: 'http://127.0.0.1:7775',
  MEILI_DOCKER_BASE: 'http://meilisearch:7775',
  MEILI_INDEX_NAME: 'chunks',

  // Next.js 配置
  NEXT_PUBLIC_APP_URL: 'http://localhost:3335',

  // 文件上传配置
  MAX_FILE_SIZE: 104857600, // 100MB
  MAX_FILES_PER_UPLOAD: 10,

  // 日志配置
  LOG_LEVEL: 'info',
  LOG_FILE: 'logs/app.log',

  // 数据库配置（如果需要）
  // DB_HOST: 'localhost',
  // DB_PORT: 3306,
  // DB_USER: 'root',
  // DB_PASSWORD: '',
  // DB_NAME: 'deepseekmine'
}; 