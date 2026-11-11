/* ==================== CASA 3D — VERSIÓN DIORAMA (prototipo) ====================
   Igual que casa3d.js, con otro acabado: bordes redondeados, materiales con luz
   ambiental realista, pisos de madera y baldosa, isla de césped tipo maqueta,
   cielo degradado y dibujo "a pedido" (solo cuando algo cambia) para gastar
   menos batería. Se ve con ?casa=diorama en el enlace. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { SECTIONS, ICONOS } from "./datos.js";
import { SEASON_THEME } from "./temporadas.js";
import { itemsFor } from "./productos.js";

let tienda = null;                     // se recibe en iniciarCasa()

/* ==================== PLANO DE LA CASA ====================
   Coordenadas del plano: X 0→16, Z 0→12. La casa ocupa Z 0→6,
   el exterior (patio y mascota) ocupa Z 6→12.                */
const OFF_X = -11, OFF_Z = -6;       // para centrar la escena (lote de 22 x 12)
const SLAB  = 0.18;                  // grosor de losa
const WALL_H = 1.35;                 // alto de muros (medio muro, vista casa de muñecas)
const UP_Y  = 1.95;                  // altura de la planta alta

const ROOMS = [
  // --- planta baja ---
  { sec:"sala",    lvl:0, x0:0,  z0:0,   x1:6,  z1:6,  color:0xF2EADA },
  { sec:"comedor", lvl:0, x0:6,  z0:0,   x1:11, z1:6,  color:0xEFE6D2 },
  { sec:"cocina",  lvl:0, x0:11, z0:0,   x1:16, z1:3.5,color:0xEDE4CE },
  { sec:"banoSocial", lvl:0, x0:11, z0:3.5, x1:16, z1:6,  color:0xDDEAEC, bath:true },
  { sec:"garaje",  lvl:0, x0:16, z0:0,   x1:22, z1:6,  color:0xC9C6BF },
  // --- exterior ---
  { sec:"patio",   lvl:0, x0:0,  z0:6,   x1:8,  z1:12, open:true },
  { sec:"bbq",     lvl:0, x0:8,  z0:6,   x1:12.5, z1:12, open:true, floor:0xC9A27A },
  { sec:"mascota", lvl:0, x0:12.5, z0:6, x1:16, z1:12, open:true },
  { sec:"garaje",  lvl:0, x0:16, z0:6,   x1:22, z1:12, open:true, floor:0xB9B6AF, driveway:true },
  // --- planta alta ---
  { sec:"nino",    lvl:1, x0:0,  z0:0,   x1:5,  z1:4,  color:0xE6EFF2 },
  { sec:"banoNino",   lvl:1, x0:0,  z0:4,   x1:5,  z1:6,  color:0xDCEEE4, bath:true },
  { sec:"nina",    lvl:1, x0:5,  z0:0,   x1:10, z1:4,  color:0xF6E8EC },
  { sec:"banoNina",   lvl:1, x0:5,  z0:4,   x1:10, z1:6,  color:0xF2E4EA, bath:true },
  { sec:"papas",   lvl:1, x0:10, z0:0,   x1:16, z1:4,  color:0xF0E9DC },
  { sec:"banoPapas",  lvl:1, x0:10, z0:4,   x1:16, z1:6,  color:0xDDEAEC, bath:true },
  { sec:"estudio", lvl:1, x0:16, z0:0,   x1:22, z1:6,  color:0xEAF0E4 }
];

/* ==================== ESCENA ==================== */
const canvas = document.getElementById("c");
const wrap   = document.getElementById("sceneWrap");

let renderer, scene, camera, controls, raycaster, pointer;
let houseGroup, floorGroups = {0:null, 1:null}, roofGroup;
let sunLight, ambLight, hemiLight;
let seasonMats = { grass:null, tree:[], blossom:[], ground:null };
let summerObjects = [], springObjects = [], winterObjects = [];
let snow = null;
let clickTargets = [], roomRegistry = {};
let season = "primavera";             // copia local de la temporada de la tienda
let selected = null, hovered = null;  // espacio resaltado / bajo el puntero

function initThree(){
  // en celulares se dibuja con menos resolución y sombras más livianas:
  // se ve casi igual y va más fluido en equipos económicos
  const celular = window.innerWidth < 760;
  renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:!celular || window.devicePixelRatio < 2, powerPreference:"high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, celular ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);               // el cielo es un degradado CSS detrás del lienzo
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  // luz ambiental de "estudio fotográfico": da reflejos suaves y volumen a todo
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  camera.position.set(19, 16, 19);

  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.8, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 8;
  controls.maxDistance = 90;
  controls.maxPolarAngle = Math.PI * 0.46;   // no pasar bajo el suelo
  controls.minPolarAngle = Math.PI * 0.10;
  controls.autoRotateSpeed = 0.7;

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  // luces
  hemiLight = new THREE.HemisphereLight(0xffffff, 0xc9bda8, 0.35);
  scene.add(hemiLight);

  ambLight = new THREE.AmbientLight(0xBFD9E8, 0.12);
  scene.add(ambLight);

  sunLight = new THREE.DirectionalLight(0xFFF4D6, 2.0);
  sunLight.position.set(16, 22, 11);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(celular ? 1024 : 2048, celular ? 1024 : 2048);
  const d = 20;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 60;
  sunLight.shadow.bias = -0.0008;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);
  scene.add(sunLight.target);
  sunLight.target.position.set(0, 0, 0);
}

