# START — jak zacząć (dla Ciebie, nie dla Claude)

## Czego potrzebujesz
1. **Node.js LTS** i **Git** na komputerze (masz już oba)
2. **Konto GitHub**, **konto Cloudflare**, **konto Supabase** (wszystkie darmowe; do Supabase i Cloudflare
   możesz logować się przez GitHub)
3. **VS Code** z rozszerzeniem Claude Code
4. Na iPhonie: **Safari**, **Skróty**, **Zdrowie** (systemowe) oraz **Garmin Connect**

---

## Część 1 — repozytorium i hosting (Etap 0)

1. Na GitHubie: **New repository** → nazwa np. `kalorie` → **Private** → bez README → Create.
2. W terminalu w folderze projektu (Claude zrobi `git init` i pierwszy commit):
   ```bash
   git remote add origin https://github.com/<twoj-login>/kalorie.git
   git push -u origin main
   ```
3. Cloudflare: **dash.cloudflare.com → Workers & Pages → Create → Import a repository**
   → wybierz repo (zezwól Cloudflare na dostęp do tego repo).
   - Project name: `diet-app` (musi się zgadzać z `name` w `wrangler.jsonc`)
   - Build command: `npm run build`, Deploy command: `npx wrangler deploy` (domyślne)
   - Advanced settings: Path `/`, API token — utworzy się automatycznie; zmiennych na razie nie dodawaj
   - Deploy. Po 1–2 minutach dostaniesz adres `https://diet-app.<twoj-subdomena>.workers.dev`.
4. Na iPhonie otwórz ten adres w **Safari** → **Udostępnij → Do ekranu początkowego**.
   Od teraz otwieraj aplikację z ikony.
5. Każdy `git push` do `main` = nowa wersja aplikacji po ok. minucie.

## Część 2 — Supabase (Etap 1)

1. **supabase.com → New project**: nazwa `kalorie`, region **Central EU (Frankfurt)**,
   wygeneruj i **zapisz hasło do bazy** (przyda się przy `supabase link`).
2. **Authentication → Users → Add user → Create new user**: Twój e-mail + hasło,
   zaznacz **Auto Confirm User**.
3. **Authentication → Sign In / Providers**: wyłącz **Allow new users to sign up**
   (nikt poza Tobą nie założy konta).
