#!/bin/bash

# 代码格式检查修复脚本
# 解决 Prettier 格式检查问题

set -e

echo "🔧 开始修复代码格式检查问题..."

# 检查当前状态
echo "📋 检查当前环境："
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"
echo "Prettier 版本: $(npx prettier --version)"

# 检查配置文件
echo "🔍 检查配置文件..."
if [ -f ".prettierrc" ]; then
    echo "✅ 找到 .prettierrc 配置"
elif [ -f ".prettierrc.json" ]; then
    echo "✅ 找到 .prettierrc.json 配置"
elif [ -f ".prettierrc.js" ]; then
    echo "✅ 找到 .prettierrc.js 配置"
else
    echo "❌ 未找到 Prettier 配置文件"
fi

if [ -f ".prettierignore" ]; then
    echo "✅ 找到 .prettierignore 配置"
else
    echo "⚠️ 未找到 .prettierignore 配置"
fi

# 方法 1: 尝试直接运行 Prettier 检查
echo "🔄 方法 1: 尝试直接运行 Prettier 检查..."
if npx prettier --check .; then
    echo "✅ Prettier 检查成功！"
    exit 0
fi

echo "❌ 直接检查失败，尝试其他方法..."

# 方法 2: 检查并安装依赖
echo "🔄 方法 2: 检查并安装 Prettier 依赖..."
npm install --save-dev prettier

# 方法 3: 尝试修复格式问题
echo "🔄 方法 3: 尝试修复格式问题..."
if npx prettier --write .; then
    echo "✅ 格式修复成功！"
    
    echo "🔄 重新检查格式..."
    if npx prettier --check .; then
        echo "✅ 格式检查通过！"
        exit 0
    fi
fi

# 方法 4: 使用忽略模式检查
echo "🔄 方法 4: 使用忽略模式检查..."
if npx prettier --check . --ignore-unknown; then
    echo "✅ 忽略未知文件的检查成功！"
    exit 0
fi

# 方法 5: 清理并重新安装
echo "🔄 方法 5: 清理并重新安装..."
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

echo "🔄 重新尝试 Prettier..."
if npx prettier --check .; then
    echo "✅ Prettier 修复成功！"
    exit 0
fi

echo "❌ 所有方法都失败了"
echo "💡 建议检查："
echo "   1. Prettier 配置文件是否正确"
echo "   2. 是否有语法错误的文件"
echo "   3. 依赖版本是否兼容"

# 显示详细的错误信息
echo "🔍 尝试诊断问题..."
npx prettier --check . --debug || echo "Prettier 诊断失败"

exit 1
