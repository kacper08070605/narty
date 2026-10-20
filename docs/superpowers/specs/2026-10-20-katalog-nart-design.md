# Katalog nart — projekt

Data: 2026-10-20
Właściciel: Kacper (konto GitHub `kacper08070605`)

## 1. Po co to jest

Kacper sprzedaje używane narty na Vinted (profil https://www.vinted.pl/member/312694449, obecnie 27 par).
Chce mieć własną stronę-katalog, której link roześle do grup znajomych i na grupy narciarskie, żeby ludzie
mogli spokojnie przejrzeć ofertę i znaleźć narty „pod siebie”.

- To **nie jest sklep**. Nie ma koszyka ani płatności. Kto chce kupić, pisze maila do Kacpra.
- Kacper **nie chce drugi raz wgrywać zdjęć ani przepisywać opisów**. Cała treść ma pochodzić z ogłoszeń na Vinted.
- Strona ma zawierać **wszystko na miejscu**: wszystkie zdjęcia, pełny opis, parametry i cenę.
  **Bez linków do ogłoszeń na Vinted** (decyzja Kacpra).

### Jak wygląda sukces
Ktoś otwiera link na telefonie z grupy na Facebooku. W kilka sekund zawęża listę do nart w swojej długości
i na swoim poziomie, ogląda zdjęcia i opis wybranej pary, a potem jednym kliknięciem pisze maila z gotowym tematem.

### Anty-cele (porażka, nawet jeśli „działa”)
- Strona wygląda jak typowy szablon wygenerowany przez AI: gradientowy hero, emoji, ogólniki, karty o identycznym rytmie, fioletowo-niebieskie gradienty.
- Filtr zwraca zero albo jedną parę dla większości kombinacji, więc przestaje być użyteczny.
- Zdjęcia znikają po sprzedaży albo usunięciu ogłoszenia na Vinted.
- Na stronie zostają teksty specyficzne dla Vinted, np. „nie wysyłam przez Vinted” albo „zapraszam na mój profil”.

## 2. Zakres

### W zakresie
1. Skrypt importu, który pobiera wszystkie aktywne ogłoszenia z profilu Vinted, ściąga zdjęcia do repozytorium i zapisuje dane do pliku JSON.
2. Statyczna strona (GitHub Pages): lista nart z filtrami oraz widok szczegółów pary.
3. Kontakt mailowy na adres **kacper08070605@gmail.com** (link `mailto:` z tematem równym tytułowi ogłoszenia, np. „Narty Atomic Redster G7 161 cm”). Innych kanałów kontaktu brak (decyzja Kacpra).
4. Publikacja na GitHub Pages z konta `kacper08070605`. Proponowane repo: `narty`, adres `https://kacper08070605.github.io/narty/`.

### Poza zakresem
- Sklep, płatności, koszyk, rezerwacje, konta użytkowników.
- Automatyczna, cykliczna synchronizacja. **Aktualizacja jest ręczna**: Kacper wraca do rozmowy z Claude i prosi o aktualizację. Claude uruchamia skrypt importu, sprawdza wynik, commituje i wypycha zmiany (decyzja Kacpra).
- Panel administracyjny lub edycja treści w przeglądarce.
- Wersje językowe inne niż polska.

## 3. Źródło danych (ustalone podczas rozpoznania)

Rozpoznanie wykonano 2026-10-20. Działający sposób pobierania:

1. `GET https://www.vinted.pl/` z przeglądarkowym User-Agentem, z zapisem ciasteczek (słoik cookies). Vinted ustawia anonimowe `access_token_web` itp.
2. `GET https://www.vinted.pl/api/v2/wardrobe/312694449/items?page=1&per_page=96` z tymi ciasteczkami **i nagłówkiem `Accept: application/json`** (bez niego jest 403). Zwraca listę ogłoszeń: `id`, `title`, `price.amount`, `url` i `photos[]` (11–19 zdjęć na parę, URL-e `images1.vinted.net/.../f800/...`). Pole `description` jest tu **puste**.
3. Opis: endpoint `/api/v2/items/{id}/details` zwraca 403. Opis da się wyciągnąć ze strony HTML ogłoszenia (`item.url`) z bloku JSON-LD (`"description":"…"`). Dla ok. 4 z 27 ogłoszeń w tym miejscu jest tylko odwołanie RSC (np. `$ff`, `$f9`, `$11b`) zamiast tekstu. Pełny tekst jest w innym miejscu tego samego payloadu i trzeba go rozwiązać. Dotyczy to m.in. Black Crows Serpo, Kastle RX11, Kastle RX9, Fischer RC One GT 78 152 cm i Salomon Addikt Pro 170 cm. Uwaga na kodowanie: tekst jest escapowany w JSON wewnątrz JS, polskie znaki muszą przejść poprawnie.
4. Między żądaniami trzeba robić pauzę (ok. 1 s), żeby nie wywołać blokady.

### Struktura opisów
Opisy mają powtarzalny układ (pisał je Kacper):
- pierwsza linia `***Z uwagi na duże gabaryty… wysyłki***` → **usuwamy**;
- nazwa modelu / `Model: …`;
- `Długość: 161 cm`, `Promień skrętu: 14,2 m`, `Taliowanie: 126/76/110 mm` lub `Talia: 70 mm` / `W: 71 mm`, opcjonalnie `Sezon: 2023/2024`, `Wiązania: …`, `Profil: …`, `Technologie: …`;
- `Stan: …` (akapit);
- `Opis modelu: …` (akapit lub dwa, często z poziomem i informacją „damskie”);
- końcówki do **usunięcia**: „Mile widziany odbiór osobisty w Lublinie. Możliwa wysyłka…”, „Zapraszam do odwiedzenia mojego profilu…”, „Zapraszam do kontaktu, możliwa wysyłka lub odbiór osobisty w Lublinie.”. Informację „odbiór osobisty w Lublinie lub wysyłka” pokazujemy **raz**, globalnie na stronie.

Parametry (długość, promień, talia, sezon, wiązania) parsujemy do osobnych pól i pokazujemy jako czytelną specyfikację. Akapity „Stan” i „Opis modelu” pokazujemy jako tekst.

### Zdjęcia
Wszystkie zdjęcia każdej pary są **pobierane do repozytorium** (nie hotlinkujemy Vinted, bo linki wygasają po sprzedaży lub usunięciu ogłoszenia). Do builder'a należy wybór rozmiarów, np. miniatura na listę i duże zdjęcie do galerii, oraz format i kompresja. Strona ma się szybko ładować na telefonie.

## 4. Filtry (nad listą nart)

Filtry są **nad listą**, nie w bocznej kolumnie (decyzja Kacpra po obejrzeniu szkiców). W obrębie jednej grupy opcje łączą się przez LUB, między grupami przez I. Brak zaznaczenia w grupie oznacza „wszystkie”. Widać licznik wyników. Gdy wyników jest zero, pokazujemy pomocny komunikat i przycisk wyczyszczenia filtrów.

| Grupa | Opcje | Źródło |
|---|---|---|
| Długość | do 155 cm · 156–165 cm · 166 cm i więcej | z parametru długości (168,2 cm → 166+) — **decyzja Kacpra** |
| Poziom | Początkujący i średniozaawansowani · Zaawansowani | z opisu; para „dla średniozaawansowanych i zaawansowanych” należy do **obu** grup — **decyzja Kacpra (2 grupy)** |
| Dla kogo | Damskie · Męskie / uniwersalne | z opisu („damskie”, „narciarek”) plus znajomość modeli — **decyzja Kacpra (tak, dodać)** |
| Charakter skrętu | Krótki (slalomowy) · Średni (uniwersalny) · Długi (gigantowy) | z promienia skrętu, z możliwością ręcznej korekty — **propozycja Claude** (patrz niżej) |
| Cena | zakres od–do w zł (obecnie 550–1450 zł) | z ceny — **decyzja Kacpra** |

**Dlaczego „charakter skrętu” zamiast „gigant / slalom”:** Kacper chciał filtra gigant / slalom. Opisy pokazują jednak, że tylko jedna para jest opisana jako gigantowa (Redster G7), a dwie są bliskie slalomowi (Redster SC). Reszta to narty trasowe, carvingowe i all-mountain. Sam podział gigant / slalom dawałby więc prawie puste wyniki. Promień skrętu jest w każdym opisie, a narciarze go rozumieją. Etykiety zachowują słowa „slalomowy” i „gigantowy”, żeby odpowiadały temu, czego szuka użytkownik. Progi promienia ustala builder (orientacyjnie: krótki < 13 m, długi ≥ 15 m), z ręczną korektą tam, gdzie opis mówi wprost (np. G7 o promieniu 14,2 m jest opisany jako gigantowy → Długi).

### Klasyfikacja i jej weryfikacja
Poziom, „dla kogo” i charakter skrętu wynikają częściowo z interpretacji. Dlatego:
- reguły automatyczne działają w skrypcie importu;
- istnieje plik **ręcznych korekt** (np. `data/overrides.json`, kluczowany id ogłoszenia), który zawsze wygrywa i przetrwa kolejne importy;
- tam, gdzie opis nie podaje poziomu (np. Atomic Cloud C9, Kneissl My Star MC, K2 Disruption STi „dla dobrze jeżdżących”), Claude wpisuje swoją ocenę do korekt;
- **przed pierwszą publikacją** Claude pokazuje Kacprowi tabelę wszystkich par z przypisanymi kategoriami do akceptacji. Przy kolejnych aktualizacjach pokazuje tylko nowe pary.

## 5. Widoki

### Lista
- Nagłówek: krótki, konkretny tytuł i jedno zdanie (liczba par, odbiór w Lublinie lub wysyłka). Bez marketingowego „hero”.
- Pasek filtrów (na telefonie zwarty, np. przewijane „chipy” albo rozwijany panel nad listą; w obu przypadkach pozostaje nad listą).
- Siatka kart. Każda karta: pierwsze zdjęcie, marka i model, długość, cena, najważniejsze cechy (poziom, ewentualnie „damskie”).
- Sortowanie (np. cena rosnąco / malejąco, długość) to decyzja buildera, mile widziane.

### Szczegóły pary
- Galeria wszystkich zdjęć (powiększanie, przesuwanie palcem na telefonie, nawigacja klawiaturą).
- Tytuł, cena, specyfikacja w czytelnej tabeli (długość, promień, taliowanie, sezon, wiązania itd.), akapit „Stan”, akapit „Opis modelu”.
- Wyraźny przycisk „Napisz do mnie” (`mailto:kacper08070605@gmail.com?subject=<tytuł ogłoszenia>`).
- Każda para ma własny adres URL, który da się wkleić na grupę (np. `#/narty/<id>` albo osobna podstrona; wybór należy do buildera). Mile widziane meta Open Graph, żeby link do strony ładnie wyglądał na Facebooku/Messengerze. Przynajmniej dla strony głównej, a dla pojedynczych par, jeśli pozwala na to wybrana technika.

## 6. Jakość UX/UI (wymaganie Kacpra)

Kacper wymaga, żeby strona „przeszła testy najlepszych UX/UI designerów” i **nie wyglądała jak typowa strona z AI**. Wyboru kierunku wizualnego nie dokonał. Pokazane mu szkice (Śnieżny / Nocna jazda / Schronisko) uznał za zbyt podstawowe i zostawił decyzję Claude.

**Kierunek wizualny (decyzja Claude):** spokojny, „produktowy” katalog w duchu dobrych sklepów sprzętu sportowego:
- tło złamana biel, tekst prawie czarny, jeden mocny kolor akcentu (do wyboru przez buildera, bez fioletowo-niebieskich gradientów);
- zdjęcia nart są bohaterem, interfejs je obsługuje i nie konkuruje z nimi;
- typografia z charakterem (np. dobry krój grotesk z Google Fonts), wyraźna hierarchia, liczby (cm, m, zł) czytelne, np. cyfry tabelaryczne;
- bez emoji, bez ozdobnych gradientów, bez ogólnikowych sloganów, bez ikon dla ozdoby.

**Wymagania twarde:**
- mobile-first (większość ruchu przyjdzie z linków na telefonie), cele dotykowe ≥ 44 px, bez poziomego przewijania strony;
- dostępność: kontrast WCAG AA, obsługa klawiaturą, widoczny focus, sensowne `alt` zdjęć, semantyczny HTML;
- szybkość: lazy-loading zdjęć, rozsądne rozmiary plików;
- stan filtrów odzwierciedlony w URL (żeby dało się wysłać link „narty 156–165, zaawansowane”) — mile widziane;
- język interfejsu polski, poprawna odmiana („1 para”, „3 pary”, „5 par”).

## 7. Technika

- Bez frameworka i bez kroku budowania po stronie strony: HTML + CSS + JS plus plik danych JSON. Decyzja Claude: najprostsza rzecz do utrzymania przez kogoś, kto nie jest programistą, i darmowa na GitHub Pages. Builder może wybrać inaczej, jeśli ma ku temu mocny powód.
- Skrypt importu w Pythonie (`python` jest dostępny na maszynie Kacpra, Windows; dostępne są też `git` i `gh`, zalogowane jako `kacper08070605`). Skrypt:
  1. pobiera listę ogłoszeń i opisy,
  2. parsuje parametry i czyści opisy,
  3. stosuje reguły klasyfikacji i plik korekt,
  4. pobiera nowe zdjęcia i usuwa zdjęcia par, których już nie ma,
  5. zapisuje `data/narty.json`,
  6. wypisuje podsumowanie: dodane / usunięte / zmienione pary, ostrzeżenia o nieudanym parsowaniu.
- Pary, których nie ma już w aktywnych ogłoszeniach (sprzedane lub usunięte), znikają ze strony przy aktualizacji.
- Projekt w katalogu `C:\Kurs vibe coding\Projekt strona`, jako repozytorium git wypchnięte do `kacper08070605/narty`, GitHub Pages z gałęzi głównej. Katalog `.superpowers/` (szkice z rozmowy) w `.gitignore`.

## 8. Drobne rozstrzygnięcia (decyzje Claude)
- Długość na granicy przedziałów zaokrąglamy do pełnego centymetra (168,2 → 168, czyli 166+).
- Ogłoszenia zarezerwowane na Vinted zostają na stronie z widoczną etykietą „Zarezerwowane”.
- Globalny tekst o odbiorze: „Odbiór osobisty w Lublinie lub wysyłka — koszt do ustalenia mailowo”.
- Korekty w `overrides.json` są kluczowane id ogłoszenia. Gdy Kacper wystawi parę ponownie (nowe id), skrypt dopasowuje korektę po marce, modelu i długości i ostrzega o tym w podsumowaniu.

## 9. Co zostaje builderowi
- Dokładne progi promienia skrętu i reguły rozpoznawania poziomu / damskich (z ręcznymi korektami).
- Konkretny kolor akcentu, krój pisma, układ karty i galerii (w ramach kierunku z pkt 6).
- Rozmiary i format zdjęć, sortowanie, routing szczegółów.
- Tytuł strony. Propozycja: proste „Narty używane — Lublin” albo podobne, do pokazania Kacprowi.
