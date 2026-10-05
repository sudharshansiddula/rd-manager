export const formatCurrency = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null) return '0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  // Format as Indian Currency (e.g., 1000000 -> 10,00,000)
  return num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
};
