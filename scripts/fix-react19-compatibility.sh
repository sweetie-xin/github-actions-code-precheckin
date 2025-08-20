#!/bin/bash

# React 19 兼容性修复脚本
# 专门解决 React 19 与测试库的兼容性问题

set -e

echo "🔧 开始修复 React 19 兼容性问题..."

# 检查当前状态
echo "📋 当前依赖状态："
echo "React: $(node -p "require('./package.json').dependencies.react || 'not found'")"
echo "React DOM: $(node -p "require('./package.json').dependencies['react-dom'] || 'not found'")"
echo "Testing Library: $(node -p "require('./package.json').devDependencies['@testing-library/react'] || 'not found'")"

# 备份 package.json
cp package.json package.json.backup
echo "💾 已备份 package.json"

# 方法 1: 尝试更新到兼容的测试库版本（React 19 需 16.x）
echo "🔄 方法 1: 更新测试库到兼容版本..."
npm install --save-dev @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.1.0 @testing-library/user-event@^14.5.0

# 方法 2: 如果还有问题，尝试使用 --legacy-peer-deps
echo "🔄 方法 2: 使用 --legacy-peer-deps 安装..."
npm install --legacy-peer-deps

# 方法 3: 清理并重新安装
echo "🔄 方法 3: 清理并重新安装..."
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

echo "✅ React 19 兼容性修复完成！"
echo "📋 修复后的依赖状态："
echo "React: $(node -p "require('./package.json').dependencies.react || 'not found'")"
echo "React DOM: $(node -p "require('./package.json').dependencies['react-dom'] || 'not found'")"
echo "Testing Library: $(node -p "require('./package.json').devDependencies['@testing-library/react'] || 'not found'")"
