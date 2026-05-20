export type DateFormat = 'auto' | 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd' | 'dd-MMM-yyyy'

export const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  auto: 'Auto-detect  (prefers India DD/MM/YYYY)',
  'dd/mm/yyyy': 'India / UK  –  31/12/2025',
  'mm/dd/yyyy': 'US  –  12/31/2025',
  'yyyy-mm-dd': 'ISO  –  2025-12-31',
  'dd-MMM-yyyy': 'Month name  –  31-Dec-2025',
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** Build a YYYY-MM-DD string directly, without any Date constructor, to avoid
 *  timezone-induced day shifts that plague `new Date().toISOString()` in IST. */
function toYMD(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  if (year < 1900 || year > 2200) return null
  return (
    String(year).padStart(4, '0') + '-' +
    String(month).padStart(2, '0') + '-' +
    String(day).padStart(2, '0')
  )
}

/** Expand a 2-digit year to 4 digits.
 *  century = 2000 (default) → 61 becomes 2061.
 *  century = 1900            → 61 becomes 1961. */
function expandYear(y: number, century: 1900 | 2000 = 2000): number {
  if (y >= 100) return y
  return century + y
}

/** Returns true if any of the sample date strings contain a 2-digit year,
 *  so the UI can surface a century-confirmation control. */
export function hasTwoDigitYears(samples: string[]): boolean {
  return samples.some(s => /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/.test(s.trim()) ||
    /^(\d{1,2})[\s\-\/][A-Za-z]{3,9}[\s\-\/](\d{2})$/.test(s.trim()))
}

/**
 * Parse a date string from a CSV cell into YYYY-MM-DD.
 *
 * Never uses JS Date constructor or toISOString() for numeric formats to avoid
 * timezone-induced day shifts (e.g. IST midnight → previous UTC date).
 *
 * Returns null when the value cannot be understood; callers must surface this
 * as an explicit error rather than silently defaulting to today.
 */
export function parseImportDate(
  raw: string,
  format: DateFormat = 'auto',
  twoDigitCentury: 1900 | 2000 = 2000,
): string | null {
  const s = raw.trim()
  if (!s) return null

  // ISO YYYY-MM-DD is always unambiguous — accept it regardless of format
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    return toYMD(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))
  }
  if (format === 'yyyy-mm-dd') return null

  // Month-name formats: 01-Apr-2025  /  01/Apr/2025  /  01 Apr 2025  (2- or 4-digit year)
  const monthNameMatch = s.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3,9})[\s\-\/](\d{2,4})$/)
  if (monthNameMatch) {
    const month = MONTH_NAMES[monthNameMatch[2].substring(0, 3).toLowerCase()]
    if (!month) return null
    return toYMD(expandYear(Number(monthNameMatch[3]), twoDigitCentury), month, Number(monthNameMatch[1]))
  }
  // Also accept Mon-DD-YYYY (some US bank exports)
  const monthNameUsMatch = s.match(/^([A-Za-z]{3,9})[\s\-\/](\d{1,2})[\s\-\/](\d{2,4})$/)
  if (monthNameUsMatch) {
    const month = MONTH_NAMES[monthNameUsMatch[1].substring(0, 3).toLowerCase()]
    if (!month) return null
    return toYMD(expandYear(Number(monthNameUsMatch[3]), twoDigitCentury), month, Number(monthNameUsMatch[2]))
  }
  if (format === 'dd-MMM-yyyy') return null

  // Numeric: DD/MM/YYYY  MM/DD/YYYY  DD-MM-YYYY  DD.MM.YYYY — 2- or 4-digit year
  const numericMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (!numericMatch) return null

  const p1 = Number(numericMatch[1])
  const p2 = Number(numericMatch[2])
  const year = expandYear(Number(numericMatch[3]), twoDigitCentury)

  if (format === 'dd/mm/yyyy') return toYMD(year, p2, p1)
  if (format === 'mm/dd/yyyy') return toYMD(year, p1, p2)

  // auto: choose based on value ranges
  // If p1 > 12, it must be the day (DD/MM/YYYY)
  if (p1 > 12) return toYMD(year, p2, p1)
  // If p2 > 12, it must be the day (MM/DD/YYYY)
  if (p2 > 12) return toYMD(year, p1, p2)
  // Both ≤ 12 — ambiguous. Prefer Indian DD/MM/YYYY
  return toYMD(year, p2, p1)
}

/**
 * Sample up to `limit` date strings from a CSV column and suggest the most
 * likely format. Returns { format, confidence, example } so the UI can show
 * "We detected DD/MM/YYYY (e.g. 01/05/2025 → 1 May 2025)" inline.
 */
export function detectDateFormat(
  samples: string[],
  limit = 20,
): { format: DateFormat; confidence: 'high' | 'low'; example: string } {
  const valid = samples.filter(Boolean).slice(0, limit)
  const example = valid[0] ?? ''

  if (valid.length === 0) return { format: 'auto', confidence: 'low', example }

  let hasISO = 0
  let hasMonthName = 0
  let hasHighDay = 0   // p1 > 12 → definitely DD first
  let hasHighMonth = 0 // p2 > 12 → definitely MM first (US)
  let total = 0

  for (const s of valid) {
    const t = s.trim()
    if (!t) continue
    total++
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) { hasISO++; continue }
    if (/^\d{1,2}[\s\-\/][A-Za-z]{3}/.test(t)) { hasMonthName++; continue }
    const m = t.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
    if (m) {
      if (Number(m[1]) > 12) hasHighDay++
      else if (Number(m[2]) > 12) hasHighMonth++
    }
  }

  if (total === 0) return { format: 'auto', confidence: 'low', example }

  if (hasISO / total > 0.8) return { format: 'yyyy-mm-dd', confidence: 'high', example }
  if (hasMonthName / total > 0.8) return { format: 'dd-MMM-yyyy', confidence: 'high', example }
  if (hasHighDay / total > 0.3) return { format: 'dd/mm/yyyy', confidence: 'high', example }
  if (hasHighMonth / total > 0.3) return { format: 'mm/dd/yyyy', confidence: 'high', example }
  return { format: 'auto', confidence: 'low', example }
}

/**
 * Return a human-readable preview string for one raw date value so the UI can
 * show "01/05/2025 → 1 May 2025" next to the format selector.
 */
export function dateParsePreview(raw: string, format: DateFormat, twoDigitCentury: 1900 | 2000 = 2000): string {
  if (!raw) return ''
  const parsed = parseImportDate(raw, format, twoDigitCentury)
  if (!parsed) return `"${raw}" — could not parse`
  const [y, m, d] = parsed.split('-').map(Number)
  const label = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
  return `"${raw}"  →  ${label}`
}

/** Returns today's date as a YYYY-MM-DD string using local (wall-clock) time,
 *  avoiding the UTC midnight shift that `new Date().toISOString()` produces in
 *  timezones that are ahead of UTC (e.g. IST). */
export function todayString(): string {
  const n = new Date()
  return toYMD(n.getFullYear(), n.getMonth() + 1, n.getDate()) as string
}

/** Safely displays a stored DATEONLY string (YYYY-MM-DD) in the user's locale
 *  without parsing it as UTC midnight, which shifts the date backward in
 *  timezones ahead of UTC (e.g. IST, AEST). */
export function safeLocaleDateString(
  dateStr: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const m = dateStr?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return dateStr ?? ''
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString(undefined, options)
}
