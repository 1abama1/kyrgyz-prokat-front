export const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

export const formatDateToInput = (date: Date | null): string => {
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
};

export const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  // В России неделя начинается с понедельника
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const isSameDay = (d1: Date | null, d2: Date | null): boolean => {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const isSameMonth = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth()
  );
};

export const getMonthNames = (): string[] => {
  const formatter = new Intl.DateTimeFormat('ru-RU', { month: 'long' });
  const names = [];
  for (let i = 0; i < 12; i++) {
    const str = formatter.format(new Date(2024, i, 1));
    names.push(str.charAt(0).toUpperCase() + str.slice(1));
  }
  return names;
};

export const getWeekdayNames = (): string[] => {
  const formatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
  const names = [];
  // 1 Jan 2024 is Monday
  for (let i = 1; i <= 7; i++) {
    const str = formatter.format(new Date(2024, 0, i));
    names.push(str.charAt(0).toUpperCase() + str.slice(1));
  }
  return names;
};
