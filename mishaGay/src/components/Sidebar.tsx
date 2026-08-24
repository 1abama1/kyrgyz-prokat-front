import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { authAPI } from "../api/auth";
import { db } from "../db/db";
import { syncManager } from "../db/syncManager";
import { categoriesAPI } from "../api/categories";
import { clientsAPI } from "../api/clients";
import { contractsAPI } from "../api/contracts";
import { bookingsAPI } from "../api/bookings";
import { networkStore } from "../store/networkStore";
import "../styles/layout.css";
 
/* Простые SVG-иконки */
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
 
const icons = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  clients:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100 8 4 4 0 000-8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  tools:     "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  contracts: "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  plus:      "M12 5v14 M5 12h14",
  download:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  upload:    "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  logout:    "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
};
 
export const Sidebar = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalInfo, setModalInfo] = useState<{
    isOpen: boolean;
    type: "success" | "info" | "warning" | "error";
    title: string;
    message?: string;
    stats?: { label: string; value: number; icon: string }[];
  }>({
    isOpen: false,
    type: "success",
    title: "",
  });
 
  const handleLogout = () => {
    authAPI.logout();
    navigate("/login");
  };

  /**
   * СКАЧАТЬ ДАННЫЕ — Полная загрузка всех данных с сервера в IndexedDB для работы в офлайне
   */
  const handleDownloadToIndexedDb = async () => {
    if (networkStore.isOffline) {
      setModalInfo({
        isOpen: true,
        type: "warning",
        title: "Режим офлайн",
        message: "Для скачивания данных с сервера включите режим «В сети» (кнопка в правом нижнем углу).",
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Сбрасываем метку последней синхронизации, чтобы скачать 100% всех данных
      localStorage.removeItem("lastSyncTimestamp");
      await syncManager.pull();

      // Гарантированно выкачиваем все сущности в локальную базу
      await Promise.allSettled([
        categoriesAPI.getAllFull(),
        clientsAPI.getAll(),
        contractsAPI.getActiveTable(),
        contractsAPI.getHistoryTable(),
        bookingsAPI.getAllBookings(),
      ]);

      const [cCount, tCount, catCount, tmplCount, docCount, bCount] = await Promise.all([
        db.clients.count(),
        db.tools.count(),
        db.categories.count(),
        db.templates.count(),
        db.contracts.count(),
        db.bookings ? db.bookings.count() : 0,
      ]);

      setModalInfo({
        isOpen: true,
        type: "success",
        title: "Данные успешно скачаны в IndexedDB!",
        message: "Приложение полностью готово к автономной работе в офлайн-режиме.",
        stats: [
          { label: "Клиенты", value: cCount, icon: "👥" },
          { label: "Экземпляры", value: tCount, icon: "🛠️" },
          { label: "Категории", value: catCount, icon: "📁" },
          { label: "Модели", value: tmplCount, icon: "📦" },
          { label: "Договоры", value: docCount, icon: "📄" },
          { label: "Брони", value: bCount, icon: "📅" },
        ],
      });
    } catch (err: any) {
      setModalInfo({
        isOpen: true,
        type: "error",
        title: "Ошибка скачивания",
        message: err.message || "Не удалось загрузить данные с сервера в локальную базу.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * ЗАГРУЗИТЬ ДАННЫЕ — Отправка всех локальных изменений из IndexedDB на сервер
   */
  const handleUploadToServer = async () => {
    if (networkStore.isOffline) {
      setModalInfo({
        isOpen: true,
        type: "warning",
        title: "Режим офлайн",
        message: "Для отправки данных на сервер включите режим «В сети» (кнопка в правом нижнем углу).",
      });
      return;
    }

    try {
      setIsProcessing(true);
      const queueBefore = await db.syncQueue.count();
      await syncManager.sync();
      const queueAfter = await db.syncQueue.count();

      if (queueBefore === 0) {
        setModalInfo({
          isOpen: true,
          type: "success",
          title: "Синхронизация завершена",
          message: "Локальная база IndexedDB полностью синхронизирована с сервером. Неотправленных изменений нет.",
        });
      } else {
        const sent = queueBefore - queueAfter;
        setModalInfo({
          isOpen: true,
          type: "success",
          title: "Данные успешно отправлены!",
          message: `Отправлено на сервер действий: ${sent}. Осталось в очереди: ${queueAfter}.`,
        });
      }
    } catch (err: any) {
      setModalInfo({
        isOpen: true,
        type: "error",
        title: "Ошибка отправки",
        message: err.message || "Не удалось отправить изменения на сервер.",
      });
    } finally {
      setIsProcessing(false);
    }
  };
 
  return (
    <div className="sidebar">
      <nav className="menu">
        <span className="menu-group-title">Навигация</span>
 
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
          <Icon d={icons.dashboard} />
          Главная
        </NavLink>
 
        <NavLink to="/clients" className={({ isActive }) => isActive ? "active" : ""}>
          <Icon d={icons.clients} />
          Клиенты
        </NavLink>
 
        <NavLink to="/tools" className={({ isActive }) => isActive ? "active" : ""}>
          <Icon d={icons.tools} />
          Инструменты
        </NavLink>
 
        <NavLink to="/bookings" className={({ isActive }) => isActive ? "active" : ""}>
          <Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          Брони
        </NavLink>
 
        <div className="menu-divider" />
        <span className="menu-group-title">Договоры</span>
 
        <NavLink to="/contracts/active" className={({ isActive }) => isActive ? "active" : ""}>
          <Icon d={icons.contracts} />
          Активные аренды
        </NavLink>
 
        <NavLink to="/contracts/history" className={({ isActive }) => isActive ? "active" : ""}>
          <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          История договоров
        </NavLink>
 
        <div className="menu-divider" />
 
        <button
          className="create-rental-btn"
          onClick={() => navigate("/rentals/create")}
        >
          <Icon d={icons.plus} size={15} />
          Новая аренда
        </button>

        <div className="menu-divider" style={{ marginTop: "auto" }} />
        <span className="menu-group-title">Данные (IndexedDB)</span>

        <button
          className="sidebar-backup-btn"
          onClick={handleDownloadToIndexedDb}
          disabled={isProcessing}
          type="button"
          title="Скачать все актуальные данные с сервера в IndexedDB"
        >
          <Icon d={icons.download} />
          {isProcessing ? "Синхронизация..." : "Скачать данные"}
        </button>

        <button
          className="sidebar-backup-btn"
          onClick={handleUploadToServer}
          disabled={isProcessing}
          type="button"
          title="Загрузить локальные изменения из IndexedDB на сервер"
        >
          <Icon d={icons.upload} />
          {isProcessing ? "Отправка..." : "Загрузить данные"}
        </button>
      </nav>
 
      <div className="logout">
        <button onClick={handleLogout}>
          <Icon d={icons.logout} size={15} />
          Выйти из системы
        </button>
      </div>

      {/* Кастомное модальное окно уведомлений */}
      {modalInfo.isOpen && (
        <div className="custom-modal-overlay" onClick={() => setModalInfo(prev => ({ ...prev, isOpen: false }))}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className={`custom-modal-header ${modalInfo.type}`}>
              <div className="custom-modal-icon">
                {modalInfo.type === "success" && "✓"}
                {modalInfo.type === "warning" && "⚠️"}
                {modalInfo.type === "error" && "✕"}
                {modalInfo.type === "info" && "ℹ️"}
              </div>
              <h3>{modalInfo.title}</h3>
            </div>

            {modalInfo.message && (
              <p className="custom-modal-message">{modalInfo.message}</p>
            )}

            {modalInfo.stats && (
              <div className="custom-modal-stats-grid">
                {modalInfo.stats.map((item, idx) => (
                  <div key={idx} className="custom-modal-stat-item">
                    <span className="stat-icon">{item.icon}</span>
                    <span className="stat-label">{item.label}</span>
                    <span className="stat-value">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="custom-modal-footer">
              <button
                className="custom-modal-btn"
                onClick={() => setModalInfo(prev => ({ ...prev, isOpen: false }))}
                type="button"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
