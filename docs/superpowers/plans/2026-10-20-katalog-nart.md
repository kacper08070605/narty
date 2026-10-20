# Katalog nart — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Statyczny katalog używanych nart Kacpra na GitHub Pages, zasilany skryptem importującym ogłoszenia z jego profilu Vinted.

**Architecture:** Skrypt Pythona (`scripts/`) pobiera ogłoszenia, parsuje opisy, klasyfikuje narty, pobiera i skaluje zdjęcia oraz zapisuje `data/narty.json` i `img/`. Strona (`index.html` + `css/` + `js/`) bez frameworka i bez builda czyta JSON, renderuje listę z filtrami nad nią i widok szczegółów pod `#/narty/<id>`.

**Tech Stack:** Python 3.13 (tylko stdlib + Pillow 12, oba dostępne), testy `python -m unittest`. Przeglądarkowy JS (ES modules), testy czystych funkcji `node --test` (Node 22). Git + `gh` (zalogowany jako `kacper08070605`).

**Spec:** `docs/superpowers/specs/2026-10-20-katalog-nart-design.md`

## Global Constraints

- ID profilu Vinted: `312694449`. User-Agent przeglądarkowy, pauza ≥ 1 s między żądaniami do Vinted.
- API listy wymaga ciasteczek z `GET https://www.vinted.pl/` i nagłówka `Accept: application/json`.
- E-mail kontaktowy: `kacper08070605@gmail.com`; `mailto:` z `subject` = tytuł ogłoszenia (np. „Narty Atomic Redster G7 161 cm”), zakodowany przez `encodeURIComponent`.
- Brak jakichkolwiek linków do vinted.pl na stronie. Zdjęcia serwowane z repo, nigdy z `images1.vinted.net`.
- Przedziały długości (po zaokrągleniu do pełnego cm): `do155` (≤ 155), `156-165`, `166plus` (≥ 166).
- Poziomy: `poczatkujacy-sredni`, `zaawansowany` (para może mieć oba). Dla kogo: `damskie`, `uniwersalne`. Skręt: `krotki`, `sredni`, `dlugi`.
- Etykiety UI: „do 155 cm”, „156–165 cm”, „166 cm i więcej”; „Początkujący i średniozaawansowani”, „Zaawansowani”; „Damskie”, „Męskie / uniwersalne”; „Krótki (slalomowy)”, „Średni (uniwersalny)”, „Długi (gigantowy)”; „Zarezerwowane”.
- Tekst globalny: „Odbiór osobisty w Lublinie lub wysyłka — koszt do ustalenia mailowo”.
- Język polski, poprawna odmiana „para / pary / par”. Bez emoji, gradientów i fioletowo-niebieskiej palety. WCAG AA, cele dotykowe ≥ 44 px, brak poziomego scrolla przy 360 px.
- Repo: `kacper08070605/narty`, Pages z gałęzi `main` (root), URL `https://kacper08070605.github.io/narty/`. Wszystkie ścieżki na stronie względne (strona działa pod `/narty/`).

## Review Focus

1. Opis z odwołaniem RSC (`"description":"$119"`) zamiast tekstu → pełny tekst rozwiązany z wiersza `119:T<len>,`; test w Task 2.
2. Polskie znaki w opisach (escapowanie JSON w stringu JS) → „Długość”, „ślizgi” bez krzaków; test w Task 2.
3. Ponowne wystawienie pary (nowe id) → korekta dopasowana po marce, modelu i długości z ostrzeżeniem; test w Task 3.
4. Kombinacja filtrów dająca 0 wyników → komunikat i przycisk „Wyczyść filtry”, licznik „0 par”; test `pluralPary(0)` w Task 5 i ręczna weryfikacja w Task 6.
5. Para sprzedana między importami → znika z JSON, a jej katalog zdjęć zostaje usunięty; test w Task 4.

---

## Struktura plików

