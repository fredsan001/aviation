// ============================================================
// SIMULADOR DE MANIOBRAS · C2 · Piloto en USA · Freddy Sandoval
// Un solo simulador para todos los ejercicios del curso de Maniobras.
// Geometría oficial C172 v1.0 y PA-28 v1.0 (c172.js / pa28.js sin cambios).
// Solo en este simulador: materiales mejorados (pintura con brillo, vidrio, metal) y
// detalles agregados como objetos aparte (luces, faro, antena, pitot, superficies de control).
// Convenciones: nariz +X, arriba +Y, ala derecha +Z · bank + = derecha · rumbo 0 = norte (−Z)
// ============================================================
import * as THREE from 'three';
import { makeC172 } from './c172.js';
import { makePA28 } from './pa28.js';
import { drawStrip, stripHeight } from './panel.js';

const D2R = Math.PI / 180, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const $ = id => document.getElementById(id);
const FT = 0.3048;

// ---------------- datos de los aviones (POH C172S / PA-28-161) ----------------
const AC = {
  c172: { name: 'Cessna 172S', vs1: 48, vs0: 40, vx: 62, vy: 74, glide: 68, cruise: 105, cruiseRpm: 2350, maxRpm: 2600, idle: 900, climbFpm: 700, glideFpm: 760,
          appr: 65, rot: 55, slow: 56, slowHi: 66, slowF: 48, slowFHi: 58, flaps: [0, 10, 20, 30], vfe: f => (f <= 10 ? 110 : 85), flapRate: 5,
          eye: [1.35, 2.04, -0.27], cg: [0.95, 1.55, 0], high: true, color: '#2f6fd6' },
  pa28: { name: 'Piper PA-28-161', vs1: 50, vs0: 44, vx: 63, vy: 79, glide: 73, cruise: 100, cruiseRpm: 2350, maxRpm: 2550, idle: 900, climbFpm: 650, glideFpm: 800,
          appr: 63, rot: 60, slow: 58, slowHi: 68, slowF: 52, slowFHi: 62, flaps: [0, 10, 25, 40], vfe: () => 103, flapRate: 20,
          eye: [1.30, 1.56, -0.27], cg: [1.05, 1.0, 0], high: false, color: '#c8102e' },
};
const G = 19.07; // kt/s
function solve3(A, b) { const M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < 3; i++) { let p = i; for (let k = i + 1; k < 3; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k; [M[i], M[p]] = [M[p], M[i]];
    for (let k = i + 1; k < 3; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j < 4; j++) M[k][j] -= f * M[i][j]; } }
  const x = [0, 0, 0]; for (let i = 2; i >= 0; i--) { let s = M[i][3]; for (let j = i + 1; j < 3; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; } return x; }
const pOf = (a, rpm) => clamp((rpm - a.idle) / (a.maxRpm - a.idle), 0.04, 1);
for (const a of Object.values(AC)) { const row = (p, V) => [p * (1 - V / 220), -V * V, -1 / (V * V)], sg = (fpm, V) => fpm / (V * 101.27);
  [a.aT, a.cd, a.ci] = solve3([row(pOf(a, a.cruiseRpm), a.cruise), row(1, a.vy), row(0.04, a.glide)], [0, G * sg(a.climbFpm, a.vy), -G * sg(a.glideFpm, a.glide)]); }

