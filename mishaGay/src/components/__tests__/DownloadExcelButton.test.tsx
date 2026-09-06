/** @vitest-environment jsdom */
import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DownloadExcelButton } from "../DownloadExcelButton";
import * as excelApi from "../../api/excel.api";
import * as offlineExcelModule from "../../utils/buildOfflineExcelData";
import { networkStore } from "../../store/networkStore";

// ─────────────────────────────────────────────────────────────────────────────
// Мокирование внешних модулей
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("../../api/excel.api");
vi.mock("../../utils/buildOfflineExcelData");

describe("DownloadExcelButton (React + Electron)", () => {
  // Моки глобальных объектов Electron
  let mockSaveExcel: ReturnType<typeof vi.fn>;
  let mockOpenExcel: ReturnType<typeof vi.fn>;
  let mockCheckExists: ReturnType<typeof vi.fn>;
  let mockGenerateOffline: ReturnType<typeof vi.fn>;
  let mockShowItemInFolder: ReturnType<typeof vi.fn>;
  let alertSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Настройка моков для Electron IPC
    mockSaveExcel = vi.fn().mockResolvedValue("C:\\Users\\Doc\\Contracts\\Договор №-101.xlsx");
    mockOpenExcel = vi.fn().mockResolvedValue(undefined);
    mockCheckExists = vi.fn().mockResolvedValue(null);
    mockGenerateOffline = vi.fn().mockResolvedValue("C:\\Users\\Doc\\Contracts\\Offline.xlsx");
    mockShowItemInFolder = vi.fn().mockResolvedValue(undefined);

    // Мокаем window.contracts и window.electronLog
    (window as any).contracts = {
      saveExcel: mockSaveExcel,
      openExcel: mockOpenExcel,
      checkExists: mockCheckExists,
      generateOffline: mockGenerateOffline,
      showItemInFolder: mockShowItemInFolder,
    };

    (window as any).electronLog = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Перехватываем alert, чтобы тесты не зависали
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    // По умолчанию считаем, что мы онлайн
    vi.spyOn(networkStore, "isOffline", "get").mockReturnValue(false);
  });

  afterEach(() => {
    delete (window as any).contracts;
    delete (window as any).electronLog;
    alertSpy.mockRestore();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Тест рендеринга (Arrange-Act-Assert)
  // ───────────────────────────────────────────────────────────────────────────
  it("должен корректно отображать обе кнопки действий", () => {
    // [Arrange & Act] Рендерим компонент
    render(<DownloadExcelButton contractId={101} contractNumber="101" />);

    // [Assert] Поиск по роли и тексту с точки зрения пользователя
    const openBtn = screen.getByRole("button", { name: /открыть excel/i });
    const folderBtn = screen.getByRole("button", { name: /в проводнике/i });

    expect(openBtn).toBeInTheDocument();
    expect(folderBtn).toBeInTheDocument();
    expect(openBtn).not.toBeDisabled();
    expect(folderBtn).not.toBeDisabled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Онлайн-сценарий (Успешное скачивание с сервера и открытие в Excel)
  // ───────────────────────────────────────────────────────────────────────────
  it("при онлайн-режиме должен запросить файл с бэкенда, сохранить через IPC и открыть", async () => {
    // [Arrange]
    // Создаем фиктивный Blob с методом arrayBuffer
    const fakeArrayBuffer = new ArrayBuffer(8);
    const fakeBlob = {
      arrayBuffer: vi.fn().mockResolvedValue(fakeArrayBuffer),
    } as unknown as Blob;

    vi.mocked(excelApi.downloadContractExcel).mockResolvedValue(fakeBlob);

    render(<DownloadExcelButton contractId={101} contractNumber="101" />);
    const openBtn = screen.getByRole("button", { name: /открыть excel/i });

    // [Act] Пользователь нажимает на кнопку открытия договора
    fireEvent.click(openBtn);

    // Кнопка переходит в состояние загрузки и блокируется
    expect(screen.getByRole("button", { name: /открытие\.\.\./i })).toBeDisabled();

    // [Assert] Ожидаем завершения цепочки асинхронных вызовов
    await waitFor(() => {
      expect(excelApi.downloadContractExcel).toHaveBeenCalledWith(101);
      expect(mockSaveExcel).toHaveBeenCalledWith(
        fakeArrayBuffer,
        "Договор №-101.xlsx"
      );
      expect(mockOpenExcel).toHaveBeenCalledWith("C:\\Users\\Doc\\Contracts\\Договор №-101.xlsx");
    });

    // После завершения кнопка возвращается в исходное состояние
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /открыть excel/i })).not.toBeDisabled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Сценарий сетевой ошибки (Fallback на локальную оффлайн-генерацию)
  // ───────────────────────────────────────────────────────────────────────────
  it("при сбое сети бэкенда должен переключиться на оффлайн-генерацию", async () => {
    // [Arrange] Имитируем сетевой сбой (Network Error / 500)
    const networkError = { code: "ERR_NETWORK", message: "Network Error" };
    vi.mocked(excelApi.downloadContractExcel).mockRejectedValue(networkError);

    const fakeOfflineData = { contractId: 101, clientName: "Тест" };
    vi.mocked(offlineExcelModule.buildOfflineExcelData).mockResolvedValue(fakeOfflineData as any);

    render(<DownloadExcelButton contractId={101} contractNumber="101" />);
    const openBtn = screen.getByRole("button", { name: /открыть excel/i });

    // [Act]
    fireEvent.click(openBtn);

    // [Assert]
    await waitFor(() => {
      // 1. Попытка скачать онлайн завершилась
      expect(excelApi.downloadContractExcel).toHaveBeenCalledWith(101);
      // 2. Сработал сбор данных из локальной базы
      expect(offlineExcelModule.buildOfflineExcelData).toHaveBeenCalledWith(101, undefined);
      // 3. Вызвана оффлайн генерация через Electron IPC
      expect(mockGenerateOffline).toHaveBeenCalledWith(
        fakeOfflineData,
        "Договор №-101.xlsx"
      );
      // 4. Открыт сгенерированный локально файл
      expect(mockOpenExcel).toHaveBeenCalledWith("C:\\Users\\Doc\\Contracts\\Offline.xlsx");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Сценарий открытия проводника (handleOpenFolder)
  // ───────────────────────────────────────────────────────────────────────────
  it("должен проверять наличие файла и открывать его в проводнике при клике", async () => {
    // [Arrange] Имитируем, что файл уже существует на диске
    mockCheckExists.mockResolvedValue("C:\\Users\\Doc\\Contracts\\Договор №101.xlsx");

    render(<DownloadExcelButton contractId={101} contractNumber="101" />);
    const folderBtn = screen.getByRole("button", { name: /в проводнике/i });

    // [Act]
    fireEvent.click(folderBtn);

    // [Assert]
    await waitFor(() => {
      expect(mockCheckExists).toHaveBeenCalledWith("Договор №101.xlsx");
      expect(mockShowItemInFolder).toHaveBeenCalledWith("C:\\Users\\Doc\\Contracts\\Договор №101.xlsx");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Обработка ошибки занятости файла (EBUSY)
  // ───────────────────────────────────────────────────────────────────────────
  it("должен предупреждать пользователя через alert, если файл заблокирован Excel (EBUSY)", async () => {
    // [Arrange] Имитируем ошибку операционной системы: файл занят другим процессом
    const ebusyError = new Error("EBUSY: resource locked or open in Excel");
    const fakeBlob = { arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) } as unknown as Blob;
    vi.mocked(excelApi.downloadContractExcel).mockResolvedValue(fakeBlob);
    mockOpenExcel.mockRejectedValue(ebusyError);

    render(<DownloadExcelButton contractId={101} contractNumber="101" />);
    const openBtn = screen.getByRole("button", { name: /открыть excel/i });

    // [Act]
    fireEvent.click(openBtn);

    // [Assert]
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("Файл уже открыт в Excel")
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Защита от запуска вне среды Electron
  // ───────────────────────────────────────────────────────────────────────────
  it("должен предупредить пользователя, если window.contracts не определен", async () => {
    // [Arrange] Удаляем window.contracts (симуляция обычного браузера)
    delete (window as any).contracts;

    render(<DownloadExcelButton contractId={101} contractNumber="101" />);
    const openBtn = screen.getByRole("button", { name: /открыть excel/i });

    // [Act]
    fireEvent.click(openBtn);

    // [Assert]
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining("Electron API недоступен")
    );
    expect(excelApi.downloadContractExcel).not.toHaveBeenCalled();
  });
});
