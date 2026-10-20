import unittest
from pathlib import Path

from scripts.parse import clean_description, extract_description, parse_fields

FIX = Path(__file__).parent / "fixtures"


def load(name):
    return (FIX / name).read_text(encoding="utf-8")


class ExtractDescriptionTest(unittest.TestCase):
    def test_inline_description(self):
        d = extract_description(load("item_inline.html"))
        self.assertIn("Atomic Redster G7", d)
        self.assertIn("Długość: 161 cm", d)

    def test_ref_description(self):
        d = extract_description(load("item_ref.html"))
        self.assertTrue(d.startswith("***Z uwagi"), d[:40])
        self.assertIn("Model: Black Crows Serpo", d)


class CleanDescriptionTest(unittest.TestCase):
    def test_clean_removes_boilerplate(self):
        raw = (
            "***Z uwagi na duże gabaryty przedmiotu nie wysyłam go przez Vinted. Napisz do mnie***\n\n"
            "Model: X\nDługość: 150 cm\n\nStan: dobry.\n\n"
            "Mile widziany odbiór osobisty w Lublinie. Możliwa wysyłka – zapraszam do kontaktu.\n"
            "Zapraszam do odwiedzenia mojego profilu, gdzie znajduje się duży wybór nart używanych.\n"
            "Zapraszam do kontaktu, możliwa wysyłka lub odbiór osobisty w Lublinie."
        )
        c = clean_description(raw)
        for word in ("Vinted", "Mile widziany", "Zapraszam"):
            self.assertNotIn(word, c)
        self.assertTrue(c.startswith("Model: X"))


class ParseFieldsTest(unittest.TestCase):
    def test_fields_g7(self):
        f = parse_fields(clean_description(extract_description(load("item_inline.html"))))
        self.assertEqual(f["dlugosc_cm"], 161)
        self.assertEqual(f["promien_m"], 14.2)
        self.assertEqual(f["talia_mm"], 70)
        self.assertEqual(f["model"], "Atomic Redster G7")
        self.assertTrue(f["stan"].startswith("Narty w dobrym stanie"))
        self.assertIn("charakterystyce gigantowej", f["opis_modelu"])

    def test_fields_taliowanie_triple(self):
        f = parse_fields("K2 Disruption RX\n\nDługość: 149 cm\nTaliowanie: 126/76/110 mm\nSezon: 2022/2023\n\nStan: ok\n\nOpis modelu: x")
        self.assertEqual(f["talia_mm"], 76)
        self.assertEqual(f["taliowanie"], "126/76/110 mm")
        self.assertEqual(f["sezon"], "2022/2023")

    def test_fields_w_prefix(self):
        f = parse_fields("Model: Atomic Redster SC\nDługość: 147 cm\nPromień skrętu: 11.9 m\nTaliowanie: W 72 mm\n\nStan: ok")
        self.assertEqual(f["talia_mm"], 72)
        self.assertEqual(f["promien_m"], 11.9)
        self.assertEqual(f["model"], "Atomic Redster SC")

    def test_fields_inne(self):
        f = parse_fields("Model: Kneissl My Star MC\nDługość: 164 cm\nWiązania: Tyrolia 10 SLR GripWalk\n\nStan: ok")
        self.assertIn(("Wiązania", "Tyrolia 10 SLR GripWalk"), f["inne"])

    def test_opis_modelu_multi_paragraph(self):
        f = parse_fields("Model: A\n\nStan: ok\n\nOpis modelu:\n\nPierwszy akapit.\n\nDrugi akapit.")
        self.assertEqual(f["opis_modelu"], "Pierwszy akapit.\n\nDrugi akapit.")


if __name__ == "__main__":
    unittest.main()