// ---------------- ejercicios (un solo simulador para todo el curso) ----------------
const EX = [
 { id: 'm2-l1', mod: 'M2', grp: 'MÓDULO 2 · LAS CUATRO MANIOBRAS BÁSICAS', t: 'L1 · Actitud y potencia', en: 'Attitude + Power = Performance', brief: 'Cada actitud con cada potencia da un resultado. Encuentra la imagen de crucero, de ascenso a VY y de planeo.', start: { alt: 3000, hdg: 360 }, tasks: [
   { text: 'Vuelo nivelado en crucero: nariz en el horizonte y potencia de crucero.', hint: 'Mantén la nariz quieta y deja la potencia de crucero.', ias: 'cruise', iasTol: 7, vs: 0, vsTol: 150, hold: 5 },
   { text: 'Acelerador a fondo y nariz arriba hasta VY ({vy} kt), con la bola centrada.', hint: 'Acelerador a fondo y sube la nariz hasta {vy} nudos. Pedal derecho para la bola.', ias: 'vy', iasTol: 5, rpmMin: 2400, ball: true, hold: 6 },
   { text: 'Acelerador a ralentí y nariz para mejor planeo ({glide} kt).', hint: 'Acelerador atrás y ajusta la nariz hasta {glide} nudos.', ias: 'glide', iasTol: 5, rpmMax: 1300, hold: 6 },
   { text: 'Vuelve a crucero nivelado y compensa: sin presión en el control.', hint: 'Potencia de crucero, nariz al horizonte y compensador hasta que no haya presión.', ias: 'cruise', iasTol: 8, vs: 0, vsTol: 150, rpmMin: 2200, trim: true, hold: 6 }] },
 { id: 'm2-l2', mod: 'M2', t: 'L2 · Vuelo recto y nivelado', en: 'Straight-and-level · Trim', brief: 'El avión empieza descompensado y con turbulencia leve. Mantén altitud, rumbo y velocidad, y compensa.', gust: true, start: { alt: 3000, hdg: 360, trimOff: 3 }, tasks: [
   { text: 'El avión está descompensado: mantén 3,000 ft y quita la presión con el compensador.', hint: 'Empuja para mantener el nivel y baja la nariz con el compensador hasta que la presión desaparezca.', alt: 3000, altTol: 100, trim: true, hold: 5 },
   { text: 'Recto y nivelado 30 s: altitud ±100 ft, rumbo 360 ±10°, velocidad ±10 kt.', hint: 'Afuera, adentro, afuera: correcciones pequeñas contra la turbulencia.', alt: 3000, altTol: 100, hdg: 360, hdgTol: 10, ias: 'cruise', iasTol: 10, hold: 30 }] },
 { id: 'm2-l3', mod: 'M2', t: 'L3 · Ascensos y nivelar', en: 'Climb · Level-off', brief: 'Actitud, potencia, compensador. Sube a 3,500 ft a VY y nivela anticipando el 10 % de la velocidad vertical.', start: { alt: 3000, hdg: 90 }, tasks: [
   { text: 'Entra en ascenso: nariz arriba, acelerador a fondo, VY ({vy} kt) y bola centrada.', hint: 'Actitud, potencia, compensador. Pedal derecho para centrar la bola.', ias: 'vy', iasTol: 5, rpmMin: 2400, ball: true, hold: 6 },
   { text: 'Compensa el ascenso a VY.', hint: 'Usa el compensador hasta que no haya presión.', ias: 'vy', iasTol: 5, ball: true, trim: true, hold: 4 },
   { text: 'Nivela en 3,500 ft: anticipa unos 10 % de la velocidad vertical.', hint: 'Con 650 ft/min, empieza a bajar la nariz unos 65 ft antes.', alt: 3500, altTol: 60, vs: 0, vsTol: 150, hold: 4 },
   { text: 'Deja que acelere, reduce a crucero y compensa.', hint: 'Cuando llegues a crucero, reduce la potencia y compensa.', alt: 3500, altTol: 100, ias: 'cruise', iasTol: 8, rpmMax: 2450, trim: true, hold: 6 }] },
 { id: 'm2-l4', mod: 'M2', t: 'L4 · Descensos y nivelar', en: 'Descent · Glide', brief: 'Descenso en crucero, nivelar en 3,500 ft y planeo a la velocidad de mejor planeo.', start: { alt: 4500, hdg: 90 }, tasks: [
   { text: 'Descenso en crucero: reduce potencia y mantén la velocidad con unos 500 ft/min.', hint: 'Quita unas 300–400 RPM y baja un poco la nariz para mantener la velocidad.', ias: 'cruise', iasTol: 10, vs: -500, vsTol: 150, hold: 8 },
   { text: 'Nivela en 3,500 ft (anticipa 10 %).', hint: 'A 500 ft/min empieza unos 50 ft antes: potencia y nariz al nivel.', alt: 3500, altTol: 100, vs: 0, vsTol: 150, hold: 4 },
   { text: 'Planeo: acelerador a ralentí y mejor planeo ({glide} kt).', hint: 'Ralentí y ajusta la nariz hasta {glide} nudos. Compensa.', ias: 'glide', iasTol: 5, rpmMax: 1300, hold: 8 },
   { text: 'Recupera: potencia de crucero, nivela y compensa.', hint: 'Potencia, nariz al nivel, compensador.', ias: 'cruise', iasTol: 10, vs: 0, vsTol: 150, rpmMin: 2200, trim: true, hold: 5 }] },
 { id: 'm2-l5', mod: 'M2', t: 'L5 · Virajes coordinados', en: 'Medium-bank turns · Coordination', brief: 'Virajes de 30° coordinados manteniendo la altitud, y salidas en el rumbo anticipando la mitad de la inclinación.', start: { alt: 3000, hdg: 360 }, tasks: [
   { text: 'Viraje a la derecha con 30° de inclinación, bola centrada y 3,000 ft.', hint: 'Alerón y pedal derecho juntos; un poco de presión hacia atrás para no perder altura.', bank: 30, bankTol: 5, turnDir: 1, alt: 3000, altTol: 100, ball: true, hold: 8 },
   { text: 'Sal en rumbo 090: anticipa la mitad de la inclinación (unos 15°).', hint: 'Alerón y pedal izquierdos, y suelta la presión hacia atrás.', hdg: 90, hdgTol: 10, bank: 0, bankTol: 5, alt: 3000, altTol: 100, hold: 4 },
   { text: 'Viraje a la izquierda con 30° hacia rumbo 360.', hint: 'Alerón y pedal izquierdos juntos; bola centrada.', bank: 30, bankTol: 5, turnDir: -1, alt: 3000, altTol: 100, ball: true, hold: 8 },
   { text: 'Sal en rumbo 360, alas niveladas.', hint: 'Anticipa unos 15° y nivela coordinado.', hdg: 360, hdgTol: 10, bank: 0, bankTol: 5, alt: 3000, altTol: 100, hold: 4 }] },
 { id: 'm2-l6', mod: 'M2', t: 'L6 · Virajes en ascenso y descenso', en: 'Climbing and descending turns', brief: 'Dos metas a la vez: rumbo y altitud. Nivela lo que llegue primero.', start: { alt: 3000, hdg: 360 }, tasks: [
   { text: 'Viraje en ascenso a la derecha: unos 15°–20° de inclinación a VY ({vy} kt).', hint: 'Nariz arriba, potencia de ascenso, inclinación suave y pedal derecho.', bank: 17, bankTol: 5, turnDir: 1, ias: 'vy', iasTol: 7, ball: true, hold: 6 },
   { text: 'Llega a 3,500 ft y rumbo 090: nivela lo que llegue primero.', hint: 'Si llega el rumbo, alas niveladas y sigue subiendo; si llega la altitud, nivela y sigue virando.', alt: 3500, altTol: 100, hdg: 90, hdgTol: 10, bank: 0, bankTol: 5, vs: 0, vsTol: 200, hold: 4 },
   { text: 'Viraje en descenso a la izquierda (unos 20°) a velocidad de crucero.', hint: 'Reduce potencia; controla la velocidad con la nariz y no dejes crecer la inclinación.', bank: 20, bankTol: 5, turnDir: -1, vs: -500, vsTol: 200, ias: 'cruise', iasTol: 10, hold: 6 },
   { text: 'Termina en 3,000 ft y rumbo 360, en crucero.', hint: 'Las dos metas otra vez: rumbo y altitud.', alt: 3000, altTol: 100, hdg: 360, hdgTol: 10, bank: 0, bankTol: 5, vs: 0, vsTol: 200, ias: 'cruise', iasTol: 10, hold: 4 }] },
 { id: 'm3-l1', mod: 'M3', grp: 'MÓDULO 3 · VUELO LENTO Y PÉRDIDAS', t: 'L1 · Vuelo lento', en: 'Slow flight · ACS PA.VII.A', brief: 'Justo antes de la alarma de pérdida, sin que suene. ACS: altitud ±100 ft, rumbo ±10°, velocidad +10/−0 kt, inclinación ±10°.', start: { alt: 4000, hdg: 90 }, tasks: [
   { text: 'Entra en vuelo lento sin flaps: {slow}–{slowHi} kt a 4,000 ft, sin bocina.', hint: 'Reduce la potencia, sube la nariz para mantener la altitud y agrega potencia antes de llegar a la velocidad.', ias: 'slow', iasHi: 'slowHi', alt: 4000, altTol: 100, hdg: 90, hdgTol: 10, noHorn: true, flaps: 0, hold: 10 },
   { text: 'Viraje suave de 15° a la izquierda (±10°) en vuelo lento, sin bocina.', hint: 'Inclinación suave, pedal coordinado y un poco más de potencia.', ias: 'slow', iasHi: 'slowHi', bank: 15, bankTol: 10, turnDir: -1, alt: 4000, altTol: 100, noHorn: true, ball: true, hold: 8 },
   { text: 'Alas niveladas, flaps completos y vuela a {slowF}–{slowFHi} kt.', hint: 'Con flaps la nariz baja y el avión vuela más lento: ajusta actitud y potencia.', ias: 'slowF', iasHi: 'slowFHi', alt: 4000, altTol: 100, bank: 0, bankTol: 10, flaps: 'full', noHorn: true, hold: 8 },
   { text: 'Recupera: potencia, nariz abajo poco a poco, flaps arriba y crucero.', hint: 'Potencia primero, luego flaps arriba por etapas y acelera a crucero.', ias: 'cruise', iasTol: 10, vs: 0, vsTol: 150, flaps: 0, hold: 5 }] },
 { id: 'm3-l2', mod: 'M3', t: 'L2 · Pérdida sin potencia', en: 'Power-off stall · Recover at the full stall', brief: 'Simula la aproximación: lento, con flaps y poca potencia. Recupera en cuanto ocurre la pérdida completa.', start: { alt: 4500, hdg: 90 }, tasks: [
   { text: 'Configura: flaps abajo, potencia reducida (≤ 1,600 RPM) y descenso a {appr} kt.', hint: 'Reduce la potencia, baja flaps y ajusta la nariz para la velocidad de aproximación.', flapsMin: 10, rpmMax: 1600, ias: 'appr', iasTol: 5, vs: -500, vsTol: 300, hold: 5 },
   { text: 'Sube la nariz poco a poco hasta la pérdida completa.', hint: 'Tira suave y continuo: escucha la bocina y sigue hasta la pérdida.', event: 'stall', hold: 0.1 },
   { text: 'Recupera: nariz abajo, potencia completa, flaps arriba y asciende a VY ({vy} kt).', hint: 'Primero baja la nariz. Luego potencia, flaps arriba por etapas y ascenso.', event: 'recover', rpmMin: 2400, flaps: 0, ias: 'vy', iasTol: 7, hold: 4 }] },
 { id: 'm3-l3', mod: 'M3', t: 'L3 · Pérdida con potencia', en: 'Power-on stall', brief: 'Simula el despegue: potencia alta, nariz alta y mucho pedal derecho.', start: { alt: 4500, hdg: 90 }, tasks: [
   { text: 'Reduce la potencia y baja a unos {rot} kt manteniendo 4,500 ft.', hint: 'Reduce y sube la nariz para mantener la altitud mientras desaceleras.', ias: 'rot', iasTol: 5, alt: 4500, altTol: 100, hold: 4 },
   { text: 'Potencia de despegue (≥ 2,300 RPM), bola centrada y nariz arriba hasta la pérdida.', hint: 'Acelerador adelante, pedal derecho y sube la nariz de forma continua.', event: 'stall', rpmMin: 2300, hold: 0.1 },
   { text: 'Recupera: nariz abajo, alas niveladas y asciende a VY ({vy} kt) con la bola centrada.', hint: 'Baja la nariz primero, después nivela y vuelve al ascenso.', event: 'recover', ias: 'vy', iasTol: 7, bank: 0, bankTol: 10, ball: true, hold: 4 }] },
 { id: 'm3-l4', mod: 'M3', t: 'L4 · Pérdida acelerada', en: 'Accelerated stall (demonstration)', brief: 'En un viraje la pérdida llega a más velocidad: VS × √(factor de carga). Mira a qué velocidad entras en pérdida.', start: { alt: 4500, hdg: 0, ias: 95 }, tasks: [
   { text: 'Viraje de 45° (±5°) a la derecha manteniendo la altitud.', hint: 'Inclina, pedal y bastante presión hacia atrás. Agrega un poco de potencia.', bank: 45, bankTol: 5, turnDir: 1, alt: 4500, altTol: 150, hold: 5 },
   { text: 'Sigue en el viraje y tira más fuerte hasta la pérdida. Mira la velocidad.', hint: 'Más presión hacia atrás: la pérdida llega a más velocidad que en vuelo recto.', event: 'stall', hold: 0.1 },
   { text: 'Recupera: suelta la presión hacia atrás primero, luego nivela las alas y potencia.', hint: 'Afloja el control, después alerón para nivelar.', event: 'recover', bank: 0, bankTol: 10, hold: 3 }] },
 { id: 'm3-l5', mod: 'M3', t: 'L5 · Conciencia de barrena', en: 'Spin awareness · PARE', brief: 'Pérdida + guiñada = barrena. Recupera con PARE.', spin: true, start: { alt: 6000, hdg: 0 },
   note: 'En el avión, las barrenas solo con instructor y en un avión aprobado. El <b>PA-28-161</b> tiene prohibidas las barrenas intencionales; el <b>C172</b> solo las tiene aprobadas en categoría utility.', tasks: [
   { text: 'Reduce la potencia y entra en pérdida con el pedal izquierdo pisado (descoordinado).', hint: 'Acelerador a ralentí, nariz arriba y mantén pisado el pedal izquierdo hasta la pérdida.', event: 'spin', hold: 0.1 },
   { text: 'PARE: potencia a ralentí, alerones neutrales, timón contrario (derecho) y elevador adelante.', hint: 'Suelta los alerones, pisa el pedal derecho y empuja hasta que pare la rotación.', event: 'spinStop', hold: 0.1 },
   { text: 'Centra el timón y sal del picado suavemente hasta nivelar.', hint: 'Sube la nariz suave y agrega potencia.', event: 'recover', hold: 3 }] },
 { id: 'libre', mod: '', grp: 'PRÁCTICA', t: 'Vuelo libre', en: 'Free flight', brief: 'Sin evaluación: practica lo que quieras con cualquiera de los dos aviones.', start: { alt: 3000, hdg: 360 }, tasks: [] },
];
const REV = { 'm2-l1': 'C2 · M2 · L1 Actitud y potencia', 'm2-l2': 'C2 · M2 · L2 Vuelo recto y nivelado', 'm2-l3': 'C2 · M2 · L3 Ascensos', 'm2-l4': 'C2 · M2 · L4 Descensos', 'm2-l5': 'C2 · M2 · L5 Virajes coordinados', 'm2-l6': 'C2 · M2 · L6 Virajes en ascenso y descenso',
  'm3-l1': 'C2 · M3 · L1 Vuelo lento', 'm3-l2': 'C2 · M3 · L2 Pérdida sin potencia', 'm3-l3': 'C2 · M3 · L3 Pérdida con potencia', 'm3-l4': 'C2 · M3 · L4 Pérdidas de demostración', 'm3-l5': 'C2 · M3 · L5 Conciencia de barrena' };

// ---------------- render y escena ----------------
const stage = $('stage'), cv = $('cv');
const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
R.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.9; R.outputColorSpace = THREE.SRGBColorSpace;
R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(42, 1, 0.2, 60000);

// cielo: cúpula con degradado (cenit azul → horizonte claro) + halo del sol
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, (90 - 42) * D2R, 25 * D2R);
function skyTexture() { const c = document.createElement('canvas'); c.width = 8; c.height = 1024; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 1024);
  gr.addColorStop(0, '#1b4f9c'); gr.addColorStop(0.28, '#2f6dbe'); gr.addColorStop(0.42, '#6da2d9'); gr.addColorStop(0.495, '#c9dcec'); gr.addColorStop(0.5, '#d6e3ee'); gr.addColorStop(0.52, '#a9b9a0'); gr.addColorStop(1, '#55663f');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 1024); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false });
const sky = new THREE.Mesh(new THREE.SphereGeometry(40000, 48, 32), skyMat); sky.renderOrder = -1; scene.add(sky);
const sunGlow = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(255,252,240,1)'); rg.addColorStop(0.06, 'rgba(255,248,225,1)'); rg.addColorStop(0.2, 'rgba(255,235,200,.35)'); rg.addColorStop(1, 'rgba(255,230,190,0)'); g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(9000); scene.add(s); return s; })();
const pm = new THREE.PMREMGenerator(R);
{ const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ map: skyMat.map, side: THREE.BackSide })));
  scene.environment = pm.fromScene(envScene, 0.02).texture; scene.environmentIntensity = 0.45; }
scene.fog = new THREE.FogExp2(0xc9dcec, 0.00008);
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x4f5a3a, 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 80 }); sun.shadow.bias = -0.0015; sun.shadow.normalBias = 0.06; sun.shadow.camera.updateProjectionMatrix(); scene.add(sun, sun.target);

