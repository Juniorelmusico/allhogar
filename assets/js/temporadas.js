/* ==================== TEMPORADAS ====================
   En Ecuador no hay estaciones: cada temporada es una colección de productos.
   La clave "invierno" es la temporada de Navidad. */

export const SEASON_NAMES = { primavera:"Primavera", verano:"Verano", otono:"Otoño", invierno:"Navidad" };

/* paletas de la casa 3D por temporada (acc = color de acento del catálogo) */
export const SEASON_THEME = {
  primavera:{ sky:"#EAF2E6", fog:0xEAF2E6, grass:0x8FB87A, tree:0x5E9150, blossom:0xE9A7BE,
              sun:0xFFF4D6, sunInt:2.0, amb:0xBFD9E8, ground:0xDFE9D2, acc:"#B7D3A8" },
  verano:   { sky:"#FDF4DC", fog:0xFDF4DC, grass:0x7FAE62, tree:0x4F8744, blossom:0xF2C94C,
              sun:0xFFE9A8, sunInt:2.5, amb:0xDCE8F0, ground:0xEADFBF, acc:"#F2D79A" },
  otono:    { sky:"#F8E7D4", fog:0xF8E7D4, grass:0xA89A5E, tree:0xC2703F, blossom:0xA8603C,
              sun:0xFFD9A0, sunInt:1.8, amb:0xE8D8C8, ground:0xE4D2B4, acc:"#E0A86F" },
  invierno: { sky:"#E7EFF5", fog:0xE7EFF5, grass:0xEDF3F5, tree:0x2F6B47, blossom:0xFFFFFF,
              sun:0xEAF2FF, sunInt:1.6, amb:0xCFDEE8, ground:0xF2F6F8, acc:"#C6D6DC" }
};

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
