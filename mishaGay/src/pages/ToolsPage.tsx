import { useState, useMemo, useEffect, useRef } from "react";
import { categoriesAPI } from "../api/categories";
import { CategoryFullDto, TemplateFullDto, ToolDto } from "../types/inventory.types";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { InventoryTree } from "../components/InventoryTree";
import { BookingModal } from "../components/BookingModal";
import { toolsAPI } from "../api/tools";
import { db } from "../db/db";
import { useLocalFirst } from "../hooks/useLocalFirst";
import { useToast } from "../hooks/useToast";
import "../styles/tools.css";

type StatusFilter = "ALL" | "AVAILABLE" | "BOOKED";

export const ToolsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [addingToolTemplateId, setAddingToolTemplateId] = useState<string | null>(null);
  const [highlightedToolId, setHighlightedToolId] = useState<number | null>(null);
  const [highlightedTemplateId, setHighlightedTemplateId] = useState<string | null>(null);
  const [highlightedCategoryId, setHighlightedCategoryId] = useState<string | null>(null);

  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    toolInstanceId: number;
    toolInstanceNumber?: number;
    templateId: string;
    templateName: string;
    dailyRentalPrice?: number;
    depositAmount?: number;
  }>({
    isOpen: false,
    toolInstanceId: 0,
    templateId: "",
    templateName: "",
  });

  // Debounce на ввод поиска (250 мс)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Горячая клавиша '/' для быстрого фокуса на поиск
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Local-First: O(N) сборка CategoryFullDto через Map ─────────────────────
  const { data: categories = [], loading } = useLocalFirst<CategoryFullDto[]>(
    async () => {
      const cats = await db.categories.toArray();
      const tmpls = await db.templates.toArray();
      const tools = await db.tools.toArray();

      // Быстрая группировка инструментов по templateId в Map
      const toolsByTemplateId = new Map<string, ToolDto[]>();
      for (const tool of tools) {
        const raw = tool as ToolDto & { toolTemplateId?: string; template?: { id: string } };
        const toolTplId = String(
          raw.templateId ||
            raw.template?.id ||
            raw.toolTemplateId ||
            ""
        );
        if (!toolsByTemplateId.has(toolTplId)) {
          toolsByTemplateId.set(toolTplId, []);
        }
        toolsByTemplateId.get(toolTplId)!.push(tool as unknown as ToolDto);
      }

      // Быстрая группировка моделей по categoryId в Map
      const templatesByCategoryId = new Map<string, typeof tmpls>();
      for (const tpl of tmpls) {
        const catId = String(tpl.categoryId || "");
        if (!templatesByCategoryId.has(catId)) {
          templatesByCategoryId.set(catId, []);
        }
        templatesByCategoryId.get(catId)!.push(tpl);
      }

      return cats.map((cat) => {
        const catTemplates = templatesByCategoryId.get(String(cat.id)) || [];
        return {
          id: cat.id,
          name: cat.name,
          templates: catTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            categoryId: cat.id,
            dailyRentalPrice: t.dailyRentalPrice ?? 0,
            depositAmount: t.depositAmount ?? 0,
            purchasePrice: t.purchasePrice ?? 0,
            tools: toolsByTemplateId.get(String(t.id)) || [],
          })),
        };
      }) as CategoryFullDto[];
    },
    () => categoriesAPI.getAllFull()
  );

  // ── Сортировка и фильтрация (поиск + чипы статуса) ─────────────────────────
  const filteredAndSortedCategories = useMemo(() => {
    const result = (categories || []).map((cat) => ({
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

    const q = debouncedQuery.toLowerCase().trim();

    return result
      .map((cat) => {
        const catMatch = q ? (cat.name || "").toLowerCase().includes(q) : false;

        const filteredTemplates = (cat.templates || [])
          .map((tpl) => {
            const tplMatch = q ? (tpl.name || "").toLowerCase().includes(q) : false;

            // Фильтрация инструментов по статусу и поиску
            const filteredTools = (tpl.tools || []).filter((tool) => {
              // Фильтр по статусу
              if (statusFilter === "AVAILABLE") {
                const isBooked = !!tool.activeBookingId || tool.status === "BOOKED" || tool.status === "RENTED";
                if (isBooked) return false;
              } else if (statusFilter === "BOOKED") {
                const isBooked = !!tool.activeBookingId || tool.status === "BOOKED" || tool.status === "RENTED";
                if (!isBooked) return false;
              }

              // Фильтр по строке поиска
              if (!q) return true;
              return (
                (tool.name || "").toLowerCase().includes(q) ||
                (tool.instanceNumber && String(tool.instanceNumber).includes(q)) ||
                (tool.inventoryNumber && tool.inventoryNumber.toLowerCase().includes(q))
              );
            });

            // Если совпало имя категории/модели, но включен фильтр статуса — уважаем фильтр статуса
            if (q && (catMatch || tplMatch)) {
              const statusMatchingTools = (tpl.tools || []).filter((tool) => {
                if (statusFilter === "AVAILABLE") {
                  return !tool.activeBookingId && (tool.status === "AVAILABLE" || !tool.status);
                } else if (statusFilter === "BOOKED") {
                  return !!tool.activeBookingId || tool.status === "BOOKED" || tool.status === "RENTED";
                }
                return true;
              });

              if (statusFilter === "ALL" || statusMatchingTools.length > 0) {
                return {
                  ...tpl,
                  tools: statusMatchingTools,
                };
              }
            }

            if (filteredTools.length > 0) {
              return {
                ...tpl,
                tools: filteredTools,
              };
            }

            return null;
          })
          .filter(Boolean) as TemplateFullDto[];

        if (filteredTemplates.length > 0) {
          return {
            ...cat,
            templates: filteredTemplates,
          };
        }
        return null;
      })
      .filter(Boolean) as CategoryFullDto[];
  }, [categories, debouncedQuery, statusFilter]);

  // Счётчики результатов
  const { totalToolsCount, totalTemplatesCount } = useMemo(() => {
    let tools = 0;
    let templates = 0;
    for (const cat of filteredAndSortedCategories) {
      templates += cat.templates?.length || 0;
      for (const tpl of cat.templates || []) {
        tools += tpl.tools?.length || 0;
      }
    }
    return { totalToolsCount: tools, totalTemplatesCount: templates };
  }, [filteredAndSortedCategories]);

  const isSearchOrFilterActive = !!searchQuery.trim() || statusFilter !== "ALL";

  return (
    <Layout>
      <div className="tools-page">
        {/* Sticky шапка с поиском и фильтрами */}
        <div className="tools-sticky-bar">
          <div className="tools-page-header">
            <h1 className="tools-page-title">Инвентарь</h1>
            <button
              onClick={() => navigate("/categories/create")}
              className="btn-primary"
            >
              + Категория
            </button>
          </div>

          <div className="tools-filter-bar">
            <div className="tools-search-wrapper">
              <span className="tools-search-icon" aria-hidden="true">
                🔍
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-input tools-search-input"
                placeholder="Поиск по категории, модели, названию или номеру... (/)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("");
                    searchInputRef.current?.blur();
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="tools-search-clear"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Очистить поиск"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Чипы-фильтры статусов */}
            <div className="tools-chips-group">
              <button
                type="button"
                className={`tools-chip ${statusFilter === "ALL" ? "active" : ""}`}
                onClick={() => setStatusFilter("ALL")}
              >
                Все
              </button>
              <button
                type="button"
                className={`tools-chip ${statusFilter === "AVAILABLE" ? "active" : ""}`}
                onClick={() => setStatusFilter("AVAILABLE")}
              >
                <span className="dot dot-free" /> Свободные
              </button>
              <button
                type="button"
                className={`tools-chip ${statusFilter === "BOOKED" ? "active" : ""}`}
                onClick={() => setStatusFilter("BOOKED")}
              >
                <span className="dot dot-booked" /> В брони
              </button>
            </div>
          </div>

          {/* Счётчик результатов при фильтрации */}
          {isSearchOrFilterActive && (
            <div className="tools-results-counter">
              Найдено: <strong>{totalToolsCount} экз.</strong> в{" "}
              <strong>{totalTemplatesCount} моделях</strong>
              <button
                type="button"
                className="btn-ghost tools-reset-btn"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
              >
                Сбросить
              </button>
            </div>
          )}
        </div>

        {/* Основной контент: скелетон, пустое состояние или дерево */}
        {loading ? (
          <div className="tools-skeleton-list" aria-busy="true" aria-label="Загрузка инвентаря">
            {[1, 2, 3].map((cardIdx) => (
              <div key={cardIdx} className="tools-skeleton-card">
                <div className="tools-skeleton-header">
                  <div className="skeleton-cell skeleton-icon" />
                  <div className="skeleton-cell skeleton-title" />
                  <div className="skeleton-cell skeleton-meta" />
                </div>
                <div className="tools-skeleton-body">
                  <div className="skeleton-cell skeleton-row" />
                  <div className="skeleton-cell skeleton-row" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAndSortedCategories.length === 0 ? (
          categories.length === 0 ? (
            <div className="tools-empty-state">
              <div className="tools-empty-icon">📦</div>
              <h2 className="tools-empty-title">Категорий пока нет</h2>
              <p className="tools-empty-desc">
                Создайте первую категорию, чтобы начать наполнение каталога оборудования.
              </p>
              <button
                type="button"
                onClick={() => navigate("/categories/create")}
                className="btn-primary"
              >
                + Создать категорию
              </button>
            </div>
          ) : (
            <div className="tools-empty-state">
              <div className="tools-empty-icon">🔍</div>
              <h2 className="tools-empty-title">Ничего не найдено</h2>
              <p className="tools-empty-desc">
                {searchQuery.trim()
                  ? `По запросу «${searchQuery.trim()}» нет результатов.`
                  : "По выбранному фильтру нет подходящих инструментов."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="btn-secondary"
              >
                Сбросить поиск и фильтры
              </button>
            </div>
          )
        ) : (
          <InventoryTree
            categories={filteredAndSortedCategories}
            searchActive={isSearchOrFilterActive}
            searchQuery={debouncedQuery}
            highlightedToolId={highlightedToolId}
            highlightedTemplateId={highlightedTemplateId}
            highlightedCategoryId={highlightedCategoryId}
            addingToolTemplateId={addingToolTemplateId}
            onAddTemplate={(catId) => navigate(`/templates/create?categoryId=${catId}`)}
            onTemplateOpen={(tplId) => navigate(`/templates/${tplId}`)}
            onTemplateEdit={(tplId) => navigate(`/templates/edit/${tplId}`)}
            onAddTool={async (tplId, catId) => {
              setAddingToolTemplateId(tplId);
              try {
                const createdTools = await toolsAPI.createBatch({ templateId: tplId, count: 1 });
                const newTool = Array.isArray(createdTools) ? createdTools[0] : null;

                if (newTool) {
                  setHighlightedToolId(newTool.id);
                  setHighlightedTemplateId(tplId);
                  setHighlightedCategoryId(catId);

                  // Подсвечиваем на 2.5 секунды
                  setTimeout(() => {
                    setHighlightedToolId(null);
                  }, 2500);

                  const toolNum = newTool.instanceNumber ?? newTool.id;
                  toast.success(`Экземпляр №${toolNum} успешно добавлен`);
                } else {
                  toast.success("Экземпляр успешно добавлен");
                }
              } catch (err: unknown) {
                console.error("Ошибка при создании экземпляра:", err);
                const msg = err instanceof Error ? err.message : "Не удалось создать экземпляр";
                toast.error(msg);
              } finally {
                setAddingToolTemplateId(null);
              }
            }}
            onBookTool={(toolId, toolNumber, templateId, templateName, dailyRentalPrice, depositAmount) => {
              setBookingModal({
                isOpen: true,
                toolInstanceId: toolId,
                toolInstanceNumber: toolNumber,
                templateId,
                templateName,
                dailyRentalPrice,
                depositAmount,
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
          toast.success("Инструмент успешно забронирован");
        }}
        toolInstanceId={bookingModal.toolInstanceId}
        toolInstanceNumber={bookingModal.toolInstanceNumber}
        templateId={bookingModal.templateId}
        templateName={bookingModal.templateName}
        dailyRentalPrice={bookingModal.dailyRentalPrice}
        depositAmount={bookingModal.depositAmount}
      />
    </Layout>
  );
};
