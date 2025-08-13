# 测试指南

本文档介绍了项目的测试配置和使用方法。

## 📋 测试配置

### Jest 配置

项目使用 Jest 作为测试框架，主要配置文件：

- `jest.config.js` - 主配置文件
- `jest.integration.config.js` - 集成测试配置
- `jest.setup.js` - 测试环境设置

### 测试环境

- **测试环境**: jsdom (浏览器环境模拟)
- **覆盖率阈值**: 70% (分支、函数、行、语句)
- **超时时间**: 10秒 (单元测试), 30秒 (集成测试)

## 🚀 运行测试

### 基本命令

```bash
# 运行所有测试
npm test

# 运行测试并监听文件变化
npm run test:watch

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行CI测试 (无监听模式)
npm run test:ci

# 运行集成测试
npm run test:integration
```

### 运行特定测试

```bash
# 运行特定文件的测试
npm test -- utils/__tests__/fileUtils.test.ts

# 运行匹配模式的测试
npm test -- --testNamePattern="File Utils"

# 运行特定目录的测试
npm test -- utils/
```

## 📁 测试文件结构

```
├── __tests__/                    # 测试目录
│   ├── fileUpload.integration.test.ts  # 集成测试
│   └── ...
├── utils/
│   └── __tests__/
│       └── fileUtils.test.ts     # 工具函数测试
├── components/
│   └── __tests__/
│       └── Button.test.tsx       # 组件测试
└── ...
```

### 测试文件命名约定

- `*.test.ts` - 单元测试
- `*.test.tsx` - React组件测试
- `*.integration.test.ts` - 集成测试
- `*.spec.ts` - 规范测试 (可选)

## 🧪 测试类型

### 1. 单元测试

测试独立的函数、类或模块。

```typescript
import { describe, it, expect } from '@jest/globals'

describe('Calculator', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5)
  })
})
```

### 2. 组件测试

使用 React Testing Library 测试 React 组件。

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from '@jest/globals'

describe('Button Component', () => {
  it('should render button with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### 3. 集成测试

测试多个模块之间的交互。

```typescript
describe('File Upload Integration', () => {
  it('should upload file successfully', async () => {
    const file = new File(['content'], 'test.pdf')
    const result = await uploadService.uploadFile(file)
    expect(result.success).toBe(true)
  })
})
```

## 🛠️ 测试工具

### React Testing Library

用于测试 React 组件，提供用户友好的查询方法。

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// 常用查询方法
screen.getByText('Submit')           // 通过文本查找
screen.getByRole('button')           // 通过角色查找
screen.getByTestId('submit-button')  // 通过测试ID查找
screen.getByLabelText('Email')       // 通过标签查找

// 用户交互
fireEvent.click(button)
fireEvent.change(input, { target: { value: 'test@example.com' } })
fireEvent.submit(form)

// 异步等待
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})
```

### Jest Mock

用于模拟依赖和外部服务。

```typescript
// 模拟模块
jest.mock('axios')

// 模拟函数
const mockFn = jest.fn()
mockFn.mockReturnValue('mocked value')
mockFn.mockResolvedValue({ data: 'success' })

// 模拟实现
jest.spyOn(api, 'fetchData').mockImplementation(() => {
  return Promise.resolve({ id: 1, name: 'Test' })
})
```

## 📊 覆盖率报告

### 查看覆盖率

```bash
npm run test:coverage
```

覆盖率报告包含：
- **Statements**: 语句覆盖率
- **Branches**: 分支覆盖率
- **Functions**: 函数覆盖率
- **Lines**: 行覆盖率

### 覆盖率阈值

当前设置的覆盖率阈值：
- 全局: 70%
- 可以根据需要调整 `jest.config.js` 中的 `coverageThreshold`

## 🔧 测试最佳实践

### 1. 测试命名

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', () => {
      // 测试实现
    })
    
    it('should throw error with invalid email', () => {
      // 测试实现
    })
  })
})
```

### 2. 测试结构 (AAA模式)

```typescript
it('should calculate total price correctly', () => {
  // Arrange (准备)
  const items = [{ price: 10 }, { price: 20 }]
  
  // Act (执行)
  const total = calculateTotal(items)
  
  // Assert (断言)
  expect(total).toBe(30)
})
```

### 3. 异步测试

```typescript
it('should fetch user data', async () => {
  const user = await fetchUser(1)
  expect(user.name).toBe('John Doe')
})

it('should handle fetch error', async () => {
  await expect(fetchUser(999)).rejects.toThrow('User not found')
})
```

### 4. 测试隔离

```typescript
describe('UserService', () => {
  let userService: UserService
  
  beforeEach(() => {
    userService = new UserService()
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })
})
```

## 🚨 常见问题

### 1. 测试失败

- 检查测试环境是否正确设置
- 确认依赖是否正确安装
- 查看错误信息并修复相关问题

### 2. 覆盖率不达标

- 添加更多测试用例
- 检查是否有未测试的代码路径
- 调整覆盖率阈值 (如果需要)

### 3. 测试运行缓慢

- 使用 `--watch` 模式进行增量测试
- 优化测试配置
- 减少不必要的异步操作

## 📚 相关资源

- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Jest Mock 指南](https://jestjs.io/docs/mock-functions)
