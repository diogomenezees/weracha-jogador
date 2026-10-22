// Banners intercalados nas listas de vídeo (Resenha, nas duas abas, e Meus
// replays): o de divulgação do nosso Instagram e as campanhas dos parceiros.
// Regra pura, sem React, pra ser copiada igual no app de jogador.
//
// ONDE entra banner não depende de ter campanha: um a cada INTERVALO vídeos
// (depois do 3º, 6º, 9º…). O jogador não desce muito na lista, então o ritmo é
// curto de propósito (2026-10-22; antes era o 1º depois do 3º e depois a cada 5
// a 8). Posição fixa pra não pular a cada render nem quando o scroll infinito
// anexa uma página nova.
//
// O QUE entra em cada espaço: um ciclo que começa no Instagram e passa por TODAS
// as campanhas no ar antes de voltar pro Instagram (Instagram, campanha 1,
// campanha 2, …, campanha N, Instagram, campanha 1…). O primeiro é sempre nosso.
// Sem campanha, todos são do Instagram.

export const INSTAGRAM_USUARIO = "weracha.app";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_USUARIO}`;

const INTERVALO = 3;

export type MensagemBannerInstagram = { titulo: string; texto: string };

// Alterna entre "poste marcando" e "siga a página", na ordem em que os banners
// do Instagram aparecem na lista.
export const MENSAGENS_BANNER_INSTAGRAM: MensagemBannerInstagram[] = [
  {
    titulo: "Fez golaço? Mostra pro mundo",
    texto: `Baixe o vídeo e poste no Instagram marcando @${INSTAGRAM_USUARIO}.`,
  },
  {
    titulo: "Siga a gente no Instagram",
    texto: `Os melhores lances das peladas aparecem no @${INSTAGRAM_USUARIO}.`,
  },
  {
    titulo: "Quer seu lance no nosso perfil?",
    texto: `Posta o replay e marca @${INSTAGRAM_USUARIO} na publicação. A gente reposta os melhores.`,
  },
];

// `mensagem` indexa MENSAGENS_BANNER_INSTAGRAM; `campanha` indexa a lista de
// campanhas no ar que a tela recebeu (GET /api/v1/campanhas), percorrida
// inteira a cada ciclo, na ordem em que veio (o servidor embaralha).
export type BannerDoFeed =
  | { tipo: "instagram"; mensagem: number }
  | { tipo: "campanha"; campanha: number };

// Número (0-based) do espaço de banner logo depois do vídeo na posição
// `indice` (0-based) da lista, ou null se não vai banner ali.
// - Enquanto ainda tem página pra carregar (`listaCompleta` false), nunca põe
//   banner depois do último vídeo carregado, senão ele "pula" pra baixo quando
//   chega a próxima página.
// - Lista completa com menos vídeos que o INTERVALO (ex.: jogador com 1 ou 2
//   gols em Meus replays) mostra o banner no fim, pra ele não sumir de vez.
function espacoDeBannerDepoisDe(
  indice: number,
  totalCarregado: number,
  listaCompleta: boolean
): number | null {
  const ultimo = indice === totalCarregado - 1;
  if (ultimo && !listaCompleta) return null;
  if (ultimo && totalCarregado < INTERVALO) return 0;
  return (indice + 1) % INTERVALO === 0 ? (indice + 1) / INTERVALO - 1 : null;
}

// Banner que vai logo depois do vídeo na posição `indice` (0-based), ou null.
// `totalCampanhas` é o tamanho da lista de campanhas no ar (0 = só Instagram).
export function bannerDoFeedDepoisDe(
  indice: number,
  totalCarregado: number,
  listaCompleta: boolean,
  totalCampanhas: number
): BannerDoFeed | null {
  const espaco = espacoDeBannerDepoisDe(indice, totalCarregado, listaCompleta);
  if (espaco === null) return null;
  // Ciclo de 1 + N espaços: o 1º é do Instagram, os N seguintes, uma campanha cada.
  const tamanhoCiclo = 1 + totalCampanhas;
  const ciclo = Math.floor(espaco / tamanhoCiclo);
  const posicao = espaco % tamanhoCiclo;
  if (posicao === 0) {
    // Um Instagram por ciclo: as mensagens seguem em sequência sem pular.
    return { tipo: "instagram", mensagem: ciclo % MENSAGENS_BANNER_INSTAGRAM.length };
  }
  return { tipo: "campanha", campanha: posicao - 1 };
}
