import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormField } from "../FormField";

describe("FormField", () => {
  it("associates label with input using generated id", () => {
    render(
      <FormField label="Название категории" required>
        {(a11y) => <input {...a11y} placeholder="Введите название" />}
      </FormField>
    );

    const input = screen.getByPlaceholderText("Введите название");
    const label = screen.getByText(/Название категории/);

    expect(label.getAttribute("for")).toBe(input.id);
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });

  it("renders error message and marks input as aria-invalid", () => {
    render(
      <FormField label="Цена" error="Поле обязательно">
        {(a11y) => <input {...a11y} placeholder="0" />}
      </FormField>
    );

    const input = screen.getByPlaceholderText("0");
    const error = screen.getByRole("alert");

    expect(error.textContent).toBe("Поле обязательно");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
  });

  it("renders hint when no error is present", () => {
    render(
      <FormField label="Залог" hint="Возвращается при сдаче">
        {(a11y) => <input {...a11y} placeholder="0" />}
      </FormField>
    );

    expect(screen.getByText("Возвращается при сдаче")).toBeDefined();
  });
});
