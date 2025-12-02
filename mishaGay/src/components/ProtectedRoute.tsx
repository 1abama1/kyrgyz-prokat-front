import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { isAuthenticated } from "../utils/auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

