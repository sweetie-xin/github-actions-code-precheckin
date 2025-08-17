#!/bin/bash

# ESLint 修复脚本
# 解决 ESLint 配置和依赖问题

set -e

echo "🔧 开始修复 ESLint 问题..."

# 检查当前状态
echo "📋 检查当前环境："
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"
echo "ESLint 版本: $(npx eslint --version)"

# 检查配置文件
echo "🔍 检查 ESLint 配置文件..."
if [ -f "eslint.config.mjs" ]; then
    echo "✅ 找到 eslint.config.mjs"
elif [ -f "eslint.config.js" ]; then
    echo "✅ 找到 eslint.config.js"
elif [ -f ".eslintrc.js" ]; then
    echo "⚠️  找到旧的 .eslintrc.js 配置"
elif [ -f ".eslintrc.json" ]; then
    echo "⚠️  找到旧的 .eslintrc.json 配置"
else
    echo "❌ 未找到 ESLint 配置文件"
fi

# 检查 package.json 中的脚本
echo "🔍 检查 package.json 中的 lint 脚本..."
LINT_SCRIPT=$(node -p "require('./package.json').scripts.lint || 'not found'")
echo "📦 lint 脚本: $LINT_SCRIPT"

# 方法 1: 尝试直接运行 ESLint
echo "🔄 方法 1: 尝试直接运行 ESLint..."
if npx eslint . --no-error-on-unmatched-pattern; then
    echo "✅ ESLint 运行成功！"
    exit 0
fi

echo "❌ 直接运行失败，尝试其他方法..."

# 方法 2: 检查并安装依赖
echo "🔄 方法 2: 检查并安装 ESLint 依赖..."
npm install --save-dev eslint @eslint/eslintrc @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-next

# 方法 3: 尝试使用旧配置格式
echo "🔄 方法 3: 尝试使用兼容的配置..."
if npx eslint . --ext .js,.jsx,.ts,.tsx --no-error-on-unmatched-pattern; then
    echo "✅ 使用旧格式成功！"
    exit 0
fi

# 方法 4: 清理并重新安装
echo "🔄 方法 4: 清理并重新安装..."
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

echo "🔄 重新尝试 ESLint..."
if npx eslint . --no-error-on-unmatched-pattern; then
    echo "✅ ESLint 修复成功！"
    exit 0
fi

echo "❌ 所有方法都失败了"
echo "💡 建议检查："
echo "   1. ESLint 配置文件是否正确"
echo "   2. 依赖版本是否兼容"
echo "   3. 是否有语法错误"

# 显示详细的错误信息
echo "🔍 尝试诊断问题..."
npx eslint . --debug || echo "ESLint 诊断失败"

exit 1
