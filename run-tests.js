#!/usr/bin/env node

/**
 * Jest测试运行脚本
 * 这个脚本展示了如何运行不同类型的Jest测试
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 开始运行Jest测试...\n');

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`\n${colors.cyan}▶ ${description}${colors.reset}`);
    log(`${colors.yellow}执行命令: ${command}${colors.reset}\n`);
    
    const result = execSync(command, { 
      stdio: 'inherit',
      cwd: __dirname,
      encoding: 'utf8'
    });
    
    log(`\n${colors.green}✅ ${description} 完成${colors.reset}`);
    return true;
  } catch (error) {
    log(`\n${colors.red}❌ ${description} 失败${colors.reset}`);
    return false;
  }
}

// 主测试运行函数
async function runTests() {
  log('🧪 Jest测试套件', 'bright');
  log('=' * 50, 'blue');
  
  // 1. 运行所有测试
  log('\n📋 1. 运行所有测试', 'bright');
  const allTestsPassed = runCommand('npm test', '运行所有测试');
  
  if (!allTestsPassed) {
    log('\n⚠️  部分测试失败，继续运行其他测试...', 'yellow');
  }
  
  // 2. 运行特定测试文件
  log('\n📋 2. 运行特定测试文件', 'bright');
  runCommand('npm test -- utils/__tests__/stringUtils.test.ts', '运行字符串工具测试');
  runCommand('npm test -- utils/__tests__/asyncUtils.test.ts', '运行异步工具测试');
  runCommand('npm test -- components/__tests__/Card.test.tsx', '运行Card组件测试');
  
  // 3. 运行带覆盖率的测试
  log('\n📋 3. 运行覆盖率测试', 'bright');
  runCommand('npm run test:coverage', '运行覆盖率测试');
  
  // 4. 运行特定目录的测试
  log('\n📋 4. 运行特定目录的测试', 'bright');
  runCommand('npm test -- utils/__tests__/', '运行utils目录下的所有测试');
  runCommand('npm test -- components/__tests__/', '运行components目录下的所有测试');
  
  // 5. 运行监听模式的测试
  log('\n📋 5. 运行监听模式测试', 'bright');
  log('注意: 监听模式会持续运行，按 Ctrl+C 停止', 'yellow');
  // 注释掉以避免阻塞
  // runCommand('npm test -- --watch', '运行监听模式测试');
  
  // 6. 运行集成测试
  log('\n📋 6. 运行集成测试', 'bright');
  runCommand('npm run test:integration', '运行集成测试');
  
  // 7. 运行CI模式的测试
  log('\n📋 7. 运行CI模式测试', 'bright');
  runCommand('npm run test:ci', '运行CI模式测试');
  
  // 8. 显示测试配置信息
  log('\n📋 8. 测试配置信息', 'bright');
  log('Jest配置文件: jest.config.js', 'cyan');
  log('Jest设置文件: jest.setup.js', 'cyan');
  log('集成测试配置: jest.integration.config.js', 'cyan');
  log('测试超时设置: 10秒', 'cyan');
  log('覆盖率阈值: 70%', 'cyan');
  
  // 9. 显示可用的测试命令
  log('\n📋 9. 可用的测试命令', 'bright');
  log('npm test                    - 运行所有测试', 'cyan');
  log('npm run test:coverage      - 运行覆盖率测试', 'cyan');
  log('npm run test:ci            - 运行CI模式测试', 'cyan');
  log('npm run test:integration   - 运行集成测试', 'cyan');
  log('npm test -- --watch        - 监听模式运行测试', 'cyan');
  log('npm test -- --verbose      - 详细输出模式', 'cyan');
  log('npm test -- --bail         - 遇到第一个失败就停止', 'cyan');
  
  // 10. 显示测试文件结构
  log('\n📋 10. 测试文件结构', 'bright');
  log('__tests__/                  - 测试目录', 'cyan');
  log('├── utils/__tests__/       - 工具函数测试', 'cyan');
  log('│   ├── fileUtils.test.ts  - 文件工具测试', 'cyan');
  log('│   ├── stringUtils.test.ts - 字符串工具测试', 'cyan');
  log('│   ├── asyncUtils.test.ts - 异步工具测试', 'cyan');
  log('│   └── mockExamples.test.ts - Mock示例测试', 'cyan');
  log('├── components/__tests__/  - 组件测试', 'cyan');
  log('│   ├── Button.test.tsx    - 按钮组件测试', 'cyan');
  log('│   └── Card.test.tsx      - 卡片组件测试', 'cyan');
  log('└── fileUpload.integration.test.ts - 文件上传集成测试', 'cyan');
  
  log('\n🎉 测试运行完成!', 'green');
  log('\n💡 提示:', 'bright');
  log('• 使用 --verbose 标志获取更详细的输出', 'cyan');
  log('• 使用 --coverage 标志查看代码覆盖率', 'cyan');
  log('• 使用 --watch 标志持续监听文件变化', 'cyan');
  log('• 使用 --bail 标志在第一个失败时停止', 'cyan');
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  log(`\n${colors.red}未处理的Promise拒绝:${colors.reset}`, 'red');
  log(`原因: ${reason}`, 'red');
  log(`Promise: ${promise}`, 'red');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`\n${colors.red}未捕获的异常:${colors.reset}`, 'red');
  log(`错误: ${error.message}`, 'red');
  log(`堆栈: ${error.stack}`, 'red');
  process.exit(1);
});

// 运行测试
runTests().catch(error => {
  log(`\n${colors.red}运行测试时发生错误:${colors.reset}`, 'red');
  log(error.message, 'red');
  process.exit(1);
});
