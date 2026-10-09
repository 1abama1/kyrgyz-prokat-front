import React, { ReactNode } from "react";
import Select, { StylesConfig, GroupBase } from "react-select";

export type SelectOption = {
  value: number | string;
  label: string;
};

export type SelectGroup = GroupBase<SelectOption>;

interface StyledSelectProps {
  options: (SelectOption | SelectGroup)[];
  value: number | string | "" | null;
  onChange: (value: number | string | null) => void;
  inputId?: string;
  placeholder?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isClearable?: boolean;
  className?: string;
  noOptionsMessage?: ReactNode | (() => ReactNode) | string;
  isSearchable?: boolean;
  filterOption?: (
    option: { label: string; value: string | number; data: SelectOption },
    inputValue: string
  ) => boolean;
}

export const StyledSelect = ({
  options,
  value,
  onChange,
  inputId,
  placeholder = "Выберите...",
  isDisabled = false,
  isInvalid = false,
  isClearable = false,
  isSearchable = true,
  className,
  noOptionsMessage = "Ничего не найдено",
  filterOption,
}: StyledSelectProps) => {
  // Находим выбранную опцию среди плоского списка или сгруппированного
  const findOption = (): SelectOption | null => {
    if (value === null || value === undefined || value === "") return null;
    for (const opt of options) {
      if ("options" in opt && Array.isArray(opt.options)) {
        const found = opt.options.find((item) => String(item.value) === String(value));
        if (found) return found;
      } else if ("value" in opt && String(opt.value) === String(value)) {
        return opt as SelectOption;
      }
    }
    return null;
  };

  const selectedOption = findOption();

  const dynamicStyles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderWidth: "1.5px",
      borderColor: isInvalid
        ? state.isFocused
          ? "var(--brand, #2563EB)"
          : "var(--danger, #DC2626)"
        : state.isFocused
        ? "var(--brand, #2563EB)"
        : "var(--border-strong, #CBD5E1)",
      borderRadius: "var(--r, 10px)",
      background: state.isDisabled ? "var(--surface-2, #F8FAFC)" : "var(--surface, #FFFFFF)",
      boxShadow: state.isFocused
        ? isInvalid
          ? "0 0 0 3px rgba(220, 38, 38, 0.12)"
          : "0 0 0 3px rgba(37, 99, 235, 0.14)"
        : isInvalid
        ? "0 0 0 3px rgba(220, 38, 38, 0.10)"
        : "none",
      transition: "border-color .18s, box-shadow .18s, background .18s",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      "&:hover": {
        borderColor: isInvalid
          ? "var(--danger, #DC2626)"
          : state.isFocused
          ? "var(--brand, #2563EB)"
          : "var(--text-secondary, #475569)",
      },
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "var(--r, 10px)",
      border: "1px solid var(--border, #E2E8F0)",
      boxShadow: "var(--shadow-md, 0 8px 24px rgba(0,0,0,.10))",
      overflow: "hidden",
      zIndex: 9999,
      animation: "selectMenuAppear .15s ease",
      background: "var(--surface, #FFFFFF)",
    }),
    menuList: (base) => ({
      ...base,
      padding: 4,
    }),
    groupHeading: (base) => ({
      ...base,
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: ".06em",
      color: "var(--text-muted, #94A3B8)",
      padding: "6px 12px 2px",
    }),
    option: (base, state) => ({
      ...base,
      padding: "9px 12px",
      borderRadius: "var(--r-sm, 6px)",
      margin: "2px 0",
      cursor: "pointer",
      fontSize: 13.5,
      fontWeight: state.isSelected ? 600 : 400,
      background: state.isSelected
        ? "var(--brand, #2563EB)"
        : state.isFocused
        ? "var(--brand-light, #EFF6FF)"
        : "transparent",
      color: state.isSelected ? "#FFFFFF" : "var(--text-primary, #0F172A)",
      transition: "background .12s ease",
      "&:active": {
        background: "var(--brand-subtle, #BFDBFE)",
      },
    }),
    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: "var(--border, #E2E8F0)",
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? "var(--brand, #2563EB)" : "var(--text-muted, #94A3B8)",
      transition: "color .18s ease, transform .2s ease",
      transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "none",
      "&:hover": { color: "var(--text-secondary, #475569)" },
    }),
    clearIndicator: (base) => ({
      ...base,
      color: "var(--text-muted, #94A3B8)",
      padding: "6px",
      "&:hover": { color: "var(--danger, #DC2626)" },
    }),
    placeholder: (base) => ({
      ...base,
      color: "var(--text-muted, #94A3B8)",
      fontSize: 14,
    }),
    singleValue: (base) => ({
      ...base,
      color: "var(--text-primary, #0F172A)",
      fontSize: 14,
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "2px 14px",
    }),
    input: (base) => ({
      ...base,
      color: "var(--text-primary, #0F172A)",
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: "var(--text-muted, #94A3B8)",
      fontSize: 13,
      padding: "12px",
    }),
  };

  const renderNoOptions = () => {
    if (typeof noOptionsMessage === "function") {
      return noOptionsMessage() as React.ReactElement;
    }
    return noOptionsMessage as React.ReactElement;
  };

  return (
    <Select<SelectOption, false, GroupBase<SelectOption>>
      inputId={inputId}
      options={options as unknown as readonly (SelectOption | GroupBase<SelectOption>)[]}
      value={selectedOption}
      className={className}
      classNamePrefix="custom-select"
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable={isSearchable}
      onChange={(option) => onChange(option ? (option as SelectOption).value : null)}
      noOptionsMessage={renderNoOptions}
      styles={dynamicStyles}
      menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
      filterOption={filterOption}
    />
  );
};
