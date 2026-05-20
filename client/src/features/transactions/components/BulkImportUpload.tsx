import { useState, useRef, useMemo } from 'react'
import { Upload, CheckCircle2, AlertCircle, Trash2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '../../../shared/utils/currency'
import {
  parseImportDate,
  detectDateFormat,
  dateParsePreview,
  type DateFormat,
  DATE_FORMAT_LABELS,
} from '../../../shared/utils/importDate'

export interface CSVColumnMapping {
  dateColumn?: number
  descriptionColumn?: number
  amountColumn?: number
  debitColumn?: number
  creditColumn?: number
  typeColumn?: number
  categoryColumn?: number
}

export interface CSVUploadProps {
  onFileProcess: (
    transactions: Array<{
      amount: number
      type: 'income' | 'expense'
      description: string
      date: string
      category_id?: string
    }>,
    columnMapping: CSVColumnMapping,
  ) => void
  onError: (error: string) => void
  isLoading?: boolean
  currency?: string
}

type UploadStep = 'upload' | 'range' | 'mapping' | 'preview'

type ImportRowStatus = 'valid' | 'invalid_date' | 'no_amount' | 'ignored'

interface ParsedImportRow {
  rawRowIndex: number
  description: string
  amount: number
  type: 'income' | 'expense'
  date: string    // YYYY-MM-DD, or '' when invalid
  rawDate: string // original cell value
  status: ImportRowStatus
}

const BALANCE_ROW_KEYWORDS = ['opening balance', 'closing balance', 'total', 'brought forward']

const HEADER_DETECTION_KEYWORDS = [
  'date', 'description', 'narration', 'particulars', 'amount', 'debit', 'credit',
  'balance', 'memo', 'type', 'category', 'withdrawal', 'deposit', 'transaction',
]

function scoreHeaderRow(row: string[]): number {
  return row.reduce((score, cell) => {
    const lower = cell.toLowerCase().trim()
    return score + (HEADER_DETECTION_KEYWORDS.some((k) => lower.includes(k)) ? 1 : 0)
  }, 0)
}

function autoDetectStartRow(rows: string[][]): number {
  let best = 0
  let bestScore = -1
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const score = scoreHeaderRow(rows[i])
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

function autoDetectColumns(headerRow: string[]): CSVColumnMapping {
  const mapping: CSVColumnMapping = {}
  headerRow.forEach((header, index) => {
    const h = header.toLowerCase().trim()
    if (mapping.dateColumn === undefined && (h === 'date' || h.includes('transaction date') || h.includes('value date') || h.includes('posted'))) {
      mapping.dateColumn = index
    } else if (mapping.descriptionColumn === undefined && (h.includes('description') || h.includes('narration') || h.includes('particulars') || h.includes('memo'))) {
      mapping.descriptionColumn = index
    } else if (mapping.debitColumn === undefined && (h.includes('debit') || h.includes('withdrawal') || h.includes('dr'))) {
      mapping.debitColumn = index
    } else if (mapping.creditColumn === undefined && (h.includes('credit') || h.includes('deposit') || h.includes('cr'))) {
      mapping.creditColumn = index
    } else if (mapping.amountColumn === undefined && (h.includes('amount') || h.includes('txn amount') || h.includes('transaction amount'))) {
      mapping.amountColumn = index
    } else if (mapping.typeColumn === undefined && (h.includes('transaction type') || h === 'type')) {
      mapping.typeColumn = index
    }
  })
  return mapping
}

function parseAmount(raw: string | undefined): number {
  if (!raw) return 0
  const normalized = raw.replace(/[$€£¥₹,\s]/g, '').trim()
  if (!normalized) return 0
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0
}

export function BulkImportUpload({
  onFileProcess,
  onError,
  isLoading = false,
  currency = 'INR',
}: CSVUploadProps) {
  // ── File & step ──────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null)
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [step, setStep] = useState<UploadStep>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Batch 3: Range selection ─────────────────────────────────────────────
  const [startRow, setStartRow] = useState(0)
  const [endRow, setEndRow] = useState<number | undefined>(undefined)
  const [startCol, setStartCol] = useState(0)
  const [endCol, setEndCol] = useState<number | undefined>(undefined)
  const [rangeClickTarget, setRangeClickTarget] = useState<'start' | 'end'>('start')
  const [showAllRows, setShowAllRows] = useState(false)

  // ── Column mapping + Batch 2: date format selector ───────────────────────
  const [columnMapping, setColumnMapping] = useState<CSVColumnMapping>({})
  const [dateFormat, setDateFormat] = useState<DateFormat>('auto')
  const [showFormatHelp, setShowFormatHelp] = useState(false)

  // ── Batch 4: Preview with bulk actions ───────────────────────────────────
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([])
  const [manuallyIgnored, setManuallyIgnored] = useState<Set<number>>(new Set())
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  // ── Derived helpers ──────────────────────────────────────────────────────
  const effectiveEndRow = endRow ?? csvRows.length - 1
  const effectiveEndCol = endCol ?? (csvRows[0]?.length ?? 1) - 1
  const totalCols = csvRows[0]?.length ?? 0
  const headerRow = csvRows[startRow] ?? []
  // Columns the user can map: only those in the selected column range
  const mappableCols = headerRow
    .map((label, idx) => ({ idx, label }))
    .filter(({ idx }) => idx >= startCol && idx <= effectiveEndCol)

  // ── Date format detection hint ────────────────────────────────────────────
  const dateSamples = useMemo(() => {
    if (columnMapping.dateColumn === undefined) return []
    return csvRows
      .slice(startRow + 1, Math.min(effectiveEndRow + 1, startRow + 21))
      .map((row) => row[columnMapping.dateColumn!]?.trim() ?? '')
      .filter(Boolean)
  }, [csvRows, startRow, effectiveEndRow, columnMapping.dateColumn])

  const detectedFormat = useMemo(() => detectDateFormat(dateSamples), [dateSamples])

  const firstDatePreview = useMemo(
    () => dateParsePreview(dateSamples[0] ?? '', dateFormat),
    [dateSamples, dateFormat],
  )

  // ── File parsing ─────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    if (!selectedFile.name.endsWith('.csv')) {
      onError('Please select a CSV file (.csv)')
      return
    }
    setFile(selectedFile)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        // Robust CSV split: handle \r\n, quoted commas
        const rawRows = splitCSV(content)
        if (rawRows.length < 2) {
          onError('CSV file must have at least a header row and one data row')
          return
        }
        const detectedStart = autoDetectStartRow(rawRows)
        setCsvRows(rawRows)
        setStartRow(detectedStart)
        setEndRow(undefined)
        setStartCol(0)
        setEndCol(undefined)
        setStep('range')
      } catch (err) {
        onError(`Failed to read CSV: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
    reader.readAsText(selectedFile, 'UTF-8')
  }

  // ── Range confirmation ────────────────────────────────────────────────────
  const handleRangeConfirm = () => {
    if (startRow > effectiveEndRow) {
      onError('Header row must be before the last data row')
      return
    }
    // Auto-detect from full header row, then restrict to selected column range
    const absoluteMapping = autoDetectColumns(headerRow)
    const filtered: CSVColumnMapping = {}
    for (const [key, val] of Object.entries(absoluteMapping)) {
      if (typeof val === 'number' && val >= startCol && val <= effectiveEndCol) {
        ;(filtered as Record<string, number>)[key] = val
      }
    }
    const dateCol = filtered.dateColumn
    const samples = dateCol !== undefined
      ? csvRows.slice(startRow + 1, Math.min(effectiveEndRow + 1, startRow + 21))
          .map((r) => r[dateCol]?.trim() ?? '')
          .filter(Boolean)
      : []
    const { format } = detectDateFormat(samples)
    setColumnMapping(filtered)
    setDateFormat(format)
    setStep('mapping')
  }

  // ── Column mapping ────────────────────────────────────────────────────────
  const handleColumnChange = (col: keyof CSVColumnMapping, value: number | undefined) => {
    setColumnMapping((prev) => ({ ...prev, [col]: value }))
  }

  // ── Mapping confirmation → parse rows ─────────────────────────────────────
  const handleMappingConfirm = () => {
    const hasAmount = columnMapping.amountColumn !== undefined
    const hasDebitCredit =
      columnMapping.debitColumn !== undefined || columnMapping.creditColumn !== undefined
    if (!hasAmount && !hasDebitCredit) {
      onError('Please map the Amount column, or Debit / Credit columns')
      return
    }
    if (columnMapping.descriptionColumn === undefined) {
      onError('Please map the Description column')
      return
    }
    const rows = buildParsedRows()
    if (rows.filter((r) => r.status !== 'ignored').length === 0) {
      onError('No transaction rows found in the selected range')
      return
    }
    setParsedRows(rows)
    setManuallyIgnored(new Set())
    setSelectedRows(new Set())
    setStep('preview')
  }

  // ── Core row builder ──────────────────────────────────────────────────────
  const buildParsedRows = (): ParsedImportRow[] => {
    const results: ParsedImportRow[] = []
    for (let i = startRow + 1; i <= effectiveEndRow; i++) {
      const row = csvRows[i]
      if (!row) continue

      const rawDesc =
        columnMapping.descriptionColumn !== undefined
          ? row[columnMapping.descriptionColumn]?.trim() ?? ''
          : ''
      const description = rawDesc || 'Unknown'
      const descLower = description.toLowerCase()

      // Auto-ignore balance summary rows
      const isBalanceRow = BALANCE_ROW_KEYWORDS.some((kw) => descLower.includes(kw))
      if (isBalanceRow) {
        results.push({ rawRowIndex: i, description, amount: 0, type: 'expense', date: '', rawDate: '', status: 'ignored' })
        continue
      }

      // Amount
      let amount = 0
      let type: 'income' | 'expense' = 'expense'
      if (columnMapping.amountColumn !== undefined) {
        amount = parseAmount(row[columnMapping.amountColumn])
      } else {
        const debit = columnMapping.debitColumn !== undefined ? parseAmount(row[columnMapping.debitColumn]) : 0
        const credit = columnMapping.creditColumn !== undefined ? parseAmount(row[columnMapping.creditColumn]) : 0
        if (debit > 0) { amount = debit; type = 'expense' }
        else if (credit > 0) { amount = credit; type = 'income' }
      }
      if (!amount || Number.isNaN(amount)) {
        results.push({ rawRowIndex: i, description, amount: 0, type: 'expense', date: '', rawDate: '', status: 'no_amount' })
        continue
      }

      // Override type from type column
      if (columnMapping.typeColumn !== undefined) {
        const t = row[columnMapping.typeColumn]?.toLowerCase().trim() ?? ''
        if (t.includes('credit') || t.includes('income') || t.includes('received') ||
            t.includes('interest') || t.includes('salary') || t.includes('deposit')) {
          type = 'income'
        } else if (t) {
          type = 'expense'
        }
      }

      // Date
      const rawDate =
        columnMapping.dateColumn !== undefined
          ? row[columnMapping.dateColumn]?.trim() ?? ''
          : ''
      if (!rawDate && columnMapping.dateColumn !== undefined) {
        results.push({ rawRowIndex: i, description, amount, type, date: '', rawDate: '', status: 'invalid_date' })
        continue
      }
      const parsedDate = rawDate ? parseImportDate(rawDate, dateFormat) : null
      if (rawDate && !parsedDate) {
        results.push({ rawRowIndex: i, description, amount, type, date: '', rawDate, status: 'invalid_date' })
        continue
      }

      const date = parsedDate ?? (() => {
        const n = new Date()
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
      })()
      results.push({ rawRowIndex: i, description, amount, type, date, rawDate, status: 'valid' })
    }
    return results
  }

  // ── Batch 4: Bulk delete actions ──────────────────────────────────────────
  const activeRows = parsedRows.filter((r) => !manuallyIgnored.has(r.rawRowIndex))
  const validRows = activeRows.filter((r) => r.status === 'valid')
  const invalidDateRows = activeRows.filter((r) => r.status === 'invalid_date')
  const noAmountRows = activeRows.filter((r) => r.status === 'no_amount')
  const ignoredRows = parsedRows.filter((r) => r.status === 'ignored' || manuallyIgnored.has(r.rawRowIndex))

  const handleToggleSelect = (idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleSelectAllInvalid = () => {
    const invalidIndices = activeRows
      .filter((r) => r.status !== 'valid')
      .map((r) => r.rawRowIndex)
    setSelectedRows(new Set(invalidIndices))
  }

  const handleSelectAll = () => {
    if (selectedRows.size === activeRows.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(activeRows.map((r) => r.rawRowIndex)))
    }
  }

  const handleDeleteSelected = () => {
    setManuallyIgnored((prev) => new Set([...prev, ...selectedRows]))
    setSelectedRows(new Set())
  }

  const handleRestoreAll = () => {
    setManuallyIgnored(new Set())
    setSelectedRows(new Set())
  }

  // ── Final confirm → send valid rows to parent ─────────────────────────────
  const handleConfirm = () => {
    if (validRows.length === 0) {
      onError('No valid transactions to import. Fix date errors or restore ignored rows.')
      return
    }
    const transactions = validRows.map((r) => ({
      amount: r.amount,
      type: r.type,
      description: r.description,
      date: r.date,
    }))
    onFileProcess(transactions, columnMapping)
  }

  // ── Range row click ────────────────────────────────────────────────────────
  const handleRowNumberClick = (rowIdx: number) => {
    if (rangeClickTarget === 'start') {
      setStartRow(rowIdx)
      setRangeClickTarget('end')
    } else {
      if (rowIdx <= startRow) {
        setStartRow(rowIdx)
      } else {
        setEndRow(rowIdx)
      }
      setRangeClickTarget('start')
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const colOptionLabel = (idx: number) => {
    const headerVal = headerRow[idx]?.trim()
    return headerVal ? `${idx}: ${headerVal.substring(0, 22)}` : `Column ${idx}`
  }

  const RANGE_PREVIEW_LIMIT = 12
  const displayRows = showAllRows ? csvRows : csvRows.slice(0, Math.max(effectiveEndRow + 3, RANGE_PREVIEW_LIMIT))

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="bulk-upload-flow">

      {/* ── STEP 1: Upload dropzone ─────────────────────────────────── */}
      {step === 'upload' && (
        <div
          className="bulk-upload-dropzone"
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            hidden
            aria-hidden="true"
            tabIndex={-1}
            disabled={isLoading}
          />
          <div className="bulk-upload-dropzone-icon">
            <Upload className="w-12 h-12" />
          </div>
          <h3 className="bulk-upload-title">Upload your bank statement</h3>
          <p className="bulk-upload-copy">
            We'll detect your columns automatically, handle Indian date formats, and let you review everything before anything is saved.
          </p>
          <button type="button" className="primary-button bulk-upload-choose" disabled={isLoading}>
            Choose CSV File
          </button>
          <p className="bulk-upload-helper">Export your bank statement as CSV, then upload it here.</p>
          {file && (
            <div className="bulk-upload-selected">
              <CheckCircle2 className="w-5 h-5" />
              <span>{file.name}</span>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Range selection ─────────────────────────────────── */}
      {step === 'range' && csvRows.length > 0 && (
        <div className="bulk-upload-section">
          <div className="bulk-upload-section-header">
            <div>
              <h3>Select Statement Range</h3>
              <p>
                Most bank exports have metadata above and below the actual table. Click a row number to set it as your header, then adjust the end row if needed.
              </p>
            </div>
            <div className="bulk-range-file-badge">
              <CheckCircle2 className="w-4 h-4" />
              <span>{file?.name}</span>
            </div>
          </div>

          {/* Range controls */}
          <div className="bulk-range-controls">
            <div className="bulk-range-control-group">
              <label>Header / start row</label>
              <div className="bulk-range-row-hint">
                <span className="bulk-range-row-hint-badge">Row {startRow + 1}</span>
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  {rangeClickTarget === 'start' ? 'Click a row number below to move it' : 'Click a row number to set end row'}
                </span>
                <button
                  type="button"
                  className="bulk-range-retarget-btn"
                  onClick={() => setRangeClickTarget(rangeClickTarget === 'start' ? 'end' : 'start')}
                >
                  {rangeClickTarget === 'start' ? 'Switch to setting end row' : 'Switch to setting start row'}
                </button>
              </div>
            </div>

            <div className="bulk-upload-mapping-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.7rem' }}>
              <div className="quick-field">
                <label>Header row</label>
                <input
                  type="number"
                  min={1}
                  max={csvRows.length}
                  value={startRow + 1}
                  onChange={(e) => setStartRow(Math.max(0, Number(e.target.value) - 1))}
                />
              </div>
              <div className="quick-field">
                <label>End row (optional)</label>
                <input
                  type="number"
                  min={startRow + 2}
                  max={csvRows.length}
                  value={endRow !== undefined ? endRow + 1 : ''}
                  placeholder={`${csvRows.length} (last)`}
                  onChange={(e) =>
                    setEndRow(e.target.value ? Math.max(startRow + 1, Number(e.target.value) - 1) : undefined)
                  }
                />
              </div>
              <div className="quick-field">
                <label>Start column (optional)</label>
                <input
                  type="number"
                  min={1}
                  max={totalCols}
                  value={startCol > 0 ? startCol + 1 : ''}
                  placeholder="1 (first)"
                  onChange={(e) =>
                    setStartCol(e.target.value ? Math.max(0, Number(e.target.value) - 1) : 0)
                  }
                />
              </div>
              <div className="quick-field">
                <label>End column (optional)</label>
                <input
                  type="number"
                  min={startCol + 1}
                  max={totalCols}
                  value={endCol !== undefined ? endCol + 1 : ''}
                  placeholder={`${totalCols} (last)`}
                  onChange={(e) =>
                    setEndCol(e.target.value ? Math.max(startCol, Number(e.target.value) - 1) : undefined)
                  }
                />
              </div>
            </div>
          </div>

          {/* Range summary */}
          <div className="bulk-range-summary">
            <span className="bulk-range-summary-pill is-green">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {Math.max(0, effectiveEndRow - startRow)} data rows selected
            </span>
            <span className="bulk-range-summary-pill">
              {effectiveEndCol - startCol + 1} of {totalCols} columns
            </span>
            {csvRows.length > RANGE_PREVIEW_LIMIT && !showAllRows && (
              <span className="muted" style={{ fontSize: '0.82rem' }}>
                Showing first {RANGE_PREVIEW_LIMIT} rows of {csvRows.length}
              </span>
            )}
          </div>

          {/* Raw CSV table */}
          <div className="overflow-x-auto table-wrap bulk-upload-table-wrap">
            <table className="w-full text-sm bulk-range-table">
              <thead>
                <tr>
                  <th className="bulk-range-rownum-cell">#</th>
                  {csvRows[0]?.map((_, colIdx) => (
                    <th
                      key={colIdx}
                      className={`bulk-range-col-header ${colIdx >= startCol && colIdx <= effectiveEndCol ? 'is-in-range' : 'is-out-of-range'}`}
                    >
                      {colIdx + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, rowIdx) => {
                  const isHeader = rowIdx === startRow
                  const isInRange = rowIdx > startRow && rowIdx <= effectiveEndRow
                  const isOutside = rowIdx < startRow || rowIdx > effectiveEndRow
                  return (
                    <tr
                      key={rowIdx}
                      className={`bulk-range-row ${isHeader ? 'is-header' : ''} ${isInRange ? 'is-in-range' : ''} ${isOutside ? 'is-outside-range' : ''}`}
                    >
                      <td className="bulk-range-rownum-cell">
                        <button
                          type="button"
                          className={`bulk-range-rownum-btn ${isHeader ? 'is-header' : ''}`}
                          title={
                            rangeClickTarget === 'start'
                              ? `Set row ${rowIdx + 1} as header`
                              : `Set row ${rowIdx + 1} as end row`
                          }
                          onClick={() => handleRowNumberClick(rowIdx)}
                        >
                          {rowIdx + 1}
                        </button>
                      </td>
                      {row.map((cell, colIdx) => (
                        <td
                          key={colIdx}
                          className={`bulk-range-cell ${colIdx >= startCol && colIdx <= effectiveEndCol ? 'is-in-range' : 'is-out-of-range'}`}
                        >
                          {cell?.trim().substring(0, 28)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {csvRows.length > RANGE_PREVIEW_LIMIT && (
            <button
              type="button"
              className="bulk-range-show-more"
              onClick={() => setShowAllRows((v) => !v)}
            >
              {showAllRows ? (
                <><ChevronUp className="w-4 h-4" /> Show less</>
              ) : (
                <><ChevronDown className="w-4 h-4" /> Show all {csvRows.length} rows</>
              )}
            </button>
          )}

          <div className="quick-entry-actions">
            <button
              onClick={() => { setStep('upload'); setFile(null); setCsvRows([]) }}
              className="ghost-button"
              disabled={isLoading}
            >
              Back
            </button>
            <button onClick={handleRangeConfirm} className="primary-button" disabled={isLoading}>
              Confirm Range &amp; Map Columns
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Column mapping + date format ────────────────────── */}
      {step === 'mapping' && (
        <div className="bulk-upload-section">
          <div className="bulk-upload-section-header">
            <div>
              <h3>Map Columns</h3>
              <p>
                We've auto-detected your columns. Confirm the mappings, then set the date format your statement uses.
              </p>
            </div>
          </div>

          {/* Header row preview */}
          <div className="overflow-x-auto table-wrap bulk-upload-table-wrap">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {mappableCols.map(({ idx, label }) => (
                    <th key={idx} className="px-3 py-2 text-left border-r text-xs">
                      <span className="text-gray-400 block">col {idx + 1}</span>
                      {label.substring(0, 20)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvRows.slice(startRow + 1, startRow + 4).map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-gray-50' : ''}>
                    {mappableCols.map(({ idx }) => (
                      <td key={idx} className="px-3 py-1.5 border-r text-gray-600 text-xs">
                        {(row[idx] ?? '').trim().substring(0, 26)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bulk-upload-mapping-grid">
            {/* Date column */}
            <div className="quick-field">
              <label>Date Column</label>
              <select
                value={columnMapping.dateColumn ?? ''}
                onChange={(e) => handleColumnChange('dateColumn', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">None (use today)</option>
                {mappableCols.map(({ idx }) => (
                  <option key={idx} value={idx}>{colOptionLabel(idx)}</option>
                ))}
              </select>
            </div>

            {/* Description column */}
            <div className="quick-field">
              <label>Description Column *</label>
              <select
                value={columnMapping.descriptionColumn ?? ''}
                onChange={(e) => handleColumnChange('descriptionColumn', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Select column…</option>
                {mappableCols.map(({ idx }) => (
                  <option key={idx} value={idx}>{colOptionLabel(idx)}</option>
                ))}
              </select>
            </div>

            {/* Amount column */}
            <div className="quick-field">
              <label>Amount Column</label>
              <select
                value={columnMapping.amountColumn ?? ''}
                onChange={(e) => handleColumnChange('amountColumn', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Select column…</option>
                {mappableCols.map(({ idx }) => (
                  <option key={idx} value={idx}>{colOptionLabel(idx)}</option>
                ))}
              </select>
            </div>

            {/* Debit column */}
            <div className="quick-field">
              <label>Debit Column</label>
              <select
                value={columnMapping.debitColumn ?? ''}
                onChange={(e) => handleColumnChange('debitColumn', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Select column…</option>
                {mappableCols.map(({ idx }) => (
                  <option key={idx} value={idx}>{colOptionLabel(idx)}</option>
                ))}
              </select>
            </div>

            {/* Credit column */}
            <div className="quick-field">
              <label>Credit Column</label>
              <select
                value={columnMapping.creditColumn ?? ''}
                onChange={(e) => handleColumnChange('creditColumn', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Select column…</option>
                {mappableCols.map(({ idx }) => (
                  <option key={idx} value={idx}>{colOptionLabel(idx)}</option>
                ))}
              </select>
            </div>

            {/* Type column */}
            <div className="quick-field">
              <label>Type Column (optional)</label>
              <select
                value={columnMapping.typeColumn ?? ''}
                onChange={(e) => handleColumnChange('typeColumn', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">None (default: expense)</option>
                {mappableCols.map(({ idx }) => (
                  <option key={idx} value={idx}>{colOptionLabel(idx)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Batch 2: Date format selector ── */}
          {columnMapping.dateColumn !== undefined && (
            <div className="bulk-date-format-panel">
              <div className="bulk-date-format-header">
                <div>
                  <p className="bulk-date-format-label">Date Format</p>
                  {detectedFormat.confidence === 'high' && dateFormat === detectedFormat.format && (
                    <span className="bulk-date-format-detected">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Auto-detected
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="bulk-date-format-help-btn"
                  onClick={() => setShowFormatHelp((v) => !v)}
                >
                  Why does this matter?
                </button>
              </div>

              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                className="bulk-date-format-select"
              >
                {(Object.entries(DATE_FORMAT_LABELS) as [DateFormat, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>

              {firstDatePreview && (
                <p className={`bulk-date-format-preview ${firstDatePreview.includes('could not parse') ? 'is-error' : 'is-ok'}`}>
                  {firstDatePreview.includes('could not parse') ? (
                    <AlertCircle className="w-3.5 h-3.5 inline-block mr-1" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1" />
                  )}
                  {firstDatePreview}
                </p>
              )}

              {showFormatHelp && (
                <div className="bulk-date-format-help-box">
                  <p>
                    Indian bank statements write dates as <strong>DD/MM/YYYY</strong> (day first).
                    JavaScript and many tools default to <strong>MM/DD/YYYY</strong> (month first).
                    This means <em>01/05/2025</em> could be read as <em>1 May</em> or <em>5 January</em>
                    depending on the parser. Selecting the right format ensures every date is correct.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="quick-entry-actions">
            <button onClick={() => setStep('range')} className="ghost-button" disabled={isLoading}>
              Back
            </button>
            <button onClick={handleMappingConfirm} className="primary-button" disabled={isLoading}>
              Preview Transactions
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Preview with bulk actions ──────────────────────── */}
      {step === 'preview' && parsedRows.length > 0 && (
        <div className="bulk-upload-section">
          <div className="bulk-upload-section-header">
            <div>
              <h3>Review Parsed Transactions</h3>
              <p>Fix or remove problem rows before continuing.</p>
            </div>
            <button
              type="button"
              className="ghost-button bulk-preview-reparse-btn"
              onClick={() => { setParsedRows(buildParsedRows()); setManuallyIgnored(new Set()); setSelectedRows(new Set()) }}
              title="Re-run parsing with current settings"
            >
              <RotateCcw className="w-4 h-4" /> Re-parse
            </button>
          </div>

          {/* Status summary bar */}
          <div className="bulk-preview-status-bar">
            <span className="bulk-preview-stat is-valid">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {validRows.length} ready
            </span>
            {invalidDateRows.length > 0 && (
              <span className="bulk-preview-stat is-invalid">
                <AlertCircle className="w-3.5 h-3.5" />
                {invalidDateRows.length} invalid date
              </span>
            )}
            {noAmountRows.length > 0 && (
              <span className="bulk-preview-stat is-warning">
                <AlertCircle className="w-3.5 h-3.5" />
                {noAmountRows.length} no amount
              </span>
            )}
            {ignoredRows.length > 0 && (
              <span className="bulk-preview-stat is-ignored">
                {ignoredRows.length} ignored
              </span>
            )}
          </div>

          {/* Date error banner */}
          {invalidDateRows.length > 0 && (
            <div className="bulk-preview-error-banner">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <div>
                <strong>{invalidDateRows.length} rows have unreadable dates</strong> (e.g. "{invalidDateRows[0]?.rawDate}").
                Go back and change the <em>Date Format</em> setting, or select and delete these rows below.
              </div>
              <button type="button" className="ghost-button bulk-preview-banner-btn" onClick={() => setStep('mapping')}>
                Change format
              </button>
            </div>
          )}

          {/* Bulk action toolbar */}
          <div className="bulk-preview-toolbar">
            <label className="bulk-preview-select-all">
              <input
                type="checkbox"
                checked={selectedRows.size === activeRows.length && activeRows.length > 0}
                onChange={handleSelectAll}
              />
              <span>{selectedRows.size > 0 ? `${selectedRows.size} selected` : 'Select all'}</span>
            </label>
            <div className="bulk-preview-toolbar-actions">
              {invalidDateRows.length > 0 || noAmountRows.length > 0 ? (
                <button type="button" className="bulk-preview-action-btn is-warn" onClick={handleSelectAllInvalid}>
                  Select all invalid
                </button>
              ) : null}
              {selectedRows.size > 0 && (
                <button type="button" className="bulk-preview-action-btn is-danger" onClick={handleDeleteSelected}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete selected ({selectedRows.size})
                </button>
              )}
              {manuallyIgnored.size > 0 && (
                <button type="button" className="bulk-preview-action-btn is-restore" onClick={handleRestoreAll}>
                  <RotateCcw className="w-3.5 h-3.5" /> Restore all ({manuallyIgnored.size})
                </button>
              )}
            </div>
          </div>

          {/* Parsed rows table */}
          <div className="overflow-x-auto table-wrap bulk-upload-table-wrap">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-2 text-left w-8"></th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((row) => {
                  const isSelected = selectedRows.has(row.rawRowIndex)
                  return (
                    <tr
                      key={row.rawRowIndex}
                      className={`bulk-preview-row status-${row.status} ${isSelected ? 'is-selected' : ''}`}
                    >
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(row.rawRowIndex)}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {row.status === 'invalid_date' ? (
                          <span className="bulk-preview-raw-date">
                            <AlertCircle className="w-3 h-3" /> {row.rawDate || '—'}
                          </span>
                        ) : row.date}
                      </td>
                      <td className="px-3 py-2">{row.description.substring(0, 44)}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {row.amount > 0 ? formatCurrency(row.amount, currency) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {row.status !== 'no_amount' && row.amount > 0 && (
                          <span className={`bulk-preview-type-badge ${row.type}`}>{row.type}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`bulk-preview-status-badge status-${row.status}`}>
                          {row.status === 'valid' && 'Ready'}
                          {row.status === 'invalid_date' && 'Bad date'}
                          {row.status === 'no_amount' && 'No amount'}
                          {row.status === 'ignored' && 'Ignored'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {ignoredRows.length > 0 && (
            <details className="bulk-preview-ignored-details">
              <summary>{ignoredRows.length} ignored rows (opening/closing balance or manually removed)</summary>
              <ul className="bulk-preview-ignored-list">
                {ignoredRows.map((r) => (
                  <li key={r.rawRowIndex}>
                    Row {r.rawRowIndex + 1} — {r.description.substring(0, 60)}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="quick-entry-actions">
            <button onClick={() => setStep('mapping')} className="ghost-button" disabled={isLoading}>
              Back
            </button>
            <button
              onClick={handleConfirm}
              className="primary-button"
              disabled={isLoading || validRows.length === 0}
            >
              {isLoading ? 'Processing…' : `Continue with ${validRows.length} transaction${validRows.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Utility: robust CSV split (handles quoted commas and \r\n) ─────────────
function splitCSV(content: string): string[][] {
  const rows: string[][] = []
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur.trim())
    rows.push(cells)
  }
  return rows
}
