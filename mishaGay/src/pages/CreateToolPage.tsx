import { FC, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { toolsAPI } from "../api/tools";
import { ErrorMessage } from "../components/ErrorMessage";

export const CreateToolPage: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const [name, setName] = useState("");
  const [inventoryNumber, setInventoryNumber] = useState("");
  const [article, setArticle] = useState("");
  const [description, setDescription] = useState("");
  const [deposit, setDeposit] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");

  // 🔽 ПОДТЯГИВАЕМ ДАННЫЕ ПРИ РЕДАКТИРОВАНИИ
  useEffect(() => {
    if (!isEdit || !id) return;

    setLoadingData(true);
    toolsAPI.getById(Number(id))
      .then((tool) => {
        setName(tool.name || "");
        setInventoryNumber(tool.inventoryNumber || "");
        setArticle(tool.article || "");
        setDescription(tool.description || "");
        setDeposit(tool.deposit?.toString() || "");
        setPurchasePrice(tool.purchasePrice?.toString() || "");
        setPurchaseDate(tool.purchaseDate || "");
      })
      .catch((err: any) => {
        setError(err?.message || "Ошибка загрузки данных инструмента");
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !inventoryNumber) {
      setError("Заполните обязательные поля: название и инвентарный номер");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const toolData = {
        name,
        inventoryNumber,
        article: article || undefined,
        description: description || undefined,
        deposit: deposit ? Number(deposit) : undefined,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        purchaseDate: purchaseDate || undefined,
        status: "AVAILABLE" as const,
        attributes: [],
        images: []
      };

      if (isEdit && id) {
        await toolsAPI.update(Number(id), toolData);
      } else {
        await toolsAPI.create(toolData);
      }

      navigate("/tools");
    } catch (err: any) {
      setError(err?.message || (isEdit ? "Ошибка обновления инструмента" : "Ошибка создания инструмента"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <h1>{isEdit ? "Редактирование инструмента" : "Создать инструмент"}</h1>
      <ErrorMessage error={error} onClose={() => setError(null)} />

      {loadingData && (
        <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
          Загрузка данных...
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: 600, marginTop: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Название <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: 14
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Инвентарный номер <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="text"
            value={inventoryNumber}
            onChange={(e) => setInventoryNumber(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: 14
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Артикул
          </label>
          <input
            type="text"
            value={article}
            onChange={(e) => setArticle(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: 14
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Описание
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: 14,
              fontFamily: "inherit"
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Залог (сом)
          </label>
          <input
            type="number"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            min="0"
            step="100"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: 14
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Цена покупки (сом)
          </label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            min="0"
            step="100"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: 14
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Дата покупки
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: 14
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={loading || loadingData}
            style={{
              padding: "10px 20px",
              background: loading || loadingData ? "#9ca3af" : "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading || loadingData ? "not-allowed" : "pointer",
              fontWeight: 500
            }}
          >
            {loading ? (isEdit ? "Сохранение..." : "Создание...") : (isEdit ? "Сохранить" : "Создать")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/tools")}
            style={{
              padding: "10px 20px",
              background: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 500
            }}
          >
            Отмена
          </button>
        </div>
      </form>
    </Layout>
  );
};

