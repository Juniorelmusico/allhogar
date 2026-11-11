/* ==================== TEMPORADAS ====================
   En Ecuador no hay estaciones: cada temporada es una colección de productos.
   La clave "invierno" es la temporada de Navidad. */

export const SEASON_NAMES = { primavera:"Primavera", verano:"Verano", otono:"Otoño", invierno:"Navidad" };

/* color de acento de cada temporada (borde de las tarjetas de espacios y del catálogo).
   El resto de colores por temporada está en estilos.css (body[data-tema=…]). */
export const ACENTO = { primavera:"#B7D3A8", verano:"#F2D79A", otono:"#E0A86F", invierno:"#C6D6DC" };

/* Temporada con la que abre la página según el mes (enero … diciembre).
   Cámbiala aquí si quieres otra colección en algún mes. */
const POR_MES = [
  "verano", "verano", "verano",          // ene, feb, mar
  "primavera", "primavera", "primavera", // abr, may, jun
  "otono", "otono", "otono", "otono",    // jul, ago, sep, oct
  "invierno", "invierno"                 // nov, dic → Navidad
];

/* También se puede forzar con el enlace, útil para anuncios:
   ?temporada=navidad · ?temporada=verano · ?temporada=primavera · ?temporada=otono */
const ALIAS = { navidad:"invierno", "otoño":"otono" };

export function temporadaInicial(fecha = new Date(), busqueda = location.search){
  const pedida = (new URLSearchParams(busqueda).get("temporada") || "").toLowerCase();
  const clave = ALIAS[pedida] || pedida;
  if (SEASON_NAMES[clave]) return clave;
  return POR_MES[fecha.getMonth()];
}
