"""Czyste funkcje przypisujące narty do kategorii filtrów."""
import re

WOMEN_MODELS = ("cloud", "flair", "belle", "my star")
SHORT_TURN_MAX_M = 13   # promień < 13 m -> krótki skręt
LONG_TURN_MIN_M = 15    # promień >= 15 m -> długi skręt

# klucz w overrides.json -> pole rekordu
_OVERRIDE_FIELDS = {"levels": "poziomy", "gender": "dla_kogo", "turn": "skret"}


def length_bucket(cm: float) -> str:
    cm = round(cm)
    if cm <= 155:
        return "do155"
    if cm <= 165:
        return "156-165"
    return "166plus"


def levels(opis: str) -> list[str]:
    t = opis.lower()
    out = []
    if "początkując" in t or "średniozaawansowan" in t:
        out.append("poczatkujacy-sredni")
    if re.search(r"(?<!średnio)zaawansowan", t) or "dobrze jeżdżąc" in t:
        out.append("zaawansowany")
    return out


def gender(opis: str, model: str) -> str:
    t = opis.lower()
    if "damsk" in t or re.search(r"narciar(ek|ki|ka)\b", t):
        return "damskie"
    if any(w in (model or "").lower() for w in WOMEN_MODELS):
        return "damskie"
    return "uniwersalne"


def turn(promien_m: float | None, opis: str) -> str | None:
    t = opis.lower()
    giant, slalom = "gigantow" in t, "slalomow" in t
    if giant and not slalom:
        return "dlugi"
    if slalom and not giant:
        return "krotki"
    if promien_m is None:
        return None
    if promien_m < SHORT_TURN_MAX_M:
        return "krotki"
    if promien_m >= LONG_TURN_MIN_M:
        return "dlugi"
    return "sredni"


def apply_overrides(item: dict, overrides: dict) -> tuple[dict, str | None]:
    key, warning = str(item["id"]), None
    ovr = overrides.get(key)
    if ovr is None:
        model = (item.get("model") or "").lower()
        for old_id, cand in overrides.items():
            m = cand.get("match", {})
            if (m.get("model") or "").lower() == model and m.get("dlugosc_cm") == item.get("dlugosc_cm"):
                ovr, warning = cand, f"korekta dopasowana po modelu: {old_id} -> {key}"
                break
    if ovr is None:
        return item, None
    out = dict(item)
    for src, dst in _OVERRIDE_FIELDS.items():
        if src in ovr:
            out[dst] = ovr[src]
    return out, warning
