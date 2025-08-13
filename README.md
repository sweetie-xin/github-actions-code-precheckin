# GitHub Actions 代码预检入工作流

这个项目提供了多种GitHub Actions工作流模板，用于在代码提交前进行自动化质量检查和验证。

## 📁 项目结构

```
.github/
├── workflows/
│   ├── ci.yml              # 完整的CI/CD流水线
│   ├── precheckin.yml      # 简化的预检入检查
│   ├── pre-commit.yml      # 基于pre-commit的检查
│   └── multi-language.yml  # 多语言支持的工作流
├── .pre-commit-config.yaml # pre-commit配置文件
└── README.md              # 项目说明文档
```

## 🚀 工作流说明

### 1. 完整CI/CD流水线 (`ci.yml`)

这是一个完整的持续集成和部署流水线，包含：

- **代码质量检查**: ESLint, Prettier, TypeScript类型检查
- **安全审计**: npm audit
- **单元测试**: 运行测试套件
- **集成测试**: 端到端测试
- **构建**: 应用程序构建
- **部署**: 自动部署到测试和生产环境

**触发条件**: 
- 推送到 `main` 或 `develop` 分支
- 创建针对 `main` 或 `develop` 分支的Pull Request

### 2. 预检入验证 (`precheckin.yml`)

专门用于代码预检入的简化工作流：

- 代码格式检查
- 代码规范检查
- 类型检查
- 单元测试
- 安全审计
- 依赖检查

### 3. Pre-commit钩子 (`pre-commit.yml`)

基于pre-commit框架的本地和远程检查：

- 使用 `.pre-commit-config.yaml` 配置
- 支持多种编程语言
- 自动格式化代码
- 安全检查

### 4. 多语言支持 (`multi-language.yml`)

自动检测项目类型并运行相应的检查：

- **JavaScript/TypeScript**: ESLint, 测试, 构建
- **Python**: flake8, black, isort, pytest
- **Java**: Maven构建和测试
- **Go**: 测试和linting
- **C#**: .NET构建和测试
- **通用安全扫描**: Trivy漏洞扫描

## 🛠️ 使用方法

### 1. 复制工作流文件

将需要的工作流文件复制到你的项目的 `.github/workflows/` 目录下：

```bash
# 复制完整CI/CD流水线
cp .github/workflows/ci.yml your-project/.github/workflows/

# 复制预检入检查
cp .github/workflows/precheckin.yml your-project/.github/workflows/

# 复制pre-commit配置
cp .pre-commit-config.yaml your-project/
```

### 2. 配置项目

根据你的项目类型，修改工作流文件中的配置：

#### Node.js项目
确保 `package.json` 中包含以下脚本：
```json
{
  "scripts": {
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "build": "your-build-command"
  }
}
```

#### Python项目
确保项目根目录有 `requirements.txt` 或 `pyproject.toml`。

#### 其他语言
根据工作流文件中的说明配置相应的构建工具。

### 3. 设置环境变量

在GitHub仓库的Settings > Secrets and variables > Actions中设置必要的环境变量：

- `NPM_TOKEN`: npm包发布令牌
- `DOCKER_USERNAME`: Docker用户名
- `DOCKER_PASSWORD`: Docker密码
- 其他部署相关的密钥

### 4. 启用工作流

推送代码到GitHub后，工作流将自动在以下情况触发：
- 推送到指定分支
- 创建Pull Request
- 手动触发（在Actions页面）

## 📋 Pre-commit配置

项目包含了一个完整的 `.pre-commit-config.yaml` 文件，支持：

### 通用检查
- 尾随空格检查
- 文件结尾检查
- YAML/JSON格式检查
- 大文件检查
- 合并冲突检查

### Python检查
- **Black**: 代码格式化
- **isort**: 导入排序
- **flake8**: 代码规范检查
- **bandit**: 安全漏洞扫描
- **safety**: 依赖安全检查

### JavaScript/TypeScript检查
- **Prettier**: 代码格式化
- **ESLint**: 代码规范检查

### 提交信息检查
- **commitizen**: 提交信息格式检查

## 🔧 自定义配置

### 修改触发条件

编辑工作流文件的 `on` 部分：

```yaml
on:
  push:
    branches: [ main, develop, feature/* ]  # 添加更多分支
  pull_request:
    branches: [ main, develop ]
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨2点运行
```

### 添加新的检查步骤

在工作流的 `steps` 部分添加新的检查：

```yaml
- name: Custom Check
  run: |
    echo "Running custom check..."
    # 你的自定义检查命令
```

### 配置缓存

优化构建速度，添加缓存配置：

```yaml
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: |
      node_modules
      ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

## 🚨 故障排除

### 常见问题

1. **工作流不触发**
   - 检查分支名称是否正确
   - 确认文件路径为 `.github/workflows/`
   - 检查YAML语法是否正确

2. **依赖安装失败**
   - 检查 `package.json` 或 `requirements.txt` 是否存在
   - 确认依赖版本兼容性
   - 检查网络连接

3. **测试失败**
   - 检查测试配置
   - 确认测试文件命名正确
   - 查看测试日志获取详细错误信息

### 调试技巧

1. **启用调试日志**
   在仓库设置中启用Actions的调试日志：
   Settings > Actions > General > Workflow permissions > Enable debug logging

2. **本地测试**
   使用 `act` 工具在本地运行GitHub Actions：
   ```bash
   npm install -g act
   act -j precheckin
   ```

## 📚 相关资源

- [GitHub Actions 官方文档](https://docs.github.com/en/actions)
- [Pre-commit 框架文档](https://pre-commit.com/)
- [ESLint 配置指南](https://eslint.org/docs/user-guide/configuring)
- [Black 代码格式化](https://black.readthedocs.io/)
- [Jest 测试框架](https://jestjs.io/)

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这些工作流模板！

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。