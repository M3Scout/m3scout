/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-expressions, prefer-const */
// @ts-nocheck
/* =====================================================================
   Motor da jogada — câmera 3D de transmissão desenhada em <canvas>.
   Portado literalmente de m3-home-2.html.
   Mundo em metros: x 0→105 (ataque para a direita), y 0→68, z altura.
   ===================================================================== */

export interface HeroOptions {
  onAthlete: (id: string, name: string) => void;
}

export function startHero(hero: HTMLElement, opts: HeroOptions): () => void {
  const cleanups: (() => void)[] = [];
  let stopped = false, raf = 0, heroOn = true, heroResume = null, fxTimer = 0;
  const TEAM = '#FF3B30';
  const ATHLETES = {
    v: { name: 'Vitor',         pos: 'ZAG', role: 'Zagueiro',         href: '#talentos-vitor' },
    h: { name: 'Hilton Santos', pos: 'LE',  role: 'Lateral esquerdo', href: '#talentos-hilton-santos' },
    a: { name: 'Alexandre',     pos: 'MC',  role: 'Meio-campo',       href: '#talentos-alexandre' },
    c: { name: 'Corona',        pos: 'MEI', role: 'Meio-atacante',    href: '#talentos-corona' },
    j: { name: 'Joaquim',       pos: 'PE',  role: 'Ponta esquerda',   href: '#talentos-joaquim' },
    m: { name: 'Matheus',       pos: 'PD',  role: 'Ponta direita',    href: '#talentos-matheus' },
  };
  const IDS = Object.keys(ATHLETES);

  /* ---------- Jogadas: [tempo(s), x, y] por atleta; bola por segmentos ---------- */
  const PLAYS = [
    { // 01 · triangulação pela esquerda → Corona
      keys: {
        v: [[0,17,28],[1.0,19,29],[8,30,31],[10.4,44,31]],
        a: [[0,36,37],[1.5,38,38],[2.4,42,41],[8,56,41],[10.4,82,28]],
        h: [[0,25,56],[2.9,42,61],[4.1,58,62],[8,70,58],[10.4,86,36]],
        j: [[0,63,54],[4.6,78,48],[5.0,80,46],[7.2,90,44],[10.4,98,16]],
        c: [[0,50,33],[3.5,66,35],[5.5,82,35],[6.3,90,34],[7.0,93,32],[8.6,100,20],[10.4,103,10]],
        m: [[0,63,12],[5,82,20],[7.2,94,24],[10.4,100,6]],
      },
      ball: [
        ['hold','v',0,1.0], ['pass','v','a',1.0,1.5,.3], ['hold','a',1.5,2.4],
        ['pass','a','h',2.4,2.9,1.6], ['hold','h',2.9,4.1], ['pass','h','j',4.1,4.6,.4],
        ['hold','j',4.6,5.0], ['pass','j','c',5.0,5.5,.3], ['hold','c',5.5,6.3],
        ['shot','c',6.3,6.85,[106.1,36.3,1.9],.6],
      ],
    },
    { // 02 · inversão, lançamento e cruzamento → Corona
      keys: {
        v: [[0,17,28],[0.9,18,28],[8,28,30],[10,40,32]],
        c: [[0,50,33],[1.4,46,29],[2.1,48,30],[4.8,84,30],[5.6,92,32],[6.3,95,33],[7.8,100,46],[9.8,102,58]],
        a: [[0,36,37],[2.6,42,34],[3.2,44,35],[8,60,40],[9.8,86,48]],
        m: [[0,63,12],[4.0,74,8],[4.9,86,10],[6,93,16],[9.8,99,50]],
        h: [[0,25,56],[8,48,60],[9.8,80,60]],
        j: [[0,63,54],[5,88,48],[7,95,46],[9.8,100,62]],
      },
      ball: [
        ['hold','v',0,.9], ['pass','v','c',.9,1.4,.25], ['hold','c',1.4,2.1],
        ['pass','c','a',2.1,2.6,.25], ['hold','a',2.6,3.2], ['pass','a','m',3.2,4.0,7],
        ['hold','m',4.0,4.9], ['pass','m','c',4.9,5.6,2.4],
        ['shot','c',5.6,6.1,[106.3,31.4,1.1],.3],
      ],
    },
    { // 03 · tabela com Joaquim → Corona
      keys: {
        v: [[0,17,28],[0.9,18,30],[8,27,34],[10,40,34]],
        h: [[0,25,56],[1.7,27,54],[2.6,34,56],[8,55,60],[9.8,82,44]],
        j: [[0,63,54],[3.2,53,52],[3.7,55,50],[4.9,66,47],[7,84,50],[9.8,98,22]],
        c: [[0,50,33],[4.2,61,39],[4.5,63,40],[5.4,82,38],[5.9,88,36],[6.6,92,34],[8,99,25],[9.8,102,13]],
        a: [[0,36,37],[8,52,36],[9.8,86,26]],
        m: [[0,63,12],[6,88,18],[9.8,100,6]],
      },
      ball: [
        ['hold','v',0,.9], ['pass','v','h',.9,1.7,3], ['hold','h',1.7,2.6],
        ['pass','h','j',2.6,3.2,.3], ['hold','j',3.2,3.7], ['pass','j','c',3.7,4.2,.25],
        ['hold','c',4.2,4.5], ['pass','c','j',4.5,4.9,.2], ['pass','j','c',4.9,5.4,.25],
        ['hold','c',5.4,5.9], ['shot','c',5.9,6.4,[106.4,32.2,.35],.15],
      ],
    },
  ];
  PLAYS.length = 1;
  const CELEBRATE = 3.6;   // segundos de comemoração antes da próxima jogada

  /* ---------- Caminhos suaves (Hermite com tempo) ---------- */
  function makePath(k) {
    const n = k.length;
    const m = k.map((p, i) => {
      if (i === 0 || i === n - 1) return [0, 0];
      const a = k[i - 1], b = k[i + 1], dt = b[0] - a[0];
      return [(b[1] - a[1]) / dt, (b[2] - a[2]) / dt];
    });
    return (t) => {
      if (t <= k[0][0]) return { x: k[0][1], y: k[0][2] };
      if (t >= k[n - 1][0]) return { x: k[n - 1][1], y: k[n - 1][2] };
      let i = 0; while (t > k[i + 1][0]) i++;
      const a = k[i], b = k[i + 1], h = b[0] - a[0], s = (t - a[0]) / h, s2 = s * s, s3 = s2 * s;
      const h00 = 2*s3 - 3*s2 + 1, h10 = s3 - 2*s2 + s, h01 = -2*s3 + 3*s2, h11 = s3 - s2;
      return {
        x: h00*a[1] + h10*h*m[i][0] + h01*b[1] + h11*h*m[i+1][0],
        y: h00*a[2] + h10*h*m[i][1] + h01*b[2] + h11*h*m[i+1][1],
      };
    };
  }
  PLAYS.forEach((pl) => {
    pl.path = {}; IDS.forEach((id) => (pl.path[id] = makePath(pl.keys[id])));
    pl.segs = pl.ball.map((s) => s[0] === 'hold' ? { type: 'hold', who: s[1], t0: s[2], t1: s[3] }
      : s[0] === 'pass' ? { type: 'pass', from: s[1], to: s[2], t0: s[3], t1: s[4], h: s[5] }
      : { type: 'shot', from: s[1], t0: s[2], t1: s[3], target: s[4], h: s[5] });
    pl.shot = pl.segs[pl.segs.length - 1];
    pl.goalT = pl.shot.t1;
    pl.end = pl.goalT + CELEBRATE;
  });

  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function atFeet(pl, id, t) {
    const P = pl.path[id], p = P(t), q = P(t + .06), r = P(t - .06);
    const vx = (q.x - r.x) / .12, vy = (q.y - r.y) / .12, sp = Math.hypot(vx, vy);
    const dx = sp > .4 ? vx / sp : 1, dy = sp > .4 ? vy / sp : 0;
    return { x: p.x + dx * 1.1, y: p.y + dy * 1.1, z: .11 + (sp > 1.5 ? Math.abs(Math.sin(t * 10)) * .1 : 0) };
  }

  function ballAt(pl, t) {
    const segs = pl.segs;
    if (t <= 0) return { ...atFeet(pl, segs[0].who, 0), owner: segs[0].who };
    for (const s of segs) {
      if (t > s.t1 && s !== pl.shot) continue;
      const u = clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
      if (s.type === 'hold') return { ...atFeet(pl, s.who, t), owner: s.who };
      if (s.type === 'pass') {
        const a = atFeet(pl, s.from, s.t0), b = atFeet(pl, s.to, s.t1), e = 1 - Math.pow(1 - u, 1.7);
        return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z: .11 + 4 * s.h * u * (1 - u), owner: s.to };
      }
      // chute
      const a = atFeet(pl, s.from, s.t0), [tx, ty, tz] = s.target;
      if (t <= s.t1) {
        const e = 1 - Math.pow(1 - u, 2.2);
        return { x: lerp(a.x, tx, e), y: lerp(a.y, ty, e), z: lerp(.11, tz, e) + 4 * s.h * u * (1 - u) * .5, owner: null };
      }
      const d = t - s.t1, tf = .42;
      const z = d < tf ? tz - (tz - .11) * (d / tf) ** 2 : .11 + .32 * Math.abs(Math.sin((d - tf) * 7)) * Math.exp(-(d - tf) * 4);
      return { x: tx - .5 * Math.min(d / .6, 1), y: ty, z, owner: null };
    }
  }

  /* ---------- Canvas + câmera ---------- */
    const cv = hero.querySelector('canvas'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, portrait = false;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    portrait = W / H < .9;
  }
  addEventListener('resize', resize); resize();
  cleanups.push(() => removeEventListener('resize', resize));

  let cam;
  function setCam(eye, tgt, fov) {
    const fx = tgt[0] - eye[0], fy = tgt[1] - eye[1], fz = tgt[2] - eye[2], fl = Math.hypot(fx, fy, fz);
    const f = [fx / fl, fy / fl, fz / fl];
    const rl = Math.hypot(f[1], f[0]), r = [f[1] / rl, -f[0] / rl, 0];
    const u = [r[1]*f[2] - r[2]*f[1], r[2]*f[0] - r[0]*f[2], r[0]*f[1] - r[1]*f[0]];
    cam = { e: eye, f, r, u, F: (H / 2) / Math.tan(fov * Math.PI / 360) };
  }
  function P(x, y, z) {
    const dx = x - cam.e[0], dy = y - cam.e[1], dz = z - cam.e[2];
    const zc = dx*cam.f[0] + dy*cam.f[1] + dz*cam.f[2];
    const xc = dx*cam.r[0] + dy*cam.r[1] + dz*cam.r[2];
    const yc = dx*cam.u[0] + dy*cam.u[1] + dz*cam.u[2];
    const s = cam.F / Math.max(zc, .1);
    return { x: W / 2 + xc * s, y: H / 2 - yc * s, s, d: zc };
  }
  function path3(pts, close) {
    ctx.beginPath();
    pts.forEach((p, i) => { const q = P(p[0], p[1], p[2] || 0); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
    if (close) ctx.closePath();
  }
  const ring = (cx, cy, r, a0 = 0, a1 = Math.PI * 2, n = 48) => {
    const out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0]); } return out;
  };

  /* ---------- Campo ---------- */
  function drawPitch() {
    ctx.fillStyle = '#040A07';
    path3([[-40,-40],[145,-40],[145,108],[-40,108]], true); ctx.fill();
    ctx.fillStyle = '#07130D';
    path3([[-6,-5],[111,-5],[111,73],[-6,73]], true); ctx.fill();
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = i % 2 ? '#0B1D14' : '#0A1911';
      const x0 = i * 5.25, x1 = x0 + 5.25;
      path3([[x0,0],[x1,0],[x1,68],[x0,68]], true); ctx.fill();
    }
    // marcações
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
    const L = (pts, c) => { path3(pts, c); ctx.stroke(); };
    L([[0,0],[105,0],[105,68],[0,68]], true);
    L([[52.5,0],[52.5,68]]);
    L(ring(52.5, 34, 9.15, 0, Math.PI * 2, 72));
    L([[0,13.84],[16.5,13.84],[16.5,54.16],[0,54.16]]);
    L([[105,13.84],[88.5,13.84],[88.5,54.16],[105,54.16]]);
    L([[0,24.84],[5.5,24.84],[5.5,43.16],[0,43.16]]);
    L([[105,24.84],[99.5,24.84],[99.5,43.16],[105,43.16]]);
    L(ring(11, 34, 9.15, -.927, .927, 24));
    L(ring(94, 34, 9.15, Math.PI - .927, Math.PI + .927, 24));
    L(ring(0, 0, 1, 0, Math.PI / 2, 8)); L(ring(105, 0, 1, Math.PI / 2, Math.PI, 8));
    L(ring(0, 68, 1, -Math.PI / 2, 0, 8)); L(ring(105, 68, 1, Math.PI, Math.PI * 1.5, 8));
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    [[52.5,34],[11,34],[94,34]].forEach(([x, y]) => { path3(ring(x, y, .22, 0, Math.PI * 2, 12), true); ctx.fill(); });
  }

  /* ---------- Gols + rede ---------- */
  let impact = null;
  function bulge(y, z, now) {
    if (!impact) return 0;
    const d = (now - impact.at) / 1000; if (d > 2.5) return 0;
    return 1.25 * Math.exp(-d * 3) * Math.cos(d * 10) * Math.exp(-((y - impact.y) ** 2) / 3 - ((z - impact.z) ** 2) / .9);
  }
  function drawGoal(right, now) {
    const gx = right ? 105 : 0, dir = right ? 1 : -1, y0 = 30.34, y1 = 37.66, hg = 2.44;
    const back = (z) => gx + dir * (2 - z * .41);
    const bx = (y, z) => back(z) + (right ? dir * bulge(y, z, now) : 0);
    ctx.strokeStyle = 'rgba(255,255,255,.17)'; ctx.lineWidth = 1;
    for (let y = y0; y <= y1 + .01; y += .61) {
      const pts = []; for (let z = 0; z <= hg + .001; z += hg / 8) pts.push([bx(y, z), y, z]);
      pts.push([gx, y, hg]); path3(pts); ctx.stroke();
    }
    for (let z = 0; z <= hg + .001; z += hg / 6) {
      const pts = []; for (let y = y0; y <= y1 + .01; y += .61) pts.push([bx(y, z), y, z]);
      path3(pts); ctx.stroke();
      path3([[gx, y0, z], [bx(y0, z), y0, z]]); ctx.stroke();
      path3([[gx, y1, z], [bx(y1, z), y1, z]]); ctx.stroke();
    }
    const s = P(gx, 34, 1.2).s;
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = Math.max(2, s * .12); ctx.lineCap = 'round';
    path3([[gx, y0, 0], [gx, y0, hg], [gx, y1, hg], [gx, y1, 0]]); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  /* ---------- Atletas e bola ---------- */
  const screen = {};      // posição na tela (para o hover)
  let hovered = null;

  function groundPoly(x, y, r, n = 28) { path3(ring(x, y, r, 0, Math.PI * 2, n), true); }

  function drawAthlete(id, p, isOwner, now) {
    groundPoly(p.x + .45, p.y - .35, 1.05); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
    const pulse = (now / 1000) % 1.6 / 1.6;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(255,59,48,${isOwner ? .9 : .45})`; groundPoly(p.x, p.y, 1.55); ctx.stroke();
    ctx.strokeStyle = `rgba(255,${isOwner ? 255 : 59},${isOwner ? 255 : 48},${(1 - pulse) * (isOwner ? .7 : .35)})`;
    groundPoly(p.x, p.y, 1.55 + pulse * 2.2); ctx.stroke();

    const c = P(p.x, p.y, .95), r = clamp(c.s * .75, portrait ? 7 : 8, 16) * (hovered === id ? 1.18 : 1);
    ctx.save();
    ctx.shadowColor = 'rgba(255,59,48,.75)'; ctx.shadowBlur = isOwner ? 26 : 14;
    const g = ctx.createRadialGradient(c.x - r * .35, c.y - r * .45, r * .1, c.x, c.y, r);
    g.addColorStop(0, '#FF9A90'); g.addColorStop(.42, TEAM); g.addColorStop(1, '#7E0E08');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(c.x - r * .3, c.y - r * .42, r * .32, r * .18, -.5, 0, Math.PI * 2); ctx.fill();
    screen[id] = { x: c.x, y: c.y, r };
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawLabel(id, alpha) {
    const s = screen[id]; if (!s) return;
    const a = ATHLETES[id], hov = hovered === id;
    const fs = portrait ? 11 : 12.5;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `600 ${fs}px Geist, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`;
    const nameW = ctx.measureText(a.name).width;
    ctx.font = `500 ${fs - 2}px Geist, -apple-system, BlinkMacSystemFont, sans-serif`;
    const posW = ctx.measureText(a.pos).width;
    let w = posW + nameW + 26, h = fs + 13;
    let sub = '';
    if (hov) { sub = `${a.role}  ·  Ver perfil`; ctx.font = `500 ${fs - 1.5}px Geist, -apple-system, sans-serif`; w = Math.max(w, ctx.measureText(sub).width + 24); h += fs + 4; }
    const x = s.x - w / 2, y = s.y - s.r - h - 10;
    roundRect(x, y, w, h, Math.min(h / 2, 14));
    ctx.fillStyle = hov ? 'rgba(245,245,247,.96)' : 'rgba(14,18,16,.62)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textBaseline = 'middle';
    const ty = y + (fs + 13) / 2 + .5;
    ctx.font = `500 ${fs - 2}px Geist, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillStyle = hov ? 'rgba(0,0,0,.5)' : 'rgba(245,245,247,.55)';
    ctx.fillText(a.pos, x + 11, ty);
    ctx.font = `600 ${fs}px Geist, -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`;
    ctx.fillStyle = hov ? '#000' : '#F5F5F7';
    ctx.fillText(a.name, x + 15 + posW, ty);
    if (hov) { ctx.font = `500 ${fs - 1.5}px Geist, -apple-system, sans-serif`; ctx.fillStyle = '#C4140B'; ctx.fillText(sub, x + 11, ty + fs + 4); }
    ctx.restore();
  }

  function drawBall(b) {
    const sh = P(b.x + b.z * .35, b.y - b.z * .25, 0);
    const k = clamp(1 - b.z / 9, .25, 1);
    ctx.fillStyle = `rgba(0,0,0,${.55 * k})`;
    ctx.beginPath(); ctx.ellipse(sh.x, sh.y, Math.max(3, sh.s * .3), Math.max(1.6, sh.s * .14), 0, 0, Math.PI * 2); ctx.fill();
    const c = P(b.x, b.y, b.z), r = Math.max(3.6, c.s * .35);
    ctx.save(); ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 12;
    const g = ctx.createRadialGradient(c.x - r * .35, c.y - r * .4, r * .1, c.x, c.y, r);
    g.addColorStop(0, '#fff'); g.addColorStop(.6, '#E9EEEC'); g.addColorStop(1, '#9AA39F');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  const trail = [];
  function drawTrail(shooting) {
    if (trail.length < 2) return;
    ctx.save(); ctx.lineCap = 'round';
    if (shooting) { ctx.shadowColor = 'rgba(255,90,80,.9)'; ctx.shadowBlur = 16; }
    for (let i = 1; i < trail.length; i++) {
      const a = P(...trail[i - 1]), b = P(...trail[i]), u = i / trail.length;
      ctx.strokeStyle = shooting ? `rgba(255,${Math.round(lerp(59, 235, u))},${Math.round(lerp(48, 225, u))},${u * .9})` : `rgba(255,255,255,${u * .5})`;
      ctx.lineWidth = Math.max(1, b.s * .32 * u * (shooting ? 1.4 : 1));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- Partículas e onda do gol ---------- */
  let sparks = [], wave = null;
  function burst(x, y, z) {
    sparks = [];
    for (let i = 0; i < 110; i++) {
      const sp = 3 + Math.random() * 9, a = Math.random() * Math.PI * 2;
      sparks.push({ x, y, z, vx: -Math.abs(Math.cos(a)) * sp - 1, vy: Math.sin(a) * sp, vz: 2 + Math.random() * 8, life: 1 + Math.random() * .9, age: 0, red: Math.random() < .45 });
    }
    wave = { x: 105, y, age: 0 };
  }
  function drawFx(dt) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    sparks = sparks.filter((p) => (p.age += dt) < p.life);
    sparks.forEach((p) => {
      p.vz -= 13 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt);
      if (p.z === 0) { p.vz *= -.35; p.vx *= .7; p.vy *= .7; }
      const a = P(p.x, p.y, p.z), b = P(p.x - p.vx * .035, p.y - p.vy * .035, Math.max(0, p.z - p.vz * .035)), k = 1 - p.age / p.life;
      ctx.strokeStyle = p.red ? `rgba(255,70,55,${k})` : `rgba(255,255,255,${k})`;
      ctx.lineWidth = Math.max(1, a.s * .09); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(a.x, a.y); ctx.stroke();
    });
    if (wave) {
      wave.age += dt; const u = wave.age / 1.4;
      if (u >= 1) wave = null;
      else {
        ctx.strokeStyle = `rgba(255,59,48,${(1 - u) * .8})`; ctx.lineWidth = 2;
        path3(ring(wave.x, wave.y, 1 + u * 22, Math.PI / 2, Math.PI * 1.5, 40)); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${(1 - u) * .35})`; ctx.lineWidth = 1;
        path3(ring(wave.x, wave.y, 1 + u * 14, Math.PI / 2, Math.PI * 1.5, 40)); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---------- Estado / direção ---------- */
  const fxEl = hero.querySelector('.fx');
  const dots = [...hero.querySelectorAll('.dots button')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = {
    i: 0, t: -0.6, ts: 1, fade: 1, fadeDir: -1, goal: false, fxOff: false, next: null,
    focus: { x: 30, y: 34 }, k: 1.6, shake: 0, flash: 0, par: { x: 0, y: 0 }, mouse: { x: 0, y: 0 },
  };
  function startPlay(i) {
    Object.assign(S, { i, t: -0.5, ts: 1, goal: false, fxOff: false, fadeDir: -1, next: null });
    trail.length = 0; sparks = []; wave = null; impact = null;
    fxEl.classList.remove('on', 'off');
    dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-pressed', String(k === i)); });
  }
  function goTo(i) { S.next = i; S.fadeDir = 1; }
  dots.forEach((d, k) => d.addEventListener('click', () => goTo(k)));

  let last = performance.now();
  function frame(now) {
    const dtR = Math.min(.05, (now - last) / 1000); last = now;
    const pl = PLAYS[S.i];

    // câmera lenta perto do gol
    const slow = S.t > pl.goalT - .34 && S.t < pl.goalT;
    S.ts += ((slow ? .3 : 1) - S.ts) * (1 - Math.exp(-dtR * 12));
    S.t += dtR * S.ts;

    const ball = ballAt(pl, S.t);
    if (!S.goal && S.t >= pl.goalT) {
      S.goal = true;
      const [, gy, gz] = pl.shot.target;
      impact = { y: gy, z: gz, at: now };
      burst(106, gy, gz);
      S.flash = reduce ? .2 : .55; S.shake = reduce ? 0 : 1;
      fxTimer = setTimeout(() => { fxEl.classList.remove('off'); void fxEl.offsetWidth; fxEl.classList.add('on'); }, 120);
    }
    if (S.goal && !S.fxOff && S.t >= pl.goalT + CELEBRATE - .75) { S.fxOff = true; fxEl.classList.add('off'); }
    if (S.t >= pl.end && S.fadeDir !== 1) goTo((S.i + 1) % PLAYS.length);

    S.fade = clamp(S.fade + S.fadeDir * dtR / .55, 0, 1);
    if (S.fadeDir === 1 && S.fade >= 1) { startPlay(S.next ?? (S.i + 1) % PLAYS.length); S.k = 1.35; }

    // foco e zoom da câmera
    const scorer = pl.path.c(S.t);
    const afterGoal = S.goal && S.t > pl.goalT + .35;
    let tx = afterGoal ? scorer.x - 4 : ball.x + 6, ty = afterGoal ? scorer.y : ball.y;
    let tk = S.t < pl.shot.t0 ? 1 : afterGoal ? (portrait ? .7 : .58) : .84;
    if (portrait) { tx = clamp(tx + 6, 22, afterGoal ? 90 : 80); ty = clamp(lerp(34, ty, .75), 16, 52); }
    else { tx = clamp(tx, 30, afterGoal ? 92 : 80); ty = lerp(34, ty, .3); }
    const ease = 1 - Math.exp(-dtR * (afterGoal ? 1.6 : 2.2));
    S.focus.x += (tx - S.focus.x) * ease; S.focus.y += (ty - S.focus.y) * ease;
    S.k += (tk - S.k) * (1 - Math.exp(-dtR * 1.4));
    S.par.x += (S.mouse.x - S.par.x) * (1 - Math.exp(-dtR * 3));
    S.par.y += (S.mouse.y - S.par.y) * (1 - Math.exp(-dtR * 3));
    S.shake *= Math.exp(-dtR * 4.5);
    const sh = () => (Math.random() - .5) * S.shake * 1.2;

    const { x: fx, y: fy } = S.focus, k = S.k;
    if (portrait) setCam([fx - 26 * k + sh(), fy + S.par.x * 3 + sh(), 84 * k + sh()], [fx + 4, fy, 0], 58);
    else setCam([fx + S.par.x * 5 + sh(), fy - 62 * k + sh(), 44 * k - S.par.y * 3 + sh()], [fx, fy + 13, 0], 30);

    // ---- desenho ----
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawPitch();

    // luz de estádio acompanhando a jogada
    const lp = P(ball.x, ball.y, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, Math.max(W, H) * .55);
    lg.addColorStop(0, 'rgba(120,255,180,.075)'); lg.addColorStop(1, 'rgba(120,255,180,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.restore();

    drawGoal(false, now); drawGoal(true, now);

    trail.push([ball.x, ball.y, ball.z]); if (trail.length > (S.t > pl.shot.t0 && !S.goal ? 22 : 14)) trail.shift();
    drawTrail(S.t > pl.shot.t0 && S.t < pl.goalT + .3);

    const items = IDS.map((id) => ({ id, p: pl.path[id](S.t), d: 0 }));
    items.forEach((o) => (o.d = P(o.p.x, o.p.y, 0).d));
    const bd = P(ball.x, ball.y, 0).d;
    items.push({ id: 'ball', d: -1e9 });
    items.sort((a, b) => b.d - a.d);
    items.forEach((o) => o.id === 'ball' ? drawBall(ball) : drawAthlete(o.id, o.p, ball.owner === o.id || (S.goal && o.id === 'c'), now));

    drawFx(dtR);

    // vinheta e leitura do header
    const vg = ctx.createRadialGradient(W / 2, H * .55, Math.min(W, H) * .3, W / 2, H * .55, Math.max(W, H) * .78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.72)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const tg = ctx.createLinearGradient(0, 0, 0, 150); tg.addColorStop(0, 'rgba(0,0,0,.55)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 150);

    const labelA = S.goal ? clamp(1 - (S.t - pl.goalT) * 2, 0, 1) : 1;
    IDS.forEach((id) => drawLabel(id, hovered === id ? 1 : labelA));

    // flash do gol
    if (S.flash > .002) {
      const gp = P(105, pl.shot.target[1], 1);
      const fg = ctx.createRadialGradient(gp.x, gp.y, 0, gp.x, gp.y, Math.max(W, H) * .7);
      fg.addColorStop(0, `rgba(255,255,255,${S.flash})`); fg.addColorStop(1, `rgba(255,255,255,${S.flash * .25})`);
      ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
      S.flash *= Math.exp(-dtR * 5);
    }
    if (S.fade > 0) { ctx.fillStyle = `rgba(3,6,5,${S.fade})`; ctx.fillRect(0, 0, W, H); }

    const active = dots[S.i] && dots[S.i].querySelector('span');
    if (active) active.style.setProperty('--p', clamp(S.t / pl.end, 0, 1).toFixed(3));

    if (stopped) return;
    if (heroOn) raf = requestAnimationFrame(frame);
    else heroResume = () => { last = performance.now(); raf = requestAnimationFrame(frame); };
  }

  /* ---------- Interação ---------- */
  const onPM = (e) => {
    const r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    S.mouse.x = (x / r.width - .5) * 2; S.mouse.y = (y / r.height - .5) * 2;
    if (e.target !== cv) { hovered = null; return; }
    let best = null, bd = 30;
    IDS.forEach((id) => { const s = screen[id]; if (!s) return; const d = Math.hypot(s.x - x, s.y - y) - s.r; if (d < bd) { bd = d; best = id; } });
    hovered = best; cv.style.cursor = best ? 'pointer' : 'default';
  };
  const onPL = () => { hovered = null; S.mouse.x = S.mouse.y = 0; };
  hero.addEventListener('pointermove', onPM);
  hero.addEventListener('pointerleave', onPL);
  cleanups.push(() => { hero.removeEventListener('pointermove', onPM); hero.removeEventListener('pointerleave', onPL); });
  const onClick = () => { if (hovered) opts.onAthlete(hovered, ATHLETES[hovered].name); };
  cv.addEventListener('click', onClick);
  cleanups.push(() => cv.removeEventListener('click', onClick));


  // pausa o hero fora da tela
  const io = new IntersectionObserver(([e]) => {
    heroOn = e.isIntersecting;
    if (heroOn && heroResume) { const r = heroResume; heroResume = null; r(); }
  });
  io.observe(hero);
  cleanups.push(() => io.disconnect());

  startPlay(0);
  raf = requestAnimationFrame((t) => { last = t; frame(t); });

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    clearTimeout(fxTimer);
    cleanups.forEach((f) => f());
  };
}
