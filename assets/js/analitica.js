/* ==================== MEDICIÓN (Meta Pixel y Google Analytics) ====================
   Solo se carga si hay IDs en config.js. Sin IDs, evento() no hace nada.
   Eventos que se envían:
     ver_producto   → Meta "ViewContent"      · GA "view_item"
     agregar        → Meta "AddToCart"        · GA "add_to_cart"
     datos_entrega  → Meta "InitiateCheckout" · GA "begin_checkout"
     pedido         → Meta "Lead"             · GA "generate_lead"
   (El pedido se cierra por WhatsApp, por eso se mide como "Lead" y no como compra.) */
import { META_PIXEL_ID, GA_ID } from "./config.js";

function cargar(src){
  const s = document.createElement("script");
  s.async = true; s.src = src;
  document.head.appendChild(s);
}

if (META_PIXEL_ID){
  const f = window.fbq = function(){ f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
  if (!window._fbq) window._fbq = f;
  f.push = f; f.loaded = true; f.version = "2.0"; f.queue = [];
  cargar("https://connect.facebook.net/en_US/fbevents.js");
  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
}

if (GA_ID){
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  cargar("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID));
  window.gtag("js", new Date());
  window.gtag("config", GA_ID);
}

const META = { ver_producto:"ViewContent", agregar:"AddToCart", datos_entrega:"InitiateCheckout", pedido:"Lead" };
const GA   = { ver_producto:"view_item", agregar:"add_to_cart", datos_entrega:"begin_checkout", pedido:"generate_lead" };

/* evento("agregar", { valor: 25, ref: "151892", nombre: "Humidificador" }) */
export function evento(nombre, { valor = 0, ref = "", nombre: producto = "" } = {}){
  try {
    if (META_PIXEL_ID && window.fbq)
      window.fbq("track", META[nombre], { value: valor, currency: "USD", content_ids: ref ? [ref] : [], content_name: producto });
    if (GA_ID && window.gtag)
      window.gtag("event", GA[nombre], { value: valor, currency: "USD", items: ref ? [{ item_id: ref, item_name: producto, price: valor }] : [] });
  } catch(e){ /* la medición nunca debe romper la tienda */ }
}
