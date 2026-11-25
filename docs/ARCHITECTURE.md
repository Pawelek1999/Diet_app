# Architektura — Kalorie

## Przegląd

```
Ekrany (src/screens/, React Router)
   │  używają
   ▼
Hooki (src/hooks/, TanStack Query)  ──►  Logika (src/lib/: nutrition, dates, format, backup — czyste funkcje)
   │
   ▼
Repozytoria (src/db/repositories/)  ──►  Supabase (PostgreSQL + Auth + RLS)
                                              ▲
Skrót iOS „Kalorie Garmin" ──HTTP (RPC import_activity + token)──┘
```

- Brak własnego serwera. Źródło prawdy: baza PostgreSQL w Supabase.
- Ekrany nie znają Supabase — korzystają z hooków, a te z repozytoriów.
- Hooki odczytu: `useQuery`; zapisy: `useMutation` + `invalidateQueries` (UI odświeża się po zapisie).
- Aplikacja to statyczne pliki (HTML/JS/CSS) na Cloudflare (Workers static assets); service worker cache'uje je (szybki start).
- Bezpieczeństwo: w aplikacji tylko publiczny klucz `anon`; dostęp do danych ograniczają reguły RLS
  (`user_id = auth.uid()`). Rejestracja nowych kont wyłączona w panelu Supabase.

## Struktura folderów

```
Diet_app/
├── CLAUDE.md
├── docs/                         # PRD, ARCHITECTURE, ROADMAP, START
├── supabase/
│   ├── config.toml               # z `npx supabase init`
│   └── migrations/
│       ├── 20261125000001_init.sql       # schemat + RLS + funkcje (Etap 1)
│       └── 2026xxxxxxxxxx_activity.sql   # aktywność + import z Garmina (Etap 7)
├── index.html
├── vite.config.ts                # React, vite-plugin-pwa, alias @/, konfiguracja Vitest
├── .env.example                  # VITE_SUPABASE_URL=, VITE_SUPABASE_ANON_KEY=
├── public/
│   └── icon-192.png, icon-512.png, apple-touch-icon.png, favicon.svg
├── src/
│   ├── main.tsx                  # render, BrowserRouter, QueryClientProvider, AuthProvider
│   ├── App.tsx                   # definicja tras, ochrona tras (wymaga logowania)
│   ├── auth/
│   │   └── AuthProvider.tsx      # sesja Supabase, useAuth(), signIn/signOut
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── TodayScreen.tsx       # „Dziś" (?date=YYYY-MM-DD)
│   │   ├── FoodsScreen.tsx       # Produkty i dania (przełącznik segmentowy)
│   │   ├── HistoryScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── AddEntryScreen.tsx    # wyszukiwanie i wybór (?date=&meal=)
│   │   ├── EditEntryScreen.tsx   # /entry/:id
│   │   ├── ProductFormScreen.tsx # /product/new, /product/:id
│   │   └── DishFormScreen.tsx    # /dish/new, /dish/:id
│   ├── db/
│   │   ├── supabase.ts           # createClient z env, typowany Database
│   │   ├── database.types.ts     # GENEROWANY: npm run db:types — nie edytować ręcznie
│   │   ├── seed.ts               # produkty startowe (gdy użytkownik nie ma żadnych)
│   │   └── repositories/
│   │       ├── products.ts, dishes.ts, entries.ts, settings.ts, activity.ts
│   ├── lib/
│   │   ├── nutrition.ts          # obliczenia kcal/makro, cel dnia z aktywnością (testowane)
│   │   ├── dates.ts              # YYYY-MM-DD, przesuwanie dni, tydzień (testowane)
│   │   ├── format.ts             # liczby po polsku, parsowanie „12,5", normalizeForSearch (testowane)
│   │   └── backup.ts             # budowa i walidacja pliku kopii JSON (testowane)
│   ├── hooks/                    # useDayEntries, useProducts, useDish, useActivity, useOnline...
│   ├── components/               # TabBar, MacroBar, CalorieBar, EntryRow, NumberInput, WeekChart...
│   ├── styles/global.css         # zmienne CSS (kolory, odstępy), tryb ciemny, safe-area
│   ├── types.ts                  # typy domenowe (camelCase)
│   └── constants.ts              # posiłki, kolory makro, domyślne cele
├── package.json
└── tsconfig*.json
```

