export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'KGS'
  }).format(amount);
};

/**
 * Генерирует уникальный номер договора в формате R-YYYY-MM-DD-XXX
 * где XXX - последние 3 цифры timestamp
 */
export const generateContractNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = Date.now();
  const suffix = String(timestamp).slice(-3);
  
  return `R-${year}-${month}-${day}-${suffix}`;
};

