const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let apiProcess; // This variable will hold our Python process

require('dotenv').config({ path: path.join(__dirname, '../.env') });

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Preload script is critical for security/communication
      preload: path.join(__dirname, 'preload.js'),
      env: {
        BACKEND_URL: process.env.BACKEND_URL
      }, 
      nodeIntegration: false, // Keep this false for security
      contextIsolation: true  // Keep this true for security
    }
  });

  // Load your main HTML file
  mainWindow.loadFile(path.join(__dirname, 'src/views/auth/index.html'));
  
  // Optional: Open DevTools for debugging
  // mainWindow.webContents.openDevTools();
}

function startPythonBackend() {
    const apiPath = path.join(__dirname, '../api');
    
    // Wrap paths in double quotes to handle spaces in folder names
    const venvUvicorn = path.join(apiPath, 'venv', 'Scripts', 'uvicorn.exe');
    const quotedUvicorn = `"${venvUvicorn}"`;

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const port = backendUrl.split(':').pop();

    console.log(`Starting Python Backend from: ${quotedUvicorn}`);

    // Command: uvicorn app.main:app --port 8000 --reload
    apiProcess = spawn(quotedUvicorn, ['app.main:app', '--reload', '--port', port], {
        cwd: apiPath,
        shell: true,
        windowsVerbatimArguments: true // Crucial for keeping the quotes intact on Windows
    });

    apiProcess.stdout.on('data', (data) => {
        console.log(`API [STDOUT]: ${data}`);
    });

    apiProcess.stderr.on('data', (data) => {
        console.error(`API [STDERR]: ${data}`);
    });

    apiProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
    });
}

// --- APP LIFECYCLE ---

app.whenReady().then(() => {
  startPythonBackend(); // Start Python first
  createWindow();       // Then open the UI

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    if (apiProcess) {
        console.log("Terminating backend tree...");
        // Ensure to stop the family of processes
        if (process.platform === 'win32') {
            const { execSync } = require('child_process');
            try {
                // Use execSync to block the exit until the kill is confirmed
                execSync(`taskkill /pid ${apiProcess.pid} /f /t`);
            } catch (e) {
                console.error("Process already closed or access denied");
            }
        } else {
            apiProcess.kill();
        }
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});