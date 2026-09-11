// api-auth.js · anexa a credencial de sessão em toda chamada à API.
//
// Por que um interceptor e não uma mudança em cada chamada: existem ~85
// chamadas a fetch() espalhadas por 10 arquivos, e só o Gerenciamento.js tem um
// wrapper próprio. Envolver o window.fetch uma vez cobre todas de uma vez, e
// cobre também as que forem escritas depois.
//
// Precisa ser o PRIMEIRO script da página: qualquer fetch disparado antes deste
// arquivo carregar sairia sem o cabeçalho Authorization.
(function () {
    'use strict';

    // Hosts que são a API. Só para eles o token é anexado · mandar a credencial
    // para um domínio de terceiros (um CDN, um mapa) seria vazá-la.
    const HOSTS_API = new Set([
        'api-tour.exksvol.com',
        'api.exksvol.com',
        '127.0.0.1:5000',
        'localhost:5000'
    ]);

    const fetchOriginal = window.fetch.bind(window);

    const ehApi = (url) => {
        try {
            // URL relativa resolve contra a página atual; se a página não está
            // num host de API, o host resolvido não estará na lista e o token
            // não é anexado · que é o comportamento correto.
            const alvo = new URL(url, window.location.href);
            return HOSTS_API.has(alvo.host);
        } catch (e) {
            return false;
        }
    };

    const lerToken = () => {
        try {
            return localStorage.getItem('authToken') || '';
        } catch (e) {
            // localStorage pode lançar (janela privada, cookies bloqueados).
            return '';
        }
    };

    const limparSessao = () => {
        try {
            ['authToken', 'userRole', 'userEmail', 'userName', 'userPhoto',
             'userPhone', 'currentRolePermissions'].forEach((chave) => {
                localStorage.removeItem(chave);
            });
        } catch (e) { /* sem storage, não há o que limpar */ }
    };

    window.fetch = async function (entrada, init) {
        const url = (entrada && typeof entrada === 'object' && 'url' in entrada)
            ? entrada.url
            : String(entrada);

        if (!ehApi(url)) {
            return fetchOriginal(entrada, init);
        }

        const token = lerToken();
        let resposta;

        if (token) {
            // Headers() normaliza tanto objeto literal quanto instância de
            // Headers, que é como as chamadas existentes montam os cabeçalhos.
            const opcoes = Object.assign({}, init);
            const cabecalhos = new Headers(
                (init && init.headers) ||
                (entrada && typeof entrada === 'object' ? entrada.headers : undefined)
            );
            cabecalhos.set('Authorization', `Bearer ${token}`);
            opcoes.headers = cabecalhos;
            resposta = await fetchOriginal(url, opcoes);
        } else {
            resposta = await fetchOriginal(entrada, init);
        }

        // 401 = token ausente, expirado ou invalidado por troca de senha.
        // Mantém a sessão do navegador coerente com a do servidor em vez de
        // deixar a interface achando que continua logada.
        if (resposta.status === 401 && token) {
            limparSessao();
            // O /login responde 401 para senha errada · ali o 401 é esperado e
            // a página não deve recarregar por baixo do formulário.
            if (!/\/login$/.test(new URL(url, window.location.href).pathname)) {
                window.dispatchEvent(new CustomEvent('sessao-expirada'));
            }
        }

        return resposta;
    };

    // Uma página que reagir a isto pode avisar o usuário; sem ouvinte, o efeito
    // é só a sessão local ter sido limpa.
    window.addEventListener('sessao-expirada', () => {
        console.warn('Sessão expirada ou inválida · faça login novamente.');
    });
})();
