/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-expressions, prefer-const */
// @ts-nocheck
/* =====================================================================
   02 · Sobre — pênalti interativo. Portado literalmente de m3-home-2.html.
   ===================================================================== */

export function startPenalty(pen: HTMLElement): () => void {
  const ac = new AbortController();
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn, { signal: ac.signal });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = pen.querySelector('[data-stage]'), svg = pen.querySelector('[data-svg]');
  const keeper = pen.querySelector('[data-keeper]'), ball = pen.querySelector('[data-ball]'), spin = pen.querySelector('[data-spin]');
  const bsh = pen.querySelector('[data-bsh]'), ret = pen.querySelector('[data-ret]'), ripple = pen.querySelector('[data-ripple]');
  const net = pen.querySelector('[data-net]'), toast = pen.querySelector('[data-toast]'), flash = pen.querySelector('[data-flash]');
  const hint = pen.querySelector('[data-hint]'), countEl2 = pen.querySelector('[data-count]'), bar = pen.querySelector('[data-bar]');
  const zones = [...pen.querySelectorAll('.zone')], rows = [...pen.querySelectorAll('.pz')];
  const NAMES = ['Scouting', 'Dados', 'Gestão de carreira', 'Relacionamento com clubes'];
  const SPOT = { x: 400, y: 448 };
  const G = { x0: 206, x1: 594, y0: 126, y1: 326 };
  hint.textContent = fine ? 'Clique no gol para chutar' : 'Toque no gol para chutar';

  // rede
  let grid = '';
  for (let x = 220; x < 600; x += 20) grid += `M${x} 122V330`;
  for (let y = 140; y < 332; y += 20) grid += `M202 ${y}H598`;
  pen.querySelector('[data-grid]').innerHTML = `<path d="${grid}"/>`;

  const done = new Set();
  let busy = false, shots = 0;
  const zoneOf = (p) => (p.y < 226 ? 0 : 2) + (p.x < 400 ? 0 : 1);
  const center = (z) => ({ x: z % 2 ? 499 : 301, y: z < 2 ? 172 : 276 });
  const toSvg = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const inGoal = (p) => p.x > 200 && p.x < 600 && p.y > 118 && p.y < 334;
  const hot = (z) => { zones.forEach((el, k) => el.classList.toggle('hot', k === z)); rows.forEach((el, k) => el.classList.toggle('hot', k === z)); };
  const setBall = (x, y, s, r) => { ball.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`); spin.setAttribute('transform', `rotate(${r.toFixed(0)})`); };
  const setShadow = (x, y, rx, o) => { bsh.setAttribute('cx', x); bsh.setAttribute('cy', y); bsh.setAttribute('rx', rx); bsh.setAttribute('ry', rx * .3); bsh.style.opacity = o; };
  function tween(ms, fn) { return new Promise((res) => { const t0 = performance.now(); const f = (now) => { const u = Math.min(1, (now - t0) / ms); fn(u); u < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); }); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function say(html, miss) { toast.innerHTML = html; toast.classList.toggle('miss', !!miss); toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('on'), 1800); }

  on(stage, 'pointermove', (e) => {
    if (busy) return;
    const p = toSvg(e);
    if (inGoal(p)) { ret.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`); ret.classList.add('on'); hot(zoneOf(p)); }
    else { ret.classList.remove('on'); hot(-1); }
  });
  on(stage, 'pointerleave', () => { ret.classList.remove('on'); if (!busy) hot(-1); });
  on(stage, 'click', (e) => {
    const p = toSvg(e);
    shoot({ x: clamp(p.x, G.x0 + 8, G.x1 - 8), y: clamp(p.y, G.y0 + 8, G.y1 - 8) });
  });
  rows.forEach((r, z) => {
    on(r.querySelector('button'), 'click', () => shoot(center(z)));
    on(r, 'pointerenter', () => { if (!busy) hot(z); });
    on(r, 'pointerleave', () => { if (!busy) hot(-1); });
  });

  async function shoot(p) {
    if (busy || ac.signal.aborted) return;
    busy = true; stage.classList.add('busy'); hint.style.opacity = 0;
    const z = zoneOf(p);
    hot(z); ret.classList.remove('on');
    // goleiro: nunca defende o primeiro chute nem o último canto que falta
    const lastOne = done.size === 3 && !done.has(z);
    const save = shots > 0 && !lastOne && Math.random() < .28;
    let kz = z;
    if (!save) { const opts = [0, 1, 2, 3].filter((k) => k !== z); kz = opts[Math.floor(Math.random() * opts.length)]; }
    shots++;
    setTimeout(() => { stage.classList.add('dive'); keeper.classList.add('d' + kz); }, 110);

    // chute com curva e perspectiva
    const cx = (SPOT.x + p.x) / 2 + (p.x < 400 ? -30 : 30), cy = Math.min(SPOT.y, p.y) - 70;
    await tween(reduce ? 200 : 540, (u) => {
      const e = 1 - Math.pow(1 - u, 2.2);
      const x = (1 - e) * (1 - e) * SPOT.x + 2 * (1 - e) * e * cx + e * e * p.x;
      const y = (1 - e) * (1 - e) * SPOT.y + 2 * (1 - e) * e * cy + e * e * p.y;
      setBall(x, y, 1 - e * .5, e * 900);
      setShadow(SPOT.x + (p.x - SPOT.x) * e, 462 - (462 - 334) * e, 15 - e * 8, .55 - e * .35);
    });

    if (save) {
      const side = p.x < 400 ? -1 : 1;
      await tween(620, (u) => {
        const x = p.x + side * 110 * u, y = p.y + (345 - p.y) * (u * u) - Math.sin(u * Math.PI) * 30;
        setBall(x, y, .5 + u * .1, 900 + u * 500 * side);
        setShadow(x, 348, 7, .3);
      });
      say('<b>Defendeu!</b> Tente outro canto.', true);
    } else {
      net.classList.remove('shake'); void net.getBBox(); net.classList.add('shake');
      ripple.setAttribute('cx', p.x); ripple.setAttribute('cy', p.y);
      ripple.classList.remove('go'); void ripple.getBBox(); ripple.classList.add('go');
      flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
      await tween(380, (u) => {
        setBall(p.x + (p.x < 400 ? -6 : 6) * u, p.y + (334 - 7 - p.y) * (u * u), .5 - u * .06, 900 + u * 120);
        setShadow(p.x, 334, 7, .2 + u * .2);
      });
      const fresh = !done.has(z);
      done.add(z);
      zones[z].classList.add('done'); rows[z].classList.add('done');
      countEl2.textContent = done.size; bar.style.setProperty('--p', done.size / 4);
      say(fresh ? `<b>Gol!</b> ${NAMES[z]} desbloqueado` : `<b>Gol!</b> Esse canto você já abriu`);
      if (done.size === 4) setTimeout(() => { if (!ac.signal.aborted) pen.classList.add('won'); }, 500);
    }

    await wait(900);
    keeper.classList.remove('d0', 'd1', 'd2', 'd3');
    ball.style.transition = 'opacity .25s'; ball.style.opacity = 0; bsh.style.opacity = 0;
    await wait(300);
    setBall(SPOT.x, SPOT.y, 1, 0); setShadow(SPOT.x, 462, 15, .55);
    ball.style.opacity = 1;
    await wait(250);
    stage.classList.remove('dive', 'busy'); hot(-1);
    busy = false;
  }
  on(pen.querySelector('[data-reset]'), 'click', () => {
    done.clear(); shots = 0; pen.classList.remove('won');
    zones.forEach((z) => z.classList.remove('done')); rows.forEach((r) => r.classList.remove('done'));
    countEl2.textContent = 0; bar.style.setProperty('--p', 0); hint.style.opacity = 1;
  });

  return () => ac.abort();
}
