const { app, BrowserWindow, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

const nextPort = 3335;
const meiliPort = 7775;
let nextProcess = null;
let meiliProcess = null;
let isShuttingDown = false;

// 日志写入函数，避免递归调用console.error
function logToFile(message, level = 'INFO') {
  const logDir = path.join(os.homedir(), 'DeepSeekMine', 'Logs');
  const logFile = path.join(logDir, 'main.log');
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}\n`;
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logFile, line);
  } catch (err) {
    process.stderr.write(`[LogWriteError] ${err}\n`);
  }
}

// 重写console输出，日志也写文件
console.log = (...args) => logToFile(args.map(String).join(' '), 'INFO');
console.error = (...args) => logToFile(args.map(String).join(' '), 'ERROR');

function getMeiliBinary() {
  const bin = path.join(process.resourcesPath, 'app', 'meilisearch', process.platform === 'win32' ? 'meilisearch.exe' : 'meilisearch');
  if (!fs.existsSync(bin)) {
    const msg = 'Meilisearch 可执行文件未找到';
    console.error(msg);
    throw new Error(msg);
  }
  console.log('使用 Meilisearch 二进制:', bin);
  return bin;
}

function getNextBinary() {
  return path.join(process.resourcesPath, 'app', 'node_modules', 'next', 'dist', 'bin', 'next');
}

function getNodeBinary() {
  const nodeFolder = process.platform === 'win32' ? 'node-windows' : 'node-mac';
  const nodeFile = process.platform === 'win32' ? 'node.exe' : 'node';
  return path.join(process.resourcesPath, 'app', nodeFolder, nodeFile);
}

function createWindow() {
  let win = new BrowserWindow({
    width: 1130,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const url = `http://localhost:${nextPort}`;
  console.log(`加载窗口，地址: ${url}`);
  win.loadURL(url);

  win.webContents.on('did-fail-load', (_, code, desc) => {
    console.error('页面加载失败:', code, desc);
  });

  win.on('closed', () => {
    console.log('窗口已关闭');
    win = null;
  });
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = http.createServer()
      .once('error', (err) => resolve(err.code === 'EADDRINUSE'))
      .once('listening', () => server.close(() => resolve(false)))
      .listen(port);
  });
}

function waitForNextServer(timeout = 30000, interval = 500) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = `http://127.0.0.1:${nextPort}`;
    console.log(`[DEBUG] 等待 Next.js 启动: ${url}`);

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;

      http.get(url, (res) => {
        const { statusCode } = res;
        const isReady = statusCode && statusCode >= 200 && statusCode < 500;
        if (isReady) {
          clearInterval(timer);
          console.log(`[DEBUG] Next.js 响应 ${statusCode}，已准备就绪`);
          resolve();
        }
      }).on('error', (err) => {
        if (elapsed > timeout) {
          clearInterval(timer);
          console.error(`[ERROR] Next.js 启动超时 (${timeout}ms): ${err.message}`);
          reject(new Error('等待 Next.js 启动超时'));
        } else {
          console.log(`[DEBUG] Next.js 尚未就绪 (${elapsed}ms): ${err.message}`);
        }
      });
    }, interval);
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const nextBin = getNextBinary();
    const nodeBin = getNodeBinary();
    const appDir = path.join(process.resourcesPath, 'app');

    console.log(`启动 Next.js，命令: ${nodeBin} ${nextBin} start -p ${nextPort}`);

    nextProcess = spawn(nodeBin, [nextBin, 'start', '-p', `${nextPort}`], {
      cwd: appDir,
      env: process.env,
      stdio: 'pipe'
    });

    nextProcess.stdout.on('data', (data) => console.log(`[Next stdout] ${data.toString().trim()}`));
    nextProcess.stderr.on('data', (data) => console.error(`[Next stderr] ${data.toString().trim()}`));
    nextProcess.on('exit', (code) => console.log(`Next.js 退出，代码: ${code}`));
    nextProcess.on('close', (code) => console.log(`Next.js 进程关闭，代码: ${code}`));

    waitForNextServer().then(resolve).catch(reject);
  });
}

async function startAllServices() {
  console.log('准备启动所有服务...');
  const meiliBinary = getMeiliBinary();
  const meiliDataDir = path.join(os.homedir(), 'DeepSeekMine', 'meilidata');
  fs.mkdirSync(meiliDataDir, { recursive: true });

  const meiliInUse = await isPortInUse(meiliPort);
  if (!meiliInUse) {
    console.log('端口未占用，启动 Meilisearch 服务...');
    try {
      meiliProcess = spawn(meiliBinary, [
        '--master-key', 'qaz0913cde350odxs',
        '--http-addr', `127.0.0.1:${meiliPort}`,
        '--db-path', meiliDataDir,
      ], {
        cwd: meiliDataDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      meiliProcess.stdout.on('data', (data) => {
        console.log('[Meili stdout]', data.toString().trim());
      });

      meiliProcess.stderr.on('data', (data) => {
        console.error('[Meili stderr]', data.toString().trim());
      });

      meiliProcess.on('exit', (code) => {
        console.error(`[Meili] 进程退出，退出码: ${code}`);
      });
      meiliProcess.on('close', (code) => {
        console.log(`[Meili] 进程关闭，退出码: ${code}`);
      });
    } catch (e) {
      console.error('Meilisearch 启动失败:', e);
    }
  } else {
    console.log(`端口 ${meiliPort} 已被占用，跳过 Meilisearch 启动`);
  }

  const nextInUse = await isPortInUse(nextPort);
  if (nextInUse) {
    console.log(`端口 ${nextPort} 已被占用，跳过 Next.js 启动`);
    try {
      await waitForNextServer();
      createWindow();
    } catch (err) {
      console.error('检测 Next.js 服务失败:', err);
      createWindow(); // 保证窗口总是加载
    }
  } else {
    try {
      await startNextServer();
      console.log('Next.js 已启动');
      createWindow();
    } catch (err) {
      console.error('Next.js 启动失败:', err);
      createWindow(); // 启动失败仍加载窗口
    }
  }
}

function gracefulShutdown() {
  if (isShuttingDown) {
    console.log('已进入关闭流程，忽略重复调用');
    return;
  }
  isShuttingDown = true;

  console.log('正在优雅关闭应用...');

  if (nextProcess) {
    try {
      nextProcess.kill();
      console.log('Next.js 已终止');
    } catch (e) {
      console.error('关闭 Next.js 失败:', e);
    }
  }

  if (meiliProcess) {
    try {
      meiliProcess.kill();
      console.log('Meilisearch 已终止');
    } catch (e) {
      console.error('关闭 Meilisearch 失败:', e);
    }
  }

  setTimeout(() => {
    console.warn('强制退出应用');
    process.exit(0);
  }, 3000);

  app.quit();
}

const { checkCustomUpdate, bindAutoUpdaterEvents } = require('./updater.cjs');

async function initializeApp() {
  Menu.setApplicationMenu(null);

  bindAutoUpdaterEvents();

  try {
    console.log('开始检查自动更新...');
    await checkCustomUpdate();
    console.log('自动更新检查完成');
  } catch (err) {
    console.error('更新检测失败（不阻塞启动）:', err);
  }

  await startAllServices();

  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

// 捕获未处理异常，防止程序崩溃无日志
process.on('uncaughtException', (err) => {
  console.error('未捕获异常:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('未处理的Promise拒绝:', reason);
});

app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  gracefulShutdown();
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号');
  gracefulShutdown();
});

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号');
  gracefulShutdown();
});
