/* ==================== CONSULTAS DEL CATÁLOGO ====================
   Funciones puras sobre los datos: no tocan la página ni la escena 3D. */
import { SECTIONS, INFO } from "./datos.js";

const CDN = "https://d39ru7awumhhs2.cloudfront.net/";
const gUrl = p => CDN + p.split("/").map(encodeURIComponent).join("/");

/* busca un producto por su ref (ID de Dropi o código de combo) */
export function findByRef(ref){
  for (const k in SECTIONS){
    const it = SECTIONS[k].items.find(p => p.ref === ref);
    if (it) return it;
  }
  return null;
}

/* busca por nombre exacto (solo para carritos viejos guardados sin ref) */
export function findByName(nombre){
  for (const k in SECTIONS){
    const it = SECTIONS[k].items.find(p => p.n === nombre);
    if (it) return it;
  }
  return null;
}

/* productos de un espacio que se muestran en la temporada dada */
export function itemsFor(sec, temporada){
  return SECTIONS[sec].items.filter(p => p.s.includes("todas") || p.s.includes(temporada));
}

/* espacios con al menos un producto en la temporada */
export function espaciosCon(temporada){
  return Object.keys(SECTIONS).filter(k => itemsFor(k, temporada).length);
}

/* productos distintos de la temporada (un producto puede estar en varios espacios) */
export function contarProductos(temporada){
  const refs = new Set();
  for (const k in SECTIONS) itemsFor(k, temporada).forEach(p => refs.add(p.ref));
  return refs.size;
}

/* ficha de un producto: descripción, puntos clave, notas y fotos.
   En los combos se arma sola a partir de los productos que incluye. */
export function infoFor(p){
  if (!p.combo){
    const i = INFO[p.ref];
    return i ? { d:i.d, b:i.b, m:i.m || "", g:i.g.map(gUrl) }
             : { d:"", b:[], m:"", g:p.img ? [p.img] : [] };
  }
  const ids = p.ref.split(":")[1].split("+");
  const parts = ids.map(id => ({ id, i: INFO[id], it: findByRef(id) }));
  return {
    d: "Combo con " + parts.length + " productos en un solo envío.",
    b: parts.map(x => (x.it ? x.it.n : "Producto") + (x.i ? ": " + x.i.d : "")),
    m: typeof p.was === "number" && p.was > p.p
      ? "Precio por separado: $" + p.was.toFixed(2) + " · Ahorras $" + (p.was - p.p).toFixed(2) + "."
      : "",
    g: parts.flatMap(x => x.i ? x.i.g.slice(0, 2).map(gUrl) : [])
  };
}
