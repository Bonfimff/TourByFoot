# -*- coding: utf-8 -*-
"""
Motor de geracao das paginas por idioma e das pontes de redirecionamento.

POR QUE ISTO EXISTE
-------------------
O hreflang do Google e um mapa de URLs: so da para dizer "esta pagina existe em
ingles" apontando para OUTRA URL. Uma URL unica com troca de idioma por
JavaScript e, para o Google, um site em portugues · os outros cinco idiomas nao
existem. Entao cada idioma precisa de um endereco proprio.

Isso daria 4 cidades x 6 idiomas = 24 arquivos HTML quase identicos. Manter isso
a mao e inviavel: qualquer ajuste no <head> viraria 24 edicoes. Este script
resolve o problema transformando manutencao em um comando.

COMO USAR
---------
    python tools/gerar_paginas.py

A fonte da verdade e SEMPRE a pagina em portugues: <cidade>/index.html.
Edite so ela. Depois rode este script: ele reescreve as versoes em outros
idiomas e as pontes. As paginas geradas NAO devem ser editadas a mao · qualquer
alteracao nelas se perde na proxima execucao.

Os textos de SEO (title e description de cada idioma) ficam em
tools/seo_idiomas.json. Editar la, nao aqui.

Opcoes:
    --idiomas pt,en,es    gera so esses idiomas (padrao: todos do JSON)
    --conferir            nao escreve nada, so mostra o que mudaria
"""

import argparse
import io
import json
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMINIO = 'https://www.tourbyfoot.com'
ARQ_TEXTOS = os.path.join(RAIZ, 'tools', 'seo_idiomas.json')
ARQ_TOURS = os.path.join(RAIZ, 'tools', 'tours_snapshot.json')

# Delimitadores do retrato dos tours dentro da pagina. O conteudo entre eles e
# reescrito a cada execucao (ver tools/snapshot_tours.py).
TOUR_INICIO = '<!-- inicio do retrato de tours -->'
TOUR_FIM = '<!-- fim do retrato de tours -->'

# Host que serve as fotos dos tours. E outro dominio · o site publico esta no
# GitHub Pages e as fotos no VPS ·, entao precisa ser reconhecido explicitamente
# para as fotos entrarem no sitemap de imagens em vez de serem descartadas como
# imagem de terceiro.
HOST_FOTOS = 'https://api-tour.exksvol.com/'

# Marcadores que delimitam o que este script controla dentro do HTML. Tudo entre
# eles e reescrito a cada execucao · por isso o script pode rodar quantas vezes
# quiser sem duplicar blocos.
INICIO = '<!-- gerado por tools/gerar_paginas.py · nao editar a mao -->'
FIM = '<!-- fim do bloco gerado -->'

# URLs do site antigo que o Google indexou ha mais de dez anos e que hoje
# retornam 404. Cada uma vira uma ponte para o endereco equivalente de hoje.
# As confirmadas na busca estao marcadas; as demais sao aliases plausiveis,
# baratos de manter e sem custo se ninguem acessar.
PONTES_LEGADAS = [
    ('riodejaneiro',      'rio-de-janeiro',      'confirmada na busca'),
    ('saoluis',           'sao-luis',            'alias plausivel'),
    ('lencois',           'lencois-maranhenses', 'alias plausivel'),
]

# Paginas do endereco anterior a esta migracao. Continuam existindo como ponte
# para nao quebrar link ja compartilhado em WhatsApp, e-mail ou material impresso.
PONTES_ANTIGAS = [
    ('html/Riodejaneiro.html',        '/rio-de-janeiro/'),
    ('html/Salvador.html',            '/salvador/'),
    ('html/Saoluísdomaranhao.html',   '/sao-luis/'),
    ('html/Lencoismaranhenses.html',  '/lencois-maranhenses/'),
]


def ler(caminho):
    with io.open(caminho, encoding='utf-8', newline='') as f:
        return f.read()


