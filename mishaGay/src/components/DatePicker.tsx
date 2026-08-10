import React, { useState, useEffect, useRef, KeyboardEvent } from "react";
import {
  addDays,
  addMonths,
  getStartOfMonth,
  getStartOfWeek,
  isSameDay,
  isSameMonth,
  getMonthNames,
  getWeekdayNames,
  formatDateToInput
} from "../utils/dateUtils";
import "../styles/datepicker.css";

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface CustomSelectProps {
  value: number;
  options: { label: string; value: number }[];
  onChange: (val: number) => void;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // scroll to selected item
      setTimeout(() => {
        if (selectedRef.current && listRef.current) {
          selectedRef.current.scrollIntoView({ block: "center", behavior: "auto" });
        }
      }, 0);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`datepicker-custom-select ${className || ""}`} ref={containerRef}>
      <button 
        type="button" 
        className="datepicker-select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption?.label}
        <span className="datepicker-select-arrow">▼</span>
      </button>
      {isOpen && (
        <div className="datepicker-select-dropdown" ref={listRef}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`datepicker-select-option ${isSelected ? 'is-selected' : ''}`}
                ref={isSelected ? selectedRef : null}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Выберите дату...",
  disabled = false,
  className,
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(formatDateToInput(value));
  
  // Текущий просматриваемый месяц в календаре
  const [currentMonth, setCurrentMonth] = useState<Date>(
    value ? getStartOfMonth(value) : getStartOfMonth(new Date())
  );
  
  // Сфокусированная дата для клавиатурной навигации
  const [focusedDate, setFocusedDate] = useState<Date>(
    value || new Date()
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const months = getMonthNames();
  const weekdays = getWeekdayNames();
  
  // Генерация годов для селекта (от -100 до +50 лет от текущего)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 151 }, (_, i) => currentYear - 100 + i);

  // Синхронизация currentMonth с value при его внешнем изменении
  useEffect(() => {
    if (value) {
      setInputValue(formatDateToInput(value));
      if (!isOpen) {
        setCurrentMonth(getStartOfMonth(value));
        setFocusedDate(value);
      }
    } else {
      setInputValue("");
    }
  }, [value, isOpen]);

  // Закрытие по клику вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Фокус на выбранной/текущей дате при открытии
  useEffect(() => {
    if (isOpen && gridRef.current) {
      // Ищем кнопку с focusedDate и даем ей фокус, или используем таймаут чтобы DOM обновился
      setTimeout(() => {
        const focusedBtn = gridRef.current?.querySelector(
          `button[data-date="${focusedDate.toISOString()}"]`
        ) as HTMLButtonElement;
        focusedBtn?.focus();
      }, 0);
    }
  }, [isOpen]);

  const handleDateSelect = (date: Date) => {
    if (isDisabled(date)) return;
    onChange(date);
    setIsOpen(false);
  };

  const isDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  // Клавиатурная навигация
  const handleKeyDown = (e: KeyboardEvent) => {
    let newDate = new Date(focusedDate);
    
    switch (e.key) {
      case "ArrowLeft":
        newDate = addDays(newDate, -1);
        break;
      case "ArrowRight":
        newDate = addDays(newDate, 1);
        break;
      case "ArrowUp":
        newDate = addDays(newDate, -7);
        break;
      case "ArrowDown":
        newDate = addDays(newDate, 7);
        break;
      case "Enter":
        e.preventDefault();
        handleDateSelect(focusedDate);
        return;
      case "Escape":
        setIsOpen(false);
        return;
      default:
        return;
    }
    
    e.preventDefault();
    if (!isDisabled(newDate)) {
      setFocusedDate(newDate);
      if (!isSameMonth(newDate, currentMonth)) {
        setCurrentMonth(getStartOfMonth(newDate));
      }
      setTimeout(() => {
        const focusedBtn = gridRef.current?.querySelector(
          `button[data-date="${newDate.toISOString()}"]`
        ) as HTMLButtonElement;
        focusedBtn?.focus();
      }, 0);
    }
  };

  // Генерация сетки дней (6 недель)
  const generateGrid = () => {
    const startDate = getStartOfWeek(currentMonth);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(addDays(startDate, i));
    }
    return days;
  };

  const daysGrid = generateGrid();
  const today = new Date();

  // Пресеты
  const presets = [
    { label: "Сегодня", date: new Date() },
    { label: "Завтра", date: addDays(new Date(), 1) },
    { label: "Конец недели", date: addDays(getStartOfWeek(new Date()), 6) },
    { label: "Через месяц", date: addMonths(new Date(), 1) }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);

    let dayStr = val.slice(0, 2);
    let monthStr = val.slice(2, 4);
    let yearStr = val.slice(4, 8);

    // Limit month (01-12)
    if (monthStr.length === 2) {
      let m = parseInt(monthStr, 10);
      if (m === 0) monthStr = "01";
      else if (m > 12) monthStr = "12";
    }

    // Limit day dynamically based on the month and year
    if (dayStr.length === 2) {
      let d = parseInt(dayStr, 10);
      if (d === 0) dayStr = "01";
      else {
        // Assume January if month isn't fully typed.
        let m = monthStr.length === 2 ? parseInt(monthStr, 10) : 1;
        if (m === 0) m = 1;
        
        // Assume leap year (2024) if year isn't fully typed to allow 29.02
        let y = yearStr.length === 4 ? parseInt(yearStr, 10) : 2024;
        
        // new Date(year, month, 0) gives the last day of the month. 
        // (months are 0-indexed in JS, but 0th day gives the last day of the PREVIOUS month).
        // Since our `m` is 1-12, new Date(y, m, 0) perfectly gives the last day of month `m`.
        let maxDays = new Date(y, m, 0).getDate();
        
        if (d > maxDays) {
          dayStr = maxDays.toString();
        }
      }
    }

    let formatted = dayStr;
    if (val.length >= 3) {
      formatted += "." + monthStr;
    }
    if (val.length >= 5) {
      formatted += "." + yearStr;
    }

    setInputValue(formatted);
  };

  const handleInputBlurOrEnter = () => {
    if (!inputValue.trim()) {
      onChange(null as any); // Clear if allowed (or just ignore depending on your logic)
      setInputValue("");
      return;
    }
    const parts = inputValue.match(/(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})/);
    if (parts) {
      const day = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10) - 1;
      let year = parseInt(parts[3], 10);
      if (year < 100) year += 2000;
      const parsedDate = new Date(year, month, day);
      if (
        parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month &&
        parsedDate.getDate() === day &&
        !isDisabled(parsedDate)
      ) {
        onChange(parsedDate);
        setInputValue(formatDateToInput(parsedDate));
        setCurrentMonth(getStartOfMonth(parsedDate));
        setFocusedDate(parsedDate);
        return;
      }
    }
    // Revert on invalid
    setInputValue(formatDateToInput(value));
  };

  return (
    <div className={`datepicker-wrapper ${className || ""}`} style={style} ref={containerRef}>
      <div 
        className="datepicker-input-container"
      >
        <input
          type="text"
          className="datepicker-input"
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlurOrEnter}
          onClick={() => !disabled && setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleInputBlurOrEnter();
              setIsOpen(true);
            }
          }}
        />
      </div>

      {isOpen && (
        <>
          <div className="datepicker-overlay" onClick={() => setIsOpen(false)} />
          <div className="datepicker-popup" role="dialog" aria-label="Выбор даты">
            
            {/* Панель пресетов */}
            <div className="datepicker-presets">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  className="datepicker-preset-btn"
                  onClick={() => {
                    handleDateSelect(preset.date);
                  }}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <span>{preset.label}</span>
                  <span style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                    {formatDateToInput(preset.date)}
                  </span>
                </button>
              ))}
            </div>

            {/* Основной календарь */}
            <div className="datepicker-main">
              <div className="datepicker-header">
                <button 
                  className="datepicker-nav-btn"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                  aria-label="Предыдущий месяц"
                >
                  ←
                </button>
                
                <div className="datepicker-selectors">
                  <CustomSelect
                    value={currentMonth.getMonth()}
                    options={months.map((m, i) => ({ label: m, value: i }))}
                    onChange={(val) => {
                      const newDate = new Date(currentMonth);
                      newDate.setMonth(val);
                      setCurrentMonth(newDate);
                    }}
                  />
                  
                  <CustomSelect
                    value={currentMonth.getFullYear()}
                    options={years.map(y => ({ label: y.toString(), value: y }))}
                    onChange={(val) => {
                      const newDate = new Date(currentMonth);
                      newDate.setFullYear(val);
                      setCurrentMonth(newDate);
                    }}
                  />
                </div>

                <button 
                  className="datepicker-nav-btn"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  aria-label="Следующий месяц"
                >
                  →
                </button>
              </div>

              <div 
                className="datepicker-grid" 
                ref={gridRef}
                onKeyDown={handleKeyDown}
                role="grid"
              >
                {/* Дни недели */}
                {weekdays.map(wd => (
                  <div key={wd} className="datepicker-weekday" role="columnheader">
                    {wd}
                  </div>
                ))}
                
                {/* Сетка дней */}
                {daysGrid.map((day, idx) => {
                  const isSelected = isSameDay(day, value);
                  const isToday = isSameDay(day, today);
                  const isOutside = !isSameMonth(day, currentMonth);
                  const disabledDay = isDisabled(day);

                  let className = "datepicker-day";
                  if (isSelected) className += " is-selected";
                  if (isToday) className += " is-today";
                  if (isOutside) className += " is-outside";

                  return (
                    <button
                      key={idx}
                      data-date={day.toISOString()}
                      disabled={disabledDay}
                      className={className}
                      onClick={() => handleDateSelect(day)}
                      tabIndex={isSameDay(day, focusedDate) ? 0 : -1}
                      role="gridcell"
                      aria-selected={isSelected}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
