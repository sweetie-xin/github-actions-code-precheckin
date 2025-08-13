// preload.cjs
// 通过 contextBridge 暴露一个安全的 API 给渲染端
// myy0811修改
const { contextBridge, ipcRenderer } = require('electron'); // myy0811修改

contextBridge.exposeInMainWorld('electronAPI', { // myy0811修改
    openExternal: (url) => ipcRenderer.send('open-external', url), // myy0811修改
}); // myy0811修改
