export const matchPhone = (dbPhone: string | null | undefined, query: string): boolean => {
  if (!dbPhone || !query) return false;

  const qClean = query.replace(/\D/g, "");
  if (!qClean) return false;

  const dbClean = dbPhone.replace(/\D/g, "");
  if (!dbClean) return false;

  const getVariations = (num: string) => {
    const vars = new Set<string>();
    vars.add(num);
    if (num.length > 1 && (num.startsWith("0") || num.startsWith("8"))) {
      vars.add(num.substring(1));
    }
    if (num.length > 3 && num.startsWith("996")) {
      vars.add(num.substring(3));
    } else if (num.length > 1 && num.startsWith("7")) {
      vars.add(num.substring(1));
    }
    return Array.from(vars);
  };

  const dbVars = getVariations(dbClean);
  const qVars = getVariations(qClean);

  for (const d of dbVars) {
    for (const q of qVars) {
      if (d.includes(q)) return true;
    }
  }

  return false;
};
