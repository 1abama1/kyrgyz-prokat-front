import { useState, useEffect, useCallback } from "react";
import { db } from "../db/db";

interface TableInfo {
  name: string;
  label: string;
  icon: string;
  count: number;
}

interface TableRecord {
  key: any;
  value: any;
}

const TABLE_CONFIG: { name: string; label: string; icon: string }[] = [
  { name: "categories", label: "Категории", icon: "📁" },
  { name: "templates", label: "Модели", icon: "📦" },
  { name: "tools", label: "Экземпляры", icon: "🛠️" },
  { name: "clients", label: "Клиенты", icon: "👥" },
  { name: "contracts", label: "Договоры", icon: "📄" },
  { name: "bookings", label: "Брони", icon: "📅" },
  { name: "syncQueue", label: "Очередь синхр.", icon: "🔄" },
  { name: "syncQueueV2", label: "Очередь синхр. v2", icon: "🔄" },
  { name: "syncMeta", label: "Мета синхр.", icon: "📊" },
];

export const IndexedDBManager = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [records, setRecords] = useState<TableRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<string | null>(null);

  const loadCounts = useCallback(async () => {
    const infos: TableInfo[] = [];
    for (const cfg of TABLE_CONFIG) {
      try {
        const table = (db as any)[cfg.name];
        if (table) {
          const count = await table.count();
          infos.push({ ...cfg, count });
        }
      } catch {
        infos.push({ ...cfg, count: 0 });
      }
    }
    setTables(infos);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCounts();
      setSelectedTable(null);
      setRecords([]);
      setSelectedKeys(new Set());
    }
  }, [isOpen, loadCounts]);

  const loadRecords = async (tableName: string) => {
    setLoadingRecords(true);
    setSelectedTable(tableName);
    setSelectedKeys(new Set());
    setExpandedRow(null);
    try {
      const table = (db as any)[tableName];
      if (!table) return;
      const all = await table.toArray();
      const primaryKey = table.schema.primKey.keyPath;
      setRecords(
        all.map((item: any) => ({
          key: item[primaryKey] ?? item.id ?? JSON.stringify(item).slice(0, 20),
          value: item,
        }))
      );
    } catch (err) {
      console.error("Failed to load records:", err);
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const deleteSelected = async () => {
    if (!selectedTable || selectedKeys.size === 0) return;
    try {
      const table = (db as any)[selectedTable];
      const primaryKey = table.schema.primKey.keyPath;
      for (const record of records) {
        const recordKeyStr = String(record.key);
        if (selectedKeys.has(recordKeyStr)) {
          await table.delete(record.value[primaryKey] ?? record.key);
        }
      }
      await loadRecords(selectedTable);
      await loadCounts();
    } catch (err) {
      console.error("Failed to delete records:", err);
    }
  };

  const clearTable = async (tableName: string) => {
    try {
      const table = (db as any)[tableName];
      if (table) {
        await table.clear();
        await loadCounts();
        if (selectedTable === tableName) {
          setRecords([]);
          setSelectedKeys(new Set());
        }
      }
    } catch (err) {
      console.error("Failed to clear table:", err);
    }
    setConfirmClear(null);
  };

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedKeys.size === records.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(records.map((r) => String(r.key))));
    }
  };

  const getDisplayValue = (val: any): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const getRecordLabel = (record: TableRecord): string => {
    const v = record.value;
    return (
      v.name ||
      v.fullName ||
      v.clientName ||
      v.templateName ||
      v.contractNumber ||
      v.operation ||
      v.entityTable ||
      `ID: ${record.key}`
    );
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 20000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1e293b",
          borderRadius: "12px",
          width: "min(900px, 90vw)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #334155",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, color: "#f1f5f9", fontSize: "18px" }}>
            ⚙️ Управление IndexedDB
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "20px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Left — table list */}
          <div
            style={{
              width: "260px",
              borderRight: "1px solid #334155",
              overflowY: "auto",
              padding: "12px 0",
              flexShrink: 0,
            }}
          >
            {tables.map((t) => (
              <div key={t.name}>
                <button
                  onClick={() => loadRecords(t.name)}
                  style={{
                    width: "100%",
                    background:
                      selectedTable === t.name ? "#334155" : "transparent",
                    border: "none",
                    color: "#e2e8f0",
                    padding: "10px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "14px",
                    textAlign: "left",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{t.icon}</span>
                  <span style={{ flex: 1 }}>{t.label}</span>
                  <span
                    style={{
                      background:
                        t.count > 0 ? "#3b82f6" : "#475569",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      minWidth: "24px",
                      textAlign: "center",
                    }}
                  >
                    {t.count}
                  </span>
                </button>

                {/* Clear confirmation */}
                {confirmClear === t.name && (
                  <div
                    style={{
                      padding: "8px 16px",
                      background: "#7f1d1d",
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ color: "#fecaca", fontSize: "12px" }}>
                      Очистить?
                    </span>
                    <button
                      onClick={() => clearTable(t.name)}
                      style={{
                        background: "#ef4444",
                        border: "none",
                        color: "white",
                        padding: "2px 10px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Да
                    </button>
                    <button
                      onClick={() => setConfirmClear(null)}
                      style={{
                        background: "#475569",
                        border: "none",
                        color: "white",
                        padding: "2px 10px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Нет
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Clear all button at bottom of the list */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #334155", marginTop: "8px" }}>
              <button
                onClick={() => setConfirmClear("__ALL__")}
                style={{
                  width: "100%",
                  background: "#7f1d1d",
                  border: "none",
                  color: "#fca5a5",
                  padding: "8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                🗑️ Очистить всё
              </button>
              {confirmClear === "__ALL__" && (
                <div style={{ marginTop: "8px", display: "flex", gap: "6px", justifyContent: "center" }}>
                  <button
                    onClick={async () => {
                      for (const t of TABLE_CONFIG) {
                        try {
                          const table = (db as any)[t.name];
                          if (table) await table.clear();
                        } catch {}
                      }
                      await loadCounts();
                      setRecords([]);
                      setSelectedKeys(new Set());
                      setConfirmClear(null);
                    }}
                    style={{ background: "#ef4444", border: "none", color: "white", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                  >
                    Подтвердить
                  </button>
                  <button
                    onClick={() => setConfirmClear(null)}
                    style={{ background: "#475569", border: "none", color: "white", padding: "4px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                  >
                    Отмена
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right — records */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 16px",
              minHeight: 0,
            }}
          >
            {!selectedTable && (
              <div
                style={{
                  color: "#94a3b8",
                  textAlign: "center",
                  marginTop: "60px",
                  fontSize: "14px",
                }}
              >
                ← Выберите таблицу слева
              </div>
            )}

            {selectedTable && loadingRecords && (
              <div style={{ color: "#94a3b8", textAlign: "center", marginTop: "60px" }}>
                Загрузка...
              </div>
            )}

            {selectedTable && !loadingRecords && records.length === 0 && (
              <div
                style={{
                  color: "#94a3b8",
                  textAlign: "center",
                  marginTop: "60px",
                  fontSize: "14px",
                }}
              >
                Таблица пуста
              </div>
            )}

            {selectedTable && !loadingRecords && records.length > 0 && (
              <>
                {/* Toolbar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                    gap: "8px",
                  }}
                >
                  <label
                    style={{
                      color: "#94a3b8",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeys.size === records.length}
                      onChange={toggleAll}
                      style={{ accentColor: "#3b82f6" }}
                    />
                    Выбрать все ({records.length})
                  </label>

                  <div style={{ display: "flex", gap: "8px" }}>
                    {selectedKeys.size > 0 && (
                      <button
                        onClick={deleteSelected}
                        style={{
                          background: "#ef4444",
                          border: "none",
                          color: "white",
                          padding: "6px 14px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 500,
                        }}
                      >
                        🗑️ Удалить выбранные ({selectedKeys.size})
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmClear(selectedTable)}
                      style={{
                        background: "#475569",
                        border: "none",
                        color: "#e2e8f0",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      Очистить таблицу
                    </button>
                  </div>
                </div>

                {/* Records list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {records.map((record) => {
                    const keyStr = String(record.key);
                    const isSelected = selectedKeys.has(keyStr);
                    const isExpanded = expandedRow === keyStr;

                    return (
                      <div
                        key={keyStr}
                        style={{
                          background: isSelected ? "#1e3a5f" : "#0f172a",
                          borderRadius: "8px",
                          border: `1px solid ${isSelected ? "#3b82f6" : "#334155"}`,
                          overflow: "hidden",
                          transition: "all 0.15s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            padding: "12px",
                            gap: "12px",
                            cursor: "pointer",
                          }}
                          onClick={() => setExpandedRow(isExpanded ? null : keyStr)}
                        >
                          <div style={{ paddingTop: "2px" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleKey(keyStr);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: "16px",
                                height: "16px",
                                accentColor: "#3b82f6",
                                cursor: "pointer",
                              }}
                            />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                              <span style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: 600 }}>
                                {getRecordLabel(record)}
                              </span>
                              <span style={{ color: "#64748b", fontSize: "11px", fontFamily: "monospace", background: "#1e293b", padding: "2px 6px", borderRadius: "4px" }}>
                                {keyStr.length > 15 ? keyStr.slice(0, 12) + "…" : keyStr}
                              </span>
                            </div>

                            {/* User-friendly field display */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {Object.entries(record.value).map(([k, v]) => {
                                // Hide 'id' if it's the same as the key, or if it's too long
                                if (k === "id" && String(v) === keyStr) return null;
                                
                                // Format value
                                let displayVal = getDisplayValue(v);
                                if (!isExpanded && displayVal.length > 30) {
                                  displayVal = displayVal.slice(0, 30) + "...";
                                }

                                return (
                                  <div
                                    key={k}
                                    style={{
                                      background: "#1e293b",
                                      padding: "4px 8px",
                                      borderRadius: "6px",
                                      fontSize: "12px",
                                      display: "flex",
                                      gap: "6px",
                                      border: "1px solid #334155",
                                      maxWidth: "100%",
                                    }}
                                  >
                                    <span style={{ color: "#94a3b8" }}>{k}:</span>
                                    <span style={{ color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isExpanded ? "normal" : "nowrap", wordBreak: "break-all" }}>
                                      {displayVal}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ color: "#94a3b8", fontSize: "14px", paddingTop: "2px" }}>
                            {isExpanded ? "▲" : "▼"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