def escrever(caminho, texto, conferir=False):
    """Escreve so se o conteudo mudou. Devolve True quando houve mudanca."""
    if os.path.isfile(caminho) and ler(caminho) == texto:
        return False
    if conferir:
        return True
    pasta = os.path.dirname(caminho)
    if pasta and not os.path.isdir(pasta):
        os.makedirs(pasta)
    with io.open(caminho, 'w', encoding='utf-8', newline='') as f:
        f.write(texto)
    return True


def escapar(texto):
    return (texto.replace('&', '&amp;').replace('"', '&quot;')
            .replace('<', '&lt;').replace('>', '&gt;'))


def base_da(slug):
    """Caminho da versao em portugues. A home fica na raiz, entao o slug dela e
    a string vazia e a base e so a barra."""
    return '/' if slug == '' else '/%s/' % slug


def url_da(slug, idioma):
    base = base_da(slug)
    return DOMINIO + base if idioma == 'pt' else '%s%s%s/' % (DOMINIO, base, idioma)


# Um caminho e relativo quando nao comeca com esquema (http:, mailto:), com
# barra ou com ancora. So esses precisam ganhar um nivel quando a pagina desce
# para /<idioma>/.
NAO_RELATIVO = re.compile(r'^(?:[a-z][a-z0-9+.\-]*:|//|/|#|$)', re.I)


def descer_um_nivel(html):
    """A versao de idioma mora um nivel abaixo da versao em portugues: a home
    vai de / para /en/, e a pagina de cidade de /salvador/ para /salvador/en/.
    Em ambos os casos todo caminho relativo precisa subir um nivel a mais."""
    def troca(m):
        espaco, atributo, valor = m.group(1), m.group(2), m.group(3)
        if NAO_RELATIVO.match(valor):
            return m.group(0)
        return '%s%s="../%s"' % (espaco, atributo, valor)
    return re.sub(r'(\s)(href|src)="([^"]*)"', troca, html)


def trocar_atributo(html, padrao, valor):
    """Troca o conteudo de um atributo de meta/link, uma ocorrencia por vez."""
    return re.sub(padrao, lambda m: m.group(1) + escapar(valor) + m.group(2), html, count=1)


def bloco_gerado(slug, idioma, idiomas):
    """hreflang + a rota de idioma que o JS le para navegar entre versoes."""
    linhas = [INICIO]
    linhas.append('    <link rel="canonical" href="%s">' % url_da(slug, idioma))

    # hreflang precisa ser reciproco: TODAS as versoes listam TODAS as versoes,
    # inclusive a propria. Se uma versao deixar de citar outra, o Google
    # descarta o conjunto inteiro em vez de usar so a parte valida.
    for outro in idiomas:
        codigo = 'pt-BR' if outro == 'pt' else outro
        linhas.append('    <link rel="alternate" hreflang="%s" href="%s">' % (codigo, url_da(slug, outro)))
    linhas.append('    <link rel="alternate" hreflang="x-default" href="%s">' % url_da(slug, 'pt'))

    linhas.append('    <script>')
    linhas.append('    // A URL manda no idioma. Quem abrir %sen/ ve ingles, mesmo com' % base_da(slug))
    linhas.append('    // outro idioma salvo no navegador · senao a pagina mostraria um idioma')
    linhas.append('    // enquanto a URL e o hreflang prometem outro, e o Google indexaria o')
    linhas.append('    // conteudo errado. O seletor de idioma le rotaIdioma para NAVEGAR ate a')
    linhas.append('    // versao escolhida em vez de so recarregar (ver selectLanguage no JS).')
    linhas.append('    window.rotaIdioma = { base: %s, atual: %s, idiomas: %s };'
                  % (json.dumps(base_da(slug)), json.dumps(idioma), json.dumps(idiomas)))
    linhas.append('    try { localStorage.setItem("preferredLanguage", %s); } catch (e) {}' % json.dumps(idioma))
    if not (slug == '' and idioma == 'pt'):
        # Idioma que o visitante escolheu (pelo seletor ou entrando por esta
        # URL). A home em portugues le esta chave para levar de volta a versao
        # certa quando algum link aponta para "/". A propria home em portugues
        # nao grava: ela e o x-default, nao uma escolha de idioma.
        linhas.append('    try { localStorage.setItem("%s", %s); } catch (e) {}' % (CHAVE_ESCOLHA, json.dumps(idioma)))
    linhas.append('    </script>')
    linhas.append('    ' + FIM)
    return '\n'.join(linhas)


