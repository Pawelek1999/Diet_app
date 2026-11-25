import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { QueryState } from '@/components/QueryState'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useDeleteProduct, useProduct, useSaveProduct } from '@/hooks/useProducts'
import { formatKcal, parseDecimal } from '@/lib/format'
import { isKcalConsistent, kcalFromMacros } from '@/lib/nutrition'
import {
  EMPTY_PRODUCT_FORM,
  productToFormValues,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from '@/lib/productForm'

export function ProductFormScreen() {
  const { id: idParam } = useParams()
  const id = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null
  const isNew = id === null
  const product = useProduct(id)

  if (!isNew && (product.isLoading || product.error)) {
    return (
      <>
        <ScreenHeader title="Produkt" backTo="/foods" />
        <QueryState isLoading={product.isLoading} error={product.error} onRetry={() => product.refetch()} />
      </>
    )
  }
  if (!isNew && !product.data) {
    return (
      <>
        <ScreenHeader title="Produkt" backTo="/foods" />
        <div className="empty">
          <p>Nie znaleziono produktu.</p>
        </div>
      </>
    )
  }

  return (
    <ProductForm
      key={id ?? 'new'}
      id={id}
      initial={product.data ? productToFormValues(product.data) : EMPTY_PRODUCT_FORM}
    />
  )
}

function ProductForm({ id, initial }: { id: number | null; initial: ProductFormValues }) {
  const navigate = useNavigate()
  const save = useSaveProduct()
  const remove = useDeleteProduct()
  const [values, setValues] = useState<ProductFormValues>(initial)
  const [errors, setErrors] = useState<ProductFormErrors>({})
  // `initial` is only read on mount; the parent remounts the form (key) when the product id changes,
  // so background refetches never overwrite what the user is typing.
  const [submitError, setSubmitError] = useState<string | null>(null)

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  // Live (non-blocking) consistency hint: declared kcal vs 4·B + 4·W + 9·T.
  const consistency = useMemo(() => {
    const kcal = parseDecimal(values.kcal)
    const protein = parseDecimal(values.protein) ?? 0
    const fat = parseDecimal(values.fat) ?? 0
    const carbs = parseDecimal(values.carbs) ?? 0
    if (kcal === null) return null
    const m = { kcal, protein, fat, carbs }
    return isKcalConsistent(m) ? null : kcalFromMacros(m)
  }, [values.kcal, values.protein, values.fat, values.carbs])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const result = validateProductForm(values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    try {
      await save.mutateAsync({ id, input: result.input })
      navigate('/foods', { replace: true })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Nie udało się zapisać.')
    }
  }

  async function handleDelete() {
    if (id === null) return
    if (!window.confirm(`Usunąć produkt „${values.name}"? Wcześniejsze wpisy w dzienniku zostaną zachowane.`)) return
    try {
      await remove.mutateAsync(id)
      navigate('/foods', { replace: true })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Nie udało się usunąć.')
    }
  }

  const busy = save.isPending || remove.isPending

  return (
    <>
      <ScreenHeader title={id === null ? 'Nowy produkt' : 'Edytuj produkt'} backTo="/foods" />

      <form className="form" onSubmit={handleSubmit} noValidate>
        <TextField label="Nazwa" value={values.name} error={errors.name} onChange={(v) => set('name', v)} autoFocus={id === null} />

        <fieldset className="fieldset">
          <legend>Wartości na 100 g</legend>
          <div className="grid-2">
            <NumberField label="Kalorie (kcal)" value={values.kcal} error={errors.kcal} onChange={(v) => set('kcal', v)} />
            <NumberField label="Białko (g)" value={values.protein} error={errors.protein} onChange={(v) => set('protein', v)} />
            <NumberField label="Tłuszcz (g)" value={values.fat} error={errors.fat} onChange={(v) => set('fat', v)} />
            <NumberField label="Węglowodany (g)" value={values.carbs} error={errors.carbs} onChange={(v) => set('carbs', v)} />
          </div>
          {consistency !== null && (
            <p className="form-warning" role="status">
              Kalorie nie zgadzają się z makro — z makro wychodzi ok. {formatKcal(consistency)} kcal. Sprawdź
              wartości (możesz zapisać mimo to).
            </p>
          )}
        </fieldset>

        <fieldset className="fieldset">
          <legend>Porcja (opcjonalnie)</legend>
          <div className="grid-2">
            <TextField label="Nazwa porcji" placeholder="np. 1 kubek" value={values.servingName} error={errors.servingName} onChange={(v) => set('servingName', v)} />
            <NumberField label="Waga porcji (g)" value={values.servingGrams} error={errors.servingGrams} onChange={(v) => set('servingGrams', v)} />
          </div>
        </fieldset>

        <label className="checkbox">
          <input type="checkbox" checked={values.isFavorite} onChange={(e) => set('isFavorite', e.target.checked)} />
          <span>Ulubiony</span>
        </label>

        {submitError && (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        )}

        <button type="submit" className="button button-primary" disabled={busy}>
          {save.isPending ? 'Zapisywanie…' : 'Zapisz'}
        </button>
        {id !== null && (
          <button type="button" className="button button-danger" onClick={handleDelete} disabled={busy}>
            Usuń produkt
          </button>
        )}
      </form>
    </>
  )
}

type FieldProps = {
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}

function TextField({ label, value, error, onChange, placeholder, autoFocus }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

function NumberField({ label, value, error, onChange, placeholder }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        enterKeyHint="next"
        autoComplete="off"
        value={value}
        placeholder={placeholder ?? '0'}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}
