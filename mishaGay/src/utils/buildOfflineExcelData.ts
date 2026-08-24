import { db } from '../db/db';

// ─────────────────────────────────────────────────────────────────────────────
// Типы (зеркало ExcelContractDto / ClientExcelDto / RentalExcelDto с бэка)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Хелперы форматирования дат
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(isoDate?: string | null): string | undefined {
  if (!isoDate) return undefined;
  try {
    const d = new Date(isoDate);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  } catch {
    return undefined;
  }
}

function formatTime(isoDate?: string | null): string | undefined {
  if (!isoDate) return undefined;
  try {
    const d = new Date(isoDate);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Основная функция — собирает OfflineExcelData из Dexie по contractId (backend id)
// ─────────────────────────────────────────────────────────────────────────────

export async function buildOfflineExcelData(contractId?: number | string, offlineId?: string): Promise<OfflineExcelData> {
  let contract: any = undefined;

  const numId = typeof contractId === "number" ? contractId : (!isNaN(Number(contractId)) && Number(contractId) > 0 ? Number(contractId) : null);
  if (numId) {
    contract = await db.contracts.where('id').equals(numId).first();
  }

  if (!contract && (offlineId || contractId)) {
    const key = offlineId || String(contractId);
    contract = await db.contracts.where('offlineId').equals(key).first();
  }

  if (!contract) {
    throw new Error(`Договор #${contractId || offlineId} не найден в локальной базе данных`);
  }

  // Клиент
  let client: any = null;
  if (contract.clientId) {
    client = await db.clients.get(Number(contract.clientId));
  }

  // Инструмент
  let tool: any = null;
  if (contract.toolId) {
    tool = await db.tools.get(Number(contract.toolId));
  }

  // ── Сборка клиентского DTO ──────────────────────────────────────────────

  const passport = client?.passport;

  // Тип паспорта: из поля passportType или из серии (ID/AN/MIA и т.д.)
  const passportType = client?.passportType
    ?? passport?.series
    ?? undefined;

  // Паспорт — дата выдачи (форматируем)
  const passportIssuedDate = formatDate(passport?.issueDate);

  // Дата рождения
  const birthDate = formatDate(client?.birthDate);

  // Адрес регистрации
  const registrationAddress: OfflineAddressDto | undefined =
    client?.registrationAddress
      ? {
          region: client.registrationAddress.region,
          street: client.registrationAddress.street,
        }
      : undefined;

  // Фактический адрес (если отличается)
  const livingAddress: OfflineAddressDto | undefined =
    client?.livingAddress &&
    (client.livingAddress.region !== client.registrationAddress?.region ||
      client.livingAddress.street !== client.registrationAddress?.street)
      ? {
          region: client.livingAddress.region,
          street: client.livingAddress.street,
        }
      : undefined;

  // Доп. телефон (только если не совпадает с основным)
  const additionalPhone =
    client?.additionalPhone &&
    client.additionalPhone !== client.whatsappPhone
      ? client.additionalPhone
      : undefined;

  const clientData: OfflineClientExcelData = {
    fullName:               client?.fullName ?? '',
    whatsappPhone:          client?.whatsappPhone ?? '',
    additionalPhone,
    passportType,
    passportNumber:         passport?.number,
    passportIssuedBy:       passport?.issuedBy,
    passportDepartmentCode: passport?.subdivisionCode,
    passportIssuedDate,
    registrationAddress,
    livingAddress,
    objectAddress:          client?.objectAddress,
    pin:                    passport?.inn,
    birthDate,
  };

  // ── Сборка аренды DTO ───────────────────────────────────────────────────

  const rentalData: OfflineRentalExcelData = {
    startDate:        formatDate(contract.startDateTime),
    // returnDate заполняется только если договор закрыт
    actualReturnDate: formatDate(contract.returnDate),
    actualReturnTime: formatTime(contract.returnDate),
  };

  // ── Инструмент — fullName ───────────────────────────────────────────────
  // Формат как в Java: "<название> <модель> #<номер>"
  // tool.name уже содержит "<название> #<instanceNumber>" после синхронизации
  const toolFullName = tool
    ? tool.name + (tool.inventoryNumber ? ` (${tool.inventoryNumber})` : '')
    : contract.toolName ?? 'Инструмент не найден';

  return {
    toolFullName,
    pricePerDay:    tool?.dailyRentalPrice ?? tool?.dailyPrice,
    depositAmount:  tool?.depositAmount ?? tool?.deposit,
    purchasePrice:  tool?.purchasePrice,
    quantity:       1,
    client:         clientData,
    rental:         rentalData,
  };
}
