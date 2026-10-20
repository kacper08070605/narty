"""Tabela kategorii do sprawdzenia przez Kacpra.

Użycie: python scripts/review_table.py [--new]
  --new  tylko pary, których nie było w ostatnim commicie data/narty.json
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LABELS = {
    "do155": "do 155 cm", "156-165": "156–165 cm", "166plus": "166 cm i więcej",
    "poczatkujacy-sredni": "Początkujący i średniozaawansowani", "zaawansowany": "Zaawansowani",
    "damskie": "Damskie", "uniwersalne": "Męskie / uniwersalne",
    "krotki": "Krótki (slalomowy)", "sredni": "Średni (uniwersalny)", "dlugi": "Długi (gigantowy)",
}


def _num(x) -> str:
    return f"{x:g}".replace(".", ",")


def markdown_table(items: list[dict], overrides: dict) -> str:
    rows = ["| Para | cm | Długość | Poziom | Dla kogo | Skręt | Źródło |", "|---|---|---|---|---|---|---|"]
    for it in items:
        turn = "—"
        if it["skret"]:
            turn = LABELS[it["skret"]] + (f", R {_num(it['promien_m'])} m" if it["promien_m"] else "")
        rows.append("| " + " | ".join([
            it["tytul"],
            _num(it["dlugosc_cm"]) if it["dlugosc_cm"] else "—",
            LABELS.get(it["dlugosc_przedzial"], "—"),
            ", ".join(LABELS[p] for p in it["poziomy"]) or "—",
            LABELS[it["dla_kogo"]],
            turn,
            "korekta" if str(it["id"]) in overrides else "auto",
        ]) + " |")
    return "\n".join(rows)


def new_items(current: list[dict], previous: list[dict]) -> list[dict]:
    old = {it["id"] for it in previous}
    return [it for it in current if it["id"] not in old]


def main(argv) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    items = json.loads((ROOT / "data" / "narty.json").read_text(encoding="utf-8"))["narty"]
    ovr_path = ROOT / "data" / "overrides.json"
    overrides = json.loads(ovr_path.read_text(encoding="utf-8")) if ovr_path.exists() else {}
    if "--new" in argv:
        try:
            prev = subprocess.run(["git", "show", "HEAD:data/narty.json"], cwd=ROOT, capture_output=True,
                                  check=True).stdout.decode("utf-8")
            items = new_items(items, json.loads(prev)["narty"])
        except subprocess.CalledProcessError:
            pass
        if not items:
            print("Brak nowych par.")
            return 0
    print(markdown_table(items, overrides))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
