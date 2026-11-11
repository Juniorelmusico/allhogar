/* ==================== CONFIGURACIÓN DE LA TIENDA ==================== */

/* WhatsApp de allhogar: 593 + número sin el 0 inicial */
export const WHATSAPP = "593987884241";

/* Mensaje con el que se abre WhatsApp desde los botones generales */
export const SALUDO_WHATSAPP = "Hola allhogar, quiero hacer un pedido";

export const waLink = (texto = SALUDO_WHATSAPP) =>
  "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto);
