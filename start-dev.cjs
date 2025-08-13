// DeepSeekMine 开发环境启动脚本（确保 Meilisearch 就绪）
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log("=== DeepSeekMine 开发环境启动（确保 Meilisearch 就绪）===\n");

// 1. 加载环境配置
console.log("1. 加载环境配置...");
let envConfig = {};
try {
  const envConfigPath = path.join(process.cwd(), 'env.config.js');
  if (fs.existsSync(envConfigPath)) {
    // 读取文件内容并解析为对象
    const configContent = fs.readFileSync(envConfigPath, 'utf8');
    
    // 提取 module.exports 部分
    const exportMatch = configContent.match(/module\.exports\s*=\s*({[\s\S]*?});?\s*$/);
    if (exportMatch) {
      // 使用 eval 来解析对象（在受控环境中）
      const exportStr = exportMatch[1];
      envConfig = eval(`(${exportStr})`);
      console.log("   ✅ env.config.js 加载成功");
      
      // 显示关键配置
      console.log(`   📋 NODE_ENV: ${envConfig.NODE_ENV || 'development'}`);
      console.log(`   📋 APP_ENV: ${envConfig.APP_ENV || 'dev'}`);
      console.log(`   📋 MEILI_API_KEY: ${envConfig.MEILI_API_KEY ? '已设置' : '未设置'}`);
      console.log(`   📋 MEILI_DEV_BASE: ${envConfig.MEILI_DEV_BASE || 'http://127.0.0.1:7775'}`);
    } else {
      console.log("   ❌ env.config.js 格式不正确，未找到 module.exports");
    }
  } else {
    console.log("   ⚠️  env.config.js 不存在，使用默认配置");
  }
} catch (err) {
  console.log("   ❌ 环境配置加载失败:", err.message);
  console.log("   💡 提示: 请检查 env.config.js 文件语法");
}

// 2. 设置环境变量
console.log("\n2. 设置环境变量...");
const env = {
  ...process.env,
  NODE_ENV: envConfig.NODE_ENV || 'development',
  APP_ENV: envConfig.APP_ENV || 'dev',
  MEILI_API_KEY: envConfig.MEILI_API_KEY || 'qaz0913cde350odxs',
  MEILI_DEV_BASE: envConfig.MEILI_DEV_BASE || 'http://127.0.0.1:7775',
  MEILI_DOCKER_BASE: envConfig.MEILI_DOCKER_BASE || 'http://meilisearch:7775',
  MEILI_INDEX_NAME: envConfig.MEILI_INDEX_NAME || 'chunks',
  NEXT_PUBLIC_APP_URL: envConfig.NEXT_PUBLIC_APP_URL || 'http://localhost:3335'
};

console.log("   ✅ 环境变量设置完成");

// 3. 检查端口占用
console.log("\n3. 检查端口占用...");
const { exec } = require('child_process');

function checkPort(port) {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (stdout) {
        console.log(`   ⚠️  端口 ${port} 已被占用`);
        resolve(true);
      } else {
        console.log(`   ✅ 端口 ${port} 可用`);
        resolve(false);
      }
    });
  });
}

// 4. 检查关键文件
console.log("\n4. 检查关键文件...");
const criticalFiles = [
  'app/api/files/upload/route.ts',
  'app/server-lib/meili.setup.ts',
  'app/server-lib/meili.config.ts',
  'package.json'
];

criticalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// 5. 检查 Meilisearch 二进制文件
console.log("\n5. 检查 Meilisearch 二进制文件...");
const meiliBinary = path.join(process.cwd(), 'meilisearch', 'meilisearch.exe');
if (fs.existsSync(meiliBinary)) {
  const stats = fs.statSync(meiliBinary);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`   ✅ meilisearch.exe 存在 (${fileSizeMB}MB)`);
} else {
  console.log("   ❌ meilisearch.exe 不存在");
  console.log("   💡 提示: 请确保 Meilisearch 已正确安装");
}

// 6. 检查 Meilisearch 健康状态
function checkMeiliHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 7775,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

