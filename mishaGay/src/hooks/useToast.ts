import { useContext } from "react";
import { ToastContext } from "../context/ToastContext";

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg: string) => console.log("[Toast fallback]", msg),
      success: (msg: string) => console.log("[Toast fallback success]", msg),
      error: (msg: string) => console.error("[Toast fallback error]", msg),
      info: (msg: string) => console.info("[Toast fallback info]", msg),
      warning: (msg: string) => console.warn("[Toast fallback warning]", msg),
      removeToast: () => {},
    };
  }
  return context;
};
