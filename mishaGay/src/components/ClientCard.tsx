import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { downloadExcelContract, contractsAPI } from "../api/contracts";
import { templatesAPI } from "../api/templates";
import { categoriesAPI } from "../api/categories";
import { getClientCard } from "../api/clients";
import type { ToolInstance } from "../types/tool.types";
import type { ToolTemplate } from "../types/template.types";
import type { ToolCategory } from "../types/category.types";
import type { ClientCard as ClientCardResponse } from "../types/client.types";
import { ToolInstanceSelect } from "./ToolInstanceSelect";
import { StyledSelect } from "./StyledSelect";
import { WhatsAppButton } from "./WhatsAppButton";

interface ClientCardProps {
  clientId: number;
}

const normalizeClient = (data: ClientCardResponse): ClientCardResponse => ({
  ...data,
  activeContractId: data.activeContractId ?? data.activeContracts?.[0]?.id ?? null,
  activeContractNumber: data.activeContractNumber ?? data.activeContracts?.[0]?.contractNumber ?? null
});

export default function ClientCard({ clientId }: ClientCardProps) {
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientCardResponse | null>(null);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [templates, setTemplates] = useState<ToolTemplate[]>([]);
  const [templateTools, setTemplateTools] = useState<ToolInstance[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
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

  const loadTemplateTools = async (templateId: string) => {
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
        toolId: selectedTool! as number
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
      <p style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 .5em" }}>
        <b>WhatsApp (осн):</b>
        <span>{client.whatsappPhone || "—"}</span>
        {client.whatsappPhone && (
          <WhatsAppButton
            phone={client.whatsappPhone}
            variant="link"
          />
        )}
      </p>
      <p><b>Доп. телефон:</b> {client.additionalPhone || "—"}</p>
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
      {/* <p><b>Адрес объекта:</b> {client.objectAddress || "—"}</p> */}

      <div className="contract-form mt-4" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate(`/clients/edit/${clientId}`)}
            style={{
              background: "#fff",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: 500
            }}
          >
            ✏️ Изменить данные
          </button>
        </div>

        <h3>Создать Excel договор</h3>

        <div style={{ marginBottom: 16 }}>
          <StyledSelect
            options={categories.map(category => ({ value: category.id, label: category.name }))}
            value={selectedCategory ?? ""}
            onChange={(val) => {
              const value = val ? String(val) : null;
              setSelectedCategory(value);
              setSelectedTemplate(null);
              setSelectedTool(null);
              setTemplateTools([]);
            }}
            placeholder="Выберите категорию"
            isClearable
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <StyledSelect
            options={filteredTemplates.map(template => ({ value: template.id, label: template.name }))}
            value={selectedTemplate ?? ""}
            onChange={(val) => setSelectedTemplate(val ? String(val) : null)}
            isDisabled={!selectedCategory}
            placeholder="Выберите модель"
            isClearable
          />
        </div>

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
        <ul style={{ listStyle: "none", padding: 0 }}>
          {client.activeContracts.map(c => (
            <li key={c.id} style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", padding: "8px", border: "1px solid #eee", borderRadius: "6px" }}>
              <span>Договор № {c.contractNumber}</span>
              <button 
                onClick={async () => {
                  try {
                    const { blob, filename } = await contractsAPI.downloadExistingExcel(c.id, `Договор_${c.contractNumber}.xlsx`);
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (err: any) {
                    alert("Ошибка при скачивании: " + (err?.message || "Неизвестная ошибка"));
                  }
                }}
                style={{
                  background: "#e8f5e9",
                  color: "#2e7d32",
                  border: "1px solid #c8e6c9",
                  borderRadius: 4,
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  marginLeft: "auto"
                }}
                title="Скачать обновленный Excel договор"
              >
                ⬇️ Обновить Excel
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Нет активных договоров</p>
      )}
    </div>
  );
}
