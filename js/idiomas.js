// Idiomas em que um tour é conduzido: código ISO e nome padrão em pt-BR.
//
// O campo Idioma da reserva mostra as opções no idioma da página — "English",
// "Español", "中文" —, mas o que vai para o banco e para a mensagem da equipe é
// sempre o nome em pt-BR desta tabela. Antes a opção era o próprio texto do
// card, já traduzido, e a mesma reserva gravava "Portuguese" numa página e
// "Português" na outra.
//
// Mesmo desenho de js/paises.js: pt-BR fixo aqui, para não variar entre
// aparelhos; os outros idiomas vêm do navegador (Intl.DisplayNames).
(function () {
  const LISTA = [
    ['pt', 'Português'],
    ['en', 'Inglês'],
    ['es', 'Espanhol'],
    ['fr', 'Francês'],
    ['it', 'Italiano'],
    ['de', 'Alemão'],
    ['zh', 'Chinês'],
    ['ja', 'Japonês'],
    ['ko', 'Coreano'],
    ['ru', 'Russo'],
    ['ar', 'Árabe'],
    ['nl', 'Holandês'],
    ['he', 'Hebraico'],
    ['hi', 'Hindi'],
    ['pl', 'Polonês'],
    ['sv', 'Sueco'],
    ['tr', 'Turco'],
    ['el', 'Grego'],
    ['da', 'Dinamarquês'],
    ['no', 'Norueguês'],
    ['fi', 'Finlandês'],
    ['uk', 'Ucraniano'],
    ['cs', 'Tcheco'],
    ['hu', 'Húngaro'],
    ['ro', 'Romeno'],
    ['id', 'Indonésio'],
    ['th', 'Tailandês'],
    ['vi', 'Vietnamita'],
    ['ca', 'Catalão'],
    ['eu', 'Basco'],
    ['gl', 'Galego'],
  ];

  // Nomes que o navegador não usa para esses idiomas.
  const APELIDOS = {
    zh: ['Mandarim', 'Mandarin', 'Mandarín', 'Mandarino', '普通话', '汉语', '中文(普通话)'],
    nl: ['Neerlandês', 'Dutch', 'Holandés'],
    pt: ['Português do Brasil', 'Portuguese (Brazil)', 'Português (Brasil)'],
  };

  const IDIOMAS = ['pt-BR', 'pt', 'en', 'es', 'fr', 'it', 'zh', 'de'];

  const chave = (texto) => String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');

  const exibidor = (() => {
    const cache = {};
    return (idioma) => {
      if (!(idioma in cache)) {
        try { cache[idioma] = new Intl.DisplayNames([idioma], { type: 'language' }); } catch (_e) { cache[idioma] = null; }
      }
      const d = cache[idioma];
      return (codigo) => { try { return d ? d.of(codigo) : ''; } catch (_e) { return ''; } };
    };
  })();

  let indice = null;
  const montarIndice = () => {
    indice = new Map();
    const guardar = (nome, codigo) => { const k = chave(nome); if (k && !indice.has(k)) indice.set(k, codigo); };
    LISTA.forEach(([codigo, pt]) => {
      guardar(pt, codigo);
      IDIOMAS.forEach((idioma) => guardar(exibidor(idioma)(codigo), codigo));
    });
    Object.entries(APELIDOS).forEach(([codigo, nomes]) => nomes.forEach((nome) => guardar(nome, codigo)));
  };

  const porCodigo = new Map(LISTA);
  const maiuscula = (s, idioma) => s ? s.charAt(0).toLocaleUpperCase(idioma || 'pt-BR') + s.slice(1) : s;

  // Separa "Português, Inglês e Espanhol" nos seis idiomas do site.
  const separar = (texto) => String(texto || '')
    .split(/[,;、]+|\s+(?:e|and|y|et)\s+|和/i)
    .map((s) => s.trim())
    .filter(Boolean);

  window.Idiomas = {
    codigo(texto) {
      if (!indice) montarIndice();
      return indice.get(chave(texto)) || '';
    },
    ptBR(codigo) {
      return porCodigo.get(codigo) || '';
    },
    nome(codigo, idioma) {
      if (!porCodigo.has(codigo)) return '';
      if (!idioma || idioma === 'pt' || idioma === 'pt-BR') return this.ptBR(codigo);
      return maiuscula(exibidor(idioma)(codigo), idioma) || this.ptBR(codigo);
    },
    // Opções do campo: [{ valor: nome pt-BR, texto: nome no idioma da página }].
    // Idioma desconhecido (ex.: "Libras") entra como veio, nos dois lados.
    opcoes(texto, idioma) {
      const vistos = new Set();
      return separar(texto).map((parte) => {
        const codigo = this.codigo(parte);
        return codigo
          ? { valor: this.ptBR(codigo), texto: this.nome(codigo, idioma) }
          : { valor: parte, texto: parte };
      }).filter((o) => !vistos.has(o.valor) && vistos.add(o.valor));
    },
  };
})();
