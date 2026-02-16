// web/preload.js
// Bridge between Node.js and Frontend
window.addEventListener('DOMContentLoaded', () => {
    console.log('Electron loaded');
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('env', {
    BACKEND_URL: "http://localhost:8000" // Hardcode for now to verify it works
});

contextBridge.exposeInMainWorld('electronAPI', {
  googleOAuth: () => ipcRenderer.invoke('google-oauth'),
});