const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

// 🔥 КРИТИЧНО: Отключаем GPU acceleration для устранения ошибок
app.disableHardwareAcceleration();

console.log("🔥 ELECTRON MAIN STARTED");

let mainWindow = null;

// Папка для хранения Excel-договоров
const getContractsDir = () => {
  const contractsDir = path.join(
    app.getPath("documents"),
    "MishaCRM",
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
  const contractsDir = getContractsDir();
  const filePath = path.join(contractsDir, filename);
  
  if (fs.existsSync(filePath)) {
    console.log(`🔥 Contract file exists: ${filePath}`);
    return filePath;
  }
  
  return null;
});

ipcMain.handle("save-contract-excel", async (_, { buffer, filename }) => {
  console.log("🔥 save-contract-excel handler called");
  
  const contractsDir = getContractsDir();
  const filePath = path.join(contractsDir, filename);
  
  console.log(`🔥 Saving Excel to: ${filePath}`);
  
  fs.writeFileSync(filePath, Buffer.from(buffer));
  
  console.log(`🔥 Excel file saved successfully: ${filePath}`);
  
  return filePath;
});

ipcMain.handle("open-contract-excel", async (_, filePath) => {
  console.log(`🔥 Opening Excel file: ${filePath}`);
  return shell.openPath(filePath);
});

console.log("🔥 IPC handlers registered successfully");

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
  const isDev = process.env.NODE_ENV === "development";
  
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    // DevTools только в разработке
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
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
