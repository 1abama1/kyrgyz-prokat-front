import { FC, useState } from "react";
import { contractsAPI } from "../api/contracts";

interface Props {
  contractId: number;
  contractNumber?: string;
  style?: React.CSSProperties;
}

export const ReinstallExcelButton: FC<Props> = ({ contractId, contractNumber, style }) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setLoading(true);
      const filename = `Договор_${contractNumber || contractId}.xlsx`;
      const { blob, filename: downloadedFilename } = await contractsAPI.downloadExistingExcel(contractId, filename) as any;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadedFilename || filename;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Ошибка при скачивании: " + (err?.message || "Неизвестная ошибка"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      style={{
        background: "#e8f5e9",
        color: "#2e7d32",
        border: "1px solid #c8e6c9",
        borderRadius: 4,
        padding: "4px 8px",
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: "12px",
        fontWeight: 500,
        ...style,
      }}
      title="Переустановить / Скачать Excel заново"
      type="button"
    >
      {loading ? "⏳..." : "⬇️ Excel"}
    </button>
  );
};
