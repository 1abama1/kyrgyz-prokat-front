/// <reference types="vite/client" />

interface Window {
  contracts?: {
    checkExists: (filename: string) => Promise<string | null>;
    saveExcel: (buffer: ArrayBuffer, filename: string) => Promise<string>;
    openExcel: (filePath: string) => Promise<void>;
  };
  electronAPI?: {
    platform: string;
    version: string;
  };
}

