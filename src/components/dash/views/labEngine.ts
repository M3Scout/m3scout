/* eslint-disable */
// @ts-nocheck
/* =====================================================================
   Lab. Tático — prancheta estilo FIFA / FM, portada de painel.html.
   Recebe os atletas (A), fotos (IMG) e atributos (ATTR) reais do app.
   ===================================================================== */

export interface LabOptions {
  A: Record<string, { name: string; short: string; nick?: string; pos: string; age?: number | null }>;
  IMG: Record<string, string>;
  ATTR: Record<number, Record<string, number[]>>;
  toast: (msg: string) => void;
}

export function mountLab(root: HTMLElement, opts: LabOptions): () => void {
  const A = opts.A;
  const ATTR = opts.ATTR;
  const ATTR_K = ['ATA', 'TEC', 'TAT', 'DEF', 'CRI'];
  const POS = new Proxy({}, { get: (_, k) => [String(k), '#8E8E93'] });
  const V = {};
  const cleanups = [];
  const IMG = opts.IMG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (v, d = 0) => v == null ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const store = { get(k, d) { try { const v = localStorage.getItem('m3:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('m3:' + k, JSON.stringify(v)); } catch (e) {} } };

  /* ---------- ícones ---------- */
  const P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a6 6 0 0 0-4-5.6"/>',
    cmp: '<path d="M7 4v16M17 4v16M3 8h8M13 16h8"/>',
    doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    goal: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    live: '<circle cx="12" cy="12" r="2"/><path d="M8 8a5.6 5.6 0 0 0 0 8M16 8a5.6 5.6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
    lab: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 12h18M12 3v18"/><circle cx="12" cy="12" r="3"/>',
    news: '<path d="M4 5h13v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM17 9h3v10a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5M8 17h3"/>',
    chart: '<path d="M3 20h18M6 16l4-5 3 3 5-7"/>',
    crosshair: '<circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>',
    file: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    up: '<path d="M4 16 10 10l4 4 6-6M15 8h5v5"/>',
    down: '<path d="m4 8 6 6 4-4 6 6M15 16h5v-5"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/>',
    edit: '<path d="M4 20h4L20 8l-4-4L4 16z"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-4M4 4v4h4M4 13a8 8 0 0 0 14.9 4M20 20v-4h-4"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" fill="currentColor" stroke="none"/>',
    warn: '<path d="M12 4 2 20h20zM12 10v4M12 17.5v.5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    card: '<rect x="6" y="3" width="12" height="18" rx="2" fill="currentColor" stroke="none"/>',
    run: '<circle cx="14" cy="4" r="2"/><path d="M10 9l4-2 3 4 3 1M14 7l-2 6 4 3v5M12 13l-4 2-3-1M8 21l2-5"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    dots: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
    userx: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 8l4 4M21 8l-4 4"/>',
    usergear: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 11-5.7"/><circle cx="18" cy="17" r="2.5"/><path d="M18 12.5v2M18 19.5v2M22.5 17h-2M15.5 17h-2"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    sidebar: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 21 3"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
    stadium: '<ellipse cx="12" cy="9" rx="9" ry="4"/><path d="M3 9v6c0 2.2 4 4 9 4s9-1.8 9-4V9"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 4.5h-5L8 10z"/>',
    assist: '<path d="M4 18 10 6l4 8 6-6"/><circle cx="20" cy="8" r="1.5"/>',
    cut: '<path d="M4 4l16 16M20 4 4 20"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h0V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3V4z"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    swap: '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
    pin: '<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
  };
  const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  /* ---------- peças ---------- */
  const av = (id, sz = 48, cls = '') => {
    const a = A[id]; const ini = a ? a.short.slice(0, 2).toUpperCase() : '?';
    return `<span class="av ${cls}" style="--sz:${sz}px">${IMG[id] ? `<img src="${IMG[id]}" alt="">` : ini}</span>`;
  };
  const posPill = (p) => `<span class="pill c" style="--c:${POS[p][1]}">${p}</span>`;
  const ttl = (text, count) => {
    let i = 0;
    const words = text.split(' ').map((w) => `<span class="w">${[...w].map((ch) => `<span class="l" style="--i:${i++}">${esc(ch)}</span>`).join('')}</span>`).join(' ');
    return `<h1 class="ttl" aria-label="${esc(text)}${count != null ? ', ' + count : ''}"><span aria-hidden="true" style="display:contents">${words}${count != null ? `<span class="cnt" style="--cd:${(i * 40 + 500)}ms">${count}</span>` : ''}</span></h1>`;
  };
  const head = (title, count, acts = '', kicker = '') => `<header class="ph" style="--s:0"><div>${kicker ? `<p class="ph-k">${kicker}</p>` : ''}${ttl(title)}</div><div class="ph-acts">${acts}</div></header>`;
  const ring = (pct, c, sz = 64, label) => { const r = 26, C = 2 * Math.PI * r; return `<span class="ring" style="--rs:${sz}px;--c:${c}"><svg viewBox="0 0 64 64"><circle class="t" cx="32" cy="32" r="${r}"/><circle class="a" cx="32" cy="32" r="${r}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" data-ring="${pct}"/></svg><b>${label ?? pct + '<small style="font-size:.5em;opacity:.6">%</small>'}</b></span>`; };
  const scoreColor = (s) => s == null ? '#8E8E93' : s >= 65 ? '#30D158' : s >= 55 ? '#FFD60A' : s >= 48 ? '#FF9F0A' : '#FF3B30';
  const scoreLabel = (s) => s >= 65 ? 'Alto' : s >= 50 ? 'Médio' : 'Baixo';
  const seg = (name, items, cur) => `<div class="seg" data-seg="${name}" role="group">${items.map(([v, l, n]) => `<button type="button" data-v="${v}" aria-pressed="${v === cur}">${l}${n != null ? `<em>${n}</em>` : ''}</button>`).join('')}<i></i></div>`;
  const kpi = (label, value, note, opts = {}) => `<div class="card kpi ${opts.hl ? 'hl' : ''}" style="--c:${opts.c || 'var(--green)'}"><small>${label}</small><span class="od" data-od="${value}">0</span>${note ? `<p>${note}</p>` : ''}${opts.spark ? `<svg class="spark" viewBox="0 0 72 28"><path d="${opts.spark}"/></svg>` : ''}</div>`;

  /* odômetro */
  function od(el, text, delay = 0) {
    text = String(text);
    el.innerHTML = [...text].map((ch, i) => /\d/.test(ch)
      ? `<span class="c"><span style="--d:${(delay + i * .05).toFixed(2)}s">${'0123456789'.split('').map((d) => `<b>${d}</b>`).join('')}</span></span>`
      : `<span>${esc(ch)}</span>`).join('');
    el.setAttribute('aria-label', text);
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.c > span', el).forEach((s, i) => { s.style.transform = `translateY(${-text.replace(/\D/g, '')[i]}em)`; })));
  }
  /* animações de entrada */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target; io.unobserve(el);
    if (el.dataset.od != null) od(el, el.dataset.od, +(el.dataset.d || 0));
    else if (el.dataset.ring != null) { const C = +el.getAttribute('stroke-dasharray'); el.style.strokeDashoffset = (C * (1 - clamp(+el.dataset.ring, 0, 100) / 100)).toFixed(1); }
    else el.classList.add('in');
  }), { threshold: .2 });
  const wire = (root) => {
    $$('[data-od]', root).forEach((el, i) => { el.dataset.d = el.dataset.d || (i % 6) * .08; io.observe(el); });
    $$('[data-ring]', root).forEach((el) => io.observe(el));
    $$('.bar, .heat, [data-in]', root).forEach((el) => io.observe(el));
    $$('.seg', root).forEach(segWire);
  };
  function segWire(root) {
    const btns = $$('button', root), pill = $('i', root);
    const place = () => { const b = btns.find((x) => x.getAttribute('aria-pressed') === 'true') || btns[0]; pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
    btns.forEach((b) => b.addEventListener('click', () => { btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); place(); root.dispatchEvent(new CustomEvent('pick', { detail: b.dataset.v })); }));
    requestAnimationFrame(place); setTimeout(place, 400);
    if (document.fonts) document.fonts.ready.then(place);
  }
  const toast = (msg) => opts.toast(msg);
  const bar = (w, c, d = 0) => `<span class="bar"><i style="--w:${clamp(w, 0, 1).toFixed(3)};--c:${c};--d:${d}s"></i></span>`;
  /* =====================================================================
     LAB. TÁTICO — prancheta estilo FIFA / Football Manager
     ===================================================================== */
  Object.assign(P, {
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    cube: '<path d="M12 2 3 7v10l9 5 9-5V7zM3 7l9 5 9-5M12 12v10"/>',
    plusc: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    minusc: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    shirt: '<path d="M8 3 3 6l2 5 2-1v11h10V10l2 1 2-5-5-3a4 4 0 0 1-8 0z"/>',
    ballic: '<circle cx="12" cy="12" r="9"/><path d="m12 7 3.5 2.5-1.3 4h-4.4l-1.3-4zM12 3v4M15.5 9.5l4.6-1.6M14.2 13.5l2.8 4M9.8 13.5 7 17.5M8.5 9.5 3.9 7.9"/>',
  });
  const RC = { GR: ['Goleiro', '#8E8E93'], ZAG: ['Zagueiro', '#30D158'], LAT: ['Lateral', '#64D2FF'], VOL: ['Volante', '#BF5AF2'], MEI: ['Meia', '#FFD60A'], PNT: ['Ponta', '#FF375F'], CA: ['Centroavante', '#FF9F0A'] };
  const ROLES6 = ['ZAG', 'LAT', 'VOL', 'MEI', 'PNT', 'CA'];
  const ROLE_OF = { GOL: 'GR', ZAG: 'ZAG', LE: 'LAT', LD: 'LAT', VOL: 'VOL', MC: 'MEI', MEI: 'MEI', MEA: 'MEI', PD: 'PNT', PE: 'PNT', CA: 'CA', ATA: 'CA' };
  const nm = (id) => A[id].nick || A[id].short;

  /* formações — x: 0 (nosso gol) → 100 (gol rival) · y: 0 (esquerda) → 100 (direita) */
  const LF = {
    '4-2-3-1': {
      s: [['GR', 'GR', 5, 50], ['LE', 'LAT', 24, 14], ['ZAE', 'ZAG', 20, 37], ['ZAD', 'ZAG', 20, 63], ['LD', 'LAT', 24, 86], ['VOE', 'VOL', 38, 40], ['VOD', 'VOL', 38, 60], ['PE', 'PNT', 60, 15], ['MEI', 'MEI', 58, 50], ['PD', 'PNT', 60, 85], ['CA', 'CA', 78, 50]],
      how: 'Dois volantes protegem a zaga, três meias (dois pontas abertos e um 10 central) apoiam o centroavante.',
      pro: 'Equilíbrio defensivo, largura bem ocupada e facilidade para dobrar a marcação nas alas.',
      con: 'O centroavante pode ficar isolado se o camisa 10 e os pontas não pisarem na área.',
      atk: ['Os laterais sobem para dar largura enquanto o camisa 10 flutua entre as linhas, buscando o passe que rompe a defesa.', 'Pressão coordenada dos três meias sobre a saída de bola do rival, fechando as linhas de passe centrais.', 'Mantenha os dois volantes sempre entre a bola e a própria área — eles são o seguro contra o contra-ataque.'],
      def: ['Recuperou, procure o 10 ou os pontas em velocidade: o contra-ataque nasce no primeiro passe.', 'Duas linhas de quatro bem próximas, o 10 cai ao lado do centroavante e ninguém salta sozinho.', 'Bloco baixo é paciência: distância curta entre as linhas vale mais que roubar a bola cedo.'],
    },
    '4-3-3': {
      s: [['GR', 'GR', 5, 50], ['LE', 'LAT', 24, 14], ['ZAE', 'ZAG', 20, 37], ['ZAD', 'ZAG', 20, 63], ['LD', 'LAT', 24, 86], ['VOL', 'VOL', 36, 50], ['MCE', 'MEI', 50, 32], ['MCD', 'MEI', 50, 68], ['PE', 'PNT', 68, 14], ['CA', 'CA', 78, 50], ['PD', 'PNT', 68, 86]],
      how: 'Um volante de proteção, dois meias de ligação e um trio de ataque com os pontas bem abertos.',
      pro: 'Pressão alta natural, muitos triângulos para trocar passes e amplitude máxima no ataque.',
      con: 'O volante fica exposto nas costas dos meias e exige laterais que voltem rápido.',
      atk: ['Pontas presos na linha lateral, meias atacam o espaço entre zagueiro e lateral, volante faz a saída.', 'Pressão imediata: os três da frente fecham a saída curta e os meias perseguem o passe seguinte.', 'Se o ponta recebe aberto, o meia do mesmo lado passa por dentro — sempre.'],
      def: ['Bola no ponta mais rápido: ele já está alto e aberto, pronto para a transição.', 'Os pontas recuam até a linha dos meias e o time vira um 4-5-1 compacto.', 'O volante não sai da frente da área. Quem pressiona são os meias.'],
    },
    '4-4-2': {
      s: [['GR', 'GR', 5, 50], ['LE', 'LAT', 24, 14], ['ZAE', 'ZAG', 20, 37], ['ZAD', 'ZAG', 20, 63], ['LD', 'LAT', 24, 86], ['ME', 'PNT', 50, 14], ['VOE', 'VOL', 42, 38], ['VOD', 'VOL', 42, 62], ['MD', 'PNT', 50, 86], ['CAE', 'CA', 74, 40], ['CAD', 'CA', 74, 60]],
      how: 'Duas linhas de quatro e uma dupla de ataque que joga junta: um prende a bola, o outro ataca a profundidade.',
      pro: 'Organização simples, campo ocupado de forma equilibrada e dois atacantes pressionando a saída.',
      con: 'Fica em inferioridade no meio contra trios; o meio-campo precisa correr muito.',
      atk: ['Os meias de lado abrem o campo, um atacante vem buscar e o outro ataca as costas da zaga.', 'Os dois atacantes pressionam os zagueiros e empurram o jogo para o lado.', 'A distância entre os dois atacantes não passa de 15 metros: eles jogam em dupla.'],
      def: ['Bola longa na dupla de ataque: um ganha pelo alto, o outro pega a segunda bola.', 'Duas linhas de quatro paralelas; o lado da bola pressiona e o lado oposto fecha por dentro.', 'Com as linhas retas e curtas, ninguém passa pelo meio.'],
    },
    '3-5-2': {
      s: [['GR', 'GR', 5, 50], ['ZAE', 'ZAG', 20, 26], ['ZC', 'ZAG', 18, 50], ['ZAD', 'ZAG', 20, 74], ['ALE', 'LAT', 44, 10], ['VOL', 'VOL', 36, 50], ['MCE', 'MEI', 52, 34], ['MCD', 'MEI', 52, 66], ['ALD', 'LAT', 44, 90], ['CAE', 'CA', 74, 40], ['CAD', 'CA', 74, 60]],
      how: 'Três zagueiros dão segurança, os alas fazem o corredor inteiro e dois atacantes dividem a área.',
      pro: 'Superioridade no meio, alas livres para atacar e saída de bola com três.',
      con: 'Os corredores ficam vulneráveis se os alas não voltarem; exige fôlego enorme.',
      atk: ['Os alas viram pontas, um zagueiro conduz até o meio e os meias chegam na área.', 'Os alas pressionam os laterais rivais na perda para não deixar o corredor aberto.', 'Alas são a chave: se eles não sobem, o time fica sem largura.'],
      def: ['Saída rápida pelo ala do lado oposto, que costuma estar livre.', 'Os alas recuam e o time vira uma linha de cinco, com três meias na frente.', 'Na linha de cinco, o zagueiro do meio comanda: é ele quem sobe a linha.'],
    },
    '5-3-2': {
      s: [['GR', 'GR', 5, 50], ['ALE', 'LAT', 30, 10], ['ZAE', 'ZAG', 18, 30], ['ZC', 'ZAG', 16, 50], ['ZAD', 'ZAG', 18, 70], ['ALD', 'LAT', 30, 90], ['MCE', 'MEI', 46, 30], ['VOL', 'VOL', 40, 50], ['MCD', 'MEI', 46, 70], ['CAE', 'CA', 72, 40], ['CAD', 'CA', 72, 60]],
      how: 'Linha de cinco atrás, três meias compactos e dois atacantes prontos para a transição.',
      pro: 'Muito difícil de ser furado; ótimo fora de casa e contra times de posse.',
      con: 'Pouca gente no ataque: depende de transições rápidas e bola parada.',
      atk: ['Os alas avançam com cuidado, um de cada vez, e os meias apoiam a dupla de ataque.', 'Recompor rápido: o ala que subiu volta para fechar a linha de cinco.', 'Ataque com no máximo seis jogadores — o resto segura o resultado.'],
      def: ['Bola longa nos atacantes ou condução pelo meia mais rápido para o contra-ataque.', 'Linha de cinco na entrada da área e meias fechando o corredor central.', 'Paciência: o 5-3-2 vence pelo erro do adversário, não pela pressa.'],
    },
  };
  const PHASE = { atk: 'Fase ofensiva', def: 'Bloco baixo' };
  const PUSH = { GR: 0, ZAG: 14, LAT: 30, VOL: 14, MEI: 14, PNT: 16, CA: 12 };
  const shape = (f, ph) => LF[f].s.map(([, r, x, y]) => {
    if (r === 'GR') return [ph === 'atk' ? 9 : 4, 50];
    if (ph === 'atk') return [Math.min(90, x + PUSH[r]), clamp(50 + (y - 50) * 1.08, 5, 95)];
    return [8 + (x - 5) * 0.52, 50 + (y - 50) * 0.8];
  });

  /* funções — cada uma com 3 variações (mv = movimento: [avanço, para dentro]) */
  const RL = {
    ZAG: { desc: 'A base do sistema defensivo, atuando no centro da linha de defesa.', resp: ['Marcação e desarme', 'Proteção da área', 'Cobertura', 'Saída de bola'], ax: ['Desarme', 'Jogo aéreo', 'Posicionamento', 'Passe longo', 'Velocidade', 'Liderança'],
      v: [
        { a: 'Stopper · Agressivo', n: 'Zagueiro de combate', d: 'Sobe e corta o atacante antes que ele vire. Antecipação é a arma.', k: 0, mv: [14, -4], cap: 'Sobe e corta o atacante', r: [96, 85, 80, 60, 72, 82], ins: ['Rúben Dias', 'Éder Militão', 'Gabriel Magalhães'], w: { DEF: .6, TAT: .3, TEC: .1 }, t: ['Passe simples para o volante, sem arriscar no meio.', 'Saia no atacante que recebe de costas e não deixe ele girar.', 'Subiu, ganhou. Se não tiver certeza, segure a posição.'] },
        { a: 'Construtor · Ball-playing', n: 'Zagueiro construtor', d: 'Inicia o jogo com passes que quebram linhas e conduz até o meio-campo.', k: 3, mv: [24, -10], cap: 'Conduz e quebra a linha', r: [78, 82, 86, 94, 70, 88], ins: ['Virgil van Dijk', 'John Stones', 'Marquinhos'], w: { TEC: .4, TAT: .4, DEF: .2 }, t: ['Conduza até atrair um marcador e solte o passe vertical.', 'Comande a linha: suba junto e deixe o atacante impedido.', 'Antes de receber, olhe por cima do ombro: o passe certo já está escolhido.'] },
        { a: 'Líbero · Cobertura', n: 'Zagueiro de sobra', d: 'Joga na sobra, corrige os erros dos companheiros e varre o espaço atrás da linha.', k: 2, mv: [-8, 9], cap: 'Fica na sobra e cobre', r: [82, 76, 95, 80, 74, 90], ins: ['Thiago Silva', 'Mats Hummels', 'Giorgio Chiellini'], w: { TAT: .6, DEF: .4 }, t: ['Seja a opção de recuo segura e vire o jogo.', 'Fique um passo atrás da linha para cobrir o lançamento.', 'Você vê o campo inteiro: fale o tempo todo.'] },
      ] },
    LAT: { desc: 'Dono do corredor: defende a lateral e dá largura ao ataque.', resp: ['Largura no ataque', 'Cruzamento', 'Recomposição', 'Marcação do ponta'], ax: ['Velocidade', 'Cruzamento', 'Resistência', 'Desarme', 'Drible', 'Passe'],
      v: [
        { a: 'Apoiador · Overlap', n: 'Lateral apoiador', d: 'Passa por fora do ponta e chega à linha de fundo para cruzar.', k: 1, mv: [30, 0], cap: 'Passa por fora do ponta', r: [88, 94, 90, 70, 80, 85], ins: ['Daniel Alves', 'Alexander-Arnold', 'Marcelo'], w: { ATA: .3, TEC: .4, CRI: .3 }, t: ['Ultrapasse o ponta por fora e cruze rasteiro na segunda trave.', 'Na perda, corra de volta primeiro e pense depois.', 'Seu cruzamento vale gol: olhe a área antes de bater.'] },
        { a: 'Invertido · Inverted', n: 'Lateral por dentro', d: 'Fecha por dentro na construção e vira um volante a mais.', k: 5, mv: [14, 22], cap: 'Fecha por dentro', r: [76, 74, 84, 78, 82, 92], ins: ['João Cancelo', 'Zinchenko', 'Philipp Lahm'], w: { TEC: .4, TAT: .5, CRI: .1 }, t: ['Entre no meio e forme a saída de bola com os volantes.', 'Fique por dentro para fechar o contra-ataque central.', 'Quando você entra, o ponta segura a largura.'] },
        { a: 'Marcador · Fullback', n: 'Lateral marcador', d: 'Prioriza a marcação do ponta rival e raramente passa do meio-campo.', k: 3, mv: [-12, 2], cap: 'Segura o ponta rival', r: [86, 70, 88, 90, 64, 76], ins: ['Dani Carvajal', 'Kyle Walker', 'Azpilicueta'], w: { DEF: .7, TAT: .3 }, t: ['Apoie por trás, passe curto e volte para a posição.', 'Marque o ponta por dentro e empurre ele para a linha.', 'O ponta rival não pode receber de frente para você.'] },
      ] },
    VOL: { desc: 'O equilíbrio do time: protege a defesa e organiza a saída de bola.', resp: ['Proteção da zaga', 'Interceptação', 'Distribuição', 'Cobertura dos laterais'], ax: ['Posicionamento', 'Desarme', 'Passe curto', 'Visão', 'Pulmão', 'Press resist.'],
      v: [
        { a: 'Cão de guarda · Anchor', n: 'Primeiro volante', d: 'Protetor da zaga. Foco em destruir jogadas, interceptar passes e passe simples.', k: 1, mv: [-6, 6], cap: 'Protege a frente da área', r: [92, 98, 72, 70, 85, 80], ins: ['Casemiro', 'João Palhinha', 'Jorginho'], w: { DEF: .6, TAT: .4 }, t: ['Recebeu, jogue rápido no companheiro mais próximo. Sem firula.', 'Cubra o espaço na frente da defesa e antecipe a segunda bola.', 'Você é o escudo: posicionamento vale mais que o carrinho.'] },
        { a: 'Regista · Deep playmaker', n: 'Volante armador', d: 'Joga recuado, mas com técnica. Arma o time lá de trás com lançamentos cirúrgicos.', k: 2, mv: [18, -14], cap: 'Arma o jogo lá de trás', r: [86, 70, 98, 96, 74, 92], ins: ['Toni Kroos', 'Andrea Pirlo', 'Sergio Busquets'], w: { TEC: .5, CRI: .3, TAT: .2 }, t: ['Peça a bola entre os zagueiros e acione o lançamento longo.', 'Feche a linha de passe central, sem sair para dar bote.', 'Olhe antes de receber: um toque a menos é um adversário a menos.'] },
        { a: 'Motorzinho · Área a área', n: 'Box-to-box', d: 'Incansável. Defende na própria área e finaliza na área adversária.', k: 4, mv: [34, -4], cap: 'Vai de área a área', r: [80, 84, 82, 80, 98, 86], ins: ['Federico Valverde', 'Jude Bellingham', 'Arturo Vidal'], w: { ATA: .3, DEF: .3, TAT: .2, TEC: .2 }, t: ['Chegue na área como elemento surpresa no segundo pau.', 'Pressione quem recebe no meio e volte para cobrir o lateral.', 'Escolha o momento: nem todo ataque precisa de você na área.'] },
      ] },
    MEI: { desc: 'O cérebro entre as linhas: conecta o meio ao ataque e cria as chances.', resp: ['Criação', 'Último passe', 'Chute de média distância', 'Pressão na saída'], ax: ['Visão', 'Passe', 'Drible', 'Finalização', 'Controle', 'Criatividade'],
      v: [
        { a: 'Camisa 10 · Enganche', n: 'Meia clássico', d: 'Flutua entre as linhas e decide com o último passe.', k: 0, mv: [12, -12], cap: 'Flutua entre as linhas', r: [97, 95, 84, 72, 92, 96], ins: ['Riquelme', 'Mesut Özil', 'Paulo Henrique Ganso'], w: { CRI: .5, TEC: .4, ATA: .1 }, t: ['Receba de frente entre volante e zagueiro e acione o atacante.', 'Pressione o volante rival para ele não virar.', 'Calma com a bola: o 10 dita o tempo do time.'] },
        { a: 'Infiltrador · Shadow striker', n: 'Meia infiltrador', d: 'Ataca o espaço vazio e chega à área como um segundo atacante.', k: 3, mv: [24, 4], cap: 'Ataca o espaço na área', r: [82, 80, 78, 93, 84, 82], ins: ['Thomas Müller', 'Frank Lampard', 'Bruno Fernandes'], w: { ATA: .6, TEC: .2, CRI: .2 }, t: ['Quando o centroavante sai da área, ocupe o espaço dele.', 'Seja o primeiro a pressionar o zagueiro com a bola.', 'Tempo de chegada é tudo: chegue, não espere na área.'] },
        { a: 'Mezzala · Ligação', n: 'Meia de ligação', d: 'Joga no meio-esquerdo ou direito, liga o volante aos pontas e dá ritmo.', k: 1, mv: [14, -18], cap: 'Liga o meio às pontas', r: [90, 93, 86, 74, 90, 88], ins: ['Luka Modrić', 'Andrés Iniesta', 'Kevin De Bruyne'], w: { TEC: .5, TAT: .3, CRI: .2 }, t: ['Ofereça linha de passe entre o volante e o ponta, sempre.', 'Feche por dentro e acompanhe o meia adversário.', 'Dois toques e a bola andou: ritmo é a sua arma.'] },
      ] },
    PNT: { desc: 'Velocidade e drible pelo lado: ganha o duelo e cria a vantagem.', resp: ['Um contra um', 'Profundidade', 'Cruzamento', 'Recomposição'], ax: ['Velocidade', 'Drible', 'Finalização', 'Cruzamento', 'Aceleração', 'Recomposição'],
      v: [
        { a: 'Invertido · Inside forward', n: 'Ponta invertido', d: 'Parte do lado contrário ao pé bom e corta para dentro para finalizar.', k: 2, mv: [14, 20], cap: 'Corta para dentro e finaliza', r: [92, 92, 94, 70, 93, 66], ins: ['Arjen Robben', 'Mohamed Salah', 'Vinícius Jr.'], w: { ATA: .6, TEC: .3, CRI: .1 }, t: ['Puxe para o pé bom e bata colocado no segundo pau.', 'Feche a linha de passe do lateral rival.', 'Se o lateral passar por fora, ele é o seu passe — não só o chute.'] },
        { a: 'Clássico · Winger', n: 'Ponta de linha de fundo', d: 'Fica aberto, vai até a linha de fundo e cruza para a área.', k: 1, mv: [22, -2], cap: 'Vai à linha de fundo', r: [93, 95, 78, 90, 92, 70], ins: ['Garrincha', 'Franck Ribéry', 'Raphinha'], w: { TEC: .5, CRI: .3, ATA: .2 }, t: ['Abra o campo e ganhe o um contra um pela linha de fundo.', 'Volte acompanhando o lateral até a sua intermediária.', 'Pé na linha lateral: quanto mais aberto, mais espaço por dentro.'] },
        { a: 'Tático · Wide midfielder', n: 'Ponta de recomposição', d: 'Dá largura no ataque e vira meia na defesa, fechando o corredor.', k: 5, mv: [-20, 2], cap: 'Recompõe e fecha o corredor', r: [86, 82, 74, 80, 84, 92], ins: ['Park Ji-sung', 'Dirk Kuyt', 'Bernardo Silva'], w: { TAT: .4, DEF: .3, TEC: .3 }, t: ['Segure a largura e escolha bem: cruzar ou voltar o jogo.', 'Volte até a linha dos meias e feche o corredor com o lateral.', 'O time confia em você nos dois lados do campo.'] },
      ] },
    CA: { desc: 'A referência do ataque: finaliza, segura a bola e abre espaço para os outros.', resp: ['Finalização', 'Jogo de costas', 'Ataque à profundidade', 'Pressão na saída'], ax: ['Finalização', 'Cabeceio', 'Força', 'Movimentação', 'Pivô', 'Velocidade'],
      v: [
        { a: 'Homem de área · Poacher', n: 'Matador', d: 'Vive dentro da área: um toque, um gol.', k: 0, mv: [10, 6], cap: 'Ataca o primeiro pau', r: [98, 84, 80, 90, 70, 84], ins: ['Erling Haaland', 'Filippo Inzaghi', 'Romário'], w: { ATA: .8, TEC: .2 }, t: ['Ataque o primeiro pau e fique sempre um passo à frente do zagueiro.', 'Pressione o zagueiro com a bola pelo lado do pé ruim.', 'Fique na área: a bola vai chegar.'] },
        { a: 'Pivô · Target man', n: 'Centroavante pivô', d: 'Segura a bola de costas, ganha pelo alto e faz o time subir.', k: 1, mv: [-12, 0], cap: 'Vem buscar de costas', r: [86, 95, 94, 78, 96, 64], ins: ['Olivier Giroud', 'Fred', 'Edin Džeko'], w: { ATA: .4, TEC: .3, TAT: .3 }, t: ['Venha buscar de costas, proteja e escore para o meia que chega.', 'Bloqueie o passe para o volante rival.', 'Corpo entre o zagueiro e a bola, sempre.'] },
        { a: 'Falso 9 · False nine', n: 'Falso 9', d: 'Sai da área para o meio-campo, arrasta a zaga e abre espaço para os pontas.', k: 3, mv: [-18, -10], cap: 'Sai da área e arrasta a zaga', r: [86, 70, 72, 95, 88, 82], ins: ['Lionel Messi', 'Roberto Firmino', 'Francesco Totti'], w: { TEC: .4, CRI: .4, ATA: .2 }, t: ['Caia entre as linhas e acione os pontas que atacam a área.', 'Pressione o volante, não os zagueiros.', 'Quando você sai, alguém entra: veja quem é antes de receber.'] },
      ] },
  };
  const MINI_BASE = { ZAG: [20, 38], LAT: [26, 16], VOL: [38, 44], MEI: [54, 40], PNT: [62, 18], CA: [74, 48] };
  const abbr = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  const fitOf = (id, role, v) => {
    const at = ATTR[2026][id]; if (!at) return null;
    let s = 0, t = 0; Object.entries(v.w).forEach(([k, w]) => { s += at[ATTR_K.indexOf(k)] * w; t += w; });
    return clamp(Math.round(s / t / 64 * 100 + (ROLE_OF[A[id].pos] === role ? 8 : 0)), 0, 99);
  };
  const mvEnd = (x, y, mv) => { const dy = y < 50 ? mv[1] : y > 50 ? -mv[1] : 0; return [clamp(x + mv[0], 3, 97), clamp(y + dy, 4, 96)]; };
  const arrowPath = (x0, y0, x1, y1, k = .18) => { const mx = (x0 + x1) / 2 - (y1 - y0) * k, my = (y0 + y1) / 2 + (x1 - x0) * k; return `M${x0} ${y0} Q${mx.toFixed(2)} ${my.toFixed(2)} ${x1} ${y1}`; };
  const PITCH = `<rect x=".5" y=".5" width="104" height="67"/><path d="M52.5 .5v67"/><circle cx="52.5" cy="34" r="9.15"/><circle cx="52.5" cy="34" r=".5" class="f"/>
    <path d="M.5 13.85h16.5v40.3H.5M.5 24.85h5.5v18.3H.5M104.5 13.85H88v40.3h16.5M104.5 24.85H99v18.3h5.5"/><circle cx="11" cy="34" r=".45" class="f"/><circle cx="94" cy="34" r=".45" class="f"/>
    <path d="M17 26.7a9.15 9.15 0 0 1 0 14.6M88 26.7a9.15 9.15 0 0 0 0 14.6"/><path class="gl" d="M.5 30.3H-1.4v7.4H.5M104.5 30.3h1.9v7.4h-1.9"/>`;
  const mini = (f) => `<svg viewBox="-2 -2 109 72" aria-hidden="true"><g class="mp">${PITCH}</g>${LF[f].s.map(([, r, x, y]) => `<circle cx="${x * 1.05}" cy="${y * .68}" r="3.4" fill="${RC[r][1]}"/>`).join('')}</svg>`;
  const miniMove = (role, v, c) => { const [bx, by] = MINI_BASE[role], [ex, ey] = mvEnd(bx, by, v.mv); return `<svg viewBox="-1 -1 107 70" aria-hidden="true"><defs><radialGradient id="mg-${role}${v.k}${v.mv[0]}"><stop offset="0" stop-color="${c}" stop-opacity=".45"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><g class="mp">${PITCH}</g><circle cx="${ex * 1.05}" cy="${ey * .68}" r="20" fill="url(#mg-${role}${v.k}${v.mv[0]})"/><path class="mv" d="${arrowPath(bx * 1.05, by * .68, ex * 1.05, ey * .68)}" stroke="${c}" pathLength="1"/><circle cx="${bx * 1.05}" cy="${by * .68}" r="2.4" fill="${c}"/><circle class="mh" cx="${ex * 1.05}" cy="${ey * .68}" r="1.8" fill="${c}"/></svg>`; };

  V.lab = () => head('Lab. Tático', null, `<button class="btn g" type="button" data-reset>${ic('refresh')}Reiniciar</button>`, 'Monte o sistema, escale o elenco e simule a jogada') + `
    <section class="lb-forms" data-forms role="radiogroup" aria-label="Formação"></section>
    <section class="lb-board">
      <div class="card lb-pitch">
        <div class="lp-hud">
          <div class="lp-f"><small>Formação</small><b data-fname></b></div>
          <div class="lp-ctl">${seg('ph', [['atk', 'Fase ofensiva'], ['def', 'Bloco baixo']], 'atk')}<button class="lp-3d" type="button" data-3d aria-pressed="true" title="Alternar visão 2D / 3D">${ic('cube')}<span>3D</span></button></div>
        </div>
        <div class="lp-stage" data-stage>
          <span class="lp-cap" data-cap aria-live="polite"></span>
          <div class="lp-field" data-field>
            <svg class="lp-svg" data-svg preserveAspectRatio="none" aria-hidden="true"></svg>
            <div class="lp-toks" data-toks></div>
            <span class="lp-ball" data-ball hidden></span>
            <span class="lp-goal" data-goal>GOL</span>
          </div>
        </div>
        <div class="lp-foot"><div class="lp-stats" data-stats></div><button class="btn r sm lp-sim" type="button" data-sim>${ic('play')}Simular jogada</button></div>
      </div>
      <aside class="card lb-insp">${seg('tab', [['plano', 'Plano de jogo'], ['xi', 'Escalação']], 'plano')}<div class="li-body" data-insp></div></aside>
    </section>
    <section class="lb-pos" data-pos role="tablist" aria-label="Posição"></section>
    <section class="lb-role"><div class="card lr-hero" data-hero></div><div class="lr-vars" data-vars role="radiogroup" aria-label="Variações da função"></div></section>
    <section class="lb-det"><div class="lb-col"><div class="card pad lr-todo" data-todo></div><div class="card pad" data-fit></div></div><div class="card pad lr-attr" data-attr></div></section>`;

  V.lab.after = (root) => {
    const $r = (s) => $(s, root);
    const field = $r('[data-field]'), svg = $r('[data-svg]'), toks = $r('[data-toks]'), stage = $r('[data-stage]'), cap = $r('[data-cap]'), ball = $r('[data-ball]'), goalEl = $r('[data-goal]');
    const mq = matchMedia('(max-width:640px)');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let f = store.get('lab2:f', '4-2-3-1'); if (!LF[f]) f = '4-2-3-1';
    let ph = 'atk', d3 = store.get('lab2:3d', !mq.matches), role = store.get('lab2:role', 'VOL'), tab = 'plano', pickAth = null, simOn = false;
    const vsel = store.get('lab2:v', {});
    const vOf = (r) => RL[r].v[vsel[r] || 0];
    let pos = [];
    const xiKey = () => 'lab2:xi:' + f, posKey = () => `lab2:pos:${f}:${ph}`;
    const autoXI = () => {
      const xi = {}, s = LF[f].s, fb = { MEI: ['MEI', 'VOL', 'PNT', 'CA'], PNT: ['PNT', 'MEI', 'CA'], ZAG: ['ZAG'], LAT: ['LAT'] };
      Object.keys(A).forEach((id) => { const r = ROLE_OF[A[id].pos]; for (const rr of fb[r] || [r]) { const i = s.findIndex(([, x], k) => x === rr && !xi[k]); if (i > -1) { xi[i] = id; break; } } });
      return xi;
    };
    let xi = store.get(xiKey(), null) || autoXI();
    const vert = () => mq.matches;
    const P2 = (x, y) => vert() ? [y, 100 - x] : [x, y]; // % na tela
    const M = (x, y) => [x * 1.05, y * .68]; // metros (campo deitado)

    /* ---- campo ---- */
    const drawField = () => {
      const v = vert();
      svg.setAttribute('viewBox', v ? '-2 -2 72 109' : '-2 -2 109 72');
      svg.innerHTML = `<defs><marker id="lbm" viewBox="0 0 10 10" refX="7" refY="5" markerUnits="userSpaceOnUse" markerWidth="2.6" markerHeight="2.6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" data-mk/></marker><radialGradient id="lbg"><stop offset="0" stop-opacity=".5" data-g0/><stop offset="1" stop-opacity="0" data-g1/></radialGradient></defs>
        <g ${v ? 'transform="matrix(0 -1 1 0 0 105)"' : ''}><g class="lp-lines">${PITCH}</g><g data-zone></g><g data-arrows></g></g>`;
      field.classList.toggle('vert', v);
    };
    const tokHTML = (i) => {
      const [code, r] = LF[f].s[i], id = xi[i], c = RC[r][1];
      return `<button class="tk${id ? ' has' : ''}" type="button" data-i="${i}" style="--c:${c}" aria-label="${code}${id ? ' — ' + esc(nm(id)) : ''}"><span class="tk-c">${id ? (IMG[id] ? `<img src="${IMG[id]}" alt="">` : nm(id).slice(0, 2)) : `<b>${code}</b>`}</span><span class="tk-n">${id ? `<em>${code}</em>${esc(nm(id))}` : RC[r][0]}</span></button>`;
    };
    const buildToks = () => { toks.innerHTML = LF[f].s.map((_, i) => tokHTML(i)).join(''); $$('.tk', toks).forEach(tokWire); paintRole(); };
    const layout = () => {
      const base = shape(f, ph), ov = store.get(posKey(), {});
      pos = base.map((p, i) => ov[i] || p);
      $$('.tk', toks).forEach((t) => { const [l, tp] = P2(...pos[+t.dataset.i]); t.style.left = l + '%'; t.style.top = tp + '%'; });
      drawOverlay(); stats();
    };
    const stats = () => {
      const s = LF[f].s, out = pos.filter((_, i) => s[i][1] !== 'GR');
      const xs = out.map((p) => p[0]), ys = out.map((p) => p[1]);
      const defs = pos.filter((_, i) => s[i][1] === 'ZAG');
      const line = defs.reduce((a, p) => a + p[0], 0) / defs.length * 1.05;
      const st = [['Altura da linha', line], ['Compactação', (Math.max(...xs) - Math.min(...xs)) * 1.05], ['Amplitude', (Math.max(...ys) - Math.min(...ys)) * .68]];
      $r('[data-stats]').innerHTML = st.map(([l, v]) => `<span><small>${l}</small><b class="tab">${Math.round(v)}<i>m</i></b></span>`).join('');
    };
    const drawOverlay = () => {
      const zone = $('[data-zone]', svg), arr = $('[data-arrows]', svg), s = LF[f].s, c = RC[role][1];
      const out = pos.filter((_, i) => s[i][1] !== 'GR');
      const [x0, y0] = M(Math.min(...out.map((p) => p[0])) - 3, Math.min(...out.map((p) => p[1])) - 5), [x1, y1] = M(Math.max(...out.map((p) => p[0])) + 3, Math.max(...out.map((p) => p[1])) + 5);
      zone.innerHTML = `<rect class="lp-zone ${ph}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(y1 - y0).toFixed(1)}" rx="2"/>`;
      $('[data-mk]', svg).setAttribute('fill', c); $('[data-g0]', svg).setAttribute('stop-color', c); $('[data-g1]', svg).setAttribute('stop-color', c);
      const v = vOf(role);
      arr.innerHTML = s.map(([, r], i) => {
        if (r !== role) return '';
        const [ex, ey] = mvEnd(pos[i][0], pos[i][1], v.mv), [a, b] = M(...pos[i]), [e1, e2] = M(ex, ey);
        return `<circle cx="${e1.toFixed(1)}" cy="${e2.toFixed(1)}" r="11" fill="url(#lbg)" class="lp-glow"/><path class="lp-arr" d="${arrowPath(a, b, e1, e2)}" stroke="${c}" pathLength="1" marker-end="url(#lbm)"/>`;
      }).join('');
      requestAnimationFrame(() => $$('.lp-arr', arr).forEach((p) => p.classList.add('in')));
      if (!simOn && !pickAth) setCap(s.some(([, r]) => r === role) ? `${ic('arrow')}${v.cap}` : '', c);
    };
    const setCap = (html, c) => { cap.innerHTML = html; cap.style.setProperty('--c', c || '#fff'); cap.classList.toggle('on', !!html); };
    const paintRole = () => $$('.tk', toks).forEach((t) => { const r = LF[f].s[+t.dataset.i][1]; t.classList.toggle('on', r === role); t.classList.toggle('dim', r !== role && r !== 'GR'); });

    /* ---- tokens: toque seleciona / escala, arraste no 2D ---- */
    function tokWire(t) {
      const i = +t.dataset.i; let sx, sy, moved = false, down = false;
      t.addEventListener('pointerdown', (e) => { if (simOn) return; down = true; sx = e.clientX; sy = e.clientY; moved = false; if (!d3) t.setPointerCapture(e.pointerId); });
      t.addEventListener('pointermove', (e) => {
        if (!down || d3) return;
        if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return;
        moved = true; t.classList.add('drag');
        const r = field.getBoundingClientRect(), u = (e.clientX - r.left) / r.width * 100, w = (e.clientY - r.top) / r.height * 100;
        pos[i] = vert() ? [clamp(100 - w, 3, 97), clamp(u, 4, 96)] : [clamp(u, 3, 97), clamp(w, 4, 96)];
        const [l, tp] = P2(...pos[i]); t.style.left = l + '%'; t.style.top = tp + '%'; drawOverlay(); stats();
      });
      const up = () => {
        if (!down) return; down = false; t.classList.remove('drag');
        if (moved) { const ov = store.get(posKey(), {}); ov[i] = pos[i].map((n) => +n.toFixed(1)); store.set(posKey(), ov); return; }
        tap(i);
      };
      t.addEventListener('pointerup', up); t.addEventListener('pointercancel', () => { down = false; t.classList.remove('drag'); });
      t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(i); } });
    }
    function tap(i) {
      if (pickAth) {
        Object.keys(xi).forEach((k) => { if (xi[k] === pickAth) delete xi[k]; });
        xi[i] = pickAth; store.set(xiKey(), xi);
        toast(`${nm(pickAth)} escalado como ${LF[f].s[i][0]}`); pickAth = null; field.classList.remove('picking');
        buildToks(); layout(); insp(); fitCard(); return;
      }
      const r = LF[f].s[i][1]; if (r === 'GR') return toast('O goleiro fica fora da análise de funções');
      setRole(r);
      const el = $r('[data-pos]'); if (innerWidth < 1025) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }

    /* ---- formações ---- */
    const forms = () => {
      $r('[data-forms]').innerHTML = Object.keys(LF).map((k) => `<button type="button" role="radio" aria-checked="${k === f}" data-f="${k}">${mini(k)}<b>${k}</b></button>`).join('');
      $$('[data-f]', root).forEach((b) => b.addEventListener('click', () => { if (b.dataset.f === f || simOn) return; f = b.dataset.f; store.set('lab2:f', f); xi = store.get(xiKey(), null) || autoXI(); forms(); $r('[data-fname]').textContent = f; buildToks(); layout(); insp(); posTabs(); hero(); }));
    };

    /* ---- painel lateral ---- */
    const insp = () => {
      const L = LF[f], body = $r('[data-insp]');
      if (tab === 'plano') {
        const [com, sem, dica] = L[ph];
        body.innerHTML = `<div class="li-sec"><small class="li-k">Como funciona</small><p class="li-how">${L.how}</p></div>
          <div class="li-pc"><div class="li-pro"><span>${ic('plusc')}Pontos fortes</span><p>${L.pro}</p></div><div class="li-con"><span>${ic('minusc')}Pontos fracos</span><p>${L.con}</p></div></div>
          <div class="li-sec li-ph ${ph}"><small class="li-k">${PHASE[ph]}</small>
            <div class="li-r"><b>${ic('ballic')}Com a bola</b><p>${com}</p></div>
            <div class="li-r"><b>${ic('shield')}Sem a bola</b><p>${sem}</p></div>
            <div class="li-r tip"><b>${ic('bulb')}Dica do treinador</b><p>${dica}</p></div></div>`;
        requestAnimationFrame(() => $('.li-ph', body).classList.add('in'));
      } else {
        const on = Object.values(xi);
        body.innerHTML = `<div class="li-xi-h"><p><b>${on.length}</b> de ${Object.keys(A).length} atletas M3 em campo</p><button class="lnk" type="button" data-auto>Escalação automática</button></div>
          <p class="li-hint">${pickAth ? `Toque numa posição do campo para escalar <b>${esc(nm(pickAth))}</b>.` : 'Toque num atleta e depois na posição do campo.'}</p>
          <div class="li-xi">${Object.keys(A).map((id) => { const k = Object.keys(xi).find((n) => xi[n] === id), r = ROLE_OF[A[id].pos]; return `
            <div class="li-a${pickAth === id ? ' pick' : ''}"><button type="button" class="li-ab" data-pa="${id}" aria-pressed="${pickAth === id}">${av(id, 42, 'round')}<span><b>${esc(nm(id))}</b><small>${RC[r][0]}</small></span>
              <em class="${k != null ? 'on' : ''}" style="--c:${k != null ? RC[LF[f].s[k][1]][1] : 'var(--l3)'}">${k != null ? LF[f].s[k][0] : 'Fora'}</em></button>
              ${k != null ? `<button class="iconb li-rm" type="button" data-rm="${id}" aria-label="Tirar ${esc(nm(id))} do campo">${ic('x')}</button>` : ''}</div>`; }).join('')}</div>`;
        $$('[data-pa]', body).forEach((b) => b.addEventListener('click', () => { pickAth = pickAth === b.dataset.pa ? null : b.dataset.pa; field.classList.toggle('picking', !!pickAth); if (pickAth) setCap(`${ic('shirt')}Escolha a posição de ${esc(nm(pickAth))}`, '#FFD60A'); else drawOverlay(); insp(); }));
        $$('[data-rm]', body).forEach((b) => b.addEventListener('click', () => { Object.keys(xi).forEach((k) => { if (xi[k] === b.dataset.rm) delete xi[k]; }); store.set(xiKey(), xi); buildToks(); layout(); insp(); }));
        $('[data-auto]', body).addEventListener('click', () => { xi = autoXI(); store.set(xiKey(), xi); pickAth = null; field.classList.remove('picking'); buildToks(); layout(); insp(); toast('Elenco escalado nas posições de origem'); });
      }
    };

    /* ---- posições e funções ---- */
    const posTabs = () => {
      const used = new Set(LF[f].s.map((s) => s[1]));
      $r('[data-pos]').innerHTML = ROLES6.map((r, i) => `<button type="button" role="tab" aria-selected="${r === role}" data-r="${r}" style="--c:${RC[r][1]}" class="${used.has(r) ? '' : 'off'}"><em>0${i + 1}</em><b>${r}</b><small>${RC[r][0]}</small></button>`).join('');
      $$('[data-r]', root).forEach((b) => b.addEventListener('click', () => setRole(b.dataset.r)));
    };
    function setRole(r) { role = r; store.set('lab2:role', r); $$('[data-r]', root).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.r === r))); paintRole(); drawOverlay(); hero(); }
    const hero = () => {
      const R0 = RL[role], c = RC[role][1], slots = LF[f].s.filter((s) => s[1] === role).map((s) => s[0]);
      const h = $r('[data-hero]'); h.style.setProperty('--c', c);
      h.innerHTML = `<span class="lr-big" aria-hidden="true">${role}</span><small class="li-k">Posição 0${ROLES6.indexOf(role) + 1} / 06</small><h2>${RC[role][0]}</h2><p class="lr-d">${R0.desc}</p>
        <p class="lr-in">${slots.length ? `No ${f}: ${slots.map((s) => `<span>${s}</span>`).join('')}` : `Sem essa função no ${f}`}</p>
        <small class="li-k">Responsabilidades</small><ol class="lr-resp">${R0.resp.map((x, i) => `<li><em>0${i + 1}</em>${x}</li>`).join('')}</ol>`;
      vars(); detail(true);
    };
    const vars = () => {
      const c = RC[role][1], cur = vsel[role] || 0;
      $r('[data-vars]').innerHTML = RL[role].v.map((v, i) => `<button type="button" role="radio" aria-checked="${i === cur}" class="fut" data-v="${i}" style="--c:${c};--i:${i}"><span class="fut-in">
        <span class="fut-top"><span class="fut-r"><b class="tab">${v.r[v.k]}</b><small>${abbr(RL[role].ax[v.k])}</small></span><em>Var 0${i + 1}</em></span>
        <span class="fut-pitch">${miniMove(role, v, c)}</span>
        <small class="fut-a">${v.a}</small><b class="fut-n">${v.n}</b><span class="fut-d">${v.d}</span>
        <span class="fut-ref">${ic('users')}${v.ins[0]}</span></span></button>`).join('');
      $$('.fut', root).forEach((b) => {
        b.addEventListener('click', () => { vsel[role] = +b.dataset.v; store.set('lab2:v', vsel); $$('.fut', root).forEach((x) => x.setAttribute('aria-checked', String(x === b))); drawOverlay(); detail(false); });
        b.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const r = b.getBoundingClientRect(); b.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 10).toFixed(1) + 'deg'); b.style.setProperty('--rx', ((.5 - (e.clientY - r.top) / r.height) * 8).toFixed(1) + 'deg'); });
        b.addEventListener('pointerleave', () => { b.style.setProperty('--rx', '0deg'); b.style.setProperty('--ry', '0deg'); });
      });
    };
    let radarCur = null;
    const detail = (fresh) => {
      const v = vOf(role), c = RC[role][1], ax = RL[role].ax;
      const todo = $r('[data-todo]'); todo.style.setProperty('--c', c);
      todo.innerHTML = `<small class="li-k">O que fazer</small><h3>${v.n}</h3>
        <div class="li-r"><b>${ic('ballic')}Com a bola</b><p>${v.t[0]}</p></div><div class="li-r"><b>${ic('shield')}Sem a bola</b><p>${v.t[1]}</p></div><div class="li-r tip"><b>${ic('bulb')}Dica do treinador</b><p>${v.t[2]}</p></div>`;
      const at = $r('[data-attr]'); at.style.setProperty('--c', c);
      const N = 6, cx = 150, cy = 132, R = 92, pt = (i, val) => { const a = -Math.PI / 2 + i * 2 * Math.PI / N; return [cx + Math.cos(a) * R * val / 100, cy + Math.sin(a) * R * val / 100]; };
      if (fresh || !$('[data-poly]', at)) {
        at.innerHTML = `<div class="ch"><h2>Atributos-chave</h2><span class="pill c" style="--c:${c}" data-arch></span></div>
          <svg class="lr-radar" viewBox="0 0 300 268" role="img" aria-label="Radar de atributos">
            ${[25, 50, 75, 100].map((s) => `<polygon class="rg" points="${ax.map((_, i) => pt(i, s).join(',')).join(' ')}"/>`).join('')}
            ${ax.map((_, i) => `<line class="rg" x1="${cx}" y1="${cy}" x2="${pt(i, 100)[0]}" y2="${pt(i, 100)[1]}"/>`).join('')}
            <polygon data-poly fill="${c}" fill-opacity=".22" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>
            <g data-dots></g>
            ${ax.map((l, i) => { const [x, y] = pt(i, 128); return `<text x="${x}" y="${y - 4}" text-anchor="middle">${l.toUpperCase()}</text><text class="rv" data-rv="${i}" x="${x}" y="${y + 10}" text-anchor="middle" fill="${c}"></text>`; }).join('')}
          </svg><div class="lr-bars" data-bars></div><small class="li-k" style="margin-top:22px">Inspirações no mundo real</small><div class="lr-ins" data-ins></div>`;
        radarCur = radarCur && !fresh ? radarCur : ax.map(() => 0);
      }
      $('[data-arch]', at).textContent = v.a.split(' · ')[0];
      $('[data-bars]', at).innerHTML = ax.map((l, i) => `<div class="lr-b"><span>${l}</span><b class="tab">${v.r[i]}</b>${bar(v.r[i] / 100, c, i * .05)}</div>`).join('');
      $$('.bar', at).forEach((b) => requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('in'))));
      $('[data-ins]', at).innerHTML = v.ins.map((n) => `<span>${n}</span>`).join('');
      const from = radarCur.slice(), to = v.r, t0 = performance.now(), dur = reduce ? 1 : 650;
      const step = (t) => {
        const k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3), cur = from.map((a, i) => a + (to[i] - a) * e);
        $('[data-poly]', at).setAttribute('points', cur.map((val, i) => pt(i, val).join(',')).join(' '));
        $('[data-dots]', at).innerHTML = cur.map((val, i) => `<circle cx="${pt(i, val)[0]}" cy="${pt(i, val)[1]}" r="3.5" fill="${c}"/>`).join('');
        $$('[data-rv]', at).forEach((tx, i) => (tx.textContent = Math.round(cur[i])));
        radarCur = cur; if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      fitCard();
    };
    function fitCard() {
      const v = vOf(role), c = RC[role][1], card = $r('[data-fit]');
      const rows = Object.keys(A).map((id) => [id, fitOf(id, role, v)]).sort((a, b) => (b[1] ?? -1) - (a[1] ?? -1));
      card.innerHTML = `<div class="ch"><h2>Quem do elenco encaixa</h2></div><p class="lf-sub">Encaixe estimado de cada atleta M3 como <b style="color:${c}">${v.n}</b>, pelos atributos mais recentes.</p>
        <div class="lf">${rows.map(([id, s]) => { const nat = ROLE_OF[A[id].pos] === role, onF = Object.keys(xi).find((k) => xi[k] === id); return `
          <div class="lf-r">${av(id, 40, 'round')}<span class="lf-n"><b>${esc(nm(id))}${nat ? `<i style="--c:${c}">Posição de origem</i>` : ''}</b>${s == null ? '<small>Sem atributos cadastrados</small>' : bar(s / 100, c)}</span>
            <b class="lf-s tab" style="color:${s == null ? 'var(--l3)' : c}">${s == null ? '—' : s + '%'}</b>
            <button class="btn g sm" type="button" data-esc="${id}" ${LF[f].s.some((x) => x[1] === role) ? '' : 'disabled'}>${onF != null && LF[f].s[onF][1] === role ? 'Em campo' : 'Escalar'}</button></div>`; }).join('')}</div>`;
      $$('.bar', card).forEach((b) => requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('in'))));
      $$('[data-esc]', card).forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.esc, s = LF[f].s, free = s.findIndex(([, r], k) => r === role && !xi[k]), i = free > -1 ? free : s.findIndex(([, r]) => r === role);
        Object.keys(xi).forEach((k) => { if (xi[k] === id) delete xi[k]; }); xi[i] = id; store.set(xiKey(), xi);
        buildToks(); layout(); insp(); fitCard(); toast(`${nm(id)} escalado como ${s[i][0]}`);
        if (innerWidth < 1025) stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }));
    }

    /* ---- simulação ---- */
    const sleep = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
    async function simulate() {
      if (simOn) return; simOn = true; root.classList.add('simming');
      const btn = $r('[data-sim]'); btn.disabled = true;
      if (ph !== 'atk') { $r('[data-seg="ph"] [data-v="atk"]').click(); await sleep(700); }
      const s = LF[f].s, used = new Set(), seq = [];
      [['ZAG'], ['VOL', 'LAT'], ['MEI', 'VOL'], ['PNT', 'LAT'], ['CA']].forEach((opts) => { for (const r of opts) { const i = s.findIndex(([, x], k) => x === r && !used.has(k)); if (i > -1) { used.add(i); seq.push(i); break; } } });
      const LBL = ['Saída de bola', 'Construção', 'Criação', 'Último passe', 'Finalização'];
      const who = (i) => xi[i] ? nm(xi[i]) : s[i][0];
      const place = (x, y) => { const [l, t] = P2(x, y); ball.style.left = l + '%'; ball.style.top = t + '%'; };
      const fly = (a, b, ms) => new Promise((res) => {
        const t0 = performance.now(), d = reduce ? 1 : ms;
        const tick = (t) => { const k = clamp((t - t0) / d, 0, 1), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; place(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e); ball.style.setProperty('--h', (Math.sin(Math.PI * k) * Math.min(1, Math.hypot(b[0] - a[0], b[1] - a[1]) / 30)).toFixed(3)); if (k < 1) requestAnimationFrame(tick); else res(); };
        requestAnimationFrame(tick);
      });
      ball.hidden = false; place(...pos[seq[0]]);
      for (let k = 0; k < seq.length; k++) {
        const i = seq[k], t = $(`.tk[data-i="${i}"]`, toks), c = RC[s[i][1]][1];
        setCap(`<em>${k + 1}/${seq.length + 1}</em>${LBL[k]} · ${esc(who(i))}`, c);
        t.classList.add('rcv'); await sleep(520); t.classList.remove('rcv');
        await fly(pos[i], k < seq.length - 1 ? pos[seq[k + 1]] : [99.2, 50 + (Math.random() * 6 - 3)], k < seq.length - 1 ? 620 : 420);
      }
      setCap(`<em>${seq.length + 1}/${seq.length + 1}</em>Gol de ${esc(who(seq[seq.length - 1]))}`, '#FF3B30');
      goalEl.classList.remove('on'); void goalEl.offsetWidth; goalEl.classList.add('on'); stage.classList.add('shake');
      await sleep(1600);
      ball.hidden = true; goalEl.classList.remove('on'); stage.classList.remove('shake');
      simOn = false; root.classList.remove('simming'); btn.disabled = false; drawOverlay();
    }

    /* ---- controles ---- */
    $r('[data-seg="ph"]').addEventListener('pick', (e) => { ph = e.detail; layout(); if (tab === 'plano') insp(); });
    $r('[data-seg="tab"]').addEventListener('pick', (e) => { tab = e.detail; insp(); });
    const set3d = () => { stage.classList.toggle('d3', d3); $r('[data-3d]').setAttribute('aria-pressed', String(d3)); $r('[data-3d] span').textContent = d3 ? '3D' : '2D'; };
    $r('[data-3d]').addEventListener('click', () => { d3 = !d3; store.set('lab2:3d', d3); set3d(); });
    $r('[data-sim]').addEventListener('click', simulate);
    $r('[data-reset]').addEventListener('click', () => { if (simOn) return; ['atk', 'def'].forEach((p) => store.set(`lab2:pos:${f}:${p}`, {})); xi = autoXI(); store.set(xiKey(), xi); pickAth = null; field.classList.remove('picking'); buildToks(); layout(); insp(); fitCard(); toast(`${f} restaurado`); });
    const onMq = () => { drawField(); buildToks(); layout(); };
    mq.addEventListener ? mq.addEventListener('change', onMq) : mq.addListener(onMq);
    cleanups.push(() => (mq.removeEventListener ? mq.removeEventListener('change', onMq) : mq.removeListener(onMq)));

    $r('[data-fname]').textContent = f;
    forms(); drawField(); set3d(); buildToks(); layout(); insp(); posTabs(); hero();
  };



  root.innerHTML = `<div class="view">${V.lab()}</div>`;
  const view = root.firstElementChild;
  [...view.children].forEach((el, i) => { if (!el.style.getPropertyValue('--s')) el.style.setProperty('--s', i); });
  wire(view);
  V.lab.after(view);
  return () => { cleanups.forEach((f) => f()); root.innerHTML = ''; };
}
