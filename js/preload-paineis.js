// Pré-carrega, a partir do index, tudo que a página de cada cidade vai
// precisar assim que o cliente clicar numa delas: a identidade visual
// (logo/painel, ver Gerenciamento > Identidade Visual) e o aviso "Informações
// Importantes" de cada cidade. As imagens vão pro cache HTTP do navegador
// (new Image()) e os dois JSONs vão pro localStorage — js/cidade-visual.js e
// js/site-shell.js/Riodejaneiro.js leem esse cache primeiro e aplicam na
// hora, só revalidando com o servidor depois em segundo plano, em vez de
// esperar a resposta da API pra mostrar qualquer coisa.
(() => {
    const apiBase = window.API_BASE_URL || 'https://api-tour.exksvol.com';
    // api.exksvol.com não existe (NXDOMAIN) — era só um request garantidamente
    // falho a cada carregamento. O fallback real é o backend local.
    const VISUAL_ENDPOINTS = [
        `${apiBase}/get_cidade_visual`,
        'http://127.0.0.1:5000/get_cidade_visual'
    ];
    const AVISO_ENDPOINTS = [
        `${apiBase}/get_cidade_aviso`,
        'http://127.0.0.1:5000/get_cidade_aviso'
    ];

    // Precisa ser IDÊNTICO ao bustCache de js/cidade-visual.js (mesma chave de
    // sessionStorage, mesma lógica): a página da cidade só reaproveita esta
    // pré-busca do navegador se pedir exatamente a mesma URL, "cb=" incluso.
    // Um Date.now() novo aqui geraria uma URL diferente da que a página da
    // cidade pede, e o preload não serviria pra nada.
    const CACHE_BUST_STORAGE_KEY = 'cidadeVisualCacheBust';
    const getCacheBustValue = () => {
        try {
            let valor = sessionStorage.getItem(CACHE_BUST_STORAGE_KEY);
            if (!valor) {
                valor = String(Date.now());
                sessionStorage.setItem(CACHE_BUST_STORAGE_KEY, valor);
            }
            return valor;
        } catch (_e) {
            return String(Date.now());
        }
    };
    const bustCache = (url) => {
        if (!url) return url;
        const separador = url.includes('?') ? '&' : '?';
        return `${url}${separador}cb=${getCacheBustValue()}`;
    };

    const preloadImage = (url) => {
        if (!url) return;
        const img = new Image();
        img.src = url;
    };

    // Chave e formato ({ts, dados}) compartilhados com quem lê o cache
    // (js/cidade-visual.js para VISUAL_CACHE_KEY; js/site-shell.js e
    // js/Riodejaneiro.js para AVISO_CACHE_KEY).
    const VISUAL_CACHE_KEY = 'cidadeVisualCache';
    const AVISO_CACHE_KEY = 'cidadeAvisoCache';
    const saveCache = (key, dados) => {
        try {
            localStorage.setItem(key, JSON.stringify({ ts: Date.now(), dados }));
        } catch (_e) {
            // localStorage indisponível (modo privado, cota cheia etc.) — sem
            // problema, as páginas de cada cidade caem de volta pra buscar
            // na hora, exatamente como já faziam antes desse preload existir.
        }
    };

    const preloadCidadeVisual = async () => {
        for (const endpoint of VISUAL_ENDPOINTS) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) continue;
                const lista = await response.json();
                if (!Array.isArray(lista)) continue;
                lista.forEach((visual) => {
                    if (visual?.painel?.imagem) preloadImage(bustCache(visual.painel.imagem));
                    if (visual?.logo?.imagem) preloadImage(bustCache(visual.logo.imagem));
                });
                saveCache(VISUAL_CACHE_KEY, lista);
                return;
            } catch (error) {
                console.warn('Falha ao pré-carregar identidade visual de painéis em', endpoint, error);
            }
        }
    };

    const preloadCidadeAviso = async () => {
        for (const endpoint of AVISO_ENDPOINTS) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) continue;
                const lista = await response.json();
                if (!Array.isArray(lista)) continue;
                saveCache(AVISO_CACHE_KEY, lista);
                return;
            } catch (error) {
                console.warn('Falha ao pré-carregar aviso "Informações Importantes" em', endpoint, error);
            }
        }
    };

    preloadCidadeVisual();
    preloadCidadeAviso();
})();
