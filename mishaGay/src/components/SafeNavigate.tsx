import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const SafeNavigate = ({ to, replace }: { to: string; replace?: boolean }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, to, replace]);

  return null;
};
