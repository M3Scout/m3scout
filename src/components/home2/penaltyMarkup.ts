/* Marcação do pênalti interativo — copiada de m3-home-2.html. */
export const PENALTY_HTML = `
<div class="pen" data-pen>
  <div class="pen-stage" data-stage>
    <svg class="pen-svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" data-svg role="img" aria-label="Cobrança de pênalti: chute em um canto do gol para conhecer a M3">
      <defs>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12251a"/><stop offset="1" stop-color="#0a160f"/></linearGradient>
        <radialGradient id="ballg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".65" stop-color="#e8ecea"/><stop offset="1" stop-color="#9aa39f"/></radialGradient>
        <radialGradient id="beam" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      </defs>
      <!-- luz do estádio -->
      <path d="M120 -20 L40 330 L300 330 Z" fill="url(#beam)"/><path d="M680 -20 L500 330 L760 330 Z" fill="url(#beam)"/>
      <!-- gramado -->
      <rect x="-200" y="330" width="1200" height="200" fill="url(#grass)"/>
      <g fill="#ffffff" opacity=".028"><rect x="-200" y="345" width="1200" height="16"/><rect x="-200" y="383" width="1200" height="24"/><rect x="-200" y="440" width="1200" height="34"/></g>
      <g class="lines-g"><path d="M-200 330H1000"/><path d="M140 330 96 392H704L660 330"/></g>
      <ellipse cx="400" cy="458" rx="7" ry="3" fill="rgba(255,255,255,.5)"/>
      <!-- rede -->
      <g class="net" data-net>
        <g class="net-depth"><path d="M200 120 230 150V330M600 120 570 150V330M230 150H570"/></g>
        <g class="net-grid" data-grid></g>
      </g>
      <!-- zonas do gol -->
      <g class="zones" data-zones>
        <g class="zone" data-z="0"><rect x="204" y="124" width="194" height="101" rx="6"/><text x="301" y="180" text-anchor="middle">Scouting</text></g>
        <g class="zone" data-z="1"><rect x="402" y="124" width="194" height="101" rx="6"/><text x="499" y="180" text-anchor="middle">Dados</text></g>
        <g class="zone" data-z="2"><rect x="204" y="229" width="194" height="99" rx="6"/><text x="301" y="284" text-anchor="middle">Carreira</text></g>
        <g class="zone" data-z="3"><rect x="402" y="229" width="194" height="99" rx="6"/><text x="499" y="284" text-anchor="middle">Clubes</text></g>
      </g>
      <!-- trave -->
      <path class="frame" d="M200 332V120H600V332"/>
      <!-- goleiro -->
      <g class="keeper" data-keeper>
        <g class="keeper-in">
          <ellipse cx="400" cy="332" rx="34" ry="5" fill="rgba(0,0,0,.45)"/>
          <path class="k-limb" d="M392 292 388 328M408 292 412 328"/>
          <path class="k-arm" d="M386 246 352 222M414 246 448 222"/>
          <rect class="k-body" x="380" y="232" width="40" height="64" rx="14"/>
          <circle class="k-body" cx="400" cy="216" r="13"/>
          <circle class="k-glove" cx="350" cy="220" r="8"/><circle class="k-glove" cx="450" cy="220" r="8"/>
        </g>
      </g>
      <circle class="ripple" data-ripple cx="0" cy="0" r="10"/>
      <!-- mira -->
      <g class="reticle" data-ret><circle r="18"/><path d="M-26 0h12M14 0h12M0 -26v12M0 14v12"/><circle r="2.5" class="rd"/></g>
      <!-- bola -->
      <ellipse class="ball-sh" data-bsh cx="400" cy="462" rx="15" ry="4.5"/>
      <g data-ball transform="translate(400 448)">
        <g data-spin>
          <circle r="14" fill="url(#ballg)"/>
          <path fill="#1b1b1b" d="m0-5 4.8 3.5-1.8 5.6h-6L-4.8-1.5z"/>
          <path fill="none" stroke="#1b1b1b" stroke-width="1.1" d="M0-5v-8.5M4.8-1.5l8-2.8M3 4.1l5 6.6M-3 4.1l-5 6.6M-4.8-1.5l-8-2.8"/>
        </g>
      </g>
    </svg>
    <span class="pen-hint" data-hint>Clique no gol para chutar</span>
    <span class="pen-toast" data-toast role="status" aria-live="polite"></span>
    <span class="pen-flash" data-flash aria-hidden="true"></span>
  </div>

  <aside class="pen-side" aria-label="O que a M3 faz">
    <div class="pen-prog"><span><b data-count>0</b> de 4</span><i><b data-bar></b></i></div>
    <ul class="pen-list">
      <li class="pz" data-z="0"><button type="button" data-shoot="0"><span class="pz-n">01</span><span class="pz-t">Scouting</span><span class="pz-s" aria-hidden="true"></span></button><div class="pz-d"><p>Olho no jogo, todo jogo — em campo e em vídeo, para encontrar talento antes do mercado.</p></div></li>
      <li class="pz" data-z="1"><button type="button" data-shoot="1"><span class="pz-n">02</span><span class="pz-t">Dados</span><span class="pz-s" aria-hidden="true"></span></button><div class="pz-d"><p>Cada partida vira informação. Desempenho e evolução guiam cada decisão.</p></div></li>
      <li class="pz" data-z="2"><button type="button" data-shoot="2"><span class="pz-n">03</span><span class="pz-t">Gestão de carreira</span><span class="pz-s" aria-hidden="true"></span></button><div class="pz-d"><p>Do primeiro contrato à próxima transferência, ao lado do atleta.</p></div></li>
      <li class="pz" data-z="3"><button type="button" data-shoot="3"><span class="pz-n">04</span><span class="pz-t">Relacionamento com clubes</span><span class="pz-s" aria-hidden="true"></span></button><div class="pz-d"><p>Uma rede ativa de clubes para colocar o atleta certo no lugar certo.</p></div></li>
    </ul>
    <div class="pen-final" data-final><div>
      <div class="pen-acts"><a class="pill" href="#contato">Conheça a agência</a><button class="pill ghost" type="button" data-reset>Bater de novo</button></div>
    </div></div>
  </aside>
</div>
`;
