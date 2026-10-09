import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HighlightText } from "../HighlightText";

describe("HighlightText", () => {
  it("renders plain text when query is empty", () => {
    render(<HighlightText text="Дрель Bosch" query="" />);
    expect(screen.getByText("Дрель Bosch")).toBeDefined();
  });

  it("highlights matching substrings", () => {
    const { container } = render(<HighlightText text="Дрель Bosch GSB" query="bosch" />);
    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe("Bosch");
    expect(mark?.className).toBe("tree-search-highlight");
  });
});
