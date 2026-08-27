import { useState } from "react";
import { downloadContractExcel } from "../api/excel.api";
import { networkStore } from "../store/networkStore";
import { buildOfflineExcelData } from "../utils/buildOfflineExcelData";

type Props = {
  contractId?: number | string;
  contractNumber: string;
  offlineId?: string;
};

export const DownloadExcelButton = ({ contractId, contractNumber, offlineId }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    try {
      setLoading(true);

      if (!window.contracts) {
        alert("Electron API недоступен. Эта функция работает только в Electron приложении.");
        return;
      }

      const filename = `Договор №-${contractNumber}.xlsx`;
      const numContractId = typeof contractId === "number" ? contractId : (!isNaN(Number(contractId)) && Number(contractId) > 0 ? Number(contractId) : null);

      // Попытка 1: онлайн (только если есть валидный бэкенд contractId) — берём готовый файл с бэка
      if (!networkStore.isOffline && numContractId && numContractId > 0) {
        try {
          const blob = await downloadContractExcel(numContractId);
          const buffer = await blob.arrayBuffer();
          const savedPath = await window.contracts.saveExcel(buffer, filename);
          await window.contracts.openExcel(savedPath);
          return;
        } catch (onlineErr: any) {
          // Если сетевая ошибка (fetch failed / timeout) — падаем в оффлайн-режим
          const isNetworkError =
            onlineErr?.code === "ERR_NETWORK" ||
            onlineErr?.message?.includes("Network Error") ||
            onlineErr?.message?.includes("fetch") ||
            onlineErr?.message?.includes("Failed to fetch") ||
            onlineErr?.status === undefined ||
            (onlineErr?.response?.status && onlineErr.response.status >= 500);

          if (!isNetworkError) {
            // Ошибка клиента (4xx) — пробрасываем как есть
            throw onlineErr;
          }

          console.warn("[Excel] Online generation failed, falling back to offline mode:", onlineErr?.message);
          window.electronLog?.warn?.(`[Excel] Online fallback: ${onlineErr?.message}`);
        }
      }

      // Попытка 2: оффлайн — генерируем локально из Dexie
      if (!window.contracts.generateOffline) {
        alert("Оффлайн-генерация Excel недоступна. Обновите приложение.");
        return;
      }

      window.electronLog?.info?.(`[Excel] Generating offline for contract #${contractId || offlineId}`);
      const excelData = await buildOfflineExcelData(contractId, offlineId);
      const savedPath = await window.contracts.generateOffline(excelData, filename);
      await window.contracts.openExcel(savedPath);

    } catch (e: any) {
      console.error("Error opening Excel:", e);
      if (e.message && e.message.includes("EBUSY")) {
        alert("Файл уже открыт в Excel. Пожалуйста, закройте его перед обновлением.");
      } else if (e.message && e.message.includes("не найден в локальной")) {
        alert("Договор не найден в локальной базе. Дождитесь синхронизации и попробуйте снова.");
      } else {
        alert("Ошибка при загрузке или открытии Excel. Убедитесь, что файл не открыт в другой программе.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      setLoading(true);

      if (!window.contracts || !window.contracts.showItemInFolder) {
        alert("Функция доступна только в десктопном приложении.");
        return;
      }

      const filename = `Договор №${contractNumber}.xlsx`;
      let existingPath = await window.contracts.checkExists(filename);

      if (!existingPath) {
        const numContractId = typeof contractId === "number" ? contractId : (!isNaN(Number(contractId)) && Number(contractId) > 0 ? Number(contractId) : null);
        // Онлайн: с бэка; оффлайн: локально
        if (!networkStore.isOffline && numContractId && numContractId > 0) {
          try {
            const blob = await downloadContractExcel(numContractId);
            const buffer = await blob.arrayBuffer();
            existingPath = await window.contracts.saveExcel(buffer, filename);
          } catch {
            // Фолбэк на оффлайн-генерацию
            const excelData = await buildOfflineExcelData(contractId, offlineId);
            existingPath = await window.contracts.generateOffline(excelData, filename);
          }
        } else {
          const excelData = await buildOfflineExcelData(contractId, offlineId);
          existingPath = await window.contracts.generateOffline(excelData, filename);
        }
      }

      await window.contracts.showItemInFolder(existingPath!);

    } catch (e) {
      console.error("Error showing folder:", e);
      alert("Ошибка при открытии папки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      <button
        className="btn-primary"
        onClick={handleOpen}
        disabled={loading}
      >
        {loading ? "⏳ Открытие..." : "📄 Открыть Excel"}
      </button>

      <button
        className="btn-secondary"
        onClick={handleOpenFolder}
        disabled={loading}
      >
        📂 В проводнике
      </button>
    </div>
  );
};