// terreno: campos de cultivo con surcos, caminos y lagunas (textura procedimental)
function fieldsTexture() {
  const N = 2048, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#56683f'; g.fillRect(0, 0, N, N);
  const pal = ['#5f7a44', '#6f8a4a', '#4d6638', '#8e9256', '#a3935e', '#7c6a44', '#59783f', '#9aa865', '#476032', '#b7a873', '#668f4c'];
  const cell = 128;
  for (let y = 0; y < N; y += cell) for (let x = 0; x < N;) { const w = cell * (1 + Math.floor(rnd() * 3)); const col = pal[Math.floor(rnd() * pal.length)];
    const hh = rnd() < 0.3 ? cell / 2 : cell; for (let yy = y; yy < y + cell; yy += hh) { g.fillStyle = rnd() < 0.5 ? col : pal[Math.floor(rnd() * pal.length)]; g.fillRect(x + 2, yy + 2, w - 4, hh - 4);
      // surcos
      g.globalAlpha = 0.18; g.strokeStyle = rnd() < 0.5 ? '#2c3a1f' : '#e9e2b8'; g.lineWidth = 1.2; const vert = rnd() < 0.5;
      for (let k = 4; k < (vert ? w : hh) - 4; k += 5) { g.beginPath(); if (vert) { g.moveTo(x + k, yy + 3); g.lineTo(x + k, yy + hh - 3); } else { g.moveTo(x + 3, yy + k); g.lineTo(x + w - 3, yy + k); } g.stroke(); }
      g.globalAlpha = 1; }
    x += w; }
  // setos (líneas oscuras) y caminos
  g.strokeStyle = 'rgba(40,58,30,.55)'; g.lineWidth = 3; for (let i = 0; i <= N; i += cell) { g.beginPath(); g.moveTo(0, i); g.lineTo(N, i); g.stroke(); }
  g.strokeStyle = '#cfc7a8'; g.lineWidth = 6; for (const y of [384, 1408]) { g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); } for (const x of [640, 1664]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, N); g.stroke(); }
  g.strokeStyle = '#3a3d40'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 900); g.bezierCurveTo(600, 760, 1300, 1150, N, 980); g.stroke(); g.strokeStyle = '#d9d9c8'; g.lineWidth = 1.2; g.setLineDash([10, 10]); g.stroke(); g.setLineDash([]);
  // río y lagunas
  g.strokeStyle = '#3c6f9e'; g.lineWidth = 14; g.beginPath(); g.moveTo(200, 0); g.bezierCurveTo(420, 500, 120, 1100, 360, N); g.stroke();
  for (const [x, y, rx, ry] of [[1500, 600, 90, 60], [900, 1700, 70, 50], [1800, 1650, 50, 34]]) { g.fillStyle = '#3d7099'; g.beginPath(); g.ellipse(x, y, rx, ry, 0.4, 0, 7); g.fill(); g.strokeStyle = 'rgba(30,50,20,.6)'; g.lineWidth = 6; g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = R.capabilities.getMaxAnisotropy(); return t;
}
const TILE = 6000; // m que cubre una repetición de la textura
const groundTex = fieldsTexture(); groundTex.repeat.set(16, 16);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(TILE * 16, TILE * 16), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, metalness: 0 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = false; scene.add(ground);
// árboles y pueblos (instancias) en un mosaico de 3x3 que sigue al avión
const deco = new THREE.Group(); scene.add(deco);
{ let seed = 99; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const trunkG = new THREE.CylinderGeometry(0.6, 0.8, 4, 6); trunkG.translate(0, 2, 0);
  const crownG = new THREE.IcosahedronGeometry(4.2, 0); crownG.scale(1, 1.25, 1); crownG.translate(0, 8, 0);
  const NT = 1800; const crowns = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ color: 0x3f5f2c, roughness: 0.9, flatShading: true }), NT * 9);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(); const col = new THREE.Color();
  const pts = []; for (let i = 0; i < NT; i++) { // en hileras a lo largo de los setos (múltiplos de 1/16 del mosaico)
    const along = rnd() * TILE, line = Math.floor(rnd() * 16) * TILE / 16; const vert = rnd() < 0.5; pts.push(vert ? [line + (rnd() - 0.5) * 8, along] : [along, line + (rnd() - 0.5) * 8]); }
  let k = 0; for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) for (const [x, z] of pts) { const s = 0.8 + rnd() * 0.8; m.compose(p.set(x + gx * TILE - TILE / 2, 0, z + gz * TILE - TILE / 2), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6), sc.set(s, s, s));
    crowns.setMatrixAt(k, m); crowns.setColorAt(k, col.setHSL(0.24 + rnd() * 0.08, 0.35 + rnd() * 0.2, 0.2 + rnd() * 0.1)); k++; }
  deco.add(crowns);
  // pueblos: casas con techo
  const houseG = new THREE.BoxGeometry(12, 7, 9); houseG.translate(0, 3.5, 0); const roofG = new THREE.ConeGeometry(9, 4.5, 4); roofG.rotateY(Math.PI / 4); roofG.scale(1, 1, 0.75); roofG.translate(0, 9.2, 0);
  const NH = 260, houses = new THREE.InstancedMesh(houseG, new THREE.MeshStandardMaterial({ color: 0xe7e1d6, roughness: 0.8 }), NH * 9), roofs = new THREE.InstancedMesh(roofG, new THREE.MeshStandardMaterial({ color: 0x9a4a36, roughness: 0.7 }), NH * 9);
  const towns = [[1500, 1500], [4300, 2300], [2600, 4700]]; const hp = []; for (let i = 0; i < NH; i++) { const [tx, tz] = towns[i % 3]; hp.push([tx + (rnd() - 0.5) * 420, tz + (rnd() - 0.5) * 420, rnd() * 6]); }
  k = 0; for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) for (const [x, z, r] of hp) { m.compose(p.set(x + gx * TILE - TILE / 2, 0, z + gz * TILE - TILE / 2), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r), sc.set(1, 1, 1)); houses.setMatrixAt(k, m); roofs.setMatrixAt(k, m);
    roofs.setColorAt(k, col.setHSL(0.02 + rnd() * 0.05, 0.45, 0.32 + rnd() * 0.12)); k++; }
  deco.add(houses, roofs); }
// nubes cúmulo: grupos de sprites con base gris y cima blanca
const clouds = new THREE.Group(); scene.add(clouds);
{ const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const rg = g.createRadialGradient(128, 128, 10, 128, 128, 128); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.55, 'rgba(255,255,255,.75)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) { const grp = new THREE.Group(); const base = 2300 + rnd() * 500; grp.position.set((rnd() - 0.5) * 24000, base, (rnd() - 0.5) * 24000); const W = 300 + rnd() * 500;
    for (let j = 0; j < 14; j++) { const h = rnd(); const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true, color: new THREE.Color().setHSL(0.6, 0.18, lerp(0.86, 1, h)), opacity: 0.95 });
      const s = new THREE.Sprite(mat); const sz = 160 + rnd() * 260; s.scale.set(sz, sz * 0.8, 1); s.position.set((rnd() - 0.5) * W, h * 180, (rnd() - 0.5) * W * 0.7); grp.add(s); }
    clouds.add(grp); } }

