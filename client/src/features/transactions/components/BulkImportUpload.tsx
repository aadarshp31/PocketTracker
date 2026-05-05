import { useState, useRef } from 'react'
import { Upload, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '../../../shared/utils/currency'

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
  onFileProcess: (transactions: Array<{
    amount: number
    type: 'income' | 'expense'
    description: string
    date: string
    category_id?: string
  }>, columnMapping: CSVColumnMapping) => void
  onError: (error: string) => void
  isLoading?: boolean
  currency?: string
}

export function BulkImportUpload({ onFileProcess, onError, isLoading = false, currency = 'INR' }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [columnMapping, setColumnMapping] = useState<CSVColumnMapping>({})
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      onError('Please select a CSV file')
      return
    }

    setFile(selectedFile)
    parseCSVFile(selectedFile)
  }

  const parseCSVFile = (csvFile: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const lines = content.split('\n').filter((line) => line.trim())
        const rows = lines.map((line) => {
          // Simple CSV parsing - proper implementation would handle quoted fields
          return line.split(',').map((cell) => cell.trim())
        })

        if (rows.length < 2) {
          onError('CSV file must have at least a header row and one data row')
          return
        }

        setCsvRows(rows)
        setStep('mapping')
        autoDetectColumns(rows[0])
      } catch (error) {
        onError(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    reader.readAsText(csvFile)
  }

  const autoDetectColumns = (headerRow: string[]) => {
    const mapping: CSVColumnMapping = {}

    headerRow.forEach((header, index) => {
      const lowerHeader = header.toLowerCase()

      if (lowerHeader === 'date' || lowerHeader.includes('transaction date') || lowerHeader.includes('posted')) {
        mapping.dateColumn = index
      } else if (lowerHeader.includes('value date')) {
        // Use value date only if plain Date wasn't found.
        if (mapping.dateColumn === undefined) {
          mapping.dateColumn = index
        }
      } else if (lowerHeader.includes('description') || lowerHeader.includes('memo')) {
        mapping.descriptionColumn = index
      } else if (lowerHeader.includes('debit') || lowerHeader.includes('withdrawal')) {
        mapping.debitColumn = index
      } else if (lowerHeader.includes('credit') || lowerHeader.includes('deposit')) {
        mapping.creditColumn = index
      } else if (
        lowerHeader.includes('amount') ||
        lowerHeader.includes('txn amount') ||
        lowerHeader.includes('transaction amount')
      ) {
        mapping.amountColumn = index
      } else if (lowerHeader.includes('transaction type') || lowerHeader === 'type' || lowerHeader.includes('category')) {
        mapping.typeColumn = index
      }
    })

    setColumnMapping(mapping)
  }

  const handleColumnChange = (column: keyof CSVColumnMapping, value: number | undefined) => {
    setColumnMapping((prev) => ({
      ...prev,
      [column]: value,
    }))
  }

  const handlePreview = () => {
    const hasAmount = columnMapping.amountColumn !== undefined
    const hasDebitCreditPair = columnMapping.debitColumn !== undefined || columnMapping.creditColumn !== undefined

    if (!hasAmount && !hasDebitCreditPair) {
      onError('Please map Amount column, or Debit/Credit columns')
      return
    }
    if (columnMapping.descriptionColumn === undefined) {
      onError('Please map the Description column')
      return
    }

    try {
      const transactions = parseTransactions()
      if (transactions.length === 0) {
        onError('No valid transactions found in the mapped rows')
        return
      }
      setStep('preview')
    } catch (error) {
      onError(`Failed to parse transactions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const parseTransactions = () => {
    if (!file || csvRows.length < 2) return []

    const transactions: Array<{
      amount: number
      type: 'income' | 'expense'
      description: string
      date: string
      category_id?: string
    }> = []

    const parseAmount = (raw: string | undefined) => {
      if (!raw) return 0
      const normalized = raw.replace(/[$€£¥₹,]/g, '').trim()
      if (!normalized) return 0
      const parsed = parseFloat(normalized)
      return Number.isFinite(parsed) ? parsed : 0
    }

    const parseDateString = (dateStr: string) => {
      const trimmed = dateStr.trim()
      const parsedNative = new Date(trimmed)
      if (!Number.isNaN(parsedNative.getTime())) return parsedNative.toISOString().split('T')[0]

      // Supports formats like 01-Apr-2025
      const customMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)
      if (!customMatch) return null
      const [, dd, mon, yyyy] = customMatch
      const months: Record<string, number> = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
      }
      const monthIndex = months[mon.toLowerCase()]
      if (monthIndex === undefined) return null
      const customDate = new Date(Number(yyyy), monthIndex, Number(dd))
      if (Number.isNaN(customDate.getTime())) return null
      return customDate.toISOString().split('T')[0]
    }

    // Skip header row, process data rows
    for (let i = 1; i < csvRows.length; i++) {
      const row = csvRows[i]

      // Get description
      const description = columnMapping.descriptionColumn !== undefined 
        ? row[columnMapping.descriptionColumn]?.trim() || 'Unknown'
        : 'Unknown'

      // Ignore synthetic statement rows
      const descriptionLower = description.toLowerCase()
      if (descriptionLower.includes('opening balance') || descriptionLower.includes('closing balance')) {
        continue
      }

      // Resolve amount from either Amount column or Debit/Credit split columns
      let amount = 0
      let type: 'income' | 'expense' = 'expense'

      if (columnMapping.amountColumn !== undefined) {
        amount = parseAmount(row[columnMapping.amountColumn])
      } else {
        const debitAmount = columnMapping.debitColumn !== undefined ? parseAmount(row[columnMapping.debitColumn]) : 0
        const creditAmount = columnMapping.creditColumn !== undefined ? parseAmount(row[columnMapping.creditColumn]) : 0
        if (debitAmount > 0) {
          amount = debitAmount
          type = 'expense'
        } else if (creditAmount > 0) {
          amount = creditAmount
          type = 'income'
        }
      }

      if (!amount || Number.isNaN(amount)) continue

      // Get date (default to today if not provided)
      let date = new Date().toISOString().split('T')[0]
      if (columnMapping.dateColumn !== undefined) {
        const dateStr = row[columnMapping.dateColumn]?.trim()
        if (dateStr) {
          const parsedDate = parseDateString(dateStr)
          if (parsedDate) {
            date = parsedDate
          }
        }
      }

      // Override type when type column exists
      if (columnMapping.typeColumn !== undefined) {
        const typeStr = row[columnMapping.typeColumn]?.toLowerCase().trim()
        if (
          typeStr?.includes('credit') ||
          typeStr?.includes('income') ||
          typeStr?.includes('received') ||
          typeStr?.includes('interest') ||
          typeStr?.includes('salary') ||
          typeStr?.includes('deposit')
        ) {
          type = 'income'
        } else if (typeStr) {
          type = 'expense'
        }
      }

      transactions.push({
        amount,
        type,
        description,
        date,
      })
    }

    return transactions
  }

  const handleConfirm = () => {
    try {
      const transactions = parseTransactions()
      if (transactions.length === 0) {
        onError('No valid transactions found')
        return
      }
      onFileProcess(transactions, columnMapping)
    } catch (error) {
      onError(`Failed to process transactions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="bulk-upload-flow">
      {step === 'upload' && (
        <div
          className="bulk-upload-dropzone"
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
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
          <h3 className="bulk-upload-title">Upload a CSV statement</h3>
          <p className="bulk-upload-copy">Choose a bank export file, map its columns, then review the imported rows before anything is saved.</p>
          <button type="button" className="primary-button bulk-upload-choose" disabled={isLoading}>
            Choose CSV File
          </button>
          <p className="bulk-upload-helper">Supported format: CSV bank statement export</p>
          {file && (
            <div className="bulk-upload-selected">
              <CheckCircle2 className="w-5 h-5" />
              <span>{file.name} selected</span>
            </div>
          )}
        </div>
      )}

      {step === 'mapping' && csvRows.length > 0 && (
        <div className="bulk-upload-section">
          <div className="bulk-upload-section-header">
            <h3>Map CSV Columns</h3>
            <p>Select which columns correspond to transaction data.</p>
          </div>

          <div className="overflow-x-auto table-wrap bulk-upload-table-wrap">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                    {csvRows[0].map((header, idx) => (
                    <th key={idx} className="px-4 py-2 text-left border-r">
                      Column {idx}: {header.substring(0, 20)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvRows.slice(1, 6).map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-gray-50' : ''}>
                    {row.map((cell, colIdx) => (
                      <td key={colIdx} className="px-4 py-2 border-r text-gray-600">
                        {cell.substring(0, 30)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bulk-upload-mapping-grid">
            <div className="quick-field">
              <label>Date Column</label>
              <select
                value={columnMapping.dateColumn ?? ''}
                onChange={(e) => handleColumnChange('dateColumn', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">None (use today)</option>
                {csvRows[0].map((_, idx) => (
                  <option key={idx} value={idx}>
                    Column {idx}
                  </option>
                ))}
              </select>
            </div>

            <div className="quick-field">
              <label>Description Column *</label>
              <select
                value={columnMapping.descriptionColumn ?? ''}
                onChange={(e) => handleColumnChange('descriptionColumn', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Select column...</option>
                {csvRows[0].map((_, idx) => (
                  <option key={idx} value={idx}>
                    Column {idx}
                  </option>
                ))}
              </select>
            </div>

            <div className="quick-field">
              <label>Amount Column (single amount)</label>
              <select
                value={columnMapping.amountColumn ?? ''}
                onChange={(e) => handleColumnChange('amountColumn', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Select column...</option>
                {csvRows[0].map((_, idx) => (
                  <option key={idx} value={idx}>
                    Column {idx}
                  </option>
                ))}
              </select>
            </div>

            <div className="quick-field">
              <label>Debit Column</label>
              <select
                value={columnMapping.debitColumn ?? ''}
                onChange={(e) => handleColumnChange('debitColumn', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Select column...</option>
                {csvRows[0].map((_, idx) => (
                  <option key={idx} value={idx}>
                    Column {idx}
                  </option>
                ))}
              </select>
            </div>

            <div className="quick-field">
              <label>Credit Column</label>
              <select
                value={columnMapping.creditColumn ?? ''}
                onChange={(e) => handleColumnChange('creditColumn', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Select column...</option>
                {csvRows[0].map((_, idx) => (
                  <option key={idx} value={idx}>
                    Column {idx}
                  </option>
                ))}
              </select>
            </div>

            <div className="quick-field">
              <label>Type Column (optional)</label>
              <select
                value={columnMapping.typeColumn ?? ''}
                onChange={(e) => handleColumnChange('typeColumn', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">None (default: expense)</option>
                {csvRows[0].map((_, idx) => (
                  <option key={idx} value={idx}>
                    Column {idx}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="muted" style={{ margin: 0 }}>
            For statements like your sample sheet, map Date, Description, Debit (INR), and Credit (INR). Transaction Type is optional.
          </p>

          <div className="quick-entry-actions">
            <button
              onClick={() => {
                setStep('upload')
                setFile(null)
                setCsvRows([])
                setColumnMapping({})
              }}
              className="ghost-button"
              disabled={isLoading}
            >
              Back
            </button>
            <button
              onClick={handlePreview}
              className="primary-button"
              disabled={isLoading}
            >
              Preview Transactions
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="bulk-upload-section">
          <div className="bulk-upload-section-header">
            <h3>Preview Parsed Transactions</h3>
            <p>Review the parsed rows before sending them into the categorization and duplicate-check flow.</p>
          </div>
          <div className="overflow-x-auto table-wrap bulk-upload-table-wrap">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">Type</th>
                </tr>
              </thead>
              <tbody>
                {parseTransactions().map((tx, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-2">{tx.date}</td>
                    <td className="px-4 py-2">{tx.description.substring(0, 40)}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(tx.amount, currency)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tx.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="quick-entry-actions">
            <button
              onClick={() => setStep('mapping')}
              className="ghost-button"
              disabled={isLoading}
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              className="primary-button"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Continue to Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