/* ---------- helpers de geometría ---------- */
function mat(color, opts = {}){
  return new THREE.MeshStandardMaterial(Object.assign({ color, roughness:.78, metalness:0, envMapIntensity:.55 }, opts));
}
/* cajas con bordes redondeados (cacheadas por tamaño para no repetir geometrías) */
const geoCache = new Map();
function roundedBox(w, h, d){
  const r = Math.min(.07, Math.min(w, h, d) * .3);
  const key = [w, h, d].map(v => v.toFixed(3)).join("|");
  if (!geoCache.has(key))
    geoCache.set(key, r < .012 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, r));
  return geoCache.get(key);
}
function box(w, h, d, color, x, y, z, parent, opts = {}){
  const m = new THREE.Mesh(roundedBox(w, h, d), color.isMaterial ? color : mat(color, opts));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  (parent || scene).add(m);
  return m;
}
function cyl(rt, rb, h, color, x, y, z, parent, seg = 14){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, Math.max(seg, 20)), color.isMaterial ? color : mat(color));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  (parent || scene).add(m);
  return m;
}
function sphere(r, color, x, y, z, parent){
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), color.isMaterial ? color : mat(color, { flatShading:true }));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  (parent || scene).add(m);
  return m;
}
/* ---------- texturas dibujadas en el momento (no se descarga nada) ---------- */
function texturaCanvas(dibujar, tam = 256){
  const c = document.createElement("canvas"); c.width = c.height = tam;
  dibujar(c.getContext("2d"), tam);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// tablones de madera clara (el color del cuarto se multiplica encima)
const TEX_MADERA = texturaCanvas((g, s) => {
  g.fillStyle = "#f3e6d0"; g.fillRect(0, 0, s, s);
  const filas = 6, alto = s / filas;
  for (let i = 0; i < filas; i++){
    const off = (i % 2) * s * .45;
    for (let k = -1; k < 3; k++){
      const x = off + k * s * .9;
      g.fillStyle = `hsl(32, 38%, ${80 + ((i * 7 + k * 3) % 5) * 2.2}%)`;
      g.fillRect(x + 1, i * alto + 1, s * .9 - 2, alto - 2);
    }
    g.fillStyle = "rgba(120,80,40,.18)"; g.fillRect(0, i * alto, s, 1.5);
  }
  for (let n = 0; n < 220; n++){             // vetas
    g.fillStyle = `rgba(140,95,55,${Math.random() * .06})`;
    g.fillRect(Math.random() * s, Math.random() * s, 18 + Math.random() * 40, 1);
  }
});
// baldosa blanca para cocina y baños
const TEX_BALDOSA = texturaCanvas((g, s) => {
  g.fillStyle = "#fbfaf6"; g.fillRect(0, 0, s, s);
  const n = 4, l = s / n;
  g.strokeStyle = "rgba(150,140,125,.35)"; g.lineWidth = 2;
  for (let i = 0; i <= n; i++){
    g.beginPath(); g.moveTo(i * l, 0); g.lineTo(i * l, s); g.stroke();
    g.beginPath(); g.moveTo(0, i * l); g.lineTo(s, i * l); g.stroke();
  }
});
// césped con matices
const TEX_CESPED = texturaCanvas((g, s) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, s, s);
  for (let n = 0; n < 1400; n++){
    const v = 82 + Math.random() * 18;
    g.fillStyle = `hsl(0,0%,${v}%)`;
    g.fillRect(Math.random() * s, Math.random() * s, 2, 3 + Math.random() * 4);
  }
});
/* color de la isla: el verde del césped de la temporada, un poco más claro */
const colorIsla = t => new THREE.Color(t.grass).lerp(new THREE.Color(t.ground), .3);
function pisoMat(color, tex, w, d, escala = 1.6){
  const t = tex.clone(); t.needsUpdate = true;
  t.repeat.set(w / escala, d / escala);
  return mat(color, { map:t, roughness:.62 });
}

const px = v => v + OFF_X;      // plano → mundo
const pz = v => v + OFF_Z;

/* ==================== CONSTRUCCIÓN ==================== */
function buildWorld(){
  houseGroup = new THREE.Group();
  scene.add(houseGroup);

  // --- terreno: isla tipo maqueta (césped arriba, tierra a los lados) ---
  const groundMat = mat(colorIsla(SEASON_THEME[season]), { map: (() => { const t = TEX_CESPED.clone(); t.needsUpdate = true; t.repeat.set(10, 10); return t; })(), roughness:.95 });
  seasonMats.ground = groundMat;
  const tierra = mat(0x9A6B47, { roughness:.95 });
  const tierraOsc = mat(0x7A5236, { roughness:1 });
  const isla = new THREE.Mesh(new THREE.CylinderGeometry(20, 19.2, 1.0, 72), [tierra, groundMat, tierraOsc]);
  isla.position.set(0, -0.6, 0);
  isla.receiveShadow = true;
  houseGroup.add(isla);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(19.2, 17.6, 1.2, 72), tierraOsc);
  base.position.set(0, -1.7, 0);
  houseGroup.add(base);

  // --- césped del patio ---
  const grassMat = mat(SEASON_THEME[season].grass, { map: (() => { const t = TEX_CESPED.clone(); t.needsUpdate = true; t.repeat.set(3, 3); return t; })(), roughness:.95 });
  seasonMats.grass = grassMat;

  floorGroups[0] = new THREE.Group();
  floorGroups[1] = new THREE.Group();
  houseGroup.add(floorGroups[0], floorGroups[1]);

  ROOMS.forEach(r => buildRoom(r, grassMat));

  buildExterior(grassMat);
  buildRoof();
}

function buildRoom(r, grassMat){
  const w = r.x1 - r.x0, d = r.z1 - r.z0;
  const cxp = px((r.x0 + r.x1) / 2), czp = pz((r.z0 + r.z1) / 2);
  const baseY = r.lvl === 0 ? 0 : UP_Y;

  const g = new THREE.Group();
  g.userData.sec = r.sec;
  g.userData.lvl = r.lvl;

  // losa / piso
  const conBaldosa = r.bath || r.sec === "cocina";
  const floorMat = r.open ? (r.floor ? mat(r.floor) : grassMat)
    : r.sec === "garaje" ? mat(r.color)
    : pisoMat(r.color, conBaldosa ? TEX_BALDOSA : TEX_MADERA, w, d, conBaldosa ? 1.2 : 1.8);
  const slab = box(w, SLAB, d, floorMat, cxp, baseY + SLAB / 2, czp, g);
  slab.userData.sec = r.sec;
  slab.userData.baseColor = r.open ? null : r.color;
  if (!r.open) slab.userData.tintable = true;

  // muros (solo para espacios cerrados), hacia adentro del cuarto
  if (!r.open){
    const t = 0.2, h = WALL_H, y = baseY + SLAB + h / 2;
    const wallMat = mat(0xFBF6EC, { roughness:.9 });
    const wallMatB = mat(0xF1E7D6, { roughness:.9 });
    const remate = mat(0xC9B79C, { roughness:.7 });       // borde superior de los muros, tipo maqueta
    box(w, h, t, wallMat,  cxp, y, czp - d/2 + t/2, g);   // norte
    box(w, h, t, wallMatB, cxp, y, czp + d/2 - t/2, g);   // sur
    box(t, h, d, wallMatB, cxp - w/2 + t/2, y, czp, g);   // oeste
    box(t, h, d, wallMat,  cxp + w/2 - t/2, y, czp, g);   // este
    const yt = baseY + SLAB + h + .03;
    box(w, .06, t + .04, remate, cxp, yt, czp - d/2 + t/2, g);
    box(w, .06, t + .04, remate, cxp, yt, czp + d/2 - t/2, g);
    box(t + .04, .06, d, remate, cxp - w/2 + t/2, yt, czp, g);
    box(t + .04, .06, d, remate, cxp + w/2 - t/2, yt, czp, g);
  } else {
    // borde bajito para el exterior
    const t = 0.18, h = 0.26, y = baseY + SLAB + h/2;
    const edge = mat(0xD9CDB4);
    if (!r.driveway){
      box(w, h, t, edge, cxp, y, czp + d/2 - t/2, g);
      box(t, h, d, edge, cxp - w/2 + t/2, y, czp, g);
      box(t, h, d, edge, cxp + w/2 - t/2, y, czp, g);
    }
  }

  furnish(r, g, cxp, czp, baseY + SLAB, w, d);

  floorGroups[r.lvl].add(g);
  clickTargets.push(g);
  if (!roomRegistry[r.sec]) roomRegistry[r.sec] = [];
  roomRegistry[r.sec].push(g);
}