// ---------------- superficies de control (geometría de sim3d v2) ----------------
const thick = f => { const u = 1 - 2 * f; return 0.12 * (1 - u) * Math.sqrt(Math.max(0, (1 + u) / 2)) * 1.6; };
function surfMesh(secFn, z0, z1, f0, f1, eps = 0.014, hingeF = null) {
  const hf = hingeF ?? f0; const N = 8, M = 10, pos = [], idx = [];
  const hp = z => { const s = secFn(z); return new THREE.Vector3(s.le - hf * s.c, s.yc + thick(hf) * s.b * 0.33, z); };
  const A = hp(z0), B = hp(z1), mid = A.clone().add(B).multiplyScalar(0.5), axis = B.clone().sub(A).normalize();
  for (let i = 0; i <= N; i++) { const z = lerp(z0, z1, i / N); const s = secFn(z); const ring = [];
    for (let j = 0; j <= M; j++) { const f = lerp(f0, f1, j / M); ring.push([s.le - f * s.c, s.yc + thick(f) * s.b + eps]); }
    for (let j = M; j >= 0; j--) { const f = lerp(f0, f1, j / M); ring.push([s.le - f * s.c, s.yc - 0.35 * thick(f) * s.b - eps]); }
    for (const [x, y] of ring) pos.push(x - mid.x, y - mid.y, z - mid.z); }
  const RN = 2 * (M + 1);
  for (let i = 0; i < N; i++) for (let j = 0; j < RN - 1; j++) { const a = i * RN + j, b = a + RN; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  for (const i of [0, N]) for (let j = 1; j < RN - 1; j++) { const a = i * RN; idx.push(a, a + j, a + j + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const piv = new THREE.Group(); piv.position.copy(mid); piv.userData.axis = axis; piv.userData.geo = geo; return piv;
}
function rudderGeo(pts) { const sh = new THREE.Shape(); sh.moveTo(...pts[0]); for (const p of pts.slice(1)) sh.lineTo(...p); sh.lineTo(...pts[0]);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.17, bevelEnabled: false }); g.translate(0, 0, -0.085); return g; }
const DIH172 = Math.tan(1.7 * D2R), DIH28 = Math.tan(7 * D2R);
const GEOM = {
  c172: { wing: z => { const az = Math.abs(z); const c = az <= 2.55 ? 1.63 : 1.63 - 0.51 * (az - 2.55) / 2.95; return { le: 1.42, c, yc: 2.40 + az * DIH172, b: 0.55 * c / 1.63 }; },
    hs: z => { const az = Math.abs(z); const c = 1.15 - 0.4 * clamp(az / 1.7, 0, 1); return { le: -3.95 + (1.15 - c) * 0.2, c, yc: 1.83, b: 0.35 }; },
    surfaces(G) { return [
      ['ail', surfMesh(G.wing, -5.08, -2.95, 0.74, 1), 1], ['ail', surfMesh(G.wing, 2.95, 5.08, 0.74, 1), -1],
      ['flap', surfMesh(G.wing, -2.93, -0.62, 0.72, 1), 1], ['flap', surfMesh(G.wing, 0.62, 2.93, 0.72, 1), 1],
      ['elev', surfMesh(G.hs, -1.72, -0.16, 0.6, 1, 0.012), 1], ['elev', surfMesh(G.hs, 0.16, 1.72, 0.6, 1, 0.012), 1],
      ['rud', (() => { const p = new THREE.Group(); p.position.set(-4.72, 1.91, -0.01); p.userData.axis = new THREE.Vector3(0, 1, 0); p.userData.geo = rudderGeo([[0, 0], [-0.38, -0.01], [-0.33, 1.34], [0, 1.34]]); return p; })(), 1]]; } },
  pa28: { wing: z => { const az = Math.abs(z); const c = az <= 2.6 ? 1.60 : 1.60 - 0.53 * (az - 2.6) / 2.75; return { le: 1.55, c, yc: 0.68 + Math.max(0, az - 0.6) * DIH28, b: 0.55 * c / 1.60 }; },
    hs: () => ({ le: -3.35, c: 0.80, yc: 1.40, b: 0.32 }),
    surfaces(G) { return [
      ['ail', surfMesh(G.wing, -4.9, -3.0, 0.74, 1), 1], ['ail', surfMesh(G.wing, 3.0, 4.9, 0.74, 1), -1],
      ['flap', surfMesh(G.wing, -2.98, -0.62, 0.72, 1), 1], ['flap', surfMesh(G.wing, 0.62, 2.98, 0.72, 1), 1],
      ['stab', surfMesh(G.hs, -1.98, 1.98, 0, 1, 0.016, 0.3), 1],
      ['rud', (() => { const p = new THREE.Group(); p.position.set(-3.87, 1.45, -0.01); p.userData.axis = new THREE.Vector3(0, 1, 0); p.userData.geo = rudderGeo([[0, 0], [-0.31, -0.03], [-0.28, 0.80], [0, 0.80]]); return p; })(), 1]]; } },
};
const WHITE = new THREE.Color(0xf4f6f8), BLACK = new THREE.Color(0x000000); let showSurf = true;
const SCOL = { ail: '#f97316', flap: '#2dd4bf', elev: '#22d3ee', stab: '#22d3ee', rud: '#a78bfa' };
// detalles agregados (objetos aparte): luces, faro, antenas, pitot
const DET = {
  c172: { navL: [0.86, 2.58, -5.56], navR: [0.86, 2.58, 5.56], tail: [-5.0, 1.84, 0], beacon: [-4.82, 3.3, 0], ant: [[-1.6, 2.07, 0], [-2.5, 2.0, 0]], pitot: [1.45, 2.28, -2.4], step: [0.45, 0.9, -0.62] },
  pa28: { navL: [1.0, 1.28, -5.39], navR: [1.0, 1.28, 5.39], tail: [-4.14, 1.39, 0], beacon: [-4.0, 2.3, 0], ant: [[0.2, 1.82, 0], [-0.6, 1.8, 0]], pitot: [1.55, 0.86, -3.4], step: [0.3, 0.8, 0.62] },
};
function glow(color, size) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, '#fff'); rg.addColorStop(0.25, color); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(size); return s; }
const planes = {};
for (const type of ['c172', 'pa28']) {
  const a = AC[type], Gm = GEOM[type], d = DET[type];
  const root = new THREE.Group(); scene.add(root);
  const att = new THREE.Group(); att.rotation.order = 'YZX'; root.add(att);
  const body = new THREE.Group(); body.position.set(-a.cg[0], -a.cg[1], 0); att.add(body);
  const model = (type === 'c172' ? makeC172 : makePA28)(THREE); body.add(model);
  // materiales mejorados (solo en este simulador; la geometría oficial no cambia)
  const swap = new Map(); model.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; const m = o.material; if (swap.has(m)) { o.material = swap.get(m); return; }
    let n;
    if (m.vertexColors) n = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.02, clearcoat: 0.8, clearcoatRoughness: 0.08 });
    else if (m.side === THREE.DoubleSide && m.opacity > 0.9 && m.metalness >= 0.5) n = new THREE.MeshPhysicalMaterial({ color: 0x0c1626, roughness: 0.04, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6, side: THREE.DoubleSide });
    else if (m.metalness >= 0.5) n = new THREE.MeshPhysicalMaterial({ color: 0xd5dae2, roughness: 0.22, metalness: 1, envMapIntensity: 1.2 });
    else if (m.color && m.color.getHex() === 0x1f2125) n = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.85, metalness: 0 });
    else if (m.isMeshBasicMaterial) n = m;
    else n = new THREE.MeshPhysicalMaterial({ color: m.color, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 });
    n.shadowSide = THREE.DoubleSide; swap.set(m, n); o.material = n; });
  // superficies de control
  const surfs = [];
  for (const [part, piv, k] of Gm.surfaces(Gm)) {
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xf4f6f8, emissive: 0x000000, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 });
    const mesh = new THREE.Mesh(piv.userData.geo, mat); mesh.castShadow = true; piv.add(mesh); body.add(piv); surfs.push({ part, piv, k, deg: 0, mat, col: new THREE.Color(SCOL[part]) });
  }
  // luces y detalles
  const mk = (pos, color, size) => { const s = glow(color, size); s.position.set(...pos); body.add(s); return s; };
  const lights = { L: mk(d.navL, '#ff2a2a', 0.55), R: mk(d.navR, '#2aff5a', 0.55), T: mk(d.tail, '#ffffff', 0.45), bc: mk(d.beacon, '#ff3030', 0.45), sL: mk(d.navL, '#ffffff', 1.6), sR: mk(d.navR, '#ffffff', 1.6) };
  for (const [x, y, z] of d.ant) { const an = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.02), new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.6 })); an.position.set(x, y + 0.21, z); an.rotation.z = 0.35; an.castShadow = true; body.add(an); }
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 1, roughness: 0.3 })); pit.rotation.z = Math.PI / 2; pit.position.set(...d.pitot); body.add(pit);
  planes[type] = { type, root, att, body, model, surfs, lights };
  root.visible = false;
}

// ---------------- estado ----------------
let P = 'pa28', A = AC[P], PL = planes[P];
let ex = EX[0], st, taskI = 0, holdT = 0, done = false, stats, hist = [], paused = false, briefing = true;
const inp = { up: 0, dn: 0, lt: 0, rt: 0, rl: 0, rr: 0, trimUp: 0, trimDn: 0 }; let yoke = null;
let view = 'chase'; const orbit = { yaw: 0, pitch: 0, dist: 1, drag: null };
const VIEWS = { chase: { yaw: 180 + 22, pitch: 12, dist: 17 }, side: { yaw: 270, pitch: 4, dist: 20 }, front: { yaw: 35, pitch: 8, dist: 18 }, top: { yaw: 180, pitch: 70, dist: 45 } };
const alphaOf = (V) => 2.0 * Math.pow(A.cruise / Math.max(V, 35), 2) * (1 - 0.28 * (st ? st.flapDeg / A.flaps[3] : 0));

