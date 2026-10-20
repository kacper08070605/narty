import {
  FILTER_GROUPS, SORTS, activeCount, applyFilters, emptyState, hashToState, matches, pluralPary, sortItems, stateToHash,
} from "./filters.js";

const EMAIL = "kacper08070605@gmail.com";
const SITE_TITLE = "Narty używane · Lublin";
const LABELS = Object.fromEntries(FILTER_GROUPS.flatMap((g) => g.options.map((o) => [o.value, o.label])));
function levelTag(poziomy) {
  if (poziomy.length === 2) return "Średni–zaawansowany";
  return { "poczatkujacy-sredni": "Początkujący–średni", zaawansowany: "Zaawansowany" }[poziomy[0]] ?? "";
}

const view = document.getElementById("view");
let skis = [];
let listState = emptyState();
let listScroll = 0;
let panelOpen = false;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => (n == null ? "" : String(n).replace(".", ","));
const zl = (n) => `${n.toLocaleString("pl-PL")} zł`;
const mailto = (ski) => `mailto:${EMAIL}?subject=${encodeURIComponent(ski.tytul)}`;

function stripBrand(model, brand) {
  const b = (brand || "").toLowerCase();
  return b && model.toLowerCase().startsWith(b + " ") ? model.slice(b.length + 1) : model;
}

function specLine(s) {
  return [s.dlugosc_cm && `${fmt(s.dlugosc_cm)} cm`, s.promien_m && `R ${fmt(s.promien_m)} m`, s.talia_mm && `talia ${fmt(s.talia_mm)} mm`]
    .filter(Boolean).join(" · ");
}

function tags(s, { withTurn = false } = {}) {
  const out = [];
  if (s.dla_kogo === "damskie") out.push(`<li class="tag tag--accent">Damskie</li>`);
  if (s.poziomy.length) out.push(`<li class="tag">${levelTag(s.poziomy)}</li>`);
  if (withTurn && s.skret) out.push(`<li class="tag">${LABELS[s.skret]}</li>`);
  return out.join("");
}

/* ---------------- Lista ---------------- */

function optionCount(group, value) {
  const probe = { ...listState, [group.key]: [value] };
  return skis.filter((s) => matches(s, probe)).length;
}

function renderFilters() {
  const n = activeCount(listState);
  const groups = FILTER_GROUPS.map((g) => `
    <fieldset class="fgroup">
      <legend>${g.label}</legend>
      <div class="chips">
        ${g.options.map((o) => {
          const on = listState[g.key].includes(o.value);
          const c = optionCount(g, o.value);
          return `<button type="button" class="chip" data-group="${g.key}" data-value="${o.value}" aria-pressed="${on}" ${!on && c === 0 ? "disabled" : ""}>${o.label}<span class="n num" aria-hidden="true">${c}</span></button>`;
        }).join("")}
      </div>
    </fieldset>`).join("");
  const prices = skis.map((s) => s.cena);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  return `
  <section class="filters" aria-label="Filtry">
    <div class="wrap filters__inner">
      <div class="filters__bar">
        <button type="button" class="filters__toggle" aria-expanded="${panelOpen}" aria-controls="filters-panel">
          Filtry${n ? ` <span class="badge num">${n}</span>` : ""}
        </button>
        <p class="filters__count num" aria-live="polite" id="count"></p>
        <label class="filters__sort">Sortuj
          <select id="sort">${SORTS.map((o) => `<option value="${o.value}" ${o.value === listState.sort ? "selected" : ""}>${o.label}</option>`).join("")}</select>
        </label>
      </div>
      <div class="filters__panel" id="filters-panel" ${panelOpen ? "" : "hidden"}>
        <div class="fgroups">
          ${groups}
          <fieldset class="fgroup">
            <legend>Cena</legend>
            <div class="price">
              <label><input id="cena-min" type="number" inputmode="numeric" min="0" step="10" placeholder="${lo}" value="${listState.cenaMin ?? ""}" aria-label="Cena od"><span class="unit">zł</span></label>
              <span class="dash" aria-hidden="true">–</span>
              <label><input id="cena-max" type="number" inputmode="numeric" min="0" step="10" placeholder="${hi}" value="${listState.cenaMax ?? ""}" aria-label="Cena do"><span class="unit">zł</span></label>
            </div>
          </fieldset>
        </div>
        <button type="button" class="filters__clear" ${n ? "" : "hidden"}>Wyczyść filtry</button>
      </div>
    </div>
  </section>`;
}

