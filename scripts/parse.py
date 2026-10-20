"""Czyste funkcje: wyciąganie opisu ogłoszenia Vinted z HTML i parsowanie jego treści."""
import json
import re

_PUSH = re.compile(r'self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)')
_JSON_STR = r'"((?:[^"\\]|\\.)*)"'
_PRODUCT_DESC = re.compile(r'"@type":"Product".*?"description":' + _JSON_STR, re.S)
_REF = re.compile(r"^\$([0-9a-f]+)$")

_BOILERPLATE_START = (
    "Mile widziany odbiór osobisty",
    "Zapraszam do odwiedzenia mojego profilu",
    "Zapraszam do kontaktu",
)


def decode_flight(html: str) -> str:
    """Skleja fragmenty strumienia RSC (self.__next_f.push) w jeden odkodowany tekst."""
    return "".join(json.loads('"' + chunk + '"') for chunk in _PUSH.findall(html))


def _resolve_ref(stream: str, ref: str) -> str | None:
    m = re.search(r"(?:^|\n)" + ref + r":T([0-9a-f]+),", stream)
    if not m:
        return None
    length = int(m.group(1), 16)
    return stream[m.end():].encode("utf-8")[:length].decode("utf-8", errors="replace")


def extract_description(html: str) -> str | None:
    stream = decode_flight(html)
    m = _PRODUCT_DESC.search(stream)
    if not m:
        return None
    value = json.loads('"' + m.group(1) + '"')
    ref = _REF.match(value)
    if ref:
        return _resolve_ref(stream, ref.group(1))
    return value


def clean_description(text: str) -> str:
    text = re.sub(r"\*\*\*.*?\*\*\*", "", text, flags=re.S)
    lines = [ln.strip() for ln in text.replace("\r", "").split("\n")]
    lines = [ln for ln in lines if not ln.startswith(_BOILERPLATE_START)]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def _num(s: str) -> float:
    return float(s.replace(",", "."))


def _model_name(text: str) -> str:
    """Nazwa modelu bez dopisków po myślniku, np. „Swiss Massiv – Handmade in Switzerland”."""
    return re.split(r"\s+[–—-]\s+", text)[0].strip()


def parse_fields(text: str) -> dict:
    f = {"model": None, "dlugosc_cm": None, "promien_m": None, "taliowanie": None,
         "talia_mm": None, "sezon": None, "inne": [], "stan": "", "opis_modelu": ""}
    head, _, rest = text.partition("Stan:")
    stan, _, opis = rest.partition("Opis modelu:")
    f["stan"] = stan.strip()
    f["opis_modelu"] = opis.strip()

    for line in head.split("\n"):
        line = line.strip()
        if not line:
            continue
        key, sep, val = line.partition(":")
        key, val = key.strip(), val.strip()
        if not sep:
            if f["model"] is None:
                f["model"] = _model_name(line)
            continue
        low = key.lower()
        if low == "model":
            f["model"] = _model_name(val)
        elif low.startswith("długość"):
            m = re.search(r"[\d.,]+", val)
            f["dlugosc_cm"] = _num(m.group()) if m else None
        elif low.startswith("promień"):
            m = re.search(r"[\d.,]+", val)
            f["promien_m"] = _num(m.group()) if m else None
        elif low in ("taliowanie", "talia", "w"):
            f["taliowanie"] = val
            nums = re.findall(r"\d+(?:[.,]\d+)?", val)
            if nums:
                f["talia_mm"] = _num(nums[1] if len(nums) == 3 else nums[0])
        elif low == "sezon":
            f["sezon"] = val
        else:
            f["inne"].append((key, val))
    return f
