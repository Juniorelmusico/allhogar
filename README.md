# allhogar

Tienda de productos para el hogar con casa 3D interactiva, catálogo por espacio, combos y pedido contra entrega por WhatsApp.

## Estructura

```
index.html            página (solo HTML)
assets/css/           estilos
assets/img/           logo e imagen para compartir
assets/js/config.js   número de WhatsApp
assets/js/datos.js    catálogo de productos y fichas
assets/js/…           tienda, casa 3D, carrito y temporadas
```

## Cambios frecuentes

- **Número de WhatsApp:** `assets/js/config.js`.
- **Agregar, quitar o cambiar precio de un producto:** `assets/js/datos.js`.
- **Temporada con la que abre la página según el mes:** `assets/js/temporadas.js`.
- **Activar Meta Pixel o Google Analytics:** poner los IDs en `assets/js/config.js`.
- **Revisar el catálogo antes de publicar:** `node scripts/validar-datos.mjs`.

## Probar en local

Los módulos JS necesitan un servidor (abrir el archivo con doble clic no funciona):

```
npx serve .
```

## Publicación

Netlify publica la raíz del repositorio cada vez que hay un cambio en `master`.
