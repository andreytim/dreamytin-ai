const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

let backendProcess = null;

function startBackendServer() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  let backendPath;
  if (isDev) {
    backendPath = path.join(__dirname, '../backend/server.js');
  } else {
    backendPath = path.join(process.resourcesPath, 'backend', 'server.js');
  }
  
  backendProcess = spawn('node', [backendPath], {
    stdio: 'inherit',
    cwd: path.dirname(backendPath),
    env: { ...process.env }
  });
  
  backendProcess.on('error', (err) => {
    console.error('Backend server failed to start:', err);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load Vite dev server in development, built files in production
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile('dist/renderer/index.html');
  }
}

app.whenReady().then(() => {
  startBackendServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});