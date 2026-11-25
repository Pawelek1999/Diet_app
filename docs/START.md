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
3. Cloudflare: **dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git**
   → wybierz repo `kalorie` (zezwól Cloudflare na dostęp do tego repo).
   - Framework preset: **React (Vite)** (albo ręcznie: build command `npm run build`, output `dist`)
   - Zapisz i wdróż. Po 1–2 minutach dostaniesz adres `https://kalorie-xxx.pages.dev`.
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
   - Cloudflare Pages → Twój projekt → **Settings → Variables and Secrets** → dodaj te same dwie zmienne
     → potem **Deployments → Retry deployment**.
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

Najpierw w aplikacji Kalorie: **Ustawienia → Wygeneruj token dla skrótu → Kopiuj**.

W **Skrótach** → „+" → nazwa **Kalorie Garmin** → akcje (w nawiasie nazwy angielskie):

1. **Znajdź próbki zdrowia** (Find Health Samples)
   - Typ: **Aktywna energia**; filtry: **Data rozpoczęcia jest dzisiaj**, **Źródło jest Connect** (Garmin)
2. **Oblicz statystyki** (Calculate Statistics) → **Suma**
3. **Zaokrąglij liczbę** (Round Number) → do liczb całkowitych
4. **Data bieżąca** (Current Date) → **Formatuj datę** (Format Date): własny format `yyyy-MM-dd`
5. **Pobierz zawartość URL** (Get Contents of URL):
   - URL: `https://<twoj-projekt>.supabase.co/rest/v1/rpc/import_activity`
   - Metoda: **POST**
   - Nagłówki: `apikey` = klucz anon; `Content-Type` = `application/json`
   - Treść: **JSON**, pola tekstowe: `p_token` = token z aplikacji, `p_date` = sformatowana data,
     `p_kcal` = zaokrąglona liczba
6. (opcjonalnie) **Pokaż powiadomienie**: „Wysłano [liczba] kcal"

Przy pierwszym uruchomieniu iOS zapyta o dostęp do Zdrowia i do internetu — zezwól.

**Automatycznie:** Skróty → Automatyzacja → „+" → **Pora dnia** (np. 21:00, codziennie)
→ **Uruchom natychmiast** → akcja: uruchom skrót „Kalorie Garmin".
Możesz też powiedzieć „Hej Siri, Kalorie Garmin".

## Wskazówki
- Jedna sesja = jeden etap (albo jedno zadanie). Krótsze zadania = mniej błędów.
- Jeśli chcesz coś zmienić w aplikacji — najpierw popraw PRD.md, potem poproś Claude o wdrożenie zmiany.
- Commit po każdym etapie, żeby łatwo cofnąć zmiany.
- Raz w miesiącu: Ustawienia → Eksport — dodatkowa kopia danych w Plikach / iCloud Drive.
