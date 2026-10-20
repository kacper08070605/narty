import {
  EMAIL, FILTER_GROUPS, SORTS, activeCount, applyFilters, emptyState, hashToState, mailtoHref, matches, pluralPary,
  sortItems, stateToHash,
} from "./filters.js";

const SITE_TITLE = "Narty używane · Lublin";
const LABELS = Object.fromEntries(FILTER_GROUPS.flatMap((g) => g.options.map((o) => [o.value, o.label])));
const NBSP = " ";

const view = document.getElementById("view");
let skis = [];
let listState = emptyState();
let listScroll = 0;
let panelOpen = false;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => (n == null ? "" : String(n).replace(".", ","));
const zl = (n) => `${n.toLocaleString("pl-PL")}${NBSP}zł`;
const vh = (text) => `<span class="visually-hidden">${text}</span>`;

function levelTag(poziomy) {
  if (poziomy.length === 2) return "Średni–zaawansowany";
  return { "poczatkujacy-sredni": "Początkujący–średni", zaawansowany: "Zaawansowany" }[poziomy[0]] ?? "";
}

function stripBrand(model, brand) {
  const b = (brand || "").toLowerCase();
  return b && model.toLowerCase().startsWith(b + " ") ? model.slice(b.length + 1) : model;
}

function specLine(s) {
  return [
    s.dlugosc_cm && `${fmt(s.dlugosc_cm)}${NBSP}cm`,
    s.promien_m && `R${NBSP}${fmt(s.promien_m)}${NBSP}m`,
    s.talia_mm && `talia${NBSP}${fmt(s.talia_mm)}${NBSP}mm`,
  ].filter(Boolean).join(" · ");
}

function tags(s, { withTurn = false } = {}) {
  const out = [];
  if (s.dla_kogo === "damskie") out.push(`<li class="tag">Damskie</li>`);
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
  const found = applyFilters(skis, listState).length;
  const groups = FILTER_GROUPS.map((g) => `
    <fieldset class="fgroup">
      <legend>${g.label}</legend>
      <div class="chips">
        ${g.options.map((o) => {
          const on = listState[g.key].includes(o.value);
          const c = optionCount(g, o.value);
          return `<button type="button" class="chip" data-group="${g.key}" data-value="${o.value}" aria-pressed="${on}" ${!on && c === 0 ? "disabled" : ""}>${o.label}<span class="n num" aria-hidden="true">${c}</span>${vh(`, ${pluralPary(c)}`)}</button>`;
        }).join("")}
      </div>
    </fieldset>`).join("");
  const prices = skis.map((s) => s.cena);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  return `
  <section class="filters" aria-label="Filtry">
    <div class="wrap filters__inner">
      <div class="filters__bar">
        <button type="button" class="filters__toggle" id="filters-toggle" aria-expanded="${panelOpen}" aria-controls="filters-panel">
          Filtry${n ? ` <span class="badge num">${n}</span>${vh(" aktywne")}` : ""}
        </button>
        <p class="filters__count num" aria-live="polite" id="count"></p>
        <label class="filters__sort"><span class="filters__sort-label">Sortuj</span>
          <select id="sort" aria-label="Sortowanie">${SORTS.map((o) => `<option value="${o.value}" ${o.value === listState.sort ? "selected" : ""}>${o.label}</option>`).join("")}</select>
        </label>
      </div>
      <div class="filters__panel" id="filters-panel" ${panelOpen ? "" : "hidden"}>
        <div class="fgroups">
          ${groups}
          <fieldset class="fgroup">
            <legend>Cena</legend>
            <div class="price">
              <label><input id="cena-min" type="number" inputmode="numeric" min="0" step="10" placeholder="${lo}" value="${listState.cenaMin ?? ""}" aria-label="Cena od, zł"><span class="unit" aria-hidden="true">zł</span></label>
              <span class="dash" aria-hidden="true">–</span>
              <label><input id="cena-max" type="number" inputmode="numeric" min="0" step="10" placeholder="${hi}" value="${listState.cenaMax ?? ""}" aria-label="Cena do, zł"><span class="unit" aria-hidden="true">zł</span></label>
            </div>
          </fieldset>
        </div>
        <div class="filters__actions">
          <button type="button" class="filters__clear" ${n ? "" : "hidden"}>Wyczyść filtry</button>
          <button type="button" class="btn btn--dark filters__apply">Pokaż ${pluralPary(found)}</button>
        </div>
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
        ${img ? `<img src="${img.s}" alt="" loading="lazy" decoding="async" width="480" height="640">` : ""}
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
    ? pluralPary(skis.length)
    : `${found.length} z ${skis.length} par`;
  const apply = document.querySelector(".filters__apply");
  if (apply) apply.textContent = `Pokaż ${pluralPary(found.length)}`;
  const box = document.getElementById("results");
  box.innerHTML = found.length
    ? `<ul class="grid">${found.map(card).join("")}</ul>`
    : `<div class="empty">
         <h2>Brak nart dla tych filtrów</h2>
         <p>Spróbuj poluzować któryś warunek, na przykład dopuścić sąsiedni przedział długości.</p>
         <button type="button" class="btn btn--ghost" data-clear>Wyczyść filtry</button>
       </div>`;
}

function renderList() {
  document.title = SITE_TITLE;
  view.innerHTML = `
    <section class="intro wrap">
      <h1>Narty zjazdowe z drugiej ręki</h1>
      <p>Przy każdej parze jest opis stanu i komplet zdjęć, a ewentualne wady opisuję wprost. Wybierz długość i poziom, zostaną tylko pasujące pary.</p>
    </section>
    ${renderFilters()}
    <section class="results wrap" id="results" aria-label="Narty"></section>`;
  renderResults();
}

function focusKey(el) {
  if (!el) return null;
  if (el.dataset?.value) return `.chip[data-group="${el.dataset.group}"][data-value="${el.dataset.value}"]`;
  if (el.id) return `#${el.id}`;
  if (el.classList?.contains("filters__clear")) return "#filters-toggle";
  return null;
}

