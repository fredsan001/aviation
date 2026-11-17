// Panel de instrumentos detallado (six-pack + motor + flaps/compensador + anunciadores)
const D2R = Math.PI / 180;
const ARC = { c172: { w: [40, 85], g: [48, 129], y: [129, 163], r: 163 }, pa28: { w: [44, 103], g: [50, 126], y: [126, 160], r: 160 } };
export function drawPanel(ctx, W, H, s, o = {}) {
  const plane = o.plane || 'c172';
  // fondo del tablero
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a2f37'); bg.addColorStop(0.08, '#1d2128'); bg.addColorStop(1, '#14171c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.05; for (let y = 0; y < H; y += 3) { ctx.fillStyle = y % 6 ? '#fff' : '#000'; ctx.fillRect(0, y, W, 1); } ctx.globalAlpha = 1;
  // borde superior acolchado (glareshield)
  const gs = ctx.createLinearGradient(0, 0, 0, 22); gs.addColorStop(0, '#0b0d10'); gs.addColorStop(1, '#22262d'); ctx.fillStyle = gs; ctx.fillRect(0, 0, W, 22);
  const narrow = !!o.narrow;
  const R = narrow ? 92 : 74, gx = 2 * R + 34, gy = 2 * R + 40;
  const x0 = narrow ? 30 + R + 14 : 280, y0 = narrow ? 120 + R : 30 + R + 8;
  const pos = [[x0, y0], [x0 + gx, y0], [x0 + 2 * gx, y0], [x0, y0 + gy], [x0 + gx, y0 + gy], [x0 + 2 * gx, y0 + gy]];
  const pTxt = plane === 'c172' ? 'CESSNA 172S' : 'PIPER PA-28-161', pCol = plane === 'c172' ? '#2f6fd6' : '#c8102e';
  if (narrow) { plate(ctx, 24, 36, 200, 54, pTxt, pCol); annuncRow(ctx, 240, 48, W - 264, s); }
  else { plate(ctx, 26, 40, 154, 54, pTxt, pCol); clock(ctx, 104, y0 + gy, 56); annunc(ctx, 26, 112, 154, s); }
  const hl = o.hl || [];
  const draw = [() => asi(ctx, ...pos[0], R, s.ias, plane, o.band?.asi), () => ai(ctx, ...pos[1], R, s.pitch, s.bank), () => alt(ctx, ...pos[2], R, s.alt, o.band?.alt),
    () => tc(ctx, ...pos[3], R, s.turn, s.ball), () => hi(ctx, ...pos[4], R, s.hdg, o.band?.hdg), () => vsi(ctx, ...pos[5], R, s.vs)];
  const names = ['asi', 'ai', 'alt', 'tc', 'hi', 'vsi'];
  draw.forEach((f, i) => { bezel(ctx, ...pos[i], R); f(); glass(ctx, ...pos[i], R); if (hl.includes(names[i])) { ctx.beginPath(); ctx.arc(...pos[i], R + 14, 0, 7); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4; ctx.shadowColor = '#facc15'; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0; } });
  // grupo motor
  let tx, ty, fx, fy, trx, fh;
  if (narrow) { ty = y0 + 2 * gy; tx = x0; fx = x0 + gx - 40; fy = ty - R; trx = x0 + gx + 50; fh = 2 * R; clock(ctx, x0 + 2 * gx, ty, R * 0.8); }
  else { const ex = x0 + 3 * gx - 10; tx = ex + 60; ty = y0; fx = ex + 8; fy = y0 + gy - R; trx = ex + 82; fh = 2 * R; }
  const TR = narrow ? R * 0.92 : R * 0.92;
  bezel(ctx, tx, ty, TR); tach(ctx, tx, ty, TR, s.rpm); glass(ctx, tx, ty, TR);
  flapsInd(ctx, fx, fy, 56, fh, s.flaps, plane);
  trimInd(ctx, trx, fy, 56, fh, s.trim);
  // etiquetas de instrumentos
  ctx.font = `700 ${narrow ? 14 : 11}px Inter, sans-serif`; ctx.fillStyle = '#8a96a8'; ctx.textAlign = 'center';
  ['VELOCIDAD', 'ACTITUD', 'ALTÍMETRO', 'COORDINADOR', 'RUMBO', 'VEL. VERTICAL'].forEach((t, i) => ctx.fillText(t, pos[i][0], pos[i][1] + R + 24));
  ctx.fillText('TACÓMETRO', tx, ty + TR + 24); ctx.fillText('FLAPS', fx + 28, fy + fh + 22); ctx.fillText('COMPENSADOR', trx + 28, fy + fh + 22); ctx.textAlign = 'left';
}
function screw(ctx, x, y) { const g = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 5); g.addColorStop(0, '#d7dce3'); g.addColorStop(1, '#4a525e'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a2f37'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.stroke(); }
function bezel(ctx, cx, cy, R) {
  ctx.fillStyle = '#0e1013'; rr(ctx, cx - R - 14, cy - R - 14, 2 * R + 28, 2 * R + 28, 12); ctx.fill();
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) screw(ctx, cx + dx * (R + 6), cy + dy * (R + 6));
  const g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R + 8); g.addColorStop(0, '#000'); g.addColorStop(0.6, '#3b414b'); g.addColorStop(1, '#16191e');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#08090b'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
}
function glass(ctx, cx, cy, R) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip(); const g = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.2, cy + R * 0.3); g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(0.45, 'rgba(255,255,255,0.03)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx - R * 0.25, cy - R * 0.35, R * 0.95, R * 0.6, -0.5, 0, 7); ctx.fill();
  const v = ctx.createRadialGradient(cx, cy, R * 0.75, cx, cy, R); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = v; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R); ctx.restore(); }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function needle(ctx, cx, cy, ang, len, w = 4, col = '#f4f4f4', tail = 14) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
  ctx.beginPath(); ctx.moveTo(-w, tail); ctx.lineTo(-w * 0.6, -len * 0.75); ctx.lineTo(0, -len); ctx.lineTo(w * 0.6, -len * 0.75); ctx.lineTo(w, tail); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.restore();
  const g = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, 8); g.addColorStop(0, '#888'); g.addColorStop(1, '#222'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill(); }
