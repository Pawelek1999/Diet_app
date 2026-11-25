import { countProducts, createProducts } from '@/db/repositories/products'
import type { ProductInput } from '@/types'

// Starter products (approximate values per 100 g). Inserted only when the user has no products at all.
type SeedRow = [name: string, kcal: number, protein: number, fat: number, carbs: number, serving?: [string, number]]

const SEED: SeedRow[] = [
  ['Jajko kurze', 143, 12.6, 9.5, 0.7, ['1 jajko', 60]],
  ['Ryż biały (suchy)', 350, 7, 0.6, 78],
  ['Pierś z kurczaka (surowa)', 98, 21.5, 1.3, 0],
  ['Mleko 2%', 50, 3.4, 2, 4.8, ['1 szklanka', 250]],
  ['Płatki owsiane', 379, 13.2, 6.5, 67.7],
  ['Banan', 89, 1.1, 0.3, 22.8, ['1 banan', 120]],
  ['Jabłko', 52, 0.3, 0.2, 13.8, ['1 jabłko', 180]],
  ['Chleb żytni', 243, 6.3, 1.7, 51.5, ['1 kromka', 35]],
  ['Masło', 735, 0.7, 82.5, 0.7, ['1 łyżeczka', 5]],
  ['Ser żółty gouda', 356, 25, 27.4, 2.2, ['1 plaster', 15]],
  ['Twaróg półtłusty', 133, 18.7, 4.7, 3.7],
  ['Jogurt naturalny', 61, 4.3, 2.8, 6.2],
  ['Ziemniaki', 77, 1.9, 0.1, 17.5],
  ['Makaron pszenny (suchy)', 364, 12, 1.5, 75],
  ['Oliwa z oliwek', 884, 0, 100, 0, ['1 łyżka', 10]],
  ['Pomidor', 18, 0.9, 0.2, 3.9, ['1 pomidor', 120]],
]

export const SEED_PRODUCTS: ProductInput[] = SEED.map(([name, kcal, protein, fat, carbs, serving]) => ({
  name,
  per100g: { kcal, protein, fat, carbs },
  servingName: serving?.[0] ?? null,
  servingGrams: serving?.[1] ?? null,
  isFavorite: false,
}))

/** Seeds starter products once (counts soft-deleted too, so deleted seeds don't come back). */
export async function seedIfEmpty(): Promise<boolean> {
  if ((await countProducts()) > 0) return false
  await createProducts(SEED_PRODUCTS)
  return true
}