function setState(next, { rerenderFilters = true } = {}) {
  listState = next;
  const hash = stateToHash(listState);
  if (location.hash !== hash) history.replaceState(null, "", hash);
  if (rerenderFilters) {
    const sel = focusKey(document.activeElement);
    document.querySelector(".filters").outerHTML = renderFilters();
    if (sel) document.querySelector(sel)?.focus();
  }
  renderResults();
}

function setPanel(open) {
  panelOpen = open;
  document.getElementById("filters-panel").hidden = !open;
  document.getElementById("filters-toggle").setAttribute("aria-expanded", String(open));
}

view.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) {
    const { group, value } = chip.dataset;
    const cur = listState[group];
    setState({ ...listState, [group]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
    return;
  }
  if (e.target.closest(".filters__toggle")) return setPanel(!panelOpen);
  if (e.target.closest(".filters__apply")) {
    setPanel(false);
    document.getElementById("filters-toggle").focus();
    document.getElementById("results").scrollIntoView({ block: "start" });
    return;
  }
  if (e.target.closest(".filters__clear, [data-clear]")) setState({ ...emptyState(), sort: listState.sort });
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
    ["Stan ogólny", s.stan_ogolny],
    ["Poziom", s.poziomy.length === 2 ? "Średniozaawansowani i zaawansowani" : LABELS[s.poziomy[0]]],
    ["Charakter skrętu", s.skret && LABELS[s.skret]],
    ["Dla kogo", LABELS[s.dla_kogo]],
  ].filter(([, v]) => v);
  const n = s.zdjecia.length;
  const href = mailtoHref(s, location.href);
  view.innerHTML = `
  <article class="detail wrap">
    <a class="back" href="${stateToHash(listState)}"><span aria-hidden="true">←</span> Wszystkie narty</a>
    <div class="detail__layout">
      <section class="gallery" aria-label="Zdjęcia">
        <div class="gallery__stage">
          <div class="gallery__track" tabindex="0" aria-label="Zdjęcia: przewiń w bok lub użyj strzałek, Enter powiększa">
            ${s.zdjecia.map((z, i) => `<div class="gallery__slide"><button type="button" class="gallery__zoom" data-i="${i}" aria-label="Powiększ zdjęcie ${i + 1} z ${n}"><img src="${z.l}" alt="${esc(s.model)}, zdjęcie ${i + 1} z ${n}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async"></button></div>`).join("")}
          </div>
          <button type="button" class="gallery__nav gallery__nav--prev" aria-label="Poprzednie zdjęcie"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 3 5 9l6 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
          <button type="button" class="gallery__nav gallery__nav--next" aria-label="Następne zdjęcie"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="m7 3 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
          <span class="gallery__counter num" aria-hidden="true">1 / ${n}</span>
          <span class="visually-hidden" aria-live="polite" id="gallery-live"></span>
        </div>
        <ul class="gallery__thumbs">
          ${s.zdjecia.map((z, i) => `<li><button type="button" data-i="${i}" aria-label="Zdjęcie ${i + 1} z ${n}" aria-current="${i === 0}"><img src="${z.s}" alt="" loading="lazy" decoding="async"></button></li>`).join("")}
        </ul>
      </section>

      <div class="info">
        <p class="info__brand">${esc(s.marka)}</p>
        <h1 tabindex="-1">${esc(stripBrand(s.tytul.replace(/^Narty\s+/i, ""), s.marka))}</h1>
        <p class="info__price num">${zl(s.cena)}${s.zarezerwowane ? `<span class="info__reserved">Zarezerwowane</span>` : ""}</p>
        <ul class="info__tags">${tags(s, { withTurn: true })}</ul>
        <div class="info__cta">
          <a class="btn btn--primary" href="${href}">Napisz do mnie</a>
          <p class="info__mail">Albo napisz sam na <span class="info__addr">${EMAIL}</span>
            <button type="button" class="linkbtn" data-copy>Kopiuj adres</button></p>
          <p class="info__note">Odbiór w Lublinie albo wysyłka, koszt ustalimy mailowo.</p>
        </div>
        <dl class="specs">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        ${s.stan ? `<section class="prose"><h2>Stan</h2>${paragraphs(s.stan)}</section>` : ""}
        ${s.opis_modelu ? `<section class="prose"><h2>O modelu</h2>${paragraphs(s.opis_modelu)}</section>` : ""}
      </div>
    </div>
    <div class="buybar" aria-hidden="true">
      <span class="buybar__price num">${zl(s.cena)}</span>
      <a class="btn btn--primary" href="${href}" tabindex="-1">Napisz do mnie</a>
    </div>
  </article>
  <dialog class="lightbox" aria-label="Powiększone zdjęcie">
    <div class="lightbox__scroll"><img alt=""></div>
    <button type="button" class="lightbox__close" aria-label="Zamknij">✕</button>
    <button type="button" class="lightbox__nav lightbox__nav--prev" aria-label="Poprzednie zdjęcie">‹</button>
    <button type="button" class="lightbox__nav lightbox__nav--next" aria-label="Następne zdjęcie">›</button>
    <span class="lightbox__counter num" aria-live="polite"></span>
  </dialog>`;
  initGallery(s);
  view.querySelector("[data-copy]").addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      e.target.textContent = "Skopiowano";
    } catch {
      getSelection().selectAllChildren(view.querySelector(".info__addr"));
      e.target.textContent = "Zaznaczono, skopiuj";
    }
  });
  window.scrollTo(0, 0);
  view.querySelector("h1").focus({ preventScroll: true });
}

