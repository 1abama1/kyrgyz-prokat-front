import { FC, useEffect, useState } from "react";
import type { ClientCard as ClientCardResponse } from "../types/client.types";
import { Tool } from "../types/tool.types";
import { toolsAPI } from "../api/tools";
import { contractsAPI } from "../api/contracts";
import { ErrorMessage } from "./ErrorMessage";

interface Props {
  client: ClientCardResponse;
  onContractCreated?: () => Promise<void> | void;
}

export const CreateExcelContractInline: FC<Props> = ({ client, onContractCreated }) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Tool[]>([]);
  const [freeTools, setFreeTools] = useState<Tool[]>([]);

  const [category, setCategory] = useState<string>("");
  const [templateId, setTemplateId] = useState<number | "">("");
  const [toolId, setToolId] = useState<number | "">("");
  const [totalAmount, setTotalAmount] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [createdContractId, setCreatedContractId] = useState<number | null>(null);
  const clientHasActiveContract = Boolean(client.hasActiveContract);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const data = await toolsAPI.getAll();
        setTemplates(data);

        const cats = Array.from(new Set(data.map(t => t.categoryName)));
        setCategories(cats);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  useEffect(() => {
    setCategory("");
    setTemplateId("");
    setToolId("");
    setFreeTools([]);
    setTotalAmount("");
    setExpectedReturnDate("");
    setError(null);
    setCreatedContractId(null);
  }, [client.id]);

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setTemplateId("");
    setToolId("");
    setFreeTools([]);
  };

  const handleTemplateChange = async (value: number) => {
    setTemplateId(value);
    setToolId("");
    setFreeTools([]);

    if (!value) return;

    try {
      setError(null);
      setLoading(true);
      const list = await toolsAPI.getAvailableByTemplate(value);
      setFreeTools(list);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить доступные инструменты");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateId || !toolId || !totalAmount || !expectedReturnDate) {
      setError("Заполните все поля!");
      return;
    }

    const amount = Number(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Сумма должна быть положительным числом");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await contractsAPI.createContract({
        clientId: client.id,
        toolId: Number(toolId),
        expectedReturnDate,
        totalAmount: amount
      });

      setCreatedContractId(res.id);
      await onContractCreated?.();
    } catch (err: any) {
      // Улучшенная обработка ошибок
      const errorMessage = err?.message || err?.error || "Ошибка создания договора";
      
      if (errorMessage.includes("contract_number") || errorMessage.includes("уже существует")) {
        setError("Договор с таким номером уже существует. Пожалуйста, используйте другой номер.");
      } else if (errorMessage.includes("занят") || errorMessage.includes("Инструмент занят")) {
        setError("Этот инструмент уже в аренде. Выберите другой инструмент.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!templateId || !toolId || !totalAmount || !expectedReturnDate) {
      setError("Заполните все поля!");
      return;
    }

    try {
      setError(null);
      setDownloading(true);
      const { blob, filename } = await contractsAPI.downloadExcel({
        clientId: client.id,
        toolId: Number(toolId),
        expectedReturnDate,
        totalAmount: Number(totalAmount)
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `Договор_${client.fullName || client.id}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Ошибка при скачивании Excel");
    } finally {
      setDownloading(false);
    }
  };

  const filteredTemplates = category
    ? templates.filter(t => t.categoryName === category)
    : templates;
  const isCategoryDisabled = clientHasActiveContract || (loading && categories.length === 0);
  const isTemplateDisabled = clientHasActiveContract || !category || loading;
  const shouldHideToolSelect = Boolean(templateId) && !loading && freeTools.length === 0;
  const isToolSelectDisabled = clientHasActiveContract || !templateId || freeTools.length === 0;
  const isCreateDisabled =
    clientHasActiveContract ||
    creating ||
    !templateId ||
    !toolId ||
    !totalAmount ||
    !expectedReturnDate ||
    shouldHideToolSelect;

  return (
    <div
      style={{
        marginTop: 20,
        padding: 20,
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#fafafa"
      }}
    >
      <ErrorMessage error={error} onClose={() => setError(null)} />

      <h3>Создать договор аренды</h3>
      {clientHasActiveContract && (
        <div
          style={{
            color: "#c62828",
            background: "#ffebee",
            padding: "10px 12px",
            borderRadius: 6,
            marginTop: 10,
            marginBottom: 10,
            border: "1px solid #ef9a9a",
            fontWeight: 500
          }}
        >
          Клиент уже имеет активный договор. Сначала завершите текущую аренду.
        </div>
      )}

      <form onSubmit={onSubmit}>
      <label style={{ display: "block", marginTop: 12 }}>Категория:</label>
      <select
        value={category}
        disabled={isCategoryDisabled}
        onChange={(e) => handleCategoryChange(e.target.value)}
        style={{ width: "100%", padding: 8, marginTop: 4 }}
      >
        <option value="">Выберите категорию</option>
        {categories.map(c => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <label style={{ display: "block", marginTop: 12 }}>Модель инструмента:</label>
      <select
        value={templateId}
        disabled={isTemplateDisabled}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) {
            setTemplateId("");
            setFreeTools([]);
            return;
          }
          handleTemplateChange(Number(value));
        }}
        style={{ width: "100%", padding: 8, marginTop: 4 }}
      >
        <option value="">Выберите модель</option>
        {filteredTemplates.map(t => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <label style={{ display: "block", marginTop: 12 }}>Конкретный инструмент:</label>
      {shouldHideToolSelect ? (
        <div
          style={{
            color: "#c62828",
            background: "#fff3e0",
            border: "1px solid #ffcc80",
            borderRadius: 6,
            padding: "10px 12px",
            marginTop: 4
          }}
        >
          Нет доступных инструментов для аренды. Выберите другой шаблон.
        </div>
      ) : (
        <select
          value={toolId}
          disabled={isToolSelectDisabled}
          onChange={(e) => {
            const value = e.target.value;
            setToolId(value ? Number(value) : "");
          }}
          style={{ width: "100%", padding: 8, marginTop: 4 }}
        >
          <option value="">Выберите инструмент</option>
          {freeTools.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} / SN: {t.serialNumber}
            </option>
          ))}
        </select>
      )}

      <label style={{ display: "block", marginTop: 12 }}>Плановая дата возврата:</label>
      <input
        type="date"
        value={expectedReturnDate}
        onChange={(e) => setExpectedReturnDate(e.target.value)}
        style={{ width: "100%", padding: 8, marginTop: 4 }}
        disabled={clientHasActiveContract}
      />

      <label style={{ display: "block", marginTop: 12 }}>Сумма аренды:</label>
      <input
        type="number"
        value={totalAmount}
        min="0"
        step="100"
        onChange={(e) => setTotalAmount(e.target.value)}
        placeholder="1500"
        style={{ width: "100%", padding: 8, marginTop: 4 }}
        disabled={clientHasActiveContract}
      />

        <button
          type="submit"
          disabled={isCreateDisabled}
          style={{
            marginTop: 15,
            padding: "10px 16px",
            background: clientHasActiveContract
              ? "#b0bec5"
              : creating
              ? "#90caf9"
              : "#1976d2",
            color: "white",
            borderRadius: 6,
            border: "none",
            cursor: clientHasActiveContract || creating ? "not-allowed" : "pointer",
            width: "100%"
          }}
        >
          {creating ? "Создание..." : "Создать договор"}
        </button>
      </form>

      {createdContractId && (
        <div
          style={{
            marginTop: 15,
            padding: "12px",
            background: "#e8f5e9",
            border: "1px solid #4caf50",
            borderRadius: 6,
            color: "#2e7d32",
            fontWeight: 500
          }}
        >
          ✅ Договор успешно создан
        </div>
      )}

      {createdContractId && (
        <button
          type="button"
          onClick={handleDownloadExcel}
          disabled={downloading}
          style={{
            marginTop: 10,
            padding: "10px 16px",
            background: downloading ? "#90caf9" : "#4caf50",
            color: "white",
            borderRadius: 6,
            border: "none",
            cursor: downloading ? "not-allowed" : "pointer",
            width: "100%"
          }}
        >
          {downloading ? "Формируем..." : "📄 Скачать Excel договор"}
        </button>
      )}
    </div>
  );
};


