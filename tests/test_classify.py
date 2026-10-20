import unittest

from scripts.classify import apply_overrides, gender, length_bucket, levels, turn


class LengthBucketTest(unittest.TestCase):
    def test_buckets(self):
        cases = {155: "do155", 155.4: "do155", 156: "156-165", 165: "156-165", 168.2: "166plus"}
        for cm, expected in cases.items():
            self.assertEqual(length_bucket(cm), expected, cm)


class LevelsTest(unittest.TestCase):
    def test_both(self):
        self.assertEqual(levels("dla narciarzy średniozaawansowanych i zaawansowanych"),
                         ["poczatkujacy-sredni", "zaawansowany"])

    def test_intermediate_only(self):
        self.assertEqual(levels("dla osób średniozaawansowanych, które chcą"), ["poczatkujacy-sredni"])

    def test_good_skiers(self):
        self.assertEqual(levels("Model dla dobrze jeżdżących narciarzy"), ["zaawansowany"])

    def test_unknown(self):
        self.assertEqual(levels("Model odpowiedni do rekreacyjnej jazdy"), [])


class GenderTest(unittest.TestCase):
    def test_women_by_text(self):
        self.assertEqual(gender("lekkie narty damskie", "Atomic Cloud C7"), "damskie")

    def test_women_by_model(self):
        self.assertEqual(gender("", "Kneissl My Star MC"), "damskie")

    def test_unisex(self):
        self.assertEqual(gender("dla narciarzy", "K2 Disruption STi"), "uniwersalne")


class TurnTest(unittest.TestCase):
    def test_cases(self):
        self.assertEqual(turn(14.2, "o charakterystyce gigantowej"), "dlugi")
        self.assertEqual(turn(14.5, "cechy nart slalomowych i gigantowych"), "sredni")
        self.assertEqual(turn(11.0, "cechy nart slalomowych i gigantowych"), "krotki")
        self.assertEqual(turn(11.9, ""), "krotki")
        self.assertEqual(turn(14.0, ""), "sredni")
        self.assertEqual(turn(16, ""), "dlugi")
        self.assertIsNone(turn(None, ""))


class OverridesTest(unittest.TestCase):
    OVR = {"111": {"match": {"model": "Atomic Cloud C9", "dlugosc_cm": 150}, "levels": ["poczatkujacy-sredni"]}}

    def item(self, id_):
        return {"id": id_, "model": "Atomic Cloud C9", "dlugosc_cm": 150, "poziomy": [], "dla_kogo": "damskie", "skret": "krotki"}

    def test_override_by_id(self):
        out, warn = apply_overrides(self.item(111), self.OVR)
        self.assertEqual(out["poziomy"], ["poczatkujacy-sredni"])
        self.assertIsNone(warn)

    def test_override_relisted(self):
        out, warn = apply_overrides(self.item(222), self.OVR)
        self.assertEqual(out["poziomy"], ["poczatkujacy-sredni"])
        self.assertIn("111 -> 222", warn)

    def test_no_override(self):
        it = self.item(333)
        it["model"] = "Inny"
        out, warn = apply_overrides(it, self.OVR)
        self.assertEqual(out["poziomy"], [])
        self.assertIsNone(warn)


if __name__ == "__main__":
    unittest.main()
