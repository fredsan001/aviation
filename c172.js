// ============================================================
// MODELO 3D OFICIAL · Cessna 172 · Ground School Freddy Sandoval
// Versión 1.0 · 8-nov-2026 · three.js (r170)
// Ejes: nariz hacia +X, arriba +Y, ala derecha hacia +Z. Unidades: metros.
// Escala real aproximada: largo 8.3 m · envergadura 11.0 m · alto 2.7 m.
// Uso: import { makeC172 } from './c172.js';  const avion = makeC172(THREE);
// userData: { prop, disc, mats }  ·  No modificar sin actualizar la Matriz.
// ============================================================
export function makeC172(THREE, opts = {}) {
  const g = new THREE.Group();
  const WHITE = new THREE.Color(0xf4f6f8), NAVY = new THREE.Color(0x1b2f63), BLUE = new THREE.Color(0x2f6fd6);
  const body = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.05, transparent: true });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0.12, metalness: 0.5, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f2125, roughness: 0.7, transparent: true });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.35, metalness: 0.6, transparent: true });
  const paint = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.42, metalness: 0.05, transparent: true });
  const mats = [body, glass, dark, metal, paint];
  const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };

  // Loft genérico: secciones [{p:[x,y,z], a, b}] a lo largo de un eje; perfil(t)->[u,v] en [-1,1]
  function loft(sections, profile, axis, colorFn, seg = 28) {
    const pos = [], col = [], idx = [];
    sections.forEach((s, i) => {
      for (let j = 0; j <= seg; j++) {
        const t = j / seg; const [u, v] = profile(t);
        let x, y, z;
        if (axis === 'x') { x = s.p[0]; y = s.p[1] + v * s.b; z = s.p[2] + u * s.a; }
        else { z = s.p[2]; x = s.p[0] + u * s.a; y = s.p[1] + v * s.b; }
        pos.push(x, y, z); const c = colorFn ? colorFn(u, v, s, i) : WHITE; col.push(c.r, c.g, c.b);
      }
    });
    const n = seg + 1;
    for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < seg; j++) {
      const a = i * n + j, b = a + n; idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }
  // sección superelíptica (fuselaje): u = lado (z), v = alto (y)
  const superE = (t, n = 2.6) => { const a = t * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.pow(Math.abs(c), 2 / n), Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]; };

  // ---------- FUSELAJE (franjas azul marino y azul como color de vértice) ----------
  const F = [ // x, centroY, semiancho, semialto
    [3.78, 1.32, 0.16, 0.16], [3.70, 1.32, 0.34, 0.30], [3.45, 1.33, 0.46, 0.42], [3.00, 1.36, 0.55, 0.52],
    [2.60, 1.42, 0.57, 0.60], [2.20, 1.52, 0.58, 0.72], [1.40, 1.58, 0.58, 0.78], [0.40, 1.60, 0.57, 0.76],
    [-0.40, 1.62, 0.53, 0.70], [-1.20, 1.66, 0.44, 0.58], [-2.20, 1.70, 0.33, 0.45], [-3.30, 1.75, 0.22, 0.32],
    [-4.30, 1.79, 0.14, 0.22], [-4.95, 1.82, 0.08, 0.14]];
  const fusSec = F.map(([x, y, a, b]) => ({ p: [x, y, 0], a, b, x }));
  const stripe = (u, v, s) => {
    if (s.x > 3.1 || s.x < -4.8) return WHITE;
    const side = Math.abs(u) > 0.55;
    if (side && v > -0.30 && v < -0.16) return NAVY;
    if (side && v > -0.42 && v < -0.34) return BLUE;
    return WHITE;
  };
  mesh(loft(fusSec, t => superE(t), 'x', stripe, 220), body);
  // spinner
  const sp = mesh(new THREE.ConeGeometry(0.17, 0.42, 20), metal); sp.rotation.z = -Math.PI / 2; sp.position.set(3.98, 1.32, 0);

  // ---------- VENTANAS ----------
  const quad = (pts) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals(); return mesh(geo, glass); };
  // parabrisas inclinado
  quad([[2.42, 1.95, -0.50], [2.42, 1.95, 0.50], [1.70, 2.33, 0.48], [1.70, 2.33, -0.48]]);
  for (const s of [1, -1]) {
    const z = s * 0.585;
    quad([[1.55, 1.70, z], [0.50, 1.70, z], [0.50, 2.20, z], [1.80, 2.20, z]]);   // ventana de puerta
    quad([[0.35, 1.72, z * 0.98], [-0.55, 1.75, z * 0.93], [-0.45, 2.15, z * 0.93], [0.35, 2.20, z * 0.98]]); // ventana trasera lateral
  }
  // ventana trasera (sobre el cono de cola)
  quad([[-0.45, 2.27, -0.38], [-0.45, 2.27, 0.38], [-1.35, 2.05, 0.22], [-1.35, 2.05, -0.22]]);

  // ---------- ALA ALTA (perfil, rectangular adentro y con estrechamiento afuera, diedro) ----------
  const airfoil = t => { // t 0..1 alrededor del perfil: u = cuerda (-1 borde de fuga, +1 ataque), v = espesor
    const a = t * Math.PI * 2; const x = Math.cos(a); const th = 0.12 * (1 - x) * Math.pow((1 + x) / 2, 0.5) * 1.6;
    return [x, (Math.sin(a) > 0 ? th : -th * 0.35) + 0.0];
  };
  const half = 5.5, inner = 2.55, root = 1.63, tip = 1.12, dih = Math.tan(1.7 * Math.PI / 180);
  // puntas con franja: añadir secciones cercanas a la punta
  const ws = [];
  for (const z of [-half, -5.15, -inner, 0, inner, 5.15, half]) {
    const az = Math.abs(z); const c = az <= inner ? root : root - (root - tip) * (az - inner) / (half - inner);
    ws.push({ p: [1.42 - c / 2, 2.40 + az * dih, z], a: c / 2, b: 0.55 * (c / root) });
  }
  mesh(loft(ws, airfoil, 'z', (u, v, s) => (Math.abs(s.p[2]) > 5.1 ? NAVY : WHITE), 32), body);
  // tapas de punta
  for (const z of [-half, half]) { const c = tip; const cap = mesh(new THREE.SphereGeometry(1, 16, 8), body); cap.scale.set(c / 2, 0.06, 0.04); cap.position.set(1.42 - c / 2, 2.40 + half * dih + 0.03, z); cap.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(cap.geometry.attributes.position.count * 3).fill(0).map((_, k) => [NAVY.r, NAVY.g, NAVY.b][k % 3]), 3)); }

  // ---------- STRUTS (de la parte baja del fuselaje a la mitad del ala) ----------
  const rod = (a, b, r, mat) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const d = B.clone().sub(A); const m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), mat); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.scale.set(1.6, 1, 0.7); return m; };
  for (const s of [1, -1]) rod([0.75, 1.05, s * 0.55], [0.85, 2.34 + 2.6 * dih, s * 2.6], 0.045, paint);

  // ---------- TREN TRICICLO FIJO CON CARENADOS ----------
  const wheel = (x, y, z, r, w) => { const m = mesh(new THREE.CylinderGeometry(r, r, w, 20), dark); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); };
  const fairing = (x, y, z, L, H, W) => { const geo = new THREE.SphereGeometry(1, 20, 14); const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { let px = pos.getX(i); if (px < 0) pos.setX(i, px * 1.5); } // gota: cola más larga
    geo.computeVertexNormals(); const c = new Float32Array(pos.count * 3).fill(1); for (let i = 0; i < pos.count; i++) { c[i * 3] = WHITE.r; c[i * 3 + 1] = WHITE.g; c[i * 3 + 2] = WHITE.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); const m = mesh(geo, body); m.scale.set(L, H, W); m.position.set(x, y, z); };
  for (const s of [1, -1]) {
    rod([0.25, 0.98, s * 0.45], [0.18, 0.42, s * 1.24], 0.05, metal);   // pata de acero (ballesta)
    wheel(0.15, 0.30, s * 1.27, 0.29, 0.14);
    fairing(0.15, 0.36, s * 1.27, 0.46, 0.27, 0.16);                    // carenado (wheel pant)
  }
  rod([2.75, 0.85, 0], [2.86, 0.38, 0], 0.045, metal);                   // pata de nariz
  wheel(2.86, 0.25, 0, 0.24, 0.11); fairing(2.86, 0.31, 0, 0.36, 0.2, 0.11);

  // ---------- EMPENAJE ----------
  const hs = [];
  for (const z of [-1.7, 0, 1.7]) { const c = Math.abs(z) > 1 ? 0.75 : 1.15; hs.push({ p: [-4.45 + (1.15 - c) * 0.2 - c / 2 + 0.5, 1.83, z], a: c / 2, b: 0.35 }); }
  mesh(loft(hs, airfoil, 'z', null, 24), body);
  // deriva (flecha hacia atrás, franja azul marino arriba)
  const fin = new THREE.Shape(); fin.moveTo(-3.55, 1.95); fin.lineTo(-4.55, 3.25); fin.lineTo(-5.05, 3.25); fin.lineTo(-5.10, 1.90); fin.lineTo(-3.55, 1.95);
  const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
  const fpos = fg.attributes.position, fc = new Float32Array(fpos.count * 3);
  for (let i = 0; i < fpos.count; i++) { const y = fpos.getY(i); const c = y > 2.85 && y < 3.05 ? NAVY : (y > 2.72 && y < 2.80 ? BLUE : WHITE); fc.set([c.r, c.g, c.b], i * 3); }
  fg.setAttribute('color', new THREE.BufferAttribute(fc, 3)); const fm = mesh(fg, body); fm.position.z = -0.05;

  // ---------- HÉLICE BIPALA ----------
  const prop = new THREE.Group(); prop.position.set(3.88, 1.32, 0);
  for (const s of [1, -1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.92, 0.13), dark); b.position.y = s * 0.5; b.rotation.y = s * 0.25; b.castShadow = true; prop.add(b); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  disc.rotation.y = Math.PI / 2; prop.add(disc); g.add(prop);

  g.userData = { prop, disc, mats };
  return g;
}
