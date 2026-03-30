const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onMenuOpenFile: (callback) => ipcRenderer.on('menu-open-file', callback)
});