function initGallery(s) {
  const n = s.zdjecia.length;
  const track = view.querySelector(".gallery__track");
  const counter = view.querySelector(".gallery__counter");
  const live = document.getElementById("gallery-live");
  const prev = view.querySelector(".gallery__nav--prev");
  const next = view.querySelector(".gallery__nav--next");
  const thumbs = [...view.querySelectorAll(".gallery__thumbs button")];
  const strip = view.querySelector(".gallery__thumbs");
  const box = view.querySelector(".lightbox");
  const boxImg = box.querySelector("img");
  let current = 0;
  let boxIndex = 0;
  const smooth = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  const go = (i) => track.scrollTo({ left: Math.max(0, Math.min(n - 1, i)) * track.clientWidth, behavior: smooth() });
  const sync = () => {
    const i = Math.round(track.scrollLeft / track.clientWidth);
    const changed = i !== current;
    current = i;
    counter.textContent = `${i + 1} / ${n}`;
    if (changed) live.textContent = `Zdjęcie ${i + 1} z ${n}`;
    prev.disabled = i === 0;
    next.disabled = i === n - 1;
    thumbs.forEach((t, k) => t.setAttribute("aria-current", String(k === i)));
    // przewijamy tylko pasek miniatur, nigdy całą stronę
    const t = thumbs[i];
    if (t) {
      const left = t.parentElement.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2;
      strip.scrollTo({ left: Math.max(0, left), behavior: smooth() });
    }
  };
  const showBox = (i) => {
    boxIndex = (i + n) % n;
    boxImg.src = s.zdjecia[boxIndex].l;
    boxImg.alt = `${s.model}, zdjęcie ${boxIndex + 1} z ${n}`;
    box.querySelector(".lightbox__counter").textContent = `${boxIndex + 1} / ${n}`;
    box.querySelector(".lightbox__scroll").scrollTo(0, 0);
  };
  track.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
  prev.addEventListener("click", () => go(current - 1));
  next.addEventListener("click", () => go(current + 1));
  thumbs.forEach((t) => t.addEventListener("click", () => go(Number(t.dataset.i))));
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
  });
  track.addEventListener("click", (e) => {
    const z = e.target.closest(".gallery__zoom");
    if (!z) return;
    showBox(Number(z.dataset.i));
    const y = window.scrollY;
    box.showModal();
    window.scrollTo(0, y);
  });
  box.querySelector(".lightbox__close").addEventListener("click", () => box.close());
  box.querySelector(".lightbox__nav--prev").addEventListener("click", () => showBox(boxIndex - 1));
  box.querySelector(".lightbox__nav--next").addEventListener("click", () => showBox(boxIndex + 1));
  box.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") showBox(boxIndex + 1);
    if (e.key === "ArrowLeft") showBox(boxIndex - 1);
  });
  box.addEventListener("close", () => {
    const y = window.scrollY;
    go(boxIndex);
    requestAnimationFrame(() => window.scrollTo(0, y));
  });
  sync();
}

function renderNotFound() {
  document.title = SITE_TITLE;
  view.innerHTML = `
  <section class="wrap empty">
    <h2>Tej pary już nie ma</h2>
    <p>Najpewniej została sprzedana. Zobacz pozostałe narty.</p>
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