/* ---------- muebles por espacio ---------- */
function furnish(r, g, cx, cz, y, w, d){
  const madera   = mat(0xA9794E);
  const maderaOs = mat(0x8C5E3C);
  const tela     = mat(0x9DB39A);
  const blanco   = mat(0xFAFAF7);
  const mostaza  = mat(0xE3AE4F);
  const terra    = mat(0xC57A52);
  const gris     = mat(0xCFCBC2);

  if (r.driveway){
    // entrada de autos: líneas y bordillo
    for (let i = 0; i < 4; i++) box(.12, .02, 1.0, mat(0xF4F1EA), cx, y + .01, cz - 2.2 + i * 1.5, g);
    return;
  }
  switch (r.sec){
    case "garaje": {
      // carro
      const car = new THREE.Group();
      const pintura = mat(0x4E7FA8), vidrio = mat(0x2B3A44), llanta = mat(0x2A2623);
      box(2.0, .55, 3.7, pintura, 0, .55, 0, car);
      box(1.75, .5, 1.9, vidrio, 0, 1.05, -.15, car);
      box(1.8, .08, 1.95, pintura, 0, 1.33, -.15, car);
      [[-.95, 1.2], [.95, 1.2], [-.95, -1.2], [.95, -1.2]].forEach(([ox, oz]) => {
        const w0 = cyl(.36, .36, .28, llanta, ox, .36, oz, car, 16); w0.rotation.z = Math.PI / 2;
      });
      [[-.65, 1.86], [.65, 1.86]].forEach(([ox, oz]) => box(.35, .14, .05, new THREE.MeshBasicMaterial({ color:0xFFF2B0 }), ox, .7, oz, car));
      [[-.65, -1.86], [.65, -1.86]].forEach(([ox, oz]) => box(.35, .12, .05, mat(0xB23A3A), ox, .7, oz, car));
      car.position.set(cx - .4, y, cz + .3);
      g.add(car);
      // repisa con herramientas y llantas
      box(2.6, .9, .45, mat(0x8C5E3C), cx + 1.4, y + .45, cz - 2.6, g);
      [[.6, 0xB23A3A], [1.2, 0xE3AE4F], [1.8, 0x6E8A5E]].forEach(([ox, c]) => box(.4, .3, .3, mat(c), cx + ox + .2, y + 1.05, cz - 2.6, g));
      [0, .3].forEach(oy => { const t0 = cyl(.42, .42, .26, llanta, cx + 2.35, y + .13 + oy, cz + 2.2, g, 16); });
      break;
    }
    case "bbq": {
      // parrilla
      const parr = new THREE.Group();
      [[-.35, -.2], [.35, -.2], [-.35, .2], [.35, .2]].forEach(([ox, oz]) => cyl(.04, .04, .8, mat(0x3B3027), ox, .4, oz, parr));
      box(1.0, .35, .6, mat(0x2E2A27), 0, .95, 0, parr);
      box(1.02, .04, .62, mat(0x6B6258), 0, 1.14, 0, parr);
      [-.3, 0, .3].forEach(ox => box(.18, .06, .5, new THREE.MeshBasicMaterial({ color:0xE0702F }), ox, 1.17, 0, parr));
      cyl(.07, .07, .7, mat(0x3B3027), .4, 1.5, -.25, parr);
      parr.position.set(cx - 1.0, y, cz - 2.0);
      g.add(parr);
      // mesa de picnic con bancas
      box(2.0, .08, .9, mat(0xA9794E), cx + .5, y + .75, cz + .7, g);
      [-.8, .8].forEach(ox => box(.08, .72, .8, mat(0x8C5E3C), cx + .5 + ox, y + .38, cz + .7, g));
      [-.75, .75].forEach(oz => box(2.0, .07, .3, mat(0xA9794E), cx + .5, y + .45, cz + .7 + oz, g));
      // pérgola
      [[-1.6, -.6], [1.6, -.6], [-1.6, 2.0], [1.6, 2.0]].forEach(([ox, oz]) => box(.12, 2.2, .12, mat(0x8C5E3C), cx + .5 + ox, y + 1.1, cz + .7 + oz - .7, g));
      for (let i = 0; i < 6; i++) box(3.4, .07, .1, mat(0xA9794E), cx + .5, y + 2.22, cz - .6 + i * .52, g);
      // saco de carbón
      box(.4, .5, .3, mat(0x2E2A27), cx - 1.9, y + .25, cz - 1.0, g);
      break;
    }
    case "estudio": {
      // dos escritorios con silla y laptop
      [-1.4, 1.4].forEach(ox => {
        box(1.7, .07, .75, mat(0xF4F1EA), cx + ox, y + .74, cz - 2.1, g);
        [-.75, .75].forEach(lx => box(.06, .72, .7, mat(0xCFCBC2), cx + ox + lx, y + .37, cz - 2.1, g));
        box(.6, .04, .42, mat(0x3B3027), cx + ox, y + .79, cz - 2.15, g);
        box(.6, .38, .03, mat(0x3B3027), cx + ox, y + .98, cz - 2.36, g);
        box(.5, .08, .5, mat(ox < 0 ? 0x7FA9C4 : 0xE0A9BC), cx + ox, y + .46, cz - 1.35, g);
        box(.5, .5, .06, mat(ox < 0 ? 0x7FA9C4 : 0xE0A9BC), cx + ox, y + .74, cz - 1.12, g);
      });
      // librero con libros de colores
      box(.45, 1.5, 1.6, mat(0xA9794E), cx + 2.6, y + .75, cz + 1.0, g);
      [0xB23A3A, 0xE3AE4F, 0x6E8A5E, 0x4E7FA8, 0xC57A52].forEach((c, i) => box(.3, .32, .14, mat(c), cx + 2.45, y + .35 + (i % 3) * .45, cz + .5 + i * .2, g));
      // pizarra en la pared
      box(.06, .9, 1.6, mat(0xFFFFFF), cx - 2.85, y + 1.0, cz + .6, g);
      box(.07, 1.0, 1.7, mat(0x8C5E3C), cx - 2.88, y + 1.0, cz + .6, g);
      // globo terráqueo y alfombra
      cyl(.05, .12, .3, mat(0x8C5E3C), cx + 1.4, y + .9, cz - 2.0, g);
      sphere(.2, mat(0x4E9AC4), cx + 1.4, y + 1.2, cz - 2.0, g);
      box(2.6, .02, 1.8, mat(0xE3AE4F), cx - .2, y + .01, cz + 1.0, g);
      break;
    }
    case "sala": {
      // sofá
      box(2.6, .45, 1.1, terra, cx - .6, y + .3, cz - 1.4, g);
      box(2.6, .55, .28, terra, cx - .6, y + .62, cz - 1.9, g);
      box(.3, .5, 1.1, terra, cx - 1.85, y + .55, cz - 1.4, g);
      box(.3, .5, 1.1, terra, cx + .65, y + .55, cz - 1.4, g);
      // mesa de centro + alfombra
      box(3.2, .04, 2.2, mat(0xE8DCC4), cx - .6, y + .03, cz + .1, g);
      box(1.3, .35, .8, madera, cx - .6, y + .22, cz + .1, g);
      // mueble de TV + TV
      box(2.2, .5, .4, maderaOs, cx - .6, y + .3, cz + 1.9, g);
      box(1.9, 1.0, .08, mat(0x3B3027), cx - .6, y + 1.05, cz + 1.95, g);
      // planta
      cyl(.22, .26, .3, terra, cx + 2.1, y + .15, cz + 1.6, g);
      sphere(.42, mat(0x6E8A5E), cx + 2.1, y + .62, cz + 1.6, g);
      // lámpara de pie
      cyl(.05, .05, 1.3, gris, cx + 2.1, y + .65, cz - 1.9, g);
      cyl(.3, .22, .38, mostaza, cx + 2.1, y + 1.45, cz - 1.9, g);
      break;
    }
    case "comedor": {
      box(2.6, .1, 1.4, madera, cx, y + .75, cz, g);
      [-1.1, 1.1].forEach(ox => [-.5, .5].forEach(oz =>
        cyl(.07, .07, .75, maderaOs, cx + ox, y + .37, cz + oz, g)));
      // sillas
      [-1.6, 1.6].forEach(ox => [-.45, .45].forEach(oz => {
        box(.5, .08, .5, mat(0xDCCFB6), cx + ox, y + .46, cz + oz, g);
        box(.5, .55, .08, mat(0xDCCFB6), cx + ox + (ox > 0 ? .21 : -.21), y + .74, cz + oz, g);
        cyl(.04, .04, .46, maderaOs, cx + ox, y + .23, cz + oz, g);
      }));
      // aparador y frutero
      box(1.8, .75, .45, maderaOs, cx, y + .37, cz + 2.4, g);
      sphere(.2, mostaza, cx, y + .9, cz + 2.4, g);
      break;
    }
    case "cocina": {
      // mesón en L
      box(w - .6, .85, .65, blanco, cx, y + .42, cz - 1.1, g);
      box(.65, .85, 2.0, blanco, cx + w/2 - .55, y + .42, cz + .2, g);
      box(w - .6, .08, .68, mat(0x6B6258), cx, y + .89, cz - 1.1, g);
      // alacenas
      box(w - 1.2, .6, .35, mat(0xE2D6BE), cx, y + 1.75, cz - 1.3, g);
      // refrigeradora
      box(.9, 1.9, .8, mat(0xE9E6DF), cx - w/2 + .75, y + .95, cz + .9, g);
      box(.06, .5, .06, gris, cx - w/2 + 1.18, y + 1.3, cz + .52, g);
      // olla y fruta
      cyl(.18, .18, .2, gris, cx - .4, y + .99, cz - 1.1, g);
      sphere(.13, terra, cx + .5, y + .97, cz - 1.05, g);
      break;
    }
    case "banoSocial": case "banoNino": case "banoNina": case "banoPapas": {
      const sx = Math.min(w, d);
      // inodoro
      box(.45, .4, .55, blanco, cx - sx * .22, y + .2, cz, g);
      box(.42, .45, .18, blanco, cx - sx * .22, y + .42, cz - .3, g);
      // lavamanos
      box(.6, .75, .4, blanco, cx + sx * .2, y + .37, cz - .5, g);
      cyl(.22, .22, .12, mat(0xF2F2EE), cx + sx * .2, y + .78, cz - .5, g);
      // ducha
      box(.9, .06, .9, mat(0xCFE0E4), cx + sx * .2, y + .03, cz + .8, g);
      cyl(.04, .04, 1.3, gris, cx + sx * .2, y + .68, cz + 1.2, g);
      // toalla
      box(.1, .5, .35, mostaza, cx - sx * .42, y + .8, cz + .6, g);
      break;
    }
    case "nino": {
      box(1.0, .35, 1.9, mat(0x7FA9C4), cx - 1.1, y + .3, cz, g);     // cama
      box(1.0, .12, .45, blanco, cx - 1.1, y + .53, cz - .62, g);     // almohada
      box(1.05, .5, .1, madera, cx - 1.1, y + .5, cz - .95, g);       // respaldo
      box(.9, .5, .5, mat(0xE3AE4F), cx + 1.2, y + .25, cz - 1.0, g); // baúl
      box(.8, 1.4, .4, maderaOs, cx + 1.3, y + .7, cz + 1.2, g);      // estante
      sphere(.22, mat(0xC57A52), cx + 1.3, y + .22, cz + .4, g);      // pelota
      break;
    }
    case "nina": {
      box(1.0, .35, 1.9, mat(0xE0A9BC), cx - 1.1, y + .3, cz, g);
      box(1.0, .12, .45, blanco, cx - 1.1, y + .53, cz - .62, g);
      box(1.05, .55, .1, mat(0xF2D79A), cx - 1.1, y + .52, cz - .95, g);
      box(1.0, .75, .45, blanco, cx + 1.3, y + .37, cz - 1.0, g);     // tocador
      box(.6, .8, .06, mat(0xDCE9EC), cx + 1.3, y + 1.15, cz - 1.18, g); // espejo
      cyl(.18, .22, .25, terra, cx + 1.3, y + .12, cz + 1.3, g);      // maceta
      sphere(.3, mat(0x8FB87A), cx + 1.3, y + .45, cz + 1.3, g);
      break;
    }
    case "papas": {
      box(2.0, .4, 2.1, mat(0xB7A68C), cx - .6, y + .32, cz + .1, g); // cama matrimonial
      box(.8, .14, .5, blanco, cx - 1.05, y + .59, cz - .62, g);
      box(.8, .14, .5, blanco, cx - .15, y + .59, cz - .62, g);
      box(2.1, .65, .12, maderaOs, cx - .6, y + .6, cz - .99, g);
      box(.5, .45, .4, madera, cx + .75, y + .22, cz - .8, g);        // velador
      cyl(.14, .1, .25, mostaza, cx + .75, y + .57, cz - .8, g);      // lámpara
      box(.5, 1.8, 1.4, maderaOs, cx + w/2 - .45, y + .9, cz + 1.0, g); // armario
      break;
    }
    case "patio": {
      // árboles en las esquinas
      [[-2.8, 2.0], [3.2, -2.0]].forEach(([ox, oz]) => {
        cyl(.18, .24, 1.1, mat(0x8C5E3C), cx + ox, y + .55, cz + oz, g);
        const crown = sphere(.95, mat(SEASON_THEME[season].tree), cx + ox, y + 1.6, cz + oz, g);
        seasonMats.tree.push(crown.material);
        const bl = sphere(.42, mat(SEASON_THEME[season].blossom), cx + ox + .55, y + 2.0, cz + oz - .35, g);
        seasonMats.blossom.push(bl.material);
        springObjects.push(bl);
      });
      // mesa de jardín con sombrilla (verano)
      cyl(.08, .08, .6, gris, cx - 2.0, y + .3, cz - 1.6, g);
      cyl(.65, .65, .08, blanco, cx - 2.0, y + .62, cz - 1.6, g);
      [-2.8, -1.2].forEach(ox => box(.45, .06, .45, mat(0xDCCFB6), cx + ox, y + .35, cz - 1.0, g));
      const umb = new THREE.Group();
      cyl(.05, .05, 2.0, gris, cx - 2.0, y + 1.0, cz - 1.6, umb);
      cyl(1.4, 0.05, .5, mat(0xC57A52), cx - 2.0, y + 2.05, cz - 1.6, umb, 10);
      g.add(umb); summerObjects.push(umb);
      // macetas con flores (primavera y verano)
      [[-3.6, -.3], [-3.6, .6]].forEach(([ox, oz], i) => {
        cyl(.22, .26, .35, terra, cx + ox, y + .17, cz + oz, g);
        springObjects.push(sphere(.26, mat([0xE9A7BE, 0xF2D79A][i]), cx + ox, y + .52, cz + oz, g));
      });
      // camino de piedra desde la casa
      for (let i = 0; i < 5; i++)
        box(.9, .06, .6, mat(0xD9CDB4), cx + .2, y + .03, cz - 2.4 + i * 1.15, g);

      // ---- árbol de Navidad: espacio propio y clicable (solo en Navidad) ----
      const nav = new THREE.Group();
      nav.userData.sec = "navidad";
      const tx = cx + 2.0, tz = cz + 1.3;
      cyl(.18, .2, .45, mat(0x6B4A2F), tx, y + .22, tz, nav);
      const pino = mat(0x1F5E3D);
      [[1.15, .95, .7], [.9, .8, 1.4], [.62, .65, 2.0]].forEach(([r0, h, yy]) => {
        const c = new THREE.Mesh(new THREE.ConeGeometry(r0, h, 14), pino);
        c.position.set(tx, y + yy, tz); c.castShadow = true; c.receiveShadow = true; nav.add(c);
      });
      const estrella = new THREE.Mesh(new THREE.OctahedronGeometry(.2), new THREE.MeshBasicMaterial({ color:0xFFD75E }));
      estrella.position.set(tx, y + 2.5, tz); nav.add(estrella);
      // esferas alrededor del árbol (no solo de frente)
      const cols = [0xB23A3A, 0xD9B44A, 0x6FA8DC, 0xFFFFFF];
      [[.9, .8], [.72, 1.25], [.5, 1.7], [.3, 2.1]].forEach(([rad, yy], k) => {
        for (let i = 0; i < 6; i++){
          const ang = i / 6 * Math.PI * 2 + k * .5;
          sphere(.09, new THREE.MeshBasicMaterial({ color: cols[(i + k) % 4] }), tx + Math.cos(ang) * rad, y + yy, tz + Math.sin(ang) * rad, nav);
        }
      });
      // regalos al pie del árbol
      [[-.95, .35, 0xB23A3A, .42], [.95, .3, 0x2F7A4F, .38], [0, 1.0, 0xD9B44A, .34], [-.5, -.9, 0x4E7FA8, .3]].forEach(([ox, oz, col, sz]) => {
        box(sz, sz, sz, mat(col), tx + ox, y + sz/2, tz + oz, nav);
        box(sz + .03, .05, .09, mat(0xF6F2E8), tx + ox, y + sz, tz + oz, nav);
      });
      // muñeco de nieve
      const nx = cx - .9, nz = cz + 1.6, nieve = mat(0xFBFDFF);
      sphere(.45, nieve, nx, y + .42, nz, nav);
      sphere(.32, nieve, nx, y + 1.0, nz, nav);
      sphere(.23, nieve, nx, y + 1.42, nz, nav);
      cyl(.3, .3, .05, mat(0x3B3027), nx, y + 1.6, nz, nav);
      cyl(.18, .18, .28, mat(0x3B3027), nx, y + 1.75, nz, nav);
      const nariz = new THREE.Mesh(new THREE.ConeGeometry(.05, .22, 8), mat(0xE07A2F));
      nariz.position.set(nx, y + 1.42, nz + .25); nariz.rotation.x = Math.PI / 2; nav.add(nariz);

      nav.visible = false;
      floorGroups[0].add(nav);
      winterObjects.push(nav);
      clickTargets.push(nav);
      roomRegistry.navidad = [nav];
      break;
    }
    case "mascota": {
      // casita del perro
      box(1.5, .9, 1.4, mat(0xC57A52), cx - .2, y + .45, cz - 1.4, g);
      const roofA = box(1.7, .12, .95, mat(0x8C5E3C), cx - .2, y + 1.08, cz - 1.7, g);
      roofA.rotation.x = -0.6;
      const roofB = box(1.7, .12, .95, mat(0x8C5E3C), cx - .2, y + 1.08, cz - 1.1, g);
      roofB.rotation.x = 0.6;
      box(.5, .6, .1, mat(0x6B5B49), cx - .2, y + .3, cz - .7, g);
      // platos
      cyl(.24, .28, .14, mat(0x9DB39A), cx + 1.1, y + .07, cz - .1, g);
      cyl(.24, .28, .14, mat(0xE3AE4F), cx + 1.1, y + .07, cz + .5, g);
      // hueso
      box(.4, .1, .1, blanco, cx + .4, y + .05, cz + 1.4, g);
      sphere(.1, blanco, cx + .22, y + .07, cz + 1.4, g);
      sphere(.1, blanco, cx + .58, y + .07, cz + 1.4, g);
      // rascador
      box(.7, .1, .7, mat(0xC9BDA8), cx - .6, y + .05, cz + 2.2, g);
      cyl(.16, .16, 1.1, mat(0xB7A68C), cx - .6, y + .6, cz + 2.2, g);
      box(.8, .12, .8, mat(0xC9BDA8), cx - .6, y + 1.2, cz + 2.2, g);
      break;
    }
  }
}

