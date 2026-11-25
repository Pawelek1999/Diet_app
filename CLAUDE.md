# CLAUDE.md — instrukcje dla Claude

Ten plik czytasz na początku każdej sesji. Opisuje projekt, zasady pracy i komendy.

## O projekcie

**Kalorie** — prosta, prywatna aplikacja do liczenia kalorii, działająca jako **PWA**
(strona internetowa zainstalowana na ekranie głównym iPhone'a). Dane trzymane w chmurze
(**Supabase**, dostęp po zalogowaniu). Jeden użytkownik — właściciel projektu.
Użytkownik tworzy własną bazę produktów i dań, zapisuje, co zjadł w danym dniu,
i widzi bilans kalorii oraz makroskładników względem celu.
Spalone kalorie z zegarka Garmin trafiają do aplikacji przez Apple Zdrowie i Skróty iOS.

Szczegóły:
- Wymagania produktu: `docs/PRD.md`
- Architektura, model danych, struktura folderów: `docs/ARCHITECTURE.md`
- Plan prac krok po kroku: `docs/ROADMAP.md`

**Zanim zaczniesz jakiekolwiek zadanie, przeczytaj te trzy pliki.**

## Stack (nie zmieniaj bez pytania)

- **Vite + React + TypeScript**
- **React Router** (tryb biblioteki, `BrowserRouter`)
- **Supabase** (`@supabase/supabase-js`) — baza PostgreSQL, logowanie (e-mail + hasło), RLS
- **TanStack Query** (`@tanstack/react-query`) — pobieranie i cache danych z Supabase, odświeżanie po zapisie
- **vite-plugin-pwa** — manifest, service worker (cache plików aplikacji)
- **Vitest** — testy jednostkowe
- **Zwykły CSS** (zmienne CSS, `prefers-color-scheme` dla trybu ciemnego) — bez bibliotek UI
- Hosting: **Cloudflare Workers ze statycznymi plikami** (konfiguracja `wrangler.jsonc`, projekt `diet-app`;
  prywatne repo GitHub, deploy automatyczny po pushu do `main`)

## Komendy

```bash
npm install                 # instalacja zależności
npm run dev                 # serwer deweloperski (http://localhost:5173)
npm run dev -- --host       # to samo, dostępne z telefonu w tej samej sieci Wi-Fi
npm run typecheck           # sprawdzenie typów
npm test                    # testy jednostkowe (vitest run)
npm run build               # build produkcyjny do dist/
npm run preview             # podgląd buildu (z service workerem)
npm run db:push             # wysłanie nowych migracji do bazy (supabase db push --remote)
npm run db:types            # wygenerowanie typów TS ze schematu bazy
```

Zmienne środowiskowe w `.env.local` (nie commitować): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Wzór w `.env.example`.

## Zasady pracy

1. **Pracuj etapami z `docs/ROADMAP.md`.** Rób jedno zadanie naraz, po skończeniu odhacz je `[x]` w ROADMAP.
2. **Po każdej zmianie** uruchom `npm run typecheck` i `npm test`. Nie zostawiaj błędów typów.
3. **Nie dodawaj bibliotek** spoza stacku bez krótkiego uzasadnienia i zgody użytkownika.
4. **Tylko API dostępne w Safari na iOS** (sprawdzaj wsparcie, np. Vibration API na iOS nie działa).
5. **Logika obliczeń kalorii** jest w czystych funkcjach w `src/lib/nutrition.ts` i ma testy jednostkowe.
   Tak samo formatowanie/parsowanie liczb, daty i walidacja kopii zapasowej.
6. **Dostęp do bazy** tylko przez warstwę `src/db/` (repozytoria). Ekrany nie wołają Supabase bezpośrednio.
7. **Zmiany schematu bazy** wyłącznie przez nowe pliki w `supabase/migrations/`
   (numerowane, nigdy nie edytuj istniejących). Każda tabela ma `user_id` i włączone RLS.
8. **Bezpieczeństwo:** w kodzie aplikacji tylko klucz `anon` (publiczny). Nigdy klucza `service_role`
   ani kluczy API innych usług — te tylko w Edge Functions / sekretach Supabase.
9. **UI po polsku.** Kod, nazwy zmiennych i komentarze po angielsku.
10. **Proste > sprytne.** To aplikacja dla jednej osoby — bez własnego serwera; Supabase wystarczy.
11. Jeśli coś w wymaganiach jest niejasne — **zapytaj**, zamiast zgadywać.

## Styl kodu

- TypeScript `strict: true`, bez `any`
- Komponenty funkcyjne + hooki
- Jednostki: masa zawsze w **gramach**, energia w **kcal**, wartości odżywcze bazowo **na 100 g**
- Liczby wyświetlane zaokrąglone (kcal do całości, makro do 1 miejsca po przecinku), w bazie bez zaokrągleń
- Daty dni zapisywane jako `YYYY-MM-DD` (czas lokalny użytkownika, strefa Europe/Warsaw), w bazie typ `date`
- Kolumny w bazie `snake_case`, w TypeScripcie `camelCase` — mapowanie w repozytoriach
- Mobile-first: projektuj pod ekran iPhone'a (ok. 390 px szerokości), uwzględniaj `safe-area-inset`