```
scripts/vinted.py        # sieć: sesja z ciasteczkami, lista ogłoszeń, HTML ogłoszenia, pobieranie bajtów
scripts/parse.py         # czyste funkcje: wyciąganie opisu z HTML, czyszczenie, parametry
scripts/classify.py      # czyste funkcje: przedziały, poziom, dla kogo, skręt, korekty
scripts/update.py        # orkiestracja + zdjęcia + zapis JSON + podsumowanie (CLI)
scripts/review_table.py  # tabela kategorii do akceptacji przez Kacpra (CLI)
tests/test_parse.py, tests/test_classify.py, tests/test_update.py
tests/fixtures/item_inline.html, tests/fixtures/item_ref.html
data/narty.json, data/overrides.json
img/<id>/<n>-s.webp, img/<id>/<n>-l.webp
index.html, css/style.css, js/filters.js, js/app.js, tests/filters.test.mjs
README.md, .gitignore
```

---

### Task 1: Repozytorium i fixtures

**Files:**
- Create: `.gitignore`, `README.md`, `tests/fixtures/item_inline.html`, `tests/fixtures/item_ref.html`

- [ ] **Step 1:** `git init -b main` w `C:\Kurs vibe coding\Projekt strona`. `.gitignore`: `.superpowers/`, `__pycache__/`, `*.pyc`, `.cookies`.
- [ ] **Step 2:** Skopiuj fixtures (strony HTML pobrane podczas rozpoznania):
  - `C:\Users\KACPER~1.KUC\AppData\Local\Temp\claude\C--Kurs-vibe-coding-Projekt-strona\282289a4-468a-4fe9-ab41-9e120c34ab4d\scratchpad\item.html` → `tests/fixtures/item_inline.html` (Atomic Redster G7 161 cm, opis inline);
  - `...\scratchpad\serpo.html` → `tests/fixtures/item_ref.html` (Black Crows Serpo 168.2 cm, opis jako `$119`).
  Jeśli pliki zniknęły, pobierz je ponownie: `curl -L -A <UA> https://www.vinted.pl/items/10445590864` i `.../items/10458683549`.
- [ ] **Step 3:** `README.md`, krótko po polsku: czym jest projekt i jak zrobić aktualizację (`python scripts/update.py`, potem `python scripts/review_table.py --new`, commit, push).
- [ ] **Step 4:** Commit `chore: init repo with fixtures`.

### Task 2: Parsowanie opisów (`scripts/parse.py`)

**Interfaces — Produces:**
- `decode_flight(html: str) -> str`: skleja i odkodowuje (`json.loads('"'+chunk+'"')`) wszystkie fragmenty `self.__next_f.push([1,"…"])` w jeden strumień RSC.
- `extract_description(html: str) -> str | None`: znajduje w strumieniu JSON-LD `"description":"…"`. Jeśli wartość to `$<hex>`, czyta wiersz `<hex>:T<lenhex>,` i bierze dokładnie `int(lenhex,16)` **bajtów UTF-8** po przecinku.
- `clean_description(text: str) -> str`: usuwa linię `***…***` oraz zdania końcowe zaczynające się od „Mile widziany odbiór osobisty”, „Zapraszam do odwiedzenia mojego profilu”, „Zapraszam do kontaktu”; normalizuje puste linie.
- `parse_fields(text: str) -> dict`, klucze: `model: str|None`, `dlugosc_cm: float|None`, `promien_m: float|None`, `taliowanie: str|None` (tekst tak jak w opisie, np. „126/76/110 mm” albo „70 mm”; obsłuż „Talia:”, „W:”, „Taliowanie: W 72 mm”), `talia_mm: float|None` (środkowa liczba lub jedyna), `sezon: str|None`, `inne: list[tuple[str,str]]` (pozostałe linie „Klucz: wartość” przed „Stan:”, np. Wiązania, Profil, Technologie), `stan: str`, `opis_modelu: str`. Przecinek dziesiętny → kropka.