/* ---------- exterior: cerco, farolas, entrada ---------- */
let exteriorGroup = null;
function buildExterior(grassMat){
  const g = new THREE.Group();
  exteriorGroup = g;
  const post = mat(0xD9CDB4);
  // cerco frontal (con portón abierto frente a la entrada de autos) y laterales
  for (let x = 0; x <= 16; x += 2) box(.16, .8, .16, post, px(x), 0.4, pz(12.2), g);
  box(16.2, .12, .12, post, px(8), 0.72, pz(12.2), g);
  box(.2, 1.0, .2, post, px(21.9), 0.5, pz(12.2), g);
  for (let z = 6; z <= 12; z += 2){
    box(.16, .8, .16, post, px(-0.2), 0.4, pz(z), g);
    box(.16, .8, .16, post, px(22.2), 0.4, pz(z), g);
  }
  // guirnalda de luces navideñas sobre el cerco
  const luces = new THREE.Group();
  const colores = [0xB23A3A, 0xD9B44A, 0x2F7A4F, 0x6FA8DC];
  for (let i = 0; i <= 32; i++){
    const t = i / 32;
    const m = sphere(.09, new THREE.MeshBasicMaterial({ color: colores[i % 4] }), px(t * 16), 0.82 - Math.sin(t * Math.PI * 8) * 0.10, pz(12.2), luces);
    m.castShadow = false;
  }
  g.add(luces); winterObjects.push(luces);
  // farolas
  [[0.5, 6.6], [16.3, 11.6]].forEach(([x, z]) => {
    cyl(.09, .11, 1.9, mat(0x6B6258), px(x), .95, pz(z), g);
    const lamp = sphere(.22, new THREE.MeshBasicMaterial({ color:0xFFE9A8 }), px(x), 2.0, pz(z), g);
    lamp.castShadow = false;
  });
  decorarIsla(g);
  houseGroup.add(g);
}

