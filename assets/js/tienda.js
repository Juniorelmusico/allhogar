/* ==================== TIENDA ====================
   Punto de entrada de la página: temporada, catálogo, ficha de producto
   y panel de cada espacio. No depende de la casa 3D: si la casa no carga
   (sin WebGL o sin conexión al CDN de three.js), el catálogo sigue funcionando. */
import { SECTIONS } from "./datos.js";
import { SEASON_NAMES, SEASON_THEME, temporadaInicial } from "./temporadas.js";
import { findByRef, itemsFor, infoFor, espaciosCon, contarProductos } from "./productos.js";
import { waLink } from "./config.js";

const $ = id => document.getElementById(id);

/* ==================== ESTADO ==================== */
let temporada = temporadaInicial();       // según el mes o ?temporada= en el enlace
let espacioAbierto = null;                 // espacio cuyo panel está abierto
let temaOn = true;                         // colores de temporada en toda la página

/* la casa 3D se suscribe a estos avisos */
const oyentes = { temporada: [], espacio: [] };
const avisar = (evento, valor) => oyentes[evento].forEach(fn => fn(valor));

/* ==================== HTML DE PRODUCTOS ==================== */
const attr = t => String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");

function media(p, cls){
  const emo = `<span class="${cls}">${p.e}</span>`;
  if (!p.img) return emo;
  return `<span class="${cls} has-img"><img src="${attr(p.img)}" alt="" loading="lazy" referrerpolicy="no-referrer"
           onerror="this.parentNode.classList.remove('has-img');this.replaceWith(document.createTextNode('${p.e}'))"></span>`;
}
function priceHTML(p){
  return p.combo
    ? `<span class="was">$${p.was.toFixed(2)}</span> $${p.p.toFixed(2)}`
    : `$${p.p.toFixed(2)}`;
}
function addBtn(p, cls){
  return `<button class="${cls}" data-add="${attr(p.n)}" data-price="${p.p}" data-emo="${attr(p.e)}" data-ref="${attr(p.ref || "")}">Agregar</button>`;
}
function comboTag(p){
  return p.combo ? `<span class="combo-tag">COMBO · Ahorras $${(p.was - p.p).toFixed(2)}</span>` : "";
}

/* ==================== TEMPORADA ==================== */
function cambiarTemporada(s){
  temporada = s;
  if (temaOn) document.body.dataset.tema = s;
  document.querySelectorAll("#seasonRow .chip").forEach(b =>
    b.classList.toggle("active", b.dataset.season === s));
  document.documentElement.style.setProperty("--acc", SEASON_THEME[s].acc);
  $("statSeason").textContent = SEASON_NAMES[s].toLowerCase();

  renderCatalog();
  if (espacioAbierto) abrirEspacio(espacioAbierto);
  updateStats();
  avisar("temporada", s);
}

function updateStats(){
  const esp = espaciosCon(temporada).length;
  $("statProd").textContent = contarProductos(temporada);
  $("statEsp").textContent = esp;
  $("pillTxt").textContent = SEASON_NAMES[temporada] + " · " + esp + " espacios";
}

document.querySelectorAll("#seasonRow .chip").forEach(b =>
  b.onclick = () => cambiarTemporada(b.dataset.season));

const bTema = $("bTema");
bTema.onclick = () => {
  temaOn = !temaOn;
  bTema.classList.toggle("active", temaOn);
  if (temaOn) document.body.dataset.tema = temporada;
  else delete document.body.dataset.tema;
};

/* ==================== PANEL DE UN ESPACIO ==================== */
function abrirEspacio(sec){
  const s = SECTIONS[sec];
  const items = itemsFor(sec, temporada);
  espacioAbierto = sec;
  $("pTag").textContent = s.tag;
  $("pTitle").textContent = s.label;
  $("pSub").textContent =
    SEASON_NAMES[temporada] + " · " + items.length + " producto" + (items.length === 1 ? "" : "s");
  $("pBody").innerHTML = items.length
    ? items.map(p => `
      <div class="prod">
        <span data-detail="${attr(p.ref)}" class="mwrap">${media(p, "emo")}</span>
        <div class="info" data-detail="${attr(p.ref)}" role="button" tabindex="0">${comboTag(p)}<div class="nm">${p.n}</div><div class="pr">${priceHTML(p)}</div><div class="more">Ver detalles ›</div></div>
        ${addBtn(p, "go")}
      </div>`).join("")
    : `<p style="padding:14px;color:var(--ink-suave);font-style:italic">Sin productos en esta temporada.</p>`;
  $("panel").classList.add("show");
  avisar("espacio", sec);
}
function cerrarEspacio(){
  espacioAbierto = null;
  $("panel").classList.remove("show");
  avisar("espacio", null);
}
$("pClose").onclick = cerrarEspacio;

/* ==================== CATÁLOGO (abajo) ==================== */
const cardIO = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting){ e.target.classList.add("in"); cardIO.unobserve(e.target); } });
}, { rootMargin:"0px 0px -6% 0px" });

