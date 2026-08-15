const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // File operations
  getCliFile: () => ipcRenderer.invoke('app:get-cli-file'),
  openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  saveFile: (data) => ipcRenderer.invoke('file:save', data),
  saveFileAs: (data) => ipcRenderer.invoke('file:save-as', data),
  exportPDF: (data) => ipcRenderer.invoke('file:export-pdf', data),
  exportHTML: (data) => ipcRenderer.invoke('file:export-html', data),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  onFileExternallyChanged: (callback) => {
    ipcRenderer.on('file:externally-changed', (event, filePath) => callback(filePath));
  }
});
