import { useMemo, useState } from 'react'
import { useCategories } from '../../transactions/hooks/useCategories'
import {
  useAddCategoryKeyword,
  useCategoryKeywordMappings,
  useRemoveCategoryKeyword,
} from '../hooks/useCategoryKeywords'
import type { CategoryItem } from '../../transactions/api/getCategories'

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) {
      return response.data.message
    }
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

interface CategoryKeywordEditorProps {
  category: CategoryItem
  keywords: string[]
  mappingId?: string
  onAdd: (categoryId: string, keyword: string) => Promise<void>
  onRemove: (mappingId: string, keyword: string) => Promise<void>
  isBusy: boolean
}

function CategoryKeywordEditor({
  category,
  keywords,
  mappingId,
  onAdd,
  onRemove,
  isBusy,
}: CategoryKeywordEditorProps) {
  const [draftKeyword, setDraftKeyword] = useState('')
  const [localError, setLocalError] = useState('')

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const keyword = draftKeyword.trim()
    if (!keyword) {
      setLocalError('Enter a keyword first.')
      return
    }

    setLocalError('')
    try {
      await onAdd(category.id, keyword)
      setDraftKeyword('')
    } catch (error) {
      setLocalError(getApiErrorMessage(error, 'Failed to add keyword.'))
    }
  }

  return (
    <div className="category-keyword-editor">
      <div className="category-keyword-editor-header">
        <strong>{category.name}</strong>
        <span className="muted">{category.type === 'expense' ? 'Expense' : 'Income'}</span>
      </div>

      {keywords.length > 0 ? (
        <div className="category-keyword-chip-list">
          {keywords.map((keyword) => (
            <button
              key={keyword}
              type="button"
              className="category-keyword-chip"
              disabled={isBusy || !mappingId}
              onClick={() => {
                if (!mappingId) return
                void onRemove(mappingId, keyword)
              }}
              title="Remove keyword"
            >
              {keyword}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted category-keyword-empty">No keywords yet.</p>
      )}

      <form onSubmit={(event) => void handleAdd(event)} className="category-keyword-add-form">
        <input
          type="text"
          value={draftKeyword}
          onChange={(event) => setDraftKeyword(event.target.value)}
          placeholder="e.g., swiggy, zomato, uber"
          disabled={isBusy}
          maxLength={100}
        />
        <button type="submit" disabled={isBusy}>
          Add
        </button>
      </form>
      {localError ? <p className="error">{localError}</p> : null}
    </div>
  )
}

export function CategoryKeywordSettings() {
  const categoriesQuery = useCategories()
  const mappingsQuery = useCategoryKeywordMappings()
  const addKeyword = useAddCategoryKeyword()
  const removeKeyword = useRemoveCategoryKeyword()
  const [globalError, setGlobalError] = useState('')

  const categories = categoriesQuery.data?.categories ?? []
  const mappings = mappingsQuery.data ?? []

  const mappingsByCategoryId = useMemo(
    () => new Map(mappings.map((mapping) => [mapping.category_id, mapping])),
    [mappings],
  )

  const expenseCategories = categories.filter((category) => category.type === 'expense')
  const incomeCategories = categories.filter((category) => category.type === 'income')

  const isLoading = categoriesQuery.isLoading || mappingsQuery.isLoading
  const isBusy = addKeyword.isPending || removeKeyword.isPending

  async function handleAdd(categoryId: string, keyword: string) {
    setGlobalError('')
    try {
      await addKeyword.mutateAsync({ category_id: categoryId, keyword })
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to add keyword.')
      setGlobalError(message)
      throw error
    }
  }

  async function handleRemove(mappingId: string, keyword: string) {
    setGlobalError('')
    try {
      await removeKeyword.mutateAsync({ mappingId, keyword })
    } catch (error) {
      setGlobalError(getApiErrorMessage(error, 'Failed to remove keyword.'))
    }
  }

  if (isLoading) {
    return <p className="muted">Loading category keywords...</p>
  }

  if (categoriesQuery.isError || mappingsQuery.isError) {
    return <p className="error">Failed to load category keyword settings.</p>
  }

  return (
    <div className="category-keyword-settings">
      <h2 style={{ marginTop: 0 }}>Category Keywords</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Add merchant or description keywords for each category. When you create or import a transaction,
        matching keywords suggest the category automatically before you save.
      </p>
      <p className="muted" style={{ marginTop: 0 }}>
        Example: map <strong>swiggy</strong>, <strong>zomato</strong>, and <strong>eatsure</strong> to Dining Out.
      </p>

      {globalError ? <p className="error">{globalError}</p> : null}

      <div className="category-keyword-section">
        <h3>Expense Categories</h3>
        <div className="category-keyword-grid">
          {expenseCategories.map((category) => {
            const mapping = mappingsByCategoryId.get(category.id)
            return (
              <CategoryKeywordEditor
                key={category.id}
                category={category}
                keywords={mapping?.keywords ?? []}
                mappingId={mapping?.id}
                onAdd={handleAdd}
                onRemove={handleRemove}
                isBusy={isBusy}
              />
            )
          })}
        </div>
      </div>

      <div className="category-keyword-section">
        <h3>Income Categories</h3>
        <div className="category-keyword-grid">
          {incomeCategories.map((category) => {
            const mapping = mappingsByCategoryId.get(category.id)
            return (
              <CategoryKeywordEditor
                key={category.id}
                category={category}
                keywords={mapping?.keywords ?? []}
                mappingId={mapping?.id}
                onAdd={handleAdd}
                onRemove={handleRemove}
                isBusy={isBusy}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
