/* ==================== TIENDA ====================
   Punto de entrada de la página: temporada, tarjetas de espacios con fotos,
   catálogo, buscador y ficha de producto. */
import { SECTIONS, ICONOS } from "./datos.js";
import { SEASON_NAMES, ACENTO, temporadaInicial } from "./temporadas.js";
import { findByRef, itemsFor, infoFor, espaciosCon, miniatura } from "./productos.js";
import { waLink } from "./config.js";
import { evento } from "./analitica.js";

const $ = id => document.getElementById(id);

/* ==================== ESTADO ==================== */
let temporada = temporadaInicial();       // según el mes o ?temporada= en el enlace

/* ==================== HTML DE PRODUCTOS ==================== */
const attr = t => String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");

function media(p, cls){
  const emo = `<span class="${cls}">${p.e}</span>`;
  const src = miniatura(p);
  if (!src) return emo;
  return `<span class="${cls} has-img"><img src="${attr(src)}" alt="${attr(p.n)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"
           onerror="this.parentNode.classList.remove('has-img');this.replaceWith(document.createTextNode('${p.e}'))"></span>`;
}
/* un combo solo muestra precio tachado y ahorro si "was" está definido y es comprobable */
const tieneAhorro = p => p.combo && typeof p.was === "number" && p.was > p.p;

function priceHTML(p){
  return tieneAhorro(p)
    ? `<span class="was">$${p.was.toFixed(2)}</span> $${p.p.toFixed(2)}`
    : `$${p.p.toFixed(2)}`;
}
function addBtn(p, cls){
  return `<button class="${cls}" data-add="${attr(p.n)}" data-price="${p.p}" data-emo="${attr(p.e)}" data-ref="${attr(p.ref || "")}">Agregar</button>`;
}
function comboTag(p){
  if (!p.combo) return "";
  return `<span class="combo-tag">COMBO${tieneAhorro(p) ? " · Ahorras $" + (p.was - p.p).toFixed(2) : ""}</span>`;
}

/* ==================== TEMPORADA ==================== */
function cambiarTemporada(s){
  temporada = s;
  document.body.dataset.tema = s;
  document.querySelectorAll("#seasonRow .chip").forEach(b =>
    b.classList.toggle("active", b.dataset.season === s));
  document.documentElement.style.setProperty("--acc", ACENTO[s]);
  const esp = espaciosCon(s).length;
  $("pillTxt").textContent = SEASON_NAMES[s] + " · " + esp + " espacios";
  $("espSub").textContent = esp + " espacios con productos de " + SEASON_NAMES[s].toLowerCase() + " · toca uno para ver sus productos";

  renderEspacios();
  renderCatalog();
}

document.querySelectorAll("#seasonRow .chip").forEach(b =>
  b.onclick = () => cambiarTemporada(b.dataset.season));

/* ==================== ESPACIOS: tarjetas con mosaico de fotos ==================== */
/* hasta 4 fotos de productos distintos del espacio (primero los productos sueltos) */
function fotosEspacio(sec){
  const items = itemsFor(sec, temporada);
  const orden = [...items.filter(p => !p.combo), ...items.filter(p => p.combo)];
  const fotos = [];
  for (const p of orden){
    const src = miniatura(p);
    if (src && !fotos.some(f => f.src === src)) fotos.push({ src, alt: p.n });
    if (fotos.length === 4) break;
  }
  return fotos;
}

