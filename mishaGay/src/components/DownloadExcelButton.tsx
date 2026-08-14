import { useState } from "react";
import { downloadContractExcel } from "../api/excel.api";

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

      const filename = `Договор №-${contractNumber}.xlsx`;

      const blob = await downloadContractExcel(contractId);
      const buffer = await blob.arrayBuffer();
      const savedPath = await window.contracts.saveExcel(buffer, filename);
      await window.contracts.openExcel(savedPath);

    } catch (e: any) {
      console.error("Error opening Excel:", e);
      if (e.message && e.message.includes("EBUSY")) {
        alert("Файл уже открыт в Excel. Пожалуйста, закройте его перед обновлением.");
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
        const blob = await downloadContractExcel(contractId);
        const buffer = await blob.arrayBuffer();
        existingPath = await window.contracts.saveExcel(buffer, filename);
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
