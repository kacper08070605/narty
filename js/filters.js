// Czyste funkcje filtrowania, sortowania i stanu w adresie URL (bez DOM).

export const FILTER_GROUPS = [
  {
    key: "dlugosc_przedzial", param: "dlugosc", label: "Długość",
    options: [
      { value: "do155", label: "do 155 cm" },
      { value: "156-165", label: "156–165 cm" },
      { value: "166plus", label: "166 cm i więcej" },
    ],
  },
  {
    key: "poziomy", param: "poziom", label: "Poziom",
    options: [
      { value: "poczatkujacy-sredni", label: "Początkujący i średniozaawansowani" },
      { value: "zaawansowany", label: "Zaawansowani" },
    ],
  },
  {
    key: "dla_kogo", param: "dla", label: "Dla kogo",
    options: [
      { value: "damskie", label: "Damskie" },
      { value: "uniwersalne", label: "Męskie / uniwersalne" },
    ],
  },
  {
    key: "skret", param: "skret", label: "Charakter skrętu",
    options: [
      { value: "krotki", label: "Krótki (slalomowy)" },
      { value: "sredni", label: "Średni (uniwersalny)" },
      { value: "dlugi", label: "Długi (gigantowy)" },
    ],
  },
];

export const SORTS = [
  { value: "cena-rosnaco", label: "Cena: od najniższej" },
  { value: "cena-malejaco", label: "Cena: od najwyższej" },
  { value: "dlugosc", label: "Długość: od najkrótszych" },
];
const DEFAULT_SORT = SORTS[0].value;

export function emptyState() {
  const s = { cenaMin: null, cenaMax: null, sort: DEFAULT_SORT };
  for (const g of FILTER_GROUPS) s[g.key] = [];
  return s;
}

export function matches(item, state) {
  for (const g of FILTER_GROUPS) {
    const wanted = state[g.key];
    if (!wanted || wanted.length === 0) continue;
    const have = [].concat(item[g.key] ?? []);
    if (!have.some((v) => wanted.includes(v))) return false;
  }
  if (state.cenaMin != null && item.cena < state.cenaMin) return false;
  if (state.cenaMax != null && item.cena > state.cenaMax) return false;
  return true;
}

export function applyFilters(items, state) {
  return items.filter((it) => matches(it, state));
}

export function sortItems(items, mode) {
  const by = {
    "cena-rosnaco": (a, b) => a.cena - b.cena,
    "cena-malejaco": (a, b) => b.cena - a.cena,
    dlugosc: (a, b) => (a.dlugosc_cm ?? 0) - (b.dlugosc_cm ?? 0),
  }[mode] ?? ((a, b) => a.cena - b.cena);
  return [...items].sort((a, b) => (a.zarezerwowane ? 1 : 0) - (b.zarezerwowane ? 1 : 0) || by(a, b));
}

export function stateToHash(state) {
  const p = new URLSearchParams();
  for (const g of FILTER_GROUPS) {
    if (state[g.key]?.length) p.set(g.param, state[g.key].join(","));
  }
  if (state.cenaMin != null || state.cenaMax != null) p.set("cena", `${state.cenaMin ?? ""}-${state.cenaMax ?? ""}`);
  if (state.sort && state.sort !== DEFAULT_SORT) p.set("sort", state.sort);
  const q = p.toString();
  return q ? `#/?${q}` : "#/";
}

export function hashToState(hash) {
  const s = emptyState();
  const q = (hash || "").split("?")[1];
  if (!q) return s;
  const p = new URLSearchParams(q);
  for (const g of FILTER_GROUPS) {
    const allowed = g.options.map((o) => o.value);
    const raw = p.get(g.param);
    if (raw) s[g.key] = raw.split(",").filter((v) => allowed.includes(v));
  }
  const cena = p.get("cena");
  if (cena) {
    const [min, max] = cena.split("-").map((v) => (v === "" ? null : Number(v)));
    s.cenaMin = Number.isFinite(min) ? min : null;
    s.cenaMax = Number.isFinite(max) ? max : null;
  }
  const sort = p.get("sort");
  if (SORTS.some((o) => o.value === sort)) s.sort = sort;
  return s;
}

export function activeCount(state) {
  let n = FILTER_GROUPS.reduce((acc, g) => acc + (state[g.key]?.length || 0), 0);
  if (state.cenaMin != null || state.cenaMax != null) n += 1;
  return n;
}

export const EMAIL = "kacper08070605@gmail.com";

export function mailtoHref(ski, pageUrl) {
  const body = `Dzień dobry,\n\npytam o narty: ${ski.tytul}\n${pageUrl}\n\n`;
  return `mailto:${EMAIL}?subject=${encodeURIComponent(ski.tytul)}&body=${encodeURIComponent(body)}`;
}

export function pluralPary(n) {
  if (n === 1) return "1 para";
  const d = n % 10, dd = n % 100;
  if (d >= 2 && d <= 4 && !(dd >= 12 && dd <= 14)) return `${n} pary`;
  return `${n} par`;
}
