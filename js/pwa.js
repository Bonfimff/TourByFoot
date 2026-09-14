/* Instalação das páginas como app (atalho na tela inicial / gaveta de apps).
 *
 * Cada página aponta para o próprio manifest.json (nome e ícone da página),
 * então o atalho salvo leva o ícone certo: Rio, Salvador, São Luís, Lençóis,
 * a página principal ou o Gerenciamento.
 *
 * Em toda página este script só registra o service worker (/sw.js), que é o
 * que faz o navegador aceitar a instalação. Com data-sugerir-instalacao na
 * tag <script> (página de gerenciamento), também mostra um aviso sugerindo
 * instalar o app.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var sugerir = !!(script && script.hasAttribute('data-sugerir-instalacao'));
  var CHAVE_DISPENSA = 'pwaSugestaoDispensadaEm';
  var DIAS_SEM_REPETIR = 7;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function (err) {
        console.warn('Service worker não registrado:', err);
      });
    });
  }

  if (!sugerir) return;

  var jaInstalado = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  if (jaInstalado) return;

  var dispensadoRecentemente = function () {
    try {
      var quando = Number(localStorage.getItem(CHAVE_DISPENSA) || 0);
      return quando && (Date.now() - quando) < DIAS_SEM_REPETIR * 864e5;
    } catch (_err) {
      return false;
    }
  };
  if (dispensadoRecentemente()) return;

  var ua = navigator.userAgent || '';
  var ehIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var ehSafariIOS = ehIOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);

  var eventoInstalacao = null;
  var aviso = null;

  var estilos = function () {
    if (document.getElementById('pwaAvisoEstilo')) return;
    var st = document.createElement('style');
    st.id = 'pwaAvisoEstilo';
    st.textContent = [
      '.pwa-aviso{position:fixed;left:50%;bottom:calc(1rem + env(safe-area-inset-bottom,0px));transform:translate(-50%,140%);',
      'z-index:100000;width:min(440px,calc(100vw - 2rem));box-sizing:border-box;display:flex;align-items:center;gap:.75rem;',
      'padding:.75rem .85rem;border-radius:16px;background:#fff;color:#0b3c6d;box-shadow:0 12px 36px rgba(0,0,0,.22);',
      'font-family:inherit;transition:transform .35s ease}',
      '.pwa-aviso.visivel{transform:translate(-50%,0)}',
      '.pwa-aviso img{width:44px;height:44px;flex:0 0 auto;border-radius:10px}',
      '.pwa-aviso-texto{flex:1 1 auto;min-width:0;font-size:.82rem;line-height:1.3;color:#374151}',
      '.pwa-aviso-texto strong{display:block;font-size:.9rem;color:#0b3c6d;margin-bottom:.1rem}',
      '.pwa-aviso-acoes{display:flex;flex-direction:column;gap:.35rem;flex:0 0 auto}',
      '.pwa-aviso button{border:0;border-radius:999px;padding:.45rem .9rem;font-size:.78rem;font-weight:700;cursor:pointer;font-family:inherit}',
      '.pwa-aviso-instalar{background:#0b3c6d;color:#fff}',
      '.pwa-aviso-depois{background:transparent;color:#6b7280}'
    ].join('');
    document.head.appendChild(st);
  };

  var fechar = function (lembrar) {
    if (!aviso) return;
    if (lembrar) {
      try { localStorage.setItem(CHAVE_DISPENSA, String(Date.now())); } catch (_err) { /* sem storage */ }
    }
    aviso.classList.remove('visivel');
    var el = aviso;
    aviso = null;
    setTimeout(function () { el.remove(); }, 400);
  };

  var mostrar = function (modoIOS) {
    if (aviso || dispensadoRecentemente()) return;
    estilos();
    aviso = document.createElement('div');
    aviso.className = 'pwa-aviso';
    aviso.setAttribute('role', 'dialog');
    aviso.setAttribute('aria-label', 'Instalar o app de gerenciamento');
    aviso.innerHTML =
      '<img src="/imagem/icones/gerenciamento-192.png" alt="">' +
      '<div class="pwa-aviso-texto"><strong>Instale o app do Gerenciamento</strong>' +
      (modoIOS
        ? 'Toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.'
        : 'Acesse o painel direto da tela inicial, como um aplicativo.') +
      '</div>' +
      '<div class="pwa-aviso-acoes">' +
      (modoIOS ? '' : '<button type="button" class="pwa-aviso-instalar">Instalar</button>') +
      '<button type="button" class="pwa-aviso-depois">' + (modoIOS ? 'Entendi' : 'Agora não') + '</button>' +
      '</div>';
    document.body.appendChild(aviso);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { if (aviso) aviso.classList.add('visivel'); });
    });

    aviso.querySelector('.pwa-aviso-depois').addEventListener('click', function () { fechar(true); });
    var instalar = aviso.querySelector('.pwa-aviso-instalar');
    if (instalar) {
      instalar.addEventListener('click', function () {
        if (!eventoInstalacao) { fechar(false); return; }
        eventoInstalacao.prompt();
        eventoInstalacao.userChoice.then(function (escolha) {
          // Recusou na janela do navegador: não insiste pelos próximos dias.
          fechar(escolha && escolha.outcome !== 'accepted');
          eventoInstalacao = null;
        });
      });
    }
  };

  // Chrome, Edge e Samsung Internet avisam quando a página pode ser instalada.
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    eventoInstalacao = event;
    setTimeout(function () { mostrar(false); }, 1500);
  });

  window.addEventListener('appinstalled', function () {
    fechar(false);
  });

  // Safari no iPhone/iPad não tem esse evento: a instalação é manual pelo
  // menu Compartilhar, então o aviso só explica o caminho.
  if (ehSafariIOS) {
    window.addEventListener('load', function () {
      setTimeout(function () { mostrar(true); }, 2000);
    });
  }
})();
