#!/bin/bash

# 智能依赖安装脚本
# 解决 React 19 与测试库的兼容性问题

echo "🔍 开始智能依赖安装..."

# 方法 1: 尝试 npm ci（最快、最可靠）
echo "📦 尝试使用 npm ci..."
if npm ci; then
    echo "✅ 依赖安装成功！使用 npm ci"
    exit 0
fi

echo "❌ npm ci 失败，尝试其他方法..."

# 方法 2: 使用 --legacy-peer-deps 标志
echo "🔧 尝试使用 --legacy-peer-deps..."
if npm install --legacy-peer-deps; then
    echo "✅ 依赖安装成功！使用 --legacy-peer-deps"
    exit 0
fi

echo "❌ --legacy-peer-deps 失败，尝试 --force..."

# 方法 3: 使用 --force 标志
echo "⚡ 尝试使用 --force..."
if npm install --force; then
    echo "✅ 依赖安装成功！使用 --force"
    exit 0
fi

echo "❌ --force 失败，尝试清理后重新安装..."

# 方法 4: 清理并重新安装
echo "🧹 清理 node_modules 和 package-lock.json..."
rm -rf node_modules package-lock.json

echo "📦 重新生成 package-lock.json..."
if npm install --package-lock-only; then
    echo "✅ package-lock.json 生成成功"
    
    echo "📦 尝试重新安装依赖..."
    if npm install --legacy-peer-deps; then
        echo "✅ 依赖安装成功！清理后使用 --legacy-peer-deps"
        exit 0
    fi
fi

echo "❌ 所有安装方法都失败了"
echo "💡 建议检查："
echo "   1. package.json 中的依赖版本兼容性"
echo "   2. 网络连接问题"
echo "   3. npm 缓存问题"

exit 1
