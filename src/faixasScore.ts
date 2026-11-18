// Faixas de referência do score (0 a 100), nas faixas já decididas pro futuro
// sistema de estrelas (weracha-site/docs/pendente/02-sistema-score-estrelas.md,
// seção 3). Mostradas embaixo do número quando alguém define um score: modal
// "Meu score" e formulário de adicionar jogador. Espelha
// weracha-site/lib/faixasScore.ts.

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

export const FAIXAS_SCORE: { min: number; nome: string; descricao: string }[] = [
  { min: 85, nome: "Jogador caro", descricao: "Joga em outro nível, todo time quer ele" },
  { min: 70, nome: "Bom de bola", descricao: "Categoria boa, resolve" },
  { min: 40, nome: "Mediano", descricao: "Joga a posição direitinho" },
  { min: 20, nome: "Ainda aprendendo", descricao: "Pegando o jogo" },
  { min: 0, nome: "Iniciante", descricao: "Primeiros jogos, só ganhando rodagem" },
];

export function faixaDoScore(score: number) {
  return FAIXAS_SCORE.find((f) => score >= f.min) ?? FAIXAS_SCORE[FAIXAS_SCORE.length - 1];
}
