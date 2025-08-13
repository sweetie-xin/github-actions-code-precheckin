// Meilisearch 服务启动脚本
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("=== Meilisearch 服务启动 ===\n");

// 1. 检查 Meilisearch 二进制文件:
console.log("1. 检查 Meilisearch 二进制文件:");
const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

let meiliBinary = path.join(process.cwd(), 'meilisearch', isWin ? 'meilisearch.exe' : 'meilisearch');
let binaryDesc = isWin ? 'meilisearch.exe' : 'meilisearch';

if (fs.existsSync(meiliBinary)) {
  const stats = fs.statSync(meiliBinary);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`   ${binaryDesc} 存在 (${fileSizeMB}MB)`);
} else {
  console.log(`   ${binaryDesc} 不存在`);
  console.log(`   提示: 请确保 ${binaryDesc} 已正确安装并放在 meilisearch 目录下`);
  process.exit(1);
}

// 2. 检查端口占用
console.log("\n2. 检查端口占用:");
const port = 7775;

function checkAndKillPort(cb) {
  if (isWin) {
    exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
      if (stdout) {
        console.log(`   端口 ${port} 已被占用`);
        console.log("   端口信息:");
        console.log("   " + stdout.trim());
        // 提取 PID 并终止进程
        const lines = stdout.trim().split('\n');
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[4];
            console.log(`   终止进程 PID: ${pid}`);
            exec(`taskkill /PID ${pid} /F`, (err) => {
              if (err) {
                console.log(`   终止进程失败: ${err.message}`);
              } else {
                console.log(`   进程 ${pid} 已终止`);
              }
            });
          }
        });
        setTimeout(cb, 1000);
      } else {
        console.log(`   端口 ${port} 可用`);
        cb();
      }
    });
  } else {
    // Linux/Mac
    exec(`lsof -i :${port} -t`, (error, stdout, stderr) => {
      if (stdout) {
        const pids = stdout.trim().split('\n').filter(Boolean);
        if (pids.length > 0) {
          console.log(`   端口 ${port} 已被占用, 终止进程: ${pids.join(', ')}`);
          pids.forEach(pid => {
            exec(`kill -9 ${pid}`, (err) => {
              if (err) {
                console.log(`   终止进程失败: ${err.message}`);
              } else {
                console.log(`   进程 ${pid} 已终止`);
              }
            });
          });
          setTimeout(cb, 1000);
        } else {
          console.log(`   端口 ${port} 可用`);
          cb();
        }
      } else {
        console.log(`   端口 ${port} 可用`);
        cb();
      }
    });
  }
}

// 3. 启动 Meilisearch 服务
function startMeili() {
  console.log("\n3. 启动 Meilisearch 服务:");
  setTimeout(() => {
    console.log("   🚀 正在启动 Meilisearch...");
    const meiliProcess = spawn(meiliBinary, [
      '--http-addr', '127.0.0.1:7775',
      '--master-key', 'qaz0913cde350odxs',
      '--env', 'development'
    ], {
      stdio: 'inherit',
      shell: false,
      cwd: process.cwd()
    });

    meiliProcess.on('error', (error) => {
      console.error('   启动失败:', error.message);
    });

    meiliProcess.on('close', (code) => {
      if (code === 0) {
        console.log('   Meilisearch 服务正常退出');
      } else {
        console.log(`    Meilisearch 服务退出，退出码: ${code}`);
      }
    });

    // 处理进程退出信号
    const cleanup = () => {
      console.log('\n   正在关闭 Meilisearch 服务...');
      meiliProcess.kill('SIGINT');
      setTimeout(() => {
        meiliProcess.kill('SIGTERM');
        process.exit(0);
      }, 5000);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // 监听子进程错误
    meiliProcess.on('exit', (code, signal) => {
      if (signal) {
        console.log(`   进程被信号 ${signal} 终止`);
      }
    });
  }, 2000);
}

checkAndKillPort(startMeili);

console.log("\n=== 启动准备完成 ===");
console.log("Meilisearch 服务将在 2 秒后启动...");
console.log("按 Ctrl+C 停止服务");
console.log("\n📝 提示:");
console.log("- 服务启动后将在 http://127.0.0.1:7775 监听");
console.log("- API 密钥: qaz0913cde350odxs");
console.log("- 查看控制台输出了解详细启动信息"); 