/* ---------- vegetación alrededor de la casa (fuera del lote) ---------- */
function decorarIsla(g){
  let semilla = 7;                                       // números "al azar" pero siempre iguales
  const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  const dentroDelLote = (x, z) => Math.abs(x) < 12.4 && Math.abs(z) < 7;
  const hojas = [0x6E9A5A, 0x5E8A4E, 0x7FAA66];
  const flores = [0xE9A7BE, 0xF2D79A, 0xFFFFFF, 0xC57A52];

  for (let i = 0; i < 60; i++){
    const ang = azar() * Math.PI * 2, rad = 12.5 + azar() * 6.6;
    const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
    if (dentroDelLote(x, z) || Math.hypot(x, z) > 18.8) continue;
    const adelante = z > 3;                 // lado de la cámara: nada alto que tape la casa
    const tipo = azar();
    if (tipo < .2 && !adelante){
      // árbol
      const alto = 1.4 + azar() * .9;
      cyl(.14, .2, alto, mat(0x8C5E3C), x, alto / 2, z, g);
      const copa = sphere(.8 + azar() * .45, mat(SEASON_THEME[season].tree), x, alto + .55, z, g);
      seasonMats.tree.push(copa.material);
    } else if (tipo < .7){
      // arbusto (2–3 bolitas); adelante más bajito
      const m = mat(hojas[i % 3]);
      const t = adelante ? .65 : 1;
      for (let k = 0; k < 2 + (i % 2); k++)
        sphere((.32 + azar() * .22) * t, m, x + (azar() - .5) * .6, .3 * t, z + (azar() - .5) * .6, g);
    } else {
      // matita de flores (solo primavera y verano)
      const ramo = new THREE.Group();
      for (let k = 0; k < 5; k++){
        const f = sphere(.09, mat(flores[(i + k) % 4]), x + (azar() - .5) * .7, .14, z + (azar() - .5) * .7, ramo);
        f.castShadow = false;
      }
      g.add(ramo); springObjects.push(ramo);
    }
  }
  // camino de piedras desde la entrada de la casa hasta el borde de la isla
  const piedra = mat(0xD8D0C2, { roughness:.95 });
  for (let k = 0; k < 6; k++){
    const p = cyl(.38, .42, .08, piedra, px(5) + (k % 2 ? .25 : -.25), .04, pz(12.9 + k * .95), g);
    p.castShadow = false;
  }
}

