# allhogar — contexto para Claude Code

Tienda online de productos para el hogar (dropshipping en Ecuador) de Junior y su novia.
Página en vivo: https://extraordinary-alpaca-fdd668.netlify.app
Repositorio: github.com/Juniorelmusico/allhogar (rama `master`).

Responde siempre en **español**. No inventes datos de productos (medidas, materiales, garantías): si no está en Dropi, no se pone.

---

## 1. Cómo funciona el negocio

- **Proveedor:** Dropi Ecuador (app.dropi.ec). Ellos tienen el stock, empacan y despachan.
- **Pago:** contra entrega. El cliente paga en efectivo al repartidor.
- **Pedidos:** por WhatsApp al **0987884241** (`593987884241` en formato internacional).
- **Flujo de un pedido:**
  1. El cliente arma su carrito en la página y llena nombre, teléfono, ciudad y dirección.
  2. Se abre WhatsApp con el pedido ya escrito, con un código `AH-XXXXXX`.
  3. Junior confirma por WhatsApp la dirección y que el cliente estará para recibir.
  4. Se crea el pedido en Dropi con **valor a cobrar = precio de la página**.
  5. El proveedor despacha en 24–48 h y la transportadora (Laar, Servientrega o Veloces) entrega en 3–7 días.
  6. Dropi descuenta del cobro el costo del producto y el flete. La ganancia queda en la "Cartera" de Dropi.
  7. Si el cliente rechaza el pedido, Junior pierde el flete. Por eso es clave confirmar bien cada pedido.
- **Precios:** son los sugeridos por Dropi y ya incluyen el flete (unos $4.50–$7 a Quito o Guayaquil).
- **Datos privados:** la tabla de costos, fletes y ganancias por producto **no** va en este repositorio. Está en el doc del proyecto de Claude "ALLHOGAR" (`claude/catalogo-allhogar.md`). Nunca pongas costos ni ganancias en la página pública.
- **Pedidos de Dropi:** nunca se crea un pedido en Dropi ni se gasta saldo sin aprobación explícita de Junior.

---

## 2. Estructura técnica

- **Todo el sitio está en `index.html`** (unas 1.900 líneas), sin build ni dependencias locales.
- **Publicación:** Netlify publica automáticamente cada push a `master`. Tarda 1–2 minutos.
- **Commits:** sin reescribir el historial (nada de `--amend` ni `push --force`).
- **3D:** Three.js 0.161.0 desde `cdn.jsdelivr.net` con importmap, más OrbitControls.
- **Imágenes:** se enlazan directo desde el CDN de Dropi (`https://d39ru7awumhhs2.cloudfront.net/ecuador/products/...`). Si una falla, `onerror` muestra el emoji del producto o la quita de la galería.

### Mapa de `index.html` (números de línea aproximados)

| Qué | Dónde |
|---|---|
| Número de WhatsApp `window.ALLHOGAR_WHATSAPP` | ~línea 11, en `<head>` |
| Colores y tokens CSS; temas por temporada `body[data-tema=...]` con versión oscura | ~20–65 |
| Botones de temporada `data-season` (primavera, verano, otono, invierno = Navidad) | ~427 |
| `<script type="module">` principal | ~500 |
| `SECTIONS`: catálogo por espacio | ~507 |
| `OFF_X/OFF_Z` y `ROOMS`: plano de la casa | ~615–700 |
| `buildRoom()`, `furnish()`: muebles por cuarto; `buildExterior()`: cerca, luces, faroles | ~760–1200 |
| `INFO`: descripciones y galerías por producto (una sola línea JSON) | ~1203 |
| `infoFor()`, `findByRef()`, `itemsFor()` | ~1207–1240 |
| `pickAt()`: clic en cuartos 3D | ~1245 |
| `VIEW`, `fitView()`, `flyTo()`: cámara que se ajusta sola en celular y PC | ~1303–1370 |
| `media()`, `priceHTML()`, `addBtn()`, `comboTag()` | ~1375–1395 |
| Pisos: `EXPLODE`, modos `pb` / `pa` / `both` | ~1428 |
| `PIN_ICON`, `buildPins()`, `updatePins()`: etiquetas flotantes de cada espacio | ~1487–1555 |
| `renderCatalog()`: catálogo debajo de la casa | ~1555 |
| `openDetail()`: ficha de producto (modal) | ~1585 |
| Segundo `<script>` clásico: carrito, `localStorage`, formulario y mensaje de WhatsApp | ~1712 en adelante |

### Formato de un producto en `SECTIONS`

```js
{e:"🌸", n:"Humidificador de ambiente floral", p:25.00, s:["primavera","verano"], ref:"151892", img:"https://d39ru7awumhhs2.cloudfront.net/..."}
// combo:
{e:"🐾", n:"Combo Mascota Feliz: ...", p:29.99, s:["todas"], ref:"C2:187738+115656", img:"...", was:34.90, combo:true}
```

- `ref` es el **ID del producto en Dropi**. En los combos es `C#:id+id+id`.
- `s` son las temporadas en que se muestra: `primavera`, `verano`, `otono`, `invierno`, o `todas`.
- Un producto puede estar en varios espacios; está repetido en cada uno.
- La descripción de la ficha sale de `INFO[ref]` con esta forma:
  - `d`: frase corta
  - `b`: puntos clave
  - `m`: medidas o notas
  - `g`: rutas de fotos relativas al CDN
