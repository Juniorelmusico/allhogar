/* ==================== CARRITO + PEDIDO CONTRA ENTREGA ====================
   El carrito se guarda en el navegador del cliente (localStorage).
   Al enviar, se abre WhatsApp con el pedido escrito y un código AH-XXXXXX.
   OJO: el panel privado de pedidos lee este mensaje; si cambias sus líneas,
   revisa que el panel lo siga entendiendo. */
import { WHATSAPP as WA } from "./config.js";
import { findByRef, findByName } from "./productos.js";

const PROVINCIAS = ["Azuay","Bolívar","Cañar","Carchi","Chimborazo","Cotopaxi","El Oro","Esmeraldas",
  "Galápagos","Guayas","Imbabura","Loja","Los Ríos","Manabí","Morona Santiago","Napo","Orellana","Pastaza",
  "Pichincha","Santa Elena","Santo Domingo de los Tsáchilas","Sucumbíos","Tungurahua","Zamora Chinchipe"];
const KEY = "allhogar_cart_v1", KEYF = "allhogar_form_v1";

/* Envío gratis: los precios ya incluyen el flete. Galápagos queda por confirmar
   hasta confirmar el costo del flete allá. */
const SIN_ENVIO_GRATIS = ["Galápagos"];
const envioDe = prov => SIN_ENVIO_GRATIS.includes(prov) ? "por confirmar" : "GRATIS";
const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => "$" + n.toFixed(2);