/* ---------- techo ---------- */
function buildRoof(){
  roofGroup = new THREE.Group();
  const roofMat = mat(0xA8603C);
  const h = UP_Y + SLAB + WALL_H;          // altura donde arranca el techo
  const slope = new THREE.BoxGeometry(22.6, .18, 3.9);

  const a = new THREE.Mesh(slope, roofMat);
  a.position.set(px(11), h + .85, pz(1.5));
  a.rotation.x = -0.55;
  a.castShadow = true; a.receiveShadow = true;

  const b = new THREE.Mesh(slope, roofMat);
  b.position.set(px(11), h + .85, pz(4.5));
  b.rotation.x = 0.55;
  b.castShadow = true; b.receiveShadow = true;

  roofGroup.add(a, b);
  // cumbrera
  box(22.8, .2, .3, mat(0x8C5E3C), px(11), h + 1.78, pz(3), roofGroup);
  // chimenea
  box(.7, 1.1, .7, mat(0xC57A52), px(13), h + 1.5, pz(1.6), roofGroup);

  // nieve sobre el techo
  const nieveTecho = new THREE.Group();
  const na = new THREE.Mesh(new THREE.BoxGeometry(22.7, .12, 3.6), mat(0xFBFDFF));
  na.position.set(px(11), h + 1.0, pz(1.45)); na.rotation.x = -0.55; na.receiveShadow = true;
  const nb = new THREE.Mesh(new THREE.BoxGeometry(22.7, .12, 3.6), mat(0xFBFDFF));
  nb.position.set(px(11), h + 1.0, pz(4.55)); nb.rotation.x = 0.55; nb.receiveShadow = true;
  nieveTecho.add(na, nb);
  roofGroup.add(nieveTecho);
  winterObjects.push(nieveTecho);

  roofGroup.visible = false;
  houseGroup.add(roofGroup);
  seasonMats.roof = roofMat;
}

function buildSnow(){
  const N = 600, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++){
    pos[i*3]   = (Math.random() - 0.5) * 34;
    pos[i*3+1] = Math.random() * 16;
    pos[i*3+2] = (Math.random() - 0.5) * 34;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  snow = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xFFFFFF, size: 0.17, transparent: true, opacity: 0.92, depthWrite: false
  }));
  snow.visible = false;
  scene.add(snow);
}

function animateSnow(){
  if (!snow || !snow.visible) return;
  const a = snow.geometry.attributes.position;
  for (let i = 0; i < a.count; i++){
    let y = a.getY(i) - 0.028;
    if (y < -0.5){ y = 15; a.setX(i, (Math.random() - 0.5) * 34); a.setZ(i, (Math.random() - 0.5) * 34); }
    a.setY(i, y);
  }
  a.needsUpdate = true;
}

/* ==================== TEMPORADAS ==================== */
function aplicarTemporada(s){
  season = s;
  const t = SEASON_THEME[s];

  wrap.style.setProperty("--sky", t.sky);
  // cielo: degradado suave detrás del lienzo transparente
  wrap.style.background = `radial-gradient(120% 90% at 50% 0%, #ffffff 0%, ${t.sky} 55%, ${t.sky} 100%)`;
  scene.background = null;
  scene.fog = null;
  pedirDibujo();

  sunLight.color.setHex(t.sun);
  sunLight.intensity = t.sunInt;
  ambLight.color.setHex(t.amb);
  if (seasonMats.grass)  seasonMats.grass.color.setHex(t.grass);
  if (seasonMats.ground) seasonMats.ground.color.copy(colorIsla(t));
  seasonMats.tree.forEach(m => m.color.setHex(t.tree));
  seasonMats.blossom.forEach(m => m.color.setHex(t.blossom));

  // objetos propios de cada temporada
  summerObjects.forEach(o => o.visible = (s === "verano"));
  springObjects.forEach(o => o.visible = (s === "primavera" || s === "verano"));
  winterObjects.forEach(o => o.visible = (s === "invierno"));
  if (snow) snow.visible = (s === "invierno");
}

/* ==================== INTERACCIÓN ==================== */
function setTint(sec, on){
  (roomRegistry[sec] || []).forEach(g => {
    g.children.forEach(ch => {
      if (ch.userData && ch.userData.tintable){
        ch.material.color.setHex(on ? 0xE3AE4F : ch.userData.baseColor);
      }
    });
    g.position.y = on ? 0.12 : 0;
    pedirDibujo();
  });
}

