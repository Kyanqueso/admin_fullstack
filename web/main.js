const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
const isDev = process.env.NODE_ENV === 'development';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Replace with your actual Supabase project URL
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dohhnithtdwtwkfwccag.supabase.co';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/views/auth/index.html');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'src/views/auth/index.html'));
  }
}

// ========== GOOGLE OAUTH POPUP ==========
ipcMain.handle('google-oauth', async () => {
  return new Promise((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Clear session cookies to force fresh login (allows account switching)
    authWindow.webContents.session.clearStorageData({
      storages: ['cookies']
    }).then(() => {
      console.log('Cleared auth cookies - forcing fresh Google login');
    });

    // Build the Google OAuth URL through Supabase
    // Add prompt=select_account to force Google to show account picker
    const redirectTo = `${SUPABASE_URL}/auth/v1/callback`;
    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&prompt=select_account`;

    authWindow.loadURL(authUrl);

    // Listen for redirects to catch the callback with tokens
    authWindow.webContents.on('will-redirect', (event, url) => {
      handleCallback(url, authWindow, resolve);
    });

    authWindow.webContents.on('will-navigate', (event, url) => {
      handleCallback(url, authWindow, resolve);
    });

    authWindow.on('closed', () => {
      resolve(null); // User closed the window without completing
    });
  });
});

function handleCallback(url, authWindow, resolve) {
  try {
    // Check if this is the callback URL with tokens
    if (url.includes('access_token') || url.includes('#access_token')) {
      // Extract tokens from the URL hash fragment
      const urlObj = new URL(url);
      const hash = urlObj.hash.substring(1); // Remove the #
      const params = new URLSearchParams(hash);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken) {
        authWindow.close();
        resolve({ access_token: accessToken, refresh_token: refreshToken });
        return;
      }
    }
  } catch (err) {
    console.error('Error parsing OAuth callback:', err);
  }
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