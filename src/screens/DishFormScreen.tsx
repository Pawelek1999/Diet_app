import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { MacroGrid } from '@/components/MacroGrid'
import { ProductPicker } from '@/components/ProductPicker'
import { QueryState } from '@/components/QueryState'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useDish, useSaveDish } from '@/hooks/useDishes'
import { useProducts } from '@/hooks/useProducts'
import {
  dishToFormValues,
  EMPTY_DISH_FORM,
  validateDishForm,
  type DishFormErrors,
  type DishFormValues,
  type DishMode,
} from '@/lib/dishForm'
import { summarizeDish } from '@/lib/dishes'
import { formatAmount, formatKcal, parseDecimal } from '@/lib/format'
import { safeReturnTo } from '@/lib/navigation'
import { isKcalConsistent, kcalFromMacros } from '@/lib/nutrition'
import type { DishIngredientWithProduct, Macros, Product } from '@/types'

export function DishFormScreen() {
  const { id: idParam } = useParams()
  const id = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null
  const dish = useDish(id)
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const backTo = returnTo ?? (id === null ? '/foods?tab=dishes' : `/dish/${id}`)

  if (id !== null && (dish.isLoading || dish.error)) {
    return (
      <>
        <ScreenHeader title="Danie" backTo={backTo} />
        <QueryState isLoading={dish.isLoading} error={dish.error} onRetry={() => dish.refetch()} />
      </>
    )
  }
  if (id !== null && !dish.data) {
    return (
      <>
        <ScreenHeader title="Danie" backTo={backTo} />
        <div className="empty">
          <p>Nie znaleziono dania.</p>
        </div>
      </>
    )
  }

  return (
    <DishForm
      key={id ?? 'new'}
      id={id}
      backTo={backTo}
      returnTo={returnTo}
      initial={dish.data ? dishToFormValues(dish.data) : EMPTY_DISH_FORM}
    />
  )
}

type DishFormProps = { id: number | null; backTo: string; returnTo: string | null; initial: DishFormValues }

