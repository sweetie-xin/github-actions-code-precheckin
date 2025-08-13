#!/bin/bash

set -e  # 只要出错就退出

echo "📦 开始加载 Docker 镜像..."

docker load -i deepseekmine-1.0.0.tar
docker load -i meilisearch-v1.6.tar

echo "🚀 启动服务中..."
docker-compose up -d

echo "✅ 部署完成！访问地址"
echo "http://127.0.0.1:3335"