function reset() {
  const s0 = ex.start || {}; const V = s0.ias ?? A.cruise;
  st = { pitch: 0, bank: 0, V, alt: s0.alt ?? 3000, hdg: s0.hdg ?? 360, vs: 0, rpm: A.cruiseRpm, elev: 0, ail: 0, rud: 0, rudSet: 0, ball: 0, t: 0, gust: [0, 0], x: 0, z: 0,
    flapDeg: 0, flapCmd: 0, horn: false, stalled: false, spin: 0, spinRec: 0, stallCount: 0, spinCount: 0, stallV: 0, stallBank: 0, altAtStall: 0, minAlt: 0, buffet: 0 };
  st.pitch = alphaOf(V); st.trim = st.pitch + (s0.trimOff ?? 0);
  $('thr').value = Math.round((A.cruiseRpm - A.idle) / (A.maxRpm - A.idle) * 100);
  taskI = 0; holdT = 0; done = false; stats = { tin: 0, tall: 0, maxAltDev: 0 }; hist = [];
  $('result').classList.remove('show'); renderFlaps(); renderSteps(); msg(); paused = false; $('pauseBox').style.display = 'none'; $('pauseBtn').textContent = '❚❚';
}
const tgt = (T, k) => { const v = T[k]; return typeof v === 'string' ? A[v] : v; };
function check() {
  const T = ex.tasks[taskI]; if (!T) return { ok: false, items: [] };
  const items = [], add = (o) => items.push(o);
  if (T.ias !== undefined) { if (T.iasHi !== undefined) { const lo = tgt(T, 'ias'), hi = tgt(T, 'iasHi'); add({ k: 'ias', name: 'Velocidad', ok: st.V >= lo && st.V <= hi, val: st.V, lo, hi, unit: 'kt', mn: lo - 25, mx: hi + 25 }); }
    else { const c = tgt(T, 'ias'), tol = T.iasTol ?? 5; add({ k: 'ias', name: 'Velocidad', ok: Math.abs(st.V - c) <= tol, val: st.V, lo: c - tol, hi: c + tol, unit: 'kt', mn: c - 30, mx: c + 30 }); } }
  if (T.alt !== undefined) { const tol = T.altTol ?? 100; add({ k: 'alt', name: 'Altitud', ok: Math.abs(st.alt - T.alt) <= tol, val: st.alt, lo: T.alt - tol, hi: T.alt + tol, unit: 'ft', mn: T.alt - 400, mx: T.alt + 400 }); }
  if (T.hdg !== undefined) { const tol = T.hdgTol ?? 10, d = ((st.hdg - T.hdg + 540) % 360) - 180; add({ k: 'hdg', name: 'Rumbo', ok: Math.abs(d) <= tol, val: d, lo: -tol, hi: tol, unit: '°', mn: -60, mx: 60, show: String(Math.round(st.hdg) % 360 || 360).padStart(3, '0') + '°' }); }
  if (T.vs !== undefined) { const tol = T.vsTol ?? 150; add({ k: 'vs', name: 'Vel. vertical', ok: Math.abs(st.vs - T.vs) <= tol, val: st.vs, lo: T.vs - tol, hi: T.vs + tol, unit: 'ft/min', mn: T.vs - 1000, mx: T.vs + 1000 }); }
  if (T.bank !== undefined) { const tol = T.bankTol ?? 5; add({ k: 'bank', name: 'Inclinación', ok: Math.abs(Math.abs(st.bank) - T.bank) <= tol, val: Math.abs(st.bank), lo: T.bank - tol, hi: T.bank + tol, unit: '°', mn: 0, mx: 60 }); }
  if (T.turnDir) add({ name: 'Lado del viraje', flag: true, ok: Math.sign(st.bank) === T.turnDir, txt: T.turnDir > 0 ? 'derecha' : 'izquierda', bad: 'Vira hacia la ' + (T.turnDir > 0 ? 'derecha' : 'izquierda') });
  if (T.rpmMax !== undefined) add({ name: 'Potencia', flag: true, ok: st.rpm <= T.rpmMax, txt: `≤ ${T.rpmMax} RPM`, bad: `Reduce la potencia (≤ ${T.rpmMax} RPM)` });
  if (T.rpmMin !== undefined) add({ name: 'Potencia', flag: true, ok: st.rpm >= T.rpmMin, txt: `≥ ${T.rpmMin} RPM`, bad: `Más potencia (≥ ${T.rpmMin} RPM)` });
  if (T.ball) add({ k: 'ball', name: 'Bola', ok: Math.abs(st.ball) < 0.22, val: st.ball, lo: -0.22, hi: 0.22, unit: '', mn: -1, mx: 1, show: Math.abs(st.ball) < 0.22 ? 'centrada' : st.ball > 0 ? 'derecha' : 'izquierda', bad: 'Bola fuera: pisa el pedal del lado de la bola' });
  if (T.trim) add({ name: 'Compensado', flag: true, ok: Math.abs(st.elev) < 0.12, txt: 'sin presión', bad: 'Hay presión en el control: usa el compensador' });
  if (T.noHorn) add({ name: 'Bocina', flag: true, ok: !st.horn, txt: 'sin bocina', bad: 'Suena la bocina: un poco más de velocidad' });
  if (T.flaps !== undefined) { const want = T.flaps === 'full' ? A.flaps[3] : T.flaps; add({ name: 'Flaps', flag: true, ok: Math.abs(st.flapDeg - want) < 1, txt: want + '°', bad: want ? `Flaps a ${want}°` : 'Sube los flaps' }); }
  if (T.flapsMin !== undefined) add({ name: 'Flaps', flag: true, ok: st.flapDeg >= T.flapsMin, txt: 'abajo', bad: 'Baja los flaps' });
  if (T.event === 'stall') add({ name: 'Pérdida', flag: true, ok: st.stalled, txt: 'pérdida completa', bad: 'Todavía no hay pérdida' });
  if (T.event === 'spin') add({ name: 'Barrena', flag: true, ok: st.spin !== 0, txt: 'barrena', bad: 'Todavía no hay barrena' });
  if (T.event === 'spinStop') add({ name: 'Rotación', flag: true, ok: st.spin === 0 && st.spinCount > 0, txt: 'detenida', bad: 'Sigue con PARE hasta que pare la rotación' });
  if (T.event === 'recover') add({ name: 'Recuperación', flag: true, ok: !st.stalled && st.spin === 0 && st.V > A.vs1 + 10 && st.vs > -150, txt: 'recuperado', bad: 'Recupera: nariz al horizonte, potencia, sin descender' });
  return { ok: items.length > 0 && items.every(i => i.ok), items };
}
const fill = s => s.replace(/\{(\w+)\}/g, (m, k) => A[k]);
function renderSteps() {
  $('exTitle').textContent = (ex.mod ? ex.mod + ' · ' : '') + ex.t; $('exEn').textContent = ex.en; $('exBrief').textContent = ex.brief; $('exNote').innerHTML = ex.note || '';
  const ol = $('steps'); ol.innerHTML = ex.tasks.length ? '' : '<li class="now"><span class="n">∞</span><span>Vuelo libre: sin pasos ni calificación.</span></li>';
  ex.tasks.forEach((t, i) => { const li = document.createElement('li'); li.className = done || i < taskI ? 'ok' : i === taskI ? 'now' : ''; li.innerHTML = `<span class="n">${done || i < taskI ? '✓' : i + 1}</span><span>${fill(t.text)}</span>`; ol.appendChild(li); });
}
function msg() {
  const T = ex.tasks[taskI]; const el = $('msg');
  if (!T || done) { el.innerHTML = ''; $('meters').innerHTML = ''; return; }
  const c = check(); const bad = c.items.filter(i => !i.ok);
  let s = `<b>${fill(T.hint)}</b>`;
  if (bad.length) s += '<br>' + bad.map(b => b.bad || (b.k === 'hdg' ? `Rumbo: ${b.show} → meta ${String(T.hdg % 360 || 360).padStart(3, '0')}° ±${T.hdgTol ?? 10}°` : `${b.name}: ${Math.round(b.val).toLocaleString('en-US')} ${b.unit} → meta ${Math.round(b.lo).toLocaleString('en-US')}–${Math.round(b.hi).toLocaleString('en-US')} ${b.unit}`)).join(' · ');
  else s += '<br><span class="g">Dentro de tolerancia: mantenlo…</span>';
  el.innerHTML = s;
  $('meters').innerHTML = c.items.map(i => { if (i.flag) return `<div class="meter flag"><span class="nm">${i.name}</span><div class="tr" style="color:${i.ok ? '#22c55e' : '#ef4444'}">${i.ok ? '✓' : '✗'} ${i.txt}</div><span class="v"></span></div>`;
    const p = x => clamp((x - i.mn) / (i.mx - i.mn) * 100, 0, 100); return `<div class="meter"><span class="nm">${i.name}</span><div class="tr"><div class="band" style="left:${p(i.lo)}%;width:${p(i.hi) - p(i.lo)}%"></div><div class="pt ${i.ok ? '' : 'no'}" style="left:${p(i.val)}%"></div></div><span class="v">${i.show ?? (Math.round(i.val).toLocaleString('en-US') + ' ' + i.unit)}</span></div>`; }).join('');
}

// ---------------- física ----------------
function step(dt) {
  const ePress = (inp.up - inp.dn) + (ctlMode === 'gyro' ? gyro.elev : (yoke ? -yoke.y : 0)), aPress = (inp.rt - inp.lt) + (yoke ? yoke.x : 0);
  st.elev += (clamp(ePress, -1, 1) - st.elev) * Math.min(1, dt * 6);
  st.ail += (clamp(aPress, -1, 1) - st.ail) * Math.min(1, dt * 8);
  st.rudSet = clamp(st.rudSet + (inp.rr - inp.rl) * dt * 0.9, -1, 1); if (Math.abs(st.rudSet) < 0.02 && !inp.rr && !inp.rl) st.rudSet = 0;
  st.rud += (st.rudSet - st.rud) * Math.min(1, dt * 6);
  st.trim += (inp.trimUp - inp.trimDn) * dt * 1.6;
  st.flapDeg += clamp(st.flapCmd - st.flapDeg, -A.flapRate * dt, A.flapRate * dt);
  const f = st.flapDeg / A.flaps[3];
  const tRpm = A.idle + $('thr').value / 100 * (A.maxRpm - A.idle) + (st.V - A.cruise) * 3; st.rpm += (tRpm - st.rpm) * Math.min(1, dt * 2.5);
  const p = pOf(A, st.rpm);
  if (ex.gust) { st.gust[0] += (Math.random() - 0.5) * dt * 3 - st.gust[0] * dt * 0.8; st.gust[1] += (Math.random() - 0.5) * dt * 6 - st.gust[1] * dt * 0.8; } else st.gust = [0, 0];
  const cmdPitch = st.trim + st.elev * 12 + st.gust[0] - f * 2.5;
  st.pitch += (cmdPitch - st.pitch) * Math.min(1, dt * 1.8);
  const ab = Math.abs(st.bank); let tend = 0; if (ab < 20 && ab > 0.5) tend = -Math.sign(st.bank) * 0.6; else if (ab > 45) tend = Math.sign(st.bank) * 0.8;
  st.bank = clamp(st.bank + (st.ail * 18 + tend + st.gust[1]) * dt, -80, 80);
  const n = 1 / Math.cos(st.bank * D2R);
  let gam = (st.pitch - alphaOf(st.V) * n) * D2R;
  const vsNow = (A.vs1 - (A.vs1 - A.vs0) * f) * Math.sqrt(Math.max(1, n));
  st.horn = st.V < vsNow + 5 || st.stalled || st.spin !== 0; st.buffet = st.V < vsNow + 2 || st.stalled ? 1 : 0;
  if (!st.stalled && st.spin === 0 && st.V < vsNow) { st.stalled = true; st.stallCount++; st.stallV = st.V; st.stallBank = Math.abs(st.bank); st.altAtStall = st.alt; st.minAlt = st.alt;
    if (ex.spin && Math.abs(st.ball) > 0.35) { st.spin = Math.sign(-st.ball) || -1; st.spinCount++; } }
  if (st.stalled && st.spin === 0) { st.pitch -= dt * (st.elev > 0.2 ? 6 : 14); st.trim = Math.min(st.trim, st.pitch + 2); gam = (st.pitch - 14) * D2R; st.bank += dt * (Math.abs(st.ball) > 0.3 ? -Math.sign(st.ball) * 25 : 0);
    if (st.V > vsNow * 1.08 && st.elev < 0.3) st.stalled = false; }
  if (st.spin !== 0) { const d = st.spin; st.hdg = (st.hdg + d * 140 * dt + 360) % 360; st.bank += (d * 50 - st.bank) * dt * 2; st.pitch += (-45 - st.pitch) * dt * 2; st.trim = st.pitch; st.V += (62 - st.V) * dt; st.vs = -5000; st.alt += st.vs / 60 * dt;
    const pare = st.rpm < 1300 && Math.abs(st.ail) < 0.3 && st.rud * d < -0.5 && st.elev < -0.1; st.spinRec = pare ? st.spinRec + dt : 0;
    if (st.spinRec > 1.5) { st.spin = 0; st.stalled = false; st.pitch = -40; st.trim = -10; st.V = 75; }
    st.minAlt = Math.min(st.minAlt, st.alt); move(dt); st.t += dt; return; }
  st.minAlt = Math.min(st.minAlt || st.alt, st.alt);
  const dV = A.aT * p * (1 - st.V / 220) - A.cd * (1 + 0.7 * f) * st.V * st.V - A.ci * n * n / (st.V * st.V) - G * Math.sin(gam);
  st.V = Math.max(25, st.V + dV * dt);
  st.vs = st.V * 101.27 * Math.sin(gam); st.alt += st.vs / 60 * dt;
  st.hdg = (st.hdg + 1091 * Math.tan(st.bank * D2R) / st.V * dt + 360) % 360;
  const pf = Math.max(0, p - 0.55) * Math.max(0, (A.cruise + 5 - st.V)) / 30;
  st.ball += ((0.7 * st.ail + pf - st.rud) - st.ball) * Math.min(1, dt * 3);
  move(dt); st.t += dt;
}
function move(dt) { const v = st.V * 0.5144, h = st.hdg * D2R; st.x += Math.sin(h) * v * dt; st.z -= Math.cos(h) * v * dt; }

