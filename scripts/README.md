# 依赖安装脚本说明

## 概述

这个目录包含了用于解决 GitHub Actions 中依赖安装问题的脚本，特别是 React 19 兼容性问题。

## 脚本列表

### 1. `install-deps.sh` - 智能依赖安装脚本

**功能**：
- 自动处理依赖安装失败的情况
- 多重回退策略确保安装成功
- 详细的调试信息输出

**使用方法**：
```bash
chmod +x scripts/install-deps.sh
./scripts/install-deps.sh
```

**安装策略**：
1. **npm ci** - 最快、最可靠
2. **--legacy-peer-deps** - 解决 React 19 兼容性
3. **--force** - 强制安装
4. **清理重试** - 删除 node_modules 重新安装

### 2. `fix-react19-compatibility.sh` - React 19 兼容性修复脚本

**功能**：
- 专门解决 React 19 与测试库的兼容性问题
- 自动更新到兼容的测试库版本
- 备份原始配置

**使用方法**：
```bash
chmod +x scripts/fix-react19-compatibility.sh
./scripts/fix-react19-compatibility.sh
```

## 在 GitHub Actions 中的使用

所有工作流文件都已经配置为使用 `install-deps.sh` 脚本：

```yaml
- name: Install dependencies
  run: |
    chmod +x scripts/install-deps.sh
    ./scripts/install-deps.sh
```

## 故障排除

### 常见问题

1. **权限问题**：
   ```bash
   chmod +x scripts/install-deps.sh
   ```

2. **脚本不存在**：
   确保脚本文件在正确的位置

3. **依赖冲突**：
   脚本会自动尝试多种解决方案

### 手动调试

如果脚本仍然失败，可以手动运行：

```bash
# 检查依赖状态
npm ls react @testing-library/react

# 尝试不同的安装方法
npm install --legacy-peer-deps
npm install --force

# 清理重新安装
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## 版本兼容性

- **React**: ^19.x.x
- **@testing-library/react**: ^15.0.0
- **@testing-library/jest-dom**: ^6.1.0
- **@testing-library/user-event**: ^14.5.0

## 注意事项

1. 脚本会自动备份重要文件
2. 使用 `--legacy-peer-deps` 可能影响某些依赖的严格检查
3. 建议在本地测试脚本后再推送到 GitHub