# Chave do idioma escolhido de proposito. E separada de preferredLanguage porque
# esta ultima e gravada por toda visita a home em portugues · nao da para
# distinguir "escolheu portugues" de "so passou pela raiz".
CHAVE_ESCOLHA = 'idiomaSite'


def bloco_deteccao(idiomas):
    """So na home em portugues (a raiz, x-default): leva o visitante para a
    versao no idioma dele. Primeiro vale a escolha ja feita no site; sem ela,
    o idioma do navegador. Fica no topo do <head>, antes da checagem de
    manutencao, para o salto acontecer antes de qualquer outra requisicao.
    Rastreadores nao sao redirecionados: o Googlebot se apresenta em ingles e,
    se fosse levado para /en/, a versao em portugues sumiria do indice."""
    return '\n'.join([
        INICIO,
        '    <script>',
        '    (function () {',
        '        if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|twitterbot|linkedinbot|embedly|pinterest|applebot|petalbot|yandex|baiduspider|duckduckbot|lighthouse/i.test(navigator.userAgent || "")) return;',
        '        var suportados = %s;' % json.dumps(idiomas),
        '        var alvo = null;',
        '        try { alvo = localStorage.getItem("%s"); } catch (e) {}' % CHAVE_ESCOLHA,
        '        if (suportados.indexOf(alvo) === -1) {',
        '            alvo = null;',
        '            var lista = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ""];',
        '            for (var i = 0; i < lista.length && !alvo; i++) {',
        '                var codigo = String(lista[i]).toLowerCase().split("-")[0];',
        '                if (suportados.indexOf(codigo) !== -1) alvo = codigo;',
        '            }',
        '        }',
        '        if (alvo && alvo !== "pt") {',
        '            window.location.replace("/" + alvo + "/" + window.location.search + window.location.hash);',
        '        }',
        '    })();',
        '    </script>',
        '    ' + FIM,
    ])


def inserir_retrato(html, slug, idioma, retratos):
    """Poe o retrato dos tours entre os marcadores. Sem retrato para a cidade,
    deixa o espaco vazio: pagina sem tour e melhor que pagina com tour errado."""
    if TOUR_INICIO not in html or TOUR_FIM not in html:
        return html
    bloco = (retratos.get(slug) or {}).get(idioma, '')
    i = html.index(TOUR_INICIO) + len(TOUR_INICIO)
    j = html.index(TOUR_FIM)
    NL = chr(10)
    miolo = (NL + bloco + NL + '            ') if bloco else (NL + '            ')
    return html[:i] + miolo + html[j:]


def limpar_bloco(html):
    """Remove um bloco gerado anterior, para o script poder rodar de novo."""
    return re.sub(re.escape(INICIO) + r'.*?' + re.escape(FIM) + r'\n?', '', html, flags=re.S)


def traduzir_alts(html, idioma, alts):
    """Texto alternativo das imagens no idioma da pagina. E o que a Busca de
    Imagens usa para entender a foto, entao deixa-lo em portugues nas outras
    cinco versoes joga fora a chance de aparecer em pesquisa por imagem em
    ingles, espanhol e nos demais. Nomes proprios (marcas) ficam como estao."""
    for original, versoes in alts.items():
        traduzido = versoes.get(idioma)
        if traduzido:
            html = html.replace('alt="%s"' % escapar(original),
                                'alt="%s"' % escapar(traduzido))
    return html


