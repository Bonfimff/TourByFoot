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

// Servidor da API: o aparelho confirma por aqui que recebeu cada push.
const APIS = ['https://api-tour.exksvol.com', 'https://api.exksvol.com'];

const avisarServidor = async (caminho, corpo) => {
  for (const base of APIS) {
    try {
      const resp = await fetch(base + caminho, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
        keepalive: true
      });
      if (resp.ok || resp.status === 404) return;
    } catch (_err) { /* tenta o próximo endereço */ }
  }
};

self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (_err) {
    dados = { body: event.data ? event.data.text() : '' };
  }
  const titulo = dados.title || 'Tour by Foot';
  const tag = dados.tag || `tbf-${dados.envio || Date.now()}`;

  event.waitUntil((async () => {
    let exibida = false;
    let erro = '';
    try {
      await self.registration.showNotification(titulo, {
        body: dados.body || '',
        icon: '/imagem/icones/gerenciamento-192.png',
        badge: '/imagem/icones/badge-96.png',
        data: { url: dados.url || '/html/Gerenciamento.html#reservas' },
        tag,
        // Aviso de reserva pendente vencida fica na tela até a pessoa agir.
        requireInteraction: !!dados.requireInteraction
      });
      // Se o sistema bloqueou (permissão do app no Android, canal desligado),
      // a notificação não aparece na lista de exibidas.
      const abertas = await self.registration.getNotifications({ tag });
      exibida = abertas.length > 0;
    } catch (err) {
      erro = `${err && err.name ? err.name : 'Erro'}: ${err && err.message ? err.message : err}`;
    }

    // Confirma a entrega ao servidor (diagnóstico por aparelho).
    try {
      const sub = await self.registration.pushManager.getSubscription();
      if (sub) {
        await avisarServidor('/push_recebido', {
          endpoint: sub.endpoint,
          envio: dados.envio || '',
          exibida,
          permissao: (self.Notification && self.Notification.permission) || '',
          erro
        });
      }
    } catch (_err) { /* sem conexão: fica sem a confirmação */ }
  })());
});

// O navegador pode renovar a inscrição por conta própria; sem avisar o
// servidor, o aparelho deixaria de receber sem ninguém perceber.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const antiga = event.oldSubscription;
      let nova = event.newSubscription;
      if (!nova && antiga && antiga.options) {
        nova = await self.registration.pushManager.subscribe(antiga.options);
      }
      if (antiga && nova) {
        await avisarServidor('/push_trocar_inscricao', { antigo: antiga.endpoint, nova: nova.toJSON() });
      }
    } catch (_err) { /* o painel refaz a inscrição na próxima abertura */ }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || '/html/Gerenciamento.html', self.location.origin);
  const reservaId = destino.searchParams.get('reserva');
  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Compara só o caminho: a URL da notificação traz ?reserva=ID e #reservas.
    const aberta = janelas.find((c) => new URL(c.url).pathname === destino.pathname);
    if (aberta) {
      // Painel já aberto: traz pra frente e pede a aba Reservas (e, se for o
      // caso, o formulário da reserva com foco no Status).
      aberta.postMessage(reservaId
        ? { tipo: 'abrir-reserva', id: reservaId }
        : { tipo: 'abrir-reservas' });
      return aberta.focus();
    }
    return self.clients.openWindow(destino.href);
  })());
});
