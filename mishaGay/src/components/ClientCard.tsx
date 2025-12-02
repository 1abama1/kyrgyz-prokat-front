import React, { useEffect, useMemo, useState } from "react";
import { getAvailableTools, closeContract, downloadExcelContract } from "../api/contracts";
import { getToolTemplates } from "../api/tools";
import { getClientCard } from "../api/clients";
import type { Tool } from "../types/tool.types";
import type { ClientCard as ClientCardResponse } from "../types/client.types";

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
  const [templates, setTemplates] = useState<Tool[]>([]);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedTool, setSelectedTool] = useState<number | null>(null);

  const [contractNumber, setContractNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");

  const [loadingDownload, setLoadingDownload] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  useEffect(() => {
    loadClient();
    loadTemplates();
  }, [clientId]);

  useEffect(() => {
    setAvailableTools([]);
    setSelectedTool(null);

    if (selectedTemplate) {
      loadAvailable(selectedTemplate);
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

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await getToolTemplates();
      setTemplates(data);
    } catch (err: any) {
      alert(err?.message || "Ошибка загрузки шаблонов");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadAvailable = async (templateId: number) => {
    try {
      setLoadingAvailable(true);
      const data = await getAvailableTools(templateId);
      setAvailableTools(data);
    } catch (err: any) {
      alert(err?.message || "Не удалось загрузить доступные инструменты");
    } finally {
      setLoadingAvailable(false);
    }
  };

  const downloadExcel = async () => {
    if (!selectedTemplate || !selectedTool || !contractNumber.trim() || !totalAmount || !expectedReturnDate) {
      alert("Заполните все поля перед скачиванием");
      return;
    }

    const amount = Number(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Сумма должна быть положительным числом");
      return;
    }

    setLoadingDownload(true);
    try {
      const { blob, filename } = await downloadExcelContract({
        clientId,
        toolId: selectedTool,
        contractNumber: contractNumber.trim(),
        expectedReturnDate,
        totalAmount: amount
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `Договор_${client?.fullName || clientId}.xlsx`;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      await loadClient();
      await loadAvailable(selectedTemplate);
    } catch (err: any) {
      const message = err?.message || err?.response?.data?.message || "Неизвестная ошибка";
      alert("Ошибка: " + message);
    } finally {
      setLoadingDownload(false);
    }
  };

  const breakContract = async () => {
    const contractId =
      client?.activeContractId ??
      client?.activeContracts?.[0]?.id ??
      null;

    if (!contractId) return;

    if (!window.confirm("Вы уверены, что хотите разорвать аренду?")) {
      return;
    }

    try {
      await closeContract(contractId);
      await loadClient();
      if (selectedTemplate) {
        await loadAvailable(selectedTemplate);
      }
    } catch (err: any) {
      const message = err?.message || "Ошибка при закрытии аренды";
      alert(message);
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(templates.map(t => t.categoryName))),
    [templates]
  );

  const filteredTemplates = useMemo(() => {
    if (!selectedCategory) return templates;
    return templates.filter(t => t.categoryName === selectedCategory);
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
      <p><b>Email:</b> {client.email || "—"}</p>
      <p><b>Тег:</b> {client.tag ?? "—"}</p>


      <div className="contract-form mt-4" style={{ marginTop: 16 }}>
        <h3>Создать Excel договор</h3>

        <select
          className="form-select"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedTemplate(null);
              setSelectedTool(null);
              setAvailableTools([]);
            }}
          >
            <option value="">Выберите категорию</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
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

          <select
            className="form-select mt-2"
            disabled={!selectedTemplate || availableTools.length === 0}
            value={selectedTool ?? ""}
            onChange={(e) => setSelectedTool(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Выберите инструмент</option>
            {availableTools.map(tool => (
              <option key={tool.id} value={tool.id}>
                {tool.name} / SN: {tool.serialNumber}
              </option>
            ))}
          </select>

          {selectedTemplate && !loadingAvailable && availableTools.length === 0 && (
            <div style={{ color: "red", marginTop: 8 }}>
              Нет доступных инструментов для выбранного шаблона
            </div>
          )}

          <input
            className="form-control mt-2"
            placeholder="Номер договора"
            value={contractNumber}
            onChange={(e) => setContractNumber(e.target.value)}
          />

          <input
            className="form-control mt-2"
            type="date"
            placeholder="Плановая дата возврата"
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
          />

          <input
            className="form-control mt-2"
            type="number"
            placeholder="Сумма аренды"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            min="0"
            step="100"
          />

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