def montar_pagina(html_pt, slug, idioma, idiomas, textos, locales, langs_html, alts, retratos):
    """Deriva a pagina de um idioma a partir da pagina em portugues."""
    html = limpar_bloco(html_pt)
    seo = textos[slug][idioma]
    titulo, descricao = seo['title'], seo['description']

    # 1. Idioma declarado no elemento raiz.
    html = re.sub(r'(<html\s+lang=")[^"]*(")',
                  lambda m: m.group(1) + langs_html[idioma] + m.group(2), html, count=1)

    # 2. Title, description e cartoes sociais no idioma da pagina. Precisam
    #    estar no HTML entregue, nao aplicados por JS depois: o Google usa o
    #    HTML bruto na primeira passada, e a passada de renderizacao pode
    #    demorar semanas ou nao acontecer.
    html = re.sub(r'(<title>).*?(</title>)',
                  lambda m: m.group(1) + escapar(titulo) + m.group(2), html, count=1, flags=re.S)
    html = trocar_atributo(html, r'(<meta name="description" content=")[^"]*(")', descricao)
    html = trocar_atributo(html, r'(<meta property="og:title" content=")[^"]*(")', titulo)
    html = trocar_atributo(html, r'(<meta property="og:description" content=")[^"]*(")', descricao)
    html = trocar_atributo(html, r'(<meta property="og:locale" content=")[^"]*(")', locales[idioma])
    html = trocar_atributo(html, r'(<meta property="og:url" content=")[^"]*(")', url_da(slug, idioma))
    html = trocar_atributo(html, r'(<meta name="twitter:title" content=")[^"]*(")', titulo)
    html = trocar_atributo(html, r'(<meta name="twitter:description" content=")[^"]*(")', descricao)

    # 3. O canonical antigo sai: o bloco gerado traz o autorreferente.
    html = re.sub(r'\s*<link rel="canonical" href="[^"]*">', '', html, count=1)

    # 4. Profundidade: a versao de idioma esta um nivel mais fundo que a fonte,
    #    entao todo caminho relativo ganha um ../. Caminhos absolutos
    #    (/imagem/...), ancoras e URLs completas nao sao tocados.
    if idioma != 'pt':
        html = descer_um_nivel(html)
        html = traduzir_alts(html, idioma, alts)

        # 4b. Links entre cidades permanecem no idioma que o visitante escolheu:
        #     de /salvador/en/ o rodape leva a /rio-de-janeiro/en/, nao a versao
        #     em portugues. Alem da experiencia, isso mantem o rastreador dentro
        #     do mesmo conjunto de idioma ao seguir os links internos.
        for outro_slug in textos:
            if outro_slug == '' or outro_slug.startswith('_'):
                continue
            html = html.replace('href="/%s/"' % outro_slug, 'href="/%s/%s/"' % (outro_slug, idioma))
        # O "INICIO" do menu das cidades tambem: de /salvador/en/ volta para
        # /en/, nao para a home em portugues.
        html = html.replace('href="/"', 'href="/%s/"' % idioma)

    # 5. Retrato dos tours, no idioma da pagina. Entra depois da correcao de
    #    profundidade de proposito: as fotos vem por URL absoluta do outro
    #    servidor e nao podem ganhar '../'.
    html = inserir_retrato(html, slug, idioma, retratos)

    # 6. Bloco gerado antes do fechamento do <head>.
    html = html.replace('</head>', bloco_gerado(slug, idioma, idiomas) + '\n</head>', 1)

    # 7. Deteccao do idioma do visitante, so na raiz. Logo apos o viewport,
    #    antes da checagem de manutencao (ver bloco_deteccao).
    if slug == '' and idioma == 'pt':
        html = re.sub(r'(<meta name="viewport"[^>]*>\r?\n)',
                      lambda m: m.group(1) + bloco_deteccao(idiomas) + '\n', html, count=1)
    return html


