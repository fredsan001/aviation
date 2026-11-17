// ============================================================
// MODELO 3D OFICIAL · Piper PA-28 (Warrior/Archer) · Ground School Freddy Sandoval
// Versión 1.0 · 15-nov-2026 · three.js (r170)
// Ejes: nariz hacia +X, arriba +Y, ala derecha hacia +Z. Unidades: metros.
// Escala real aproximada: largo 7.3 m · envergadura 10.7 m · alto 2.2 m.
// Uso: import { makePA28 } from './pa28.js';  const avion = makePA28(THREE);
// userData: { prop, disc, mats }  ·  No modificar sin actualizar la Matriz.
// ============================================================
export function makePA28(THREE, opts = {}) {
  const g = new THREE.Group();
  const WHITE = new THREE.Color(0xf4f6f8), RED = new THREE.Color(0xc8102e), DRED = new THREE.Color(0x6b0f1a);
  const body = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.05, transparent: true });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0.12, metalness: 0.5, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f2125, roughness: 0.7, transparent: true });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.35, metalness: 0.6, transparent: true });
  const mats = [body, glass, dark, metal];
  const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  function loft(sections, profile, axis, colorFn, seg = 28) {
    const pos = [], col = [], idx = [];
    sections.forEach((s, i) => {
      for (let j = 0; j <= seg; j++) {
        const t = j / seg; const [u, v] = profile(t); let x, y, z;
        if (axis === 'x') { x = s.p[0]; y = s.p[1] + v * s.b; z = s.p[2] + u * s.a; }
        else { z = s.p[2]; x = s.p[0] + u * s.a; y = s.p[1] + v * s.b; }
        pos.push(x, y, z); const c = colorFn ? colorFn(u, v, s, i) : WHITE; col.push(c.r, c.g, c.b);
      }
    });
    const n = seg + 1;
    for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < seg; j++) { const a = i * n + j, b = a + n; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }
  const superE = (t, n = 2.6) => { const a = t * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.pow(Math.abs(c), 2 / n), Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]; };

  // ---------- FUSELAJE (más bajo que el C172; franja roja y filete rojo oscuro) ----------
  const F = [ // x, centroY, semiancho, semialto
    [3.30, 1.02, 0.15, 0.15], [3.22, 1.02, 0.32, 0.27], [3.00, 1.03, 0.45, 0.38], [2.60, 1.06, 0.53, 0.46],
    [2.20, 1.10, 0.56, 0.53], [1.60, 1.16, 0.58, 0.62], [0.70, 1.19, 0.58, 0.64], [-0.20, 1.20, 0.55, 0.60],
    [-1.00, 1.24, 0.46, 0.50], [-2.00, 1.28, 0.34, 0.38], [-3.00, 1.33, 0.23, 0.27], [-3.75, 1.37, 0.15, 0.18], [-4.10, 1.39, 0.08, 0.11]];
  const fusSec = F.map(([x, y, a, b]) => ({ p: [x, y, 0], a, b, x }));
  const stripe = (u, v, s) => {
    if (s.x > 2.9 || s.x < -3.95) return WHITE;
    const side = Math.abs(u) > 0.55;
    if (side && v > -0.08 && v < 0.12) return RED;
    if (side && v > -0.20 && v < -0.13) return DRED;
    return WHITE;
  };
  mesh(loft(fusSec, t => superE(t), 'x', stripe, 220), body);
  const sp = mesh(new THREE.ConeGeometry(0.16, 0.40, 20), metal); sp.rotation.z = -Math.PI / 2; sp.position.set(3.50, 1.02, 0);

  // ---------- VENTANAS (techo bajo, parabrisas inclinado, 3 ventanas por lado) ----------
  const quad = (pts) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals(); return mesh(geo, glass); };
  quad([[2.15, 1.50, -0.50], [2.15, 1.50, 0.50], [1.40, 1.80, 0.46], [1.40, 1.80, -0.46]]);   // parabrisas
  for (const s of [1, -1]) {
    const z = s * 0.585;
    quad([[1.95, 1.40, z], [1.20, 1.40, z], [1.20, 1.74, z], [1.55, 1.74, z]]);              // ventana delantera
    quad([[1.05, 1.40, z], [0.15, 1.40, z * 0.99], [0.15, 1.74, z * 0.99], [1.05, 1.76, z]]); // ventana media
    quad([[0.00, 1.40, z * 0.98], [-0.75, 1.42, z * 0.92], [-0.55, 1.68, z * 0.93], [0.00, 1.72, z * 0.98]]); // ventana trasera
  }

  // ---------- ALA BAJA (bajo el fuselaje, sección interior rectangular, puntas con estrechamiento, diedro marcado) ----------
  const airfoil = t => { const a = t * Math.PI * 2; const x = Math.cos(a); const th = 0.12 * (1 - x) * Math.pow((1 + x) / 2, 0.5) * 1.6; return [x, (Math.sin(a) > 0 ? th : -th * 0.35)]; };
  const half = 5.35, inner = 2.6, root = 1.60, tip = 1.07, dih = Math.tan(7 * Math.PI / 180);
  const ws = [];
  for (const z of [-half, -5.0, -4.94, -inner, 0, inner, 4.94, 5.0, half]) {
    const az = Math.abs(z); const c = az <= inner ? root : root - (root - tip) * (az - inner) / (half - inner);
    ws.push({ p: [1.55 - c / 2, 0.68 + Math.max(0, az - 0.6) * dih, z], a: c / 2, b: 0.55 * (c / root) });
  }
  mesh(loft(ws, airfoil, 'z', (u, v, s) => (Math.abs(s.p[2]) > 4.95 ? RED : WHITE), 32), body);
  for (const z of [-half, half]) { const cap = mesh(new THREE.SphereGeometry(1, 16, 8), body); cap.scale.set(tip / 2, 0.06, 0.05); cap.position.set(1.55 - tip / 2, 0.70 + (half - 0.6) * dih, z);
    cap.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(cap.geometry.attributes.position.count * 3).fill(0).map((_, k) => [RED.r, RED.g, RED.b][k % 3]), 3)); }

  // ---------- TREN TRICICLO FIJO (amortiguadores oleo verticales bajo el ala) CON CARENADOS ----------
  const rod = (a, b, r, mat) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const d = B.clone().sub(A); const m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), mat); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; };
  const wheel = (x, y, z, r, w) => { const m = mesh(new THREE.CylinderGeometry(r, r, w, 20), dark); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); };
  const fairing = (x, y, z, L, H, W) => { const geo = new THREE.SphereGeometry(1, 20, 14); const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const px = pos.getX(i); if (px < 0) pos.setX(i, px * 1.5); }
    geo.computeVertexNormals(); const c = new Float32Array(pos.count * 3); for (let i = 0; i < pos.count; i++) { c[i * 3] = WHITE.r; c[i * 3 + 1] = WHITE.g; c[i * 3 + 2] = WHITE.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); const m = mesh(geo, body); m.scale.set(L, H, W); m.position.set(x, y, z); };
  for (const s of [1, -1]) {
    const wz = s * 1.6, wy = 0.68 + (1.6 - 0.6) * dih;
    rod([0.95, wy - 0.05, wz], [0.95, 0.40, wz], 0.055, metal);       // amortiguador oleo
    wheel(0.92, 0.28, wz, 0.27, 0.13); fairing(0.92, 0.33, wz, 0.44, 0.25, 0.15);
  }
  rod([2.55, 0.62, 0], [2.62, 0.36, 0], 0.05, metal);                  // pata de nariz
  wheel(2.62, 0.23, 0, 0.22, 0.10); fairing(2.62, 0.29, 0, 0.34, 0.19, 0.11);

  // ---------- EMPENAJE: estabilizador (stabilator, todo móvil) bajo y deriva con flecha ----------
  const hs = []; for (const z of [-1.95, 0, 1.95]) hs.push({ p: [-3.75, 1.40, z], a: 0.40, b: 0.32 });
  mesh(loft(hs, airfoil, 'z', null, 24), body);
  const fin = new THREE.Shape(); fin.moveTo(-2.95, 1.52); fin.lineTo(-3.80, 2.25); fin.lineTo(-4.15, 2.25); fin.lineTo(-4.18, 1.42); fin.lineTo(-2.95, 1.52);
  const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
  const fpos = fg.attributes.position, fc = new Float32Array(fpos.count * 3);
  for (let i = 0; i < fpos.count; i++) { const y = fpos.getY(i); const c = y > 1.92 && y < 2.08 ? RED : (y > 1.82 && y < 1.88 ? DRED : WHITE); fc.set([c.r, c.g, c.b], i * 3); }
  fg.setAttribute('color', new THREE.BufferAttribute(fc, 3)); const fm = mesh(fg, body); fm.position.z = -0.05;

  // ---------- HÉLICE BIPALA ----------
  const prop = new THREE.Group(); prop.position.set(3.40, 1.02, 0);
  for (const s of [1, -1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.88, 0.13), dark); b.position.y = s * 0.48; b.rotation.y = s * 0.25; b.castShadow = true; prop.add(b); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.92, 40), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  disc.rotation.y = Math.PI / 2; prop.add(disc); g.add(prop);

  g.userData = { prop, disc, mats };
  return g;
}
