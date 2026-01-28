export interface IElectronLog {
    info: (msg: string) => void;
    error: (msg: string) => void;
    warn: (msg: string) => void;
}

export interface IContracts {
    checkExists: (filename: string) => Promise<string | null>;
    saveExcel: (buffer: ArrayBuffer, filename: string) => Promise<string>;
    openExcel: (filePath: string) => Promise<void>;
}

declare global {
    interface Window {
        electronLog: IElectronLog;
        contracts: IContracts;
        electronAPI: {
            platform: string;
            version: string;
        };
    }
}
