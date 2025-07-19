const { app, BrowserWindow, screen } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

// Load .env from multiple possible locations
const dotenv = require('dotenv');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

if (isDev) {
  dotenv.config();
} else {
  // In production, try to load .env from the app's directory
  const envPath = path.join(process.resourcesPath, '.env');
  dotenv.config({ path: envPath });
}

let backendProcess = null;

function killBackendProcess() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    // Only kill backend process on startup
    exec('lsof -ti:3001 | xargs kill -9', (error) => {
      // Ignore errors - port might not be in use
      setTimeout(resolve, 500);
    });
  });
}

function killAllProcesses() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    // Kill both backend and frontend processes on quit
    const ports = [3001, 5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
    const commands = ports.map(port => `lsof -ti:${port} | xargs kill -9`).join(' ; ');
    
    exec(commands, (error) => {
      setTimeout(resolve, 500);
    });
  });
}

async function startBackendServer() {
  // Kill any existing backend processes first
  await killBackendProcess();
  
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
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  const win = new BrowserWindow({
    width: width,
    height: height,
    show: false,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.maximize();
  win.show();

  // Load Vite dev server in development, built files in production
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  await startBackendServer();
  createWindow();
});

app.on('window-all-closed', async () => {
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
  }
  await killAllProcesses();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
  }
  await killAllProcesses();
});

app.on('will-quit', async (event) => {
  if (backendProcess && !backendProcess.killed) {
    event.preventDefault();
    backendProcess.kill('SIGTERM');
    setTimeout(async () => {
      if (!backendProcess.killed) {
        backendProcess.kill('SIGKILL');
      }
      await killAllProcesses();
      app.quit();
    }, 2000);
  } else {
    await killAllProcesses();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});