function ticks(ctx, cx, cy, R, a0, a1, n, major, len = [8, 14]) { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; const L = i % major ? len[0] : len[1]; ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = i % major ? 1.5 : 2.6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3)); ctx.lineTo(cx + Math.cos(a) * (R - 3 - L), cy + Math.sin(a) * (R - 3 - L)); ctx.stroke(); } }
function txt(ctx, t, x, y, sz, col = '#ececec', wt = 700) { ctx.font = `${wt} ${sz}px Inter, sans-serif`; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
function bandArc(ctx, cx, cy, R, a0, a1, ok) { ctx.beginPath(); ctx.arc(cx, cy, R + 4, a0, a1); ctx.strokeStyle = ok ? '#22c55e' : '#ef4444'; ctx.lineWidth = 6; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0; }
function asi(ctx, cx, cy, R, v, plane, band) {
  const a = s => (-160 + (Math.min(Math.max(s, 30), 200) - 30) / 170 * 320) * D2R - Math.PI / 2; const A = ARC[plane];
  const arc = (s0, s1, col, rad, w) => { ctx.beginPath(); ctx.arc(cx, cy, rad, a(s0), a(s1)); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); };
  arc(A.w[0], A.w[1], '#f4f4f4', R - 20, 5); arc(A.g[0], A.g[1], '#22c55e', R - 11, 8); arc(A.y[0], A.y[1], '#facc15', R - 11, 8); arc(A.r - 0.6, A.r + 0.8, '#ef4444', R - 11, 14);
  ticks(ctx, cx, cy, R, a(40), a(200), 32, 4);
  for (let s = 40; s <= 200; s += 20) { const an = a(s); txt(ctx, s, cx + Math.cos(an) * (R - 33), cy + Math.sin(an) * (R - 33), 13); }
  txt(ctx, 'KNOTS', cx, cy + 26, 9, '#bbb');
  if (band) bandArc(ctx, cx, cy, R, a(band[0]), a(band[1]), band[2]);
  needle(ctx, cx, cy, a(v) + Math.PI / 2, R - 10);
}
function ai(ctx, cx, cy, R, pitch, bank) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip(); ctx.translate(cx, cy); ctx.rotate(-bank * D2R); const py = pitch * 3.3;
  const sky = ctx.createLinearGradient(0, -R * 2 + py, 0, py); sky.addColorStop(0, '#0f4c9c'); sky.addColorStop(1, '#3d8fe0'); ctx.fillStyle = sky; ctx.fillRect(-2 * R, -2 * R + py, 4 * R, 2 * R);
  const gr = ctx.createLinearGradient(0, py, 0, py + 2 * R); gr.addColorStop(0, '#8a5a2b'); gr.addColorStop(1, '#4d3015'); ctx.fillStyle = gr; ctx.fillRect(-2 * R, py, 4 * R, 2 * R);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-2 * R, py); ctx.lineTo(2 * R, py); ctx.stroke();
  ctx.lineWidth = 1.8; for (const p of [-20, -10, -5, 5, 10, 20]) { const yy = py - p * 3.3, hw = Math.abs(p) >= 10 ? 26 : 13; ctx.beginPath(); ctx.moveTo(-hw, yy); ctx.lineTo(hw, yy); ctx.stroke(); if (Math.abs(p) >= 10) { txt(ctx, Math.abs(p), -hw - 10, yy, 9); txt(ctx, Math.abs(p), hw + 10, yy, 9); } }
  // anillo de inclinación
  for (const b of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) { const an = (b - 90) * D2R; const L = b % 30 === 0 ? 14 : 9; ctx.strokeStyle = '#fff'; ctx.lineWidth = b === 0 ? 0 : 2.2; ctx.beginPath(); ctx.moveTo(Math.cos(an) * (R - 2), Math.sin(an) * (R - 2)); ctx.lineTo(Math.cos(an) * (R - 2 - L), Math.sin(an) * (R - 2 - L)); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -R + 3); ctx.lineTo(-7, -R + 15); ctx.lineTo(7, -R + 15); ctx.closePath(); ctx.fill();
  ctx.restore();
  // índice fijo y avión miniatura
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(0, -R + 17); ctx.lineTo(-7, -R + 29); ctx.lineTo(7, -R + 29); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-52, 0); ctx.lineTo(-18, 0); ctx.lineTo(-9, 9); ctx.moveTo(52, 0); ctx.lineTo(18, 0); ctx.lineTo(9, 9); ctx.stroke(); ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, 7); ctx.fill(); ctx.restore();
}
function alt(ctx, cx, cy, R, ft, band) {
  ticks(ctx, cx, cy, R, -Math.PI / 2, Math.PI * 1.5, 50, 5);
  for (let i = 0; i < 10; i++) { const an = i / 10 * 2 * Math.PI - Math.PI / 2; txt(ctx, i, cx + Math.cos(an) * (R - 27), cy + Math.sin(an) * (R - 27), 16); }
  // ventana Kollsman
  ctx.fillStyle = '#000'; rr(ctx, cx + R * 0.28, cy - 9, 40, 18, 3); ctx.fill(); txt(ctx, '29.92', cx + R * 0.28 + 20, cy, 10, '#f4f4f4');
  txt(ctx, '100 FEET', cx, cy + 30, 8, '#bbb');
  if (band) { const a = f => ((f % 1000 + 1000) % 1000) / 1000 * 2 * Math.PI - Math.PI / 2; bandArc(ctx, cx, cy, R, a(band[0]), a(band[1]), band[2]); }
  needle(ctx, cx, cy, (ft / 10000) * 2 * Math.PI, R * 0.48, 6, '#d9d9d9', 8);
  needle(ctx, cx, cy, ((ft % 1000) / 1000) * 2 * Math.PI, R - 12, 3.5, '#f4f4f4');
}
function tc(ctx, cx, cy, R, turn, ball) {
  txt(ctx, 'L', cx - R + 26, cy + 30, 13); txt(ctx, 'R', cx + R - 26, cy + 30, 13); txt(ctx, 'TURN COORDINATOR', cx, cy - R + 26, 7.5, '#bbb'); txt(ctx, '2 MIN', cx, cy + R - 14, 8, '#bbb');
  ctx.fillStyle = '#f4f4f4'; for (const s of [-1, 1]) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(s * 20 * D2R); ctx.fillRect(R - 28, -3, 18, 6); ctx.restore(); ctx.fillRect(s < 0 ? cx - R + 10 : cx + R - 28, cy - 3, 18, 6); }
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.max(-35, Math.min(35, turn / 3 * 20)) * D2R); ctx.fillStyle = '#f4f4f4'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.ellipse(0, 0, R - 26, 4.5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill(); ctx.fillRect(-3, -18, 6, 14); ctx.fillRect(-14, -4, 28, 3); ctx.restore();
  const bw = 100; const bx = cx - bw / 2, by = cy + 36; const tube = ctx.createLinearGradient(0, by, 0, by + 24); tube.addColorStop(0, '#9aa'); tube.addColorStop(0.5, '#f0f0e8'); tube.addColorStop(1, '#9aa');
  ctx.fillStyle = tube; rr(ctx, bx, by, bw, 24, 12); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 13, by); ctx.lineTo(cx - 13, by + 24); ctx.moveTo(cx + 13, by); ctx.lineTo(cx + 13, by + 24); ctx.stroke();
  const bg = ctx.createRadialGradient(cx + ball * 38 - 3, by + 9, 1, cx + ball * 38, by + 12, 11); bg.addColorStop(0, '#666'); bg.addColorStop(1, '#050505'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx + Math.max(-38, Math.min(38, ball * 38)), by + 12, 10.5, 0, 7); ctx.fill();
}
function hi(ctx, cx, cy, R, hdg, band) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-hdg * D2R);
  const lab = { 0: 'N', 3: '3', 6: '6', 9: 'E', 12: '12', 15: '15', 18: 'S', 21: '21', 24: '24', 27: 'W', 30: '30', 33: '33' };
  for (let d = 0; d < 360; d += 5) { ctx.save(); ctx.rotate(d * D2R); ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = d % 10 ? 1.2 : 2.2; ctx.beginPath(); ctx.moveTo(0, -R + 3); ctx.lineTo(0, -R + (d % 30 === 0 ? 17 : d % 10 ? 8 : 12)); ctx.stroke(); if (d % 30 === 0) txt(ctx, lab[d / 10], 0, -R + 31, d % 90 === 0 ? 16 : 13, d % 90 === 0 ? '#fff' : '#ddd', 800); ctx.restore(); }
  if (band) { ctx.beginPath(); ctx.arc(0, 0, R + 4, (band[0] - 90) * D2R, (band[1] - 90) * D2R); ctx.strokeStyle = band[2] ? '#22c55e' : '#ef4444'; ctx.lineWidth = 6; ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = '#f59e0b'; ctx.fillStyle = '#f59e0b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, 24); ctx.moveTo(-26, -2); ctx.lineTo(26, -2); ctx.moveTo(-10, 20); ctx.lineTo(10, 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -R + 1); ctx.lineTo(-6, -R - 9); ctx.lineTo(6, -R - 9); ctx.closePath(); ctx.fill(); ctx.restore();
}
function vsi(ctx, cx, cy, R, fpm) {
  const a = v => Math.PI + Math.max(-2000, Math.min(2000, v)) / 2000 * 170 * D2R;
  ticks(ctx, cx, cy, R, a(-2000), a(2000), 40, 5);
  for (const v of [-2000, -1500, -1000, -500, 0, 500, 1000, 1500, 2000]) { const an = a(v); txt(ctx, Math.abs(v) / 100, cx + Math.cos(an) * (R - 30), cy + Math.sin(an) * (R - 30), 13); }
  txt(ctx, 'UP', cx + 10, cy - 24, 10, '#bbb'); txt(ctx, 'DOWN', cx + 10, cy + 24, 10, '#bbb'); 
  needle(ctx, cx, cy, a(fpm) + Math.PI / 2, R - 12);
}
function tach(ctx, cx, cy, R, rpm) {
  const a = r => (-135 + Math.min(3500, Math.max(0, r)) / 3500 * 270) * D2R - Math.PI / 2;
  ctx.beginPath(); ctx.arc(cx, cy, R - 10, a(2100), a(2700)); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 7; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R - 10, a(2690), a(2720)); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 12; ctx.stroke();
  ticks(ctx, cx, cy, R, a(0), a(3500), 35, 5);
  for (let r = 0; r <= 35; r += 5) { const an = a(r * 100); txt(ctx, r, cx + Math.cos(an) * (R - 29), cy + Math.sin(an) * (R - 29), 13); }
  txt(ctx, 'RPM', cx, cy + 22, 10, '#bbb'); txt(ctx, 'X100', cx, cy + 34, 8, '#bbb');
  ctx.fillStyle = '#000'; rr(ctx, cx - 26, cy + R * 0.42, 52, 15, 3); ctx.fill(); txt(ctx, '1234.5', cx, cy + R * 0.42 + 8, 9, '#ddd', 600);
  needle(ctx, cx, cy, a(rpm) + Math.PI / 2, R - 10);
}
function flapsInd(ctx, x, y, w, h, deg, plane) {
  const max = plane === 'c172' ? 30 : 40; const marks = plane === 'c172' ? [0, 10, 20, 30] : [0, 10, 25, 40];
  ctx.fillStyle = '#08090b'; rr(ctx, x, y, w, h, 8); ctx.fill(); ctx.strokeStyle = '#3b414b'; ctx.lineWidth = 2; ctx.stroke();
  marks.forEach(m => { const yy = y + 14 + (h - 28) * m / max; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 6, yy); ctx.lineTo(x + 16, yy); ctx.stroke(); txt(ctx, m + '°', x + 32, yy, 11); });
  const yy = y + 14 + (h - 28) * Math.min(deg, max) / max; ctx.fillStyle = '#2dd4bf'; ctx.beginPath(); ctx.moveTo(x + 4, yy); ctx.lineTo(x - 8, yy - 7); ctx.lineTo(x - 8, yy + 7); ctx.closePath(); ctx.fill();
}
function trimInd(ctx, x, y, w, h, trim) {
  ctx.fillStyle = '#08090b'; rr(ctx, x, y, w, h, 8); ctx.fill(); ctx.strokeStyle = '#3b414b'; ctx.lineWidth = 2; ctx.stroke();
  txt(ctx, 'NOSE', x + w / 2, y + 14, 8, '#bbb'); txt(ctx, 'DN', x + w / 2, y + 26, 9); txt(ctx, 'UP', x + w / 2, y + h - 14, 9);
  const yy = y + h / 2 + Math.max(-1, Math.min(1, trim)) * (h / 2 - 40); ctx.fillStyle = '#f472b6'; rr(ctx, x + 8, yy - 4, w - 16, 8, 4); ctx.fill();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1; for (let i = -5; i <= 5; i++) { const ty = y + h / 2 + i * (h / 2 - 40) / 5; ctx.beginPath(); ctx.moveTo(x + 6, ty); ctx.lineTo(x + 12, ty); ctx.stroke(); }
}
function plate(ctx, x, y, w, h, t, col) { const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#c9ced6'); g.addColorStop(1, '#8b939e'); ctx.fillStyle = g; rr(ctx, x, y, w, h, 6); ctx.fill(); ctx.fillStyle = col; ctx.fillRect(x + 8, y + h - 12, w - 16, 4); txt(ctx, t, x + w / 2, y + h / 2 - 4, 12, '#111', 800); }
function clock(ctx, cx, cy, R) { bezel(ctx, cx, cy, R); ticks(ctx, cx, cy, R, -Math.PI / 2, Math.PI * 1.5, 12, 3, [5, 9]); needle(ctx, cx, cy, 0.9, R * 0.55, 3); needle(ctx, cx, cy, 4.2, R * 0.8, 2); glass(ctx, cx, cy, R); }
function annuncRow(ctx, x, y, w, s) {
  const items = [['STALL', s.horn, '#ef4444'], ['LOW VAC', false, '#f59e0b'], ['VOLTS', false, '#f59e0b']]; const bw = (w - 16) / 3;
  items.forEach(([t, on, c], i) => { const xx = x + i * (bw + 8); ctx.fillStyle = on ? c : '#2a2010'; rr(ctx, xx, y, bw, 30, 5); ctx.fill(); if (on) { ctx.shadowColor = c; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0; } txt(ctx, t, xx + bw / 2, y + 15, 14, on ? '#fff' : '#5c4a2a', 800); });
}
function annunc(ctx, x, y, w, s) {
  const items = [['STALL', s.horn, '#ef4444'], ['LOW VAC', false, '#f59e0b'], ['VOLTS', false, '#f59e0b']];
  items.forEach(([t, on, c], i) => { const yy = y + i * 30; ctx.fillStyle = on ? c : '#2a2010'; rr(ctx, x, yy, w, 24, 4); ctx.fill(); if (on) { ctx.shadowColor = c; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0; } txt(ctx, t, x + w / 2, yy + 12, 11, on ? '#fff' : '#5c4a2a', 800); });
}

// ---------- tablero compacto dentro de la vista 3D ----------
// layout 'row' (computadora): 7 instrumentos en una fila · 'grid' (celular): six-pack 3×2 + fila de datos
export function stripHeight(W, layout) {
  if (layout === 'grid') { const R = Math.min(W < 420 ? 37 : 40, (W / 3 - 20) / 2); return 2 * (2 * R + 27) + 40; }
  const R = Math.min(54, (W / 7 - 18) / 2); return 2 * R + 40;
}
export function drawStrip(ctx, W, H, s, o = {}) {
  const plane = o.plane || 'c172', layout = o.layout || 'row', hl = o.hl || [];
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, 'rgba(20,23,28,0.0)'); bg.addColorStop(0.08, 'rgba(22,25,30,0.92)'); bg.addColorStop(1, 'rgba(14,16,20,0.97)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(79,216,255,0.35)'; ctx.fillRect(0, 6, W, 1.5);
  const names = ['asi', 'ai', 'alt', 'tc', 'hi', 'vsi', 'tach'], labels = ['VELOCIDAD', 'ACTITUD', 'ALTÍMETRO', 'COORDINADOR', 'RUMBO', 'VEL. VERTICAL', 'RPM'];
  let pos = [], R;
  if (layout === 'grid') { R = Math.min(W < 420 ? 37 : 40, (W / 3 - 20) / 2); const cw = W / 3, rh = 2 * R + 27;
    for (let i = 0; i < 6; i++) pos.push([cw * (i % 3) + cw / 2, 14 + R + Math.floor(i / 3) * rh]); }
  else { R = Math.min(54, (W / 7 - 18) / 2); const cw = W / 7; for (let i = 0; i < 7; i++) pos.push([cw * i + cw / 2, 14 + R]); }
  const Q = 74; const fn = [(x, y) => asi(ctx, x, y, Q, s.ias, plane, o.band?.asi), (x, y) => ai(ctx, x, y, Q, s.pitch, s.bank), (x, y) => alt(ctx, x, y, Q, s.alt, o.band?.alt),
    (x, y) => tc(ctx, x, y, Q, s.turn, s.ball), (x, y) => hi(ctx, x, y, Q, s.hdg, o.band?.hdg), (x, y) => vsi(ctx, x, y, Q, s.vs), (x, y) => tach(ctx, x, y, Q, s.rpm)];
  const k = R / 74; // escala de textos y agujas respecto al diseño original
  pos.forEach(([x, y], i) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y);
    bezelS(ctx, x, y, Q); fn[i](x, y); glass(ctx, x, y, Q);
    ctx.restore();
    if (hl.includes(names[i])) { ctx.beginPath(); ctx.arc(x, y, R + 9, 0, 7); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.shadowColor = '#facc15'; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0; }
    ctx.font = `700 ${Math.max(9, R * 0.15)}px Inter, sans-serif`; ctx.fillStyle = '#8a96a8'; ctx.textAlign = 'center'; ctx.fillText(labels[i], x, y + R + 17); ctx.textAlign = 'left';
  });
  if (layout === 'grid') { // fila de datos: RPM · flaps · compensador · STALL
    const y = H - 30, chips = [[`${Math.round(s.rpm / 10) * 10} RPM`, '#e8e8e8'], [`FLAPS ${Math.round(s.flaps)}°`, '#2dd4bf'], [`TRIM ${s.trim > 0.15 ? 'NARIZ ARRIBA' : s.trim < -0.15 ? 'NARIZ ABAJO' : 'NEUTRO'}`, '#f472b6'], ['STALL', s.horn ? '#ef4444' : '#5c4a2a']];
    const cw = (W - 16) / 4; chips.forEach(([t, c], i) => { const x = 8 + i * cw; ctx.fillStyle = i === 3 && s.horn ? 'rgba(239,68,68,.9)' : 'rgba(255,255,255,0.06)'; rr(ctx, x + 3, y, cw - 6, 24, 6); ctx.fill();
      ctx.font = `800 ${W < 360 ? 10 : 11}px Inter, sans-serif`; ctx.fillStyle = i === 3 && s.horn ? '#fff' : c; ctx.textAlign = 'center'; ctx.fillText(t, x + cw / 2, y + 16); ctx.textAlign = 'left'; });
  }
}
function bezelS(ctx, cx, cy, R) { const g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R + 8); g.addColorStop(0, '#000'); g.addColorStop(0.6, '#3b414b'); g.addColorStop(1, '#16191e'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, 7); ctx.fill(); ctx.fillStyle = '#08090b'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill(); }