- [ ] **Step 1: Testy** w `tests/test_parse.py` (unittest):
  - `test_inline_description`: dla `item_inline.html` opis zawiera „Atomic Redster G7” i „Długość: 161 cm” (poprawne polskie znaki).
  - `test_ref_description`: dla `item_ref.html` opis zaczyna się od `***Z uwagi` i zawiera „Model: Black Crows Serpo”, nie zaczyna się od `$`.
  - `test_clean_removes_boilerplate`: po `clean_description` brak „Vinted”, „Mile widziany”, „Zapraszam”.
  - `test_fields_g7`: `dlugosc_cm == 161`, `promien_m == 14.2`, `talia_mm == 70`, `stan` zaczyna się od „Narty w dobrym stanie”, `opis_modelu` zawiera „charakterystyce gigantowej”.
  - `test_fields_taliowanie_triple`: tekst z „Taliowanie: 126/76/110 mm” i „Sezon: 2022/2023” → `talia_mm == 76`, `sezon == "2022/2023"`.
  - `test_fields_w_prefix`: „Taliowanie: W 72 mm” → `talia_mm == 72`; „Promień skrętu: 11.9 m” → `11.9`.
  - `test_fields_inne`: „Wiązania: Tyrolia 10 SLR GripWalk” trafia do `inne`.
- [ ] **Step 2:** `python -m unittest tests.test_parse -v` → FAIL (brak modułu).
- [ ] **Step 3:** Zaimplementuj `scripts/parse.py` (dodaj `scripts/__init__.py` i `tests/__init__.py`).
- [ ] **Step 4:** `python -m unittest tests.test_parse -v` → PASS.
- [ ] **Step 5:** Commit `feat: parse Vinted item descriptions`.

### Task 3: Klasyfikacja (`scripts/classify.py`)

**Interfaces — Consumes:** wynik `parse_fields`. **Produces:**
- `length_bucket(cm: float) -> str`: `round(cm)`, potem `do155` / `156-165` / `166plus`.
- `levels(opis: str) -> list[str]`: na małych literach. Zawiera „początkując” lub „średniozaawansowan” → `poczatkujacy-sredni`. Zawiera „zaawansowan” poza „średniozaawansowan” lub „dobrze jeżdżąc” → `zaawansowany`. Pusta lista oznacza brak danych.
- `gender(opis: str, model: str) -> str`: „damsk” lub „narciar(ek|ki|ka)” w opisie albo model z listy `WOMEN_MODELS = ("cloud", "flair", "belle", "my star")` → `damskie`, inaczej `uniwersalne`.
- `turn(promien_m: float|None, opis: str) -> str|None`: „gigantow” w opisie → `dlugi`; „slalomow” bez „gigantow” → `krotki`; w pozostałych przypadkach z promienia: `< 13` → `krotki`, `>= 15` → `dlugi`, inaczej `sredni`. Brak promienia → `None`.
- `apply_overrides(item: dict, overrides: dict) -> tuple[dict, str|None]`: `overrides` to `{ "<id>": {"match": {"model","dlugosc_cm"}, "levels"?, "gender"?, "turn"?} }`. Najpierw dopasowanie po `str(item["id"])`. Jeśli brak, dopasowanie po `model.lower()` i `dlugosc_cm`; wtedy zwraca ostrzeżenie `"korekta dopasowana po modelu: <stare id> -> <nowe id>"`. Pola z korekty nadpisują automatyczne.

- [ ] **Step 1: Testy** `tests/test_classify.py`:
  - `length_bucket`: 155 → `do155`, 155.4 → `do155`, 156 → `156-165`, 165 → `156-165`, 168.2 → `166plus`.
  - `levels("…dla narciarzy średniozaawansowanych i zaawansowanych…") == ["poczatkujacy-sredni","zaawansowany"]`; `levels("…dla osób średniozaawansowanych…") == ["poczatkujacy-sredni"]`; `levels("Model dla dobrze jeżdżących narciarzy") == ["zaawansowany"]`; `levels("Model odpowiedni do rekreacyjnej jazdy") == []`.
  - `gender("…narty damskie…","Atomic Cloud C7") == "damskie"`; `gender("","Kneissl My Star MC") == "damskie"`; `gender("…dla narciarzy…","K2 Disruption STi") == "uniwersalne"`.
  - `turn(14.2,"charakterystyce gigantowej") == "dlugi"`; `turn(14.5,"cechy nart slalomowych i gigantowych") == "dlugi"`; `turn(11.9,"") == "krotki"`; `turn(14.0,"") == "sredni"`; `turn(16,"") == "dlugi"`; `turn(None,"") is None`.
  - `test_override_by_id` i `test_override_relisted` (nowe id, ten sam model i długość → pola nadpisane, ostrzeżenie niepuste).
