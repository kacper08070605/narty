import unittest

from scripts.review_table import markdown_table, new_items

A = {"id": 1, "tytul": "Narty A 150 cm", "dlugosc_cm": 150, "dlugosc_przedzial": "do155",
     "poziomy": ["poczatkujacy-sredni", "zaawansowany"], "dla_kogo": "damskie", "skret": "krotki", "promien_m": 11.0}
B = {"id": 2, "tytul": "Narty B 170 cm", "dlugosc_cm": 170, "dlugosc_przedzial": "166plus",
     "poziomy": [], "dla_kogo": "uniwersalne", "skret": None, "promien_m": None}


class ReviewTableTest(unittest.TestCase):
    def test_row_content(self):
        t = markdown_table([A, B], overrides={"2": {}})
        lines = t.splitlines()
        self.assertEqual(len(lines), 4)  # nagłówek, separator, 2 wiersze
        self.assertIn("| Narty A 150 cm | 150 | do 155 cm | Początkujący i średniozaawansowani, Zaawansowani | Damskie | Krótki (slalomowy), R 11 m | auto |", t)
        self.assertIn("| Narty B 170 cm | 170 | 166 cm i więcej | — | Męskie / uniwersalne | — | korekta |", t)

    def test_new_items(self):
        self.assertEqual([i["id"] for i in new_items([A, B], [A])], [2])
        self.assertEqual(new_items([A], [A]), [])


if __name__ == "__main__":
    unittest.main()