function renderEspacios(){
  $("espGrid").innerHTML = espaciosCon(temporada).map((sec, i) => {
    const s = SECTIONS[sec], n = itemsFor(sec, temporada).length, fotos = fotosEspacio(sec);
    return `
      <a class="esp-card" href="#cat-${sec}" data-espacio="${sec}" style="--i:${i}">
        <div class="mosaico m${fotos.length}">
          ${fotos.map(f => `<img src="${attr(f.src)}" alt="${attr(f.alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`).join("")}
        </div>
        <div class="esp-info">
          <span class="esp-ico" aria-hidden="true">${ICONOS[sec] || "🏠"}</span>
          <div>
            <h3>${s.label}</h3>
            <p>${s.tag} · ${n} producto${n === 1 ? "" : "s"}</p>
          </div>
          <span class="esp-ver" aria-hidden="true">Ver ›</span>
        </div>
      </a>`;
  }).join("");
}

/* al tocar un espacio se baja a sus productos y se resaltan un momento */
$("espGrid").addEventListener("click", ev => {
  const a = ev.target.closest("[data-espacio]");
  if (!a) return;
  ev.preventDefault();
  if (busqueda){ busqueda = ""; $("buscar").value = ""; renderCatalog(); }
  const bloque = $("cat-" + a.dataset.espacio);
  if (!bloque) return;
  bloque.scrollIntoView({ behavior:"smooth", block:"start" });
  bloque.classList.remove("resaltar"); void bloque.offsetWidth; bloque.classList.add("resaltar");
  bloque.querySelectorAll(".card").forEach(c => c.classList.add("in"));
});

/* ==================== CATÁLOGO (abajo) ==================== */
const cardIO = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting){ e.target.classList.add("in"); cardIO.unobserve(e.target); } });
}, { rootMargin:"0px 0px -6% 0px" });

function cardHTML(p, i){
  return `
    <div class="card${p.combo ? " is-combo" : ""}" style="transition-delay:${Math.min(i, 8) * 55}ms">
      <div class="tap" data-detail="${attr(p.ref)}" role="button" tabindex="0">
        ${media(p, "emoji")}
        ${comboTag(p)}
        <h4>${p.n}</h4>
        <p class="desc">${infoFor(p).d}</p>
      </div>
      <div class="price">${priceHTML(p)}</div>
      <div class="card-act">${addBtn(p, "add")}<button class="vermas" data-detail="${attr(p.ref)}">Ver más</button></div>
    </div>`;
}

/* búsqueda sin tildes ni mayúsculas, en nombre y descripción, dentro de la temporada */
let busqueda = "";
const normal = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function resultados(q){
  const palabras = normal(q).split(/\s+/).filter(Boolean);
  const vistos = new Set(), lista = [];
  for (const id in SECTIONS){
    for (const p of itemsFor(id, temporada)){
      if (vistos.has(p.ref)) continue;
      const texto = normal(p.n + " " + infoFor(p).d + " " + SECTIONS[id].label);
      if (palabras.every(w => texto.includes(w))){ vistos.add(p.ref); lista.push(p); }
    }
  }
  return lista;
}

function renderCatalog(){
  if (busqueda){
    const lista = resultados(busqueda);
    $("catalog").innerHTML = `
      <article class="block">
        <h3>Resultados para «${attr(busqueda)}»</h3>
        <p class="note">${lista.length} producto${lista.length === 1 ? "" : "s"} en ${SEASON_NAMES[temporada].toLowerCase()}</p>
        <div class="grid">
          ${lista.length ? lista.map(cardHTML).join("")
            : `<p class="empty">No encontramos ese producto. <a href="${waLink("Hola allhogar, busco: " + busqueda)}" target="_blank" rel="noopener">Pregúntanos por WhatsApp</a> y lo conseguimos.</p>`}
        </div>
      </article>`;
  } else {
    $("catalog").innerHTML = Object.entries(SECTIONS).filter(([id]) => itemsFor(id, temporada).length).map(([id, sec]) => {
      const items = itemsFor(id, temporada);
      return `
        <article class="block" id="cat-${id}">
          <h3>${sec.label}</h3>
          <p class="note">${sec.tag} · ${SEASON_NAMES[temporada]} · ${items.length} productos</p>
          <div class="grid">${items.map(cardHTML).join("")}</div>
        </article>`;
    }).join("");
  }
  document.querySelectorAll(".card").forEach(c => cardIO.observe(c));
  $("catSub").textContent = "Productos disponibles en " + SEASON_NAMES[temporada].toLowerCase();
}

let tBuscar = null;
$("buscar").addEventListener("input", e => {
  clearTimeout(tBuscar);
  tBuscar = setTimeout(() => { busqueda = e.target.value.trim(); renderCatalog(); }, 180);
});

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
    <div class="det-trust"><span>💵 Pagas al recibir</span><span>🚚 Entrega en 3–7 días</span><span>📦 Envío gratis</span></div>
    ${addBtn(p, "go det-add")}`;
  el.querySelector(".det-gal").scrollLeft = 0;
  el.querySelector(".det-info").scrollTop = 0;
  $("detOv").classList.add("show");
  el.classList.add("show"); el.setAttribute("aria-hidden", "false");
  evento("ver_producto", { valor: p.p, ref: p.ref, nombre: p.n });
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

/* ==================== PREGUNTAS FRECUENTES ==================== */
/* un enlace a una pregunta (#ayuda-…) la abre además de llevar hasta ella */
document.addEventListener("click", ev => {
  const a = ev.target.closest('a[href^="#ayuda-"]');
  if (!a) return;
  const d = document.querySelector(a.getAttribute("href"));
  if (d && d.tagName === "DETAILS") d.open = true;
});

/* ==================== ENLACES DE WHATSAPP ==================== */
$("waTop").href = waLink();
$("waBottom").href = waLink();
$("waFloat").href = waLink();

/* ==================== ARRANQUE ==================== */
cambiarTemporada(temporada);
