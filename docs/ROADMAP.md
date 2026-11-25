# ROADMAP — plan prac

Claude: realizuj zadania po kolei. Po każdym zadaniu: `npm run typecheck`, `npm test`, odhacz `[x]`.
Na koniec każdego etapu podsumuj, co da się przetestować (w przeglądarce i na telefonie).
Kroki oznaczone 👤 wykonuje użytkownik (instrukcje w `docs/START.md`).

## Etap 0 — Szkielet projektu i deploy
- [x] Utwórz projekt Vite (szablon `react-ts`) w bieżącym folderze, nie nadpisuj plików .md; wyczyść przykładowe pliki
- [x] Ustaw `tsconfig` (`strict`), alias `@/` → `src/`, skrypty `typecheck` i `test` w package.json
- [x] Zainstaluj: `react-router`, `@supabase/supabase-js`, `@tanstack/react-query`, `vite-plugin-pwa`, `vitest`
- [x] `global.css`: zmienne kolorów, tryb ciemny, safe-area, czcionka pól ≥ 16 px
- [x] Dolne zakładki z 4 pustymi ekranami (Dziś, Produkty, Historia, Ustawienia) z polskimi nazwami
- [x] PWA: manifest, ikony (tymczasowe), meta tagi Apple, service worker
- [x] `.gitignore` (w tym `.env.local`), `.env.example`, `git init`, pierwszy commit
- [x] `wrangler.jsonc` — hosting statycznych plików na Cloudflare Workers z fallbackiem SPA
- [x] 👤 Prywatne repo na GitHubie + push; Cloudflare (Workers) podłączone do repo
- [x] ✅ Test na iPhonie: otwieram adres `*.workers.dev` w Safari, dodaję do ekranu głównego, aplikacja startuje na pełnym ekranie, zakładki działają

## Etap 1 — Supabase, logowanie, logika
- [x] 👤 Projekt w Supabase, konto użytkownika, wyłączona rejestracja, klucze w `.env.local` i w zmiennych builda Cloudflare
- [x] `npx supabase init`; migracja `init` = schemat + RLS + `save_dish` z ARCHITECTURE.md
- [x] 👤 `npx supabase login`, `npx supabase link`, `npx supabase db push`
- [x] Skrypt `db:types` + wygenerowanie `src/db/database.types.ts`
- [x] `src/db/supabase.ts`, `AuthProvider`, ekran logowania, ochrona tras, wylogowanie
- [x] `src/lib/nutrition.ts` + pełne testy jednostkowe
- [x] `src/lib/dates.ts`, `src/lib/format.ts` (+ testy, w tym parsowanie „12,5" i `normalizeForSearch` — „Żółty ser." → „zolty ser")
- [x] Repozytoria: products, dishes, entries, settings (mapowanie snake_case ↔ camelCase)
- [x] Seed: ~15 popularnych produktów (jajko, ryż, pierś z kurczaka, mleko, płatki owsiane, banan, chleb...) — gdy użytkownik nie ma żadnego produktu
- [x] Baner „Brak połączenia" (`navigator.onLine` + zdarzenia online/offline)
- [x] ✅ Test na iPhonie: loguję się, zamykam i otwieram aplikację — nadal zalogowany

## Etap 2 — Produkty
- [x] Lista produktów z wyszukiwarką
- [x] Formularz nowy/edycja produktu z walidacją i ostrzeżeniem o niespójnych kcal
- [x] Usuwanie (soft delete) z potwierdzeniem, ulubione
- [ ] ✅ Test: dodaję produkt na komputerze — widzę go na iPhonie

## Etap 3 — Dziennik („Dziś")
- [x] Ekran Dziś: nawigacja po dniach, sekcje posiłków, suma kcal
- [x] Ekran dodawania wpisu: wyszukiwarka (fokus od razu), ostatnio używane, ulubione
- [x] Wybór ilości (g / porcja) z podglądem kcal na żywo, zapis ze snapshotem
- [x] Szybki wpis (same kcal)
- [x] Edycja i usuwanie wpisu (przycisk na ekranie wpisu), przeniesienie do innego posiłku
- [x] Pasek postępu kcal vs cel + paski makro
- [ ] ✅ Test na iPhonie: zapisuję realny dzień jedzenia (także dyktując nazwy produktów)

## Etap 4 — Dania
- [x] Lista dań (przełącznik Produkty / Dania na zakładce Produkty)
- [x] Edytor dania — tryb „Gotowe makro": kcal/B/T/W na porcję, opis, uwagi, link do przepisu (`normalizeRecipeUrl`)
- [x] Edytor dania — tryb „Ze składników": składniki (dodaj/usuń/zmień gramy), porcje, waga po ugotowaniu; zapis przez `save_dish`
- [x] Wyliczenia na całość / porcję / 100 g na żywo
- [x] Szczegóły dania: opis, uwagi, przycisk „▶ Przepis" (otwiera link w nowej karcie)
- [x] Duplikowanie dania
- [x] Dania widoczne na ekranie dodawania wpisu
- [x] Sprawdź: edycja dania NIE zmienia wcześniejszych wpisów
- [ ] ✅ Test na iPhonie: tworzę danie i loguję 1,5 porcji

## Etap 5 — Historia i ustawienia
- [ ] Ustawienia: cele kcal i makro, widoczność posiłków
- [ ] Historia: wykres tygodnia (słupki + linia celu, SVG), średnia, przełączanie tygodni
- [ ] `src/lib/backup.ts` (budowa + walidacja, testy), migracja z funkcją `import_backup`
- [ ] Eksport do JSON (Web Share / pobranie) i import z JSON
- [ ] ✅ Test: eksportuję kopię do Plików i przywracam ją

## Etap 6 — Szlif
- [ ] Puste stany („Brak wpisów — dodaj pierwszy posiłek"), stany ładowania i błędów
- [ ] Dopracowanie trybu ciemnego, docelowa ikona aplikacji
- [ ] Przegląd wydajności i dostępności (rozmiary dotyku ≥ 44 px, etykiety `aria-label`)

## Etap 7 — Spalone kalorie z Garmina
- [ ] Migracja `activity`: tabela `activity`, `import_tokens`, funkcje `create_import_token`, `import_activity`; `db:types`
- [ ] Repozytorium `activity.ts`; eksport/import obejmuje `activity`
- [ ] `dailyKcalGoal` w `nutrition.ts` + testy
- [ ] Ustawienia: „Wygeneruj token dla skrótu" (pokaż raz + Kopiuj), nazwa skrótu, doliczanie do celu + procent
- [ ] Ekran Dziś: „Spalone: X kcal", „Odśwież z Garmina" (uruchamia skrót, odświeża po powrocie), ręczna edycja
- [ ] Cel dnia na ekranie Dziś i w Historii uwzględnia aktywność, gdy ustawienie włączone
- [ ] 👤 Garmin Connect → Apple Zdrowie; budowa skrótu wg START.md; opcjonalnie automatyzacja o 21:00
- [ ] ✅ Test na iPhonie: po treningu uruchamiam skrót, wartość w aplikacji zgadza się z Garmin Connect

## Później (poza MVP)
- [ ] Skaner kodów kreskowych (kamera w przeglądarce) + Open Food Facts API
- [ ] Waga ciała i wykres (import z Apple Zdrowie tym samym mechanizmem)
- [ ] Wpis głosowy z AI przez Supabase Edge Function (klucz API w sekretach Supabase) + ewentualnie Siri
- [ ] Zapis offline z kolejką