// 7. 启动 Meilisearch（如果需要）
async function startMeilisearch() {
  console.log("\n6. 启动 Meilisearch 服务:");
  
  if (!fs.existsSync(meiliBinary)) {
    console.log("   ❌ meilisearch.exe 不存在，跳过启动");
    return false;
  }
  
  console.log("   🚀 正在启动 Meilisearch...");
  
  return new Promise((resolve) => {
    const meiliProcess = spawn(meiliBinary, [
      '--http-addr', '127.0.0.1:7775',
      '--master-key', 'qaz0913cde350odxs',
      '--env', 'development'
    ], {
      stdio: 'pipe',
      shell: true,
      cwd: process.cwd()
    });

    meiliProcess.stdout.on('data', (data) => {
      process.stdout.write('[Meili] ' + data.toString());
    });

    meiliProcess.stderr.on('data', (data) => {
      process.stderr.write('[Meili] ' + data.toString());
    });

    meiliProcess.on('error', (error) => {
      console.error('   ❌ Meilisearch 启动失败:', error.message);
      resolve(false);
    });

    // 等待 Meilisearch 就绪
    setTimeout(() => {
      checkMeiliHealth().then(() => {
        console.log("   ✅ Meilisearch 已就绪");
        resolve(true);
      }).catch(() => {
        console.log("   ⏳ 继续等待 Meilisearch 启动...");
        // 继续等待
        setTimeout(() => {
          checkMeiliHealth().then(() => {
            console.log("   ✅ Meilisearch 已就绪");
            resolve(true);
          }).catch(() => {
            console.log("   ⚠️  Meilisearch 启动超时，继续启动开发环境");
            resolve(false);
          });
        }, 5000);
      });
    }, 3000);
  });
}

// 8. 启动开发环境
async function startDev() {
  console.log("\n7. 启动开发环境:");
  console.log("   🚀 启动 npm run dev...");
  
  return new Promise((resolve) => {
    const devProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
      env: env
    });

    devProcess.on('error', (error) => {
      console.error('   ❌ 开发环境启动失败:', error.message);
      resolve(false);
    });

    devProcess.on('close', (code) => {
      console.log(`   📡 开发环境退出，退出码: ${code}`);
      resolve(true);
    });

    // 处理进程退出信号
    const cleanup = () => {
      console.log('\n   🛑 正在关闭开发环境...');
      devProcess.kill('SIGINT');
      setTimeout(() => {
        devProcess.kill('SIGTERM');
        process.exit(0);
      }, 5000);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  });
}

// 主函数
async function main() {
  try {
    // 检查端口
    const port3335InUse = await checkPort(3335);
    const port7775InUse = await checkPort(7775);
    
    // 如果端口 3335 被占用，清理它
    if (port3335InUse) {
      console.log("   🧹 清理端口 3335...");
      exec('powershell -Command "Get-NetTCPConnection -LocalPort 3335 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', (err) => {
        if (err) {
          console.log("   ❌ 端口清理失败:", err.message);
        } else {
          console.log("   ✅ 端口 3335 清理完成");
        }
      });
    }
    
    // 启动 Meilisearch（如果端口未被占用）
    if (!port7775InUse) {
      const meiliReady = await startMeilisearch();
      if (!meiliReady) {
        console.log("   ⚠️  Meilisearch 启动失败，但继续启动开发环境");
      }
    } else {
      console.log("   ⚠️  Meilisearch 端口已被占用，跳过启动");
      // 检查现有服务是否健康
      try {
        await checkMeiliHealth();
        console.log("   ✅ 现有 Meilisearch 服务健康");
      } catch (err) {
        console.log("   ⚠️  现有 Meilisearch 服务可能不健康，但继续启动开发环境");
      }
    }
    
    // 启动开发环境
    await startDev();
    
  } catch (error) {
    console.error("启动失败:", error.message);
    process.exit(1);
  }
}

// 运行主函数
main();

console.log("\n=== 启动准备完成 ===");
console.log("正在启动服务，请稍候...");
console.log("按 Ctrl+C 停止服务器");
console.log("\n📝 提示:");
console.log("- 首次启动可能需要较长时间");
console.log("- Meilisearch 服务会优先启动并等待就绪");
console.log("- 如果遇到端口冲突，脚本会自动清理");
console.log("- 查看控制台输出了解详细启动信息"); 