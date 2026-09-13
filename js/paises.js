// Países da reserva: código ISO, nome padrão em pt-BR e o nome em inglês que a
// lista antiga usava.
//
// O cliente pode digitar o país no idioma que quiser — "Brasil", "Brazil",
// "Alemanha", "Germany", "Deutschland" — e o que vai para o banco é sempre o
// nome em pt-BR desta tabela. Sem isso a coluna nacionalidade juntava "Brazil"
// e "Brasil" como se fossem países diferentes.
//
// Os nomes nos outros idiomas não estão escritos aqui: vêm do próprio navegador
// (Intl.DisplayNames), que traz o nome de cada país em qualquer língua. Só o
// pt-BR é fixo, e é fixo de propósito — gerado pelo navegador ele mudaria de um
// aparelho para outro ("Tchéquia" num, "República Tcheca" noutro) e o banco
// voltaria a ter o mesmo país com dois nomes.
//
// Gerado a partir da lista de 194 países que o formulário já usava. Os códigos
// passam pela forma canônica do ISO: na primeira geração alguns saíram com o
// código antigo que o navegador ainda reconhece (SU no lugar de RU, UK no lugar
// de GB, YU no lugar de RS), e em outros idiomas eles aparecem com o nome
// antigo — em chinês, SU vira "União Soviética".
(function () {
  const LISTA = [
    ['AF', 'Afeganistão', 'Afghanistan'],
    ['ZA', 'África do Sul', 'South Africa'],
    ['AL', 'Albânia', 'Albania'],
    ['DE', 'Alemanha', 'Germany'],
    ['AD', 'Andorra', 'Andorra'],
    ['AO', 'Angola', 'Angola'],
    ['AG', 'Antígua e Barbuda', 'Antigua and Barbuda'],
    ['SA', 'Arábia Saudita', 'Saudi Arabia'],
    ['DZ', 'Argélia', 'Algeria'],
    ['AR', 'Argentina', 'Argentina'],
    ['AM', 'Armênia', 'Armenia'],
    ['AU', 'Austrália', 'Australia'],
    ['AT', 'Áustria', 'Austria'],
    ['AZ', 'Azerbaijão', 'Azerbaijan'],
    ['BS', 'Bahamas', 'Bahamas'],
    ['BD', 'Bangladesh', 'Bangladesh'],
    ['BB', 'Barbados', 'Barbados'],
    ['BH', 'Barein', 'Bahrain'],
    ['BE', 'Bélgica', 'Belgium'],
    ['BZ', 'Belize', 'Belize'],
    ['BJ', 'Benin', 'Benin'],
    ['BY', 'Bielorrússia', 'Belarus'],
    ['BO', 'Bolívia', 'Bolivia'],
    ['BA', 'Bósnia e Herzegovina', 'Bosnia and Herzegovina'],
    ['BW', 'Botsuana', 'Botswana'],
    ['BR', 'Brasil', 'Brazil'],
    ['BN', 'Brunei', 'Brunei'],
    ['BG', 'Bulgária', 'Bulgaria'],
    ['BF', 'Burquina Faso', 'Burkina Faso'],
    ['BI', 'Burundi', 'Burundi'],
    ['BT', 'Butão', 'Bhutan'],
    ['CV', 'Cabo Verde', 'Cabo Verde'],
    ['CM', 'Camarões', 'Cameroon'],
    ['KH', 'Camboja', 'Cambodia'],
    ['CA', 'Canadá', 'Canada'],
    ['QA', 'Catar', 'Qatar'],
    ['KZ', 'Cazaquistão', 'Kazakhstan'],
    ['TD', 'Chade', 'Chad'],
    ['CL', 'Chile', 'Chile'],
    ['CN', 'China', 'China'],
    ['CY', 'Chipre', 'Cyprus'],
    ['VA', 'Cidade do Vaticano', 'Vatican City'],
    ['CO', 'Colômbia', 'Colombia'],
    ['KM', 'Comores', 'Comoros'],
    ['KP', 'Coreia do Norte', 'North Korea'],
    ['KR', 'Coreia do Sul', 'South Korea'],
    ['CI', 'Costa do Marfim', 'Ivory Coast'],
    ['CR', 'Costa Rica', 'Costa Rica'],
    ['HR', 'Croácia', 'Croatia'],
    ['CU', 'Cuba', 'Cuba'],
    ['DK', 'Dinamarca', 'Denmark'],
    ['DJ', 'Djibuti', 'Djibouti'],
    ['DM', 'Dominica', 'Dominica'],
    ['EG', 'Egito', 'Egypt'],
    ['SV', 'El Salvador', 'El Salvador'],
    ['AE', 'Emirados Árabes Unidos', 'United Arab Emirates'],
    ['EC', 'Equador', 'Ecuador'],
    ['ER', 'Eritreia', 'Eritrea'],
    ['SK', 'Eslováquia', 'Slovakia'],
    ['SI', 'Eslovênia', 'Slovenia'],
    ['ES', 'Espanha', 'Spain'],
    ['SZ', 'Essuatíni', 'Eswatini'],
    ['US', 'Estados Unidos', 'United States'],
    ['EE', 'Estônia', 'Estonia'],
    ['ET', 'Etiópia', 'Ethiopia'],
    ['FJ', 'Fiji', 'Fiji'],
    ['PH', 'Filipinas', 'Philippines'],
    ['FI', 'Finlândia', 'Finland'],
    ['FR', 'França', 'France'],
    ['GA', 'Gabão', 'Gabon'],
    ['GM', 'Gâmbia', 'Gambia'],
    ['GH', 'Gana', 'Ghana'],
    ['GE', 'Geórgia', 'Georgia'],
    ['GD', 'Granada', 'Grenada'],
    ['GR', 'Grécia', 'Greece'],
    ['GT', 'Guatemala', 'Guatemala'],
    ['GY', 'Guiana', 'Guyana'],
    ['GN', 'Guiné', 'Guinea'],
    ['GQ', 'Guiné Equatorial', 'Equatorial Guinea'],
    ['GW', 'Guiné-Bissau', 'Guinea-Bissau'],
    ['HT', 'Haiti', 'Haiti'],
    ['HN', 'Honduras', 'Honduras'],
    ['HU', 'Hungria', 'Hungary'],
    ['YE', 'Iêmen', 'Yemen'],
    ['MH', 'Ilhas Marshall', 'Marshall Islands'],
    ['SB', 'Ilhas Salomão', 'Solomon Islands'],
    ['IN', 'Índia', 'India'],
    ['ID', 'Indonésia', 'Indonesia'],
    ['IR', 'Irã', 'Iran'],
    ['IQ', 'Iraque', 'Iraq'],
    ['IE', 'Irlanda', 'Ireland'],
    ['IS', 'Islândia', 'Iceland'],
    ['IL', 'Israel', 'Israel'],
    ['IT', 'Itália', 'Italy'],
    ['JM', 'Jamaica', 'Jamaica'],
    ['JP', 'Japão', 'Japan'],
    ['JO', 'Jordânia', 'Jordan'],
    ['XK', 'Kosovo', 'Kosovo'],
    ['KW', 'Kuwait', 'Kuwait'],
    ['LA', 'Laos', 'Laos'],
    ['LS', 'Lesoto', 'Lesotho'],
    ['LV', 'Letônia', 'Latvia'],
    ['LB', 'Líbano', 'Lebanon'],
    ['LR', 'Libéria', 'Liberia'],
    ['LY', 'Líbia', 'Libya'],
    ['LI', 'Liechtenstein', 'Liechtenstein'],
    ['LT', 'Lituânia', 'Lithuania'],
    ['LU', 'Luxemburgo', 'Luxembourg'],
    ['MK', 'Macedônia do Norte', 'North Macedonia'],
    ['MG', 'Madagascar', 'Madagascar'],
    ['MY', 'Malásia', 'Malaysia'],
    ['MW', 'Malaui', 'Malawi'],
    ['MV', 'Maldivas', 'Maldives'],
    ['ML', 'Mali', 'Mali'],
    ['MT', 'Malta', 'Malta'],
    ['MA', 'Marrocos', 'Morocco'],
    ['MU', 'Maurício', 'Mauritius'],
    ['MR', 'Mauritânia', 'Mauritania'],
    ['MX', 'México', 'Mexico'],
    ['MM', 'Mianmar', 'Myanmar'],
    ['FM', 'Micronésia', 'Micronesia'],
    ['MZ', 'Moçambique', 'Mozambique'],
    ['MD', 'Moldávia', 'Moldova'],
    ['MC', 'Mônaco', 'Monaco'],
    ['MN', 'Mongólia', 'Mongolia'],
    ['ME', 'Montenegro', 'Montenegro'],
    ['NA', 'Namíbia', 'Namibia'],
    ['NR', 'Nauru', 'Nauru'],
    ['NP', 'Nepal', 'Nepal'],
    ['NI', 'Nicarágua', 'Nicaragua'],
    ['NE', 'Níger', 'Niger'],
    ['NG', 'Nigéria', 'Nigeria'],
    ['NO', 'Noruega', 'Norway'],
    ['NZ', 'Nova Zelândia', 'New Zealand'],
    ['OM', 'Omã', 'Oman'],
    ['NL', 'Países Baixos', 'Netherlands'],
    ['PW', 'Palau', 'Palau'],
    ['PA', 'Panamá', 'Panama'],
    ['PG', 'Papua-Nova Guiné', 'Papua New Guinea'],
    ['PK', 'Paquistão', 'Pakistan'],
    ['PY', 'Paraguai', 'Paraguay'],
    ['PE', 'Peru', 'Peru'],
    ['PL', 'Polônia', 'Poland'],
    ['PT', 'Portugal', 'Portugal'],
    ['KE', 'Quênia', 'Kenya'],
    ['KG', 'Quirguistão', 'Kyrgyzstan'],
    ['KI', 'Quiribati', 'Kiribati'],
    ['GB', 'Reino Unido', 'United Kingdom'],
    ['CF', 'República Centro-Africana', 'Central African Republic'],
    ['CD', 'República Democrática do Congo', 'Democratic Republic of the Congo'],
    ['DO', 'República Dominicana', 'Dominican Republic'],
    ['RO', 'Romênia', 'Romania'],
    ['RW', 'Ruanda', 'Rwanda'],
    ['RU', 'Rússia', 'Russia'],
    ['WS', 'Samoa', 'Samoa'],
    ['SM', 'San Marino', 'San Marino'],
    ['LC', 'Santa Lúcia', 'Saint Lucia'],
    ['KN', 'São Cristóvão e Névis', 'Saint Kitts and Nevis'],
    ['ST', 'São Tomé e Príncipe', 'Sao Tome and Principe'],
    ['VC', 'São Vicente e Granadinas', 'Saint Vincent and the Grenadines'],
    ['SC', 'Seicheles', 'Seychelles'],
    ['SN', 'Senegal', 'Senegal'],
    ['SL', 'Serra Leoa', 'Sierra Leone'],
    ['RS', 'Sérvia', 'Serbia'],
    ['SG', 'Singapura', 'Singapore'],
    ['SY', 'Síria', 'Syria'],
    ['SO', 'Somália', 'Somalia'],
    ['LK', 'Sri Lanka', 'Sri Lanka'],
    ['SD', 'Sudão', 'Sudan'],
    ['SS', 'Sudão do Sul', 'South Sudan'],
    ['SE', 'Suécia', 'Sweden'],
    ['CH', 'Suíça', 'Switzerland'],
    ['SR', 'Suriname', 'Suriname'],
    ['TJ', 'Tadjiquistão', 'Tajikistan'],
    ['TH', 'Tailândia', 'Thailand'],
    ['TZ', 'Tanzânia', 'Tanzania'],
    ['CZ', 'Tchéquia', 'Czech Republic'],
    ['TL', 'Timor-Leste', 'Timor-Leste'],
    ['TG', 'Togo', 'Togo'],
    ['TO', 'Tonga', 'Tonga'],
    ['TT', 'Trinidad e Tobago', 'Trinidad and Tobago'],
    ['TN', 'Tunísia', 'Tunisia'],
    ['TM', 'Turcomenistão', 'Turkmenistan'],
    ['TR', 'Turquia', 'Turkey'],
    ['TV', 'Tuvalu', 'Tuvalu'],
    ['UA', 'Ucrânia', 'Ukraine'],
    ['UG', 'Uganda', 'Uganda'],
    ['UY', 'Uruguai', 'Uruguay'],
    ['UZ', 'Uzbequistão', 'Uzbekistan'],
    ['VU', 'Vanuatu', 'Vanuatu'],
    ['VE', 'Venezuela', 'Venezuela'],
    ['VN', 'Vietnã', 'Vietnam'],
    ['ZM', 'Zâmbia', 'Zambia'],
    ['ZW', 'Zimbábue', 'Zimbabwe'],
  ];

  // Nomes do dia a dia que o navegador não conhece: sigla e nome popular. O
  // navegador sabe "Países Baixos", mas quem escreve costuma pôr "Holanda".
  const APELIDOS = {
    US: ['EUA', 'USA', 'Estados Unidos da América', 'United States of America', 'America'],
    GB: ['UK', 'Inglaterra', 'England', 'Grã-Bretanha', 'Great Britain', 'Escócia', 'Scotland', 'País de Gales', 'Wales'],
    NL: ['Holanda', 'Holland'],
    AE: ['Emirados Árabes', 'UAE', 'EAU'],
    KR: ['Coreia', 'Korea'],
  };

  const IDIOMAS = ['pt-BR', 'pt', 'en', 'es', 'fr', 'it', 'zh', 'de'];

  // Compara sem acento, sem caixa e sem pontuação: "  são tomé " encontra
  // "Sao Tome and Principe", e "St. Lucia" encontra "Saint Lucia".
  const chave = (texto) => String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9一-鿿]/g, '');

  const nomesNoIdioma = (() => {
    const cache = {};
    return (idioma) => {
      if (cache[idioma]) return cache[idioma];
      let exibir = null;
      try { exibir = new Intl.DisplayNames([idioma], { type: 'region' }); } catch (_e) { /* navegador sem suporte */ }
      cache[idioma] = (codigo) => {
        try { return exibir ? exibir.of(codigo) : ''; } catch (_e) { return ''; }
      };
      return cache[idioma];
    };
  })();

  // Índice de todos os nomes conhecidos -> código. Montado na primeira busca.
  let indice = null;
  const montarIndice = () => {
    indice = new Map();
    const guardar = (nome, codigo) => { const k = chave(nome); if (k && !indice.has(k)) indice.set(k, codigo); };
    LISTA.forEach(([codigo, pt, en]) => {
      guardar(pt, codigo);
      guardar(en, codigo);
      guardar(codigo, codigo);
      IDIOMAS.forEach((idioma) => guardar(nomesNoIdioma(idioma)(codigo), codigo));
    });
    Object.entries(APELIDOS).forEach(([codigo, nomes]) => nomes.forEach((nome) => guardar(nome, codigo)));
  };

  const porCodigo = new Map(LISTA.map((item) => [item[0], item]));

  window.Paises = {
    // Código ISO do país digitado, em qualquer idioma, ou '' se não for país da lista.
    codigo(texto) {
      if (!indice) montarIndice();
      return indice.get(chave(texto)) || '';
    },
    // Nome padrão, o que vai para o banco e para a mensagem da equipe.
    ptBR(codigo) {
      return porCodigo.get(codigo)?.[1] || '';
    },
    // Nome para mostrar ao visitante, no idioma da página.
    nome(codigo, idioma) {
      if (!porCodigo.has(codigo)) return '';
      if (!idioma || idioma === 'pt' || idioma === 'pt-BR') return this.ptBR(codigo);
      return nomesNoIdioma(idioma)(codigo) || this.ptBR(codigo);
    },
    // Sugestões do campo, no idioma da página, em ordem alfabética dele.
    sugestoes(idioma) {
      const nomes = LISTA.map(([codigo]) => this.nome(codigo, idioma)).filter(Boolean);
      return nomes.sort((a, b) => a.localeCompare(b, idioma || 'pt-BR'));
    },
  };
})();