function renderCatalog(){
  $("catalog").innerHTML = Object.entries(SECTIONS).filter(([id]) => itemsFor(id, temporada).length).map(([id, sec]) => {
    const items = itemsFor(id, temporada);
    return `
      <article class="block" id="cat-${id}">
        <h3>${sec.label}</h3>
        <p class="note">${sec.tag} · ${SEASON_NAMES[temporada]} · ${items.length} productos</p>
        <div class="grid">
          ${items.map((p, i) => `
            <div class="card${p.combo ? " is-combo" : ""}" style="transition-delay:${i * 55}ms">
              <div class="tap" data-detail="${attr(p.ref)}" role="button" tabindex="0">
                ${media(p, "emoji")}
                ${comboTag(p)}
                <h4>${p.n}</h4>
                <p class="desc">${infoFor(p).d}</p>
              </div>
              <div class="price">${priceHTML(p)}</div>
              <div class="card-act">${addBtn(p, "add")}<button class="vermas" data-detail="${attr(p.ref)}">Ver más</button></div>
            </div>`).join("")}
        </div>
      </article>`;
  }).join("");
  document.querySelectorAll(".card").forEach(c => cardIO.observe(c));
  $("catSub").textContent = "Productos disponibles en " + SEASON_NAMES[temporada].toLowerCase();
}

/* ==================== FICHA DE PRODUCTO ==================== */
function openDetail(ref){
  const p = findByRef(ref); if (!p) return;
  const i = infoFor(p);
  const g = i.g.length ? i.g : (p.img ? [p.img] : []);
  const el = $("det");
  el.dataset.ref = ref;
  el.querySelector(".det-gal").innerHTML = g.length
    ? g.map(u => `<div class="det-ph"><img src="${attr(u)}" alt="${attr(p.n)}" loading="lazy" referrerpolicy="no-referrer" onerror="detImgFail(this)"></div>`).join("")
    : `<div class="det-ph det-emo">${p.e}</div>`;
  el.querySelector(".det-dots").innerHTML = g.length > 1 ? g.map((_, k) => `<span${k ? "" : ' class="on"'}></span>`).join("") : "";
  el.querySelector(".det-info").innerHTML = `
    <span class="det-badge">✓ Selección allhogar</span>
    ${comboTag(p)}
    <h3>${p.n}</h3>
    <div class="det-pr">${priceHTML(p)}</div>
    ${i.d ? `<p class="det-d">${i.d}</p>` : ""}
    ${i.b.length ? `<ul class="det-b">${i.b.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}
    ${i.m ? `<p class="det-m">${i.m}</p>` : ""}
    <div class="det-trust"><span>💵 Pagas al recibir</span><span>🚚 Entrega en 3–7 días</span><span>📦 Envío a todo el país</span></div>
    ${addBtn(p, "go det-add")}`;
  el.querySelector(".det-gal").scrollLeft = 0;
  el.querySelector(".det-info").scrollTop = 0;
  $("detOv").classList.add("show");
  el.classList.add("show"); el.setAttribute("aria-hidden", "false");
}
/* si una foto de la galería falla, se quita; si no queda ninguna, se muestra el emoji */
function detImgFail(img){
  const gal = img.closest(".det-gal"); img.parentNode.remove();
  if (gal && !gal.children.length){
    const p = findByRef($("det").dataset.ref);
    gal.innerHTML = `<div class="det-ph det-emo">${p ? p.e : "🏠"}</div>`;
  }
  const n = gal ? gal.querySelectorAll("img").length : 0;
  document.querySelector("#det .det-dots").innerHTML =
    n > 1 ? Array.from({length:n}, (_, k) => `<span${k ? "" : ' class="on"'}></span>`).join("") : "";
}
window.detImgFail = detImgFail;          // lo usa el onerror de las fotos de la ficha

function closeDetail(){
  $("detOv").classList.remove("show");
  const el = $("det"); el.classList.remove("show"); el.setAttribute("aria-hidden", "true");
}
document.addEventListener("click", ev => {
  if (ev.target.closest("[data-add]")) return;
  const d = ev.target.closest("[data-detail]");
  if (d){ ev.preventDefault(); openDetail(d.dataset.detail); }
});
document.addEventListener("keydown", ev => {
  if (ev.key === "Escape") closeDetail();
  if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches && ev.target.matches("[data-detail]")){
    ev.preventDefault(); openDetail(ev.target.dataset.detail);
  }
});
$("detX").onclick = closeDetail;
$("detOv").onclick = closeDetail;
document.querySelector("#det .det-gal").addEventListener("scroll", e => {
  const g = e.currentTarget, k = Math.round(g.scrollLeft / g.clientWidth);
  document.querySelectorAll("#det .det-dots span").forEach((s, j) => s.classList.toggle("on", j === k));
}, { passive:true });

/* ==================== ENLACES DE WHATSAPP ==================== */
$("waTop").href = waLink();
$("waBottom").href = waLink();
$("waFloat").href = waLink();

/* ==================== ARRANQUE ==================== */
cambiarTemporada(temporada);

/* lo que la casa 3D necesita de la tienda */
const tienda = {
  temporada: () => temporada,
  espacioAbierto: () => espacioAbierto,
  abrirEspacio,
  cerrarEspacio,
  escuchar: (evento, fn) => oyentes[evento].push(fn)
};

function sin3D(err){
  console.error(err);
  $("loading").innerHTML =
    '<div class="box" style="max-width:320px;text-align:center;padding:20px">' +
    '<div style="font-size:2rem;margin-bottom:8px">🏠</div>' +
    '<div style="font-weight:700;margin-bottom:6px">No pudimos cargar la vista 3D</div>' +
    '<div style="font-size:.86rem;color:var(--ink-suave)">Tu navegador no soporta WebGL o está desactivado. ' +
    'Baja un poco y revisa el catálogo completo.</div></div>';
}

import("./casa3d.js")
  .then(m => m.iniciarCasa(tienda))
  .catch(sin3D);