- [ ] **Step 2:** `python -m unittest tests.test_classify -v` → FAIL.
- [ ] **Step 3:** Zaimplementuj.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: classify skis for filters`.

### Task 4: Import (`scripts/vinted.py`, `scripts/update.py`)

**Interfaces — Consumes:** Task 2 i 3. **Produces:**
- `vinted.Client(user_agent: str, delay: float = 1.0)` z metodami `wardrobe(user_id: int) -> list[dict]` (stronicowanie `per_page=96` do `total_pages`), `item_html(url: str) -> str`, `get_bytes(url: str) -> bytes`. Implementacja: `urllib.request` + `http.cookiejar`. Przy 403 rzuca `VintedBlocked` z czytelnym komunikatem.
- `update.build_item(raw: dict, html: str, overrides: dict) -> tuple[dict, list[str]]` → rekord JSON: `id, tytul, cena (int zł), zarezerwowane (bool z raw["is_reserved"]), model, marka (raw["brand_title"] lub pierwsze słowo modelu), dlugosc_cm, promien_m, taliowanie, talia_mm, sezon, inne, stan, opis_modelu, dlugosc_przedzial, poziomy, dla_kogo, skret, zdjecia: [{"s": "img/<id>/<n>-s.webp", "l": "img/<id>/<n>-l.webp"}]`. Zwraca też ostrzeżenia: brak długości, brak poziomu bez korekty, dopasowanie korekty po modelu.
- `update.save_photo(data: bytes, dest_dir: Path, n: int) -> None`: Pillow, `ImageOps.exif_transpose`. Wariant `-s` o szerokości 480 px, `-l` o maksymalnym boku 1600 px (bez powiększania), WebP quality 80.
- `update.sync_photos(items: list[dict], img_root: Path) -> None`: usuwa katalogi `img/<id>`, których id nie ma w `items`.
- `update.main(argv) -> int`: pełny import. Zdjęcie pobiera tylko wtedy, gdy plik `-l` jeszcze nie istnieje; preferuje `photo["full_size_url"]`, potem `photo["url"]`. Zapisuje `data/narty.json` (`{"zaktualizowano": ISO-data, "narty": [...]}`, UTF-8, `ensure_ascii=False`, sortowane po cenie rosnąco) i wypisuje podsumowanie: liczba par, dodane, usunięte, zmienione ceny, ostrzeżenia.

- [ ] **Step 1: Testy** `tests/test_update.py` (bez sieci):
  - `test_build_item_g7`: raw `{"id":10445590864,"title":"Narty Atomic Redster G7 161 cm","price":{"amount":"870.0"},"is_reserved":False,"photos":[{"url":"u1"},{"url":"u2"}],"brand_title":"Atomic"}` + `item_inline.html` → `cena == 870`, `dlugosc_przedzial == "156-165"`, `skret == "dlugi"`, `poziomy == ["poczatkujacy-sredni","zaawansowany"]`, `zdjecia[1]["s"] == "img/10445590864/2-s.webp"`, w `stan` i `opis_modelu` brak „Vinted”.
  - `test_sync_photos_removes_sold`: tymczasowy `img/` z katalogami `1` i `2`, items tylko z id 1 → katalog `2` usunięty.
  - `test_save_photo_sizes`: obraz 2000×1000 → `-s` ma szerokość 480, `-l` ma szerokość 1600.
- [ ] **Step 2:** → FAIL. **Step 3:** Zaimplementuj. **Step 4:** → PASS.
- [ ] **Step 5:** Uruchom prawdziwy import: `python scripts/update.py` → 27 par (lub tyle, ile jest aktywnych), wszystkie z opisem, `img/` wypełnione. Ostrzeżenia zanotuj do Task 7.
- [ ] **Step 6:** Commit `feat: import listings from Vinted` (razem z `data/narty.json`, `data/overrides.json` = `{}`, `img/`).

### Task 5: Logika filtrów (`js/filters.js`)

**Interfaces — Produces** (ES module, bez DOM):
- `FILTER_GROUPS`: tablica `{key, label, options:[{value,label}]}` dla `dlugosc_przedzial`, `poziomy`, `dla_kogo`, `skret` z etykietami z Global Constraints. Etykiety grup: „Długość”, „Poziom”, „Dla kogo”, „Charakter skrętu”.
- `matches(item, state) -> boolean`: `state = {dlugosc_przedzial:[], poziomy:[], dla_kogo:[], skret:[], cenaMin:number|null, cenaMax:number|null}`. Opcje w grupie łączone LUB, grupy łączone I; pusta grupa przepuszcza wszystko; `poziomy` to tablica (wystarczy część wspólna).
- `applyFilters(items, state) -> items[]`, `sortItems(items, mode)` z `mode ∈ {"cena-rosnaco","cena-malejaco","dlugosc"}`.
- `stateToHash(state) -> string` i `hashToState(hash) -> state`. Format np. `#/?dlugosc=156-165&poziom=zaawansowany&cena=600-1000`; nieznane wartości są ignorowane.
- `pluralPary(n) -> string`: „1 para”, „2 pary”, „5 par”, „12 par”, „22 pary”, „0 par”.