def pagina_ponte(destino, titulo):
    """Ponte de redirecionamento. O GitHub Pages nao emite 301 de servidor, entao
    o redirecionamento e feito por canonical + meta refresh + JavaScript. O
    Google trata como redirecionamento e transfere sinais; e mais fraco que um
    301 real, mas e o que este hospedeiro permite.

    O salto por JavaScript vem antes do meta refresh e carrega junto a query
    string e a ancora, para que /html/Salvador.html?tour=5 continue abrindo o
    tour 5. O meta refresh so existe como rede de seguranca para quem esta sem
    JavaScript, por isso o atraso de 1 segundo: se fosse 0 ele poderia disparar
    antes do script e a query se perderia."""
    return """<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{titulo}</title>
<link rel="canonical" href="{dominio}{destino}">
<script>window.location.replace("{destino}" + window.location.search + window.location.hash);</script>
<meta http-equiv="refresh" content="1; url={destino}">
<meta name="robots" content="noindex, follow">
<style>
  body {{ margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font-family:'Segoe UI',system-ui,sans-serif; background:#0d5548; color:#fff; text-align:center; padding:2rem; }}
  a {{ color:#e9dfc7; }}
</style>
</head>
<body>
<p>Esta página mudou de endereço.<br><a href="{destino}">Ir para a nova página</a></p>
</body>
</html>
""".format(titulo=escapar(titulo), destino=destino, dominio=DOMINIO)


def imagens_da_pagina(html_pt, slug):
    """URLs absolutas das imagens da pagina, com o texto alternativo em
    portugues. So entram as imagens locais que tem alt: sem alt e decorativa
    (logo, icone), e nao ha o que a Busca de Imagens indexe."""
    import posixpath
    from urllib.parse import quote
    pasta = base_da(slug)
    achadas = []
    for tag in re.findall(r'<img\s[^>]*>', html_pt):
        m_src = re.search(r'src="([^"]*)"', tag)
        m_alt = re.search(r'alt="([^"]*)"', tag)
        if not m_src or not m_alt or not m_alt.group(1).strip():
            continue
        src = m_src.group(1)
        if src.startswith(HOST_FOTOS):
            # Foto de tour: ja e URL absoluta e completa, entra como esta.
            achadas.append((src, m_alt.group(1)))
            continue
        if NAO_RELATIVO.match(src) and not src.startswith('/'):
            continue  # imagem de outro dominio: nao e nossa para declarar
        caminho = src if src.startswith('/') else posixpath.normpath(pasta + src)
        # A pasta das imagens tem espaco no nome ("Rio de Janeiro"); o sitemap
        # exige URL valida, entao o espaco precisa ir codificado.
        achadas.append((quote(caminho.split('?')[0]), m_alt.group(1)))
    return achadas


