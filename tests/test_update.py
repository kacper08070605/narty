import tempfile
import unittest
from pathlib import Path

from PIL import Image

from scripts.update import build_item, download_photos, import_guard, is_active, save_photo, sync_photos, write_og_image

FIX = Path(__file__).parent / "fixtures"

RAW_G7 = {
    "id": 10445590864,
    "title": "Narty Atomic Redster G7 161 cm",
    "price": {"amount": "870.0"},
    "is_reserved": False,
    "photos": [{"url": "u1"}, {"url": "u2"}],
    "brand": "Atomic",
    "status": "Bardzo dobry",
}


class BuildItemTest(unittest.TestCase):
    def test_build_item_g7(self):
        html = (FIX / "item_inline.html").read_text(encoding="utf-8")
        item, warnings = build_item(RAW_G7, html, {})
        self.assertEqual(item["cena"], 870)
        self.assertEqual(item["marka"], "Atomic")
        self.assertEqual(item["dlugosc_przedzial"], "156-165")
        self.assertEqual(item["skret"], "dlugi")
        self.assertEqual(item["poziomy"], ["poczatkujacy-sredni", "zaawansowany"])
        self.assertEqual(item["dla_kogo"], "uniwersalne")
        self.assertFalse(item["zarezerwowane"])
        self.assertEqual(item["zdjecia"][1]["s"], "img/10445590864/2-s.webp")
        self.assertEqual(item["zdjecia"][1]["l"], "img/10445590864/2-l.webp")
        for field in ("stan", "opis_modelu"):
            self.assertNotIn("Vinted", item[field])
        self.assertEqual(warnings, [])
        self.assertEqual(item["stan_ogolny"], "Bardzo dobry")

    def test_missing_level_warns(self):
        html = (FIX / "item_inline.html").read_text(encoding="utf-8")
        html = html.replace("narciarzy \\u015bredniozaawansowanych i zaawansowanych", "narciarzy")
        html = html.replace("narciarzy średniozaawansowanych i zaawansowanych", "narciarzy")
        item, warnings = build_item(RAW_G7, html, {})
        self.assertEqual(item["poziomy"], [])
        self.assertTrue(any("poziom" in w for w in warnings), warnings)


class BrandTest(unittest.TestCase):
    def test_brand_from_model_beats_wrong_vinted_brand(self):
        from scripts.update import brand_of
        self.assertEqual(brand_of("K2 Disruption Speed RX", "Rossignol"), "K2")
        self.assertEqual(brand_of("Black Crows Serpo", None), "Black Crows")
        self.assertEqual(brand_of("Völkl Flair 72", "Volkl"), "Völkl")
        self.assertEqual(brand_of("Nieznana Marka X", "Atomic"), "Atomic")


class GuardTest(unittest.TestCase):
    def test_empty_response_aborts(self):
        self.assertIsNotNone(import_guard([], previous_count=30))

    def test_sharp_drop_aborts(self):
        self.assertIsNotNone(import_guard([{}] * 10, previous_count=30))

    def test_normal_change_passes(self):
        self.assertIsNone(import_guard([{}] * 28, previous_count=30))
        self.assertIsNone(import_guard([{}] * 5, previous_count=0))


def _jpeg(color):
    import io
    buf = io.BytesIO()
    Image.new("RGB", (60, 80), color).save(buf, "JPEG")
    return buf.getvalue()


class DownloadPhotosTest(unittest.TestCase):
    def test_skips_unchanged_and_refreshes_changed(self):
        calls = []
        def get(url):
            calls.append(url)
            return _jpeg("red")
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "1"
            photos = [{"id": 11, "url": "a"}, {"id": 12, "url": "b"}]
            download_photos(photos, dest, get)
            self.assertEqual(len(calls), 2)
            download_photos(photos, dest, get)
            self.assertEqual(len(calls), 2)  # bez zmian, nic nie pobiera
            download_photos([{"id": 13, "url": "c"}], dest, get)
            self.assertEqual(calls[-1], "c")
            self.assertFalse((dest / "2-l.webp").exists())  # zdjęcie usunięte z ogłoszenia znika
            self.assertTrue((dest / "1-l.webp").exists())


class ActiveTest(unittest.TestCase):
    def test_closed_and_hidden_are_inactive(self):
        self.assertTrue(is_active({"is_closed": False, "is_hidden": False, "is_draft": False}))
        self.assertFalse(is_active({"is_closed": True}))
        self.assertFalse(is_active({"is_hidden": True}))
        self.assertFalse(is_active({"is_draft": True}))


class PhotosTest(unittest.TestCase):
    def test_sync_photos_removes_sold(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "1").mkdir()
            (root / "2").mkdir()
            sync_photos([{"id": 1}], root)
            self.assertTrue((root / "1").exists())
            self.assertFalse((root / "2").exists())

    def test_save_photo_sizes(self):
        import io
        buf = io.BytesIO()
        Image.new("RGB", (2000, 1000), "red").save(buf, "JPEG")
        with tempfile.TemporaryDirectory() as d:
            save_photo(buf.getvalue(), Path(d), 1)
            with Image.open(Path(d) / "1-s.webp") as s, Image.open(Path(d) / "1-l.webp") as l:
                self.assertEqual(s.width, 480)
                self.assertEqual(l.width, 1600)

    def test_save_photo_no_upscale(self):
        import io
        buf = io.BytesIO()
        Image.new("RGB", (600, 800), "blue").save(buf, "JPEG")
        with tempfile.TemporaryDirectory() as d:
            save_photo(buf.getvalue(), Path(d), 1)
            with Image.open(Path(d) / "1-l.webp") as l:
                self.assertEqual(l.size, (600, 800))

    def test_og_image_collage(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            items = []
            for i in (1, 2, 3, 4, 5):
                (root / str(i)).mkdir()
                Image.new("RGB", (600, 800), "white").save(root / str(i) / "1-l.webp", "WEBP")
                items.append({"id": i, "zdjecia": [{"l": f"img/{i}/1-l.webp"}]})
            write_og_image(items, root)
            with Image.open(root / "og.jpg") as og:
                self.assertEqual(og.size, (1200, 630))


if __name__ == "__main__":
    unittest.main()
