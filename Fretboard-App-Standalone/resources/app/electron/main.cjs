const { app, BrowserWindow, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

function createWindow() {
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (!fs.existsSync(indexPath)) {
    dialog.showErrorBox('Fretboard App', 'No se encontro dist/index.html. Ejecuta la compilacion antes de abrir la aplicacion.');
    app.quit();
    return;
  }

  const window = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 960,
    minHeight: 700,
    backgroundColor: '#fdf6ec',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadFile(indexPath);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
