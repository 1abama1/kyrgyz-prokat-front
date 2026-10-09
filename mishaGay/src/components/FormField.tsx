import { FC, ReactNode, useId } from "react";
import "../styles/forms.css";

export interface FormFieldA11yProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
}

export interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  children: ((props: FormFieldA11yProps) => ReactNode) | ReactNode;
}

export const FormField: FC<FormFieldProps> = ({
  label,
  required = false,
  hint,
  error,
  className = "",
  children,
}) => {
  const generatedId = useId();
  const descId = hint || error ? `${generatedId}-desc` : undefined;

  const a11yProps: FormFieldA11yProps = {
    id: generatedId,
    "aria-invalid": Boolean(error),
    "aria-describedby": descId,
  };

  return (
    <div className={`form-field ${error ? "has-error" : ""} ${className}`.trim()}>
      <label htmlFor={generatedId} className="form-label">
        {label}
        {required && (
          <span className="form-required" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>

      {typeof children === "function" ? children(a11yProps) : children}

      {error ? (
        <p id={descId} className="form-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="form-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
