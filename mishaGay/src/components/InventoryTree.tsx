import { useState } from "react";
import { ToolStatusBadge } from "./ToolStatusBadge";
import type { CategoryFullDto } from "../types/inventory.types";

interface InventoryTreeProps {
  categories: CategoryFullDto[];
  onToolOpen?: (toolId: number) => void;
  onAddTemplate?: (categoryId: number) => void;
  onAddTool?: (templateId: number, categoryId: number) => void;
}

export const InventoryTree = ({
  categories,
  onToolOpen,
  onAddTemplate,
  onAddTool
}: InventoryTreeProps) => {
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());
  const [openTemplates, setOpenTemplates] = useState<Set<number>>(new Set());

  const toggleCategory = (id: number) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleTemplate = (id: number) => {
    setOpenTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="inventory-tree">
      {categories.map((cat) => {
        const categoryOpen = openCategories.has(cat.id);

        return (
          <div key={cat.id} className="tree-category">
            <div className="tree-category-header">
              <button
                type="button"
                className="tree-toggle"
                onClick={() => toggleCategory(cat.id)}
              >
                <span className={`tree-arrow ${categoryOpen ? "open" : ""}`}>▶</span>
                <span className="tree-title">{cat.name}</span>
                <span className="tree-meta">
                  {cat.templates.length} моделей
                </span>
              </button>

              {onAddTemplate && (
                <button
                  className="btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddTemplate(cat.id);
                  }}
                >
                  + Модель
                </button>
              )}
            </div>

            {categoryOpen && (
              <div className="tree-category-body">
                {cat.templates.length === 0 && (
                  <p className="tree-empty">Нет моделей</p>
                )}

                {cat.templates.map((tpl) => {
                  const templateOpen = openTemplates.has(tpl.id);

                  return (
                    <div key={tpl.id} className="tree-template">
                      <div className="tree-template-header">
                        <button
                          type="button"
                          className="tree-toggle nested"
                          onClick={() => toggleTemplate(tpl.id)}
                        >
                          <span className={`tree-arrow ${templateOpen ? "open" : ""}`}>▶</span>
                          <span className="tree-title">• {tpl.name}</span>
                          <span className="tree-meta">
                            {tpl.tools.length} экз.
                          </span>
                        </button>

                        {onAddTool && (
                          <button
                            className="btn-small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddTool(tpl.id, cat.id);
                            }}
                          >
                            + Экземпляр
                          </button>
                        )}
                      </div>

                      {templateOpen && (
                        <div className="tree-template-body">
                          {tpl.tools.length === 0 ? (
                            <p className="tree-empty nested">Нет экземпляров</p>
                          ) : (
                            <ul className="tree-tools">
                              {tpl.tools.map((tool) => (
                                <li key={tool.id} className="tree-tool">
                                  <div className="tree-tool-main">
                                    <span className="tree-tool-name">
                                      №{tool.instanceNumber ?? tool.id} — {tool.name}
                                    </span>
                                    <ToolStatusBadge status={tool.status} />
                                  </div>
                                  {onToolOpen && (
                                    <button
                                      className="btn-small"
                                      style={{ marginLeft: 8 }}
                                      onClick={() => onToolOpen(tool.id)}
                                    >
                                      Открыть →
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