4. **Project Settings → API** (lub przycisk **Connect**): skopiuj **Project URL** i klucz **anon / publishable**.
   - Wklej do pliku `.env.local` w projekcie (wzór w `.env.example`):
     ```
     VITE_SUPABASE_URL=https://xxxx.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJ...
     ```
   - Cloudflare → Workers & Pages → `diet-app` → **Settings → Build → Variables and secrets**
     (zmienne **builda**, nie „runtime" — Vite wkleja je do kodu podczas budowania) → dodaj te same
     dwie zmienne → potem ponów ostatni build (Deployments) albo zrób dowolny push.
   - Klucz `anon` jest publiczny z założenia (chronią Cię reguły RLS). **Nigdy** nie wklejaj nigdzie
     klucza `service_role`.
5. Wysłanie schematu bazy (gdy Claude przygotuje migrację):
   ```bash
   npx supabase login        # otworzy przeglądarkę
   npx supabase link         # wybierz projekt, podaj hasło do bazy
   npx supabase db push      # utworzy tabele
   ```

Uwaga: darmowy projekt Supabase usypia się po 7 dniach bez użycia. Przy codziennym liczeniu kalorii
to nie wystąpi; jeśli zrobisz dłuższą przerwę — w panelu Supabase kliknij **Restore project**.

## Część 3 — praca nad kolejnymi etapami

1. „Zrealizuj Etap N z ROADMAP.md". Jedna sesja = jeden etap.
2. Testuj w przeglądarce na komputerze: `npm run dev`, `http://localhost:5173`
   (F12 → widok telefonu). Na telefonie w trakcie pracy: `npm run dev -- --host` i adres
   `http://<IP-komputera>:5173` w Safari (ta sama sieć Wi-Fi — tylko podczas programowania).
3. Po etapie: commit i `git push` → nowa wersja na telefonie
   (zamknij aplikację i otwórz ponownie; czasem potrzebne dwa uruchomienia).

## Część 4 — Garmin → Apple Zdrowie (Etap 7)

1. **Garmin Connect** → Więcej (☰) → **Ustawienia → Aplikacje połączone → Apple Zdrowie**
   → włącz zapis **Aktywnej energii** (opcjonalnie: kroki, treningi, waga).
2. **Zdrowie** → Przeglądaj → Aktywność → Aktywna energia → „Źródła danych i dostęp"
   — sprawdź, że Garmin Connect jest na liście.
3. Dane trafiają do Zdrowia po synchronizacji zegarka z Garmin Connect
   (otwórz na chwilę Garmin Connect, zanim uruchomisz skrót).

## Część 5 — skrót „Kalorie Garmin" (Etap 7)

Wszystkie potrzebne wartości są w aplikacji: **Ustawienia → Garmin (spalone kalorie) → Dane do skrótu iOS**
(każda z przyciskiem **Kopiuj**). Najlepiej buduj skrót na iPhonie, kopiując wartości po kolei.

1. W aplikacji: **Wygeneruj token** → **Kopiuj**. Token widać tylko raz — jeśli go zgubisz, wygeneruj nowy
   (stary przestanie działać).
2. W **Skrótach** → „+" → nazwa **Kalorie Garmin** (taka sama jak w Ustawieniach aplikacji) → akcje
   (w nawiasie nazwy angielskie):
   1. **Znajdź próbki zdrowia** (Find Health Samples)
      - Typ: **Aktywna energia**; filtry: **Data rozpoczęcia jest dzisiaj**, **Źródło jest Connect** (Garmin)
   2. **Oblicz statystyki** (Calculate Statistics) → **Suma**
   3. **Zaokrąglij liczbę** (Round Number) → do liczb całkowitych
   4. **Data bieżąca** (Current Date) → **Formatuj datę** (Format Date): własny format `yyyy-MM-dd`
   5. **Pobierz zawartość URL** (Get Contents of URL):
      - URL: wklej **Adres (URL)** z aplikacji
      - Metoda: **POST**
      - Nagłówki: `apikey` = wklej **Nagłówek apikey** z aplikacji; `Content-Type` = `application/json`
      - Treść żądania: **JSON**, trzy pola typu **Tekst**:
        `p_token` = token, `p_date` = sformatowana data (zmienna), `p_kcal` = zaokrąglona liczba (zmienna)
   6. (opcjonalnie) **Pokaż powiadomienie**: „Wysłano [zaokrąglona liczba] kcal"

Przy pierwszym uruchomieniu iOS zapyta o dostęp do Zdrowia i do internetu — zezwól.

**Test:** uruchom skrót → otwórz Kalorie → na ekranie „Dziś” karta 🔥 pokazuje „Spalone: … kcal · z Garmina”.
Jeśli skrót pokaże błąd `Invalid token` — wklej token jeszcze raz (albo wygeneruj nowy).

W aplikacji przycisk **⟳ Odśwież z Garmina** uruchamia ten skrót; po powrocie do Kalorii wartość odświeży się sama.

**Automatycznie:** Skróty → Automatyzacja → „+" → **Pora dnia** (np. 21:00, codziennie)
→ **Uruchom natychmiast** → akcja: uruchom skrót „Kalorie Garmin".
Możesz też powiedzieć „Hej Siri, Kalorie Garmin".

## Wskazówki
- Jedna sesja = jeden etap (albo jedno zadanie). Krótsze zadania = mniej błędów.
- Jeśli chcesz coś zmienić w aplikacji — najpierw popraw PRD.md, potem poproś Claude o wdrożenie zmiany.
- Commit po każdym etapie, żeby łatwo cofnąć zmiany.
- Raz w miesiącu: Ustawienia → Kopia zapasowa → Przygotuj kopię → Zapisz plik (Pliki / iCloud Drive).
