/* ===================================================== */
/* BUSCA DO SITE (barra "Pesquisar" da home)              */
/* ===================================================== */
/* Sugere cidades, passeios e as secoes SOBRE/CONTATO/AJUDA enquanto o
   usuario digita; ao escolher, leva ate o destino. Os passeios vem do
   "retrato dos tours" (.tours-snapshot-item h3) que cada pagina de cidade
   ja traz no HTML, entao a lista acompanha o que tools/snapshot_tours.py
   publica sem precisar manter nada aqui. */
(() => {
	const barra = document.querySelector(".search-bar");
	const input = barra && barra.querySelector("input");
	const botao = barra && barra.querySelector("button");
	if (!barra || !input) return;

	const TEXTOS = {
		pt: { cidade: "Cidade", passeio: "Passeio", pagina: "Página", vazio: "Nada encontrado" },
		en: { cidade: "City", passeio: "Tour", pagina: "Page", vazio: "No results" },
		es: { cidade: "Ciudad", passeio: "Paseo", pagina: "Página", vazio: "Sin resultados" },
		fr: { cidade: "Ville", passeio: "Excursion", pagina: "Page", vazio: "Aucun résultat" },
		it: { cidade: "Città", passeio: "Tour", pagina: "Pagina", vazio: "Nessun risultato" },
		zh: { cidade: "城市", passeio: "行程", pagina: "页面", vazio: "未找到结果" }
	};

	// Palavras extras para achar a cidade por pontos conhecidos dela.
	const CIDADES = [
		{ slug: "rio-de-janeiro", nome: "Rio de Janeiro", extras: "rio carioca cristo redentor copacabana ipanema lapa santa teresa pao de acucar" },
		{ slug: "salvador", nome: "Salvador", extras: "bahia pelourinho pelorinho elevador lacerda" },
		{ slug: "sao-luis", nome: "São Luís do Maranhão", extras: "sao luis maranhao azulejos centro historico" },
		{ slug: "lencois-maranhenses", nome: "Lençóis Maranhenses", extras: "lencois barreirinhas dunas lagoa azul bonita atins santo amaro cabure trekking" }
	];

	const lang = () => {
		const l = typeof window.getCurrentLanguage === "function" ? window.getCurrentLanguage() : "pt";
		return TEXTOS[l] ? l : "pt";
	};

	const normalizar = (s) => String(s || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/\s+/g, " ")
		.trim();

	const urlCidade = (slug) => "/" + slug + "/" + (lang() === "pt" ? "" : lang() + "/");

	// Nome da cidade no idioma atual: o card da home ja vem traduzido.
	const nomeCidade = (cidade) => {
		const card = document.querySelector('.city-card[href^="/' + cidade.slug + '/"] .city-name');
		return (card && card.textContent.trim()) || cidade.nome;
	};

	const passeios = [];
	const carregarPasseios = () => Promise.all(CIDADES.map((cidade) =>
		fetch("/" + cidade.slug + "/")
			.then((r) => (r.ok ? r.text() : ""))
			.then((html) => {
				const doc = new DOMParser().parseFromString(html, "text/html");
				doc.querySelectorAll(".tours-snapshot-item h3").forEach((h3) => {
					const titulo = h3.textContent.replace(/\s+/g, " ").trim();
					if (titulo) passeios.push({ titulo, cidade });
				});
			})
			.catch(() => {})
	));
	let carregando = null;

	const montarIndice = () => {
		const t = TEXTOS[lang()];
		const itens = [];

		CIDADES.forEach((cidade) => {
			const nome = nomeCidade(cidade);
			itens.push({
				tipo: t.cidade,
				titulo: nome,
				chave: normalizar(nome + " " + cidade.nome + " " + cidade.extras),
				ir: () => window.location.assign(urlCidade(cidade.slug))
			});
		});

		passeios.forEach((p) => {
			itens.push({
				tipo: t.passeio + " · " + nomeCidade(p.cidade),
				titulo: p.titulo,
				chave: normalizar(p.titulo + " " + p.cidade.nome),
				ir: () => window.location.assign(urlCidade(p.cidade.slug) + "#tours")
			});
		});

		document.querySelectorAll('nav a[href="#sobre"], nav a[href="#contato"], nav a[href="#ajuda"]').forEach((link) => {
			const secao = link.getAttribute("href").slice(1);
			const titulo = link.textContent.trim();
			itens.push({
				tipo: t.pagina,
				titulo: titulo.charAt(0) + titulo.slice(1).toLowerCase(),
				chave: normalizar(titulo + " " + secao),
				ir: () => link.click()
			});
		});

		return itens;
	};

	const buscar = (termo) => {
		const q = normalizar(termo);
		if (!q) return [];
		const palavras = q.split(" ");
		return montarIndice()
			.filter((item) => palavras.every((p) => item.chave.includes(p)))
			.sort((a, b) => {
				const ta = normalizar(a.titulo).startsWith(q) ? 0 : 1;
				const tb = normalizar(b.titulo).startsWith(q) ? 0 : 1;
				return ta - tb;
			})
			.slice(0, 8);
	};

	const lista = document.createElement("ul");
	lista.className = "search-results";
	lista.setAttribute("role", "listbox");
	lista.hidden = true;
	barra.appendChild(lista);
	input.setAttribute("autocomplete", "off");

	let resultados = [];
	let ativo = -1;

	const fechar = () => {
		lista.hidden = true;
		ativo = -1;
	};

	const escolher = (item) => {
		if (!item) return;
		fechar();
		input.value = "";
		input.blur();
		item.ir();
	};

	const marcarAtivo = () => {
		[...lista.children].forEach((li, i) => li.classList.toggle("is-active", i === ativo));
	};

	const renderizar = () => {
		resultados = buscar(input.value);
		ativo = -1;
		lista.innerHTML = "";

		if (!normalizar(input.value)) {
			fechar();
			return;
		}

		if (!resultados.length) {
			const li = document.createElement("li");
			li.className = "search-results-empty";
			li.textContent = TEXTOS[lang()].vazio;
			lista.appendChild(li);
		}

		resultados.forEach((item, i) => {
			const li = document.createElement("li");
			li.setAttribute("role", "option");
			const titulo = document.createElement("span");
			titulo.className = "search-results-title";
			titulo.textContent = item.titulo;
			const tipo = document.createElement("span");
			tipo.className = "search-results-type";
			tipo.textContent = item.tipo;
			li.append(titulo, tipo);
			// mousedown (e nao click) para escolher antes do blur do input fechar a lista.
			li.addEventListener("mousedown", (e) => {
				e.preventDefault();
				escolher(item);
			});
			li.addEventListener("mouseenter", () => {
				ativo = i;
				marcarAtivo();
			});
			lista.appendChild(li);
		});

		lista.hidden = false;
	};

	// Os passeios so sao buscados na primeira interacao com a barra (foco ou
	// digitacao), para nao pesar o carregamento da home. Quando chegam, a
	// lista e refeita com o que ja estiver digitado.
	const garantirPasseios = () => {
		if (carregando) return;
		carregando = carregarPasseios().then(() => {
			if (normalizar(input.value)) renderizar();
		});
	};

	input.addEventListener("focus", () => {
		garantirPasseios();
		if (input.value) renderizar();
	});

	input.addEventListener("input", () => {
		garantirPasseios();
		renderizar();
	});
	input.addEventListener("blur", () => setTimeout(fechar, 100));

	input.addEventListener("keydown", (e) => {
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			if (!resultados.length) return;
			e.preventDefault();
			const passo = e.key === "ArrowDown" ? 1 : -1;
			ativo = (ativo + passo + resultados.length) % resultados.length;
			marcarAtivo();
		} else if (e.key === "Enter") {
			e.preventDefault();
			escolher(resultados[ativo >= 0 ? ativo : 0]);
		} else if (e.key === "Escape") {
			fechar();
		}
	});

	if (botao) {
		botao.addEventListener("click", () => {
			if (resultados.length) escolher(resultados[ativo >= 0 ? ativo : 0]);
			else input.focus();
		});
	}
})();
