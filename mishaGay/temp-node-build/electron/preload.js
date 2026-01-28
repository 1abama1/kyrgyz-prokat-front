import { contextBridge, ipcRenderer } from "electron";
// 🔥 КРИТИЧНО: Этот лог должен появиться в консоли Electron
console.log("✅ PRELOAD SCRIPT LOADED - contracts API will be available");
contextBridge.exposeInMainWorld("electronAPI", {
    platform: process.platform,
    version: process.versions.electron
});
// API для работы с Excel-договорами
contextBridge.exposeInMainWorld("contracts", {
    checkExists: (filename) => ipcRenderer.invoke("contract-exists", filename),
    saveExcel: (buffer, filename) => ipcRenderer.invoke("save-contract-excel", { buffer, filename }),
    openExcel: (filePath) => ipcRenderer.invoke("open-contract-excel", filePath)
});
// Добавляем возможность логирования из фронтенда
contextBridge.exposeInMainWorld("electronLog", {
    info: (msg) => ipcRenderer.send("log-to-file", "info", msg),
    error: (msg) => ipcRenderer.send("log-to-file", "error", msg),
    warn: (msg) => ipcRenderer.send("log-to-file", "warn", msg)
});
console.log("✅ contracts API exposed to window.contracts");
