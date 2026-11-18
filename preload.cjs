const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('AshDesktop', {
  quit: () => ipcRenderer.send('game:quit'),
  fullscreen: () => ipcRenderer.send('fullscreen'),
  storage: {
    getItem: (key) => ipcRenderer.sendSync('save:read', key),
    setItem: (key, value) => {
      if (!ipcRenderer.sendSync('save:write', key, value)) throw new Error('写入存档失败');
    },
  },
});