Testy leżą obok kodu: `src/lib/nutrition.test.ts` itd.

## Routing

`BrowserRouter`. Hosting: Cloudflare Workers ze statycznymi plikami (`wrangler.jsonc`,
`assets.not_found_handling: "single-page-application"`) — nieznane ścieżki zwracają `index.html`,
więc odświeżenie dowolnego ekranu działa.

| Trasa | Ekran |
|---|---|
| `/login` | Logowanie (jedyna trasa bez sesji) |
| `/` | Dziś (opcjonalnie `?date=`) |
| `/foods` | Produkty / Dania |
| `/history` | Historia |
| `/settings` | Ustawienia |
| `/entry/add?date=&meal=` | Dodawanie wpisu |
| `/entry/:id` | Edycja wpisu |
| `/product/new`, `/product/:id` | Formularz produktu |
| `/dish/new`, `/dish/:id` | Edytor dania |

## Logowanie

- E-mail + hasło (`supabase.auth.signInWithPassword`). **Nie** magic link — link z maila otworzyłby się
  w Safari, a aplikacja z ekranu głównego ma osobną sesję.
- Sesja zapisana w `localStorage` (domyślne zachowanie supabase-js), automatyczne odświeżanie tokenu.
- Konto tworzone raz w panelu Supabase (Authentication → Users → Add user), rejestracja wyłączona.

## Model danych (PostgreSQL, migracja `..._init.sql`)

```sql
create table public.products (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  name          text not null,
  kcal_100g     numeric not null check (kcal_100g >= 0),
  protein_100g  numeric not null default 0 check (protein_100g >= 0),
  fat_100g      numeric not null default 0 check (fat_100g >= 0),
  carbs_100g    numeric not null default 0 check (carbs_100g >= 0),
  serving_name  text,                     -- np. "1 jajko"
  serving_grams numeric check (serving_grams > 0),
  is_favorite   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz               -- soft delete
);

create table public.dishes (
  id                  bigint generated always as identity primary key,
  user_id             uuid not null default auth.uid() references auth.users on delete cascade,
  name                text not null,
  servings            numeric not null default 1 check (servings > 0),
  cooked_weight_grams numeric check (cooked_weight_grams > 0),
  is_favorite         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create table public.dish_ingredients (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  dish_id    bigint not null references public.dishes on delete cascade,
  product_id bigint not null references public.products,
  grams      numeric not null check (grams > 0),
  position   int not null default 0
);

create table public.entries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  date        date not null,
  meal        text not null check (meal in ('breakfast','second_breakfast','lunch','snack_pm','dinner','snack')),
  source_type text not null check (source_type in ('product','dish','quick')),
  product_id  bigint references public.products,
  dish_id     bigint references public.dishes,
  name        text not null,              -- nazwa w chwili dodania
  amount      numeric not null check (amount > 0),
  unit        text not null check (unit in ('g','serving')),
  kcal        numeric not null check (kcal >= 0),   -- SNAPSHOT dla tej ilości
  protein     numeric not null default 0,
  fat         numeric not null default 0,
  carbs       numeric not null default 0,
  created_at  timestamptz not null default now()
);
create index entries_user_date_idx on public.entries (user_id, date);

create table public.settings (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key     text not null,
  value   jsonb not null,
  primary key (user_id, key)
);
-- klucze: 'goals'    -> {"kcal":2200,"protein":140,"fat":70,"carbs":250}
--         'meals'    -> [{"id":"breakfast","label":"Śniadanie","visible":true}, ...]
--         'activity' -> {"addToGoal":false,"percent":100,"shortcutName":"Kalorie Garmin"}
```

### RLS (dla każdej tabeli)

