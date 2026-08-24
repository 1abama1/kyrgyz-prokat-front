import { useState } from "react";
import { ToolStatusBadge } from "./ToolStatusBadge";
import type { CategoryFullDto } from "../types/inventory.types";

interface InventoryTreeProps {
  categories: CategoryFullDto[];
  searchActive?: boolean;
  onToolOpen?: (toolId: number) => void;
  onTemplateOpen?: (templateId: string) => void;
  onTemplateEdit?: (templateId: string) => void;
  onAddTemplate?: (categoryId: string) => void;
  onAddTool?: (templateId: string, categoryId: string) => void;
  onBookTool?: (toolId: number, toolInstanceNumber: number | undefined, templateId: string, templateName: string) => void;
  onViewBooking?: (bookingId: string) => void;
}

export const InventoryTree = ({
  categories,
  searchActive,
  onTemplateOpen,
  onAddTemplate,
  onAddTool,
  onBookTool,
  onViewBooking
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
      {(categories || []).map((cat) => {
        const categoryOpen = searchActive || openCategories.has(cat.id);
        const templates = cat.templates || [];

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
                  {templates.length} моделей
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
                {templates.length === 0 && (
                  <p className="tree-empty">Нет моделей</p>
                )}

                {templates.map((tpl) => {
                  const templateOpen = searchActive || openTemplates.has(tpl.id);
                  const tools = tpl.tools || [];

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
                            {tools.length} экз.
                          </span>
                        </button>
                        
                        

                        {onTemplateOpen && (
                          <button
                            className="btn-small btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTemplateOpen(tpl.id);
                            }}
                            style={{ marginLeft: 8 }}
                          >
                            Открыть
                          </button>
                        )}

                        {onAddTool && (
                          <button
                            className="btn-small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddTool(tpl.id, cat.id);
                            }}
                            style={{ marginLeft: 8 }}
                          >
                            + Экземпляр
                          </button>
                        )}
                      </div>

                      {templateOpen && (
                        <div className="tree-template-body">
                          {tools.length === 0 ? (
                            <p className="tree-empty nested">Нет экземпляров</p>
                          ) : (
                            <ul className="tree-tools">
                              {tools.map((tool) => (
                                <li key={tool.id} className="tree-tool">
                                  <div className="tree-tool-main">
                                    <span className="tree-tool-name">
                                      №{tool.instanceNumber ?? tool.id} — {tool.name}
                                    </span>
                                    <ToolStatusBadge status={tool.activeBookingId ? "BOOKED" : tool.status} />
                                  </div>
                                    {tool.activeBookingId ? (
                                      onViewBooking && (
                                        <button
                                          className="btn-small btn-secondary"
                                          style={{ marginLeft: 8 }}
                                          onClick={() => onViewBooking(tool.activeBookingId!)}
                                        >
                                          Посмотреть бронь
                                        </button>
                                      )
                                    ) : onBookTool ? (
                                      <button
                                        className="btn-small btn-primary"
                                        style={{ marginLeft: 8 }}
                                        onClick={() => onBookTool(tool.id, tool.instanceNumber, tpl.id, tpl.name)}
                                      >
                                        Забронировать
                                      </button>
                                    ) : null}
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

