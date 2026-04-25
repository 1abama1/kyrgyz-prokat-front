const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log");

// 🔥 Настройка логирования
log.transports.file.level = "info";
log.transports.console.level = "info";
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

// Сначала выводим информацию о логах в оригинальный console
const originalConsoleLog = console.log;
const logFilePath = log.transports.file.getFile().path;

originalConsoleLog("=".repeat(80));
originalConsoleLog("🔥 ELECTRON MAIN STARTED");
originalConsoleLog(`📝 Log file location: ${logFilePath}`);
originalConsoleLog(`📦 App version: ${app.getVersion()}`);
originalConsoleLog(`⚡ Electron version: ${process.versions.electron}`);
originalConsoleLog(`🖥️  Platform: ${process.platform}`);
originalConsoleLog("=".repeat(80));

// Теперь записываем в файл логов
log.info("=".repeat(80));
log.info("🔥 ELECTRON MAIN STARTED");
log.info(`Log file location: ${logFilePath}`);
log.info(`App version: ${app.getVersion()}`);
log.info(`Electron version: ${process.versions.electron}`);
log.info(`Node version: ${process.versions.node}`);
log.info(`Platform: ${process.platform}`);
log.info("=".repeat(80));

// Переопределяем console.log для записи в файл
console.log = log.info.bind(log);
console.error = log.error.bind(log);
console.warn = log.warn.bind(log);
console.debug = log.debug.bind(log);

// 🔥 КРИТИЧНО: Отключаем GPU acceleration для устранения ошибок
app.disableHardwareAcceleration();
log.info("GPU hardware acceleration disabled");

let mainWindow = null;

// Папка для хранения Excel-договоров
const getContractsDir = () => {
  const contractsDir = path.join(
    app.getPath("documents"),
    "Level",
    "Contracts"
  );

  // Создаём папку, если её нет
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  return contractsDir;
};

// 🔥 КРИТИЧНО: Регистрируем IPC handlers ДО создания окна
console.log("🔥 Registering IPC handlers...");

// Проверка существования файла
ipcMain.handle("contract-exists", async (_, filename) => {
  log.info(`[IPC] Вызов contract-exists для файла: ${filename}`);
  const contractsDir = getContractsDir();
  const filePath = path.join(contractsDir, filename);

  if (fs.existsSync(filePath)) {
    log.info(`🔥 Contract file exists: ${filePath}`);
    return filePath;
  }

  return null;
});

ipcMain.handle("save-contract-excel", async (_, { buffer, filename }) => {
  log.info(`[IPC] Вызов save-contract-excel: ${filename} (размер: ${buffer.byteLength} байт)`);

  const contractsDir = getContractsDir();
  const filePath = path.join(contractsDir, filename);

  fs.writeFileSync(filePath, Buffer.from(buffer));
  log.info(`✅ Excel file saved successfully: ${filePath}`);

  return filePath;
});

ipcMain.handle("open-contract-excel", async (_, filePath) => {
  log.info(`[IPC] Вызов open-contract-excel для пути: ${filePath}`);
  return shell.openPath(filePath);
});

ipcMain.handle("show-item-in-folder", async (_, filePath) => {
  log.info(`[IPC] Вызов show-item-in-folder для пути: ${filePath}`);
  shell.showItemInFolder(filePath);
});

console.log("🔥 IPC handlers registered successfully");

// Прием логов из фронтенда
ipcMain.on("log-to-file", (event, level, message) => {
  if (log[level]) {
    log[level](`[Renderer] ${message}`);
  } else {
    log.info(`[Renderer] ${message}`);
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, "../public/icon.png")
  });

  // Отключить меню
  Menu.setApplicationMenu(null);

  // Development URL или production build
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    log.info(`[Main] Loading production HTML from: ${indexPath}`);
    mainWindow.loadFile(indexPath).catch(err => {
      log.error(`[Main] Failed to load index.html: ${err.message}`);
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log("🔥 App ready, creating window...");
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