function load(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } }
function save(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

let cart = load(KEY, []);          // [{n, p, e, ref, q}]
let step = "cart";                 // cart | form | done
let lastOrder = null;

const count = () => cart.reduce((a, i) => a + i.q, 0);
const total = () => cart.reduce((a, i) => a + i.q * i.p, 0);

function persist(){ save(KEY, cart); $("cartCount").textContent = count(); }

/* El carrito guardado puede ser de días atrás: el nombre, el precio y el emoji
   se toman siempre del catálogo actual (datos.js), buscando por ref.
   Lo que ya no está en el catálogo se quita. Devuelve los nombres quitados. */
function sincronizar(){
  const quitados = [], alDia = [];
  for (const i of cart){
    const p = (i.ref && findByRef(i.ref)) || findByName(i.n);
    if (!p){ quitados.push(i.n); continue; }
    const ya = alDia.find(x => x.ref === p.ref);
    if (ya) ya.q += i.q;
    else alDia.push({ n: p.n, p: p.p, e: p.e, ref: p.ref, q: i.q });
  }
  cart = alDia;
  persist();
  if (quitados.length) toast("Ya no está disponible: " + quitados.join(", "));
}

function add(n, p, e, ref){
  const prod = findByRef(ref);
  if (prod){ n = prod.n; p = prod.p; e = prod.e; }
  const it = cart.find(i => (ref && i.ref === ref) || i.n === n);
  if (it) it.q++; else cart.push({ n, p: Number(p), e, ref: ref || "", q: 1 });
  persist();
  const b = $("cartBtn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
  toast("Agregado: " + n);
}

function toast(msg){
  let t = $("toast");
  if (!t){
    t = document.createElement("div"); t.id = "toast";
    t.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#2D251E;color:#fff;" +
      "padding:10px 18px;border-radius:999px;font-weight:600;font-size:.86rem;z-index:95;transition:opacity .3s;" +
      "max-width:90vw;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25);pointer-events:none";
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = "1";
  t.style.bottom = document.getElementById("cart").classList.contains("show") ? "auto" : "22px";
  t.style.top = document.getElementById("cart").classList.contains("show") ? "70px" : "auto";
  clearTimeout(t._h); t._h = setTimeout(() => t.style.opacity = "0", 1800);
}

function open(){ $("cart").classList.add("show"); $("cartOv").classList.add("show");
                 $("cart").setAttribute("aria-hidden","false"); if (step === "done") step = "cart";
                 sincronizar(); render(); }
function close(){ $("cart").classList.remove("show"); $("cartOv").classList.remove("show");
                  $("cart").setAttribute("aria-hidden","true"); }

function render(){
  const body = $("cartBody"), foot = $("cartFoot");
  if (step === "done"){
    $("cartTitle").textContent = "¡Pedido enviado!";
    body.innerHTML = `<div class="done"><div class="big">🎉</div>
      <h4>Gracias, ${esc(lastOrder.nombre.split(" ")[0])}</h4>
      <p>Tu pedido <code>${esc(lastOrder.codigo)}</code> se abrió en WhatsApp. Si no se envió, toca el botón de abajo.</p>
      <p>Te confirmaremos por WhatsApp antes de despachar. Pagas al recibir.</p></div>`;
    foot.innerHTML = `<a class="cta-btn wa-green" style="text-align:center;text-decoration:none" target="_blank" rel="noopener"
      href="${lastOrder.url}">Reenviar por WhatsApp</a>
      <button class="link-btn" id="bSeguir">Seguir comprando</button>`;
    $("bSeguir").onclick = () => { step = "cart"; close(); };
    return;
  }
  if (step === "form"){
    $("cartTitle").textContent = "Datos de entrega";
    const f = load(KEYF, {});
    body.innerHTML = `
      <div class="note-box">🚚 <b>Envío GRATIS</b> · 💵 <b>Pagas al recibir.</b> Te escribimos por WhatsApp para confirmar antes de despachar.</div>
      <form id="oform" novalidate>
        <div class="f"><label for="fNom">Nombre y apellido</label>
          <input id="fNom" autocomplete="name" value="${esc(f.nombre||"")}"><div class="err">Escribe tu nombre completo</div></div>
        <div class="row2">
          <div class="f"><label for="fCed">Cédula</label>
            <input id="fCed" inputmode="numeric" maxlength="10" value="${esc(f.cedula||"")}"><div class="err">10 dígitos</div></div>
          <div class="f"><label for="fTel">Celular</label>
            <input id="fTel" inputmode="tel" autocomplete="tel" placeholder="09XXXXXXXX" value="${esc(f.telefono||"")}"><div class="err">Ej: 0991234567</div></div>
        </div>
        <div class="row2">
          <div class="f"><label for="fProv">Provincia</label>
            <select id="fProv"><option value="">Elige…</option>${PROVINCIAS.map(p =>
              `<option ${f.provincia===p?"selected":""}>${p}</option>`).join("")}</select><div class="err">Elige tu provincia</div>
            <div class="prov-nota" id="provNota" hidden>Para Galápagos, el envío se confirma por WhatsApp.</div></div>
          <div class="f"><label for="fCiu">Ciudad</label>
            <input id="fCiu" autocomplete="address-level2" value="${esc(f.ciudad||"")}"><div class="err">Escribe tu ciudad</div></div>
        </div>
        <div class="f"><label for="fDir">Dirección (calle principal, número, secundaria)</label>
          <textarea id="fDir" autocomplete="street-address">${esc(f.direccion||"")}</textarea><div class="err">Escribe tu dirección</div></div>
        <div class="f"><label for="fRef">Referencia (opcional)</label>
          <input id="fRef" placeholder="Ej: casa blanca junto a la farmacia" value="${esc(f.referencia||"")}"></div>
      </form>`;
    foot.innerHTML = `
      <div class="sum"><span class="muted">Envío</span><span class="envio-val" id="envioVal">GRATIS</span></div>
      <div class="sum total"><span>Total productos</span><span>${money(total())}</span></div>
      <button class="cta-btn wa-green" id="bEnviar">Enviar pedido por WhatsApp</button>
      <button class="link-btn" id="bVolver">← Volver al carrito</button>`;
    $("bVolver").onclick = () => { step = "cart"; render(); };
    $("bEnviar").onclick = submit;
    const clear = e => { const f = e.target.closest(".f"); if (f) f.classList.remove("bad"); };
    const verEnvio = () => {
      const envio = envioDe($("fProv").value);
      $("envioVal").textContent = envio;
      $("envioVal").classList.toggle("muted", envio !== "GRATIS");
      $("provNota").hidden = envio === "GRATIS";
    };
    $("oform").addEventListener("input", clear);
    $("oform").addEventListener("change", clear);
    $("fProv").addEventListener("change", verEnvio);
    verEnvio();
    return;
  }
  // ---- carrito ----
  $("cartTitle").textContent = "Tu carrito";
  if (!cart.length){
    body.innerHTML = `<div class="empty-cart"><div>🛒</div>Tu carrito está vacío.<br>Toca un cuarto de la casa y agrega productos.</div>`;
    foot.innerHTML = `<button class="cta-btn" id="bExplorar">Explorar la casa</button>`;
    $("bExplorar").onclick = () => { close(); document.getElementById("sceneWrap").scrollIntoView({behavior:"smooth"}); };
    return;
  }
  body.innerHTML = cart.map((i, k) => `
    <div class="line">
      <div class="emo">${esc(i.e)}</div>
      <div class="info"><div class="nm">${esc(i.n)}</div><div class="pr">${money(i.p)} c/u · ${money(i.p*i.q)}</div></div>
      <div class="qty"><button data-dec="${k}" aria-label="Quitar uno">−</button><span>${i.q}</span><button data-inc="${k}" aria-label="Agregar uno">+</button></div>
    </div>`).join("");
  foot.innerHTML = `
    <div class="sum"><span class="muted">Productos (${count()})</span><span>${money(total())}</span></div>
    <div class="sum"><span class="muted">Envío</span><span class="envio-val">GRATIS</span></div>
    <div class="sum total"><span>Total</span><span>${money(total())}</span></div>
    <button class="cta-btn" id="bComprar">Continuar · Pago contra entrega</button>`;
  $("bComprar").onclick = () => { step = "form"; render(); };
}

function val(id){ return (document.getElementById(id).value || "").trim(); }
function mark(id, ok){ document.getElementById(id).closest(".f").classList.toggle("bad", !ok); return ok; }

function submit(){
  const d = {
    nombre: val("fNom"), cedula: val("fCed").replace(/\D/g,""), telefono: val("fTel").replace(/\D/g,""),
    provincia: val("fProv"), ciudad: val("fCiu"), direccion: val("fDir"), referencia: val("fRef")
  };
  let ok = true;
  ok = mark("fNom", d.nombre.split(/\s+/).length >= 2) && ok;
  ok = mark("fCed", /^\d{10}$/.test(d.cedula)) && ok;
  ok = mark("fTel", /^09\d{8}$/.test(d.telefono)) && ok;
  ok = mark("fProv", !!d.provincia) && ok;
  ok = mark("fCiu", d.ciudad.length >= 2) && ok;
  ok = mark("fDir", d.direccion.length >= 6) && ok;
  if (!ok){ const b = document.querySelector(".f.bad input,.f.bad select,.f.bad textarea"); if (b) b.focus(); return; }
  save(KEYF, d);

  const codigo = "AH-" + Date.now().toString(36).toUpperCase().slice(-6);
  const lineas = cart.map(i => `• ${i.q} x ${i.n}${i.ref ? " (#" + i.ref + ")" : ""} — $${(i.p*i.q).toFixed(2)}`).join("\n");
  const msg =
`🛒 PEDIDO ALLHOGAR ${codigo}
Nombre: ${d.nombre}
Cédula: ${d.cedula}
Teléfono: ${d.telefono}
Provincia: ${d.provincia}
Ciudad: ${d.ciudad}
Dirección: ${d.direccion}
Referencia: ${d.referencia || "-"}
Productos:
${lineas}
Total productos: $${total().toFixed(2)}
Pago: contra entrega
Envío: ${envioDe(d.provincia)}`;          // línea nueva al final: el panel de pedidos lee las de arriba
  const url = "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
  lastOrder = { codigo, nombre: d.nombre, url };
  window.open(url, "_blank", "noopener");
  cart = []; persist();
  step = "done"; render();
}

// ---- eventos ----
document.addEventListener("click", ev => {
  const a = ev.target.closest("[data-add]");
  if (a){ ev.preventDefault(); ev.stopPropagation(); add(a.dataset.add, a.dataset.price, a.dataset.emo, a.dataset.ref); return; }
  const inc = ev.target.closest("[data-inc]"), dec = ev.target.closest("[data-dec]");
  if (inc){ cart[+inc.dataset.inc].q++; persist(); render(); }
  if (dec){ const k = +dec.dataset.dec; cart[k].q--; if (cart[k].q <= 0) cart.splice(k, 1); persist(); render(); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
$("cartBtn").onclick = open;
$("cartX").onclick = close;
$("cartOv").onclick = close;
sincronizar();
