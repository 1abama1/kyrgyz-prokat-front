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

      // Проверяем, доступен ли Electron API
      if (!window.contracts) {
        alert("Electron API недоступен. Эта функция работает только в Electron приложении.");
        return;
      }

      const filename = `Договор №${contractNumber}.xlsx`;

      // 1️⃣ Проверяем: файл уже есть?
      const existingPath = await window.contracts.checkExists(filename);

      if (existingPath) {
        // 2️⃣ Просто открываем существующий файл
        await window.contracts.openExcel(existingPath);
        return;
      }

      // 3️⃣ Если нет — скачиваем с backend
      const blob = await downloadContractExcel(contractId);
      const buffer = await blob.arrayBuffer();

      // 4️⃣ Сохраняем
      const savedPath = await window.contracts.saveExcel(buffer, filename);

      // 5️⃣ Открываем
      await window.contracts.openExcel(savedPath);

    } catch (e) {
      console.error("Error opening Excel:", e);
      alert("Ошибка при открытии Excel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      className="btn-primary" 
      onClick={handleOpen}
      disabled={loading}
      style={{
        padding: "6px 12px",
        fontSize: "14px"
      }}
    >
      {loading ? "⏳ Открытие..." : "📄 Открыть Excel"}
    </button>
  );
};
