// electron.main.dev.cjs
// const { app, BrowserWindow, Menu } = require('electron');

const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron'); // myy0811修改
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

const PRELOAD_PATH = path.join(__dirname, 'preload.cjs'); // myy0811修改

const nextPort = 3335;
const meiliPort = 7775;
let nextProcess = null;
let meiliProcess = null;
let isShuttingDown = false;

// ===== 固定 PROJECT_ROOT 为 DeepSeekMine 根目录（dist_electron 上一级）=====
const PROJECT_ROOT = path.resolve(__dirname, '..');
if (!fs.existsSync(path.join(PROJECT_ROOT, 'package.json'))) {
  console.warn(`[WARN] PROJECT_ROOT 未检测到 package.json: ${PROJECT_ROOT}`);
}

// ===== Meilisearch / Next 路径 =====
function getMeiliBinary() {
  const envBin = process.env.MEILI_BIN && process.env.MEILI_BIN.trim();
  const isWin = process.platform === 'win32';
  const exe = isWin ? 'meilisearch.exe' : 'meilisearch';
  const candidates = [
    envBin,
    path.join(PROJECT_ROOT, 'meilisearch', exe),
    path.join(PROJECT_ROOT, 'bin', exe),
  ].filter(Boolean);

  const found = candidates.find((p) => {
    try { return p && fs.existsSync(p); } catch { return false; }
  });

  if (!found) {
    const msg =
      `Meilisearch 可执行文件未找到。已尝试：\n` +
      candidates.map((c) => `  - ${c}`).join('\n') +
      `\n可通过设置环境变量 MEILI_BIN 指定可执行文件路径。`;
    throw new Error(msg);
  }
  console.log('使用 Meilisearch 二进制:', found);
  return found;
}

function getNextBinary() {
  const nextBin = path.join(PROJECT_ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
  if (!fs.existsSync(nextBin)) {
    throw new Error(
      `未找到 Next.js 可执行文件：${nextBin}\n请先在工程目录执行：npm i / pnpm i / yarn。`
    );
  }
  return nextBin;
}

function getNodeBinary() {
  return process.execPath; // 直接使用当前 Node
}

// ===== 窗口 =====
function createWindow() {
  const win = new BrowserWindow({
    width: 1130,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: PRELOAD_PATH, // myy0811修改：通过 preload 向渲染端暴露 API
    },
  });

  const url = `http://127.0.0.1:${nextPort}`;
  console.log(`加载 ${url}`);
  win.loadURL(url);

  win.webContents.openDevTools({ mode: 'detach' });

  win.webContents.on('did-fail-load', (_, code, desc) => {
    console.error('页面加载失败:', code, desc);
  });
}

// ===== 端口与探测 =====
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = http
      .createServer()
      .once('error', (err) => resolve(err.code === 'EADDRINUSE'))
      .once('listening', () => server.close(() => resolve(false)))
      .listen(port, '127.0.0.1');
  });
}

function waitForNextServer(timeout = 30000, interval = 500) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = `http://127.0.0.1:${nextPort}`;
    console.log(`[DEBUG] 等待 Next.js 启动: ${url}`);

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const req = http.get(url, (res) => {
        const { statusCode } = res;
        const isReady = statusCode && statusCode >= 200 && statusCode < 500;
        res.resume?.();
        if (isReady) {
          clearInterval(timer);
          console.log(`[DEBUG] Next.js 响应 ${statusCode}，已准备就绪`);
          resolve();
        }
      });

      req.on('error', (err) => {
        if (elapsed > timeout) {
          clearInterval(timer);
          console.error(`[ERROR] Next.js 启动超时 (${timeout}ms): ${err.message}`);
          reject(new Error('等待 Next.js 启动超时'));
        } else {
          console.log(`[DEBUG] Next.js 尚未就绪 (${elapsed}ms): ${err.message}`);
        }
      });

      req.setTimeout(2000, () => {
        req.destroy(new Error('请求超时'));
      });
    }, interval);
  });
}

