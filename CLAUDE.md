# allhogar — contexto para Claude Code

Tienda online de productos para el hogar (dropshipping en Ecuador).
Página en vivo: https://extraordinary-alpaca-fdd668.netlify.app
Repositorio **público**: github.com/Juniorelmusico/allhogar (rama `master`).

Responde siempre en **español**. No inventes datos de productos (medidas, materiales, garantías): si no está en Dropi, no se pone.

> El contexto privado del negocio (flujo de pedidos, pendientes, precios propuestos) está en
> `CLAUDE.local.md`, que **no** se sube a GitHub. Léelo si existe.

---

## 1. Reglas

- **Nada privado en el repositorio**: ni costos, ni fletes, ni ganancias, ni márgenes. El repo es público y Netlify publica la raíz.
- **Pedidos de Dropi:** nunca se crea un pedido en Dropi ni se gasta saldo sin aprobación explícita de Junior.
- **No poner marcas** que no se puedan comprobar. La marca de la tienda es "Selección allhogar".
- **Commits:** sin reescribir el historial (nada de `--amend` ni `push --force`). Trabaja en una rama y pide permiso antes de hacer push a `master`, porque cada push a `master` se publica.
- **La página debe funcionar en celular:** sin scroll horizontal y con la casa completa en pantalla.

---

## 2. Estructura

Sitio estático, sin build ni dependencias locales. Netlify publica la raíz del repositorio en cada push a `master` (1–2 min).

```
index.html              solo el HTML (estructura de la página)
assets/
  css/estilos.css       colores, temas por temporada (claro y oscuro) y diseño
  img/logo.jpg          logo de la tienda
  img/og-image.jpg      imagen que se ve al compartir el enlace (WhatsApp, Facebook…)
  js/config.js          número de WhatsApp, enlace general e IDs de medición
  js/analitica.js       Meta Pixel y Google Analytics (apagados si no hay IDs)
  js/datos.js           CATÁLOGO: productos por espacio (SECTIONS) y fichas (INFO)
  js/temporadas.js      nombres, colores y temporada inicial según el mes
  js/productos.js       consultas puras sobre el catálogo (sin DOM ni 3D)
  js/tienda.js          punto de entrada: temporada, catálogo, ficha y panel
  js/casa3d.js          casa 3D con three.js (se carga aparte)
  js/carrito.js         carrito, formulario y mensaje de WhatsApp
scripts/
  validar-datos.mjs     revisa el catálogo: node scripts/validar-datos.mjs
```

- **Antes de publicar un cambio en `datos.js`, corre `node scripts/validar-datos.mjs`.** Revisa fichas, precios repetidos y que el precio tachado de cada combo sea la suma real de sus partes.
- **Miniaturas:** si la foto de un producto es GIF, la tarjeta usa la primera foto fija de su ficha (`miniatura()` en `productos.js`). El GIF se ve dentro de la ficha.
- **Preguntas frecuentes** (`#ayuda` en `index.html`): solo hechos confirmados. No prometas devoluciones, reembolsos ni garantías que no estén en Dropi.

- **three.js 0.161.0** se carga desde `cdn.jsdelivr.net` con el `importmap` del `<head>`.
- `tienda.js` importa `casa3d.js` de forma dinámica. Si la casa 3D falla (sin WebGL o sin CDN), el catálogo y el carrito siguen funcionando. **No importes `three` ni `casa3d.js` desde la tienda, el catálogo o el carrito.**
- `tienda.js` es dueño del estado (temporada y espacio abierto) y avisa a la casa con `escuchar("temporada" | "espacio", fn)`. La casa llama a `abrirEspacio()` y `cerrarEspacio()`.
- **Imágenes de productos:** se enlazan directo desde el CDN de Dropi (`https://d39ru7awumhhs2.cloudfront.net/ecuador/products/...`). Si una falla, `onerror` muestra el emoji del producto o la quita de la galería.

### Formato de un producto en `datos.js`

```js
{e:"🌸", n:"Humidificador de ambiente floral", p:25.00, s:["primavera","verano"], ref:"151892", img:"https://d39ru7awumhhs2.cloudfront.net/..."}
// combo:
{e:"🐾", n:"Combo Mascota Feliz: ...", p:29.99, s:["todas"], ref:"C2:187738+115656", img:"...", was:34.90, combo:true}
```

