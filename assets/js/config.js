/* ==================== CONFIGURACIÓN DE LA TIENDA ==================== */

/* WhatsApp de allhogar: 593 + número sin el 0 inicial */
export const WHATSAPP = "593987884241";

/* Mensaje con el que se abre WhatsApp desde los botones generales */
export const SALUDO_WHATSAPP = "Hola allhogar, quiero hacer un pedido";

/* Medición de anuncios. Vacíos = apagado (no se carga nada externo).
   META_PIXEL_ID: Administrador de eventos de Meta → Orígenes de datos → ID del píxel (solo números).
   GA_ID: Google Analytics → Administrar → Flujos de datos → ID de medición (empieza con "G-"). */
export const META_PIXEL_ID = "";
export const GA_ID = "";

export const waLink =(texto = SALUDO_WHATSAPP) =>
  "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto);