def montar_sitemap(slugs, idiomas, imagens_por_slug, alts):
    """Sitemap com os alternates de idioma declarados, que e como o Google
    prefere receber hreflang quando ha muitas versoes."""
    from datetime import date
    hoje = date.today().isoformat()
    linhas = ['<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
              '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
              '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">']
    for slug in slugs:
        for idioma in idiomas:
            linhas.append('  <url>')
            linhas.append('    <loc>%s</loc>' % url_da(slug, idioma))
            for outro in idiomas:
                codigo = 'pt-BR' if outro == 'pt' else outro
                linhas.append('    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (codigo, url_da(slug, outro)))
            linhas.append('    <xhtml:link rel="alternate" hreflang="x-default" href="%s"/>' % url_da(slug, 'pt'))
            linhas.append('    <lastmod>%s</lastmod>' % hoje)
            linhas.append('    <changefreq>weekly</changefreq>')
            if slug == '':
                prioridade = '1.0' if idioma == 'pt' else '0.8'
            else:
                prioridade = '0.9' if idioma == 'pt' else '0.7'
            linhas.append('    <priority>%s</priority>' % prioridade)
            for caminho, alt in imagens_por_slug.get(slug, []):
                if idioma != 'pt':
                    alt = alts.get(alt, {}).get(idioma, alt)
                linhas.append('    <image:image>')
                completa = caminho if caminho.startswith('http') else DOMINIO + caminho
                linhas.append('      <image:loc>%s</image:loc>' % completa)
                linhas.append('      <image:title>%s</image:title>' % escapar(alt))
                linhas.append('    </image:image>')
            linhas.append('  </url>')
    linhas.append('</urlset>')
    return '\n'.join(linhas) + '\n'


def main():
    ap = argparse.ArgumentParser(description='Gera as paginas por idioma e as pontes.')
    ap.add_argument('--idiomas', default='', help='lista separada por virgula (padrao: todos)')
    ap.add_argument('--conferir', action='store_true', help='nao escreve, so mostra o que mudaria')
    args = ap.parse_args()

    os.chdir(RAIZ)
    dados = json.loads(ler(ARQ_TEXTOS))
    locales = dados['_locales']
    langs_html = dados['_lang_html']
    alts = dados.get('_alts', {})
    # O retrato pode nao existir ainda (primeira execucao, ou API fora do ar na
    # hora de gerar): a pagina sai sem ele em vez de a geracao falhar.
    retratos = json.loads(ler(ARQ_TOURS)) if os.path.isfile(ARQ_TOURS) else {}
    slugs = [k for k in dados if not k.startswith('_')]

    idiomas = [i.strip() for i in args.idiomas.split(',') if i.strip()] or list(locales.keys())
    if 'pt' not in idiomas:
        sys.exit('erro: o portugues e a fonte da traducao e precisa estar na lista')
    faltando = [(s, i) for s in slugs for i in idiomas if i not in dados[s]]
    if faltando:
        sys.exit('erro: sem texto de SEO para %s' % ', '.join('%s/%s' % f for f in faltando))

    escritos, inalterados = [], 0
    imagens_por_slug = {}

    for slug in slugs:
        fonte = os.path.join(slug, 'index.html')
        if not os.path.isfile(fonte):
            sys.exit('erro: pagina de origem nao encontrada: %s' % fonte)
        html_pt = ler(fonte)
        # As fotos sao lidas da pagina JA com o retrato dos tours dentro: e ele
        # que traz as fotos vindas da API, que sao a maior parte delas. Ler o
        # arquivo cru deixaria o sitemap so com as imagens fixas.
        imagens_por_slug[slug] = imagens_da_pagina(
            inserir_retrato(html_pt, slug, 'pt', retratos), slug)

        for idioma in idiomas:
            destino = fonte if idioma == 'pt' else os.path.join(slug, idioma, 'index.html')
            saida = montar_pagina(html_pt, slug, idioma, idiomas, dados, locales, langs_html, alts, retratos)
            if escrever(destino, saida, args.conferir):
                escritos.append(destino)
            else:
                inalterados += 1

        # A URL /<cidade>/pt/ tambem existia no site antigo; aponta para a raiz
        # da cidade, que e a versao em portugues.
        p = os.path.join(slug, 'pt', 'index.html')
        if escrever(p, pagina_ponte(base_da(slug), 'Redirecionando'), args.conferir):
            escritos.append(p)
        else:
            inalterados += 1

    for antigo, novo, _nota in PONTES_LEGADAS:
        p = os.path.join(antigo, 'index.html')
        if escrever(p, pagina_ponte(novo if novo.startswith('/') else '/%s/' % novo, 'Redirecionando'), args.conferir):
            escritos.append(p)
        else:
            inalterados += 1
        for idioma in idiomas:
            # /riodejaneiro/pt tambem existia no site antigo e leva a raiz da
            # cidade, que e a versao em portugues.
            alvo = '/%s/' % novo if idioma == 'pt' else '/%s/%s/' % (novo, idioma)
            p = os.path.join(antigo, idioma, 'index.html')
            if escrever(p, pagina_ponte(alvo, 'Redirecionando'), args.conferir):
                escritos.append(p)
            else:
                inalterados += 1

    for antigo, novo in PONTES_ANTIGAS:
        if escrever(antigo, pagina_ponte(novo, 'Redirecionando'), args.conferir):
            escritos.append(antigo)
        else:
            inalterados += 1

    if escrever('sitemap.xml', montar_sitemap(slugs, idiomas, imagens_por_slug, alts), args.conferir):
        escritos.append('sitemap.xml')
    else:
        inalterados += 1

    rotulo = 'mudariam' if args.conferir else 'escritos'
    print('idiomas: %s' % ', '.join(idiomas))
    print('%d arquivos %s, %d ja estavam em dia' % (len(escritos), rotulo, inalterados))
    for caminho in escritos:
        print('  ' + caminho.replace(os.sep, '/'))


if __name__ == '__main__':
    main()
