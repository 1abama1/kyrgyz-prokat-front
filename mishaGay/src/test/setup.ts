import "@testing-library/jest-dom";

// Базовая инициализация localStorage для тестового окружения jsdom, если отсутствует
if (typeof window !== "undefined" && !window.localStorage) {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (index: number) => Object.keys(store)[index] ?? null,
    length: Object.keys(store).length,
  };
  Object.defineProperty(window, "localStorage", {
    value: mockLocalStorage,
  });
}
