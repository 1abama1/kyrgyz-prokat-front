import { useMemo } from "react";

type ClientLike = {
  tag?: string | null;
  tags?: string[] | null;
};

export interface ClientCheckResult {
  allowed: boolean;
  reason?: string;
  warning?: string;
}

const normalizeTags = (client?: ClientLike | null): string[] => {
  if (!client) return [];
  if (Array.isArray(client.tags)) {
    return client.tags.filter(Boolean).map((t) => t.toString().toUpperCase());
  }
  if (client.tag) {
    return [client.tag.toString().toUpperCase()];
  }
  return [];
};

export const useClientCheck = (client?: ClientLike | null): ClientCheckResult => {
  return useMemo(() => {
    if (!client) {
      return { allowed: false, reason: "Клиент не выбран" };
    }

    const tags = normalizeTags(client);

    if (tags.includes("DEBTOR") || tags.includes("ДОЛЖНИК")) {
      return { allowed: false, reason: "Клиент является должником" };
    }

    if (tags.includes("PROBLEM") || tags.includes("ПРОБЛЕМНЫЙ")) {
      return { allowed: true, warning: "Клиент помечен как проблемный" };
    }

    return { allowed: true };
  }, [client]);
};

