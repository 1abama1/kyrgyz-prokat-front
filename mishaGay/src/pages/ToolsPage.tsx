import { useEffect, useState } from "react";
import { categoriesAPI } from "../api/categories";
import { CategoryFullDto } from "../types/inventory.types";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { InventoryTree } from "../components/InventoryTree";
import "../styles/buttons.css";
import "../styles/tools.css";
  
export const ToolsPage = () => {
  const [categories, setCategories] = useState<CategoryFullDto[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);

    try {
      // получаем список категорий
      const shortCats = await categoriesAPI.getAll();

      // на каждую категорию получаем полную структуру
      const fullData: CategoryFullDto[] = [];
      for (const cat of shortCats) {
        const full = await categoriesAPI.getFull(cat.id);
        fullData.push(full);
      }

      setCategories(fullData);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    } finally {
      setLoading(false);
    }
  };

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

        {categories.length === 0 ? (
          <div className="tools-empty">
            <p>Категории не найдены. Создайте первую категорию.</p>
          </div>
        ) : (
          <InventoryTree
            categories={categories}
            onAddTemplate={(catId) => navigate(`/templates/create?categoryId=${catId}`)}
            onAddTool={(tplId, catId) => navigate(`/tools/create?templateId=${tplId}&categoryId=${catId}`)}
            onToolOpen={(toolId) => navigate(`/tools/${toolId}`)}
          />
        )}
      </div>
    </Layout>
  );
};