```sql
alter table public.products enable row level security;
create policy "own rows" on public.products
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

### Uprawnienia (GRANT)
Projekt Supabase ma wyłączone „Grant API access to new tables automatically" i włączone
„Enable RLS on new tables automatically". Dlatego **każda migracja jawnie nadaje uprawnienia**:

```sql
grant select, insert, update, delete on public.products to authenticated;
grant execute on function public.save_dish(...) to authenticated;
-- rola anon dostaje WYŁĄCZNIE execute na import_activity (Etap 7); żadnych tabel
```

Bez tego aplikacja dostanie błąd „permission denied" mimo poprawnych polityk RLS.

### Zapis dania z składnikami — funkcja `save_dish`
Danie i jego składniki muszą zapisać się razem (jedna transakcja), więc zapis idzie przez funkcję
PostgreSQL wywoływaną jako RPC (`security invoker` — działa z RLS użytkownika):

```sql
save_dish(p_id bigint /* null = nowe */, p_name text, p_servings numeric,
          p_cooked_weight_grams numeric, p_is_favorite boolean,
          p_ingredients jsonb /* [{"product_id":1,"grams":60}, ...] */) returns bigint
-- aktualizuje/wstawia danie, usuwa stare składniki, wstawia nowe z position wg kolejności
```

### Migracje
- Pliki `supabase/migrations/<timestamp>_<nazwa>.sql`, wysyłane `npx supabase db push`.
- Nigdy nie edytujemy wysłanej migracji — zmiana = nowy plik.
- Po każdej migracji: `npm run db:types` (generuje `src/db/database.types.ts`).

### Dlaczego snapshot w `entries`
Edycja produktu/dania nie może zmieniać przeszłych dni. Dlatego przy dodaniu wpisu
obliczamy kcal i makro **dla konkretnej ilości** i zapisujemy je w wierszu.
Przy edycji ilości wpisu: jeśli źródło (produkt/danie) wciąż istnieje — przelicz z aktualnych
wartości; jeśli zostało usunięte — przeskaluj proporcjonalnie zapisany snapshot.

### Usuwanie
Produkty i dania usuwamy miękko (`deleted_at`), bo mogą do nich odwoływać się wpisy i dania.
Usunięte nie pojawiają się w wyszukiwarce ani na listach.

## Logika obliczeń (`src/lib/nutrition.ts`)

```ts
type Macros = { kcal: number; protein: number; fat: number; carbs: number };

forGrams(per100g: Macros, grams: number): Macros            // per100g * grams / 100
dishTotal(ingredients: { per100g: Macros; grams: number }[]): Macros
dishPerServing(total: Macros, servings: number): Macros
dishPer100g(total: Macros, totalWeightGrams: number): Macros // cookedWeight ?? suma gramów
forDishAmount(total, servings, cookedWeight, amount, unit: 'g' | 'serving'): Macros
sumMacros(list: Macros[]): Macros
kcalFromMacros(m): number                                    // 4*B + 4*W + 9*T
isKcalConsistent(m, tolerance = 0.15): boolean
dailyKcalGoal(baseGoal: number, activeKcal: number | undefined,
              opts: { addToGoal: boolean; percent: number }): number
