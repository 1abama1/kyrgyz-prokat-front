import { ReactNode } from "react";
import { isAuthenticated } from "../utils/auth";
import { SafeNavigate } from "./SafeNavigate";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <SafeNavigate to="/login" replace />;
  }
  
  return <>{children}</>;
}
