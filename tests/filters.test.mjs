import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyFilters, emptyState, hashToState, matches, pluralPary, sortItems, stateToHash, FILTER_GROUPS,
} from "../js/filters.js";

const ski = (over = {}) => ({
  id: 1, cena: 800, dlugosc_cm: 160, dlugosc_przedzial: "156-165",
  poziomy: ["poczatkujacy-sredni"], dla_kogo: "uniwersalne", skret: "sredni", ...over,
});

test("para z dwoma poziomami pasuje do obu filtrów poziomu", () => {
  const s = ski({ poziomy: ["poczatkujacy-sredni", "zaawansowany"] });
  assert.ok(matches(s, { ...emptyState(), poziomy: ["zaawansowany"] }));
  assert.ok(matches(s, { ...emptyState(), poziomy: ["poczatkujacy-sredni"] }));
});

test("opcje w grupie łączą się przez LUB", () => {
  const st = { ...emptyState(), dlugosc_przedzial: ["do155", "166plus"] };
  assert.ok(matches(ski({ dlugosc_przedzial: "do155" }), st));
  assert.ok(matches(ski({ dlugosc_przedzial: "166plus" }), st));
  assert.ok(!matches(ski({ dlugosc_przedzial: "156-165" }), st));
});

test("grupy łączą się przez I", () => {
  const st = { ...emptyState(), dla_kogo: ["damskie"], skret: ["sredni"] };
  assert.ok(!matches(ski(), st));
  assert.ok(matches(ski({ dla_kogo: "damskie" }), st));
});

test("pusty stan przepuszcza wszystko", () => {
  assert.equal(applyFilters([ski(), ski({ id: 2 })], emptyState()).length, 2);
});

test("zakres cen", () => {
  const st = { ...emptyState(), cenaMin: 600, cenaMax: 900 };
  assert.ok(!matches(ski({ cena: 950 }), st));
  assert.ok(matches(ski({ cena: 900 }), st));
  assert.ok(!matches(ski({ cena: 550 }), st));
});

test("brak charakteru skrętu nie pasuje do filtra skrętu", () => {
  assert.ok(!matches(ski({ skret: null }), { ...emptyState(), skret: ["krotki"] }));
});

test("hash round-trip", () => {
  const s = { ...emptyState(), dlugosc_przedzial: ["156-165"], poziomy: ["zaawansowany"], cenaMin: 600, cenaMax: 1000, sort: "cena-malejaco" };
  assert.deepEqual(hashToState(stateToHash(s)), s);
});

test("pusty stan daje pusty hash, nieznane wartości są ignorowane", () => {
  assert.equal(stateToHash(emptyState()), "#/");
  assert.deepEqual(hashToState("#/?dlugosc=xxx&poziom=zaawansowany"), { ...emptyState(), poziomy: ["zaawansowany"] });
  assert.deepEqual(hashToState(""), emptyState());
});

test("sortowanie", () => {
  const items = [ski({ id: 1, cena: 900, dlugosc_cm: 150 }), ski({ id: 2, cena: 700, dlugosc_cm: 170 })];
  assert.deepEqual(sortItems(items, "cena-rosnaco").map((i) => i.id), [2, 1]);
  assert.deepEqual(sortItems(items, "cena-malejaco").map((i) => i.id), [1, 2]);
  assert.deepEqual(sortItems(items, "dlugosc").map((i) => i.id), [1, 2]);
});

test("odmiana par", () => {
  const cases = { 0: "0 par", 1: "1 para", 2: "2 pary", 4: "4 pary", 5: "5 par", 12: "12 par", 13: "13 par", 22: "22 pary", 25: "25 par", 30: "30 par", 112: "112 par" };
  for (const [n, txt] of Object.entries(cases)) assert.equal(pluralPary(Number(n)), txt);
});

test("grupy filtrów mają polskie etykiety", () => {
  assert.deepEqual(FILTER_GROUPS.map((g) => g.label), ["Długość", "Poziom", "Dla kogo", "Charakter skrętu"]);
  assert.equal(FILTER_GROUPS[0].options[2].label, "166 cm i więcej");
});
