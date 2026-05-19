import Select, { StylesConfig, GroupBase } from "react-select";

export type SelectOption = {
  value: number | string;
  label: string;
};

interface StyledSelectProps {
  options: SelectOption[];
  value: number | string | "" | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
  className?: string;
  noOptionsMessage?: string;
}

const selectStyles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderWidth: "1.5px",
    borderColor: state.isFocused ? "#2563EB" : "#E2E8F0",
    borderRadius: 10,
    background: state.isDisabled ? "#F8FAFC" : "#FFFFFF",
    boxShadow: "none",
    transition: "border-color .2s, background .2s",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    "&:hover": {
      borderColor: state.isFocused ? "#2563EB" : "#CBD5E1",
      background: state.isFocused ? "#FFFFFF" : "#F8FAFC"
    }
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    boxShadow: "0 8px 24px rgba(0,0,0,.10)",
    overflow: "hidden",
    zIndex: 9999,
    animation: "selectMenuAppear .15s ease"
  }),
  menuList: (base) => ({
    ...base,
    padding: 4,
  }),
  option: (base, state) => ({
    ...base,
    padding: "10px 14px",
    borderRadius: 6,
    margin: "2px 0",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: state.isSelected ? 600 : 400,
    background: state.isSelected
      ? "#2563EB"
      : state.isFocused
        ? "#EFF6FF"
        : "transparent",
    color: state.isSelected ? "#fff" : "#0F172A",
    transition: "background .12s ease",
    "&:active": {
      background: "#BFDBFE"
    }
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: "#E2E8F0",
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? "#2563EB" : "#94A3B8",
    transition: "color .18s ease, transform .2s ease",
    transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "none",
    "&:hover": { color: "#475569" }
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "#94A3B8",
    padding: "6px",
    "&:hover": { color: "#DC2626" }
  }),
  placeholder: (base) => ({
    ...base,
    color: "#94A3B8",
    fontSize: 14
  }),
  singleValue: (base) => ({
    ...base,
    color: "#0F172A",
    fontSize: 14
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 14px",
  }),
  input: (base) => ({
    ...base,
    color: "#0F172A"
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: "#94A3B8",
    fontSize: 13
  })
};

export const StyledSelect = ({
  options,
  value,
  onChange,
  placeholder = "Выберите...",
  isDisabled = false,
  isClearable = false,
  isSearchable = true,
  className,
  noOptionsMessage = "Ничего не найдено"
}: StyledSelectProps) => {
  const selectedOption = options.find((opt) => opt.value === value) ?? null;

  return (
    <Select<SelectOption, false>
      options={options}
      value={selectedOption}
      className={className}
      classNamePrefix="custom-select"
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable={isSearchable}
      onChange={(option) => onChange(option?.value ?? null)}
      noOptionsMessage={() => noOptionsMessage}
      styles={selectStyles}
      menuPortalTarget={document.body}
    />
  );
};