function pickAt(ev){
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const visible = clickTargets.filter(g => g.parent && g.parent.visible);
  const hits = raycaster.intersectObjects(visible, true);
  const shown = o => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  for (const h of hits){
    if (!shown(h.object)) continue;
    let o = h.object;
    while (o && !(o.userData && o.userData.sec)) o = o.parent;
    if (o) return o.userData.sec;
  }
  return null;
}

let downPos = null;
canvas.addEventListener("pointerdown", e => { downPos = { x:e.clientX, y:e.clientY }; });
canvas.addEventListener("pointerup", e => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  downPos = null;
  if (moved > 14) return;                    // fue un giro, no un toque
  const sec = pickAt(e);
  if (sec) selectRoom(sec); else tienda.cerrarEspacio();
});
canvas.addEventListener("pointermove", e => {
  if (downPos) return;
  const sec = pickAt(e);
  canvas.style.cursor = sec ? "pointer" : "grab";
  if (sec !== hovered){
    if (hovered && hovered !== selected) setTint(hovered, false);
    hovered = sec;
    if (hovered && hovered !== selected) setTint(hovered, true);
  }
});

function selectRoom(sec){
  tienda.abrirEspacio(sec);              // la tienda abre el panel y avisa con alCambiarEspacio()
  // en pantallas anchas la cámara vuela al espacio; en celular se queda quieta
  if (viewW >= 760){
    const g = roomRegistry[sec][0];
    const bb = new THREE.Box3().setFromObject(g);
    animateTarget(bb.getCenter(new THREE.Vector3()));
  }
}

/* la tienda abrió (sec) o cerró (null) el panel de un espacio */
function alCambiarEspacio(sec){
  if (selected && selected !== sec) setTint(selected, false);
  selected = sec;
  if (sec){
    // si el espacio está en un piso que no se ve (p. ej. se eligió desde los botones), se cambia de piso
    const g = (roomRegistry[sec] || [])[0];
    let oculto = false; for (let o = g; o; o = o.parent) if (!o.visible) oculto = true;
    if (g && oculto) setFloorMode(g.userData.lvl === 1 ? "pa" : "pb");
    setTint(sec, true);
  }
  requestAnimationFrame(updateViewShift);
}

let targetAnim = null;
function animateTarget(dest){
  targetAnim = { from: controls.target.clone(), to: dest, t: 0 };
}

/* encuadre por piso: objetivo, inclinación y distancia según la forma de la pantalla */
/* encuadre por piso: caja del plano a mostrar (en metros del plano) e inclinación */
const VIEW = {
  pb:   { box:[0, 22, 0, 12.4, 0, 1.6],  elev: 44 },
  pa:   { box:[0, 22, 0, 6,    0, 1.6],  elev: 56 },
  both: { box:[0, 22, 0, 12.4, 0, 5.8],  elev: 38 }
};
function aspectBucket(){
  const a = viewW / viewH;
  return a < 0.62 ? "xs" : a < 0.95 ? "s" : a < 1.5 ? "m" : "l";
}
/* encuadre: distancia mínima para que la caja entre en pantalla, recentrando por la perspectiva */
function fitView(corners, target, dir){
  const f = dir.clone().negate();
  const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
  const u = new THREE.Vector3().crossVectors(r, f).normalize();
  const tV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tH = tV * camera.aspect;
  const narrow = viewW < 760;
  const mh = narrow ? 0.88 : 0.92, mv = narrow ? 0.70 : 0.80;     // deja espacio para tarjetas y botones
  const t = target.clone();
  let d = 0;
  for (let it = 0; it < 4; it++){
    d = 0;
    for (const c of corners){
      const v = c.clone().sub(t), xc = v.dot(r), yc = v.dot(u), zc = v.dot(dir);
      d = Math.max(d, zc + Math.abs(xc) / (tH * mh), zc + Math.abs(yc) / (tV * mv));
    }
    // dónde cae la caja en pantalla con esa distancia, y cuánto está descentrada
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (const c of corners){
      const v = c.clone().sub(t), xc = v.dot(r), yc = v.dot(u), zc = v.dot(dir);
      const nx = xc / ((d - zc) * tH), ny = yc / ((d - zc) * tV);
      x0 = Math.min(x0, nx); x1 = Math.max(x1, nx); y0 = Math.min(y0, ny); y1 = Math.max(y1, ny);
    }
    t.add(r.clone().multiplyScalar((x0 + x1) / 2 * d * tH)).add(u.clone().multiplyScalar((y0 + y1) / 2 * d * tV));
  }
  return { d, target: t };
}
let viewAnim = null;
function flyTo(mode){
  const v = VIEW[mode] || VIEW.pb;
  const [x0, x1, z0, z1, y0, y1] = v.box;
  const corners = [];
  for (const x of [x0, x1]) for (const z of [z0, z1]) for (const y of [y0, y1])
    corners.push(new THREE.Vector3(px(x), y, pz(z)));
  const center = new THREE.Vector3(px((x0 + x1) / 2), (y0 + y1) / 2, pz((z0 + z1) / 2));
  // en pantallas verticales la cámara mira a lo largo de la casa para aprovechar el alto
  const portrait = viewW / viewH < 0.85;
  const az = THREE.MathUtils.degToRad(portrait ? 80 : 25);
  const el = THREE.MathUtils.degToRad(portrait ? v.elev + 4 : v.elev - 4);
  const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
  const fit = fitView(corners, center, dir);
  const d = Math.min(controls.maxDistance, Math.max(controls.minDistance, fit.d));
  const pos = fit.target.clone().add(dir.multiplyScalar(d));
  targetAnim = null;
  viewAnim = { ft: controls.target.clone(), tt: fit.target, fp: camera.position.clone(), tp: pos, t: 0 };
}

let viewShift = 0;
function applyViewShift(){
  if (viewShift > 2) camera.setViewOffset(viewW, viewH + viewShift, 0, viewShift, viewW, viewH);
  else camera.clearViewOffset();
  pedirDibujo();
}
function updateViewShift(){
  const el = document.getElementById("panel");
  const want = (viewW < 760 && el.classList.contains("show"))
    ? Math.min(viewH * 0.5, el.getBoundingClientRect().height + 30)
    : (viewW < 760 ? viewH * 0.10 : 0);
  if (Math.abs(want - viewShift) < 2) return;
  viewShift = want;
  applyViewShift();
}
/* ---------- controles de la barra (los de temporada y tema están en tienda.js) ---------- */
const bPb = document.getElementById("bPb");
const bPa = document.getElementById("bPa");
const bBoth = document.getElementById("bBoth");
const bRoof = document.getElementById("bRoof");

const EXPLODE = 2.2;                 // separación entre pisos en la vista completa
let floorMode = "pb";

