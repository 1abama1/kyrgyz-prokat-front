import { useState } from "react";
import { downloadContractExcel } from "../api/excel.api";
import "../styles/buttons.css";

type Props = {
  contractId: number;
  contractNumber: string;
};

export const DownloadExcelButton = ({ contractId, contractNumber }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    try {
      setLoading(true);

      if (!window.contracts) {
        alert("Electron API недоступен. Эта функция работает только в Electron приложении.");
        return;
      }

      const filename = `Договор №${contractNumber}.xlsx`;
      const existingPath = await window.contracts.checkExists(filename);

      if (existingPath) {
        await window.contracts.openExcel(existingPath);
        return;
      }

      const blob = await downloadContractExcel(contractId);
      const buffer = await blob.arrayBuffer();
      const savedPath = await window.contracts.saveExcel(buffer, filename);
      await window.contracts.openExcel(savedPath);

    } catch (e) {
      console.error("Error opening Excel:", e);
      alert("Ошибка при открытии Excel");
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
        alert("Сначала скачайте договор: нажмите кнопку «Отрыть Excel»");
        return;
      }

      await window.contracts.showItemInFolder(existingPath);

    } catch (e) {
      console.error("Error showing folder:", e);
      alert("Ошибка при открытии папки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <button 
        className="btn-primary" 
        onClick={handleOpen}
        disabled={loading}
        style={{ padding: "6px 12px", fontSize: "14px" }}
      >
        {loading ? "⏳ Открытие..." : "📄 Открыть Excel"}
      </button>
      
      <button 
        className="btn-secondary" 
        onClick={handleOpenFolder}
        disabled={loading}
        style={{ padding: "6px 12px", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}
      >
        📂 В проводнике
      </button>
    </div>
  );
};