function DishForm({ id, backTo, returnTo, initial }: DishFormProps) {
  const navigate = useNavigate()
  const save = useSaveDish()
  const products = useProducts()
  // `initial` is read on mount only; the parent remounts via key when the id changes.
  const [values, setValues] = useState<DishFormValues>(initial)
  const [errors, setErrors] = useState<DishFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  function set<K extends keyof DishFormValues>(key: K, value: DishFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    if (key !== 'ingredients' && errors[key as keyof DishFormErrors]) {
      setErrors((e) => ({ ...e, [key]: undefined }))
    }
  }

  function setMode(mode: DishMode) {
    set('mode', mode)
    setErrors((e) => ({ ...e, mode: undefined }))
  }

  function addIngredient(p: Product) {
    setValues((v) => ({
      ...v,
      ingredients: [...v.ingredients, { productId: p.id, productName: p.name, grams: '', per100g: p.per100g }],
    }))
    setErrors((e) => ({ ...e, mode: undefined }))
    setPicking(false)
    // Focus the new grams input after render.
    requestAnimationFrame(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('.ingredient-grams')
      inputs[inputs.length - 1]?.focus()
    })
  }

  function updateIngredientGrams(index: number, grams: string) {
    setValues((v) => ({
      ...v,
      ingredients: v.ingredients.map((row, i) => (i === index ? { ...row, grams } : row)),
    }))
    if (errors.ingredientRows?.[index]) {
      setErrors((e) => {
        const rows = { ...e.ingredientRows }
        delete rows[index]
        return { ...e, ingredientRows: rows }
      })
    }
  }

  function removeIngredient(index: number) {
    setValues((v) => ({ ...v, ingredients: v.ingredients.filter((_, i) => i !== index) }))
    setErrors((e) => ({ ...e, ingredientRows: undefined }))
  }

  // Live summary for ingredients mode, using current product values.
  const liveSummary = useMemo(() => {
    if (values.mode !== 'ingredients') return null
    const byId = new Map((products.data ?? []).map((p) => [p.id, p]))
    const ingredients: DishIngredientWithProduct[] = values.ingredients.map((row) => {
      const product = byId.get(row.productId)
      return {
        productId: row.productId,
        productName: row.productName,
        grams: Math.max(0, parseDecimal(row.grams) ?? 0),
        // Prefer the current product values; fall back to the ones stored with the row.
        per100g: product?.per100g ?? row.per100g,
      }
    })
    const servings = parseDecimal(values.servings)
    const cooked = parseDecimal(values.cookedWeight)
    return summarizeDish({
      mode: 'ingredients',
      servings: servings && servings > 0 ? servings : 1,
      cookedWeightGrams: cooked && cooked > 0 ? cooked : null,
      ingredients,
    })
  }, [values.mode, values.ingredients, values.servings, values.cookedWeight, products.data])

  // Non-blocking hint for manual mode.
  const manualMismatch = useMemo(() => {
    if (values.mode !== 'manual') return null
    const kcal = parseDecimal(values.kcal)
    if (kcal === null) return null
    const m: Macros = {
      kcal,
      protein: parseDecimal(values.protein) ?? 0,
      fat: parseDecimal(values.fat) ?? 0,
      carbs: parseDecimal(values.carbs) ?? 0,
    }
    return isKcalConsistent(m) ? null : kcalFromMacros(m)
  }, [values.mode, values.kcal, values.protein, values.fat, values.carbs])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const result = validateDishForm(values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    try {
      const savedId = await save.mutateAsync({ id, input: result.input })
      navigate(returnTo ?? `/dish/${savedId}`, { replace: true })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Nie udało się zapisać.')
    }
  }

  return (
    <>
      <ScreenHeader title={id === null ? 'Nowe danie' : 'Edytuj danie'} backTo={backTo} />

      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field label="Nazwa" error={errors.name}>
          <input
            type="text"
            value={values.name}
            autoFocus={id === null}
            aria-invalid={Boolean(errors.name)}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>

        <div className="segmented" role="tablist" aria-label="Sposób liczenia">
          <button
            type="button"
            role="tab"
            aria-selected={values.mode === 'manual'}
            className={values.mode === 'manual' ? 'segmented-item active' : 'segmented-item'}
            onClick={() => setMode('manual')}
          >
            Gotowe makro
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={values.mode === 'ingredients'}
            className={values.mode === 'ingredients' ? 'segmented-item active' : 'segmented-item'}
            onClick={() => setMode('ingredients')}
          >
            Ze składników
          </button>
        </div>

        {values.mode === 'manual' ? (
          <fieldset className="fieldset">
            <legend>Wartości na porcję</legend>
            <div className="grid-2">
              <NumberInput label="Kalorie (kcal)" value={values.kcal} error={errors.kcal} onChange={(v) => set('kcal', v)} />
              <NumberInput label="Białko (g)" value={values.protein} error={errors.protein} onChange={(v) => set('protein', v)} />
              <NumberInput label="Tłuszcz (g)" value={values.fat} error={errors.fat} onChange={(v) => set('fat', v)} />
              <NumberInput label="Węglowodany (g)" value={values.carbs} error={errors.carbs} onChange={(v) => set('carbs', v)} />
            </div>
            {manualMismatch !== null && (
              <p className="form-warning" role="status">
                Kalorie nie zgadzają się z makro — z makro wychodzi ok. {formatKcal(manualMismatch)} kcal. Sprawdź
                wartości (możesz zapisać mimo to).
              </p>
            )}
          </fieldset>
        ) : (
          <fieldset className="fieldset">
            <legend>Składniki</legend>
            {values.ingredients.length > 0 && (
              <ul className="ingredient-list">
                {values.ingredients.map((row, index) => (
                  <li key={`${row.productId}-${index}`} className="ingredient-row">
                    <span className="ingredient-name">{row.productName}</span>
                    <label className="ingredient-grams-field">
                      <input
                        className="ingredient-grams"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0"
                        value={row.grams}
                        aria-label={`Gramy: ${row.productName}`}
                        aria-invalid={Boolean(errors.ingredientRows?.[index])}
                        onChange={(e) => updateIngredientGrams(index, e.target.value)}
                      />
                      <span className="muted">g</span>
                    </label>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => removeIngredient(index)}
                      aria-label={`Usuń składnik: ${row.productName}`}
                    >
                      ×
                    </button>
                    {errors.ingredientRows?.[index] && (
                      <span className="field-error ingredient-error">{errors.ingredientRows[index]}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="button button-secondary" onClick={() => setPicking(true)}>
              + Dodaj składnik
            </button>
            {errors.mode && <span className="field-error">{errors.mode}</span>}

            <div className="grid-2">
              <NumberInput label="Liczba porcji" value={values.servings} error={errors.servings} onChange={(v) => set('servings', v)} />
              <NumberInput
                label="Waga po ugotowaniu (g)"
                placeholder="opcjonalnie"
                value={values.cookedWeight}
                error={errors.cookedWeight}
                onChange={(v) => set('cookedWeight', v)}
              />
            </div>

            {liveSummary && (
              <div className="live-summary">
                <p className="field-label">Na porcję</p>
                <MacroGrid macros={liveSummary.perServing} />
                <p className="muted small">
                  Całość: {formatKcal(liveSummary.total.kcal)} kcal
                  {liveSummary.weightGrams !== null && ` · ${formatAmount(liveSummary.weightGrams)} g`}
                  {liveSummary.per100g && ` · ${formatKcal(liveSummary.per100g.kcal)} kcal/100 g`}
                </p>
              </div>
            )}
          </fieldset>
        )}

        <Field label="Opis (np. składniki)" error={errors.description}>
          <textarea rows={4} value={values.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Uwagi" error={errors.notes}>
          <textarea rows={2} value={values.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <Field label="Link do przepisu" error={errors.recipeUrl}>
          <input
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="https://www.youtube.com/…"
            value={values.recipeUrl}
            aria-invalid={Boolean(errors.recipeUrl)}
            onChange={(e) => set('recipeUrl', e.target.value)}
          />
        </Field>

        <label className="checkbox">
          <input type="checkbox" checked={values.isFavorite} onChange={(e) => set('isFavorite', e.target.checked)} />
          <span>Ulubione</span>
        </label>

        {submitError && (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        )}

        <button type="submit" className="button button-primary" disabled={save.isPending}>
          {save.isPending ? 'Zapisywanie…' : 'Zapisz'}
        </button>
      </form>

      {picking && <ProductPicker onPick={addIngredient} onClose={() => setPicking(false)} />}
    </>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

type NumberInputProps = {
  label: string
  value: string
  error?: string
  placeholder?: string
  onChange: (value: string) => void
}

function NumberInput({ label, value, error, placeholder, onChange }: NumberInputProps) {
  return (
    <Field label={label} error={error}>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder ?? '0'}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}
