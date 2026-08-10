import { useState } from "react";
import { ToolStatusBadge } from "./ToolStatusBadge";
import type { CategoryFullDto } from "../types/inventory.types";

interface InventoryTreeProps {
  categories: CategoryFullDto[];
  searchActive?: boolean;
  onToolOpen?: (toolId: number) => void;
  onTemplateOpen?: (templateId: string) => void;
  onAddTemplate?: (categoryId: string) => void;
  onAddTool?: (templateId: string, categoryId: string) => void;
}

export const InventoryTree = ({
  categories,
  searchActive,
  onToolOpen,
  onTemplateOpen,
  onAddTemplate,
  onAddTool
}: InventoryTreeProps) => {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [openTemplates, setOpenTemplates] = useState<Set<string>>(new Set());

  const toggleCategory = (id: string) => {
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

  const toggleTemplate = (id: string) => {
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
        const categoryOpen = searchActive || openCategories.has(cat.id);

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
                  const templateOpen = searchActive || openTemplates.has(tpl.id);

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
                        
                        {onTemplateOpen && (
                          <button
                            className="btn-small"
                            style={{ marginRight: 8 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTemplateOpen(tpl.id);
                            }}
                          >
                            Бронирования
                          </button>
                        )}

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

