import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.bundle.js') // Specify the preload script
    }
  });
  // mainWindow.webContents.openDevTools();

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html')); // Adjusted path here

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ipcMain.on('keydown', (event, key) => {
//   mainWindow?.webContents.send('keydown', key);
// });

ipcMain.on('open-dev-tools', () => {
  mainWindow?.webContents.openDevTools();
});