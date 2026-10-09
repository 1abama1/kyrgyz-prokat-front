import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { InventoryTree } from "../InventoryTree";
import { CategoryFullDto } from "../../types/inventory.types";

const mockCategories: CategoryFullDto[] = [
  {
    id: "cat-1",
    name: "Электроинструмент",
    templates: [
      {
        id: "tpl-1",
        name: "Перфоратор Bosch",
        categoryId: "cat-1",
        dailyRentalPrice: 1000,
        depositAmount: 5000,
        purchasePrice: 20000,
        tools: [
          {
            id: 101,
            name: "Перфоратор Bosch #1",
            inventoryNumber: "INV-001",
            article: "ART-1",
            depositAmount: 5000,
            purchasePrice: 20000,
            dailyRentalPrice: 1000,
            status: "AVAILABLE",
            instanceNumber: 1,
            templateId: "tpl-1",
          },
          {
            id: 102,
            name: "Перфоратор Bosch #2",
            inventoryNumber: "INV-002",
            article: "ART-2",
            depositAmount: 5000,
            purchasePrice: 20000,
            dailyRentalPrice: 1000,
            status: "BOOKED",
            instanceNumber: 2,
            templateId: "tpl-1",
            activeBookingId: "book-123",
          },
        ],
      },
    ],
  },
];

describe("InventoryTree", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("displays category free and booked summaries without requiring tree expansion", () => {
    render(<InventoryTree categories={mockCategories} />);

    // Категория показывает: "1 модель · 1 свободно · 1 в брони"
    expect(screen.getByText(/Электроинструмент/)).toBeDefined();
    expect(screen.getByText(/1 модель/)).toBeDefined();
    expect(screen.getByText(/1 свободно/)).toBeDefined();
    expect(screen.getByText(/1 в брони/)).toBeDefined();
  });

  it("expands category on click and displays model summary", () => {
    render(<InventoryTree categories={mockCategories} />);

    // Кликаем по категории для открытия
    const categoryBtn = screen.getByText(/Электроинструмент/);
    fireEvent.click(categoryBtn);

    // Модель видна и имеет свою сводку
    expect(screen.getByText(/Перфоратор Bosch/)).toBeDefined();
  });

  it("handles 'Развернуть всё' and 'Свернуть всё' buttons", () => {
    render(<InventoryTree categories={mockCategories} />);

    const expandAllBtn = screen.getByText("Развернуть всё");
    fireEvent.click(expandAllBtn);

    // Экземпляры открыты
    expect(screen.getByText(/INV-001/)).toBeDefined();
    expect(screen.getByText(/INV-002/)).toBeDefined();

    const collapseAllBtn = screen.getByText("Свернуть всё");
    fireEvent.click(collapseAllBtn);

    // Экземпляры свернуты
    expect(screen.queryByText(/INV-001/)).toBeNull();
  });
});
