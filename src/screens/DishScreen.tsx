import { Link, useNavigate, useParams } from 'react-router'
import { FavoriteButton } from '@/components/FavoriteButton'
import { MacroGrid } from '@/components/MacroGrid'
import { QueryState } from '@/components/QueryState'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useDeleteDish, useDish, useSaveDish, useToggleDishFavorite } from '@/hooks/useDishes'
import { duplicateDishInput } from '@/lib/dishForm'
import { summarizeDish } from '@/lib/dishes'
import { formatAmount, formatKcal } from '@/lib/format'
import { forGrams } from '@/lib/nutrition'

/** Dish details: nutrition, description, notes, recipe link, actions. */
export function DishScreen() {
  const { id: idParam } = useParams()
  const id = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null
  const navigate = useNavigate()
  const dish = useDish(id)
  const toggleFavorite = useToggleDishFavorite()
  const save = useSaveDish()
  const remove = useDeleteDish()

  if (dish.isLoading || dish.error) {
    return (
      <>
        <ScreenHeader title="Danie" backTo="/foods?tab=dishes" />
        <QueryState isLoading={dish.isLoading} error={dish.error} onRetry={() => dish.refetch()} />
      </>
    )
  }
  const d = dish.data
  if (!d) {
    return (
      <>
        <ScreenHeader title="Danie" backTo="/foods?tab=dishes" />
        <div className="empty">
          <p>Nie znaleziono dania.</p>
        </div>
      </>
    )
  }

  const summary = summarizeDish(d)

  async function handleDuplicate() {
    if (!d) return
    try {
      const newId = await save.mutateAsync({ id: null, input: duplicateDishInput(d) })
      navigate(`/dish/${newId}/edit`, { replace: true })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Nie udało się zduplikować.')
    }
  }

  async function handleDelete() {
    if (!d) return
    if (!window.confirm(`Usunąć danie „${d.name}"? Wcześniejsze wpisy w dzienniku zostaną zachowane.`)) return
    try {
      await remove.mutateAsync(d.id)
      navigate('/foods?tab=dishes', { replace: true })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Nie udało się usunąć.')
    }
  }

  return (
    <>
      <ScreenHeader
        title="Danie"
        backTo="/foods?tab=dishes"
        action={
          <FavoriteButton
            active={d.isFavorite}
            label={d.name}
            onToggle={() => toggleFavorite.mutate({ id: d.id, isFavorite: !d.isFavorite })}
          />
        }
      />

      <h2 className="detail-title">{d.name}</h2>

      {d.recipeUrl && (
        <a className="button button-primary recipe-button" href={d.recipeUrl} target="_blank" rel="noopener noreferrer">
          ▶ Przepis
        </a>
      )}

      <section className="card section">
        <h3 className="section-title">Na porcję</h3>
        <MacroGrid macros={summary.perServing} />
        {d.mode === 'ingredients' && (
          <p className="muted small detail-meta">
            Cały przepis: {formatKcal(summary.total.kcal)} kcal · {formatAmount(summary.servings)}{' '}
            {summary.servings === 1 ? 'porcja' : 'porcji'}
            {summary.weightGrams !== null && ` · ${formatAmount(summary.weightGrams)} g`}
            {summary.per100g && ` · ${formatKcal(summary.per100g.kcal)} kcal/100 g`}
          </p>
        )}
        {d.mode === 'manual' && <p className="muted small detail-meta">Wartości wpisane ręcznie.</p>}
      </section>

      {d.mode === 'ingredients' && d.ingredients.length > 0 && (
        <section className="card section">
          <h3 className="section-title">Składniki</h3>
          <ul className="plain-list">
            {d.ingredients.map((i, idx) => (
              <li key={`${i.productId}-${idx}`} className="plain-row">
                <span>{i.productName}</span>
                <span className="muted">
                  {formatAmount(i.grams)} g · {formatKcal(forGrams(i.per100g, i.grams).kcal)} kcal
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.description && (
        <section className="card section">
          <h3 className="section-title">Opis</h3>
          <p className="prewrap">{d.description}</p>
        </section>
      )}

      {d.notes && (
        <section className="card section">
          <h3 className="section-title">Uwagi</h3>
          <p className="prewrap">{d.notes}</p>
        </section>
      )}

      <div className="actions">
        <Link to={`/dish/${d.id}/edit`} className="button button-secondary">
          Edytuj
        </Link>
        <button type="button" className="button button-secondary" onClick={handleDuplicate} disabled={save.isPending}>
          {save.isPending ? 'Duplikowanie…' : 'Duplikuj'}
        </button>
        <button type="button" className="button button-danger" onClick={handleDelete} disabled={remove.isPending}>
          Usuń
        </button>
      </div>
    </>
  )
}