function card(s) {
  const img = s.zdjecia[0];
  return `
  <li class="card${s.zarezerwowane ? " is-reserved" : ""}">
    <a class="card__link" href="#/narty/${s.id}">
      <div class="card__media">
        ${img ? `<img src="${img.s}" alt="${esc(s.model)}, ${fmt(s.dlugosc_cm)} cm" loading="lazy" decoding="async" width="480" height="640">` : ""}
        ${s.zarezerwowane ? `<span class="card__badge">Zarezerwowane</span>` : ""}
      </div>
      <div class="card__body">
        <span class="card__brand">${esc(s.marka)}</span>
        <h2 class="card__title">${esc(stripBrand(s.model, s.marka))}</h2>
        <span class="card__price num">${zl(s.cena)}</span>
        <p class="card__specs num">${specLine(s)}</p>
        <ul class="card__tags">${tags(s)}</ul>
      </div>
    </a>
  </li>`;
}

function renderResults() {
  const found = sortItems(applyFilters(skis, listState), listState.sort);
  document.getElementById("count").textContent = found.length === skis.length
    ? `Wszystkie: ${pluralPary(found.length)}`
    : `Pasuje: ${pluralPary(found.length)}`;
  const box = document.getElementById("results");
  box.innerHTML = found.length
    ? `<ul class="grid">${found.map(card).join("")}</ul>`
    : `<div class="empty">
         <h2>Brak nart dla tych filtrów</h2>
         <p>Spróbuj poluzować któryś z warunków — na przykład dopuścić sąsiedni przedział długości.</p>
         <button type="button" class="btn btn--ghost" data-clear>Wyczyść filtry</button>
       </div>`;
}

function renderList() {
  document.title = SITE_TITLE;
  view.innerHTML = `
    <section class="intro wrap">
      <h1>Narty zjazdowe z drugiej ręki</h1>
      <p>W ofercie ${pluralPary(skis.length)}. Każda ma opis stanu i komplet zdjęć. Wybierz długość i poziom — zostaną tylko pasujące.</p>
    </section>
    ${renderFilters()}
    <section class="results wrap" id="results" aria-label="Narty"></section>`;
  renderResults();
}

function setState(next, { rerenderFilters = true } = {}) {
  listState = next;
  const hash = stateToHash(listState);
  if (location.hash !== hash) history.replaceState(null, "", hash);
  if (rerenderFilters) {
    const focusSel = document.activeElement?.dataset?.value
      ? `.chip[data-group="${document.activeElement.dataset.group}"][data-value="${document.activeElement.dataset.value}"]`
      : null;
    document.querySelector(".filters").outerHTML = renderFilters();
    if (focusSel) document.querySelector(focusSel)?.focus();
  }
  renderResults();
}

view.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) {
    const { group, value } = chip.dataset;
    const cur = listState[group];
    setState({ ...listState, [group]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
    return;
  }
  if (e.target.closest(".filters__toggle")) {
    panelOpen = !panelOpen;
    const panel = document.getElementById("filters-panel");
    panel.hidden = !panelOpen;
    e.target.closest(".filters__toggle").setAttribute("aria-expanded", panelOpen);
    return;
  }
  if (e.target.closest(".filters__clear, [data-clear]")) {
    setState({ ...emptyState(), sort: listState.sort });
  }
});

view.addEventListener("change", (e) => {
  if (e.target.id === "sort") setState({ ...listState, sort: e.target.value }, { rerenderFilters: false });
  if (e.target.id === "cena-min" || e.target.id === "cena-max") {
    const v = (id) => { const x = document.getElementById(id).value; return x === "" ? null : Number(x); };
    setState({ ...listState, cenaMin: v("cena-min"), cenaMax: v("cena-max") });
  }
});

/* ---------------- Szczegóły ---------------- */

function paragraphs(text) {
  return text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
}

