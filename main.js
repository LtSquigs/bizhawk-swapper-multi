const { app, BrowserWindow, ipcMain, session } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  })

  win.loadFile('app/index.html');

  session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    win.webContents.send('twitch-login', details.url);
    callback({
      cancel: true
    })
  })
}

app.whenReady().then(() => {
  createWindow();
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
});

const filter = {
  urls: ['http://localhost/bizhawk-multi-swapper*']
}
