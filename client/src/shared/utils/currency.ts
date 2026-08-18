export function formatCurrency(value: string | number, currency: string = 'INR') {
  const amount = Number(value || 0)
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatCompactCurrency(value: string | number, currency: string = 'INR') {
  const amount = Number(value || 0)
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}