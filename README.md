# Narty używane · Lublin

Katalog używanych nart Kacpra, publikowany na GitHub Pages:
https://kacper08070605.github.io/narty/

Treść (zdjęcia, opisy, ceny) pochodzi z ogłoszeń na Vinted i jest importowana skryptem.
Zdjęcia są przechowywane w repozytorium (`img/`), dane w `data/narty.json`.

## Aktualizacja oferty

```
python scripts/update.py              # pobiera ogłoszenia, zdjęcia, zapisuje data/narty.json
python scripts/review_table.py --new  # tabela kategorii nowych par do sprawdzenia
git add -A && git commit -m "Aktualizacja oferty" && git push
```

Ręczne korekty kategorii (poziom, dla kogo, charakter skrętu) wpisuje się w `data/overrides.json`.

## Testy

```
python -m unittest discover -s tests -t . -v
node --test tests/filters.test.mjs
```