// ---------------- dibujo ----------------
const panelCv = $('panel'), pctx = panelCv.getContext('2d'); let layout = 'row', stripH = 0, showInst = true;
const ck = $('cockpit'), cctx = ck.getContext('2d');
function resize() { const r = stage.getBoundingClientRect(); R.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
  const dpr = Math.min(2, window.devicePixelRatio || 1); ck.width = r.width * dpr; ck.height = r.height * dpr; cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout = r.width < 700 ? 'grid' : 'row'; stripH = showInst ? stripHeight(r.width, layout) : 0;
  panelCv.style.display = showInst ? 'block' : 'none'; panelCv.style.height = stripH + 'px'; panelCv.width = Math.round(r.width * dpr); panelCv.height = Math.round(stripH * dpr); pdpr = dpr;
  // la escena se corre hacia arriba para que el avión no quede detrás del tablero
  if (stripH) cam.setViewOffset(r.width, r.height, 0, stripH * 0.5, r.width, r.height); else cam.clearViewOffset(); }
let pdpr = 1;
new ResizeObserver(resize).observe(stage); addEventListener('resize', resize);
function drawCockpit() {
  const r = stage.getBoundingClientRect(), W = r.width, H = r.height - stripH, g = cctx; g.clearRect(0, 0, W, r.height); if (view !== 'cockpit') return;
  const sx = W / 1000; const y0 = H - 40 * sx;
  // marco y postes
  g.fillStyle = '#15181d'; g.fillRect(0, 0, W, 30 * sx); g.beginPath(); g.moveTo(0, 0); g.lineTo(60 * sx, 0); g.lineTo(18 * sx, H); g.lineTo(0, H); g.fill(); g.beginPath(); g.moveTo(W, 0); g.lineTo(W - 60 * sx, 0); g.lineTo(W - 18 * sx, H); g.lineTo(W, H); g.fill();
  if (A.high) { const wg = g.createLinearGradient(0, 0, 0, 120 * sx); wg.addColorStop(0, '#f2f4f7'); wg.addColorStop(1, '#bcc4ce');
    g.fillStyle = wg; g.beginPath(); g.moveTo(0, 30 * sx); g.lineTo(240 * sx, 30 * sx); g.lineTo(140 * sx, 96 * sx); g.lineTo(0, 124 * sx); g.fill(); g.beginPath(); g.moveTo(W, 30 * sx); g.lineTo(W - 240 * sx, 30 * sx); g.lineTo(W - 140 * sx, 96 * sx); g.lineTo(W, 124 * sx); g.fill();
    g.strokeStyle = '#cfd5dc'; g.lineWidth = 9 * sx; g.lineCap = 'round'; g.beginPath(); g.moveTo(24 * sx, H * 0.62); g.lineTo(150 * sx, 92 * sx); g.stroke(); g.beginPath(); g.moveTo(W - 24 * sx, H * 0.62); g.lineTo(W - 150 * sx, 92 * sx); g.stroke(); }
  else { const wg = g.createLinearGradient(0, H * 0.7, 0, H); wg.addColorStop(0, '#eef1f4'); wg.addColorStop(1, '#aab3be');
    g.fillStyle = wg; g.beginPath(); g.moveTo(0, H * 0.72); g.lineTo(190 * sx, H * 0.80); g.lineTo(190 * sx, H); g.lineTo(0, H); g.fill(); g.beginPath(); g.moveTo(W, H * 0.72); g.lineTo(W - 190 * sx, H * 0.80); g.lineTo(W - 190 * sx, H); g.lineTo(W, H); g.fill();
    g.fillStyle = '#c8102e'; g.beginPath(); g.moveTo(0, H * 0.72); g.lineTo(26 * sx, H * 0.733); g.lineTo(26 * sx, H); g.lineTo(0, H); g.fill(); g.beginPath(); g.moveTo(W, H * 0.72); g.lineTo(W - 26 * sx, H * 0.733); g.lineTo(W - 26 * sx, H); g.lineTo(W, H); g.fill(); }
  // brújula
  const cy0 = 62; g.fillStyle = '#20242b'; g.fillRect(W / 2 - 40, cy0 - 6, 80, 40); g.fillStyle = '#000'; g.fillRect(W / 2 - 30, cy0, 60, 26);
  g.save(); g.beginPath(); g.rect(W / 2 - 30, cy0, 60, 26); g.clip(); g.font = '700 13px Inter'; g.fillStyle = '#fff'; g.textAlign = 'center';
  for (let d = -60; d <= 60; d += 15) { const hd = (Math.round(st.hdg / 15) * 15 + d + 360) % 360; const xx = W / 2 + (hd - st.hdg + (Math.abs(hd - st.hdg) > 180 ? (hd > st.hdg ? -360 : 360) : 0)) * 1.6; const lb = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[hd] ?? (hd % 30 === 0 ? hd / 10 : '·'); g.fillText(lb, xx, cy0 + 18); }
  g.restore(); g.fillStyle = '#f59e0b'; g.fillRect(W / 2 - 1, cy0, 2, 26); g.fillStyle = '#15181d'; g.fillRect(W / 2 - 2, 0, 4, cy0 - 6);
  // capó
  const cg = g.createLinearGradient(0, y0 - 70 * sx, 0, H); cg.addColorStop(0, '#f6f8fa'); cg.addColorStop(0.6, '#c3cad3'); cg.addColorStop(1, '#7e8792');
  g.fillStyle = cg; g.beginPath(); g.moveTo(130 * sx, H); g.bezierCurveTo(270 * sx, y0, 420 * sx, y0 - 46 * sx, W / 2, y0 - 50 * sx); g.bezierCurveTo(W - 420 * sx, y0 - 46 * sx, W - 270 * sx, y0, W - 130 * sx, H); g.fill();
  g.strokeStyle = A.high ? '#1b2f63' : '#c8102e'; g.lineWidth = 5 * sx; g.beginPath(); g.moveTo(W / 2, y0 - 50 * sx); g.lineTo(W / 2, H); g.stroke();
  const gs = g.createLinearGradient(0, H - 34 * sx, 0, H); gs.addColorStop(0, '#2a2f37'); gs.addColorStop(1, '#0d0f12'); g.fillStyle = gs; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H - 26 * sx); g.quadraticCurveTo(W / 2, H - 48 * sx, W, H - 26 * sx); g.lineTo(W, H); g.fill();
}
function hud() {
  const T = ex.tasks[taskI]; const c = check(); const okOf = k => { const i = c.items.find(x => x.k === k); return i ? i.ok : null; };
  const items = [['Velocidad', Math.round(st.V) + ' kt', okOf('ias')], ['Altitud', Math.round(st.alt).toLocaleString('en-US') + ' ft', okOf('alt')], ['Inclinación', Math.round(Math.abs(st.bank)) + '°' + (Math.abs(st.bank) > 1 ? (st.bank > 0 ? ' D' : ' I') : ''), okOf('bank')], ['Vel. vertical', (Math.round(st.vs / 10) * 10) + ' ft/min', okOf('vs')]];
  $('hud').innerHTML = items.map(([k, v, ok]) => `<div class="h ${ok === null ? '' : ok ? 'ok' : 'no'}"><small>${k}</small><b>${v}</b></div>`).join('');
  const al = $('alert'); const vfeX = st.flapDeg > 0.5 && st.V > A.vfe(st.flapDeg) + 2;
  const txt = st.spin ? 'BARRENA' : st.stalled ? 'PÉRDIDA' : st.horn ? 'BOCINA DE PÉRDIDA' : vfeX ? 'EXCESO DE VELOCIDAD CON FLAPS' : st.V > (P === 'c172' ? 163 : 160) ? 'EXCESO DE VNE' : '';
  al.style.display = txt && (Math.floor(performance.now() / 280) % 2 === 0 || st.stalled || st.spin) ? 'block' : 'none'; al.textContent = txt;
}
function panel() {
  $('rpmv').textContent = Math.round(st.rpm / 10) * 10; $('trimMark').style.left = `${50 + clamp((st.trim - alphaOf(A.cruise)) / 8, -1, 1) * 45}%`; $('pedMark').style.left = `${50 + st.rudSet * 45}%`;
  const T = ex.tasks[taskI] || {}; const c = check(); const it = k => c.items.find(x => x.k === k);
  const band = {}; const ias = it('ias'); if (ias) band.asi = [ias.lo, ias.hi, ias.ok]; const al = it('alt'); if (al) band.alt = [al.lo, al.hi, al.ok]; if (T.hdg !== undefined) band.hdg = [T.hdg - (T.hdgTol ?? 10), T.hdg + (T.hdgTol ?? 10), it('hdg').ok];
  const hl = []; if (ias) hl.push('asi'); if (T.bank !== undefined || T.event) hl.push('ai'); if (al) hl.push('alt'); if (T.ball) hl.push('tc'); if (T.hdg !== undefined) hl.push('hi'); if (T.vs !== undefined) hl.push('vsi');
  if (!showInst) return;
  pctx.setTransform(pdpr, 0, 0, pdpr, 0, 0);
  const shake = st.buffet ? (Math.random() - 0.5) * 2 : 0; pctx.translate(shake, shake * 0.5);
  drawStrip(pctx, panelCv.width / pdpr, stripH, { ias: st.V, pitch: st.pitch, bank: st.bank, alt: st.alt, hdg: st.hdg, vs: st.vs, rpm: st.rpm, turn: 1091 * Math.tan(st.bank * D2R) / st.V + (st.spin ? st.spin * 6 : 0), ball: st.ball, flaps: st.flapDeg, trim: clamp((st.trim - alphaOf(A.cruise)) / 8, -1, 1), horn: st.horn }, { plane: P, hl: done ? [] : hl, band: done ? {} : band, layout });
}
function camera(dt) {
  const pv = PL.root.position; const h = st.hdg * D2R;
  if (view === 'cockpit') {
    const e = A.eye; const p = new THREE.Vector3(e[0] - A.cg[0], e[1] - A.cg[1], e[2]).applyQuaternion(PL.att.quaternion).add(pv);
    cam.position.copy(p); const look = new THREE.Vector3(1, -0.07, 0).applyQuaternion(PL.att.quaternion); const up = new THREE.Vector3(0, 1, 0).applyQuaternion(PL.att.quaternion);
    if (st.buffet) cam.position.addScalar((Math.random() - 0.5) * 0.02); cam.up.copy(up); cam.lookAt(p.clone().add(look)); cam.fov = 68; cam.updateProjectionMatrix(); return;
  }
  const v = VIEWS[view]; const yaw = (v.yaw + orbit.yaw) * D2R + (Math.PI / 2 - h), pitch = clamp(v.pitch + orbit.pitch, -10, 85) * D2R, dist = v.dist * orbit.dist * (cam.aspect < 1 ? 1.5 : 1);
  const off = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw)).multiplyScalar(dist);
  // en persecución, la cámara sigue el rumbo con suavidad
  cam.position.copy(pv).add(off); cam.up.set(0, 1, 0); cam.lookAt(pv.x, pv.y + 0.4, pv.z); cam.fov = 40; cam.updateProjectionMatrix();
  if (st.buffet) cam.position.addScalar((Math.random() - 0.5) * 0.05);
}
function render3d(t) {
  for (const k in planes) planes[k].root.visible = k === P && view !== 'cockpit';
  const pv = PL.root.position.set(st.x, st.alt * FT, st.z);
  PL.att.rotation.set(st.bank * D2R, Math.PI / 2 - st.hdg * D2R, st.pitch * D2R);
  // hélice y superficies
  const prop = PL.model.userData.prop; prop.rotation.x += (st.rpm / 60) * 2 * Math.PI * 0.016 * 0.35; PL.model.userData.disc.material.opacity = st.rpm > 1200 ? 0.16 : 0.06;
  for (const s of PL.surfs) { let deg = 0; if (s.part === 'ail') deg = 15 * st.ail * s.k; else if (s.part === 'flap') deg = st.flapDeg; else if (s.part === 'elev') deg = -22 * st.elev; else if (s.part === 'stab') deg = -12 * st.elev; else if (s.part === 'rud') deg = 20 * st.rud;
    s.piv.quaternion.setFromAxisAngle(s.piv.userData.axis, deg * D2R); const k = showSurf ? clamp(Math.abs(deg) / 6, 0, 1) : 0; s.mat.color.copy(WHITE).lerp(s.col, k); s.mat.emissive.copy(BLACK).lerp(s.col, k * 0.45); }
  // luces: estroboscópicas y faro
  const L = PL.lights; const strobe = (t % 1.2) < 0.06; L.sL.visible = L.sR.visible = strobe; L.bc.material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 6.5));
  // mundo que sigue al avión
  const snap = v => Math.round(v / TILE) * TILE; ground.position.set(snap(pv.x), 0, snap(pv.z)); deco.position.set(snap(pv.x), 0, snap(pv.z));
  for (const c of clouds.children) { for (const ax of ['x', 'z']) { const d = c.position[ax] - pv[ax]; if (d > 12000) c.position[ax] -= 24000; if (d < -12000) c.position[ax] += 24000; } }
  sun.position.copy(pv).addScaledVector(sunDir, 40); sun.target.position.copy(pv); sky.position.copy(pv); sunGlow.position.copy(pv).addScaledVector(sunDir, 30000);
  camera();
  R.render(scene, cam);
}
// ---------------- bucle ----------------
let last = performance.now(), msgT = 0, histT = 0;
function loop(now) {
  requestAnimationFrame(loop); const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!paused && !briefing && !document.hidden) {
    const n = Math.max(2, Math.ceil(dt / 0.0125)); for (let i = 0; i < n; i++) step(dt / n);
    if (ex.tasks.length && !done) {
      const T = ex.tasks[taskI]; const c = check(); stats.tall += dt; if (c.ok) stats.tin += dt;
      const al = c.items.find(x => x.k === 'alt'); if (al) stats.maxAltDev = Math.max(stats.maxAltDev, Math.abs(st.alt - T.alt));
      holdT = c.ok ? holdT + dt : Math.max(0, holdT - dt * 2); $('hold').style.width = Math.min(100, holdT / T.hold * 100) + '%';
      if (holdT >= T.hold) { taskI++; holdT = 0; if (taskI >= ex.tasks.length) finish(); else renderSteps(); }
      histT += dt; if (histT > 0.5) { histT = 0; hist.push([st.V, st.alt, st.stalled || st.spin ? 1 : 0]); if (hist.length > 600) hist.shift(); }
    }
    msgT += dt; if (msgT > 0.25) { msgT = 0; msg(); }
  }
  render3d(now / 1000); drawCockpit(); hud(); panel(); gyroKnob();
}
function finish() {
  done = true; renderSteps(); msg();
  const pct = Math.round(100 * stats.tin / Math.max(1, stats.tall)); const stars = pct >= 90 ? 4 : pct >= 75 ? 3 : pct >= 55 ? 2 : 1;
  $('score').innerHTML = '★'.repeat(stars) + '☆'.repeat(4 - stars) + ` <small>${pct} % del tiempo en tolerancia</small>`;
  const s = [['TIEMPO', Math.round(stats.tall) + ' s'], ['EN TOLERANCIA', pct + ' %']];
  if (stats.maxAltDev) s.push(['DESVÍO MÁX. DE ALTITUD', Math.round(stats.maxAltDev) + ' ft']);
  if (st.stallCount) s.push(['PÉRDIDA A', Math.round(st.stallV) + ' kt'], ['INCLINACIÓN', Math.round(st.stallBank) + '°'], ['ALTURA PERDIDA', Math.max(0, Math.round(st.altAtStall - st.minAlt)) + ' ft']);
  $('rstats').innerHTML = s.map(([k, v]) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`).join('');
  let t = `Avión: <b>${A.name}</b>. `; t += pct >= 75 ? 'Buen trabajo. Repite con el otro avión: las velocidades cambian.' : `Practícalo otra vez. <b>Repasa: ${REV[ex.id]} → Video + Teoría</b>.`;
  if (st.stallCount) t += ` La velocidad de pérdida sin flaps en vuelo nivelado es ${A.vs1} kt.`;
  if (ex.note) t += `<br><span style="color:#facc15">${ex.note}</span>`;
  $('rtext').innerHTML = t + `<canvas class="chart" id="chart" width="680" height="200" aria-label="Gráfica de velocidad y altitud"></canvas>`;
  chart(); $('result').classList.add('show');
  try { const k = 'c2sim-done'; const d = JSON.parse(localStorage.getItem(k) || '{}'); d[ex.id] = Math.max(d[ex.id] || 0, stars); localStorage.setItem(k, JSON.stringify(d)); } catch (e) {}
  buildSelect();
}
function chart() {
  const c = $('chart').getContext('2d'), W = 680, H = 200; c.fillStyle = 'rgba(3,12,28,.6)'; c.fillRect(0, 0, W, H); if (hist.length < 2) return;
  const vs = hist.map(h => h[0]), as = hist.map(h => h[1]); const [v0, v1] = [Math.min(...vs) - 5, Math.max(...vs) + 5], [a0, a1] = [Math.min(...as) - 50, Math.max(...as) + 50];
  c.strokeStyle = 'rgba(255,255,255,.1)'; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(0, i * 40); c.lineTo(W, i * 40); c.stroke(); }
  const X = i => 10 + i * (W - 20) / (hist.length - 1);
  hist.forEach((h, i) => { if (h[2]) { c.fillStyle = 'rgba(239,68,68,.22)'; c.fillRect(X(i) - 3, 0, 6, H); } });
  const plot = (arr, mn, mx, col) => { c.strokeStyle = col; c.lineWidth = 3.5; c.beginPath(); arr.forEach((v, i) => { const y = H - 14 - (v - mn) / (mx - mn) * (H - 40); i ? c.lineTo(X(i), y) : c.moveTo(X(i), y); }); c.stroke(); };
  plot(vs, v0, v1, '#4fd8ff'); plot(as, a0, a1, '#facc15');
  c.font = '600 17px Inter'; c.fillStyle = '#4fd8ff'; c.fillText(`Velocidad ${Math.round(v0 + 5)}–${Math.round(v1 - 5)} kt`, 12, 22); c.fillStyle = '#facc15'; c.textAlign = 'right'; c.fillText(`Altitud ${Math.round(a0 + 50)}–${Math.round(a1 - 50)} ft`, W - 12, 22); c.textAlign = 'left';
}
// ---------------- selector de ejercicio (mismo link para todos: #m2-l1 … #m3-l5, #libre) ----------------
function buildSelect() {
  let d = {}; try { d = JSON.parse(localStorage.getItem('c2sim-done') || '{}'); } catch (e) {}
  const sel = $('exSel'); let html = '', open = false;
  for (const e of EX) { if (e.grp) { if (open) html += '</optgroup>'; html += `<optgroup label="${e.grp}">`; open = true; } html += `<option value="${e.id}" ${e.id === ex.id ? 'selected' : ''}>${e.t}${d[e.id] ? '  ✓ ' + '★'.repeat(d[e.id]) : ''}</option>`; }
  sel.innerHTML = html + '</optgroup>';
}
function setExercise(id, brief = true) { ex = EX.find(e => e.id === id) || EX[0]; buildSelect(); reset(); if (location.hash.slice(1) !== ex.id) history.replaceState(null, '', '#' + ex.id); if (brief) openBrief(); }
$('exSel').addEventListener('change', e => setExercise(e.target.value));
addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id && id !== ex.id && EX.some(e => e.id === id)) setExercise(id); });
$('nextBtn').addEventListener('click', () => { const i = EX.indexOf(ex); setExercise(EX[Math.min(EX.length - 1, i + 1)].id); });
$('againBtn').addEventListener('click', () => reset());

// ---------------- controles ----------------
function renderFlaps() { $('flapsBox').innerHTML = A.flaps.map(f => `<button data-flap="${f}" class="${f === st.flapCmd ? 'on' : ''}">${f}°</button>`).join('');
  $('flapsBox').querySelectorAll('button').forEach(b => b.onclick = () => { st.flapCmd = +b.dataset.flap; renderFlaps(); }); }
function flapStep(d) { const i = A.flaps.indexOf(st.flapCmd); st.flapCmd = A.flaps[clamp(i + d, 0, A.flaps.length - 1)]; renderFlaps(); }
const keymap = { ArrowUp: 'up', ArrowDown: 'dn', ArrowLeft: 'lt', ArrowRight: 'rt', z: 'rl', x: 'rr', Z: 'rl', X: 'rr', t: 'trimUp', g: 'trimDn', T: 'trimUp', G: 'trimDn' };
addEventListener('keydown', e => { if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  if (keymap[e.key]) { inp[keymap[e.key]] = 1; e.preventDefault(); }
  const thr = $('thr'); if (e.key === 'a' || e.key === 'A') thr.value = Math.max(0, +thr.value - 2); if (e.key === 's' || e.key === 'S') thr.value = Math.min(100, +thr.value + 2);
  if (e.key === 'f' || e.key === 'F') flapStep(1); if (e.key === 'v' || e.key === 'V') flapStep(-1); if (e.key === 'p' || e.key === 'P') togglePause();
  if (e.key === 'c' || e.key === 'C') { const order = ['chase', 'side', 'front', 'top', 'cockpit']; setView(order[(order.indexOf(view) + 1) % order.length]); } });
addEventListener('keyup', e => { if (keymap[e.key]) inp[keymap[e.key]] = 0; });
document.querySelectorAll('[data-hold]').forEach(b => { const k = b.dataset.hold; const on = e => { e.preventDefault(); inp[k] = 1; b.classList.add('on'); }, off = () => { inp[k] = 0; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off); });
$('pedBar').addEventListener('dblclick', () => { st.rudSet = 0; }); $('trimBar').addEventListener('dblclick', () => { st.trim = alphaOf(A.cruise); });
// yugo virtual
const yk = $('yoke'), knob = $('knob');
const yMove = e => { const r = yk.getBoundingClientRect(); const x = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1), y = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1); yoke = { x, y }; knob.style.transform = `translate(${x * (r.width / 2 - 30)}px,${y * (r.height / 2 - 30)}px)`; };
yk.addEventListener('pointerdown', e => { yk.setPointerCapture(e.pointerId); yMove(e); });
yk.addEventListener('pointermove', e => { if (yoke) yMove(e); });
const yEnd = () => { yoke = null; knob.style.transform = ''; }; yk.addEventListener('pointerup', yEnd); yk.addEventListener('pointercancel', yEnd);
// cámara: arrastrar para girar, rueda o pellizco para acercar
cv.addEventListener('pointerdown', e => { if (view === 'cockpit') return; orbit.drag = { x: e.clientX, y: e.clientY, yaw: orbit.yaw, pitch: orbit.pitch }; cv.setPointerCapture(e.pointerId); $('dragHint').style.display = 'none'; });
cv.addEventListener('pointermove', e => { if (!orbit.drag) return; orbit.yaw = orbit.drag.yaw - (e.clientX - orbit.drag.x) * 0.4; orbit.pitch = orbit.drag.pitch + (e.clientY - orbit.drag.y) * 0.25; });
cv.addEventListener('pointerup', () => orbit.drag = null); cv.addEventListener('pointercancel', () => orbit.drag = null);
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.dist = clamp(orbit.dist * (e.deltaY > 0 ? 1.08 : 0.92), 0.45, 3); }, { passive: false });
let pinch = null; cv.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY) / orbit.dist; }, { passive: true });
cv.addEventListener('touchmove', e => { if (pinch && e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); orbit.dist = clamp(d / pinch, 0.45, 3); } }, { passive: true });
cv.addEventListener('touchend', () => pinch = null);
function setView(v) { view = v; orbit.yaw = 0; orbit.pitch = 0; orbit.dist = 1; document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === v)); ck.style.display = v === 'cockpit' ? 'block' : 'none'; $('dragHint').style.display = v === 'cockpit' ? 'none' : ''; }
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
function setPlane(t) { P = t; A = AC[t]; PL = planes[t]; document.querySelectorAll('[data-ac]').forEach(b => b.classList.toggle('on', b.dataset.ac === t)); reset(); }
document.querySelectorAll('[data-ac]').forEach(b => b.addEventListener('click', () => setPlane(b.dataset.ac)));
$('instBtn').addEventListener('click', () => { showInst = !showInst; $('instBtn').classList.toggle('on', showInst); $('instBtn').setAttribute('aria-pressed', showInst); resize(); });
function togglePause() { paused = !paused; $('pauseBox').style.display = paused ? 'flex' : 'none'; $('pauseBtn').textContent = paused ? '▶' : '❚❚'; }
$('pauseBtn').addEventListener('click', togglePause); $('restartBtn').addEventListener('click', reset);


// ---------------- giroscopio para la profundidad (elevador) ----------------
let ctlMode = 'touch', gyroSens = 'baja', gyroInv = false;
// el giroscopio solo funciona si la página se abre sola (fuera del marco de Claude) y por https
const canGyro = (() => { try { return window.self === window.top && typeof DeviceOrientationEvent !== 'undefined' && window.isSecureContext; } catch (e) { return false; } })();
if (!canGyro) document.querySelectorAll('.gyroOnly').forEach(el => el.style.display = 'none');
const gyro = { on: false, b0: null, v: null, elev: 0, got: 0 };
function tiltVal(e) { const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  if (e.beta == null) return null; if (ang === 90) return -e.gamma; if (ang === -90 || ang === 270) return e.gamma; if (ang === 180) return -e.beta; return e.beta; }
function onOrient(e) { const v = tiltVal(e); if (v == null) return; gyro.v = v; gyro.got++; if (gyro.b0 == null) gyro.b0 = v;
  let d = v - gyro.b0; if (d > 180) d -= 360; if (d < -180) d += 360;
  const dz = 2.5, K = gyroSens === 'baja' ? 40 : 25; const m = Math.abs(d) < dz ? 0 : (d - Math.sign(d) * dz) / K;
  const tgt = clamp((gyroInv ? 1 : -1) * m, -1, 1); gyro.elev += (tgt - gyro.elev) * 0.18; }
async function enableGyro() {
  const msgEl = $('gMsg'); msgEl.textContent = '';
  try { if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') throw new Error('perm'); } }
  catch (err) { setCtl('touch'); msgEl.textContent = 'No se dio permiso para usar el giroscopio. Seguimos con el yugo táctil.'; return false; }
  if (!gyro.on) { addEventListener('deviceorientation', onOrient); gyro.on = true; }
  gyro.b0 = null; gyro.elev = 0; const n0 = gyro.got;
  setTimeout(() => { if (ctlMode === 'gyro' && gyro.got === n0) { setCtl('touch'); const t = 'Este teléfono o navegador no envía datos del giroscopio en esta página. Seguimos con el yugo táctil.'; $('gMsg').textContent = t; showToast(t); } }, 1800);
  return true; }
function setCtl(m) { ctlMode = m; $('mTouch').classList.toggle('on', m === 'touch'); $('mGyro').classList.toggle('on', m === 'gyro'); $('yoke').classList.toggle('gyro', m === 'gyro');
  document.querySelectorAll('[data-bctl]').forEach(b => b.classList.toggle('on', b.dataset.bctl === m)); $('bGyro').hidden = m !== 'gyro'; if (m !== 'gyro') gyro.elev = 0; }
$('mTouch').addEventListener('click', () => setCtl('touch'));
$('mGyro').addEventListener('click', () => { setCtl('gyro'); enableGyro(); });
$('gyroCal').addEventListener('click', e => { e.stopPropagation(); gyro.b0 = gyro.v; gyro.elev = 0; });
$('gyroCal').addEventListener('pointerdown', e => e.stopPropagation());
function showToast(t) { const a = $('alert'); a.textContent = t; a.style.display = 'block'; a.style.whiteSpace = 'normal'; a.style.background = 'rgba(30,41,59,.95)'; a.style.boxShadow = 'none'; a.style.fontSize = '12px'; a.style.letterSpacing = '0';
  setTimeout(() => { a.style.display = ''; a.style.whiteSpace = ''; a.style.background = ''; a.style.boxShadow = ''; a.style.fontSize = ''; a.style.letterSpacing = ''; a.textContent = ''; }, 5000); }
function gyroKnob() { if (ctlMode !== 'gyro') return; const r = $('yoke').getBoundingClientRect(); const x = yoke ? yoke.x : 0;
  $('knob').style.transform = `translate(${x * (r.width / 2 - 30)}px,${-gyro.elev * (r.height / 2 - 30)}px)`; }

// ---------------- inicio: elegir lección + briefing + Iniciar ----------------
function openPick() { briefing = true; let d = {}; try { d = JSON.parse(localStorage.getItem('c2sim-done') || '{}'); } catch (e) {}
  let h = ''; for (const e of EX) { if (e.grp) h += `<div class="pgrp">${e.grp}</div>`; h += `<button class="pick" data-pick="${e.id}"><span>${e.mod ? e.mod + ' · ' : ''}${e.t}</span><small>${d[e.id] ? '✓ ' + '★'.repeat(d[e.id]) : ''}</small></button>`; }
  $('pickList').innerHTML = h; $('pickList').querySelectorAll('[data-pick]').forEach(b => b.onclick = () => setExercise(b.dataset.pick));
  $('introPick').hidden = false; $('introBrief').hidden = true; $('intro').classList.remove('hide'); $('intro').scrollTop = 0; }
function fillBrief() { $('bMod').textContent = 'BRIEFING' + (ex.mod ? ' · C2 · ' + ex.mod : ''); $('bTitle').textContent = ex.t; $('bEn').textContent = ex.en || ''; $('bBrief').textContent = ex.brief || '';
  $('bSteps').innerHTML = ex.tasks.length ? ex.tasks.map(t => `<li>${fill(t.text)}</li>`).join('') : '<li>Vuelo libre: practica lo que quieras, sin pasos ni calificación.</li>';
  $('bNote').innerHTML = ex.note || ''; $('bNote').style.display = ex.note ? '' : 'none';
  document.querySelectorAll('[data-bac]').forEach(b => b.classList.toggle('on', b.dataset.bac === P));
  $('bSpeeds').textContent = `${A.name}: VS1 ${A.vs1} · VS0 ${A.vs0} · VX ${A.vx} · VY ${A.vy} · mejor planeo ${A.glide} kt · flaps ${A.flaps.join('/')}°`;
  document.querySelectorAll('[data-sens]').forEach(b => b.classList.toggle('on', b.dataset.sens === gyroSens)); $('bInv').checked = gyroInv; setCtl(ctlMode); }
function openBrief() { briefing = true; fillBrief(); $('gMsg').textContent = ''; $('introPick').hidden = true; $('introBrief').hidden = false; $('intro').classList.remove('hide'); $('intro').scrollTop = 0; }
document.querySelectorAll('[data-bac]').forEach(b => b.addEventListener('click', () => { setPlane(b.dataset.bac); fillBrief(); }));
document.querySelectorAll('[data-bctl]').forEach(b => b.addEventListener('click', () => setCtl(b.dataset.bctl)));
document.querySelectorAll('[data-sens]').forEach(b => b.addEventListener('click', () => { gyroSens = b.dataset.sens; fillBrief(); }));
$('bInv').addEventListener('change', e => { gyroInv = e.target.checked; });
$('bBack').addEventListener('click', openPick);
$('bStart').addEventListener('click', async () => { if (ctlMode === 'gyro') await enableGyro(); reset(); briefing = false; $('intro').classList.add('hide'); });

// ---------------- arranque ----------------
resize();
const startId = location.hash.slice(1); ex = EX.find(e => e.id === startId) || EX[0];
setPlane('pa28'); buildSelect(); setView('chase');
$('loading').remove();
if (EX.some(e => e.id === startId)) openBrief(); else openPick();
requestAnimationFrame(loop);
window.__sim = { start() { briefing = false; $('intro').classList.add('hide'); }, openPick, openBrief, get st() { return st; }, step, setExercise, setPlane, setView, check, finish, get ex() { return ex; } };
