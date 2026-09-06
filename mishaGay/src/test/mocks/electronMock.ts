/**
 * Моки Electron IPC и Preload API для тестирования в Jest / Vitest (jsdom).
 * 
 * В браузере (jsdom) отсутствуют electron, ipcRenderer и объекты window.contracts / window.electronAPI.
 * Данный модуль предоставляет фабрики для инициализации чистых моков в глобальном объекте window
 * с сохранением сигнатур и возможностью отслеживания вызовов (vi.fn() или jest.fn()).
 */

export interface MockElectronContracts {
  checkExists: any;
  saveExcel: any;
  openExcel: any;
  generateOffline: any;
  showItemInFolder: any;
}

export interface MockElectronAPI {
  platform: string;
  version: string;
  openExternalUrl: any;
  onUpdateReady: any;
  installUpdate: any;
}

export interface MockElectronLog {
  info: any;
  error: any;
  warn: any;
}

/**
 * Создает изолированный объект моков Electron с vi.fn() или jest.fn()
 */
export function createElectronMocks(mockFn: <T = any>() => any = () => {
  const fn = (..._args: any[]) => Promise.resolve();
  fn.mockResolvedValue = (val: any) => { /* mock */ };
  return fn;
}) {
  const contracts: MockElectronContracts = {
    checkExists: mockFn().mockResolvedValue("/mock/path/contract.xlsx"),
    saveExcel: mockFn().mockResolvedValue("/mock/saved/path/contract.xlsx"),
    openExcel: mockFn().mockResolvedValue(undefined),
    generateOffline: mockFn().mockResolvedValue("/mock/offline/path/contract.xlsx"),
    showItemInFolder: mockFn().mockResolvedValue(undefined),
  };

  const electronAPI: MockElectronAPI = {
    platform: "win32",
    version: "27.0.0",
    openExternalUrl: mockFn().mockResolvedValue(undefined),
    onUpdateReady: mockFn(),
    installUpdate: mockFn(),
  };

  const electronLog: MockElectronLog = {
    info: mockFn(),
    error: mockFn(),
    warn: mockFn(),
  };

  return { contracts, electronAPI, electronLog };
}

/**
 * Устанавливает моки Electron в глобальный объект window
 */
export function setupWindowElectronMocks(mocks: ReturnType<typeof createElectronMocks>) {
  Object.defineProperty(window, "contracts", {
    value: mocks.contracts,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, "electronAPI", {
    value: mocks.electronAPI,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, "electronLog", {
    value: mocks.electronLog,
    writable: true,
    configurable: true,
  });
}

/**
 * Очистка моков после тестов
 */
export function cleanupWindowElectronMocks() {
  delete (window as any).contracts;
  delete (window as any).electronAPI;
  delete (window as any).electronLog;
}
