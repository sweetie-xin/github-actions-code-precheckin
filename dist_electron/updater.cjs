const { app, dialog, BrowserWindow } = require('electron');
const axios = require('axios');
const os = require('os');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let updateWin = null;
const UPDATE_SERVER_URL = 'https://deepseekmine.com/omni/api';

// 获取当前平台 + 架构
function getPlatformArch() {
  const platform = process.platform === 'win32' ? 'windows'
                  : process.platform === 'darwin' ? 'mac' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  return { platform, arch };
}

// 创建进度窗口
function createUpdateWindow() {
  updateWin = new BrowserWindow({
    width: 400,
    height: 200,
    resizable: false,
    title: '下载更新中...',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  updateWin.loadFile(path.join(__dirname, 'update.html'));
}

// 下载更新后处理事件
function bindAutoUpdaterEvents() {
  autoUpdater.on('download-progress', (progress) => {
    updateWin?.webContents.send('update-progress', {
      percent: progress.percent.toFixed(1),
      transferred: (progress.transferred / 1024 / 1024).toFixed(2),
      total: (progress.total / 1024 / 1024).toFixed(2),
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      message: '更新已下载，是否立即安装？',
      buttons: ['重启安装', '稍后']
    }).then(res => {
      if (res.response === 0) {
        autoUpdater.quitAndInstall();
      } else {
        app.once('ready', () => {
            autoUpdater.quitAndInstall();
        })
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('❌ 自动更新失败:', err);
  });
}

// 主流程
async function checkCustomUpdate() {
  const { platform, arch } = getPlatformArch();
  const version = app.getVersion();

  console.log(`🚀 [Updater] 当前版本: ${version}`);
  console.log(`🌐 [Updater] 请求接口: ${UPDATE_SERVER_URL}/update/check`);
  console.log(`📦 [Updater] 参数: version=${version}, platform=${platform}, arch=${arch}`);

  try {
    console.log(`🚀 正在检查更新...`);
    console.log(`请求更新地址${UPDATE_SERVER_URL}/update/check`)
    const res = await axios.get(`${UPDATE_SERVER_URL}/update/check`, {
      params: { version, platform, arch }
    });
    console.log('[Updater] 接口响应:', res.data);
    if (res.data.update) {
      console.log(`[Updater] 检测到新版本: ${res.data.version}`);
      const answer = await dialog.showMessageBox({
        type: 'info',
        title: '发现新版本',
        message: `新版本 ${res.data.version} 可用\n\n更新说明：\n${res.data.notes}`,
        buttons: ['立即更新', '取消']
      });

      if (answer.response === 0) {
          console.log('[Updater] 用户选择立即更新');
          createUpdateWindow();

          const feedUrl = `${UPDATE_SERVER_URL}/downloads/${platform}`;
          console.log(`[Updater] 设置更新源 Feed URL: ${feedUrl}`);
          autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl });
          autoUpdater.checkForUpdates();

          // 发送新版本号给渲染进程，更新主界面显示
          if (updateWin) {
            updateWin.webContents.once('did-finish-load', () => {
              updateWin.webContents.send('update-version', res.data.version);
            });
          }
        } else{
          console.log('[Updater] 用户取消了更新');
        }
    } else {
      console.log('[Updater] 当前已是最新版本，无需更新');
    }
  } catch (err) {
    console.error('⚠️ 无法检测更新:', err.message);
  }
}

module.exports = {
  checkCustomUpdate,
  bindAutoUpdaterEvents
};
