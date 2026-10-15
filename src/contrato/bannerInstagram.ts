// Banner de divulgação do Instagram intercalado nas listas de vídeo (Resenha,
// nas duas abas, e Meus replays). Regra pura, sem React, pra ser copiada igual
// no app de jogador.
//
// O primeiro banner vem cedo, depois do 3º vídeo (em Meus replays o jogador
// tem poucos gols, não desceria até o 7º). Daí em diante, a cada 5 a 8 vídeos
// pra não ficar num ritmo previsível (e chato). A sequência é fixa em vez de
// aleatória pra posição não pular a cada render nem quando o scroll infinito
// anexa uma página nova.

export const INSTAGRAM_USUARIO = "weracha.app";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_USUARIO}`;

const PRIMEIRO = 3;
const INTERVALOS = [6, 5, 8, 7];

export type MensagemBannerInstagram = { titulo: string; texto: string };

// Alterna entre "poste marcando" e "siga a página", na ordem em que os banners
// aparecem na lista.
export const MENSAGENS_BANNER_INSTAGRAM: MensagemBannerInstagram[] = [
  {
    titulo: "Fez golaço? Mostra pro mundo",
    texto: `Baixe o vídeo no menu ⋮ e poste no Instagram marcando @${INSTAGRAM_USUARIO}.`,
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

// Índice da mensagem do banner que vai logo depois do vídeo na posição
// `indice` (0-based) da lista, ou null se não vai banner ali.
// - Enquanto ainda tem página pra carregar (`listaCompleta` false), nunca põe
//   banner depois do último vídeo carregado, senão ele "pula" pra baixo quando
//   chega a próxima página.
// - Lista completa com menos vídeos que o PRIMEIRO (ex.: jogador com 1 ou 2
//   gols em Meus replays) mostra o banner no fim, pra ele não sumir de vez.
export function bannerInstagramDepoisDe(
  indice: number,
  totalCarregado: number,
  listaCompleta: boolean
): number | null {
  const ultimo = indice === totalCarregado - 1;
  if (ultimo && !listaCompleta) return null;
  if (ultimo && totalCarregado < PRIMEIRO) return 0;
  let posicao = PRIMEIRO;
  for (let n = 0; ; n++) {
    if (posicao - 1 === indice) return n % MENSAGENS_BANNER_INSTAGRAM.length;
    if (posicao - 1 > indice) return null;
    posicao += INTERVALOS[n % INTERVALOS.length];
  }
}