// ===== 启动 Next（开发：dev 模式）=====
function startNextServerDev() {
  return new Promise((resolve, reject) => {
    const nextBin = getNextBinary();
    const nodeBin = getNodeBinary();

    console.log(`Next.js 开发模式启动命令: ${nodeBin} ${nextBin} dev -p ${nextPort}`);

    nextProcess = spawn(nodeBin, [nextBin, 'dev', '-p', `${nextPort}`], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: 'pipe',
    });

    nextProcess.stdout.on('data', (d) => process.stdout.write(`[Next stdout] ${d.toString()}`));
    nextProcess.stderr.on('data', (d) => process.stderr.write(`[Next stderr] ${d.toString()}`));
    nextProcess.on('exit', (code) => console.log(`Next.js 退出，代码: ${code}`));

    waitForNextServer().then(resolve).catch(reject);
  });
}

// ===== 启动所有服务 =====
async function startAllServices() {
  // Meilisearch
  const meiliDataDir = path.join(os.homedir(), 'DeepSeekMine', 'meilidata');
  fs.mkdirSync(meiliDataDir, { recursive: true });

  const meiliInUse = await isPortInUse(meiliPort);
  if (!meiliInUse) {
    console.log('正在异步启动 Meilisearch...');
    try {
      const meiliBinary = getMeiliBinary();
      meiliProcess = spawn(
        meiliBinary,
        [
          '--master-key', 'qaz0913cde350odxs',
          '--http-addr', `127.0.0.1:${meiliPort}`,
          '--db-path', meiliDataDir,
        ],
        { cwd: meiliDataDir, stdio: ['ignore', 'pipe', 'pipe'] }
      );

      meiliProcess.stdout.on('data', (data) => {
        process.stdout.write('[Meili stdout] ' + data.toString());
      });
      meiliProcess.stderr.on('data', (data) => {
        process.stderr.write('[Meili stderr] ' + data.toString());
      });
      meiliProcess.on('exit', (code) => {
        console.error(`[Meili] 进程退出，退出码: ${code}`);
      });
    } catch (e) {
      console.error('Meilisearch 启动失败:', e);
    }
  } else {
    console.log(`端口 ${meiliPort} 已被占用，跳过 Meilisearch 启动`);
  }

  // Next.js（dev）
  const nextInUse = await isPortInUse(nextPort);
  if (nextInUse) {
    console.log(`端口 ${nextPort} 已被占用，跳过 Next.js 启动`);
    await waitForNextServer()
      .then(() => createWindow())
      .catch((err) => {
        console.error('检测 Next.js 服务失败:', err);
        createWindow(); // 兜底加载窗口
      });
  } else {
    startNextServerDev()
      .then(() => {
        console.log('Next.js 已启动（开发模式）');
        createWindow();
      })
      .catch((err) => {
        console.error('Next.js 启动失败:', err);
        createWindow();
      });
  }
}

// ===== 优雅关闭 =====
function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('正在优雅关闭应用...');

  if (nextProcess) {
    try { nextProcess.kill(); console.log('Next.js 已终止'); }
    catch (e) { console.error('关闭 Next.js 失败:', e); }
  }

  if (meiliProcess) {
    try { meiliProcess.kill(); console.log('Meilisearch 已终止'); }
    catch (e) { console.error('关闭 Meilisearch 失败:', e); }
  }

  app.quit();
}

// ===== Electron 生命周期 =====
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  startAllServices();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 主进程监听渲染端请求，使用系统默认浏览器打开外链 // myy0811修改
ipcMain.on('open-external', (_evt, url) => { // myy0811修改   
  if (typeof url === 'string' && /^https?:\/\//.test(url)) { // 简单校验 // myy0811修改
    shell.openExternal(url); // myy0811修改
  }
}); // myy0811修改

app.on('window-all-closed', () => {
  gracefulShutdown();
});

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
