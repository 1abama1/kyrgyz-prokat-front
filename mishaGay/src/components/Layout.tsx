import { FC, ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import "../styles/layout.css";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <Sidebar />
      <main className="content">
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
};

