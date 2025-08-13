#!/bin/bash

echo "🧹 Step 1: 清理 .next 缓存与调试文件"
rm -rf .next/cache
find .next -name "*.map" -delete
find .next -name "*.tsbuildinfo" -delete

echo "🧹 Step 2: 清理 dist_electron 中调试符号"
find dist_electron -name "*.map" -delete
find dist_electron -name "*.tsbuildinfo" -delete

echo "🧹 Step 3: 删除所有 __pycache__ 和 .pyc 文件"
find semantic_rag/python_env -type d -name "__pycache__" -exec rm -rf {} +
find semantic_rag/python_env -type f -name "*.pyc" -delete

echo "🧹 Step 4: 删除 python_env 中无用目录"
rm -rf semantic_rag/python_env/include
rm -rf semantic_rag/python_env/share
rm -rf semantic_rag/python_env/lib/python3.*/test

echo "🚀 Step 5: 开始打包 Electron 应用"
npm run dist

echo "🧹 Step 6: 清理 .app 中的语言包 (.lproj)"
rm -rf dist/mac-arm64/DeepSeekMine.app/Contents/Resources/*.lproj

echo "✅ 完成！已构建优化后的 DeepSeekMine 安装包。"
