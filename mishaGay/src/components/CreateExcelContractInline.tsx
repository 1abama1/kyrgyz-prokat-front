import { FC, useEffect, useState } from "react";
import type { ClientCard as ClientCardResponse } from "../types/client.types";
import { ToolInstance } from "../types/tool.types";
import { ToolTemplate } from "../types/template.types";
import { ToolCategory } from "../types/category.types";
import { templatesAPI } from "../api/templates";
import { categoriesAPI } from "../api/categories";
import { contractsAPI } from "../api/contracts";
import { downloadContractExcel } from "../api/excel.api";
import { ErrorMessage } from "./ErrorMessage";
import { ToolInstanceSelect } from "./ToolInstanceSelect";

interface Props {
  client: ClientCardResponse;
  onContractCreated?: () => Promise<void> | void;
}

export const CreateExcelContractInline: FC<Props> = ({ client, onContractCreated }) => {
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [templates, setTemplates] = useState<ToolTemplate[]>([]);
  const [tools, setTools] = useState<ToolInstance[]>([]);

  const [category, setCategory] = useState<number | "">("");
  const [templateId, setTemplateId] = useState<number | "">("");
  const [toolId, setToolId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savingExcel, setSavingExcel] = useState(false);
  const [createdContractId, setCreatedContractId] = useState<number | null>(null);
  const [excelSaved, setExcelSaved] = useState(false);
  const clientHasActiveContract = Boolean(client.hasActiveContract);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [catsData, tmplsData] = await Promise.all([
          categoriesAPI.getAll(),
          templatesAPI.getAll()
        ]);
        setCategories(catsData);
        setTemplates(tmplsData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    setCategory("");
    setTemplateId("");
    setToolId(null);
    setTools([]);
    setError(null);
    setCreatedContractId(null);
  }, [client.id]);

  const handleCategoryChange = (value: number | "") => {
    setCategory(value);
    setTemplateId("");
    setToolId(null);
    setTools([]);
  };

  const handleTemplateChange = async (value: number) => {
    setTemplateId(value);
    setToolId(null);
    setTools([]);

    if (!value) return;

    try {
      setError(null);
      setLoading(true);
      // Грузим все экземпляры шаблона, показываем статусами
      const full = await templatesAPI.getFull(value);
      setTools(full.tools ?? []);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить доступные инструменты");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateId || !toolId) {
      setError("Заполните все поля!");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await contractsAPI.createContract({
        clientId: client.id,
        toolId: Number(toolId)
      });

      setCreatedContractId(res.id);
      
      // Автоматически сохраняем Excel файл после создания договора
      if (res.id && window.contracts) {
        try {
          setSavingExcel(true);
          
          // Скачиваем Excel с бэкенда
          const blob = await downloadContractExcel(res.id);
          const buffer = await blob.arrayBuffer();
          
          // Сохраняем через Electron
          const filePath = await window.contracts.saveExcel(
            buffer,
            `Договор_${res.id}.xlsx`
          );
          
          // Открываем файл
          await window.contracts.openExcel(filePath);
          
          setExcelSaved(true);
        } catch (excelError) {
          console.warn("Failed to save Excel automatically:", excelError);
          // Не показываем ошибку пользователю, просто не сохраняем
        } finally {
          setSavingExcel(false);
        }
      }
      
      await onContractCreated?.();
    } catch (err: any) {
      // Улучшенная обработка ошибок
      const errorMessage = err?.message || err?.error || "Ошибка создания договора";
      
      if (errorMessage.includes("contract_number") || errorMessage.includes("уже существует")) {
        setError("Договор с таким номером уже существует. Пожалуйста, используйте другой номер.");
      } else if (errorMessage.includes("занят") || errorMessage.includes("Инструмент занят") || errorMessage.includes("RENTED")) {
        setError("Этот инструмент уже в аренде. Выберите другой инструмент.");
        // Обновляем список доступных инструментов для выбранной модели
        if (templateId) {
          templatesAPI.getFull(Number(templateId))
            .then((full) => setTools(full.tools ?? []))
            .catch(() => {});
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!templateId || !toolId) {
      setError("Заполните все поля!");
      return;
    }

    try {
      setError(null);
      setDownloading(true);

      // Проверяем, доступен ли Electron API
      if (!window.contracts) {
        setError("Electron API недоступен. Эта функция работает только в Electron приложении.");
        return;
      }

      const { blob, filename } = await contractsAPI.downloadExcel({
        clientId: client.id,
        toolId: Number(toolId)
      });

      // Сохраняем через Electron (проверка уже выполнена выше)
      const buffer = await blob.arrayBuffer();
      const defaultFilename = filename || `Договор_${client.fullName || client.id}.xlsx`;
      const filePath = await window.contracts!.saveExcel(buffer, defaultFilename);
      
      // Открываем сохранённый файл
      await window.contracts!.openExcel(filePath);
    } catch (err: any) {
      const errorMessage = err?.message || "Ошибка при сохранении Excel";
      setError(errorMessage);
      console.error("Error saving Excel:", err);
    } finally {
      setDownloading(false);
    }
  };

  const filteredTemplates = category
    ? templates.filter(t => t.categoryId === category)
    : templates;
  const isCategoryDisabled = clientHasActiveContract || (loading && categories.length === 0);
  const isTemplateDisabled = clientHasActiveContract || !category || loading;
  const shouldHideToolSelect = Boolean(templateId) && !loading && tools.length === 0;
  const isCreateDisabled =
    clientHasActiveContract ||
    creating ||
    !templateId ||
    !toolId ||
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
        onChange={(e) => handleCategoryChange(e.target.value ? Number(e.target.value) : "")}
        style={{ width: "100%", padding: 8, marginTop: 4 }}
      >
        <option value="">Выберите категорию</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
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
            setTools([]);
            setToolId(null);
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
          Нет экземпляров инструмента. Выберите другой шаблон.
        </div>
      ) : (
        <ToolInstanceSelect
          tools={tools}
          value={toolId}
          onChange={(id) => setToolId(id ?? null)}
          placeholder={tools.length === 0 ? "Нет экземпляров" : "Выберите экземпляр"}
          className="mt-1"
        />
      )}

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
          {savingExcel && (
            <div style={{ marginTop: 8, fontSize: "0.9em", opacity: 0.8 }}>
              💾 Сохранение Excel файла...
            </div>
          )}
          {excelSaved && !savingExcel && (
            <div style={{ marginTop: 8, fontSize: "0.9em", opacity: 0.8 }}>
              📄 Excel файл сохранён локально
            </div>
          )}
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


