import { app, BrowserWindow, Menu, ipcMain, shell } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as fs from "fs";
import log from "electron-log";
// @ts-ignore
import XlsxPopulate from "xlsx-populate";

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

// Переопределяем console.log для записи в файл (после вывода информации)
console.log = log.info.bind(log);
console.error = log.error.bind(log);
console.warn = log.warn.bind(log);
console.debug = log.debug.bind(log);

// 🔥 КРИТИЧНО: Отключаем GPU acceleration для устранения ошибок
app.disableHardwareAcceleration();
log.info("GPU hardware acceleration disabled");



let mainWindow: BrowserWindow | null = null;

// Папка для хранения Excel-договоров
const getContractsDir = (): string => {
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

function createWindow(): void {
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
    icon: path.join(__dirname, "../src/assets/logo.png")
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

  // Перехватываем создание новых окон (например, при window.open)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 🔥 КРИТИЧНО: Регистрируем IPC handlers ДО создания окна
console.log("🔥 IPC handlers registered successfully");

// Прием логов из фронтенда
ipcMain.on("log-to-file", (_event, level, message) => {
  const logMethod = (log as any)[level] || log.info;
  logMethod(`[Renderer] ${message}`);
});

// Обновленные IPC handlers с логированием
ipcMain.handle("contract-exists", async (_event, filename: string) => {
  log.info(`[IPC] Вызов contract-exists для файла: ${filename}`);
  const contractsDir = getContractsDir();
  const filePath = path.join(contractsDir, filename);

  if (fs.existsSync(filePath)) {
    log.info(`🔥 Contract file exists: ${filePath}`);
    return filePath;
  }

  return null;
});

ipcMain.handle("save-contract-excel", async (_event, { buffer, filename }: { buffer: ArrayBuffer; filename: string }) => {
  log.info(`[IPC] Вызов save-contract-excel: ${filename} (размер: ${buffer.byteLength} байт)`);

  const contractsDir = getContractsDir();
  const filePath = path.join(contractsDir, filename);

  fs.writeFileSync(filePath, Buffer.from(buffer));
  log.info(`✅ Excel file saved successfully: ${filePath}`);

  return filePath;
});

ipcMain.handle("open-contract-excel", async (_event, filePath: string) => {
  log.info(`[IPC] Вызов open-contract-excel для пути: ${filePath}`);
  return shell.openPath(filePath);
});

ipcMain.handle("open-external-url", async (_event, url: string) => {
  log.info(`[IPC] Открытие внешней ссылки: ${url}`);
  await shell.openExternal(url);
});

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательная функция: путь к шаблону lermontov.xlsx
// ─────────────────────────────────────────────────────────────────────────────

const getTemplatePath = (): string => {
  // Production: шаблон рядом с electron/main.js в resources/
  const prodPath = path.join(__dirname, "../resources/lermontov.xlsx");
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }
  // Development: шаблон в корне проекта
  const devPath = path.join(app.getAppPath(), "resources/lermontov.xlsx");
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  throw new Error(`Шаблон lermontov.xlsx не найден. Проверьте пути:\n  ${prodPath}\n  ${devPath}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// IPC: Оффлайн-генерация Excel по шаблону (без бэка)
// Логика заполнения ячеек полностью зеркалит ExcelGeneratorService.java
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle("generate-offline-excel", async (_event, { contractData, filename }: { contractData: any; filename: string }) => {
  log.info(`[IPC] generate-offline-excel: ${filename}`);

  const templatePath = getTemplatePath();
  log.info(`[IPC] Using template: ${templatePath}`);

  const workbook = await XlsxPopulate.fromFileAsync(templatePath);
  const dto = contractData;

  // ── Вспомогательные функции ──────────────────────────────────────────────

  const setCell = (sheet: any, ref: string, value: any) => {
    if (!sheet || value === null || value === undefined || value === '') return;
    sheet.cell(ref).value(value);
  };

  const clearCell = (sheet: any, ref: string) => {
    if (!sheet) return;
    sheet.cell(ref).value(undefined);
  };

  // ── Лист "Дог." ─────────────────────────────────────────────────────────

  const dogSheet = workbook.sheet('Дог.');
  if (dogSheet) {
    setCell(dogSheet, 'A12', dto.toolFullName);

    // Контакты (основной + доп. телефон)
    let contacts = dto.client?.whatsappPhone ?? '';
    if (dto.client?.additionalPhone) {
      contacts += `, Доп: ${dto.client.additionalPhone}`;
    }
    setCell(dogSheet, 'D7', contacts);

    setCell(dogSheet, 'A18', dto.client?.fullName);
    setCell(dogSheet, 'E19', dto.client?.passportType);
    setCell(dogSheet, 'G19', dto.client?.passportNumber);
    setCell(dogSheet, 'J19', dto.client?.passportIssuedBy);
    setCell(dogSheet, 'K19', dto.client?.passportDepartmentCode);
    setCell(dogSheet, 'M19', dto.client?.passportIssuedDate);

    if (dto.client?.registrationAddress) {
      setCell(dogSheet, 'C20', dto.client.registrationAddress.region);
      setCell(dogSheet, 'J20', dto.client.registrationAddress.street);
    }
    if (dto.client?.livingAddress) {
      setCell(dogSheet, 'A21', dto.client.livingAddress.region);
      setCell(dogSheet, 'I21', dto.client.livingAddress.street);
    }

    setCell(dogSheet, 'C22', dto.client?.pin);
    setCell(dogSheet, 'A23', dto.client?.birthDate);
    setCell(dogSheet, 'K22', dto.client?.objectAddress);
  } else {
    log.warn("[IPC] Sheet 'Дог.' not found in template");
  }

  // ── Лист "Пр №1" ────────────────────────────────────────────────────────

  const pr1Sheet = workbook.sheet('Пр №1');
  if (pr1Sheet) {
    if (dto.pricePerDay != null) setCell(pr1Sheet, 'N20', dto.pricePerDay);
    if (dto.depositAmount != null) setCell(pr1Sheet, 'P20', dto.depositAmount);
    if (dto.quantity != null) setCell(pr1Sheet, 'I20', dto.quantity);
  } else {
    log.warn("[IPC] Sheet 'Пр №1' not found in template");
  }

  // ── Лист "Акт расч" ─────────────────────────────────────────────────────

  const aktSheet = workbook.sheet('Акт расч');
  if (aktSheet) {
    if (dto.rental?.actualReturnDate) setCell(aktSheet, 'G21', dto.rental.actualReturnDate);
    if (dto.rental?.actualReturnTime) setCell(aktSheet, 'G20', dto.rental.actualReturnTime);

    clearCell(aktSheet, 'H20');
    clearCell(aktSheet, 'H21');

    if (dto.purchasePrice != null) {
      clearCell(aktSheet, 'N21');
      setCell(aktSheet, 'N21', dto.purchasePrice);
    }

    aktSheet.cell('L21').formula('G21-F21');
  } else {
    log.warn("[IPC] Sheet 'Акт расч' not found in template");
  }

  // ── Лист "Акт прием" ───────────────────────────────────────────────────

  const aktPriemSheet =
    workbook.sheet('Акт прием') ||
    workbook.sheet('Акт приема') ||
    workbook.sheet('Акт прием-передач') ||
    workbook.sheet('Акт приема-передачи') ||
    workbook.sheet('Акт прием-передачи');

  if (aktPriemSheet && dto.purchasePrice != null) {
    clearCell(aktPriemSheet, 'N21');
    setCell(aktPriemSheet, 'N21', dto.purchasePrice);
  }

  // ── Сохранить файл ───────────────────────────────────────────────────────

  const contractsDir = getContractsDir();
  const filePath = path.join(contractsDir, filename);

  await workbook.toFileAsync(filePath);
  log.info(`✅ Offline Excel saved: ${filePath}`);

  return filePath;
});

app.whenReady().then(() => {
  console.log("🔥 App ready, creating window...");
  createWindow();

  // Проверяем обновления в фоне
  autoUpdater.checkForUpdatesAndNotify();
});

// Слушаем скачивание обновления и отправляем в React
autoUpdater.on('update-downloaded', (info) => {
  const notes = info.releaseNotes 
    ? (Array.isArray(info.releaseNotes) ? info.releaseNotes.map(n => n.note).join('\n') : info.releaseNotes)
    : 'Нет описания изменений.';

  mainWindow?.webContents.send('update-ready', {
    version: info.version,
    notes: notes
  });
});

// Слушаем команду из React на установку
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
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