- En los combos, la ficha se arma sola a partir de los productos que incluyen.

### Espacios de la casa (16)

- **Planta baja:** sala, comedor, cocina, baño social, garaje (con carro).
- **Exterior, al frente:**
  - patio
  - zona BBQ
  - zona de mascota
  - entrada del garaje
  - árbol de Navidad (solo en Navidad, dentro del patio)
- **Planta alta:**
  - cuarto de niño y su baño
  - cuarto de niña y su baño
  - **cuarto matrimonial** y **baño matrimonial** (antes "papás")
  - zona de estudio

Las claves en el código siguen siendo `papas` y `banoPapas`; solo cambió el texto que se muestra.

Una etiqueta se oculta si su piso no se ve, si no corresponde a la temporada o si el espacio no tiene productos en esa temporada.

### Combos actuales

| Código | Combo | Precio |
|---|---|---|
| C1 | Kit Navideño (Papá Noel + lazo + bastones solares), solo Navidad | $64.99 |
| C2 | Mascota Feliz (rascador + cepillo de vapor) | $29.99 |
| C3 | Noches Tranquilas (lámpara de tulipanes + cortina antimosquitos) | $27.99 |
| C4 | Baño Ordenado (organizador + luz de inodoro) | $33.99 |
| C5 | Kit Escolar (pizarra + organizador + tablet) | $54.99 |
| C6 | Combo Parrillada (parrilla plegable + mesa) | $49.99 |

---

## 3. Otras piezas fuera de este repositorio

- **Panel privado de pedidos:** es un artefacto de Claude, aparte. Lee el mensaje de WhatsApp y guarda cada pedido con su estado:
  - nuevo → confirmado → en Dropi → enviado → entregado / devuelto / cancelado

  Calcula costos y ganancia y exporta a CSV. **No debe ir en esta página pública.**
- **Conector Dropi (MCP) en Claude:** lista productos, cotiza fletes, consulta pedidos. Crear pedidos requiere aprobación de Junior.

---

## 4. Decisiones ya tomadas

- **Colores** de la imagen de la ventana: terracota, salvia, olivo, mostaza y crema. El logo va embebido como data URI.
- **Productos retirados:**
  - el soporte de celular (Dropi 100354): solo servía para Volvo S90/V90
  - el cepillo "Furminator" (Dropi 132381): marca registrada, no original
- **No poner marcas** que no se puedan comprobar. La marca de la tienda es "Selección allhogar".
- **Nombres corregidos:**
  - "Muñecos navideños x3": no son inflables, son de poliestireno
  - "Libro mágico de agua" sin cantidad: Dropi dice x4 en el nombre y 1 unidad en la descripción, falta confirmarlo con el proveedor
- **La página debe funcionar en celular:** sin scroll horizontal y con la casa completa en pantalla.

---

## 5. Pendientes (Junior aún no decide)

1. **Envío gratis.** Recomendado: cambiar el texto del carrito, que hoy dice *"El costo de envío te lo confirmamos por WhatsApp"* (busca `note-box`, ~línea 1782), por "🚚 Envío GRATIS a todo el país · Pagas al recibir". Mostrar también "Envío: GRATIS" en el carrito y en el mensaje de WhatsApp. Los precios ya cubren el flete.
2. **Bajar precios** de productos con mucho margen, dejando unos $12 de ganancia:

   | Producto | Precio actual | Precio propuesto |
   |---|---|---|
   | Contenedor de granos | $69 | $37.99 |
   | Pista de dinosaurios | $45 | $29.99 |
   | Juego de cubiertos | $51 | $35.99 |
   | Freidora de aire | $65 | $54.99 |
   | Ropero 3 cuerpos | $45 | $36.99 |
   | Mochila para mascotas | $42 | $33.99 |
   | Kit Navideño (combo) | $64.99 | $56.99 |
   | Aspiradora 3 en 1 | $35 | $27.99 |
   | Alas de mariposa | $32.99 | $26.99 |
   | Kit Escolar (combo) | $54.99 | $48.99 |
   | Lámpara solar | $45 | $40.99 |

   Si bajas un producto que está dentro de un combo, recalcula el `was` del combo.
3. **Quitar el distintivo "Powered by Netlify"** (lo hace Junior en Netlify → Project configuration → General) y **cambiar el nombre del sitio a "allhogar"**.
4. Probar un pedido real desde el celular.
5. Ideas y textos para la publicidad.

---

## 6. Cómo probar los cambios

- **Servidor local:** `npx serve .` o `python3 -m http.server`. Abre la página y revisa en ancho de celular (390 px) y de escritorio (1366 px).
- **Qué revisar:**
  - las tres vistas de piso: Planta baja, Planta alta, Casa completa
  - las cuatro temporadas; en Navidad aparece el árbol con su etiqueta verde
  - que abran la ficha de un producto y la de un combo
  - agregar al carrito y enviar el pedido: debe abrir WhatsApp con el mensaje correcto
  - que no haya scroll horizontal ni errores en la consola
- **Después del push:** espera 1–2 min y revisa la página en vivo.