- `ref` es el **ID del producto en Dropi**. En los combos es `C#:id+id+id`. El carrito usa `ref` para actualizar nombre y precio.
- `s` son las temporadas en que se muestra: `primavera`, `verano`, `otono`, `invierno` (= Navidad), o `todas`.
- Un producto puede estar en varios espacios; está repetido en cada uno (con los mismos datos).
- La ficha sale de `INFO[ref]`: `d` frase corta, `b` puntos clave, `m` medidas o notas, `g` rutas de fotos en el CDN.
- En los combos, la ficha se arma sola a partir de los productos que incluyen. `was` = suma de los precios por separado, **solo si todas las partes se venden sueltas en la página**. Si no, se omite `was` y el combo se muestra sin precio tachado ni "Ahorras".

### Espacios de la casa (16)

- **Planta baja:** sala, comedor, cocina, baño social, garaje (con carro).
- **Exterior, al frente:** patio, zona BBQ, zona de mascota, entrada del garaje, árbol de Navidad (solo en Navidad).
- **Planta alta:** cuarto de niño y su baño, cuarto de niña y su baño, cuarto matrimonial y baño matrimonial, zona de estudio.

Las claves en el código para el cuarto y baño matrimonial son `papas` y `banoPapas`.

Una etiqueta se oculta si su piso no se ve, si no corresponde a la temporada o si el espacio no tiene productos en esa temporada.

### Temporadas

- La página abre en la temporada del mes (`POR_MES` en `temporadas.js`). Noviembre y diciembre = Navidad.
- Se puede forzar con el enlace: `?temporada=navidad`, `verano`, `primavera` u `otono`. Útil para anuncios.

### Combos actuales

| Código | Combo | Precio |
|---|---|---|
| C1 | Kit Navideño (Papá Noel + lazo + bastones solares), solo Navidad | $56.99 |
| C2 | Mascota Feliz (rascador + cepillo de vapor) | $29.99 |
| C3 | Noches Tranquilas (lámpara de tulipanes + cortina antimosquitos) | $27.99 |
| C4 | Baño Ordenado (organizador + luz de inodoro) | $33.99 |
| C5 | Kit Escolar (pizarra + organizador + tablet), sin precio tachado | $48.99 |
| C6 | Combo Parrillada (parrilla plegable + mesa) | $49.99 |

Si cambias el precio de un producto que está dentro de un combo, recalcula el `was` del combo.

---

## 3. Decisiones ya tomadas

- **Colores:** terracota, salvia, olivo, mostaza y crema (tokens en `estilos.css`).
- **Productos retirados:** el soporte de celular (Dropi 100354, solo para Volvo S90/V90) y el cepillo "Furminator" (Dropi 132381, marca registrada).
- **Nombres corregidos:** "Muñecos navideños x3" (son de poliestireno, no inflables); "Libro mágico de agua" sin cantidad (falta confirmar con el proveedor).
- **Cédula:** opcional en el formulario (en la API de Dropi, `dni` es opcional).
- **Mensaje de WhatsApp:** el panel privado de pedidos lo lee. No cambies ni reordenes sus líneas; si hace falta algo nuevo, agrégalo como línea nueva al final.
- **`og:image`** usa la URL absoluta del sitio. Si cambia el dominio o el nombre en Netlify, actualízala en `index.html`.

---

## 4. Cómo probar los cambios

- **Servidor local:** `npx serve .` (o cualquier servidor estático). Abrir `index.html` con doble clic **no** funciona, porque los módulos JS necesitan http.
- Revisa en ancho de celular (390 px) y de escritorio (1366 px):
  - las tres vistas de piso: Planta baja, Planta alta, Casa completa
  - las cuatro temporadas; en Navidad aparece el árbol con su etiqueta verde
  - que abran la ficha de un producto y la de un combo
  - agregar al carrito y enviar el pedido: debe abrir WhatsApp con el mensaje correcto
  - que no haya scroll horizontal ni errores en la consola
- **Después del push a `master`:** espera 1–2 min y revisa la página en vivo.