function setFloorMode(m){
  floorMode = m;
  floorGroups[0].visible = (m === "pb" || m === "both");
  floorGroups[1].visible = (m === "pa" || m === "both");

  // en "planta alta" el piso de arriba baja al nivel del suelo para verlo de cerca
  const off = m === "both" ? EXPLODE : (m === "pa" ? -UP_Y : 0);
  floorGroups[1].position.y = off;
  roofGroup.position.y = off;

  if (m !== "both"){ roofGroup.visible = false; bRoof.classList.remove("active"); }
  if (exteriorGroup) exteriorGroup.visible = (m !== "pa");

  bPb.classList.toggle("active", m === "pb");
  bPa.classList.toggle("active", m === "pa");
  bBoth.classList.toggle("active", m === "both");

  // si el espacio abierto quedó oculto, cerramos el panel
  if (selected){
    const g = (roomRegistry[selected] || [])[0];
    if (g && g.parent && !g.parent.visible) tienda.cerrarEspacio();
  }
  flyTo(m);
  pedirDibujo();
}

bPb.onclick = () => setFloorMode("pb");
bPa.onclick = () => setFloorMode("pa");
bBoth.onclick = () => setFloorMode("both");

bRoof.onclick = () => {
  if (floorMode !== "both") setFloorMode("both");
  roofGroup.visible = !roofGroup.visible;
  pedirDibujo();
  bRoof.classList.toggle("active", roofGroup.visible);
};

const bAuto = document.getElementById("bAuto");
bAuto.onclick = () => { controls.autoRotate = !controls.autoRotate; bAuto.classList.toggle("active"); pedirDibujo(); };

document.getElementById("bReset").onclick = () => {
  camera.position.set(19, 16, 19);
  controls.target.set(0, 0.8, 0);
  fitCamera(true);
  tienda.cerrarEspacio();
  setFloorMode("pb");
};

/* ==================== ETIQUETAS FLOTANTES ==================== */
const pinHost = document.getElementById("pins");
const pins = [];
let viewW = 1, viewH = 1;

function buildPins(){
  const seen = {};
  ROOMS.forEach(r => {
    if (seen[r.sec]) return;
    seen[r.sec] = true;
    const el = document.createElement("button");
    el.className = "pin";
    const label = SECTIONS[r.sec].label;
    el.innerHTML = '<span class="pdot">' + (ICONOS[r.sec] || "•") + '</span>' +
                   (r.bath ? '' : '<span class="ptxt">' + label + '</span>');
    el.title = label;
    el.setAttribute("aria-label", label);
    if (r.bath) el.classList.add("pin-bath");
    el.addEventListener("click", ev => { ev.stopPropagation(); selectRoom(r.sec); });
    pinHost.appendChild(el);
    pins.push({
      el, r,
      anchor: new THREE.Vector3(
        px((r.x0 + r.x1) / 2),
        (r.lvl === 0 ? 0 : UP_Y) + (r.open ? 0.9 : (r.bath ? WALL_H + 0.25 : WALL_H + 0.7)),
        pz((r.z0 + r.z1) / 2)
      )
    });
  });
  // árbol de Navidad: etiqueta propia, solo en temporada navideña
  const el = document.createElement("button");
  el.className = "pin pin-xmas";
  el.innerHTML = '<span class="pdot">🎄</span><span class="ptxt">' + SECTIONS.navidad.label + '</span>';
  el.title = SECTIONS.navidad.label;
  el.setAttribute("aria-label", SECTIONS.navidad.label);
  el.addEventListener("click", ev => { ev.stopPropagation(); selectRoom("navidad"); });
  pinHost.appendChild(el);
  pins.push({ el, r:{ sec:"navidad", lvl:0 }, onlySeason:"invierno", anchor:new THREE.Vector3(px(6.3), 2.1, pz(11.0)) });
}

const _v = new THREE.Vector3();
function updatePins(){
  for (const p of pins){
    if (!floorGroups[p.r.lvl].visible || (p.onlySeason && season !== p.onlySeason) || !itemsFor(p.r.sec, season).length){ p.el.style.display = "none"; continue; }
    const yOff = p.r.lvl === 1 ? floorGroups[1].position.y : 0;
    _v.set(p.anchor.x, p.anchor.y + yOff, p.anchor.z).project(camera);
    if (_v.z > 1){ p.el.style.display = "none"; continue; }
    p.el.style.display = "";
    let x = (_v.x * 0.5 + 0.5) * viewW;
    let y = (-_v.y * 0.5 + 0.5) * viewH;
    const mx = 30, my = 36;                       // que no se salgan del lienzo
    x = Math.min(viewW - mx, Math.max(mx, x));
    y = Math.min(viewH - 10, Math.max(my, y));
    p.el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%,-100%)";
    p.el.classList.toggle("on", selected === p.r.sec);
  }
}

/* ==================== LOOP ==================== */
let lastFit = null;
function fitCamera(force){
  const bucket = aspectBucket();
  if (!force && bucket === lastFit) return;      // no toques el zoom del usuario sin motivo
  lastFit = bucket;
  flyTo(floorMode);
}

function resize(){
  const w = wrap.clientWidth, h = wrap.clientHeight;
  viewW = w; viewH = h;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  fitCamera(false);
  viewShift = 0;
  requestAnimationFrame(updateViewShift);
  pedirDibujo();
}

/* Dibujo a pedido: la escena solo se vuelve a dibujar cuando algo cambia
   (cámara, animación, nieve, giro automático, resaltado de un cuarto…).
   Quieta, no gasta batería ni calienta el teléfono. */
let pendiente = true;
function pedirDibujo(){ pendiente = true; }

function animate(){
  requestAnimationFrame(animate);
  const animando = !!(viewAnim || targetAnim);
  if (viewAnim){
    viewAnim.t = Math.min(1, viewAnim.t + 0.04);
    const e = 1 - Math.pow(1 - viewAnim.t, 3);
    controls.target.lerpVectors(viewAnim.ft, viewAnim.tt, e);
    camera.position.lerpVectors(viewAnim.fp, viewAnim.tp, e);
    if (viewAnim.t >= 1) viewAnim = null;
  }
  if (targetAnim){
    targetAnim.t = Math.min(1, targetAnim.t + 0.045);
    const e = 1 - Math.pow(1 - targetAnim.t, 3);
    controls.target.lerpVectors(targetAnim.from, targetAnim.to, e);
    if (targetAnim.t >= 1) targetAnim = null;
  }
  const seMovio = controls.update();             // true mientras la cámara se mueve (incluye la inercia)
  const nieva = !!(snow && snow.visible);
  if (!(pendiente || animando || seMovio || nieva || controls.autoRotate)) return;
  pendiente = false;
  animateSnow();
  updatePins();
  renderer.render(scene, camera);
}

/* ==================== ARRANQUE ==================== */
export function iniciarCasa(api){
  tienda = api;
  season = tienda.temporada();
  initThree();
  buildWorld();
  buildSnow();
  buildPins();
  aplicarTemporada(tienda.temporada());
  tienda.escuchar("temporada", aplicarTemporada);
  tienda.escuchar("espacio", alCambiarEspacio);
  setFloorMode("pb");
  resize();
  window.addEventListener("resize", resize);
  animate();
  setTimeout(() => document.getElementById("loading").classList.add("hide"), 350);
}
