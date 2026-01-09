import { contextBridge, ipcRenderer } from "electron";

// 🔥 КРИТИЧНО: Этот лог должен появиться в консоли Electron
console.log("✅ PRELOAD SCRIPT LOADED - contracts API will be available");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  version: process.versions.electron
});

// API для работы с Excel-договорами
contextBridge.exposeInMainWorld("contracts", {
  checkExists: (filename: string): Promise<string | null> =>
    ipcRenderer.invoke("contract-exists", filename),
  
  saveExcel: (buffer: ArrayBuffer, filename: string): Promise<string> =>
    ipcRenderer.invoke("save-contract-excel", { buffer, filename }),
  
  openExcel: (filePath: string): Promise<void> =>
    ipcRenderer.invoke("open-contract-excel", filePath)
});

console.log("✅ contracts API exposed to window.contracts");

