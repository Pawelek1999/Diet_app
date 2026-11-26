# PRD — Kalorie (wymagania produktu)

## Cel

Szybkie i wygodne zapisywanie posiłków na iPhonie oraz kontrola dziennego bilansu kalorii
i makroskładników (białko, tłuszcze, węglowodany). Własna baza produktów i dań,
które można dowolnie tworzyć i edytować. Uwzględnienie kalorii spalonych według zegarka Garmin.

## Forma aplikacji

**PWA** — aplikacja webowa hostowana za darmo na Cloudflare Pages (kod w prywatnym repozytorium),
dodana w Safari do ekranu głównego („Udostępnij → Do ekranu początkowego"). Ma ikonę, otwiera się
na pełnym ekranie. Nie wymaga komputera ani konta Apple Developer do codziennego używania.

## Użytkownik i dane

- Jedna osoba (właściciel). Logowanie e-mailem i hasłem; rejestracja nowych kont wyłączona.
- Sesja zapamiętana — logowanie raz, potem aplikacja otwiera się od razu.
- Dane (produkty, dania, historia, ustawienia, aktywność) w chmurze **Supabase** (darmowy plan),
  chronione logowaniem i regułami RLS — każdy wiersz należy do zalogowanego użytkownika.
- Dostęp z wielu urządzeń (iPhone, przeglądarka na komputerze).
- **Zapis wymaga internetu.** Bez sieci aplikacja się otwiera i pokazuje komunikat „Brak połączenia".

## Kluczowe pojęcia

| Pojęcie | Opis |
|---|---|
| **Produkt** | Pojedynczy składnik, np. „Ryż biały", z wartościami na 100 g: kcal, białko, tłuszcz, węglowodany. Opcjonalnie domyślna porcja (np. „1 jajko = 60 g"). |
| **Danie** | Przepis złożony z produktów i ich gramatur, np. „Owsianka" = płatki 60 g + mleko 200 g + banan 100 g. Ma liczbę porcji. Kalorie liczą się automatycznie. |
| **Wpis** | To, co zjadłem: produkt (w gramach) albo danie (w porcjach lub gramach), przypisane do dnia i posiłku. |
| **Posiłek** | Kategoria wpisu: Śniadanie, II śniadanie, Obiad, Podwieczorek, Kolacja, Przekąska. |
| **Cel** | Dzienny cel kcal (+ opcjonalnie cele makro w gramach). |
| **Aktywność** | Kalorie aktywne spalone danego dnia (z Garmina przez Apple Zdrowie albo wpisane ręcznie). Jedna wartość na dzień. |

## Funkcje — MVP (wersja 1)

### 0. Logowanie
- Ekran logowania: e-mail + hasło, komunikaty błędów po polsku
- Wylogowanie w Ustawieniach

### 1. Ekran „Dziś" (główny)
- Data u góry, strzałki ← → do zmiany dnia, tap na datę → wybór daty
- Pasek postępu: zjedzone kcal / cel, pozostało X kcal
- Podsumowanie makro: B / T / W (gramy + paski względem celu)
- Spalone kalorie z Garmina (jeśli są)
- Lista posiłków (sekcje), w każdej wpisy z kcal; suma kcal dla posiłku
- Przycisk „+" przy każdym posiłku → dodawanie wpisu
- Przesunięcie wpisu w lewo albo przycisk → usuń; tap → edytuj ilość / przenieś do innego posiłku

