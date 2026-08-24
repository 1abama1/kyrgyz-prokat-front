export interface IElectronLog {
    info: (msg: string) => void;
    error: (msg: string) => void;
    warn: (msg: string) => void;
}

export interface OfflineAddressDto {
    region?: string;
    street?: string;
}

export interface OfflineClientExcelData {
    fullName: string;
    whatsappPhone: string;
    additionalPhone?: string;
    passportType?: string;
    passportNumber?: string;
    passportIssuedBy?: string;
    passportDepartmentCode?: string;
    passportIssuedDate?: string;
    registrationAddress?: OfflineAddressDto;
    livingAddress?: OfflineAddressDto;
    objectAddress?: string;
    pin?: string;
    birthDate?: string;
}

export interface OfflineRentalExcelData {
    startDate?: string;
    actualReturnDate?: string;
    actualReturnTime?: string;
}

export interface OfflineExcelData {
    toolFullName: string;
    pricePerDay?: number;
    depositAmount?: number;
    purchasePrice?: number;
    quantity?: number;
    client: OfflineClientExcelData;
    rental: OfflineRentalExcelData;
}

export interface IContracts {
    checkExists: (filename: string) => Promise<string | null>;
    saveExcel: (buffer: ArrayBuffer, filename: string) => Promise<string>;
    openExcel: (filePath: string) => Promise<void>;
    showItemInFolder: (filePath: string) => Promise<void>;
    generateOffline: (contractData: OfflineExcelData, filename: string) => Promise<string>;
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
