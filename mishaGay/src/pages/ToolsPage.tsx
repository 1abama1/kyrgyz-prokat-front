import { useEffect, useState, useMemo } from "react";
import { categoriesAPI } from "../api/categories";
import { toolsAPI } from "../api/tools";
import { CategoryFullDto } from "../types/inventory.types";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { InventoryTree } from "../components/InventoryTree";
import { BookingModal } from "../components/BookingModal";
import "../styles/tools.css";
  
export const ToolsPage = () => {
  const [categories, setCategories] = useState<CategoryFullDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

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

  useEffect(() => {
    load();
  }, []);

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const fullData = await categoriesAPI.getAllFull();
      setCategories(fullData);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const filteredAndSortedCategories = useMemo(() => {
    // 1. Sort everything
    let result = categories.map(cat => ({
      ...cat,
      templates: cat.templates.map(tpl => ({
        ...tpl,
        tools: [...tpl.tools].sort((a, b) => (a.instanceNumber || a.id) - (b.instanceNumber || b.id))
      })).sort((a, b) => a.name.localeCompare(b.name))
    })).sort((a, b) => a.name.localeCompare(b.name));

    // 2. Filter if there is a query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      
      result = result.map(cat => {
        const catMatch = cat.name.toLowerCase().includes(q);
        
        const filteredTemplates = cat.templates.map(tpl => {
          const tplMatch = tpl.name.toLowerCase().includes(q);
          const filteredTools = tpl.tools.filter(tool => 
            tool.name.toLowerCase().includes(q) ||
            (tool.instanceNumber && String(tool.instanceNumber).includes(q)) ||
            (tool.inventoryNumber && tool.inventoryNumber.toLowerCase().includes(q))
          );
          
          if (catMatch || tplMatch || filteredTools.length > 0) {
            return {
              ...tpl,
              tools: (catMatch || tplMatch) ? tpl.tools : filteredTools
            };
          }
          return null;
        }).filter(Boolean) as any[];

        if (catMatch || filteredTemplates.length > 0) {
          return {
            ...cat,
            templates: catMatch && filteredTemplates.length === 0 ? cat.templates : filteredTemplates
          };
        }
        return null;
      }).filter(Boolean) as CategoryFullDto[];
    }

    return result;
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
                await load(false);
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
              navigate(`/bookings?id=${bookingId}`);
            }}
          />
        )}
      </div>

      <BookingModal
        isOpen={bookingModal.isOpen}
        onClose={() => setBookingModal(prev => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          // Can show success toast or reload data if needed
        }}
        toolInstanceId={bookingModal.toolInstanceId}
        toolInstanceNumber={bookingModal.toolInstanceNumber}
        templateId={bookingModal.templateId}
        templateName={bookingModal.templateName}
      />
    </Layout>
  );
};
