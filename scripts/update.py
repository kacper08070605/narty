"""Import ogłoszeń z Vinted do data/narty.json i img/.

Użycie: python scripts/update.py
"""
import io
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.classify import apply_overrides, gender, length_bucket, levels, turn
from scripts.parse import clean_description, extract_description, parse_fields

USER_ID = 312694449
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "narty.json"
OVERRIDES = ROOT / "data" / "overrides.json"
IMG = ROOT / "img"
THUMB_W = 480
LARGE_MAX = 1600


KNOWN_BRANDS = ("Black Crows", "Atomic", "Fischer", "K2", "Kästle", "Völkl", "Salomon", "Nordica", "Blizzard",
                "Kneissl", "Rossignol", "Head", "Elan", "Dynastar", "Stöckli", "Augment", "Dynafit")


def brand_of(model: str, vinted_brand: str | None) -> str:
    """Marka z nazwy modelu w opisie (Vinted bywa błędny), w ostateczności pole marki z Vinted."""
    low = model.lower()
    for b in KNOWN_BRANDS:
        if low.startswith(b.lower() + " "):
            return b
    return vinted_brand or model.split()[0]


def is_active(raw: dict) -> bool:
    return not (raw.get("is_closed") or raw.get("is_hidden") or raw.get("is_draft"))


def build_item(raw: dict, html: str, overrides: dict) -> tuple[dict, list[str]]:
    warnings = []
    id_ = raw["id"]
    title = raw["title"].strip()
    desc = extract_description(html)
    if desc is None:
        warnings.append(f"{title}: nie udało się odczytać opisu")
        desc = ""
    f = parse_fields(clean_description(desc))
    if f["dlugosc_cm"] is None:
        warnings.append(f"{title}: brak długości w opisie")
    model = f["model"] or title.removeprefix("Narty ").strip()
    item = {
        "id": id_,
        "tytul": title,
        "cena": round(float(raw["price"]["amount"])),
        "zarezerwowane": bool(raw.get("is_reserved")),
        "stan_ogolny": raw.get("status") if isinstance(raw.get("status"), str) else None,
        "marka": brand_of(model, raw.get("brand") if isinstance(raw.get("brand"), str) else None),
        "model": model,
        "dlugosc_cm": f["dlugosc_cm"],
        "promien_m": f["promien_m"],
        "taliowanie": f["taliowanie"],
        "talia_mm": f["talia_mm"],
        "sezon": f["sezon"],
        "inne": [list(kv) for kv in f["inne"]],
        "stan": f["stan"],
        "opis_modelu": f["opis_modelu"],
        "dlugosc_przedzial": length_bucket(f["dlugosc_cm"]) if f["dlugosc_cm"] else None,
        "poziomy": levels(f["opis_modelu"]),
        "dla_kogo": gender(f["opis_modelu"], model),
        "skret": turn(f["promien_m"], f["opis_modelu"]),
        "zdjecia": [{"s": f"img/{id_}/{n}-s.webp", "l": f"img/{id_}/{n}-l.webp"}
                    for n in range(1, len(raw.get("photos", [])) + 1)],
    }
    item, ovr_warning = apply_overrides(item, overrides)
    if ovr_warning:
        warnings.append(f"{title}: {ovr_warning}")
    if not item["poziomy"]:
        warnings.append(f"{title}: brak poziomu w opisie — dodaj korektę w data/overrides.json")
    return item, warnings


def save_photo(data: bytes, dest_dir: Path, n: int) -> None:
    dest_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(data)) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        large = im.copy()
        large.thumbnail((LARGE_MAX, LARGE_MAX), Image.LANCZOS)
        large.save(dest_dir / f"{n}-l.webp", "WEBP", quality=80, method=6)
        h = round(im.height * THUMB_W / im.width)
        im.resize((THUMB_W, h), Image.LANCZOS).save(dest_dir / f"{n}-s.webp", "WEBP", quality=78, method=6)


def sync_photos(items: list[dict], img_root: Path) -> None:
    keep = {str(it["id"]) for it in items}
    if not img_root.exists():
        return
    for d in img_root.iterdir():
        if d.is_dir() and d.name not in keep:
            shutil.rmtree(d)


def write_og_image(items: list[dict], img_root: Path) -> None:
    """Podgląd linku (Open Graph): pierwsze zdjęcia do 4 par obok siebie, 1200×630."""
    W, H, n = 1200, 630, 4
    canvas = Image.new("RGB", (W, H), (236, 235, 231))
    tiles = [it for it in items if it.get("zdjecia")][:n]
    for k, it in enumerate(tiles):
        src = img_root / Path(it["zdjecia"][0]["l"]).relative_to("img")
        with Image.open(src) as im:
            canvas.paste(ImageOps.fit(im.convert("RGB"), (W // n, H), Image.LANCZOS), (k * W // n, 0))
    canvas.save(img_root / "og.jpg", "JPEG", quality=85, optimize=True)


def _load_json(path: Path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def main(argv=None) -> int:
    from scripts.vinted import Client, VintedBlocked

    overrides = _load_json(OVERRIDES, {})
    previous = {it["id"]: it for it in _load_json(DATA, {"narty": []})["narty"]}
    try:
        client = Client()
        raws = [r for r in client.wardrobe(USER_ID) if is_active(r)]
    except VintedBlocked as e:
        print(e, file=sys.stderr)
        return 1

    items, warnings = [], []
    for i, raw in enumerate(raws, 1):
        print(f"[{i}/{len(raws)}] {raw['title']}")
        item, w = build_item(raw, client.item_html(raw["url"]), overrides)
        warnings += w
        for n, photo in enumerate(raw.get("photos", []), 1):
            dest = IMG / str(item["id"])
            if not (dest / f"{n}-l.webp").exists():
                save_photo(client.get_bytes(photo.get("full_size_url") or photo["url"]), dest, n)
        items.append(item)

    items.sort(key=lambda it: (it["cena"], it["tytul"]))
    sync_photos(items, IMG)
    write_og_image(items, IMG)
    DATA.parent.mkdir(exist_ok=True)
    if not OVERRIDES.exists():
        OVERRIDES.write_text("{}\n", encoding="utf-8")
    DATA.write_text(json.dumps({"zaktualizowano": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                                "narty": items}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    current = {it["id"]: it for it in items}
    added = [current[k]["tytul"] for k in current.keys() - previous.keys()]
    removed = [previous[k]["tytul"] for k in previous.keys() - current.keys()]
    repriced = [f"{it['tytul']}: {previous[k]['cena']} → {it['cena']} zł"
                for k, it in current.items() if k in previous and previous[k]["cena"] != it["cena"]]
    print(f"\nGotowe: {len(items)} par.")
    for label, rows in (("Dodane", added), ("Usunięte", removed), ("Zmiana ceny", repriced), ("Ostrzeżenia", warnings)):
        if rows:
            print(f"{label} ({len(rows)}):")
            for r in rows:
                print("  -", r)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
