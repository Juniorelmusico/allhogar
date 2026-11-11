/* Revisa que el catálogo (assets/js/datos.js) sea coherente antes de publicar.
   Uso:  node scripts/validar-datos.mjs
   Sale con código 1 si encuentra un error. */
import { SECTIONS, INFO } from "../assets/js/datos.js";

const errores = [], avisos = [];
const porRef = new Map();                 // ref → primer producto encontrado
const TEMPORADAS = ["primavera", "verano", "otono", "invierno", "todas"];

for (const [sec, { items }] of Object.entries(SECTIONS)){
  for (const p of items){
    const donde = `${sec} → "${p.n}"`;
    for (const campo of ["e", "n", "p", "s", "ref"])
      if (p[campo] === undefined || p[campo] === "") errores.push(`${donde}: falta "${campo}"`);
    if (typeof p.p !== "number" || p.p <= 0) errores.push(`${donde}: precio inválido`);
    if (!Array.isArray(p.s) || !p.s.every(t => TEMPORADAS.includes(t))) errores.push(`${donde}: temporada inválida ${JSON.stringify(p.s)}`);

    // el mismo producto debe tener los mismos datos en todos los espacios
    const otro = porRef.get(p.ref);
    if (otro && (otro.p !== p.p || otro.n !== p.n)) errores.push(`${donde}: distinto de "${otro.n}" ($${otro.p}) con la misma ref ${p.ref}`);
    if (!otro) porRef.set(p.ref, p);

    if (!p.combo){
      if (!INFO[p.ref]) avisos.push(`${donde}: sin ficha en INFO (ref ${p.ref})`);
      continue;
    }
    // combos: cada parte debe tener ficha; el precio tachado debe ser la suma de las partes que se venden sueltas
    const ids = p.ref.split(":")[1].split("+");
    ids.forEach(id => { if (!INFO[id]) errores.push(`${donde}: la parte ${id} no tiene ficha en INFO`); });
    if (p.was !== undefined){
      const partes = ids.map(id => porRefFinal(id));
      if (partes.some(x => !x)) errores.push(`${donde}: tiene precio tachado pero no todas sus partes se venden sueltas`);
      else {
        const suma = Math.round(partes.reduce((a, x) => a + x.p, 0) * 100) / 100;
        if (Math.abs(suma - p.was) > 0.005) errores.push(`${donde}: precio tachado $${p.was} ≠ suma de partes $${suma}`);
      }
      if (p.was <= p.p) errores.push(`${donde}: el combo no es más barato que sus partes`);
    }
  }
}

function porRefFinal(ref){
  for (const { items } of Object.values(SECTIONS)){
    const it = items.find(x => x.ref === ref && !x.combo);
    if (it) return it;
  }
  return null;
}

avisos.forEach(a => console.log("aviso:", a));
errores.forEach(e => console.log("ERROR:", e));
console.log(`\n${porRef.size} productos distintos · ${errores.length} errores · ${avisos.length} avisos`);
process.exit(errores.length ? 1 : 0);
