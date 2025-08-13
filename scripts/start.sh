#!/bin/bash

set -e

echo "🚀 Starting DeepSeekMine Server..."

# 设置 Python 模块路径（重要：确保可以 import semantic_rag.main）
export PYTHONPATH=/workspace/semantic_rag

# ✅ 检查后端入口 .pyc 是否存在
if [ ! -f "/workspace/semantic_rag/main.pyc" ]; then
  echo "❌ main.pyc 不存在，请检查 Dockerfile 中是否正确 COPY 并命名为 main.pyc"
  exit 1
fi

# 启动 FastAPI 后端（使用模块方式加载 .pyc）
echo "🔵 Starting FastAPI Backend..."
nohup python -m semantic_rag.main > backend.log 2>&1 &

# 等待 FastAPI 后端端口就绪
echo "⏳ Waiting for FastAPI Backend to be ready..."
for i in {1..60}; do
  if nc -z 127.0.0.1 5001; then
    echo "✅ FastAPI Backend is up!"
    break
  fi
  sleep 1
done

if ! nc -z 127.0.0.1 5001; then
  echo "❌ FastAPI Backend failed to start within expected time."
  cat backend.log
  exit 1
fi

# 启动 Next.js 前端
echo "🟢 Starting Next.js Frontend..."
cd /workspace
node_modules/.bin/next start -p 3000 -H 0.0.0.0
