import { useState } from 'react'
import { Upload, Type, CheckCircle2 } from 'lucide-react'
import { BulkImportUpload } from '../components/BulkImportUpload'
import { BulkManualEntry, type ManualTransaction } from '../components/BulkManualEntry'
import { BulkImportReview, type PreviewTransaction } from '../components/BulkImportReview'
import { useBulkImportSubmit, useBulkImportConfig } from '../hooks/useBulkImport'
import { useProfile } from '../../profile/hooks/useProfile'
import { useCategories } from '../hooks/useCategories'
import { buildImportReview, type ImportRowInput } from '../../../shared/utils/categorizeTransaction'

export default function BulkImportPage() {
  const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv')
  const [step, setStep] = useState<'input' | 'preview' | 'complete'>('input')
  const [previewData, setPreviewData] = useState<{
    transactions: PreviewTransaction[]
    categorizedCount: number
  } | null>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [error, setError] = useState<string>('')

  const submitMutation = useBulkImportSubmit()
  const profileQuery = useProfile()
  const categoriesQuery = useCategories()
  const bulkConfigQuery = useBulkImportConfig()
  const currency = profileQuery.data?.users?.[0]?.currency ?? 'INR'
  const maxBatch = bulkConfigQuery.data?.maxTransactionsPerBatch ?? 500

  const prepareReview = (transactions: ImportRowInput[]) => {
    setError('')

    if (transactions.length > maxBatch) {
      setError(
        `This selection has ${transactions.length} transactions, but the limit is ${maxBatch} per import. ` +
        `Use the range selector to split your statement into batches of up to ${maxBatch} rows and import each batch separately.`
      )
      return
    }

    const categories = categoriesQuery.data?.categories
    if (!categories?.length) {
      setError('Categories are still loading. Please try again in a moment.')
      return
    }

    const review = buildImportReview(transactions, categories)
    setPreviewData(review)
    setStep('preview')
  }

  const handleCsvFileProcess = (transactions: Array<{
    amount: number
    type: 'income' | 'expense'
    description: string
    date: string
    category_id?: string
  }>) => {
    prepareReview(transactions)
  }

  const handleManualTransactionsReady = (transactions: ManualTransaction[]) => {
    prepareReview(transactions.map((tx) => ({
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      date: tx.date,
      category_id: tx.category_id,
    })))
  }

  const handleReviewConfirm = async (transactionsToImport: Array<{
    amount: number
    type: 'income' | 'expense'
    description: string
    date: string
    category_id: string
  }>) => {
    setError('')
    try {
      await submitMutation.mutateAsync({ transactions: transactionsToImport })
      setCompletedCount(transactionsToImport.length)
      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import transactions')
    }
  }

  const getProgressPercent = () => {
    if (step === 'input') return 33
    if (step === 'preview') return 66
    if (step === 'complete') return 100
    return 0
  }

  const resetImportFlow = () => {
    setStep('input')
    setActiveTab('csv')
    setPreviewData(null)
    setCompletedCount(0)
    setError('')
  }

  const categoriesLoading = categoriesQuery.isLoading && !categoriesQuery.data

  return (
    <section className="bulk-import-page">
      <div className="bulk-import-hero">
        <div>
          <span className="transactions-import-eyebrow">Transactions</span>
          <h1>Bulk Import</h1>
          <p className="muted bulk-import-subtitle">
            Upload a CSV statement or stage multiple entries in one pass, review categories, then import when ready.
          </p>
        </div>
      </div>

      <div className="table-wrap bulk-import-shell">
        <div className="bulk-import-progress">
          <div className="bulk-import-progress-steps">
            {[
              { step: 'input', label: 'Input', icon: activeTab === 'csv' ? Upload : Type },
              { step: 'preview', label: 'Review', icon: CheckCircle2 },
              { step: 'complete', label: 'Complete', icon: CheckCircle2 },
            ].map((item, idx) => {
              const Icon = item.icon
              const isActive = step === item.step
              const stepIndex = step === 'input' ? 0 : step === 'preview' ? 1 : 2
              const isCompleted = idx < stepIndex

              return (
                <div key={item.step} className="bulk-import-step">
                  <div className={`bulk-import-step-icon ${isActive ? 'is-active' : isCompleted ? 'is-complete' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="bulk-import-step-label">Step {idx + 1}</p>
                    <p className="bulk-import-step-title">{item.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="bulk-import-progress-bar">
            <div
              className="bulk-import-progress-fill"
              style={{ width: `${getProgressPercent()}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="bulk-import-error">
            <p>{error}</p>
          </div>
        )}

        <div className="bulk-import-card">
          {step === 'input' && (
            <>
              <div className="bulk-import-tabs">
                  <button
                    onClick={() => setActiveTab('csv')}
                    className={`bulk-import-tab ${activeTab === 'csv' ? 'is-active' : ''}`}
                  >
                    <div className="bulk-import-tab-inner">
                      <Upload className="w-4 h-4" />
                      Upload CSV
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className={`bulk-import-tab ${activeTab === 'manual' ? 'is-active' : ''}`}
                  >
                    <div className="bulk-import-tab-inner">
                      <Type className="w-4 h-4" />
                      Manual Entry
                    </div>
                  </button>
              </div>

              <div className="bulk-import-card-body">
                {categoriesLoading ? (
                  <p className="muted">Loading categories…</p>
                ) : activeTab === 'csv' ? (
                  <BulkImportUpload
                    onFileProcess={handleCsvFileProcess}
                    onError={setError}
                    isLoading={false}
                    currency={currency}
                  />
                ) : (
                  <BulkManualEntry
                    onTransactionsReady={handleManualTransactionsReady}
                    onError={setError}
                    isLoading={false}
                    currency={currency}
                  />
                )}
              </div>
            </>
          )}

          {step === 'preview' && previewData && (
            <div className="bulk-import-card-body">
              <BulkImportReview
                transactions={previewData.transactions}
                categorizedCount={previewData.categorizedCount}
                onConfirm={handleReviewConfirm}
                onBack={() => {
                  setStep('input')
                  setPreviewData(null)
                  setError('')
                }}
                isLoading={submitMutation.isPending}
              />
            </div>
          )}

          {step === 'complete' && (
            <div className="bulk-import-complete">
              <div className="bulk-import-complete-icon">
                <CheckCircle2 className="w-16 h-16" />
              </div>
              <h2>Import Complete</h2>
              <p className="muted">
                {completedCount} transactions were imported successfully. Your transactions list and insights are now refreshed.
              </p>
              <div className="bulk-import-complete-actions">
                <button
                  onClick={resetImportFlow}
                  className="primary-button"
                >
                  Import More Transactions
                </button>
                <button onClick={() => window.history.back()} className="ghost-button">
                  Back to Transactions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
