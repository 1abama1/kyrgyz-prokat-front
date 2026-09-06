import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { categoriesAPI } from "../api/categories";
import { CategoryFullDto } from "../types/inventory.types";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { InventoryTree } from "../components/InventoryTree";
import { BookingModal } from "../components/BookingModal";
import { toolsAPI } from "../api/tools";
import { db } from "../db/db";
import { useLocalFirst } from "../hooks/useLocalFirst";
import "../styles/tools.css";

export const ToolsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    toolInstanceId: number;
    toolInstanceNumber?: number;
    templateId: string;
    templateName: string;
  }>({
    isOpen: false,
    toolInstanceId: 0,
    templateId: "",
    templateName: "",
  });

  // ── Local-First: собираем CategoryFullDto из трёх таблиц Dexie ──────────────
  //
  // useLiveQuery реагирует на любое изменение в categories/templates/tools.
  // Это значит: при фоновом pull → таблицы обновились → UI перерисовался сам.
  //
  const { data: categories = [], loading } = useLocalFirst<CategoryFullDto[]>(
    // 1. Реактивная сборка вложенной структуры из Dexie
    async () => {
      const cats = await db.categories.toArray();
      const tmpls = await db.templates.toArray();
      const tools = await db.tools.toArray();

      return cats.map((cat) => ({
        id: cat.id,
        name: cat.name,
        templates: tmpls
          .filter((t) => String(t.categoryId) === String(cat.id))
          .map((t) => ({
            id: t.id,
            name: t.name,
            categoryId: cat.id,
            dailyRentalPrice: 0,
            depositAmount: 0,
            purchasePrice: 0,
            tools: tools.filter((tool) => {
              const toolTplId =
                (tool as any).templateId ||
                (tool as any).template?.id ||
                (tool as any).toolTemplateId;
              return String(toolTplId) === String(t.id);
            }) as any[],
          })),
      })) as CategoryFullDto[];
    },
    // 2. Фоновый HTTP-запрос → кэширует в Dexie → LiveQuery обновит UI
    () => categoriesAPI.getAllFull()
  );

  // ── Сортировка и фильтрация (чисто в памяти) ────────────────────────────────
  const filteredAndSortedCategories = useMemo(() => {
    let result = (categories || []).map((cat) => ({
      ...cat,
      templates: (cat.templates || [])
        .map((tpl) => ({
          ...tpl,
          tools: [...(tpl.tools || [])].sort(
            (a, b) => (a.instanceNumber || a.id) - (b.instanceNumber || b.id)
          ),
        }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    if (!searchQuery.trim()) return result;

    const q = searchQuery.toLowerCase().trim();

    return result.map((cat) => {
      const catMatch = (cat.name || "").toLowerCase().includes(q);
      const filteredTemplates = (cat.templates || [])
        .map((tpl) => {
          const tplMatch = (tpl.name || "").toLowerCase().includes(q);
          const filteredTools = (tpl.tools || []).filter(
            (tool) =>
              (tool.name || "").toLowerCase().includes(q) ||
              (tool.instanceNumber && String(tool.instanceNumber).includes(q)) ||
              (tool.inventoryNumber && tool.inventoryNumber.toLowerCase().includes(q))
          );
          if (catMatch || tplMatch || filteredTools.length > 0) {
            return {
              ...tpl,
              tools: catMatch || tplMatch ? tpl.tools || [] : filteredTools,
            };
          }
          return null;
        })
        .filter(Boolean) as any[];

      if (catMatch || filteredTemplates.length > 0) {
        return {
          ...cat,
          templates:
            catMatch && filteredTemplates.length === 0
              ? cat.templates || []
              : filteredTemplates,
        };
      }
      return null;
    }).filter(Boolean) as CategoryFullDto[];
  }, [categories, searchQuery]);

  if (loading) {
    return (
      <Layout>
        <div className="tools-loading">
          <p>Загрузка...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="tools-page">
        <div className="tools-page-header">
          <h1 className="tools-page-title">Инвентарь</h1>
          <button
            onClick={() => navigate("/categories/create")}
            className="btn-primary"
          >
            + Категория
          </button>
        </div>

        <div className="tools-search-container" style={{ marginBottom: "20px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Поиск по категории, модели, названию или номеру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", maxWidth: "600px" }}
          />
        </div>

        {filteredAndSortedCategories.length === 0 ? (
          <div className="tools-empty">
            <p>Категории не найдены. Создайте первую категорию.</p>
          </div>
        ) : (
          <InventoryTree
            categories={filteredAndSortedCategories}
            searchActive={!!searchQuery.trim()}
            onAddTemplate={(catId) => navigate(`/templates/create?categoryId=${catId}`)}
            onTemplateOpen={(tplId) => navigate(`/templates/${tplId}`)}
            onTemplateEdit={(tplId) => navigate(`/templates/edit/${tplId}`)}
            onAddTool={async (tplId) => {
              try {
                await toolsAPI.createBatch({ templateId: tplId, count: 1 });
                // Не нужно вызывать load() — LiveQuery обновит сам после sync
              } catch (err) {
                console.error("Ошибка при создании экземпляра:", err);
                alert("Не удалось создать экземпляр");
              }
            }}
            onBookTool={(toolId, toolNumber, templateId, templateName) => {
              setBookingModal({
                isOpen: true,
                toolInstanceId: toolId,
                toolInstanceNumber: toolNumber,
                templateId,
                templateName,
              });
            }}
            onViewBooking={(bookingId) => {
              navigate(`/bookings/${bookingId}`);
            }}
          />
        )}
      </div>

      <BookingModal
        isOpen={bookingModal.isOpen}
        onClose={() => setBookingModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          // LiveQuery обновит статусы инструментов автоматически после sync
        }}
        toolInstanceId={bookingModal.toolInstanceId}
        toolInstanceNumber={bookingModal.toolInstanceNumber}
        templateId={bookingModal.templateId}
        templateName={bookingModal.templateName}
      />
    </Layout>
  );
};
