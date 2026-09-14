/* Service worker do Tour by Foot.
 *
 * Existe para duas coisas:
 * 1. Permitir instalar as páginas como app (atalho na tela inicial / gaveta
 *    de apps). O navegador só oferece a instalação com um service worker que
 *    trata requisições.
 * 2. Receber as notificações push do painel de gerenciamento (registradas em
 *    js/Gerenciamento.js → initWebPushForAdmin).
 *
 * Não guarda páginas em cache: o site muda com frequência (tours, preços,
 * horários) e servir uma versão velha seria pior do que pedir conexão.
 */

const PAGINA_OFFLINE = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sem conexão · Tour by Foot</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       font-family:system-ui,sans-serif;background:#f5f7fa;color:#0b3c6d;text-align:center;padding:1.5rem}
  button{margin-top:1rem;padding:.7rem 1.4rem;border:0;border-radius:999px;background:#0b3c6d;color:#fff;font-size:1rem}
</style></head>
<body><div><h1 style="font-size:1.3rem">Sem conexão com a internet</h1>
<p>Confira a conexão e tente de novo.</p>
<button onclick="location.reload()">Tentar novamente</button></div></body></html>`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Só as navegações (abrir uma página) passam por aqui; imagens, scripts e
  // chamadas da API seguem direto pelo navegador.
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(PAGINA_OFFLINE, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }))
  );
});

self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (_err) {
    dados = { body: event.data ? event.data.text() : '' };
  }
  const titulo = dados.title || 'Tour by Foot';
  event.waitUntil(self.registration.showNotification(titulo, {
    body: dados.body || '',
    icon: '/imagem/icones/gerenciamento-192.png',
    badge: '/imagem/icones/gerenciamento-192.png',
    data: { url: dados.url || '/html/Gerenciamento.html' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || '/html/Gerenciamento.html', self.location.origin).href;
  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const aberta = janelas.find((c) => c.url.split('#')[0] === destino.split('#')[0]);
    if (aberta) return aberta.focus();
    return self.clients.openWindow(destino);
  })());
});
