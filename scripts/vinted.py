"""Dostęp sieciowy do Vinted: sesja z anonimowymi ciasteczkami, lista ogłoszeń, strony ogłoszeń."""
import http.cookiejar
import json
import time
import urllib.error
import urllib.request

BASE = "https://www.vinted.pl"
DEFAULT_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")


class VintedBlocked(RuntimeError):
    pass


class Client:
    def __init__(self, user_agent: str = DEFAULT_UA, delay: float = 2.0):
        self.ua = user_agent
        self.delay = delay
        self._opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self._last = 0.0
        self._get(BASE + "/")  # ustawia anonimowe ciasteczka sesji

    def _get(self, url: str, accept: str = "text/html") -> bytes:
        # 429 = Vinted ogranicza tempo; czekamy coraz dłużej i próbujemy ponownie
        for pause in (30, 90, 180):
            try:
                return self._get_once(url, accept)
            except VintedBlocked as e:
                if "(429)" not in str(e):
                    raise
                print(f"  Vinted prosi o wolniejsze tempo, czekam {pause} s…")
                time.sleep(pause)
        return self._get_once(url, accept)

    def _get_once(self, url: str, accept: str) -> bytes:
        wait = self.delay - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        req = urllib.request.Request(url, headers={"User-Agent": self.ua, "Accept": accept})
        try:
            with self._opener.open(req, timeout=60) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code in (401, 403, 429):
                raise VintedBlocked(f"Vinted odmówił dostępu ({e.code}) dla {url}. "
                                    "Spróbuj ponownie za kilka minut.") from e
            raise
        finally:
            self._last = time.monotonic()

    def wardrobe(self, user_id: int) -> list[dict]:
        items, page, total = [], 1, 1
        while page <= total:
            url = f"{BASE}/api/v2/wardrobe/{user_id}/items?page={page}&per_page=96&order=relevance"
            data = json.loads(self._get(url, accept="application/json"))
            items += data.get("items", [])
            total = data.get("pagination", {}).get("total_pages", 1)
            page += 1
        return items

    def item_html(self, url: str) -> str:
        return self._get(url).decode("utf-8", errors="replace")

    def get_bytes(self, url: str) -> bytes:
        # zdjęcia idą z CDN, bez pauzy między żądaniami
        req = urllib.request.Request(url, headers={"User-Agent": self.ua, "Accept": "image/*"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read()
