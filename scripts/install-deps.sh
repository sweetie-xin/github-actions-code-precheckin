#!/bin/bash

# 智能依赖安装脚本
# 解决 React 19 与测试库的兼容性问题

set -e  # 遇到错误时退出

echo "🔍 开始智能依赖安装..."
echo "📁 当前工作目录: $(pwd)"
echo "📦 Node.js 版本: $(node --version)"
echo "📦 npm 版本: $(npm --version)"

# 检查 package.json 是否存在
if [ ! -f package.json ]; then
    echo "❌ package.json 不存在！"
    exit 1
fi

# 显示 React 版本信息
echo "🔍 检查 React 版本..."
REACT_VERSION=$(node -p "require('./package.json').dependencies.react || require('./package.json').devDependencies.react || 'not found'")
echo "📦 React 版本: $REACT_VERSION"

# 显示测试库版本信息
echo "🔍 检查测试库版本..."
TESTING_LIB_VERSION=$(node -p "require('./package.json').devDependencies['@testing-library/react'] || 'not found'")
echo "📦 @testing-library/react 版本: $TESTING_LIB_VERSION"

# 方法 1: 尝试 npm ci（最快、最可靠）
echo "📦 方法 1: 尝试使用 npm ci..."
if npm ci; then
    echo "✅ 依赖安装成功！使用 npm ci"
    exit 0
fi

echo "❌ npm ci 失败，尝试其他方法..."

# 方法 2: 使用 --legacy-peer-deps 标志
echo "🔧 方法 2: 尝试使用 --legacy-peer-deps..."
if npm install --legacy-peer-deps; then
    echo "✅ 依赖安装成功！使用 --legacy-peer-deps"
    exit 0
fi

echo "❌ --legacy-peer-deps 失败，尝试 --force..."

# 方法 3: 使用 --force 标志
echo "⚡ 方法 3: 尝试使用 --force..."
if npm install --force; then
    echo "✅ 依赖安装成功！使用 --force"
    exit 0
fi

echo "❌ --force 失败，尝试清理后重新安装..."

# 方法 4: 清理并重新安装
echo "🧹 方法 4: 清理 node_modules 和 package-lock.json..."
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
echo "   4. React 19 与测试库的兼容性"

# 显示详细的错误信息
echo "🔍 显示 package.json 中的关键依赖..."
node -p "
const pkg = require('./package.json');
console.log('React:', pkg.dependencies?.react || pkg.devDependencies?.react);
console.log('React DOM:', pkg.dependencies?.['react-dom'] || pkg.devDependencies?.['react-dom']);
console.log('Testing Library:', pkg.devDependencies?.['@testing-library/react']);
console.log('Next.js:', pkg.dependencies?.next || pkg.devDependencies?.next);
"

echo "🔍 尝试 npm 诊断..."
npm doctor || echo "npm doctor 不可用"

exit 1