- [ ] **Step 1: Testy** `tests/filters.test.mjs` (`node:test`): para z `poziomy:["poczatkujacy-sredni","zaawansowany"]` pasuje do filtra `zaawansowany` i do filtra `poczatkujacy-sredni`; filtry `dlugosc_przedzial:["do155","166plus"]` przepuszczają 154 i 168 cm, a odrzucają 160; zakres cen 600–900 odrzuca 950; round-trip `hashToState(stateToHash(s))` daje równy stan; wszystkie przypadki `pluralPary` z listy wyżej.
- [ ] **Step 2:** `node --test tests/` → FAIL. **Step 3:** Zaimplementuj. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat: filter logic`.

### Task 6: Strona (`index.html`, `css/style.css`, `js/app.js`)

**Interfaces — Consumes:** `data/narty.json` (Task 4), `js/filters.js` (Task 5).

Kierunek wizualny ze spec pkt 6. Decyzje dla buildera tego zadania (Claude):
- Font: **Inter Tight** (nagłówki) i **Inter** (tekst) z Google Fonts, cyfry `font-variant-numeric: tabular-nums` w cenach i parametrach.
- Kolory jako tokeny na `:root`: tło `#f6f5f2`, powierzchnia `#ffffff`, tekst `#141414`, tekst drugorzędny `#5c5c5c`, linia `#e3e1dc`, akcent `#d2461f` (ciepła, „ratownicza” czerwień; tekst na akcencie biały, kontrast ≥ 4.5:1 sprawdzić i w razie potrzeby przyciemnić). Tryb ciemny poza zakresem.
- Tytuł strony: „Narty używane · Lublin” (do potwierdzenia przez Kacpra w Task 7).

