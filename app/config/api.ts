// API配置文件
export const API_CONFIG = {
    // 外部软件上传API
    EXTERNAL_UPLOAD_API: 'http://47.122.144.171:8001/software/upload/',

    // 其他可能的外部API端点
    EXTERNAL_DOWNLOAD_API: 'http://47.122.144.171:8001/software/download/',


    EXTERNAL_CREATE_VERSION_API: 'https://deepseekmine.com/omni/api/update/create',

    // 本地API端点
    LOCAL_VERSIONS_API: '/api/versions',

    // 超时设置（毫秒）
    UPLOAD_TIMEOUT: 300000, // 5分钟

    // 支持的文件类型
    SUPPORTED_FILE_TYPES: ['.exe', '.msi', '.dmg', '.zip', '.tar.gz'],

    // 最大文件大小 (字节)
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
};