### 2. Dodawanie wpisu
- Wyszukiwarka po nazwie (produkty i dania razem, z oznaczeniem typu), z fokusem od razu po otwarciu
- Sekcja „Ostatnio używane" i „Ulubione"
- Po wybraniu: podaj ilość (gramy albo porcje), podgląd kcal i makro na żywo
- Przycisk „Utwórz nowy produkt / danie", jeśli nie ma na liście
- Szybkie dodanie kcal bez produktu („Szybki wpis: 250 kcal"), opcjonalnie z makro (B/T/W); puste kcal liczone z makro

### 3. Produkty
- Lista z wyszukiwarką
- Dodaj / edytuj / usuń produkt
- Pola: nazwa, kcal/100 g, B/T/W na 100 g, opcjonalna porcja (nazwa + gramy), ulubiony
- Walidacja: wartości ≥ 0; ostrzeżenie (nie blokada), gdy kcal mocno odbiega od 4·B + 4·W + 9·T

### 4. Dania (przepisy i gotowe posiłki)
- Lista z wyszukiwarką
- Dwa tryby dania:
  - **„Gotowe makro"** (jak w dotychczasowym Excelu): kcal, B, T, W wpisane ręcznie **na porcję**;
    do dziennika dodawane w porcjach (np. 1; 0,5; 2)
  - **„Ze składników"**: nazwa, liczba porcji, lista składników (produkt + gramy); automatyczne
    wyliczenie kcal i makro całości, na porcję i na 100 g; opcjonalnie waga gotowego dania
    (po ugotowaniu), żeby można było logować w gramach
- Pola wspólne: **Opis** (np. składniki jako tekst), **Uwagi**, **Link do przepisu**
  (np. YouTube — w aplikacji przycisk „▶ Przepis" otwierający link)
- Dotychczasowe posiłki z Excela użytkownik wpisuje ręcznie jako dania „Gotowe makro"
- Duplikowanie dania (np. wariant „Owsianka z masłem orzechowym")

### 5. Historia i statystyki
- Widok tygodnia: słupki kcal z dni vs linia celu, średnia
- Tap na dzień → przejście do jego ekranu „Dziś"

### 6. Ustawienia
- Dzienny cel kcal i cele makro
- Posiłki: kolejność, widoczność, zmiana nazw; **własne pory posiłków** (np. „Przed treningiem”) — dodawanie
  i usuwanie (usunąć można tylko posiłek bez wpisów; wpisy z nieistniejącego posiłku trafiają do grupy „Inne”)
- Eksport danych do JSON (dodatkowa kopia zapasowa — darmowy plan Supabase nie daje kopii do pobrania) i import z JSON
- Ustawienia Garmina (sekcja 7) — dane do skrótu iOS (adres, klucz, token) schowane w zwijanej sekcji
  „Zaawansowane”; wylogowanie

### 7. Spalone kalorie z Garmina (Apple Zdrowie → Skróty iOS → Supabase)
- Garmin Connect zapisuje „Aktywną energię" do Apple Zdrowie (ustawienie w aplikacji Garmin Connect)
- W Ustawieniach: przycisk **„Wygeneruj token dla skrótu"** — pokazuje jednorazowo token importu
  (do wklejenia w skrót). Wygenerowanie nowego unieważnia poprzedni.
- Skrót iOS „Kalorie Garmin" odczytuje dzisiejszą aktywną energię z Apple Zdrowie (tylko źródło Garmin Connect)
  i wysyła ją bezpośrednio do bazy (zapytanie HTTP z tokenem). **Bez otwierania aplikacji.**
- Skrót można uruchamiać ręcznie, przez Siri albo automatycznie (Automatyzacja: np. codziennie o 21:00)
- Ponowne wysłanie tego samego dnia **nadpisuje** wartość
- Na ekranie „Dziś": „Spalone: 523 kcal" + przycisk „Odśwież z Garmina" (uruchamia skrót)
- Ręczne wpisanie / edycja / usunięcie spalonych kcal (gdy skrót nie działa)
- Ustawienie **„Doliczaj spalone kalorie do celu"** (domyślnie wyłączone) + procent doliczania
  (domyślnie 100%, np. 50% dla ostrożnych). Gdy włączone: cel dnia = cel bazowy + spalone × procent
- Historia tygodnia pokazuje cel dnia z uwzględnieniem aktywności (jeśli ustawienie włączone)

## Ważna zasada: historia się nie zmienia

Gdy edytuję produkt lub danie, **wcześniejsze wpisy zachowują stare wartości**.
Każdy wpis zapisuje kopię (snapshot) kcal i makro w chwili dodania.
Edycja produktu wpływa tylko na nowe wpisy.

## Wymagania niefunkcjonalne

- Instalowalna na ekranie głównym iPhone'a (manifest, ikona, tryb `standalone`)
- Pliki aplikacji w cache (service worker) — szybki start; dane wymagają internetu
- Dodanie wpisu z „Ostatnio używanych" w ≤ 3 tapnięciach
- Obsługa trybu ciemnego (systemowego)
- Interfejs po polsku, liczby z przecinkiem dziesiętnym (pola akceptują przecinek i kropkę)
- Duże, wygodne pola dotykowe (min. 44 px); klawiatura numeryczna dla liczb (`inputmode="decimal"`)
- **Wygodne dyktowanie z klawiatury iOS** (mikrofon na klawiaturze): wyszukiwarka ignoruje wielkość liter,
  polskie znaki („zolty" = „żółty"), kropki i spacje na końcu, które dodaje dyktowanie („Banan." → „banan")
- Czytelny komunikat przy braku internetu lub błędzie zapisu — nic nie ginie po cichu

## Ryzyka i jak je ograniczamy

| Ryzyko | Ograniczenie |
|---|---|
| Darmowy projekt Supabase usypia się po 7 dniach bez użycia | Przy codziennym używaniu nie wystąpi; wybudzenie jednym kliknięciem w panelu Supabase |
| Brak kopii zapasowych do pobrania w darmowym planie Supabase | Eksport JSON w Ustawieniach (np. raz w miesiącu) |
| Brak internetu przy zapisie posiłku | Komunikat i możliwość ponowienia; tryb offline z kolejką — ewentualnie później |
| Wyciek tokenu skrótu | Token pozwala tylko zapisać aktywność; można go w każdej chwili wygenerować ponownie |

## Poza zakresem MVP (może później)

- Skaner kodów kreskowych (kamera w przeglądarce) + baza Open Food Facts
- Pomiar wagi ciała i wykres (import z Apple Zdrowie tym samym mechanizmem co aktywność)
- Woda / nawodnienie
- Wpis głosowy z AI („na śniadanie dwa jajka i kromka chleba" → wpisy do zatwierdzenia), przez Supabase Edge Function; ewentualnie przez Siri
- Zapis offline z kolejką i synchronizacją
- Widżet na ekran główny (niedostępny dla PWA)
