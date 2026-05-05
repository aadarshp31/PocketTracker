import { useState } from 'react'
import { Upload, Type, CheckCircle2 } from 'lucide-react'
import { BulkImportUpload } from '../components/BulkImportUpload'
import { BulkManualEntry, type ManualTransaction } from '../components/BulkManualEntry'
import { BulkImportReview, type PreviewTransaction, type FlaggedDuplicate } from '../components/BulkImportReview'
import { useBulkImportPreview, useBulkImportSubmit } from '../hooks/useBulkImport'
import { useProfile } from '../../profile/hooks/useProfile'

export default function BulkImportPage() {
  const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv')
  const [step, setStep] = useState<'input' | 'preview' | 'complete'>('input')
  const [previewData, setPreviewData] = useState<{
    transactions: PreviewTransaction[]
    duplicates: FlaggedDuplicate[]
    categorizedCount: number
    flaggedDuplicateCount: number
  } | null>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [error, setError] = useState<string>('')

  const previewMutation = useBulkImportPreview()
  const submitMutation = useBulkImportSubmit()
  const profileQuery = useProfile()
  const currency = profileQuery.data?.users?.[0]?.currency ?? 'INR'

  const handleCsvFileProcess = async (transactions: Array<{
    amount: number
    type: 'income' | 'expense'
    description: string
    date: string
    category_id?: string
    }>) => {
    setError('')

    try {
      const result = await previewMutation.mutateAsync({ transactions })
      setPreviewData(result.preview)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview transactions')
    }
  }

  const handleManualTransactionsReady = async (transactions: ManualTransaction[]) => {
    setError('')
    const txToProcess = transactions.map((tx) => ({
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      date: tx.date,
      category_id: tx.category_id,
    }))

    try {
      const result = await previewMutation.mutateAsync({ transactions: txToProcess })
      setPreviewData(result.preview)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview transactions')
    }
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

  return (
    <section className="bulk-import-page">
      <div className="bulk-import-hero">
        <div>
          <span className="transactions-import-eyebrow">Transactions</span>
          <h1>Bulk Import</h1>
          <p className="muted bulk-import-subtitle">
            Upload a CSV statement or stage multiple entries in one pass, then review duplicates before anything lands in your ledger.
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
                {activeTab === 'csv' ? (
                  <BulkImportUpload
                    onFileProcess={handleCsvFileProcess}
                    onError={setError}
                    isLoading={previewMutation.isPending}
                    currency={currency}
                  />
                ) : (
                  <BulkManualEntry
                    onTransactionsReady={handleManualTransactionsReady}
                    onError={setError}
                    isLoading={previewMutation.isPending}
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
                duplicates={previewData.duplicates}
                categorizedCount={previewData.categorizedCount}
                flaggedDuplicateCount={previewData.flaggedDuplicateCount}
                onConfirm={handleReviewConfirm}
                onBack={() => {
                  setStep('input')
                  setPreviewData(null)
                  setError('')
                }}
                isLoading={submitMutation.isPending}
                currency={currency}
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
