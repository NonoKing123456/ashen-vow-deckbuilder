'use strict';
const { app, BrowserWindow, Menu, ipcMain, protocol, net, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

app.setName('Ashen Vow');
app.setAppUserModelId('AshenVow.Game');
const profileOverride = app.commandLine.getSwitchValue('user-data-dir');
if (!profileOverride) app.setPath('userData', path.join(app.getPath('appData'), 'AshenVow'));
protocol.registerSchemesAsPrivileged([
  { scheme: 'ashen', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);
let window;
const startUrl = 'ashen://game/index.html';
const saveNames = {
  'ashenvow.expedition.v1': 'expedition.json',
  'ashenvow.expedition.v1.previous': 'previous.json',
  'ashenvow.chronicle.v1': 'chronicle.json',
};
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app.whenReady().then(async () => {
    protocol.handle('ashen', (request) => {
      const url = new URL(request.url);
      const relative = decodeURIComponent(url.pathname).slice(1);
      if (
        url.hostname !== 'game' ||
        !/^(index\.html|(?:assets|game)\/[\w./-]+)$/.test(relative) ||
        relative.split('/').includes('..')
      )
        return new Response('Missing asset', { status: 404 });
      return net.fetch(pathToFileURL(path.join(__dirname, relative)).href);
    });
    const dir = path.join(app.getPath('userData'), 'saves');
    function fileFor(event, key) {
      if (event.senderFrame?.url !== startUrl || !Object.hasOwn(saveNames, key))
        throw new Error('Unknown save slot');
      return path.join(dir, saveNames[key]);
    }
    ipcMain.on('save:read', (event, key) => {
      try {
        const file = fileFor(event, key);
        event.returnValue = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      } catch {
        event.returnValue = null;
      }
    });
    ipcMain.on('save:write', (event, key, data) => {
      try {
        const file = fileFor(event, key);
        if (typeof data !== 'string' || data.length > 1500000) throw new Error('Invalid save data');
        JSON.parse(data);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file + '.tmp', data, { encoding: 'utf8', flush: true });
        fs.renameSync(file + '.tmp', file);
        event.returnValue = true;
      } catch {
        event.returnValue = false;
      }
    });
    ipcMain.on('game:quit', (event) => {
      if (event.senderFrame?.url === startUrl) app.quit();
    });
    ipcMain.on('fullscreen', (event) => {
      if (event.senderFrame?.url === startUrl && window) window.setFullScreen(!window.isFullScreen());
    });
    Menu.setApplicationMenu(null);
    window = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 820,
      minHeight: 620,
      show: false,
      title: '灰烬誓约 · ASHEN VOW',
      icon: path.join(__dirname, 'assets/app.ico'),
      backgroundColor: '#191719',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => {
      if (url !== startUrl) event.preventDefault();
    });
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, respond) => respond(false));
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'F11') {
        event.preventDefault();
        window.setFullScreen(!window.isFullScreen());
      }
    });
    window.once('ready-to-show', () => window.show());
    await window.loadURL(startUrl);
  });
}
app.on('window-all-closed', () => app.quit());
