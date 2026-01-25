import { useEffect, useMemo, useState } from "react";
import { downloadExcelContract } from "../api/contracts";
import { templatesAPI } from "../api/templates";
import { categoriesAPI } from "../api/categories";
import { getClientCard } from "../api/clients";
import type { ToolInstance } from "../types/tool.types";
import type { ToolTemplate } from "../types/template.types";
import type { ToolCategory } from "../types/category.types";
import type { ClientCard as ClientCardResponse } from "../types/client.types";
import { ToolInstanceSelect } from "./ToolInstanceSelect";

interface ClientCardProps {
  clientId: number;
}

const normalizeClient = (data: ClientCardResponse): ClientCardResponse => ({
  ...data,
  activeContractId: data.activeContractId ?? data.activeContracts?.[0]?.id ?? null,
  activeContractNumber: data.activeContractNumber ?? data.activeContracts?.[0]?.contractNumber ?? null
});

export default function ClientCard({ clientId }: ClientCardProps) {
  const [client, setClient] = useState<ClientCardResponse | null>(null);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [templates, setTemplates] = useState<ToolTemplate[]>([]);
  const [templateTools, setTemplateTools] = useState<ToolInstance[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedTool, setSelectedTool] = useState<number | null>(null);

  const [loadingDownload, setLoadingDownload] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  useEffect(() => {
    loadClient();
    loadCategories();
    loadTemplates();
  }, [clientId]);

  useEffect(() => {
    setTemplateTools([]);
    setSelectedTool(null);

    if (selectedTemplate) {
      loadTemplateTools(selectedTemplate);
    }
  }, [selectedTemplate]);

  const loadClient = async () => {
    try {
      setLoadingClient(true);
      const data = await getClientCard(clientId);
      setClient(normalizeClient(data));
    } catch (err: any) {
      alert(err?.message || "Ошибка загрузки клиента");
    } finally {
      setLoadingClient(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoriesAPI.getAll();
      setCategories(data);
    } catch (err: any) {
      alert(err?.message || "Ошибка загрузки категорий");
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await templatesAPI.getAll();
      setTemplates(data);
    } catch (err: any) {
      alert(err?.message || "Ошибка загрузки шаблонов");
    }
  };

  const loadTemplateTools = async (templateId: number) => {
    try {
      setLoadingAvailable(true);
      const data = await templatesAPI.getFull(templateId);
      setTemplateTools(data.tools ?? []);
    } catch (err: any) {
      alert(err?.message || "Не удалось загрузить инструменты");
    } finally {
      setLoadingAvailable(false);
    }
  };

  const downloadExcel = async () => {
    if (!selectedTemplate || !selectedTool) {
      alert("Заполните все поля перед скачиванием");
      return;
    }

    setLoadingDownload(true);
    try {
      const { blob, filename } = await downloadExcelContract({
        clientId,
        toolId: selectedTool
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `Договор_${client?.fullName || clientId}.xlsx`;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      await loadClient();
      await loadTemplateTools(selectedTemplate);
    } catch (err: any) {
      const message = err?.message || err?.response?.data?.message || "Неизвестная ошибка";
      alert("Ошибка: " + message);
    } finally {
      setLoadingDownload(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!selectedCategory) return templates;
    return templates.filter(t => t.categoryId === selectedCategory);
  }, [templates, selectedCategory]);

  if (loadingClient && !client) {
    return <div>Загрузка...</div>;
  }

  if (!client) {
    return <div>Данные клиента недоступны</div>;
  }

  return (
    <div className="client-card">
      <h2>{client.fullName}</h2>
      <p><b>Тел:</b> {client.phone || "—"}</p>
      <p><b>WhatsApp:</b> {client.whatsappPhone || client.phone || "—"}</p>
      <p><b>Email:</b> {client.email || "—"}</p>
      <p><b>Тег:</b> {client.tag ?? "—"}</p>
      <p>
        <b>Адрес регистрации:</b>{" "}
        {client.registrationAddress
          ? `${client.registrationAddress.region || ""}, ${client.registrationAddress.street || ""}`.trim() || "—"
          : "—"}
      </p>
      <p>
        <b>Адрес проживания:</b>{" "}
        {client.livingAddress
          ? `${client.livingAddress.region || ""}, ${client.livingAddress.street || ""}`.trim() || "—"
          : "—"}
      </p>
      <p><b>Адрес объекта:</b> {client.objectAddress || "—"}</p>

      <div className="contract-form mt-4" style={{ marginTop: 16 }}>
        <h3>Создать Excel договор</h3>

        <select
          className="form-select"
          value={selectedCategory ?? ""}
          onChange={(e) => {
            const value = e.target.value ? Number(e.target.value) : null;
            setSelectedCategory(value);
            setSelectedTemplate(null);
            setSelectedTool(null);
            setTemplateTools([]);
          }}
        >
          <option value="">Выберите категорию</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          className="form-select mt-2"
          disabled={!selectedCategory}
          value={selectedTemplate ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedTemplate(value ? Number(value) : null);
          }}
        >
          <option value="">Выберите модель</option>
          {filteredTemplates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>

        <ToolInstanceSelect
          tools={templateTools}
          value={selectedTool}
          onChange={setSelectedTool}
          placeholder={templateTools.length === 0 ? "Нет экземпляров" : "Выберите экземпляр"}
          isDisabled={!selectedTemplate || loadingAvailable}
        />

        {selectedTemplate && !loadingAvailable && templateTools.length === 0 && (
          <div style={{ color: "red", marginTop: 8 }}>
            Нет экземпляров для выбранного шаблона
          </div>
        )}

        <button
          className="btn btn-primary mt-3 w-100"
          onClick={downloadExcel}
          disabled={loadingDownload}
        >
          {loadingDownload ? "Загрузка..." : "Скачать Excel договор"}
        </button>
      </div>

      <h3 className="mt-4">Активные договоры</h3>
      {client.activeContracts?.length ? (
        <ul>
          {client.activeContracts.map(c => (
            <li key={c.id}>
              Договор № {c.contractNumber}
            </li>
          ))}
        </ul>
      ) : (
        <p>Нет активных договоров</p>
      )}
    </div>
  );
}