- [ ] **Step 1: Lista.** Nagłówek: tytuł, podtytuł z liczbą par (`pluralPary`) i tekstem globalnym o odbiorze. Pod nim pasek filtrów jako grupy przełączników `aria-pressed`. Na ≤ 640 px pasek zwinięty do przycisku „Filtry (n)”, który rozwija panel nad listą. Suwak lub dwa pola ceny, sortowanie, licznik wyników, „Wyczyść filtry”. Pod spodem siatka kart (1 kolumna przy 360 px, 2 od 560 px, 3 od 900 px, 4 od 1240 px). Karta: zdjęcie 4:5 `loading="lazy"` z `-s.webp`, marka i model, „161 cm · R 14,2 m”, cena, etykiety poziomu i „Damskie”, „Zarezerwowane” jako nakładka. Cała karta jest linkiem do `#/narty/<id>`. Przy zerze wyników: komunikat „Brak nart dla tych filtrów” i przycisk „Wyczyść filtry”.
- [ ] **Step 2: Szczegóły** (`#/narty/<id>`). Link „← Wszystkie narty” (wraca z zachowanym stanem filtrów). Galeria: duże zdjęcie `-l.webp`, przewijany pasek miniatur, swipe (pointer events), strzałki ←/→ z klawiatury, licznik „3 / 15”. Obok (desktop) albo pod (mobile): tytuł, cena, przycisk „Napisz do mnie” (`mailto` jak w Global Constraints), tabela specyfikacji (Długość, Promień skrętu, Taliowanie, Sezon, `inne`), sekcje „Stan” i „O modelu”. `document.title` = tytuł pary. Nieznane id → komunikat i link do listy.
- [ ] **Step 3: Meta.** `<meta name="description">`, Open Graph dla strony głównej (`og:title`, `og:description`, `og:image` = pierwsze `-l.webp` najtańszej pary, ścieżka względna zamieniona na absolutny URL Pages). Favicon SVG inline.
- [ ] **Step 4: Weryfikacja lokalna:** `python -m http.server 8000`, otwórz `http://localhost:8000/`. Sprawdź:
  - filtry zmieniają hash, a odświeżenie strony zachowuje stan;
  - kombinacja dająca 0 wyników pokazuje komunikat;
  - przy szerokości 360 px nie ma poziomego scrolla;
  - wszystko działa z klawiatury i focus jest widoczny;
  - na stronie nie ma żadnego linku z „vinted” (`grep -ri vinted index.html js css` pusty; w `data/narty.json` nie ma `vinted`).
- [ ] **Step 5:** Review UX/UI przez świeżego subagenta (Opus, pełny effort) na podstawie zrzutów ekranu z 360 px i 1280 px oraz kodu, z kryterium „wygląda jak dzieło dobrego projektanta, a nie szablon AI”. Popraw zgłoszone problemy.
- [ ] **Step 6:** Commit `feat: catalog page`.

### Task 7: Akceptacja kategorii przez Kacpra

**Interfaces — Produces:** `scripts/review_table.py [--new]` drukuje tabelę Markdown: tytuł, długość, przedział, poziom(y), dla kogo, skręt (promień), źródło (auto/korekta). `--new` pokazuje tylko pary dodane od ostatniego commita `data/narty.json` (porównanie z `git show HEAD:data/narty.json`).

- [ ] **Step 1:** Zaimplementuj i uruchom. Pary bez poziomu (np. Atomic Cloud C9, Kneissl My Star MC, K2 Disruption STi) uzupełnij oceną Claude w `data/overrides.json`.
- [ ] **Step 2:** Pokaż Kacprowi tabelę i proponowany tytuł strony. Wprowadź jego poprawki do `overrides.json`, uruchom `python scripts/update.py` i potwierdź, że tabela się zgadza.
- [ ] **Step 3:** Commit `chore: reviewed classification`.

### Task 8: Publikacja

- [ ] **Step 1:** `gh repo create kacper08070605/narty --public --source . --push`. **Najpierw zapytaj Kacpra o zgodę**, bo to publikacja na zewnątrz.
- [ ] **Step 2:** Włącz Pages: `gh api -X POST repos/kacper08070605/narty/pages -f "source[branch]=main" -f "source[path]=/"`.
- [ ] **Step 3:** Poczekaj na build (`gh api repos/kacper08070605/narty/pages/builds/latest` → `status: built`) i otwórz `https://kacper08070605.github.io/narty/`. Sprawdź, czy ładują się zdjęcia, filtry i szczegóły pary oraz czy działa `mailto`.
- [ ] **Step 4:** Przekaż Kacprowi link i instrukcję aktualizacji z README.
