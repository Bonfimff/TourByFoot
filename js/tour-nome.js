// Nome do tour por idioma. O nome em português (nome_tour) é o oficial: é por
// ele que o card é casado com o tour do banco, e por ele que reservas, favoritos
// e atividade identificam o tour. O texto do <h4> muda com o idioma, então o
// nome oficial fica guardado em card.dataset.tourNome e quem precisa
// identificar o tour lê dali (tourNomeOficialDoCard), nunca do textContent.
window.tourNomeNoIdioma = function (tour, lang) {
    const oficial = (tour && (tour.nome_tour || tour.name)) || '';
    if (!lang || lang === 'pt') return oficial;
    const traduzido = tour && tour.traducoes && tour.traducoes[lang] && tour.traducoes[lang].nome;
    return (traduzido && String(traduzido).trim()) || oficial;
};
window.tourNomeOficialDoCard = function (card) {
    if (!card) return '';
    if (card.dataset && card.dataset.tourNome) return card.dataset.tourNome;
    const el = card.querySelector && card.querySelector('.rio-tour-name');
    return ((el && el.textContent) || '').trim();
};
