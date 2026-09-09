# -*- coding: utf-8 -*-
"""
Retrato dos tours para o rastreador de busca.

POR QUE ISTO EXISTE
-------------------
Os tours entram na pagina por JavaScript, a partir da API. O rastreador le o
HTML puro, e nele a grade de tours e um comentario vazio — entao o nome, o
roteiro e as 117 fotos dos tours simplesmente nao existem para a Busca. Nem
para a Busca de Imagens: uma foto so e indexavel se estiver no HTML entregue.

O Google ate roda JavaScript, mas numa segunda passada que pode demorar semanas
ou nunca acontecer. Depender dela e apostar, nao publicar.

Este script busca os tours na API e grava o HTML equivalente em
tools/tours_snapshot.json, um bloco por cidade e por idioma. Quem insere esse
bloco nas paginas e o tools/gerar_paginas.py, que ja e o unico lugar que monta
pagina — assim o retrato entra nas seis versoes de idioma, cada uma na lingua
certa, usando as traducoes que a propria API devolve.

O bloco fica visivel no HTML de proposito: conteudo escondido por CSS o Google
despreza. Quem tira ele da tela e o JavaScript, no primeiro instante, antes de
montar os cards de verdade (ver o trecho data-snapshot em site-shell.js e
Riodejaneiro.js). Visitante nenhum chega a ver.

COMO USAR
---------
    python tools/snapshot_tours.py      # atualiza tools/tours_snapshot.json
    python tools/gerar_paginas.py       # leva o retrato para as paginas

Na pratica ninguem roda a mao: a rotina .github/workflows/snapshot-tours.yml
faz as duas coisas sozinha algumas vezes por dia.
"""

import io
import json
import os
import sys
from urllib.request import urlopen, Request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.environ.get('TOUR_API_URL', 'https://api-tour.exksvol.com/get_tours_pagina')
SAIDA = os.path.join(RAIZ, 'tools', 'tours_snapshot.json')

# Chave da cidade no banco -> pasta da cidade no site.
SLUG_POR_CIDADE = {
    'Rio de Janeiro': 'rio-de-janeiro',
    'Salvador': 'salvador',
    'Sao Luis': 'sao-luis',
    'Lencois': 'lencois-maranhenses',
}

IDIOMAS = ['pt', 'en', 'es', 'fr', 'it', 'zh']

# Rotulo da secao em cada idioma. Sao tres palavras; nao vale chamar a API de
# traducao so por isso.
TITULO_SECAO = {
    'pt': 'Nossas experiências',
    'en': 'Our experiences',
    'es': 'Nuestras experiencias',
    'fr': 'Nos expériences',
    'it': 'Le nostre esperienze',
    'zh': '我们的体验',
}


def escapar(texto):
    return (str(texto or '').replace('&', '&amp;').replace('<', '&lt;')
            .replace('>', '&gt;').replace('"', '&quot;'))


def buscar_tours():
    req = Request(API, headers={'User-Agent': 'tourbyfoot-snapshot/1'})
    with urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode('utf-8'))


def campo(tour, idioma, nome):
    """Valor de um campo no idioma pedido. A API guarda a traducao pronta em
    tour['traducoes'][idioma]; quando falta, cai no portugues, que e sempre
    melhor do que um espaco em branco."""
    if idioma != 'pt':
        traduzido = (tour.get('traducoes') or {}).get(idioma, {}).get(nome)
        if traduzido:
            return traduzido
    return tour.get(nome) or ''


def bloco_do_tour(tour, idioma):
    """Um tour em HTML: nome, roteiro, dados praticos e todas as fotos."""
    nome = tour.get('nome_tour') or ''
    if not nome:
        return ''

    linhas = ['      <article class="tours-snapshot-item">',
              '        <h3>%s</h3>' % escapar(nome)]

    roteiro = campo(tour, idioma, 'roteiro')
    if roteiro:
        # O roteiro vem com quebras de linha do formulario do admin; cada
        # paragrafo vira um <p> para o texto nao chegar grudado ao rastreador.
        for paragrafo in [p.strip() for p in roteiro.split('\n') if p.strip()]:
            linhas.append('        <p>%s</p>' % escapar(paragrafo))

    detalhes = [campo(tour, idioma, c) for c in
                ('duracao', 'grupo', 'dias_semana', 'horarios', 'idiomas')]
    detalhes = [d for d in detalhes if d]
    if detalhes:
        linhas.append('        <p>%s</p>' % escapar(' · '.join(detalhes)))

    # As fotos sao o motivo principal deste arquivo existir. Ficam com o nome
    # do tour no alt: e o texto que a Busca de Imagens usa para entender a foto.
    imagens = tour.get('imagens') or []
    for i, url in enumerate(imagens, 1):
        alt = nome if len(imagens) == 1 else '%s (%d)' % (nome, i)
        linhas.append('        <img src="%s" alt="%s" loading="lazy">'
                      % (escapar(url), escapar(alt)))

    linhas.append('      </article>')
    return '\n'.join(linhas)


def bloco_da_cidade(tours, idioma):
    partes = [b for b in (bloco_do_tour(t, idioma) for t in tours) if b]
    if not partes:
        return ''
    return '\n'.join([
        '    <div class="tours-snapshot" data-snapshot>',
        '      <h2>%s</h2>' % escapar(TITULO_SECAO.get(idioma, TITULO_SECAO['pt'])),
        '\n'.join(partes),
        '    </div>',
        # O bloco fica no fim do <body>, antes dos <script> da pagina: sem isto
        # ele chegaria a pintar por um instante antes de o JS montar os cards.
        # Este script roda durante a leitura do HTML, entao o visitante nunca ve
        # — e o rastreador, que le o HTML sem executar JavaScript, ve tudo. Quem
        # apaga de vez, ou traz de volta se a API falhar, e o site-shell.js.
        '    <script>(function(){var e=document.currentScript.previousElementSibling;'
        'if(e&&e.hasAttribute("data-snapshot"))e.style.display="none";})();</script>',
    ])


def main():
    try:
        tours = buscar_tours()
    except Exception as e:
        # Falhar aqui nao pode derrubar a publicacao: sem resposta da API o
        # retrato anterior continua valendo, que e melhor do que pagina sem
        # tour nenhum.
        sys.stderr.write('erro ao buscar os tours: %s\n' % e)
        return 1

    ativos = [t for t in tours if (t.get('estado') or '').lower() == 'ativo']
    ativos.sort(key=lambda t: (t.get('ordem') if t.get('ordem') is not None else 999,
                               t.get('id') or 0))

    dados, fotos = {}, 0
    for cidade, slug in SLUG_POR_CIDADE.items():
        da_cidade = [t for t in ativos if t.get('cidade') == cidade]
        if not da_cidade:
            continue
        fotos += sum(len(t.get('imagens') or []) for t in da_cidade)
        dados[slug] = {idioma: bloco_da_cidade(da_cidade, idioma) for idioma in IDIOMAS}

    with io.open(SAIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(dados, ensure_ascii=False, indent=1, sort_keys=True) + '\n')

    print('%d tours ativos, %d fotos, %d cidades' % (len(ativos), fotos, len(dados)))
    for slug in sorted(dados):
        print('  %s' % slug)
    return 0


if __name__ == '__main__':
    sys.exit(main())
