export function formatCurrency(value: string | number, currency: string = 'INR') {
  const amount = Number(value || 0)
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}