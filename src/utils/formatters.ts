export const formatCurrency = (value: string | number) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('nl-NL', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
};

export const formatDate = (date: { date: string }) => {
  return new Date(date.date).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit'
  });
};

export const formatTime = (date: Date) => {
  return date.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export const formatHours = (value: number) => {
  return `${value.toFixed(1)} uur`;
}; 