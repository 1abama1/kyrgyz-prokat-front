import { FC, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import "../styles/layout.css";

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface LayoutProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export const Layout: FC<LayoutProps> = ({ children, breadcrumbs }) => {
  return (
    <div className="layout">
      <a href="#main" className="skip-link">
        Перейти к содержимому
      </a>
      <Sidebar />
      <main id="main" className="content" tabIndex={-1}>
        <div className="page-container">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="breadcrumbs" aria-label="Навигация по разделам">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {crumb.path && !isLast ? (
                      <Link to={crumb.path} className="breadcrumb-item">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={`breadcrumb-item ${isLast ? "breadcrumb-current" : ""}`} aria-current={isLast ? "page" : undefined}>
                        {crumb.label}
                      </span>
                    )}
                    {!isLast && <span className="breadcrumb-separator" aria-hidden="true">/</span>}
                  </span>
                );
              })}
            </nav>
          )}
          {children}
        </div>
      </main>
    </div>
  );
};
