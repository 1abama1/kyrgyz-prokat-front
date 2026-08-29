import { Navigate } from "react-router-dom";

export const SafeNavigate = ({ to, replace }: { to: string; replace?: boolean }) => {
  return <Navigate to={to} replace={replace} />;
};