function renderDetail(s) {
  document.title = `${s.tytul} · ${zl(s.cena)}`;
  const rows = [
    ["Długość", s.dlugosc_cm && `${fmt(s.dlugosc_cm)} cm`],
    ["Promień skrętu", s.promien_m && `${fmt(s.promien_m)} m`],
    ["Taliowanie", s.taliowanie],
    ["Sezon", s.sezon],
    ...s.inne,
    ["Poziom", s.poziomy.length === 2 ? "Średniozaawansowani i zaawansowani" : LABELS[s.poziomy[0]]],
    ["Charakter skrętu", s.skret && LABELS[s.skret]],
    ["Dla kogo", LABELS[s.dla_kogo]],
  ].filter(([, v]) => v);
  const n = s.zdjecia.length;
  view.innerHTML = `
  <article class="detail wrap">
    <a class="back" href="${stateToHash(listState)}"><span aria-hidden="true">←</span> Wszystkie narty</a>
    <div class="detail__layout">
      <section class="gallery" aria-label="Zdjęcia" aria-roledescription="galeria">
        <div class="gallery__stage">
          <div class="gallery__track" tabindex="0" aria-label="Zdjęcia — przewiń w bok lub użyj strzałek">
            ${s.zdjecia.map((z, i) => `<div class="gallery__slide" role="group" aria-label="Zdjęcie ${i + 1} z ${n}"><img src="${z.l}" alt="${esc(s.model)} — zdjęcie ${i + 1} z ${n}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async"></div>`).join("")}
          </div>
          <button type="button" class="gallery__nav gallery__nav--prev" aria-label="Poprzednie zdjęcie"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 3 5 9l6 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
          <button type="button" class="gallery__nav gallery__nav--next" aria-label="Następne zdjęcie"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="m7 3 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
          <span class="gallery__counter num" aria-hidden="true">1 / ${n}</span>
        </div>
        <ul class="gallery__thumbs">
          ${s.zdjecia.map((z, i) => `<li><button type="button" data-i="${i}" aria-label="Pokaż zdjęcie ${i + 1}" ${i ? "" : 'aria-current="true"'}><img src="${z.s}" alt="" loading="lazy" decoding="async"></button></li>`).join("")}
        </ul>
      </section>

      <div class="info">
        <p class="info__brand">${esc(s.marka)}</p>
        <h1 tabindex="-1">${esc(stripBrand(s.tytul.replace(/^Narty\s+/i, ""), s.marka))}</h1>
        <p class="info__price num">${zl(s.cena)}${s.zarezerwowane ? `<span class="info__reserved">Zarezerwowane</span>` : ""}</p>
        <ul class="info__tags">${tags(s, { withTurn: true })}</ul>
        <div class="info__cta">
          <a class="btn btn--primary" href="${mailto(s)}">Napisz do mnie</a>
          <small>Otworzy się e-mail z tematem „${esc(s.tytul)}”. Odbiór w Lublinie lub wysyłka — koszt do ustalenia.</small>
        </div>
        <dl class="specs">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        ${s.stan ? `<section class="prose"><h2>Stan</h2>${paragraphs(s.stan)}</section>` : ""}
        ${s.opis_modelu ? `<section class="prose"><h2>O modelu</h2>${paragraphs(s.opis_modelu)}</section>` : ""}
      </div>
    </div>
  </article>`;
  initGallery(n);
  window.scrollTo(0, 0);
  view.querySelector("h1").focus({ preventScroll: true });
}

function initGallery(n) {
  const track = view.querySelector(".gallery__track");
  const counter = view.querySelector(".gallery__counter");
  const prev = view.querySelector(".gallery__nav--prev");
  const next = view.querySelector(".gallery__nav--next");
  const thumbs = [...view.querySelectorAll(".gallery__thumbs button")];
  let current = 0;
  const go = (i) => {
    i = Math.max(0, Math.min(n - 1, i));
    track.scrollTo({ left: i * track.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const sync = () => {
    const i = Math.round(track.scrollLeft / track.clientWidth);
    current = i;
    counter.textContent = `${i + 1} / ${n}`;
    prev.disabled = i === 0;
    next.disabled = i === n - 1;
    thumbs.forEach((t, k) => t.setAttribute("aria-current", String(k === i)));
    thumbs[i]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  track.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
  prev.addEventListener("click", () => go(current - 1));
  next.addEventListener("click", () => go(current + 1));
  thumbs.forEach((t) => t.addEventListener("click", () => go(Number(t.dataset.i))));
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
  });
  sync();
}

function renderNotFound() {
  document.title = SITE_TITLE;
  view.innerHTML = `
  <section class="wrap empty">
    <h2>Tej pary już nie ma</h2>
    <p>Prawdopodobnie została sprzedana. Zobacz pozostałe narty.</p>
    <a class="btn btn--ghost" href="#/">Wszystkie narty</a>
  </section>`;
}

/* ---------------- Routing ---------------- */

let lastRoute = "list";

function route() {
  const m = location.hash.match(/^#\/narty\/(\d+)/);
  if (m) {
    if (lastRoute === "list") listScroll = window.scrollY;
    lastRoute = "detail";
    const s = skis.find((x) => String(x.id) === m[1]);
    return s ? renderDetail(s) : renderNotFound();
  }
  const wasDetail = lastRoute === "detail";
  lastRoute = "list";
  listState = hashToState(location.hash);
  renderList();
  if (wasDetail) window.scrollTo(0, listScroll);
}

async function init() {
  try {
    const res = await fetch("data/narty.json", { cache: "no-cache" });
    const data = await res.json();
    skis = data.narty;
    const d = new Date(data.zaktualizowano);
    document.getElementById("updated").textContent = `Oferta aktualna na ${d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}.`;
  } catch {
    view.innerHTML = `<p class="wrap notice">Nie udało się wczytać listy nart. Odśwież stronę za chwilę.</p>`;
    return;
  }
  window.addEventListener("hashchange", route);
  route();
}

init();
