import { contextBridge, ipcRenderer } from "electron";

// 🔥 КРИТИЧНО: Этот лог должен появиться в консоли Electron
console.log("✅ PRELOAD SCRIPT LOADED - contracts API will be available");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  version: process.versions.electron,
  openExternalUrl: (url: string) => ipcRenderer.invoke("open-external-url", url),
  onUpdateReady: (callback: (data: { version: string, notes: string }) => void) => {
    ipcRenderer.on('update-ready', (_event, data) => callback(data));
  },
  installUpdate: () => ipcRenderer.send('install-update')
});

// API для работы с Excel-договорами
contextBridge.exposeInMainWorld("contracts", {
  checkExists: (filename: string): Promise<string | null> =>
    ipcRenderer.invoke("contract-exists", filename),

  saveExcel: (buffer: ArrayBuffer, filename: string): Promise<string> =>
    ipcRenderer.invoke("save-contract-excel", { buffer, filename }),

  openExcel: (filePath: string): Promise<void> =>
    ipcRenderer.invoke("open-contract-excel", filePath),

  generateOffline: (contractData: any, filename: string): Promise<string> =>
    ipcRenderer.invoke("generate-offline-excel", { contractData, filename }),
});

// Добавляем возможность логирования из фронтенда
contextBridge.exposeInMainWorld("electronLog", {
  info: (msg: string) => ipcRenderer.send("log-to-file", "info", msg),
  error: (msg: string) => ipcRenderer.send("log-to-file", "error", msg),
  warn: (msg: string) => ipcRenderer.send("log-to-file", "warn", msg)
});

console.log("✅ contracts API exposed to window.contracts");

