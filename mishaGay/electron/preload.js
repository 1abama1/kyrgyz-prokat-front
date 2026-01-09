const { contextBridge, ipcRenderer } = require("electron");

// 🔥 КРИТИЧНО: Этот лог должен появиться в консоли Electron
console.log("✅ PRELOAD SCRIPT LOADED - contracts API will be available");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  version: process.versions.electron
});

// API для работы с Excel-договорами
contextBridge.exposeInMainWorld("contracts", {
  checkExists: (filename) =>
    ipcRenderer.invoke("contract-exists", filename),
  
  saveExcel: (buffer, filename) =>
    ipcRenderer.invoke("save-contract-excel", { buffer, filename }),
  
  openExcel: (filePath) =>
    ipcRenderer.invoke("open-contract-excel", filePath)
});

console.log("✅ contracts API exposed to window.contracts");