// addToGoal=false lub brak aktywności → baseGoal; inaczej baseGoal + activeKcal * percent / 100
```

Wszystkie funkcje czyste, bez zaokrągleń (zaokrąglamy tylko w `format.ts` przy wyświetlaniu).
Każda ma testy, w tym przypadki brzegowe (0 g, brak cookedWeight, servings = 0.5, percent = 0).
Supabase zwraca `numeric` jako liczby JS — repozytoria i tak normalizują przez `Number(...)`.

## Integracja z Garminem (Etap 7, migracja `..._activity.sql`)

### Przepływ danych

```
Zegarek Garmin → Garmin Connect (iPhone) → Apple Zdrowie („Aktywna energia")
   → Skrót iOS „Kalorie Garmin" → POST https://<projekt>.supabase.co/rest/v1/rpc/import_activity
   → tabela activity (Supabase) → aplikacja pokazuje „Spalone: X kcal"
```

Skrót nie otwiera aplikacji — wysyła dane prosto do bazy, więc może działać jako automatyzacja.

### Tabele i funkcje

```sql
create table public.activity (
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  date        date not null,
  active_kcal numeric not null check (active_kcal >= 0),
  source      text not null check (source in ('shortcut','manual')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);   -- + RLS "own rows" jak wyżej

create table public.import_tokens (     -- RLS włączone, BEZ polityk → niedostępna z aplikacji
  user_id    uuid primary key references auth.users on delete cascade,
  token_hash text not null unique,      -- sha256(token), sam token nigdy nie jest zapisywany
  created_at timestamptz not null default now()
);

create_import_token() returns text      -- security definer; wymaga zalogowania;
                                        -- generuje losowy token, zapisuje hash, zwraca token (raz)
import_activity(p_token text, p_date date, p_kcal text) returns void
                                        -- security definer; szuka użytkownika po hashu tokenu,
                                        -- parsuje p_kcal (przecinek/kropka/spacje), upsert do activity
-- execute: import_activity dla anon (skrót nie ma sesji), create_import_token tylko dla authenticated
```

`p_kcal` jest tekstem, bo Skróty mogą sformatować liczbę po polsku („523,4").

### Zapytanie wysyłane przez skrót

```
POST https://<projekt>.supabase.co/rest/v1/rpc/import_activity
Nagłówki:  apikey: <klucz anon>
           Content-Type: application/json
Treść:     {"p_token":"<token>","p_date":"2026-11-25","p_kcal":"523,4"}
```

### W aplikacji
- Ekran Dziś: „Spalone: X kcal" (z tabeli `activity`), przycisk „Odśwież z Garmina" →
  `window.location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent(shortcutName)`;
  po powrocie (`visibilitychange`) — odświeżenie danych.
- Ręczna edycja wartości (source = 'manual').
- Ustawienia: generowanie tokenu (pokazany raz, przycisk „Kopiuj"), nazwa skrótu, doliczanie do celu + procent.

## Eksport / import (`src/lib/backup.ts`)

- Eksport: wszystkie tabele użytkownika → jeden plik JSON
  `{ version, exportedAt, products, dishes, dishIngredients, entries, settings, activity }`,
  nazwa `kalorie-backup-YYYY-MM-DD.json`. `navigator.share({ files })` jeśli dostępne, inaczej pobranie pliku.
- Import: `<input type="file" accept="application/json">`, walidacja struktury (czysta funkcja, testowana),
  potwierdzenie, zastąpienie danych przez funkcję RPC `import_backup(jsonb)` (jedna transakcja, nowe ID
  z mapowaniem odwołań).

## PWA (`vite.config.ts`)

- `vite-plugin-pwa`, `registerType: 'autoUpdate'`, precache plików buildu. Zapytania do Supabase **nie** są cache'owane.
- Manifest: `name: 'Kalorie'`, `display: 'standalone'`, `lang: 'pl'`, `start_url: '/'`, ikony 192/512, kolory.
- W `index.html`: `apple-touch-icon`, `apple-mobile-web-app-capable`, `viewport-fit=cover`.
- Nowy deploy → service worker pobiera nową wersję, aktywna od następnego uruchomienia.

## UI / UX

- Dolne zakładki: **Dziś · Produkty · Historia · Ustawienia** (komponent `TabBar`, przyklejony na dole, `safe-area-inset-bottom`)
- Dodawanie wpisu jako pełnoekranowy ekran z przyciskiem „Zamknij"
- Pola liczbowe: `inputmode="decimal"`, akceptuj przecinek i kropkę (parsowanie w `format.ts`)
- Kolory makro stałe w całej aplikacji (B / T / W) — zmienne CSS
- Tryb ciemny przez `@media (prefers-color-scheme: dark)`
- Wykres tygodnia: własny komponent SVG (bez biblioteki)
- Rozmiar czcionki pól formularza ≥ 16 px (inaczej Safari powiększa stronę przy fokusie)
- Wyszukiwanie: `normalizeForSearch(text)` w `src/lib/format.ts` — małe litery, usunięcie polskich znaków,
  przycięcie spacji i interpunkcji dodawanej przez dyktowanie iOS; porównanie „zawiera"
  (filtrowanie po stronie klienta — lista produktów jednej osoby jest mała)
- Stany: ładowanie (szkielet / spinner), błąd z przyciskiem „Spróbuj ponownie", brak internetu (baner)
