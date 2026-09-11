(() => {
    const pageKey = 'Lencoismaranhenses';
    const pageTranslations = window.pageTranslations?.[pageKey] || {};
    const applyTourCard = (card, name, details, reserveLabel, sub, lang) => {
        if (!card) return;
        const hasDynamicDetails = typeof window.applyDynamicTourDetailsToCard === 'function'
            && window.applyDynamicTourDetailsToCard(card, lang);
        if (!hasDynamicDetails) {
            const nameEl = card.querySelector('.rio-tour-name');
            if (nameEl && name) {
                nameEl.innerHTML = sub ? `${name} <span class="rio-tour-name-sub">${sub}</span>` : name;
            }
            const detailItems = card.querySelectorAll('.rio-tour-details li');
            (details || []).forEach((html, index) => {
                if (detailItems[index]) detailItems[index].innerHTML = html;
            });
        }
        const reserveBtn = card.querySelector('.rio-btn-reserve');
        if (reserveBtn && reserveLabel) reserveBtn.textContent = reserveLabel;
    };

    const applyPageLanguage = (lang) => {
        const t = pageTranslations[lang] || pageTranslations.pt;
        if (!t) return;

        const heroTitle = document.querySelector('.rio-hero-title');
        if (heroTitle) heroTitle.innerHTML = t.hero_title;

        const heroLocation = document.querySelector('.rio-hero-location');
        if (heroLocation) heroLocation.textContent = t.hero_location;

        // innerHTML (e não textContent) porque hero_desc traz <span class="rio-hero-accent">
        // nos trechos destacados em dourado · com textContent essa marcação se perderia
        // na primeira troca de idioma.
        const heroDesc = document.querySelector('.rio-hero-desc');
        if (heroDesc) heroDesc.innerHTML = t.hero_desc;

        const heroButton = document.querySelector('.rio-hero-content .btn-book');
        if (heroButton) heroButton.textContent = t.hero_button;

        const heroScroll = document.querySelector('.rio-hero-scroll-label');
        if (heroScroll && t.hero_scroll) heroScroll.textContent = t.hero_scroll;

        if (!window.__cidadeAvisoCarregado) {
            const noticeTitle = document.querySelector('.rio-notice-title');
            if (noticeTitle) noticeTitle.textContent = t.notice_title;

        } else if (window.__cidadeAvisoData && typeof window.applyCidadeAviso === 'function') {
            // Reaplica o aviso já carregado do banco, agora com a tradução
            // automática do novo idioma (em vez do fallback hardcoded).
            window.applyCidadeAviso(null, window.__cidadeAvisoData);
        }

        const proceedButton = document.querySelector('.rio-notice .btn-proceed');
        const dontShowButton = document.querySelector('.rio-notice .btn-dont-show');
        const actionLabels = window.TOUR_ACTION_LABELS?.[lang] || window.TOUR_ACTION_LABELS?.pt;
        if (proceedButton) proceedButton.textContent = actionLabels?.proceed || t.proceed;
        if (dontShowButton) dontShowButton.textContent = actionLabels?.dontShow || dontShowButton.textContent;

        // Passeios (free/shared entry tours)
        const toursSection = document.getElementById('tours');
        if (toursSection) {
            const sectionTitle = toursSection.querySelector('.rio-section-title');
            if (sectionTitle) sectionTitle.textContent = t.section_title;
            const sectionSubtitle = toursSection.querySelector('.rio-section-subtitle');
            if (sectionSubtitle) sectionSubtitle.textContent = t.section_subtitle;

            const cards = toursSection.querySelectorAll('.rio-tour-card');
            applyTourCard(cards[0], t.names?.[0], t.card1_details, t.reserve, null, lang);
            applyTourCard(cards[1], t.names?.[1], t.card2_details, t.reserve, null, lang);
        }

        // Expedições Compartilhadas
        const sharedSection = document.getElementById('expedicoes-compartilhadas');
        if (sharedSection) {
            const sectionTitle = sharedSection.querySelector('.rio-section-title');
            if (sectionTitle) sectionTitle.textContent = t.shared_section_title;
            const cards = sharedSection.querySelectorAll('.rio-tour-card');
            (t.shared_tours || []).forEach((tour, index) => {
                applyTourCard(cards[index], tour.name, tour.details, t.reserve, null, lang);
            });
        }

        // Expedições Privativas
        const privateSection = document.getElementById('expedicoes-privativas');
        if (privateSection) {
            const sectionTitle = privateSection.querySelector('.rio-section-title');
            if (sectionTitle) sectionTitle.textContent = t.private_section_title;
            const cards = privateSection.querySelectorAll('.rio-tour-card');
            (t.private_tours || []).forEach((tour, index) => {
                applyTourCard(cards[index], tour.name, tour.details, t.reserve, tour.sub, lang);
            });
        }

        // Como realizar minha reserva
        const reservaSection = document.getElementById('reserva');
        if (reservaSection) {
            const sectionTitle = reservaSection.querySelector('.rio-section-title');
            if (sectionTitle) sectionTitle.textContent = t.reserva_section_title;
            const stepIcons = ['fa-whatsapp', 'fa-comments', 'fa-calendar-check', 'fa-money-check-dollar', 'fa-ticket'];
            reservaSection.querySelectorAll('.rio-tour-details li').forEach((item, index) => {
                const step = t.reserva_steps?.[index];
                if (step) item.innerHTML = `<i class="fa ${stepIcons[index] || 'fa-circle'}"></i> ${step}`;
            });
            const reserveBtn = reservaSection.querySelector('.rio-btn-reserve');
            if (reserveBtn && t.reserve) reserveBtn.textContent = t.reserve;
        }

        // Depoimentos
        const depoimentosSection = document.getElementById('depoimentos');
        if (depoimentosSection) {
            const sectionTitle = depoimentosSection.querySelector('.rio-section-title');
            if (sectionTitle) sectionTitle.textContent = t.depoimentos_title;
            const quotes = depoimentosSection.querySelectorAll('.rio-testimonial-quote');
            (t.testimonials || []).forEach((item, index) => {
                const quote = quotes[index];
                if (!quote) return;
                const textEl = quote.querySelector('.rio-testimonial-text');
                if (textEl) textEl.textContent = item.text;
                const authorEl = quote.querySelector('.rio-testimonial-author');
                if (authorEl) authorEl.textContent = item.author;
            });
            const likeLabel = t.relatos_like_label;
            if (likeLabel) {
                depoimentosSection.querySelectorAll('.rio-relatos-like').forEach((btn) => {
                    btn.setAttribute('aria-label', likeLabel);
                });
            }
        }

        const footerText = document.querySelector('.rio-footer-text');
        if (footerText) footerText.textContent = t.footer;
    };

    // Esconde seções dinâmicas (#expedicoes-compartilhadas, #expedicoes-privativas)
    // enquanto o grid delas não tiver nenhum card · evitam-se, assim, os espaços
    // em branco quando não há tours daquela modalidade cadastrados para a cidade.
    // Usa MutationObserver porque os cards chegam via fetch assíncrono ao banco
    // (site-shell.js), então a checagem precisa reagir ao momento em que entram.
    document.querySelectorAll('.rio-tours[id] .rio-tours-grid').forEach((grid) => {
        const section = grid.closest('.rio-tours');
        if (!section) return;
        const sync = () => section.classList.toggle('rio-tours-vazia', grid.childElementCount === 0);
        sync();
        new MutationObserver(sync).observe(grid, { childList: true });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('rio-card-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.rio-tour-card, .rio-relatos-item').forEach(card => {
        card.classList.add('rio-card-hidden');
        observer.observe(card);
    });

    document.addEventListener('app:language-changed', (event) => {
        applyPageLanguage(event.detail.lang);
    });

    const initialLang = typeof window.getCurrentLanguage === 'function'
        ? window.getCurrentLanguage()
        : (document.documentElement.lang || 'pt').slice(0, 2);
    applyPageLanguage(initialLang);

    function startTourSliders() {
        const folderImages = {
            'Lagoas de Santo Amaro': 1,
            'Circuito Completo Lencois': 1,
            'Manhã na Lagoa Azul': 4,
            'Entardecer na Lagoa Bonita': 4,
            'Um dia em Atins Beach': 4,
            'Expedição Santo Amaro': 5,
            'Quadriciclo Adventure': 3,
            'Duas Lagoas': 5,
            'Povoados do Maranhão': 5,
            'Delta das Américas': 5,
        };

        document.querySelectorAll('.rio-tour-slider').forEach((slider) => {
            const folder = slider.dataset.folder;
            // Imagens enviadas via admin (Gerenciamento) têm prioridade; sem elas,
            // cai no manifesto local de sempre (folderImages/img{N}.webp).
            const dbImages = window.tourImagesByFolder && window.tourImagesByFolder[folder];
            const fallbackCount = folderImages[folder];
            const imageUrls = (Array.isArray(dbImages) && dbImages.length)
                ? dbImages
                : (fallbackCount ? Array.from({ length: fallbackCount }, (_, i) => `/imagem/Lencois/${folder}/img${i + 1}.webp`) : null);
            if (!imageUrls) return;
            const total = imageUrls.length;

            slider.innerHTML = '';

            const track = document.createElement('div');
            track.className = 'rio-tour-slider-track';
            slider.appendChild(track);

            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'rio-tour-slider-dots';
            slider.appendChild(dotsContainer);

            for (let i = 1; i <= total; i++) {
                const img = document.createElement('img');
                img.className = 'rio-tour-slide';
                img.src = imageUrls[i - 1];
                img.alt = `${folder} - imagem ${i}`;
                img.loading = 'lazy';
                track.appendChild(img);

                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'rio-tour-dot' + (i === 1 ? ' active' : '');
                dot.setAttribute('aria-label', `Ver imagem ${i} de ${total}`);
                dot.addEventListener('click', () => {
                    changeSlide(i - 1);
                    resetInterval();
                });
                dotsContainer.appendChild(dot);
            }

            let current = 0;
            const dots = dotsContainer.querySelectorAll('.rio-tour-dot');
            let interval = null;

            function moveTrack(index) {
                track.style.transform = `translateX(-${index * 100}%)`;
            }

            function changeSlide(index) {
                if (index === current) return;
                dots[current].classList.remove('active');
                current = index;
                dots[current].classList.add('active');
                moveTrack(current);
            }

            function nextSlide() {
                const next = (current + 1) % total;
                changeSlide(next);
                scheduleNext();
            }

            function scheduleNext() {
                const delay = 6500 + Math.floor(Math.random() * 2000);
                if (interval) clearTimeout(interval);
                interval = setTimeout(nextSlide, delay);
            }

            function resetInterval() {
                if (interval) clearTimeout(interval);
                scheduleNext();
            }

            let touchStartX = null;
            let touchStartTime = null;

            slider.addEventListener('touchstart', (event) => {
                if (event.touches.length !== 1) return;
                touchStartX = event.touches[0].clientX;
                touchStartTime = Date.now();
            });

            slider.addEventListener('touchend', (event) => {
                if (touchStartX === null) return;
                const diffX = event.changedTouches[0].clientX - touchStartX;
                const elapsed = Date.now() - touchStartTime;
                touchStartX = null;
                touchStartTime = null;
                if (Math.abs(diffX) >= 40 && elapsed <= 700) {
                    const next = diffX > 0
                        ? (current - 1 + total) % total
                        : (current + 1) % total;
                    changeSlide(next);
                    resetInterval();
                }
            });

            slider.addEventListener('mousedown', (event) => {
                touchStartX = event.clientX;
                touchStartTime = Date.now();
            });

            slider.addEventListener('mouseup', (event) => {
                if (touchStartX === null) return;
                const diffX = event.clientX - touchStartX;
                const elapsed = Date.now() - touchStartTime;
                touchStartX = null;
                touchStartTime = null;
                if (Math.abs(diffX) >= 40 && elapsed <= 700) {
                    const next = diffX > 0
                        ? (current - 1 + total) % total
                        : (current + 1) % total;
                    changeSlide(next);
                    resetInterval();
                }
            });

            const initialDelay = 500 + Math.floor(Math.random() * 1200);
            interval = setTimeout(nextSlide, initialDelay);
        });
    }

    window.startTourSliders = startTourSliders;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startTourSliders);
    } else {
        startTourSliders();
    }
})();
// Guia de Viagem (rodape): clicar num card do carrossel expande no lugar
// dele, mostrando a resposta, e troca o titulo da secao pela pergunta.
// O X fecha e devolve o carrossel/titulo padrao. So roda se os elementos
// existirem (essa secao existe so na pagina em portugues dos Lencois).
(function () {
    function iniciarGuiaDeViagem() {
        const grid = document.getElementById('rioGuideGrid');
        const painel = document.getElementById('rioGuideAnswer');
        const textoResposta = document.getElementById('rioGuideAnswerText');
        const botaoFechar = document.getElementById('rioGuideAnswerClose');
        const titulo = document.getElementById('rioGuideTitle');
        const subtitulo = document.getElementById('rioGuideSubtitle');

        if (!grid || !painel || !textoResposta || !botaoFechar || !titulo) return;

        // Pergunta/resposta ficam guardadas como CHAVE de traducao no HTML
        // (data-question="guide_q1"), nao como texto fixo - assim funcionam
        // no idioma que a pessoa estiver usando no momento do clique, sem
        // precisar duplicar HTML por idioma (isso seria apagado de qualquer
        // forma: tools/gerar_paginas.py reconstroi as paginas de idioma a
        // partir desta pagina em portugues a cada execucao automatica).
        const idiomaAtual = () => (typeof window.getCurrentLang === 'function' ? window.getCurrentLang() : 'pt');
        const strings = () => window.uiTranslations?.[idiomaAtual()] || window.uiTranslations?.pt || {};
        const tituloPadraoAtual = () => strings().guide_title_default || titulo.textContent;

        // Telas pequenas escondem os icones de Instagram/WhatsApp/Email por
        // padrao (ver @media em Lencoismaranhenses.css) - so aparecem quando
        // a pessoa clica em CONTATO no menu, via essa classe.
        const iconesContato = document.querySelector('.footer-info-icons');

        function abrirResposta(pergunta, respostaHtml, mostrarIcones) {
            if (!pergunta || !respostaHtml) return;

            titulo.textContent = pergunta;
            if (subtitulo) subtitulo.hidden = true;
            textoResposta.innerHTML = respostaHtml;

            grid.hidden = true;
            painel.hidden = false;
            if (iconesContato) iconesContato.classList.toggle('is-contact-open', !!mostrarIcones);
            botaoFechar.focus();
        }

        function fecharResposta() {
            titulo.textContent = tituloPadraoAtual();
            if (subtitulo) subtitulo.hidden = false;
            painel.hidden = true;
            grid.hidden = false;
            if (iconesContato) iconesContato.classList.remove('is-contact-open');
        }

        // So os 4 cards reais tem data-question/data-answer; as copias da
        // esteira (aria-hidden, usadas so pra fechar o loop visual) nao tem
        // esses atributos e ficam de fora automaticamente.
        grid.querySelectorAll('.rio-guide-item[data-question]').forEach((item) => {
            item.addEventListener('click', (evento) => {
                evento.preventDefault();
                const dados = strings();
                const qKey = item.getAttribute('data-question');
                const aKey = item.getAttribute('data-answer');
                abrirResposta(dados[qKey], dados[aKey]);
            });
        });

        botaoFechar.addEventListener('click', fecharResposta);

        // Trocou de idioma com o painel fechado: so garante que, da proxima
        // vez que fechar, volte pro titulo padrao no idioma novo (o proprio
        // data-i18n do <h3> ja cuida do texto quando o painel esta fechado,
        // ver applyTranslations em site-shell.js). Com o painel ABERTO,
        // fecha para evitar mostrar o titulo/resposta trocados de idioma
        // pela metade.
        document.addEventListener('app:language-changed', () => {
            if (!painel.hidden) fecharResposta();
        });

        // SOBRE/CONTATO/AJUDA (menu do topo) usam o mesmo painel de resposta.
        // Só reage a clique de verdade no menu (nao ao carregamento da
        // pagina): a primeira versao usava um MutationObserver no
        // #rioFooterCardBody oculto, mas a pagina roda updateFooterInfo('informacoes')
        // sozinha ao carregar quando ha um texto configurado em Gerenciamento
        // > Textos SOBRE/CONTATO/AJUDA > Informacoes - isso abria o painel
        // (com o texto antigo "Clique em CONTATO...") assim que a pagina
        // abria, sem ninguem ter clicado em nada. Ouvindo so o clique, o
        // painel so aparece quando a pessoa realmente pede.
        const corpoLegado = document.getElementById('rioFooterCardBody');
        document.querySelectorAll('[data-footer-action]').forEach((link) => {
            const acao = link.getAttribute('data-footer-action');
            if (!['sobre', 'contato', 'ajuda'].includes(acao)) return;
            link.addEventListener('click', () => {
                // window.updateFooterInfo (site-shell.js), ja chamado pelo
                // listener proprio do menu, escreve o conteudo aqui; espera
                // um instante (mesmo ciclo de eventos) pra garantir que ja
                // rodou antes de a gente ler.
                setTimeout(() => {
                    if (!corpoLegado) return;
                    const conteudo = corpoLegado.innerHTML;
                    if (!conteudo || !conteudo.trim()) return;
                    const tituloAcao = strings()['footer_' + acao + '_title'] || strings()['nav_' + (acao === 'sobre' ? 'about' : acao === 'contato' ? 'contact' : 'help')] || acao;
                    abrirResposta(tituloAcao, conteudo, acao === 'contato');
                }, 0);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarGuiaDeViagem);
    } else {
        iniciarGuiaDeViagem();
    }
})();
