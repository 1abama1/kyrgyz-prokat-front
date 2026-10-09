import { useState, useCallback, useEffect, FC } from "react";
import { ToolStatusBadge } from "./ToolStatusBadge";
import { HighlightText } from "./HighlightText";
import type { CategoryFullDto } from "../types/inventory.types";

interface InventoryTreeProps {
  categories: CategoryFullDto[];
  searchActive?: boolean;
  searchQuery?: string;
  highlightedToolId?: number | null;
  highlightedTemplateId?: string | null;
  highlightedCategoryId?: string | null;
  addingToolTemplateId?: string | null;
  onToolOpen?: (toolId: number) => void;
  onTemplateOpen?: (templateId: string) => void;
  onTemplateEdit?: (templateId: string) => void;
  onAddTemplate?: (categoryId: string) => void;
  onAddTool?: (templateId: string, categoryId: string) => void;
  onBookTool?: (
    toolId: number,
    toolInstanceNumber: number | undefined,
    templateId: string,
    templateName: string,
    dailyRentalPrice?: number,
    depositAmount?: number
  ) => void;
  onViewBooking?: (bookingId: string) => void;
}

function usePersistentSet(key: string) {
  const [set, setSet] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const toggle = useCallback(
    (id: string) => {
      setSet((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        try {
          localStorage.setItem(key, JSON.stringify([...next]));
        } catch (e) {
          console.error(e);
        }
        return next;
      });
    },
    [key]
  );

  return [set, toggle, setSet] as const;
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} ${many}`;
  if (mod10 === 1) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

export const InventoryTree: FC<InventoryTreeProps> = ({
  categories,
  searchActive,
  searchQuery = "",
  highlightedToolId,
  highlightedTemplateId,
  highlightedCategoryId,
  addingToolTemplateId,
  onTemplateOpen,
  onTemplateEdit,
  onAddTemplate,
  onAddTool,
  onBookTool,
  onViewBooking,
}) => {
  const [openCategories, toggleCategory, setOpenCategories] = usePersistentSet("inv:cats");
  const [openTemplates, toggleTemplate, setOpenTemplates] = usePersistentSet("inv:tpls");

  // Автоматически раскрываем добавленную модель и категорию
  useEffect(() => {
    if (highlightedCategoryId) {
      setOpenCategories((prev) => {
        const next = new Set(prev);
        next.add(highlightedCategoryId);
        try {
          localStorage.setItem("inv:cats", JSON.stringify([...next]));
        } catch {
          // ignore
        }
        return next;
      });
    }
    if (highlightedTemplateId) {
      setOpenTemplates((prev) => {
        const next = new Set(prev);
        next.add(highlightedTemplateId);
        try {
          localStorage.setItem("inv:tpls", JSON.stringify([...next]));
        } catch {
          // ignore
        }
        return next;
      });
    }
  }, [highlightedCategoryId, highlightedTemplateId, setOpenCategories, setOpenTemplates]);

  const handleExpandAll = () => {
    const allCatIds = (categories || []).map((c) => c.id);
    const allTplIds = (categories || []).flatMap((c) => (c.templates || []).map((t) => t.id));
    setOpenCategories(new Set(allCatIds));
    try {
      localStorage.setItem("inv:cats", JSON.stringify(allCatIds));
    } catch {
      // ignore
    }
    setOpenTemplates(new Set(allTplIds));
    try {
      localStorage.setItem("inv:tpls", JSON.stringify(allTplIds));
    } catch {
      // ignore
    }
  };

  const handleCollapseAll = () => {
    setOpenCategories(new Set());
    try {
      localStorage.setItem("inv:cats", JSON.stringify([]));
    } catch {
      // ignore
    }
    setOpenTemplates(new Set());
    try {
      localStorage.setItem("inv:tpls", JSON.stringify([]));
    } catch {
      // ignore
    }
  };

  return (
    <div className="inventory-tree">
      <div className="tree-toolbar">
        <div className="tree-toolbar-info">
          {pluralize(categories.length, "категория", "категории", "категорий")}
        </div>
        <div className="tree-toolbar-actions">
          <button
            type="button"
            className="tree-toolbar-btn"
            onClick={handleExpandAll}
            title="Развернуть все категории и модели"
          >
            Развернуть всё
          </button>
          <button
            type="button"
            className="tree-toolbar-btn"
            onClick={handleCollapseAll}
            title="Свернуть все категории и модели"
          >
            Свернуть всё
          </button>
        </div>
      </div>

      {(categories || []).map((cat) => {
        const categoryOpen = searchActive || openCategories.has(cat.id);
        const templates = cat.templates || [];

        // Сводка по категории
        const allTools = templates.flatMap((t) => t.tools || []);
        const catBooked = allTools.filter(
          (t) => t.activeBookingId || t.status === "BOOKED" || t.status === "RENTED"
        ).length;
        const catRepair = allTools.filter(
          (t) => t.status === "IN_REPAIR" || t.status === "BROKEN"
        ).length;
        const catFree = allTools.filter(
          (t) => !t.activeBookingId && (t.status === "AVAILABLE" || !t.status)
        ).length;

        return (
          <div key={cat.id} className="tree-category">
            <div className="tree-category-header">
              <button
                type="button"
                className="tree-toggle"
                onClick={() => toggleCategory(cat.id)}
                aria-expanded={categoryOpen}
              >
                <span className={`tree-arrow ${categoryOpen ? "open" : ""}`} aria-hidden="true">
                  ▶
                </span>
                <span className="tree-title category-title">
                  <HighlightText text={cat.name} query={searchQuery} />
                </span>
                <span className="tree-meta">
                  <span>{pluralize(templates.length, "модель", "модели", "моделей")}</span>
                  {allTools.length > 0 ? (
                    <>
                      {" · "}
                      <span className="dot dot-free" /> {catFree} свободно
                      {catBooked > 0 && (
                        <>
                          {" · "}
                          <span className="dot dot-booked" /> {catBooked} в брони
                        </>
                      )}
                      {catRepair > 0 && (
                        <>
                          {" · "}
                          <span className="dot dot-repair" /> {catRepair} в ремонте
                        </>
                      )}
                    </>
                  ) : (
                    <> · 0 экз.</>
                  )}
                </span>
              </button>

              {onAddTemplate && (
                <button
                  type="button"
                  className="btn-secondary tree-category-add-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddTemplate(cat.id);
                  }}
                  title="Добавить модель в эту категорию"
                >
                  + Модель
                </button>
              )}
            </div>

            {categoryOpen && (
              <div className="tree-category-body">
                {templates.length === 0 && <p className="tree-empty">Нет моделей</p>}

                {templates.map((tpl) => {
                  const templateOpen = searchActive || openTemplates.has(tpl.id);
                  const tools = tpl.tools || [];

                  // Сводка по модели
                  const tplBooked = tools.filter(
                    (t) => t.activeBookingId || t.status === "BOOKED" || t.status === "RENTED"
                  ).length;
                  const tplRepair = tools.filter(
                    (t) => t.status === "IN_REPAIR" || t.status === "BROKEN"
                  ).length;
                  const tplFree = tools.filter(
                    (t) => !t.activeBookingId && (t.status === "AVAILABLE" || !t.status)
                  ).length;

                  return (
                    <div key={tpl.id} className="tree-template">
                      <div className="tree-template-header">
                        <button
                          type="button"
                          className="tree-toggle nested"
                          onClick={() => toggleTemplate(tpl.id)}
                          aria-expanded={templateOpen}
                        >
                          <span className={`tree-arrow ${templateOpen ? "open" : ""}`} aria-hidden="true">
                            ▶
                          </span>
                          <span
                            className="tree-title template-title-link"
                            onClick={(e) => {
                              if (onTemplateOpen) {
                                e.stopPropagation();
                                onTemplateOpen(tpl.id);
                              }
                            }}
                            title="Нажмите, чтобы открыть страницу модели"
                          >
                            <HighlightText text={tpl.name} query={searchQuery} />
                          </span>
                          <span className="tree-meta">
                            {tools.length === 0 ? (
                              "0 экз."
                            ) : (
                              <>
                                <span className="dot dot-free" /> {tplFree} свободно
                                {tplBooked > 0 && (
                                  <>
                                    {" · "}
                                    <span className="dot dot-booked" /> {tplBooked} в брони
                                  </>
                                )}
                                {tplRepair > 0 && (
                                  <>
                                    {" · "}
                                    <span className="dot dot-repair" /> {tplRepair} в ремонте
                                  </>
                                )}
                              </>
                            )}
                          </span>
                        </button>

                        <div className="tree-actions">
                          {onAddTool && (
                            <button
                              type="button"
                              className="btn-small tree-action-btn"
                              disabled={addingToolTemplateId === tpl.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddTool(tpl.id, cat.id);
                              }}
                              title="Создать новый экземпляр этой модели"
                            >
                              {addingToolTemplateId === tpl.id ? "Добавление..." : "+ Экземпляр"}
                            </button>
                          )}

                          {onTemplateEdit && (
                            <button
                              type="button"
                              className="btn-small btn-secondary tree-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTemplateEdit(tpl.id);
                              }}
                              title="Редактировать параметры модели"
                            >
                              ✎ Редактировать
                            </button>
                          )}
                        </div>
                      </div>

                      {templateOpen && (
                        <div className="tree-template-body">
                          {tools.length === 0 ? (
                            <p className="tree-empty nested">Нет экземпляров</p>
                          ) : (
                            <ul className="tree-tools">
                              {tools.map((tool) => {
                                const isHighlighted = highlightedToolId === tool.id;
                                const isBooked = !!tool.activeBookingId || tool.status === "BOOKED" || tool.status === "RENTED";
                                const isRepair = tool.status === "IN_REPAIR" || tool.status === "BROKEN";

                                return (
                                  <li
                                    key={tool.id}
                                    className={`tree-tool ${isHighlighted ? "tree-tool-highlighted" : ""}`}
                                  >
                                    <div className="tree-tool-main">
                                      <span className="tree-tool-num">
                                        №{tool.instanceNumber ?? tool.id}
                                      </span>
                                      <span className="tree-tool-name">
                                        <HighlightText text={tool.name} query={searchQuery} />
                                        {tool.inventoryNumber && (
                                          <span className="tree-tool-inv">
                                            {" "}
                                            [<HighlightText text={tool.inventoryNumber} query={searchQuery} />]
                                          </span>
                                        )}
                                      </span>
                                      <ToolStatusBadge status={tool.activeBookingId ? "BOOKED" : tool.status} />
                                    </div>

                                    <div className="tree-tool-action">
                                      {isBooked ? (
                                        onViewBooking && tool.activeBookingId && (
                                          <button
                                            type="button"
                                            className="btn-small btn-booked-action"
                                            onClick={() => onViewBooking(tool.activeBookingId!)}
                                          >
                                            Посмотреть бронь
                                          </button>
                                        )
                                      ) : isRepair ? (
                                        <span className="tree-tool-repair-hint">На ремонте</span>
                                      ) : onBookTool ? (
                                        <button
                                          type="button"
                                          className="btn-small btn-primary"
                                          onClick={() =>
                                            onBookTool(
                                              tool.id,
                                              tool.instanceNumber,
                                              tpl.id,
                                              tpl.name,
                                              tpl.dailyRentalPrice,
                                              tpl.depositAmount
                                            )
                                          }
                                        >
                                          Забронировать
                                        </button>
                                      ) : null}
                                    </div>
                                  </li>
                                );
                              })}
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
